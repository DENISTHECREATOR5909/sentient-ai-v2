/* ============================================================
   app.js - exam driver, timing, persistence, report, review
   ============================================================ */
(function () {
  'use strict';

  var el = Items.el;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- client need blueprint ----------------
     Percentages follow the published NCLEX-RN Test Plan
     client-need distribution (midpoint of each range).      */
  var CATS = {
    MOC: { name: 'Management of Care', group: 'Safe and Effective Care Environment', target: 0.18, range: '15–21%' },
    SIC: { name: 'Safety and Infection Control', group: 'Safe and Effective Care Environment', target: 0.13, range: '10–16%' },
    HPM: { name: 'Health Promotion and Maintenance', group: 'Health Promotion and Maintenance', target: 0.09, range: '6–12%' },
    PSI: { name: 'Psychosocial Integrity', group: 'Psychosocial Integrity', target: 0.09, range: '6–12%' },
    BCC: { name: 'Basic Care and Comfort', group: 'Physiological Integrity', target: 0.09, range: '6–12%' },
    PHA: { name: 'Pharmacological and Parenteral Therapies', group: 'Physiological Integrity', target: 0.16, range: '13–19%' },
    RRP: { name: 'Reduction of Risk Potential', group: 'Physiological Integrity', target: 0.12, range: '9–15%' },
    PHY: { name: 'Physiological Adaptation', group: 'Physiological Integrity', target: 0.14, range: '11–17%' }
  };
  var BLUEPRINT = {};
  Object.keys(CATS).forEach(function (k) { BLUEPRINT[k] = CATS[k].target; });

  var LENGTHS = {
    full:  { min: 75, max: 145, caseAt: [1, 25, 49] },
    short: { min: 25, max: 60,  caseAt: [1, 21] },
    mini:  { min: 15, max: 30,  caseAt: [1] }
  };

  var STORAGE_KEY = 'nclex.cat.session.v1';
  var RESULT_KEY = 'nclex.cat.lastresult.v1';

  var BANK = (window.NCLEX_BANK || []).slice();
  var CASES = (window.NCLEX_CASES || []).slice();

  var S = null;                    // live exam state
  var tickHandle = null;
  var rng = Math.random;

  /* ============================================================
     Screens
     ============================================================ */
  function show(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('is-active'); });
    $(id).classList.add('is-active');
    window.scrollTo(0, 0);
    var main = $('exam-main'); if (main) main.scrollTop = 0;
  }

  function modal(title, text, actions) {
    $('modal-title').textContent = title;
    $('modal-text').textContent = text;
    var host = $('modal-actions');
    host.innerHTML = '';
    actions.forEach(function (a) {
      var b = el('button', 'btn ' + (a.cls || ''), a.label);
      b.type = 'button';
      b.addEventListener('click', function () { $('modal').hidden = true; a.fn && a.fn(); });
      host.appendChild(b);
    });
    $('modal').hidden = false;
  }

  /* ============================================================
     Time helpers
     ============================================================ */
  function fmtClock(ms) {
    if (ms < 0) ms = 0;
    var t = Math.floor(ms / 1000);
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtDur(ms) {
    var t = Math.round(ms / 1000);
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h ? h + ' h ' : '') + (h || m ? m + ' min ' : '') + s + ' s';
  }

  /* ============================================================
     Exam construction
     ============================================================ */
  function buildExam(opts) {
    var cfg = LENGTHS[opts.length] || LENGTHS.full;
    var engine = new IRT.CatEngine({
      items: BANK, minItems: cfg.min, maxItems: cfg.max,
      blueprint: BLUEPRINT, exposure: 5, rng: rng
    });
    var queue = [];
    if (opts.cases && CASES.length) {
      var pool = Items.shuffle(CASES, rng);
      cfg.caseAt.forEach(function (pos, i) {
        if (pool[i]) queue.push({ at: pos, kase: pool[i] });
      });
    }
    return {
      opts: opts,
      cfg: cfg,
      engine: engine,
      caseQueue: queue,
      caseBuffer: [],            // prepared items of the case currently unfolding
      activeCase: null,
      delivered: [],             // { item, response, score, exact, ms, caseTitle }
      current: null,
      timeLeft: opts.timeLimit * 1000,
      timed: opts.timeLimit > 0,
      breaksTaken: [],
      hudOpen: false,
      startedAt: Date.now(),
      finished: false,
      result: null
    };
  }

  /* ---- pick the next item, either from an unfolding case or the CAT engine ---- */
  function nextItem() {
    if (S.caseBuffer.length) return S.caseBuffer.shift();

    var pos = S.delivered.length + 1;
    for (var i = 0; i < S.caseQueue.length; i++) {
      if (S.caseQueue[i].at <= pos) {
        var k = S.caseQueue.splice(i, 1)[0].kase;
        S.activeCase = { id: k.id, title: k.title, total: k.items.length, index: 0 };
        S.caseBuffer = k.items.map(function (raw, idx) {
          var it = Items.prepareItem(raw, rng);
          it.scenario = raw.scenario || k.scenario;
          it.scenarioLabel = 'Case study — ' + k.title;
          it.record = raw.record || k.record;
          it.caseTitle = k.title;
          it.caseStep = raw.step || '';
          it.caseIndex = idx + 1;
          it.caseTotal = k.items.length;
          return it;
        });
        return S.caseBuffer.shift();
      }
    }
    S.activeCase = null;
    var raw2 = S.engine.selectNext();
    if (!raw2) return null;
    return Items.prepareItem(raw2, rng);
  }

  /* ============================================================
     Item delivery
     ============================================================ */
  function deliverNext() {
    var timeExpired = S.timed && S.timeLeft <= 0;
    var itemsLeft = BANK.length - Object.keys(S.engine.used).length;
    var exhausted = itemsLeft <= 0 && !S.caseBuffer.length;

    if (S.engine.checkStop(timeExpired, exhausted)) return finishExam();

    var item = nextItem();
    if (!item) { S.engine.stopReason = 'bank'; return finishExam(); }

    S.engine.markUsed({ id: item.srcId || item.id, cat: item.cat });
    S.current = {
      item: item,
      response: { value: Items.blankResponse(item) },
      startTs: Date.now()
    };
    paintItem();
    save();
  }

  function paintItem() {
    var item = S.current.item;
    $('v-item').textContent = String(S.delivered.length + 1);

    var banner = $('case-banner');
    if (item.caseTitle) {
      banner.hidden = false;
      banner.innerHTML = '';
      banner.appendChild(el('b', null, 'Case study: ' + item.caseTitle));
      banner.appendChild(document.createTextNode(
        '  —  part ' + item.caseIndex + ' of ' + item.caseTotal +
        (item.caseStep ? '  ·  ' + item.caseStep : '')));
    } else {
      banner.hidden = true;
    }

    Items.render($('item-host'), item, S.current.response, onResponseChange);
    onResponseChange();
    $('exam-main').scrollTop = 0;
  }

  function onResponseChange() {
    var ok = Items.isComplete(S.current.item, S.current.response.value);
    $('btn-next').disabled = !ok;
    $('foot-hint').textContent = ok ? '' : 'An answer is required before you can continue.';
  }

  function submitCurrent() {
    var cur = S.current;
    if (!Items.isComplete(cur.item, cur.response.value)) return;

    var res = Items.score(cur.item, cur.response.value);
    S.engine.record(cur.item, res.score);
    S.delivered.push({
      item: cur.item,
      response: cur.response.value,
      score: res.score,
      exact: res.exact,
      ms: Date.now() - cur.startTs,
      caseTitle: cur.item.caseTitle || null
    });
    updateHud();
    maybeOfferBreak();
    deliverNext();
  }

  /* ============================================================
     Breaks
     ============================================================ */
  function maybeOfferBreak() {
    if (!S.opts.breaks || !S.timed) return;
    var used = S.opts.timeLimit * 1000 - S.timeLeft;
    [2 * 3600e3, 3.5 * 3600e3].forEach(function (mark, i) {
      if (used >= mark && S.breaksTaken.indexOf(i) === -1) {
        S.breaksTaken.push(i);
        modal('Optional break',
          'You may take an optional break now. The exam clock keeps running during breaks, exactly as it does on the real NCLEX.',
          [{ label: 'Take a break', cls: 'btn-primary', fn: startBreak },
           { label: 'Keep testing', fn: function () {} }]);
      }
    });
  }
  function startBreak() { show('screen-break'); }

  /* ============================================================
     Timer
     ============================================================ */
  function startTimer() {
    stopTimer();
    var last = Date.now();
    tickHandle = setInterval(function () {
      var now = Date.now(), dt = now - last; last = now;
      if (S.timed) {
        S.timeLeft -= dt;
        if (S.timeLeft <= 0) {
          S.timeLeft = 0;
          stopTimer();
          modal('Time expired', 'The exam time limit has been reached. Your exam will now be scored.',
            [{ label: 'View results', cls: 'btn-primary', fn: function () { finishExam(true); } }]);
        }
      }
      paintTime();
    }, 250);
  }
  function stopTimer() { if (tickHandle) { clearInterval(tickHandle); tickHandle = null; } }

  function paintTime() {
    var txt = S.timed ? fmtClock(S.timeLeft) : 'No limit';
    $('v-time').textContent = txt;
    $('break-time').textContent = txt;
    $('meter-time').classList.toggle('low', S.timed && S.timeLeft <= 30 * 60e3);
  }

  /* ============================================================
     HUD
     ============================================================ */
  function isNarrow() {
    return window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  }

  function setHud(open) {
    S.hudOpen = !!open;
    $('hud').hidden = !S.hudOpen;
    $('btn-hud-toggle').setAttribute('aria-pressed', S.hudOpen ? 'true' : 'false');
    if (S.hudOpen) updateHud();
  }

  function updateHud() {
    if (!S.hudOpen) return;
    var e = S.engine.est.estimate();
    $('hud-theta').textContent = e.theta.toFixed(2);
    $('hud-se').textContent = S.engine.est.n ? e.se.toFixed(2) : '—';
    $('hud-ci').textContent = S.engine.est.n ? e.ciLow.toFixed(2) + ' to ' + e.ciHigh.toFixed(2) : '—';
    $('hud-n').textContent = String(S.delivered.length);
    var exact = S.delivered.filter(function (d) { return d.exact; }).length;
    $('hud-correct').textContent = exact + ' (' + (S.delivered.length ? Math.round(100 * exact / S.delivered.length) : 0) + '%)';

    var pct = function (t) { return Math.max(0, Math.min(100, (t + 3) / 6 * 100)); };
    $('hud-band').style.left = pct(e.ciLow) + '%';
    $('hud-band').style.width = Math.max(1, pct(e.ciHigh) - pct(e.ciLow)) + '%';
    $('hud-dot').style.left = pct(e.theta) + '%';

    var v = $('hud-verdict');
    v.classList.remove('good', 'bad');
    var need = S.cfg.min - S.delivered.length;
    if (e.ciLow > IRT.PASSING_STANDARD) {
      v.classList.add('good');
      v.textContent = need > 0
        ? 'Above the standard with 95% confidence — ' + need + ' more item' + (need === 1 ? '' : 's') + ' needed to reach the minimum.'
        : 'Above the passing standard with 95% confidence.';
    } else if (e.ciHigh < IRT.PASSING_STANDARD) {
      v.classList.add('bad');
      v.textContent = need > 0
        ? 'Below the standard with 95% confidence — ' + need + ' more item' + (need === 1 ? '' : 's') + ' needed to reach the minimum.'
        : 'Below the passing standard with 95% confidence.';
    } else {
      v.textContent = 'Still within the uncertainty band around the passing standard. Testing continues.';
    }
    drawSpark();
  }

  function drawSpark() {
    var c = $('hud-spark');
    if (!c) return;
    var dpr = window.devicePixelRatio || 1;
    var w = c.clientWidth || 260, h = 70;
    c.width = w * dpr; c.height = h * dpr;
    var g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    var hist = S.engine.history;
    var y = function (t) { return h - ((t + 3) / 6) * h; };
    g.strokeStyle = '#c9ced4'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, y(0)); g.lineTo(w, y(0)); g.stroke();
    if (hist.length < 2) return;
    var x = function (i) { return (i / (hist.length - 1)) * (w - 4) + 2; };
    g.fillStyle = 'rgba(28,93,168,.18)';
    g.beginPath();
    hist.forEach(function (p, i) { i ? g.lineTo(x(i), y(p.theta + 1.96 * p.se)) : g.moveTo(x(i), y(p.theta + 1.96 * p.se)); });
    for (var i = hist.length - 1; i >= 0; i--) g.lineTo(x(i), y(hist[i].theta - 1.96 * hist[i].se));
    g.closePath(); g.fill();
    g.strokeStyle = '#1c5da8'; g.lineWidth = 2;
    g.beginPath();
    hist.forEach(function (p, i) { i ? g.lineTo(x(i), y(p.theta)) : g.moveTo(x(i), y(p.theta)); });
    g.stroke();
  }

  /* ============================================================
     Finish + report
     ============================================================ */
  function finishExam(timeUp) {
    stopTimer();
    if (S.finished) { show('screen-report'); return; }
    if (timeUp && !S.engine.stopReason) S.engine.checkStop(true, false);
    if (!S.engine.stopReason) S.engine.stopReason = 'ended-early';
    S.finished = true;
    S.result = buildResult();
    try { localStorage.setItem(RESULT_KEY, JSON.stringify({ at: Date.now(), summary: S.result.summary })); } catch (e) {}
    clearSave();
    renderReport();
    show('screen-report');
  }

  function catStats() {
    var stats = {};
    Object.keys(CATS).forEach(function (k) {
      stats[k] = { n: 0, score: 0, expected: 0, varSum: 0, exact: 0 };
    });
    S.delivered.forEach(function (d) {
      var st = stats[d.item.cat];
      if (!st) return;
      var p = IRT.pCorrect(IRT.PASSING_STANDARD, d.item.b);
      st.n++;
      st.score += d.score;
      st.exact += d.exact ? 1 : 0;
      st.expected += p;
      st.varSum += p * (1 - p);
    });
    Object.keys(stats).forEach(function (k) {
      var st = stats[k];
      st.pct = st.n ? st.score / st.n : 0;
      st.z = st.n && st.varSum > 0 ? (st.score - st.expected) / Math.sqrt(st.varSum) : 0;
      st.band = st.n === 0 ? 'none' : (st.z > 0.5 ? 'above' : (st.z < -0.5 ? 'below' : 'near'));
    });
    return stats;
  }

  function buildResult() {
    var e = S.engine.est.estimate();
    var decision = S.engine.decide();
    if (S.engine.stopReason === 'ended-early') {
      decision = {
        pass: null, rule: 'ended-early',
        detail: 'You ended the exam before a stopping rule was met, so no pass/fail decision can be made. ' +
                'The ability estimate below reflects the ' + S.delivered.length + ' item(s) you answered.'
      };
    }
    var exact = S.delivered.filter(function (d) { return d.exact; }).length;
    var partial = S.delivered.filter(function (d) { return !d.exact && d.score > 0; }).length;
    var totalScore = S.delivered.reduce(function (a, d) { return a + d.score; }, 0);
    var timeUsed = S.timed ? (S.opts.timeLimit * 1000 - S.timeLeft) : (Date.now() - S.startedAt);

    return {
      theta: e.theta, se: e.se, ciLow: e.ciLow, ciHigh: e.ciHigh, pAbove: e.pAbove,
      decision: decision, stopReason: S.engine.stopReason,
      n: S.delivered.length, exact: exact, partial: partial,
      totalScore: totalScore, timeUsed: timeUsed,
      cats: catStats(), history: S.engine.history,
      summary: {
        at: Date.now(), n: S.delivered.length, theta: e.theta,
        pass: decision.pass, exact: exact
      }
    };
  }

  function renderReport() {
    var R = S.result, host = $('report-host');
    host.innerHTML = '';

    /* -- verdict -- */
    var cls = R.decision.pass === true ? 'pass' : (R.decision.pass === false ? 'fail' : 'borderline');
    var v = el('div', 'verdict ' + cls);
    v.appendChild(el('h1', null,
      R.decision.pass === true ? 'Predicted result: PASS' :
      R.decision.pass === false ? 'Predicted result: FAIL' : 'No decision — exam ended early'));
    v.appendChild(el('p', 'vsub', R.decision.detail));
    var raw = 100 * (R.decision.pass === false ? (1 - R.pAbove) : R.pAbove);
    // never claim certainty: the model is a small-bank approximation
    var conf = raw >= 99.5 ? '>99' : raw.toFixed(0);
    if (R.decision.pass !== null) {
      v.appendChild(el('span', 'vconf', 'Model confidence in this prediction: ' + conf + '%  ·  stopping rule: ' + R.decision.rule));
    }
    host.appendChild(v);

    /* -- headline stats -- */
    var grid = el('div', 'stat-grid');
    function stat(k, val, note) {
      var s = el('div', 'stat');
      s.appendChild(el('div', 'k', k));
      s.appendChild(el('div', 'v', val));
      if (note) s.appendChild(el('div', 'n', note));
      grid.appendChild(s);
    }
    stat('Items delivered', String(R.n), 'range ' + S.cfg.min + '–' + S.cfg.max);
    stat('Ability estimate', R.theta.toFixed(2) + ' logits', 'passing standard 0.00');
    stat('95% interval', R.ciLow.toFixed(2) + ' – ' + R.ciHigh.toFixed(2), 'SE ' + R.se.toFixed(2));
    stat('Fully correct', R.exact + ' / ' + R.n, R.n ? Math.round(100 * R.exact / R.n) + '%' : '—');
    stat('Partial credit', String(R.partial), 'items with some credit');
    stat('Time used', fmtDur(R.timeUsed), R.n ? '≈ ' + fmtDur(R.timeUsed / R.n) + ' per item' : '');
    host.appendChild(grid);

    /* -- how to read it -- */
    var expl = el('div', 'card');
    expl.appendChild(el('h2', null, 'How this decision was reached'));
    expl.appendChild(el('p', null,
      'Ability is reported in logits on the same scale the NCLEX uses, where 0.00 logits is the passing standard. ' +
      'After each answer the model updates a posterior distribution over your ability. The exam stops as soon as ' +
      'the 95% interval falls entirely on one side of the standard, or when the item or time limit is reached.'));
    var pa = 100 * R.pAbove;
    var p2 = el('p', null,
      'Your posterior probability of being above the passing standard is ' +
      (pa >= 99.95 ? 'greater than 99.9' : pa <= 0.05 ? 'less than 0.1' : pa.toFixed(1)) + '%. ');
    expl.appendChild(p2);
    expl.appendChild(el('p', 'muted small',
      'This is a practice estimate from a small item bank, not a prediction of your actual NCLEX result. ' +
      'Real item difficulty parameters come from large calibration samples; the values here were assigned by the author of the bank.'));
    host.appendChild(expl);

    /* -- ability trajectory -- */
    var trajCard = el('div', 'card');
    trajCard.appendChild(el('h2', null, 'Ability estimate across the exam'));
    var cv = el('canvas'); cv.id = 'traj';
    trajCard.appendChild(cv);
    trajCard.appendChild(el('p', 'muted small',
      'Blue line: ability estimate after each item. Shaded band: 95% confidence interval. Dark line: passing standard.'));
    host.appendChild(trajCard);

    /* -- category breakdown -- */
    var catCard = el('div', 'card');
    catCard.appendChild(el('h2', null, 'Performance by client need category'));
    var tbl = el('table', 'breakdown');
    var thead = el('thead');
    var htr = el('tr');
    ['Client need', 'Test plan %', 'Items', 'Score', '% of possible', 'Vs. passing standard'].forEach(function (h) {
      htr.appendChild(el('th', null, h));
    });
    thead.appendChild(htr); tbl.appendChild(thead);
    var tb = el('tbody');
    Object.keys(CATS).forEach(function (k) {
      var st = R.cats[k], meta = CATS[k];
      var tr = el('tr');
      var td0 = el('td');
      td0.appendChild(el('div', null, meta.name));
      td0.appendChild(el('div', 'muted small', meta.group));
      tr.appendChild(td0);
      tr.appendChild(el('td', 'num', meta.range));
      tr.appendChild(el('td', 'num', String(st.n)));
      tr.appendChild(el('td', 'num', st.n ? st.score.toFixed(1) : '—'));
      var tdBar = el('td');
      if (st.n) {
        var bar = el('div', 'bar');
        var fill = el('i');
        fill.style.width = Math.round(st.pct * 100) + '%';
        fill.style.background = st.band === 'above' ? '#1a7a44' : (st.band === 'below' ? '#b3261e' : '#c99700');
        bar.appendChild(fill);
        tdBar.appendChild(bar);
        tdBar.appendChild(el('div', 'muted small', Math.round(st.pct * 100) + '%'));
      } else tdBar.textContent = '—';
      tr.appendChild(tdBar);
      var tdPill = el('td');
      if (st.n) {
        tdPill.appendChild(el('span', 'pill ' + st.band,
          st.band === 'above' ? 'Above the standard' : st.band === 'below' ? 'Below the standard' : 'Near the standard'));
      } else tdPill.textContent = 'Not assessed';
      tr.appendChild(tdPill);
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    catCard.appendChild(tbl);
    catCard.appendChild(el('p', 'muted small',
      'Category ratings compare the credit you earned against the credit a candidate exactly at the passing standard ' +
      'would be expected to earn on the same items, so they are not simply percent correct. Categories with few items ' +
      'carry little information — treat them as a hint, not a verdict.'));
    host.appendChild(catCard);

    /* -- item type breakdown -- */
    var typeCard = el('div', 'card');
    typeCard.appendChild(el('h2', null, 'Performance by item type'));
    var byType = {};
    S.delivered.forEach(function (d) {
      var t = byType[d.item.type] || (byType[d.item.type] = { n: 0, score: 0, exact: 0 });
      t.n++; t.score += d.score; t.exact += d.exact ? 1 : 0;
    });
    var t2 = el('table', 'breakdown');
    var th2 = el('thead'), htr2 = el('tr');
    ['Item type', 'Items', 'Fully correct', '% of possible credit'].forEach(function (h) { htr2.appendChild(el('th', null, h)); });
    th2.appendChild(htr2); t2.appendChild(th2);
    var tbb = el('tbody');
    Object.keys(byType).sort().forEach(function (k) {
      var t = byType[k], tr = el('tr');
      tr.appendChild(el('td', null, Items.TYPE_LABEL[k] || k));
      tr.appendChild(el('td', 'num', String(t.n)));
      tr.appendChild(el('td', 'num', t.exact + ' / ' + t.n));
      tr.appendChild(el('td', 'num', Math.round(100 * t.score / t.n) + '%'));
      tbb.appendChild(tr);
    });
    t2.appendChild(tbb);
    typeCard.appendChild(t2);
    host.appendChild(typeCard);

    /* -- actions -- */
    var act = el('div', 'btn-row');
    var bRev = el('button', 'btn btn-primary btn-lg', 'Review every question');
    bRev.type = 'button';
    bRev.addEventListener('click', function () { renderReview(); show('screen-review'); });
    var bPrint = el('button', 'btn', 'Print / save as PDF');
    bPrint.type = 'button';
    bPrint.addEventListener('click', function () { window.print(); });
    var bDl = el('button', 'btn', 'Download results (JSON)');
    bDl.type = 'button';
    bDl.addEventListener('click', downloadResults);
    var bNew = el('button', 'btn', 'Start a new exam');
    bNew.type = 'button';
    bNew.addEventListener('click', function () { location.reload(); });
    [bRev, bPrint, bDl, bNew].forEach(function (b) { act.appendChild(b); });
    host.appendChild(act);

    drawTrajectory();
  }

  function drawTrajectory() {
    var c = $('traj');
    if (!c) return;
    var dpr = window.devicePixelRatio || 1;
    var w = c.clientWidth || 800, h = 220;
    c.width = w * dpr; c.height = h * dpr;
    var g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    var pad = { l: 40, r: 12, t: 12, b: 26 };
    var hist = S.result.history;
    var lo = -3, hi = 3;
    var X = function (i) { return pad.l + (hist.length <= 1 ? 0 : i / (hist.length - 1)) * (w - pad.l - pad.r); };
    var Y = function (t) { return pad.t + (1 - (t - lo) / (hi - lo)) * (h - pad.t - pad.b); };

    g.strokeStyle = '#e3e7ea'; g.lineWidth = 1; g.fillStyle = '#6d7278'; g.font = '11px sans-serif';
    for (var t = lo; t <= hi; t++) {
      g.beginPath(); g.moveTo(pad.l, Y(t)); g.lineTo(w - pad.r, Y(t)); g.stroke();
      g.fillText(t > 0 ? '+' + t : String(t), 8, Y(t) + 4);
    }
    if (!hist.length) return;
    g.fillStyle = 'rgba(28,93,168,.16)';
    g.beginPath();
    hist.forEach(function (p, i) { i ? g.lineTo(X(i), Y(p.theta + 1.96 * p.se)) : g.moveTo(X(i), Y(p.theta + 1.96 * p.se)); });
    for (var i = hist.length - 1; i >= 0; i--) g.lineTo(X(i), Y(hist[i].theta - 1.96 * hist[i].se));
    g.closePath(); g.fill();

    g.strokeStyle = '#1f3a5f'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(pad.l, Y(0)); g.lineTo(w - pad.r, Y(0)); g.stroke();

    g.strokeStyle = '#1c5da8'; g.lineWidth = 2.5;
    g.beginPath();
    hist.forEach(function (p, i) { i ? g.lineTo(X(i), Y(p.theta)) : g.moveTo(X(i), Y(p.theta)); });
    g.stroke();

    hist.forEach(function (p, i) {
      g.fillStyle = p.score >= 0.999 ? '#1a7a44' : (p.score > 0 ? '#c99700' : '#b3261e');
      g.beginPath(); g.arc(X(i), Y(p.theta), 2.6, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = '#6d7278';
    g.fillText('Item 1', pad.l, h - 8);
    g.fillText('Item ' + hist.length, w - pad.r - 46, h - 8);
  }

  function downloadResults() {
    var R = S.result;
    var payload = {
      generatedAt: new Date().toISOString(),
      simulator: 'NCLEX-RN style adaptive practice exam (unofficial)',
      itemsDelivered: R.n,
      ability: { logits: +R.theta.toFixed(3), se: +R.se.toFixed(3), ci95: [+R.ciLow.toFixed(3), +R.ciHigh.toFixed(3)] },
      passingStandard: IRT.PASSING_STANDARD,
      decision: R.decision,
      stopReason: R.stopReason,
      timeUsedSeconds: Math.round(R.timeUsed / 1000),
      categories: Object.keys(CATS).map(function (k) {
        return { code: k, name: CATS[k].name, items: R.cats[k].n,
                 credit: +R.cats[k].score.toFixed(2), rating: R.cats[k].band };
      }),
      items: S.delivered.map(function (d, i) {
        return {
          position: i + 1, id: d.item.srcId || d.item.id, category: d.item.cat,
          type: d.item.type, difficulty: d.item.b, score: +d.score.toFixed(3),
          seconds: Math.round(d.ms / 1000),
          yourAnswer: Items.describe(d.item, d.response, false),
          correctAnswer: Items.describe(d.item, d.response, true)
        };
      })
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nclex-practice-results.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ============================================================
     Review mode
     ============================================================ */
  var reviewFilter = 'all';

  function renderReview() {
    var host = $('review-host');
    host.innerHTML = '';

    var head = el('div');
    head.appendChild(el('h1', null, 'Exam review'));
    head.appendChild(el('p', 'muted', 'Every item you were given, your response, the scoring key and a rationale.'));
    host.appendChild(head);

    var filters = el('div', 'review-filters');
    [['all', 'All items'], ['wrong', 'Missed'], ['partial', 'Partial credit'], ['correct', 'Correct'], ['case', 'Case studies']]
      .forEach(function (f) {
        var b = el('button', 'rf', f[1]);
        b.type = 'button';
        b.setAttribute('aria-pressed', reviewFilter === f[0] ? 'true' : 'false');
        b.addEventListener('click', function () { reviewFilter = f[0]; renderReview(); });
        filters.appendChild(b);
      });
    var back = el('button', 'rf', '← Back to score report');
    back.type = 'button';
    back.addEventListener('click', function () { show('screen-report'); });
    filters.appendChild(back);
    var expand = el('button', 'rf', 'Expand all');
    expand.type = 'button';
    expand.addEventListener('click', function () {
      host.querySelectorAll('.rev-item').forEach(function (n) { n.classList.add('open'); });
    });
    filters.appendChild(expand);
    host.appendChild(filters);

    var shown = 0;
    S.delivered.forEach(function (d, i) {
      var kind = d.exact ? 'correct' : (d.score > 0 ? 'partial' : 'wrong');
      if (reviewFilter === 'wrong' && kind !== 'wrong') return;
      if (reviewFilter === 'partial' && kind !== 'partial') return;
      if (reviewFilter === 'correct' && kind !== 'correct') return;
      if (reviewFilter === 'case' && !d.caseTitle) return;
      shown++;
      host.appendChild(reviewCard(d, i));
    });
    if (!shown) host.appendChild(el('p', 'muted', 'No items match this filter.'));
  }

  function reviewCard(d, i) {
    var item = d.item;
    var kind = d.exact ? 'correct' : (d.score > 0 ? 'partial' : 'wrong');
    var card = el('div', 'rev-item ' + kind);

    var head = el('button', 'rev-head');
    head.type = 'button';
    head.appendChild(el('span', 'idx', '#' + (i + 1)));
    head.appendChild(el('span', 'pill ' + (kind === 'correct' ? 'above' : kind === 'partial' ? 'near' : 'below'),
      kind === 'correct' ? 'Correct' : kind === 'partial' ? Math.round(d.score * 100) + '% credit' : 'Incorrect'));
    head.appendChild(el('span', 'lbl', (item.caseTitle ? '[' + item.caseTitle + '] ' : '') +
      item.stem.slice(0, 110) + (item.stem.length > 110 ? '…' : '')));
    head.appendChild(el('span', 'muted small', Items.TYPE_LABEL[item.type]));
    head.addEventListener('click', function () { card.classList.toggle('open'); });
    card.appendChild(head);

    var body = el('div', 'rev-body');

    if (item.scenario) {
      var sc = el('div', 'q-scenario');
      sc.appendChild(el('h4', null, item.scenarioLabel || 'Client scenario'));
      item.scenario.split('\n').forEach(function (p) { sc.appendChild(el('p', null, p)); });
      body.appendChild(sc);
    }
    var chart = Items.renderChart(item);
    if (chart) body.appendChild(chart);
    body.appendChild(el('p', 'q-stem', item.stem));

    // option-level marking for the two most common types
    if (item.type === 'mc' || item.type === 'sata') {
      var ul = el('ul', 'opts');
      var key = item.type === 'mc' ? [item.answer] : item.answer;
      var picked = item.type === 'mc' ? (d.response === null ? [] : [d.response]) : d.response;
      item.options.forEach(function (txt, oi) {
        var isKey = key.indexOf(oi) !== -1, isPick = picked.indexOf(oi) !== -1;
        var li = el('li', 'opt');
        li.style.cursor = 'default';
        var mark = isKey ? '✓' : (isPick ? '✗' : '  ');
        var m = el('b', null, mark);
        m.style.color = isKey ? '#1a7a44' : '#b3261e';
        m.style.minWidth = '1.2rem';
        li.appendChild(m);
        li.appendChild(el('span', 'opt-txt', Items.LETTERS[oi] + '. ' + txt));
        if (isKey) { li.style.background = '#e8f5ee'; li.style.borderColor = '#b6dfc8'; }
        else if (isPick) { li.style.background = '#fdecea'; li.style.borderColor = '#f0c2be'; }
        if (isPick) li.appendChild(el('span', 'muted small', 'your choice'));
        ul.appendChild(li);
      });
      body.appendChild(ul);
    } else {
      var yours = el('div', 'ans-box yours' + (d.exact ? ' ok' : ''));
      yours.appendChild(el('h5', null, 'Your response'));
      yours.appendChild(el('div', null, Items.describe(item, d.response, false)));
      body.appendChild(yours);

      var keyBox = el('div', 'ans-box key');
      keyBox.appendChild(el('h5', null, 'Scoring key'));
      keyBox.appendChild(el('div', null, Items.describe(item, d.response, true)));
      body.appendChild(keyBox);
    }

    var rat = el('div', 'rationale');
    rat.appendChild(el('h5', null, 'Rationale'));
    item.rationale.split('\n').forEach(function (p) { rat.appendChild(el('p', null, p)); });
    body.appendChild(rat);

    var meta = el('div', 'rev-meta');
    meta.appendChild(el('span', null, CATS[item.cat] ? CATS[item.cat].name : item.cat));
    meta.appendChild(el('span', null, 'Difficulty ' + item.b.toFixed(2) + ' logits'));
    meta.appendChild(el('span', null, 'Time ' + Math.round(d.ms / 1000) + ' s'));
    meta.appendChild(el('span', null, 'Item ' + (item.srcId || item.id)));
    body.appendChild(meta);

    card.appendChild(body);
    return card;
  }

  /* ============================================================
     Persistence
     ============================================================ */
  function save() {
    if (!S || S.finished) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: 1,
        opts: S.opts,
        timeLeft: S.timeLeft,
        startedAt: S.startedAt,
        breaksTaken: S.breaksTaken,
        stopReason: S.engine.stopReason,
        used: Object.keys(S.engine.used),
        counts: S.engine.counts,
        delivered: S.delivered.map(function (d) {
          return { item: d.item, response: d.response, score: d.score, exact: d.exact, ms: d.ms, caseTitle: d.caseTitle };
        }),
        current: S.current ? { item: S.current.item, response: S.current.response.value } : null,
        caseBuffer: S.caseBuffer,
        activeCase: S.activeCase,
        caseQueue: S.caseQueue.map(function (q) { return { at: q.at, id: q.kase.id }; }),
        est: S.engine.est.snapshot(),
        history: S.engine.history
      }));
    } catch (e) { /* storage full or unavailable - practice continues in memory */ }
  }
  function clearSave() { try { localStorage.removeItem(STORAGE_KEY); } catch (e) {} }
  function loadSave() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
  }

  function resume(saved) {
    S = buildExam(saved.opts);
    S.timeLeft = saved.timeLeft;
    S.startedAt = saved.startedAt;
    S.breaksTaken = saved.breaksTaken || [];
    S.delivered = saved.delivered || [];
    S.caseBuffer = saved.caseBuffer || [];
    S.activeCase = saved.activeCase || null;
    S.caseQueue = (saved.caseQueue || []).map(function (q) {
      var k = CASES.filter(function (c) { return c.id === q.id; })[0];
      return k ? { at: q.at, kase: k } : null;
    }).filter(Boolean);

    (saved.used || []).forEach(function (id) { S.engine.used[id] = true; });
    S.engine.counts = saved.counts || {};
    S.engine.delivered = S.delivered.length + (saved.current ? 1 : 0);
    S.engine.est = IRT.Estimator.restore(saved.est);
    S.engine.history = saved.history || [];

    startExamUi();
    if (saved.current) {
      S.current = {
        item: saved.current.item,
        response: { value: saved.current.response },
        startTs: Date.now()
      };
      paintItem();
    } else {
      deliverNext();
    }
    updateHud();
  }

  /* ============================================================
     Wiring
     ============================================================ */
  function startExamUi() {
    $('exam-candidate').textContent = S.opts.name || 'Candidate';
    // On phones the panel would cover the question, so it starts closed and
    // is opened on demand from the Performance button.
    setHud(S.opts.hud && !isNarrow());
    $('btn-hud-toggle').hidden = !S.opts.hud;
    $('btn-break').hidden = !S.opts.breaks || !S.timed;
    show('screen-exam');
    paintTime();
    startTimer();
    updateHud();
  }

  function beginExam() {
    var opts = {
      name: ($('opt-name').value || 'Candidate').trim().slice(0, 40),
      length: $('opt-length').value,
      timeLimit: parseInt($('opt-time').value, 10),
      hud: $('opt-hud').checked,
      breaks: $('opt-breaks').checked,
      cases: $('opt-cases').checked
    };
    clearSave();
    S = buildExam(opts);
    startExamUi();
    deliverNext();
  }

  function wire() {
    $('btn-start').addEventListener('click', beginExam);

    $('btn-next').addEventListener('click', submitCurrent);
    $('btn-resume-exam').addEventListener('click', function () { show('screen-exam'); });

    $('btn-hud-toggle').addEventListener('click', function () { setHud(!S.hudOpen); });
    $('hud-close').addEventListener('click', function () { setHud(false); });
    $('btn-break').addEventListener('click', startBreak);

    $('btn-quit').addEventListener('click', function () {
      modal('End the exam?',
        'The adaptive stopping rules will not have been satisfied, so no pass/fail prediction can be made. ' +
        'You will still get a full review of every item you answered.',
        [{ label: 'Keep testing', fn: function () {} },
         { label: 'End exam', cls: 'btn-danger', fn: function () { S.engine.stopReason = 'ended-early'; finishExam(); } }]);
    });

    document.addEventListener('keydown', function (e) {
      if (!$('screen-exam').classList.contains('is-active')) return;
      if (e.key === 'Enter' && !e.shiftKey && document.activeElement.tagName !== 'SELECT') {
        if (!$('btn-next').disabled) { e.preventDefault(); submitCurrent(); }
      }
    });

    window.addEventListener('beforeunload', function () { if (S && !S.finished) save(); });
    window.addEventListener('resize', function () {
      if ($('screen-exam').classList.contains('is-active') && S && S.hudOpen) drawSpark();
      if ($('screen-report').classList.contains('is-active') && S && S.result) drawTrajectory();
    });

    wireCalculator();
  }

  /* ---------------- calculator ---------------- */
  function wireCalculator() {
    var keys = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];
    var pad = $('calc-pad');
    var disp = $('calc-display');
    var acc = null, op = null, fresh = true;

    function setDisp(v) { disp.textContent = String(v).slice(0, 16); }
    function cur() { return parseFloat(disp.textContent) || 0; }
    function apply() {
      if (op === null || acc === null) return cur();
      var b = cur(), r = acc;
      if (op === '+') r = acc + b;
      else if (op === '−') r = acc - b;
      else if (op === '×') r = acc * b;
      else if (op === '÷') r = b === 0 ? NaN : acc / b;
      return Math.round(r * 1e10) / 1e10;
    }

    keys.forEach(function (k) {
      var b = el('button', /[÷×−+=]/.test(k) ? 'op' : '', k);
      b.type = 'button';
      if (k === '=') b.className = 'eq';
      b.addEventListener('click', function () {
        if (/[0-9]/.test(k)) { setDisp(fresh ? k : (disp.textContent === '0' ? k : disp.textContent + k)); fresh = false; }
        else if (k === '.') { if (fresh) { setDisp('0.'); fresh = false; } else if (disp.textContent.indexOf('.') === -1) setDisp(disp.textContent + '.'); }
        else if (k === 'C') { setDisp(0); acc = null; op = null; fresh = true; }
        else if (k === '⌫') { var t = disp.textContent.slice(0, -1); setDisp(t === '' || t === '-' ? 0 : t); }
        else if (k === '±') setDisp(cur() * -1);
        else if (k === '%') { setDisp(cur() / 100); fresh = true; }
        else if (k === '=') { var r = apply(); setDisp(isNaN(r) ? 'Error' : r); acc = null; op = null; fresh = true; }
        else { var v = apply(); setDisp(isNaN(v) ? 'Error' : v); acc = isNaN(v) ? 0 : v; op = k; fresh = true; }
      });
      pad.appendChild(b);
    });

    $('btn-calc').addEventListener('click', function () { $('calc').hidden = !$('calc').hidden; });
    $('calc-close').addEventListener('click', function () { $('calc').hidden = true; });
  }

  /* ---------------- start screen bootstrap ---------------- */
  function bootStartScreen() {
    var byCat = {};
    BANK.forEach(function (q) { byCat[q.cat] = (byCat[q.cat] || 0) + 1; });
    var caseItems = CASES.reduce(function (a, c) { return a + c.items.length; }, 0);
    $('bank-stats').textContent =
      'Item bank: ' + BANK.length + ' stand-alone items + ' + CASES.length + ' case studies (' +
      caseItems + ' linked items) = ' + (BANK.length + caseItems) + ' total. ' +
      Object.keys(CATS).map(function (k) { return CATS[k].name.split(' ')[0] + ' ' + (byCat[k] || 0); }).join(' · ');

    var saved = loadSave();
    if (saved && saved.delivered) {
      $('resume-box').hidden = false;
      $('resume-box').querySelector('p').textContent =
        'An exam in progress was found on this device — ' + saved.delivered.length +
        ' item(s) answered, ' + fmtClock(saved.timeLeft) + ' remaining.';
      $('btn-resume').addEventListener('click', function () { resume(saved); });
      $('btn-discard').addEventListener('click', function () { clearSave(); $('resume-box').hidden = true; });
    }
  }

  /* ---------------- service worker (offline) ---------------- */
  function registerSw() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline caching unavailable */ });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!BANK.length) {
      document.body.innerHTML = '<p style="padding:2rem;font:16px sans-serif">The question bank failed to load. ' +
        'Make sure the <code>js/bank/</code> files are next to <code>index.html</code>.</p>';
      return;
    }
    wire();
    bootStartScreen();
    registerSw();
  });
})();
