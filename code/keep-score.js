// Keep score: what an honest tool says, and how long it takes to check it.
// Made-up Lena's app warns "bad day likely tomorrow" on some evenings. Its makers say
// "likely" means 7 in 10. Is it honest, or is its 7 in 10 really a coin toss?
// Every number on the page is printed by this script. Run: node code/keep-score.js
//
// Exact values are whole-number fractions (BigInt), so nothing depends on a seed or on
// floating point. A seeded simulation runs the same checks as a second look.
'use strict';

// ---------- exact binomial with BigInt fractions ----------
// A chance is [numerator, denominator]; probabilities below are exact fractions over den^n.
function choose(n, k) {
  let r = 1n;
  for (let i = 1n; i <= BigInt(k); i++) r = r * (BigInt(n) - i + 1n) / i;
  return r;
}
// P(X = k) for X ~ Binomial(n, p/d), as [numerator, denominator] BigInts.
function pmf(n, k, p, d) {
  const num = choose(n, k) * BigInt(p) ** BigInt(k) * BigInt(d - p) ** BigInt(n - k);
  return [num, BigInt(d) ** BigInt(n)];
}
// P(X <= k)
function cdf(n, k, p, d) {
  let num = 0n;
  for (let j = 0; j <= k; j++) num += pmf(n, j, p, d)[0];
  return [num, BigInt(d) ** BigInt(n)];
}
// Turn a BigInt fraction into a JavaScript number only at the end (round once, from the exact value).
function val([num, den]) {
  // scale to keep 15 significant digits
  const scale = 10n ** 18n;
  return Number(num * scale / den) / 1e18;
}
function in100(x) { return Math.round(100 * x) + ' in 100'; }
function pct(x, dp = 2) { return (100 * x).toFixed(dp) + '%'; }

// ---------- the made-up world ----------
// The app warns on 1 evening in 4 (on average). Lena keeps score of the warnings only.
const HONEST = [7, 10];   // the app's 7 in 10 comes true 7 times in 10
const MILD = [6, 10];     // ... really 6 in 10
const COIN = [5, 10];     // ... really a coin toss
const EVENINGS_PER_WARNING = 4;

// This series' yardstick, used here for one tally against a stated chance:
// a one-sided exact test, p < 0.1. The tally says "it oversells" when
// P(this few or fewer | honest 7 in 10) < 0.1.
const ALPHA = [1, 10];
function lessThanAlpha(fr) { return fr[0] * BigInt(ALPHA[1]) < fr[1] * BigInt(ALPHA[0]); }
// Largest tally k that the yardstick flags, for n warnings (-1 if none).
function flagCut(n) {
  let cut = -1;
  for (let k = 0; k <= n; k++) if (lessThanAlpha(cdf(n, k, HONEST[0], HONEST[1]))) cut = k;
  return cut;
}

console.log('=== Keep score: every number on the page ===\n');

// ---------- 1. Lena's eight weeks ----------
const N = 14, K = 8;
console.log('1. Lena: ' + N + ' warnings in 8 weeks (' + N * EVENINGS_PER_WARNING + ' evenings at 1 warning in ' + EVENINGS_PER_WARNING + '), ' + K + ' followed by a bad day');
const pH = pmf(N, K, ...HONEST), pC = pmf(N, K, ...COIN), pM = pmf(N, K, ...MILD);
console.log('   P(exactly ' + K + ' of ' + N + ' | honest 7 in 10) = ' + pct(val(pH)));
console.log('   P(exactly ' + K + ' of ' + N + ' | 6 in 10)        = ' + pct(val(pM)));
console.log('   P(exactly ' + K + ' of ' + N + ' | coin toss)      = ' + pct(val(pC)));
const ratioCoin = val(pC) / val(pH);
console.log('   coin toss / honest = ' + ratioCoin.toFixed(3) + '  (how many times as often a coin-toss app gives exactly this tally)');
// exact ratio as a fraction, for the record: (5/10)^14 / (C * 7^8 3^6 / 10^14) = 5^14 / (7^8 3^6)
console.log('   exact: 5^14 / (7^8 x 3^6) = ' + (5n ** 14n).toString() + ' / ' + (7n ** 8n * 3n ** 6n).toString());
const meanH = N * HONEST[0] / HONEST[1], meanC = N * COIN[0] / COIN[1];
console.log('   average tally: honest ' + meanH.toFixed(1) + ', coin toss ' + meanC.toFixed(1));
const le8H = cdf(N, K, ...HONEST), le8C = cdf(N, K, ...COIN);
console.log('   ' + K + ' or fewer: honest ' + pct(val(le8H)) + ' (' + in100(val(le8H)) + '), coin toss ' + pct(val(le8C)) + ' (' + in100(val(le8C)) + ')');
console.log('   yardstick p-value for ' + K + ' of ' + N + ' (P(<= ' + K + ' | honest)) = ' + val(le8H).toFixed(4) + (lessThanAlpha(le8H) ? ' -> flagged' : ' -> not flagged'));
console.log();

