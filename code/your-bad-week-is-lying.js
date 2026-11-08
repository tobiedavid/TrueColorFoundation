// The numbers behind /posts/2026-11-06-your-bad-week-is-lying.html
// Run it yourself: node code/your-bad-week-is-lying.js   (no dependencies; same seed, same numbers)
// Written on 2026-11-08 by the weekly check: the piece's numbers had no script until then.
//
// A made-up person with no causes at all: every day is an independent 1-in-5 chance of a bad day.
// Weeks are 7 days. A "bad week" has 4 or more bad days.
// "Twice as good": the average of the two weeks after a bad week has at most half the bad days of the
// week it is compared with (the bad week itself, or the average of the six weeks before the bad week).
//
// Every number is worked out two ways: exactly, from the binomial distribution, and by simulating
// two thousand years of weeks, as the piece describes. The page gives the exact figures; the
// simulation lands within a point of each.

const P = 0.2, DAYS = 7, BAD = 4, YEARS = 2000, WEEKS_PER_YEAR = 52;

const LF = [0]; for (let k = 1; k <= 200; k++) LF[k] = LF[k - 1] + Math.log(k);
const binom = (k, n, p) => Math.exp(LF[n] - LF[k] - LF[n - k] + k * Math.log(p) + (n - k) * Math.log(1 - p));
const dist = n => Array.from({ length: n + 1 }, (_, k) => binom(k, n, P));
const atMost = (d, x) => { let s = 0; for (let k = 0; k <= Math.floor(x + 1e-9) && k < d.length; k++) s += d[k]; return s; };

// ---- exact ----
const week = dist(DAYS), twoWeeks = dist(2 * DAYS), sixWeeks = dist(6 * DAYS);
const pBad = week.slice(BAD).reduce((s, x) => s + x, 0);
let meanBad = 0, better = 0, worse = 0, twiceVsBad = 0;
for (let k = BAD; k <= DAYS; k++) {
  const w = week[k] / pBad;                                    // chance a bad week has exactly k bad days
  meanBad += w * k;
  better += w * atMost(week, k - 1);                           // next week has fewer bad days
  worse += w * (1 - atMost(week, k));                          // next week has more
  twiceVsBad += w * atMost(twoWeeks, k);                       // (W1 + W2) / 2 <= k / 2
}
// against the six weeks before the bad week: (W1 + W2) / 2 <= (B / 6) / 2, i.e. W1 + W2 <= B / 6
let twiceVsSix = 0;
for (let b = 0; b <= 6 * DAYS; b++) twiceVsSix += sixWeeks[b] * atMost(twoWeeks, b / 6);
const exact = {
  avg: DAYS * P, meanBad, after: DAYS * P, oneIn: 1 / pBad, perYear: 365.25 / 7 * pBad,
  better: 100 * better, worse: 100 * worse, twiceVsBad: 100 * twiceVsBad, twiceVsSix: 100 * twiceVsSix,
};

// ---- simulated: two thousand years of weeks ----
// mulberry32: a small 32-bit generator that stays exact in JavaScript numbers
function rng(seed) { let s = seed >>> 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const r = rng(6112026), W = YEARS * WEEKS_PER_YEAR, w = new Int8Array(W);
for (let i = 0; i < W; i++) { let c = 0; for (let d = 0; d < DAYS; d++) if (r() < P) c++; w[i] = c; }
let total = 0, nBad = 0, sumBad = 0, nNext = 0, sumNext = 0, nBetter = 0, nWorse = 0, nTwo = 0, nTwice = 0, nSix = 0, nTwiceSix = 0;
for (let i = 0; i < W; i++) {
  total += w[i];
  if (w[i] < BAD) continue;
  nBad++; sumBad += w[i];
  if (i + 1 < W) { nNext++; sumNext += w[i + 1]; if (w[i + 1] < w[i]) nBetter++; if (w[i + 1] > w[i]) nWorse++; }
  if (i + 2 < W) {
    const two = (w[i + 1] + w[i + 2]) / 2;
    nTwo++; if (two <= w[i] / 2) nTwice++;
    if (i >= 6) { let b = 0; for (let j = i - 6; j < i; j++) b += w[j]; nSix++; if (two <= b / 6 / 2) nTwiceSix++; }
  }
}
const sim = {
  avg: total / W, meanBad: sumBad / nBad, after: sumNext / nNext, oneIn: W / nBad, perYear: nBad / YEARS,
  better: 100 * nBetter / nNext, worse: 100 * nWorse / nNext, twiceVsBad: 100 * nTwice / nTwo, twiceVsSix: 100 * nTwiceSix / nSix,
};

const rows = [
  ['Bad days in an average week', 'avg', 2],
  ['Bad days in a bad week (4 or more)', 'meanBad', 2],
  ['Bad days in the week right after a bad week', 'after', 2],
  ['A bad week comes 1 week in', 'oneIn', 1],
  ['Bad weeks a year, from nothing', 'perYear', 2],
  ['Week after a bad week is better (%)', 'better', 1],
  ['Week after a bad week is worse (%)', 'worse', 1],
  ['Two weeks after look twice as good as the bad week (%)', 'twiceVsBad', 1],
  ['...as the six weeks before the bad week (%)', 'twiceVsSix', 1],
];
console.log(`A made-up person, bad days independent at ${P * 100}%, no causes. Bad week: ${BAD}+ bad days out of ${DAYS}.`);
console.log(`Simulated: ${YEARS.toLocaleString('en')} years of ${WEEKS_PER_YEAR} weeks (${W.toLocaleString('en')} weeks, ${nBad.toLocaleString('en')} bad weeks).\n`);
console.log('                                                          exact   simulated');
for (const [label, k, dp] of rows) console.log(label.padEnd(56), exact[k].toFixed(dp).padStart(7), sim[k].toFixed(dp).padStart(10));
console.log(`\nOn the page: ${exact.avg.toFixed(1)}, ${exact.meanBad.toFixed(1)} and ${exact.after.toFixed(1)} bad days; about 1 week in ${Math.round(exact.oneIn)}; `
  + `nearly ${Math.round(exact.perYear)} a year; better ${Math.round(exact.better)}% of the time; twice as good ${Math.round(exact.twiceVsBad)}% `
  + `against the bad week, ${Math.round(exact.twiceVsSix)}% against the six weeks before.`);
