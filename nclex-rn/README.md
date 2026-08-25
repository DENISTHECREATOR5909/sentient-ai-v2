# NCLEX-RN® Style Adaptive Practice Exam

A complete, offline, browser-based practice exam that reproduces the mechanics of the
NCLEX-RN: computerized adaptive testing, a variable-length exam with a 95% confidence
stopping rule, Next Generation NCLEX item types, a 5-hour clock, and a detailed score
report with a full item-by-item review.

Plain HTML, CSS and JavaScript. No build step, no framework, no server, no network calls.

> **Unofficial practice material.** This is an independent study tool. It is not produced by,
> endorsed by, or affiliated with the National Council of State Boards of Nursing (NCSBN)
> or Pearson VUE. Live NCLEX items are secure and confidential and are not reproduced here:
> every question was written originally for this project and mapped to the publicly
> published NCLEX-RN Test Plan client-need categories. NCLEX® and NCLEX-RN® are registered
> trademarks of NCSBN. Results are a practice estimate, not a prediction of an actual
> NCLEX outcome.

---

## Running it

Three options, in increasing order of capability:

| How | Command | Offline | Notes |
|---|---|---|---|
| Single file | open `nclex-rn-practice-exam.html` | yes | everything inlined; email it, drop it on a phone, open from a USB stick |
| Open the folder | open `index.html` | yes | runs from `file://`; no service worker |
| Serve it | `npm run serve` then open `http://localhost:8080` | yes, after first load | registers a service worker and installs as a PWA |

Regenerate the single-file build after editing sources:

```
npm run build
```

## What it does

**Adaptive delivery.** The first item sits at the passing standard. After every response
the ability estimate is updated and the next item is chosen to carry the most information
at the current estimate, so correct answers pull the exam harder and incorrect answers
pull it easier.

**Variable length with the 95% confidence rule.** Minimum 75 items, maximum 145. The exam
ends the moment the 95% confidence interval around the ability estimate lies entirely
above or entirely below the passing standard. If the maximum is reached without that
certainty, the final estimate decides. Running out of time before 75 items is an
automatic fail, exactly as on the real exam.

**Content balancing.** Every item is tagged to one of the eight NCLEX-RN client-need
categories, and item selection is constrained so the delivered exam tracks the published
test-plan percentages within a couple of points regardless of how the adaptive path runs.
The blueprint follows the **NCLEX-RN Test Plan effective April 1, 2026** (in force through
March 2029). Its percentage ranges are unchanged from the 2023 plan; the only difference is
that *Safety and Infection Control* was renamed *Safety and Infection Prevention and
Control*. Exam length (75–145 items), the five-hour limit, the 95% confidence rule, and the
Next Generation item formats are also unchanged in the 2026 plan.

**5-hour clock.** Counts down in the header, turns red in the last 30 minutes, offers
optional breaks at 2 hours and 3.5 hours, and auto-submits at zero. The clock keeps
running during breaks, as it does on the real exam.

**No going back.** Every item must be answered before Next enables. There is no previous
button and no flagging, matching real NCLEX behaviour.

**Live ability estimate.** A side panel shows the current ability in logits, the standard
error, the 95% interval, and a running sparkline of the estimate. The real exam shows
none of this; the panel can be closed with the Performance button.

## Item types

| Type | Scoring |
|---|---|
| Multiple choice | 0 / 1 |
| Select all that apply | partial credit, +/- scoring |
| Ordered response (drag or arrow keys) | 0 / 1, all or nothing |
| Drag and drop grouping | partial credit per token |
| Bow-tie | 0 / 1, all or nothing |
| Matrix / grid | partial credit per row |
| Drop-down cloze | partial credit per blank |
| Highlight text | partial credit, +/- scoring |

Six unfolding **case studies** deliver six linked items each, following the NCSBN Clinical
Judgment Measurement Model — recognize cues, analyze cues, prioritize hypotheses, generate
solutions, take action, evaluate outcomes — around a tabbed medical record (nurses' notes,
vital signs, laboratory results) that updates as the case unfolds. Three case studies are
delivered per full exam.

Every interaction works by pointer, touch, and keyboard. Drag-based items also support
tap-a-token-then-tap-its-destination, because HTML5 drag and drop does not work on touch
devices.

## Item bank

297 items: 261 stand-alone plus 36 in case studies.

