// The numbers behind /posts/2026-11-06-two-weeks-is-a-coin-toss.html
// Run it yourself: node code/two-weeks-is-a-coin-toss.js   (no dependencies; same seeds, same numbers)
// Written on 2026-11-08 by the weekly check: the piece's numbers had no script until then.
//
// Made-up Sam has a bad day 1 day in 4. He keeps four weeks of "before" days, then tests a change for
// 2, 4, 6 or 8 weeks. The change either does nothing (still 25%), halves bad days (12.5%), or removes
// three quarters of them (6.25%).
// "Clearly better": a one-sided Fisher exact test on the day counts, p < 0.1 (fewer bad days in the test).
// "Looks no better": the bad-day rate during the test is at or above the rate before.
//
// Each number is worked out exactly, over every possible pair of counts, and checked with 20,000
// simulated tests per row. The page gives the exact figures; the simulation lands within a point.

const BEFORE = 28, BASE = 0.25, BAR = 0.1, N = 20000;

const LF = [0]; for (let k = 1; k <= 200; k++) LF[k] = LF[k - 1] + Math.log(k);
const binom = (k, n, p) => Math.exp(LF[n] - LF[k] - LF[n - k] + k * Math.log(p) + (n - k) * Math.log(1 - p));
const hyp = (a, b, c, d) => Math.exp(LF[a + b] + LF[c + d] + LF[a + c] + LF[b + d] - LF[a] - LF[b] - LF[c] - LF[d] - LF[a + b + c + d]);
// One-sided Fisher exact test: the chance, by luck alone, of this few bad days (or fewer) in the test,
// given the totals. a bad days out of n1 test days; b bad days out of n0 before-days.
function fisherFewer(a, n1, b, n0) {
  const K = a + b, lo = Math.max(0, K - n0); let p = 0;
  for (let x = a; x >= lo; x--) p += hyp(x, n1 - x, K - x, n0 - K + x);
  return Math.min(1, p);
}
const better = (y, n, x) => fisherFewer(y, n, x, BEFORE) < BAR;
const noBetter = (y, n, x) => y / n >= x / BEFORE;

function exact(n, q) {
  let cb = 0, nb = 0;
  for (let x = 0; x <= BEFORE; x++) for (let y = 0; y <= n; y++) {
    const pr = binom(x, BEFORE, BASE) * binom(y, n, q);
    if (better(y, n, x)) cb += pr;
    if (noBetter(y, n, x)) nb += pr;
  }
  return { cb: 100 * cb, nb: 100 * nb };
}
// mulberry32: a small 32-bit generator that stays exact in JavaScript numbers
function rng(seed) { let s = seed >>> 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function simulated(n, q, seed) {
  const r = rng(seed); let cb = 0, nb = 0;
  for (let t = 0; t < N; t++) {
    let x = 0, y = 0;
    for (let d = 0; d < BEFORE; d++) if (r() < BASE) x++;
    for (let d = 0; d < n; d++) if (r() < q) y++;
    if (better(y, n, x)) cb++;
    if (noBetter(y, n, x)) nb++;
  }
  return { cb: 100 * cb / N, nb: 100 * nb / N };
}

console.log(`Bad days 1 in 4; ${BEFORE} days before each test; one-sided Fisher exact test, "clearly better" at p < ${BAR}.`);
console.log(`Exact, with ${N.toLocaleString('en')} simulated tests per row in brackets.\n`);
console.log('test length | halves: "clearly better" | halves: looks no better | does nothing: "clearly better"');
let seed = 6112026;
for (const weeks of [2, 4, 6, 8]) {
  const n = 7 * weeks, h = exact(n, BASE / 2), z = exact(n, BASE), hs = simulated(n, BASE / 2, seed++), zs = simulated(n, BASE, seed++);
  console.log(`${String(weeks).padStart(2)} weeks    | ${h.cb.toFixed(1).padStart(5)}% (${hs.cb.toFixed(1)}%)          | ${h.nb.toFixed(1).padStart(5)}% (${hs.nb.toFixed(1)}%)          | ${z.cb.toFixed(1).padStart(5)}% (${zs.cb.toFixed(1)}%)`);
}
const t = exact(14, BASE / 4), ts = simulated(14, BASE / 4, seed++);
console.log(`\nThree quarters of bad days removed, 2 weeks: "clearly better" ${t.cb.toFixed(1)}% (${ts.cb.toFixed(1)}%), looks no better ${t.nb.toFixed(1)}% (${ts.nb.toFixed(1)}%)`);
console.log(`Expected bad days in two weeks: ${(14 * BASE).toFixed(1)} at 1 in 4, ${(14 * BASE / 2).toFixed(2)} if halved`);
const h2 = exact(14, BASE / 2).cb, h8 = exact(56, BASE / 2).cb;
console.log(`From two weeks to eight, the chance of seeing a real halving goes from ${h2.toFixed(1)}% to ${h8.toFixed(1)}%: ${(h8 / h2).toFixed(2)} times`);