// ---------- 2. the figure: every possible tally of 14 ----------
console.log('2. Figure: chance of each tally out of ' + N + ' warnings (exact, in 100)');
const rows = [];
for (let k = 0; k <= N; k++) {
  const h = val(pmf(N, k, ...HONEST)), c = val(pmf(N, k, ...COIN));
  rows.push({ k, h, c });
  console.log('   ' + String(k).padStart(2) + ' bad days: honest ' + (100 * h).toFixed(2).padStart(6) + '   coin toss ' + (100 * c).toFixed(2).padStart(6));
}
// overlap: the share of probability the two tally distributions have in common
let overlap = 0;
for (const r of rows) overlap += Math.min(r.h, r.c);
console.log('   overlap of the two bar sets (sum of the smaller bar at each tally) = ' + pct(overlap) + ' (' + in100(overlap) + ')');
// middle 90%: smallest and largest tallies that leave at most 5% in each tail
function middle(n, p, d) {
  let lo = 0, hi = n;
  while (val(cdf(n, lo, p, d)) < 0.05) lo++;
  while (hi > 0 && 1 - val(cdf(n, hi - 1, p, d)) < 0.05) hi--;
  const inside = val(cdf(n, hi, p, d)) - (lo > 0 ? val(cdf(n, lo - 1, p, d)) : 0);
  return { lo, hi, inside };
}
const midH = middle(N, ...HONEST), midC = middle(N, ...COIN);
console.log('   honest: ' + midH.lo + ' to ' + midH.hi + ' holds ' + pct(midH.inside));
console.log('   coin toss: ' + midC.lo + ' to ' + midC.hi + ' holds ' + pct(midC.inside));
console.log();

// ---------- 3. the table: how long a check takes ----------
console.log('3. Table: the yardstick on a tally of n warnings (1 warning every ' + EVENINGS_PER_WARNING + ' evenings)');
const table = [];
for (const n of [14, 56, 91]) {
  const cut = flagCut(n);
  const fa = val(cdf(n, cut, ...HONEST));
  const mild = val(cdf(n, cut, ...MILD));
  const coin = val(cdf(n, cut, ...COIN));
  const weeks = n * EVENINGS_PER_WARNING / 7;
  table.push({ n, weeks, cut, fa, mild, coin });
  console.log('   ' + String(n).padStart(3) + ' warnings (' + weeks + ' weeks): flags ' + cut + ' or fewer bad days (' + pct(cut / n, 1) + ' of warnings)');
  console.log('       honest app flagged ' + pct(fa) + ' (' + in100(fa) + ') | 6-in-10 app caught ' + pct(mild) + ' (' + in100(mild) + ') | coin-toss app caught ' + pct(coin) + ' (' + in100(coin) + ')');
}
console.log();

// ---------- 4. what slips past after a year ----------
const year = table[table.length - 1];
console.log('4. After a year (' + year.n + ' warnings): a 6-in-10 app slips past ' + pct(1 - year.mild) + ' (' + in100(1 - year.mild) + ')');
console.log();

// ---------- 5. seeded simulation as a check ----------
// mulberry32, a small seeded generator, so the check re-runs the same way.
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
console.log('5. Simulation check (seed 1): the app warns on each evening with chance 1 in 4; Lena tallies the warnings');
const rand = mulberry32(1);
const RUNS = 200000;
function simulate(alt, evenings, cutFor) {
  let flagged = 0, exact8of14 = 0, n14 = 0;
  for (let r = 0; r < RUNS; r++) {
    let warns = 0, bad = 0;
    for (let e = 0; e < evenings; e++) {
      if (rand() < 1 / EVENINGS_PER_WARNING) {
        warns++;
        if (rand() < alt[0] / alt[1]) bad++;
      }
    }
    // judge on the first-n-warnings basis used on the page: only logs with exactly n warnings count here
    if (warns === cutFor.n) {
      n14++;
      if (bad <= cutFor.cut) flagged++;
      if (cutFor.n === N && bad === K) exact8of14++;
    }
  }
  return { flagged: flagged / n14, logs: n14, exact: exact8of14 / n14 };
}
// Fixed number of warnings: simulate warnings directly (the page's table is per n warnings).
function simulateFixed(alt, n, cut) {
  let flagged = 0;
  for (let r = 0; r < RUNS; r++) {
    let bad = 0;
    for (let w = 0; w < n; w++) if (rand() < alt[0] / alt[1]) bad++;
    if (bad <= cut) flagged++;
  }
  return flagged / RUNS;
}
let worst = 0;
for (const row of table) {
  const sH = simulateFixed(HONEST, row.n, row.cut);
  const sM = simulateFixed(MILD, row.n, row.cut);
  const sC = simulateFixed(COIN, row.n, row.cut);
  worst = Math.max(worst, Math.abs(sH - row.fa), Math.abs(sM - row.mild), Math.abs(sC - row.coin));
  console.log('   ' + String(row.n).padStart(3) + ' warnings: honest flagged ' + pct(sH) + ' (exact ' + pct(row.fa) + ') | 6 in 10 ' + pct(sM) + ' (exact ' + pct(row.mild) + ') | coin ' + pct(sC) + ' (exact ' + pct(row.coin) + ')');
}
// Lena's 8 of 14, among simulated 8-week logs that happen to have exactly 14 warnings
const simH = simulate(HONEST, 56, { n: N, cut: flagCut(N) });
const simC = simulate(COIN, 56, { n: N, cut: flagCut(N) });
console.log('   8-week logs with exactly 14 warnings: honest ' + simH.logs + ' logs, exactly 8 bad in ' + pct(simH.exact) + ' (exact ' + pct(val(pH)) + ')');
console.log('   8-week logs with exactly 14 warnings: coin ' + simC.logs + ' logs, exactly 8 bad in ' + pct(simC.exact) + ' (exact ' + pct(val(pC)) + ')');
worst = Math.max(worst, Math.abs(simH.exact - val(pH)), Math.abs(simC.exact - val(pC)));
console.log('   largest gap between simulation and exact value: ' + (100 * worst).toFixed(2) + ' percentage points');
// how often 8 weeks hold exactly 14 warnings (so the reader knows 14 is the average, not a rule)
console.log('   P(exactly 14 warnings in 56 evenings at 1 in 4) = ' + pct(val(pmf(56, 14, 1, 4))) + '; average ' + (56 / EVENINGS_PER_WARNING));