| Client need | Test plan | Bank |
|---|---|---|
| Management of Care | 15–21% | 42 |
| Safety and Infection Prevention and Control | 10–16% | 34 |
| Health Promotion and Maintenance | 6–12% | 26 |
| Psychosocial Integrity | 6–12% | 27 |
| Basic Care and Comfort | 6–12% | 27 |
| Pharmacological and Parenteral Therapies | 13–19% | 38 |
| Reduction of Risk Potential | 9–15% | 32 |
| Physiological Adaptation | 11–17% | 35 |

Option order is reshuffled on every delivery, so repeated practice does not become rote.

## Score report and review

The report gives the pass/fail prediction with the stopping rule that produced it, the
final ability estimate with its 95% interval, a chart of the ability estimate across the
whole exam with its confidence band, a breakdown by client-need category rated
**above / near / below the passing standard**, a breakdown by item type, and buttons to
print, save as PDF, or download the full result as JSON.

Category ratings are not percent correct. They compare the credit earned against the credit
a candidate sitting exactly at the passing standard would be expected to earn on the same
items, which is what makes a rating meaningful when different candidates see different items.

Review mode lists every item delivered, with the scenario and medical record, the response
given, the scoring key, a rationale, and the item's category, difficulty and time taken.
Filters narrow to missed items, partial credit, correct items, or case studies.

## Psychometrics

Rasch (one-parameter logistic) model. `P(correct) = 1 / (1 + e^-(θ - b))`.

Ability is estimated by **EAP** (expected a posteriori) over a quadrature grid from −4 to +4
logits with a standard normal prior, rather than by maximum likelihood, because EAP is
defined from the very first item and for all-correct and all-incorrect response strings —
both common early in an adaptive test. Partial-credit scores are handled directly: an item
scored *s* in [0,1] contributes `P(θ)^s · (1−P(θ))^(1−s)` to the likelihood.

Item selection maximizes Fisher information at the current estimate — for the Rasch model,
the item whose difficulty is closest to the current ability — restricted to whichever
client-need category is furthest behind its blueprint target, with randomesque exposure
control over the top five candidates.

The passing standard is 0.00 logits, the standard NCSBN has set for the NCLEX-RN.

Difficulty parameters were assigned by the author of the bank on clinical judgment, not
calibrated on candidate response data. That is the main reason results here are a study aid
rather than a score prediction.

## Tests

```
npm test
```

| Suite | What it covers |
|---|---|
| `test/simulate.js` | bank structure and keys; every item scores 1.0 for a perfect response and less for a wrong one; 1000 simulated exams across five ability levels checking pass rates, length bounds, estimate bias, no repeated items; blueprint adherence over 100 exams; stopping-rule distribution; run-out-of-time rules |
| `test/renderers.mjs` | mounts one item of every type in a real browser, builds the correct answer through the UI, and confirms it scores 1.0; partial credit; native drag as well as tap-to-place; chart tab switching |
| `test/ui.mjs` | full 75–145 item exam driven end-to-end, mobile viewport run, timer, calculator, ability panel, save and resume across a reload, end-early behaviour, and a competent candidate answering from the scoring key reaching PASS at 75 items |
| `test/offline.mjs` | service worker registration and precaching, then boots and runs an exam with the network switched off |
| `test/standalone.mjs` | the single-file build runs a complete exam with zero network requests |

The browser suites use Playwright.

## Files

```
index.html                    app shell, five screens
css/styles.css                all styling, responsive down to 320px
js/irt.js                     Rasch model, EAP estimator, CAT engine, stopping rules
js/items.js                   render, capture and score every item type
js/app.js                     exam driver, timing, persistence, report, review
js/bank/*.js                  the item bank, one file per client-need category
sw.js                         offline cache
build.mjs                     produces the single-file build
test/                         engine simulation and browser tests
nclex-rn-practice-exam.html   generated single-file build
```

## Adding questions

Append to any `js/bank/*.js` file:

```js
{id:'MOC-041', cat:'MOC', b:0.4, type:'mc',
 stem:'…',
 options:['…','…','…','…'],
 answer:2,
 rationale:'…'}
```

`cat` is one of `MOC SIC HPM PSI BCC PHA RRP PHY`. `b` is Rasch difficulty in logits,
roughly −2 (an item almost everyone gets right) to +2 (an item few get right); the passing
standard is 0.00. `answer` is an index into `options`. Run `npm run test:engine` afterwards —
it validates keys, ranges and duplicate ids across the whole bank.
