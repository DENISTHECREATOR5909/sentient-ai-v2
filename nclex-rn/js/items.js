/* ============================================================
   items.js - rendering, response capture and scoring for every
   item type used by the simulator.
   ============================================================ */
(function (global) {
  'use strict';

  var LETTERS = 'ABCDEFGHIJKLMNOP';

  /* ---------------- small helpers ---------------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function inArr(a, v) { return a.indexOf(v) !== -1; }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  /* ------------------------------------------------------------
     prepareItem - returns a delivery copy with options shuffled
     and answer keys remapped so repeated practice is not rote.
     ------------------------------------------------------------ */
  function prepareItem(item, rng) {
    var d = JSON.parse(JSON.stringify(item));
    d.srcId = item.id;
    var perm, i;

    if (d.type === 'mc' || d.type === 'sata') {
      perm = shuffle(range(d.options.length), rng);
      d.options = perm.map(function (p) { return item.options[p]; });
      if (d.type === 'mc') d.answer = perm.indexOf(item.answer);
      else d.answer = item.answer.map(function (a) { return perm.indexOf(a); }).sort(function (x, y) { return x - y; });
      d.perm = perm;
    } else if (d.type === 'ordered') {
      // options are stored in the correct sequence; display them scrambled
      perm = shuffle(range(d.options.length), rng);
      if (perm.every(function (p, k) { return p === k; }) && perm.length > 1) { var t = perm[0]; perm[0] = perm[1]; perm[1] = t; }
      d.display = perm;                       // display slot k shows source option perm[k]
    } else if (d.type === 'dragdrop') {
      perm = shuffle(range(d.tokens.length), rng);
      d.tokens = perm.map(function (p) { return item.tokens[p]; });
      d.answer = perm.map(function (p) { return item.answer[p]; });
    } else if (d.type === 'bowtie') {
      d.poolActions = shuffle(range(d.actions.length), rng);
      d.poolConditions = shuffle(range(d.conditions.length), rng);
      d.poolParams = shuffle(range(d.params.length), rng);
    } else if (d.type === 'cloze') {
      d.blanks.forEach(function (bl, bi) {
        var p = shuffle(range(bl.options.length), rng);
        bl.options = p.map(function (x) { return item.blanks[bi].options[x]; });
        bl.answer = p.indexOf(item.blanks[bi].answer);
      });
    }
    return d;
  }

  /* ------------------------------------------------------------
     Empty response for a given item type
     ------------------------------------------------------------ */
  function blankResponse(item) {
    switch (item.type) {
      case 'mc': return null;
      case 'sata': return [];
      case 'ordered': return item.display.slice();          // current visual order
      case 'dragdrop': return item.tokens.map(function () { return null; });
      case 'bowtie': return { actions: [], condition: null, params: [] };
      case 'matrix': return item.rows.map(function () { return null; });
      case 'cloze': return item.blanks.map(function () { return null; });
      case 'highlight': return [];
      default: return null;
    }
  }

  /* ------------------------------------------------------------
     Completeness - the Next button stays disabled until true
     ------------------------------------------------------------ */
  function isComplete(item, r) {
    switch (item.type) {
      case 'mc': return r !== null && r !== undefined;
      case 'sata': return r.length > 0;
      case 'ordered': return true;
      case 'dragdrop': return r.every(function (v) { return v !== null; });
      case 'bowtie': return r.actions.length === item.slots.actions &&
                            r.condition !== null &&
                            r.params.length === item.slots.params;
      case 'matrix': return r.every(function (v) { return v !== null; });
      case 'cloze': return r.every(function (v) { return v !== null; });
      case 'highlight': return r.length > 0;
      default: return false;
    }
  }

  /* ------------------------------------------------------------
     Scoring.  Returns { score: 0..1, exact: bool }
     ------------------------------------------------------------ */
  function plusMinus(selected, key, total) {
    var hit = 0, miss = 0;
    selected.forEach(function (s) { inArr(key, s) ? hit++ : miss++; });
    return Math.max(0, hit - miss) / key.length;
  }

  function score(item, r) {
    var s = 0, i, n;
    switch (item.type) {
      case 'mc':
        s = (r === item.answer) ? 1 : 0; break;
      case 'sata':
        s = plusMinus(r, item.answer); break;
      case 'ordered':
        // ordered response is scored all-or-nothing
        s = r.every(function (srcIdx, slot) { return srcIdx === slot; }) ? 1 : 0; break;
      case 'dragdrop':
        n = 0; for (i = 0; i < r.length; i++) if (r[i] === item.answer[i]) n++;
        s = n / r.length; break;
      case 'bowtie':
        // bow-tie is scored all-or-nothing
        s = (r.condition === item.answer.condition &&
             uniq(r.actions).sort().join(',') === item.answer.actions.slice().sort().join(',') &&
             uniq(r.params).sort().join(',') === item.answer.params.slice().sort().join(',')) ? 1 : 0;
        break;
      case 'matrix':
        n = 0; for (i = 0; i < r.length; i++) if (r[i] === item.answer[i]) n++;
        s = n / r.length; break;
      case 'cloze':
        n = 0; for (i = 0; i < r.length; i++) if (r[i] === item.blanks[i].answer) n++;
        s = n / r.length; break;
      case 'highlight':
        s = plusMinus(r, item.answer); break;
    }
    s = Math.max(0, Math.min(1, s));
    return { score: s, exact: s >= 0.999 };
  }

  /* ------------------------------------------------------------
     Human readable answer text, used by review mode
     ------------------------------------------------------------ */
  function describe(item, r, useKey) {
    var i, out = [];
    switch (item.type) {
      case 'mc':
        if (useKey) return LETTERS[item.answer] + '. ' + item.options[item.answer];
        return (r === null || r === undefined) ? 'No response' : LETTERS[r] + '. ' + item.options[r];
      case 'sata':
        var picks = useKey ? item.answer : r;
        if (!picks || !picks.length) return 'No response';
        return picks.slice().sort(function (a, b) { return a - b; })
          .map(function (k) { return LETTERS[k] + '. ' + item.options[k]; }).join(' | ');
      case 'ordered':
        var order = useKey ? range(item.options.length) : r;
        return order.map(function (srcIdx, k) { return (k + 1) + '. ' + item.options[srcIdx]; }).join(' → ');
      case 'dragdrop':
        for (i = 0; i < item.tokens.length; i++) {
          var bidx = useKey ? item.answer[i] : r[i];
          out.push(item.tokens[i] + ' → ' + (bidx === null || bidx === undefined ? '(unplaced)' : item.buckets[bidx]));
        }
        return out.join(' | ');
      case 'bowtie':
        var a = useKey ? item.answer : r;
        var acts = (a.actions || []).map(function (k) { return item.actions[k]; }).join(' + ') || '(none)';
        var cond = (a.condition === null || a.condition === undefined) ? '(none)' : item.conditions[a.condition];
        var par = (a.params || []).map(function (k) { return item.params[k]; }).join(' + ') || '(none)';
        return 'Condition: ' + cond + '  ||  Actions: ' + acts + '  ||  Monitor: ' + par;
      case 'matrix':
        for (i = 0; i < item.rows.length; i++) {
          var c = useKey ? item.answer[i] : r[i];
          out.push(item.rows[i] + ' → ' + (c === null || c === undefined ? '(blank)' : item.cols[c]));
        }
        return out.join(' | ');
      case 'cloze':
        for (i = 0; i < item.blanks.length; i++) {
          var v = useKey ? item.blanks[i].answer : r[i];
          out.push('(' + (i + 1) + ') ' + (v === null || v === undefined ? '(blank)' : item.blanks[i].options[v]));
        }
        return out.join(' | ');
      case 'highlight':
        var sel = useKey ? item.answer : r;
        if (!sel || !sel.length) return 'No response';
        return sel.slice().sort(function (a, b) { return a - b; })
          .map(function (k) { return '“' + item.segments[k].trim() + '”'; }).join(' | ');
    }
    return '';
  }

  /* ============================================================
     RENDERING
     ============================================================ */
  var TYPE_LABEL = {
    mc: 'Multiple choice', sata: 'Select all that apply', ordered: 'Ordered response',
    dragdrop: 'Drag and drop', bowtie: 'Bow-tie', matrix: 'Matrix / grid',
    cloze: 'Drop-down cloze', highlight: 'Highlight'
  };
  var TYPE_INSTR = {
    mc: 'Select the one best response.',
    sata: 'Select all that apply. Credit is given for each correct option; incorrect selections reduce the score.',
    ordered: 'Place the actions in the correct order. Drag an item, or use the arrow buttons.',
    dragdrop: 'Tap an item and then tap its destination, or drag it there. Every item must be placed.',
    bowtie: 'Complete the diagram. Tap a response from the pools below, then tap the box where it belongs.',
    matrix: 'Select one box in each row.',
    cloze: 'Choose the option in each drop-down list that completes the sentence.',
    highlight: 'Tap each finding that applies. Tap again to remove a highlight.'
  };

  function renderChart(item) {
    if (!item.record || !item.record.length) return null;
    var wrap = el('div', 'record');
    var tabs = el('div', 'record-tabs');
    tabs.setAttribute('role', 'tablist');
    var panels = [];
    item.record.forEach(function (sec, i) {
      var btn = el('button', 'record-tab', sec.tab);
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      var panel = el('div', 'record-panel' + (i === 0 ? ' is-active' : ''));
      if (sec.rows) {
        var tbl = el('table');
        var tb = el('tbody');
        sec.rows.forEach(function (row) {
          var tr = el('tr');
          tr.appendChild(el('th', null, row[0]));
          tr.appendChild(el('td', null, row[1]));
          tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        panel.appendChild(tbl);
      }
      if (sec.text) sec.text.split('\n').forEach(function (p) { panel.appendChild(el('p', null, p)); });
      btn.addEventListener('click', function () {
        tabs.querySelectorAll('.record-tab').forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
        btn.setAttribute('aria-selected', 'true');
        panels.forEach(function (p) { p.classList.remove('is-active'); });
        panel.classList.add('is-active');
      });
      tabs.appendChild(btn);
      panels.push(panel);
      wrap.appendChild(panel);
    });
    wrap.insertBefore(tabs, wrap.firstChild);
    return wrap;
  }

  /* -------- generic "pick a token, then pick a target" helper -------- */
  function TokenPicker() { this.sel = null; this.node = null; }
  TokenPicker.prototype.select = function (node, payload) {
    if (this.node) this.node.classList.remove('is-sel');
    if (this.node === node) { this.node = null; this.sel = null; return; }
    this.node = node; this.sel = payload;
    if (node) node.classList.add('is-sel');
  };
  TokenPicker.prototype.clear = function () {
    if (this.node) this.node.classList.remove('is-sel');
    this.node = null; this.sel = null;
  };

  function makeToken(text, num) {
    var t = el('div', 'tok');
    t.tabIndex = 0;
    t.setAttribute('draggable', 'true');
    if (num != null) t.appendChild(el('span', 'tok-num', String(num)));
    t.appendChild(el('span', 'tok-txt', text));
    return t;
  }

  /* ------------------------------------------------------------
     render(host, item, response, onChange)
     Mutates `response` in place and calls onChange().
     ------------------------------------------------------------ */
  function render(host, item, response, onChange) {
    host.innerHTML = '';

    host.appendChild(el('span', 'q-type', TYPE_LABEL[item.type] || 'Question'));

    if (item.scenario) {
      var sc = el('div', 'q-scenario');
      sc.appendChild(el('h4', null, item.scenarioLabel || 'Client scenario'));
      item.scenario.split('\n').forEach(function (p) { sc.appendChild(el('p', null, p)); });
      host.appendChild(sc);
    }
    var chart = renderChart(item);
    if (chart) host.appendChild(chart);

    host.appendChild(el('p', 'q-stem', item.stem));
    host.appendChild(el('p', 'q-instr', item.instr || TYPE_INSTR[item.type] || ''));

    var body = el('div', 'q-body');
    host.appendChild(body);
    RENDERERS[item.type](body, item, response, onChange);
  }

  var RENDERERS = {};

  /* ---------------- multiple choice ---------------- */
  RENDERERS.mc = function (host, item, response, onChange) {
    var ul = el('ul', 'opts');
    item.options.forEach(function (txt, i) {
      var li = el('li', 'opt');
      var input = document.createElement('input');
      input.type = 'radio'; input.name = 'mc-' + item.id; input.value = i;
      if (response.value === i) { input.checked = true; li.classList.add('is-picked'); }
      input.addEventListener('change', function () {
        response.value = i;
        ul.querySelectorAll('.opt').forEach(function (o) { o.classList.remove('is-picked'); });
        li.classList.add('is-picked');
        onChange();
      });
      li.appendChild(input);
      li.appendChild(el('span', 'opt-txt', txt));
      li.addEventListener('click', function (e) { if (e.target !== input) input.click(); });
      ul.appendChild(li);
    });
    host.appendChild(ul);
  };

  /* ---------------- select all that apply ---------------- */
  RENDERERS.sata = function (host, item, response, onChange) {
    var ul = el('ul', 'opts');
    item.options.forEach(function (txt, i) {
      var li = el('li', 'opt');
      var input = document.createElement('input');
      input.type = 'checkbox'; input.value = i;
      if (inArr(response.value, i)) { input.checked = true; li.classList.add('is-picked'); }
      input.addEventListener('change', function () {
        if (input.checked) { if (!inArr(response.value, i)) response.value.push(i); li.classList.add('is-picked'); }
        else { response.value = response.value.filter(function (v) { return v !== i; }); li.classList.remove('is-picked'); }
        onChange();
      });
      li.appendChild(input);
      li.appendChild(el('span', 'opt-txt', txt));
      li.addEventListener('click', function (e) { if (e.target !== input) input.click(); });
      ul.appendChild(li);
    });
    host.appendChild(ul);
  };

  /* ---------------- ordered response ---------------- */
  RENDERERS.ordered = function (host, item, response, onChange) {
    var list = el('ul', 'order-list');
    var dragIdx = null;

    function paint() {
      list.innerHTML = '';
      response.value.forEach(function (srcIdx, pos) {
        var li = el('li');
        var tok = makeToken(item.options[srcIdx], pos + 1);
        var moves = el('span', 'tok-move');
        var up = el('button', null, '▲'); up.type = 'button'; up.setAttribute('aria-label', 'Move up');
        var dn = el('button', null, '▼'); dn.type = 'button'; dn.setAttribute('aria-label', 'Move down');
        up.disabled = pos === 0;
        dn.disabled = pos === response.value.length - 1;
        up.addEventListener('click', function () { swap(pos, pos - 1); });
        dn.addEventListener('click', function () { swap(pos, pos + 1); });
        moves.appendChild(up); moves.appendChild(dn);
        tok.appendChild(moves);

        tok.addEventListener('dragstart', function (e) {
          dragIdx = pos; tok.classList.add('is-drag');
          if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(pos)); }
        });
        tok.addEventListener('dragend', function () { dragIdx = null; tok.classList.remove('is-drag'); });
        li.addEventListener('dragover', function (e) { e.preventDefault(); });
        li.addEventListener('drop', function (e) {
          e.preventDefault();
          if (dragIdx === null || dragIdx === pos) return;
          move(dragIdx, pos);
        });
        tok.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowUp' && pos > 0) { e.preventDefault(); swap(pos, pos - 1); }
          if (e.key === 'ArrowDown' && pos < response.value.length - 1) { e.preventDefault(); swap(pos, pos + 1); }
        });
        li.appendChild(tok);
        list.appendChild(li);
      });
      onChange();
    }
    function swap(a, b) {
      var v = response.value; var t = v[a]; v[a] = v[b]; v[b] = t; paint();
      focusPos(b);
    }
    function move(from, to) {
      var v = response.value; var t = v.splice(from, 1)[0]; v.splice(to, 0, t); paint(); focusPos(to);
    }
    function focusPos(p) {
      var toks = list.querySelectorAll('.tok');
      if (toks[p]) toks[p].focus();
    }

    var wrap = el('div', 'order-col');
    wrap.appendChild(el('h4', null, item.orderLabel || 'Your sequence (first step at the top)'));
    wrap.appendChild(list);
    host.appendChild(wrap);
    paint();
  };

  /* ---------------- drag & drop into buckets ---------------- */
  RENDERERS.dragdrop = function (host, item, response, onChange) {
    var picker = new TokenPicker();
    var pool = el('div', 'dd-pool');
    var bucketsWrap = el('div', 'dd-buckets');
    var drops = [];
    var dragTok = null;

    function place(tokIdx, bucketIdx) { response.value[tokIdx] = bucketIdx; picker.clear(); paint(); }

    function tokenNode(tokIdx) {
      var tok = makeToken(item.tokens[tokIdx]);
      tok.addEventListener('click', function (e) {
        // With another token already selected, a click on a placed token means
        // "drop it here" - let the event reach the surrounding target instead
        // of stealing the selection.
        if (picker.sel !== null && picker.sel !== tokIdx) return;
        e.stopPropagation();
        picker.select(tok, tokIdx);
      });
      tok.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.select(tok, tokIdx); }
      });
      tok.addEventListener('dragstart', function (e) {
        dragTok = tokIdx;
        if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(tokIdx)); }
      });
      tok.addEventListener('dragend', function () { dragTok = null; });
      return tok;
    }

    function paint() {
      pool.innerHTML = '';
      drops.forEach(function (d) { d.innerHTML = ''; });
      item.tokens.forEach(function (t, i) {
        var node = tokenNode(i);
        if (response.value[i] === null) pool.appendChild(node);
        else drops[response.value[i]].appendChild(node);
      });
      onChange();
    }

    function wireTarget(node, bucketIdx) {
      node.addEventListener('click', function () {
        if (picker.sel !== null) place(picker.sel, bucketIdx);
      });
      node.addEventListener('dragover', function (e) { e.preventDefault(); node.classList.add('is-target'); });
      node.addEventListener('dragleave', function () { node.classList.remove('is-target'); });
      node.addEventListener('drop', function (e) {
        e.preventDefault(); node.classList.remove('is-target');
        var idx = dragTok !== null ? dragTok : parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (!isNaN(idx)) place(idx, bucketIdx);
      });
    }

    host.appendChild(el('h4', null, item.poolLabel || 'Responses'));
    host.appendChild(pool);
    wireTarget(pool, null);

    item.buckets.forEach(function (label, bi) {
      var b = el('div', 'dd-bucket');
      b.appendChild(el('h4', null, label));
      var drop = el('div', 'dd-drop');
      wireTarget(drop, bi);
      // the whole box is a target too, so a full drop zone can still receive
      wireTarget(b, bi);
      drops.push(drop);
      b.appendChild(drop);
      bucketsWrap.appendChild(b);
    });
    host.appendChild(bucketsWrap);
    paint();
  };

  /* ---------------- bow-tie ---------------- */
  RENDERERS.bowtie = function (host, item, response, onChange) {
    var picker = new TokenPicker();
    var grid = el('div', 'bowtie');
    var slots = { actions: [], condition: [], params: [] };

    function assign(kind, slotIdx, srcIdx) {
      if (kind === 'condition') response.value.condition = srcIdx;
      else {
        var arr = response.value[kind];
        if (srcIdx === null) arr.splice(slotIdx, 1);
        else if (!inArr(arr, srcIdx)) { arr[slotIdx] = srcIdx; }
        response.value[kind] = arr.filter(function (v) { return v !== undefined && v !== null; });
      }
      picker.clear();
      paint();
    }

    function makeCol(title, kind, count, poolKey, listKey) {
      var col = el('div', 'bt-col' + (kind === 'condition' ? ' bt-center' : ''));
      col.appendChild(el('h4', null, title));
      for (var i = 0; i < count; i++) {
        (function (slotIdx) {
          var slot = el('div', 'bt-slot');
          slot.tabIndex = 0;
          slot.addEventListener('click', function () {
            if (picker.sel && picker.sel.kind === kind) assign(kind, slotIdx, picker.sel.idx);
            else if (picker.sel === null) {
              // tapping a filled slot with nothing selected clears it
              if (kind === 'condition') { response.value.condition = null; paint(); }
              else if (response.value[kind][slotIdx] !== undefined) { assign(kind, slotIdx, null); }
            }
          });
          slot.addEventListener('dragover', function (e) { e.preventDefault(); slot.classList.add('is-target'); });
          slot.addEventListener('dragleave', function () { slot.classList.remove('is-target'); });
          slot.addEventListener('drop', function (e) {
            e.preventDefault(); slot.classList.remove('is-target');
            var raw = e.dataTransfer.getData('text/plain').split(':');
            if (raw[0] === kind) assign(kind, slotIdx, parseInt(raw[1], 10));
          });
          slots[kind].push(slot);
          col.appendChild(slot);
        })(i);
      }
      return col;
    }

    var colA = makeCol(item.labels && item.labels.actions || 'Actions to take', 'actions', item.slots.actions);
    var colC = makeCol(item.labels && item.labels.condition || 'Condition most likely experiencing', 'condition', 1);
    var colP = makeCol(item.labels && item.labels.params || 'Parameters to monitor', 'params', item.slots.params);
    grid.appendChild(colA); grid.appendChild(colC); grid.appendChild(colP);
    host.appendChild(grid);

    var pools = el('div', 'bt-pool');
    var rows = {};
    [['actions', item.labels && item.labels.actions || 'Actions to take', item.actions, item.poolActions],
     ['condition', item.labels && item.labels.condition || 'Potential conditions', item.conditions, item.poolConditions],
     ['params', item.labels && item.labels.params || 'Parameters to monitor', item.params, item.poolParams]
    ].forEach(function (def) {
      pools.appendChild(el('h4', null, def[1]));
      var row = el('div', 'bt-pool-row');
      rows[def[0]] = { node: row, texts: def[2], order: def[3] };
      pools.appendChild(row);
    });
    host.appendChild(pools);

    function paint() {
      // slots
      ['actions', 'condition', 'params'].forEach(function (kind) {
        slots[kind].forEach(function (slot, i) {
          var srcIdx = kind === 'condition' ? response.value.condition : response.value[kind][i];
          slot.innerHTML = '';
          if (srcIdx === null || srcIdx === undefined) {
            slot.classList.remove('filled');
            slot.textContent = 'Tap to place';
          } else {
            slot.classList.add('filled');
            var pool = kind === 'condition' ? item.conditions : item[kind];
            slot.textContent = pool[srcIdx];
          }
        });
      });
      // pools
      Object.keys(rows).forEach(function (kind) {
        var r = rows[kind];
        r.node.innerHTML = '';
        r.order.forEach(function (srcIdx) {
          var placed = kind === 'condition'
            ? response.value.condition === srcIdx
            : inArr(response.value[kind], srcIdx);
          if (placed) return;
          var tok = makeToken(r.texts[srcIdx]);
          tok.addEventListener('click', function () { picker.select(tok, { kind: kind, idx: srcIdx }); });
          tok.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.select(tok, { kind: kind, idx: srcIdx }); }
          });
          tok.addEventListener('dragstart', function (e) {
            if (e.dataTransfer) e.dataTransfer.setData('text/plain', kind + ':' + srcIdx);
          });
          r.node.appendChild(tok);
        });
      });
      onChange();
    }
    paint();
  };

  /* ---------------- matrix / grid ---------------- */
  RENDERERS.matrix = function (host, item, response, onChange) {
    var scroll = el('div', 'matrix-scroll');
    var tbl = el('table', 'matrix');
    var thead = el('thead'), htr = el('tr');
    htr.appendChild(el('th', null, item.rowHeader || 'Finding'));
    item.cols.forEach(function (c) { htr.appendChild(el('th', null, c)); });
    thead.appendChild(htr); tbl.appendChild(thead);

    var tbody = el('tbody');
    item.rows.forEach(function (rowText, ri) {
      var tr = el('tr');
      tr.appendChild(el('td', null, rowText));
      item.cols.forEach(function (c, ci) {
        var td = el('td', 'cell');
        var input = document.createElement('input');
        input.type = 'radio'; input.name = 'mx-' + item.id + '-' + ri;
        input.setAttribute('aria-label', rowText + ': ' + c);
        if (response.value[ri] === ci) input.checked = true;
        input.addEventListener('change', function () { response.value[ri] = ci; onChange(); });
        td.appendChild(input);
        td.addEventListener('click', function (e) { if (e.target !== input) input.click(); });
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    scroll.appendChild(tbl);
    host.appendChild(scroll);
  };

  /* ---------------- cloze drop-down ---------------- */
  RENDERERS.cloze = function (host, item, response, onChange) {
    var wrap = el('div', 'cloze');
    var parts = item.text.split(/(\{\d+\})/g);
    parts.forEach(function (part) {
      var m = part.match(/^\{(\d+)\}$/);
      if (!m) { wrap.appendChild(document.createTextNode(part)); return; }
      var bi = parseInt(m[1], 10);
      var bl = item.blanks[bi];
      var sel = document.createElement('select');
      sel.className = 'empty';
      sel.setAttribute('aria-label', 'Blank ' + (bi + 1));
      var ph = document.createElement('option');
      ph.value = ''; ph.textContent = 'Select…';
      sel.appendChild(ph);
      bl.options.forEach(function (o, oi) {
        var opt = document.createElement('option');
        opt.value = String(oi); opt.textContent = o;
        sel.appendChild(opt);
      });
      if (response.value[bi] !== null) { sel.value = String(response.value[bi]); sel.classList.remove('empty'); }
      sel.addEventListener('change', function () {
        response.value[bi] = sel.value === '' ? null : parseInt(sel.value, 10);
        sel.classList.toggle('empty', sel.value === '');
        onChange();
      });
      wrap.appendChild(sel);
    });
    host.appendChild(wrap);
  };

  /* ---------------- highlight ---------------- */
  RENDERERS.highlight = function (host, item, response, onChange) {
    var box = el('div', 'hl-text');
    item.segments.forEach(function (segText, i) {
      if (item.selectable && !inArr(item.selectable, i)) {
        box.appendChild(el('span', 'hl-seg hl-static', segText));
        return;
      }
      var span = el('span', 'hl-seg', segText);
      span.tabIndex = 0;
      span.setAttribute('role', 'button');
      span.setAttribute('aria-pressed', 'false');
      function toggle() {
        if (inArr(response.value, i)) {
          response.value = response.value.filter(function (v) { return v !== i; });
          span.classList.remove('is-on'); span.setAttribute('aria-pressed', 'false');
        } else {
          response.value.push(i);
          span.classList.add('is-on'); span.setAttribute('aria-pressed', 'true');
        }
        onChange();
      }
      if (inArr(response.value, i)) { span.classList.add('is-on'); span.setAttribute('aria-pressed', 'true'); }
      span.addEventListener('click', toggle);
      span.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
      box.appendChild(span);
      box.appendChild(document.createTextNode(' '));
    });
    host.appendChild(box);
  };

  global.Items = {
    LETTERS: LETTERS,
    TYPE_LABEL: TYPE_LABEL,
    prepareItem: prepareItem,
    renderChart: renderChart,
    blankResponse: blankResponse,
    isComplete: isComplete,
    score: score,
    describe: describe,
    render: render,
    shuffle: shuffle,
    el: el
  };
})(window);
