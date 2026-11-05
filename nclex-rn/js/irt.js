/* ============================================================
   irt.js - Rasch (1PL) computerized adaptive testing engine
   ------------------------------------------------------------
   Ability is estimated with EAP (expected a posteriori) over a
   fixed quadrature grid.  EAP is used instead of maximum
   likelihood because it is defined from the very first item and
   for all-correct / all-incorrect response strings, both of
   which are common early in an adaptive test.

   Fractional (partial-credit) scores are supported directly:
   the likelihood contribution of an item scored s in [0,1] is
   P(theta)^s * (1-P(theta))^(1-s).
   ============================================================ */
(function (global) {
  'use strict';

  // NCSBN has set the NCLEX-RN passing standard at 0.00 logits.
  var PASSING_STANDARD = 0.00;

  var GRID_MIN = -4.0, GRID_MAX = 4.0, GRID_STEP = 0.05;
  var GRID = [];
  for (var g = GRID_MIN; g <= GRID_MAX + 1e-9; g += GRID_STEP) GRID.push(+g.toFixed(4));

  // N(0, 1) prior over ability.
  var PRIOR_LOG = GRID.map(function (t) { return -0.5 * t * t; });

  function pCorrect(theta, b) { return 1 / (1 + Math.exp(-(theta - b))); }
  function information(theta, b) { var p = pCorrect(theta, b); return p * (1 - p); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* ---------------------------------------------------------- */
  function Estimator() {
    this.logLik = PRIOR_LOG.slice();
    this.n = 0;
    this._cache = null;
  }

  Estimator.prototype.add = function (b, score) {
    var s = clamp(score, 0, 1);
    for (var i = 0; i < GRID.length; i++) {
      var p = clamp(pCorrect(GRID[i], b), 1e-9, 1 - 1e-9);
      this.logLik[i] += s * Math.log(p) + (1 - s) * Math.log(1 - p);
    }
    this.n++;
    this._cache = null;
  };

  Estimator.prototype.posterior = function () {
    var max = -Infinity, i;
    for (i = 0; i < this.logLik.length; i++) if (this.logLik[i] > max) max = this.logLik[i];
    var w = new Array(GRID.length), sum = 0;
    for (i = 0; i < GRID.length; i++) { w[i] = Math.exp(this.logLik[i] - max); sum += w[i]; }
    for (i = 0; i < GRID.length; i++) w[i] /= sum;
    return w;
  };

  Estimator.prototype.estimate = function () {
    if (this._cache) return this._cache;
    var w = this.posterior(), i, mean = 0, varr = 0, below = 0;
    for (i = 0; i < GRID.length; i++) mean += GRID[i] * w[i];
    for (i = 0; i < GRID.length; i++) varr += w[i] * (GRID[i] - mean) * (GRID[i] - mean);
    for (i = 0; i < GRID.length; i++) if (GRID[i] < PASSING_STANDARD) below += w[i];
    var se = Math.sqrt(Math.max(varr, 1e-6));
    this._cache = {
      theta: mean,
      se: se,
      ciLow: mean - 1.96 * se,
      ciHigh: mean + 1.96 * se,
      pAbove: 1 - below,   // posterior probability the candidate is above the standard
      n: this.n
    };
    return this._cache;
  };

  Estimator.prototype.snapshot = function () { return { logLik: this.logLik.slice(), n: this.n }; };
  Estimator.restore = function (snap) {
    var e = new Estimator();
    if (snap && snap.logLik && snap.logLik.length === GRID.length) {
      e.logLik = snap.logLik.slice();
      e.n = snap.n || 0;
    }
    return e;
  };

  /* ----------------------------------------------------------
     CatEngine - item selection, content balancing, stopping
     ---------------------------------------------------------- */
  function CatEngine(opts) {
    opts = opts || {};
    this.items = opts.items || [];
    this.minItems = opts.minItems || 75;
    this.maxItems = opts.maxItems || 145;
    this.blueprint = opts.blueprint || {};
    this.exposure = opts.exposure || 5;        // randomesque pool size
    this.rng = opts.rng || Math.random;
    this.est = new Estimator();
    this.used = Object.create(null);
    this.counts = Object.create(null);
    this.delivered = 0;
    this.history = [];
    this.stopReason = null;
  }

  CatEngine.prototype.markUsed = function (item) {
    this.used[item.id] = true;
    this.counts[item.cat] = (this.counts[item.cat] || 0) + 1;
    this.delivered++;
  };

  CatEngine.prototype.record = function (item, score) {
    this.est.add(item.b, score);
    var e = this.est.estimate();
    this.history.push({
      id: item.id, cat: item.cat, type: item.type, b: item.b,
      score: score, theta: e.theta, se: e.se, n: this.est.n
    });
    return e;
  };

  /* Pick the client-need category that is furthest behind its
     blueprint target, restricted to categories that still have
     unused items available. */
  CatEngine.prototype.nextCategory = function (pool) {
    var avail = Object.create(null), i;
    for (i = 0; i < pool.length; i++) avail[pool[i].cat] = true;
    var best = null, bestDeficit = -Infinity;
    var nNext = this.delivered + 1;
    for (var cat in this.blueprint) {
      if (!avail[cat]) continue;
      var target = this.blueprint[cat] * nNext;
      var deficit = target - (this.counts[cat] || 0);
      // tiny random jitter breaks ties without biasing the blueprint
      deficit += (this.rng() - 0.5) * 0.02;
      if (deficit > bestDeficit) { bestDeficit = deficit; best = cat; }
    }
    return best;
  };

  CatEngine.prototype.selectNext = function () {
    var theta = this.est.estimate().theta;
    var pool = [], i;
    for (i = 0; i < this.items.length; i++) if (!this.used[this.items[i].id]) pool.push(this.items[i]);
    if (!pool.length) return null;

    var cat = this.nextCategory(pool);
    var scoped = pool.filter(function (it) { return it.cat === cat; });
    if (!scoped.length) scoped = pool;

    // Maximum Fisher information; for the Rasch model that is the
    // item whose difficulty sits closest to the current ability.
    scoped.sort(function (a, b) { return information(theta, b.b) - information(theta, a.b); });
    var k = Math.min(this.exposure, scoped.length);
    return scoped[Math.floor(this.rng() * k)];
  };

  /* Stopping rules, applied in the same order the real exam uses. */
  CatEngine.prototype.checkStop = function (timeExpired, itemsExhausted) {
    var e = this.est.estimate();
    var n = this.delivered;

    if (timeExpired) {
      this.stopReason = n < this.minItems ? 'time-early' : 'time';
      return true;
    }
    if (n < this.minItems) {
      if (itemsExhausted) { this.stopReason = 'bank'; return true; }
      return false;
    }
    // 95% confidence interval rule
    if (e.ciLow > PASSING_STANDARD) { this.stopReason = 'confidence-pass'; return true; }
    if (e.ciHigh < PASSING_STANDARD) { this.stopReason = 'confidence-fail'; return true; }
    if (n >= this.maxItems) { this.stopReason = 'max-items'; return true; }
    if (itemsExhausted) { this.stopReason = 'bank'; return true; }
    return false;
  };

  /* Final pass / fail decision, mirroring the published NCLEX rules. */
  CatEngine.prototype.decide = function () {
    var e = this.est.estimate();
    var n = this.delivered;
    var r = this.stopReason;

    if (r === 'time-early') {
      return { pass: false, rule: 'run-out-of-time', detail:
        'The time limit was reached before the ' + this.minItems + '-item minimum was met. On the real exam this is an automatic fail.' };
    }
    if (r === 'confidence-pass') {
      return { pass: true, rule: '95% confidence', detail:
        'The exam stopped after ' + n + ' items because it was 95% certain the ability estimate is above the passing standard.' };
    }
    if (r === 'confidence-fail') {
      return { pass: false, rule: '95% confidence', detail:
        'The exam stopped after ' + n + ' items because it was 95% certain the ability estimate is below the passing standard.' };
    }
    if (r === 'max-items') {
      return { pass: e.theta > PASSING_STANDARD, rule: 'maximum-length',
        detail: 'The maximum of ' + this.maxItems + ' items was reached without 95% certainty. The final ability estimate decides the result.' };
    }
    if (r === 'time') {
      return { pass: e.theta > PASSING_STANDARD, rule: 'run-out-of-time',
        detail: 'Time expired after the minimum number of items. The final ability estimate decides the result.' };
    }
    return { pass: e.theta > PASSING_STANDARD, rule: 'item-pool-exhausted',
      detail: 'The practice item pool ran out. The final ability estimate decides the result.' };
  };

  global.IRT = {
    PASSING_STANDARD: PASSING_STANDARD,
    GRID: GRID,
    pCorrect: pCorrect,
    information: information,
    Estimator: Estimator,
    CatEngine: CatEngine
  };
})(window);
