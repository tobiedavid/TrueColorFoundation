// The numbers behind /posts/2026-11-12-calm-first.html
// Run it yourself: node code/calm-first.js   (prints every number on the page; no dependencies)
// The rates on the page are exact: they add up every possible log, weighted by its chance.
// A seeded simulation then checks them. Same seed, same numbers.
//
// A made-up person, Theo, gets heartburn on some evenings and suspects the tomato sauce on his dinners.
// The made-up truth: the sauce acts on its own. On any evening he has it, the sauce by itself brings heartburn
// with chance 1 in 4, whatever else is going on. Other things (late dinners, mostly) bring heartburn too:
//   busy weeks (his usual; NOISY below): 1 evening in 3 from other things;
//   quiet weeks (after he settles them first): 1 evening in 10.
// Heartburn is logged yes or no, once an evening. An evening that already burns can't burn twice, so with the
// sauce the chance is 1 - (1 - background) * (1 - 1/4).
//
// The test, as in the rest of this series: a coin each evening decides sauce or no sauce, for eight weeks (56 days).
// "Looks guilty" = more heartburn evenings on the sauce side, by a gap that luck alone would give less than
// 1 time in 10 (a one-sided Fisher exact test on the counts), one look, at the end.

const DAYS = 56, BAR = 0.1, SAUCE = 1 / 4, QUIET = 1 / 10, NOISY = 1 / 3;
const SIMS = 200000;
const withSauce = bg => 1 - (1 - bg) * (1 - SAUCE);

const LF = [0]; for (let k = 1; k <= 1200; k++) LF[k] = LF[k - 1] + Math.log(k);
const hyp = (a, b, c, d) => Math.exp(LF[a + b] + LF[c + d] + LF[a + c] + LF[b + d] - LF[a] - LF[b] - LF[c] - LF[d] - LF[a + b + c + d]);
// One-sided Fisher exact test: the chance, by luck alone, of this many heartburn evenings (or more) on the sauce
// side, given the totals. a heartburn evenings out of n1 with sauce; b out of n0 without.
function fisherMore(a, n1, b, n0) {
  if (n1 === 0 || n0 === 0) return 1;
  const K = a + b, hi = Math.min(K, n1); let p = 0;
  for (let x = a; x <= hi; x++) { const t = hyp(x, n1 - x, K - x, n0 - K + x); p += t; if (t < 1e-15 * p) break; }
  return Math.min(1, p);
}
const guilty = (a, n1, b, n0) => fisherMore(a, n1, b, n0) < BAR;
const bin = (k, n, p) => (k < 0 || k > n) ? 0 : Math.exp(LF[n] - LF[k] - LF[n - k] + (k ? k * Math.log(p) : 0) + (n - k ? (n - k) * Math.log(1 - p) : 0));

// Exact chance that the sauce looks guilty: every split of days, every count on each side, weighted by its chance.
// Plain version: tries every cell, no shortcuts. Used for every eight-week number on the page.
function catchRate(n, pOn, pOff) {
  let g = 0;
  for (let m = 0; m <= n; m++) {
    const pm = bin(m, n, 0.5), n0 = n - m;
    for (let a = 0; a <= m; a++) {
      const pa = bin(a, m, pOn);
      for (let b = 0; b <= n0; b++) if (guilty(a, m, b, n0)) g += pm * pa * bin(b, n0, pOff);
    }
  }
  return g;
}
// Fast version for long tests: for fixed days and a, the p-value only rises as b rises, so the guilty b's are
// 0..bmax. That's checked below against the plain version, and the monotonicity is checked directly at 56 days.
function catchRateFast(n, pOn, pOff) {
  let g = 0;
  for (let m = 0; m <= n; m++) {
    const pm = bin(m, n, 0.5); if (pm < 1e-16) continue; const n0 = n - m;
    for (let a = 0; a <= m; a++) {
      const pa = bin(a, m, pOn); if (pa < 1e-16) continue;
      let cum = 0;
      for (let b = 0; b <= n0; b++) { if (!guilty(a, m, b, n0)) break; cum += bin(b, n0, pOff); }
      g += pm * pa * cum;
    }
  }
  return g;
}
function monotoneCheck(n) {
  for (let m = 1; m < n; m++) for (let a = 0; a <= m; a++) {
    let seenFail = false;
    for (let b = 0; b <= n - m; b++) { const gl = guilty(a, m, b, n - m); if (!gl) seenFail = true; else if (seenFail) return false; }
  }
  return true;
}

const pct = x => (100 * x).toFixed(1);
const in100 = x => Math.round(100 * x);

// ---- the made-up truth ----
const qOn = withSauce(QUIET), nOn = withSauce(NOISY);
console.log('Made-up Theo: the sauce alone brings heartburn on 1 evening in 4 he has it. Other things: 1 in 3 (busy weeks), 1 in 10 (quiet).');
console.log('A coin each evening; "looks guilty" = one-sided Fisher exact p < 0.1, one look at the end.\n');
console.log('THE MADE-UP TRUTH, WORKED OUT');
console.log(`Quiet weeks: heartburn without the sauce ${pct(QUIET)}%, with it ${pct(qOn)}%; extra evenings per 100 with sauce: ${pct(qOn - QUIET)}`);
console.log(`Busy weeks:  heartburn without the sauce ${pct(NOISY)}%, with it ${pct(nOn)}%; extra evenings per 100 with sauce: ${pct(nOn - NOISY)}`);
console.log(`Of the evenings the sauce would set off by itself, share already burning anyway: quiet ${pct(QUIET)}%, busy ${pct(NOISY)}%`);
console.log(`Busy weeks with sauce on half the evenings (a coin): heartburn ${pct((NOISY + nOn) / 2)}% of evenings`);
const sd = (n, p) => Math.sqrt(n * p * (1 - p));
console.log(`Luck: typical wobble (one standard deviation) of the count of heartburn evenings over 28 sauce-free evenings: quiet ${sd(28, QUIET).toFixed(2)}, busy ${sd(28, NOISY).toFixed(2)} (ratio ${(sd(28, NOISY) / sd(28, QUIET)).toFixed(2)})\n`);

// ---- exact test rates, eight weeks ----
const catchQ = catchRate(DAYS, qOn, QUIET), catchN = catchRate(DAYS, nOn, NOISY);
const falseQ = catchRate(DAYS, QUIET, QUIET), falseN = catchRate(DAYS, NOISY, NOISY);
console.log('EXACT TEST RATES, EIGHT WEEKS (every possible log added up)');
console.log(`Quiet weeks: the sauce looks guilty ${pct(catchQ)}%   a sauce that does nothing looks guilty ${pct(falseQ)}%`);
console.log(`Busy weeks:  the sauce looks guilty ${pct(catchN)}%   a sauce that does nothing looks guilty ${pct(falseN)}%`);

// ---- how long noisy weeks need, and calm weeks taken out of the eight ----
const ok56 = monotoneCheck(DAYS);
const fastQ = catchRateFast(DAYS, qOn, QUIET), fastN = catchRateFast(DAYS, nOn, NOISY);
console.log(`\nShortcut checks: p-value rises with b at 56 days for every split: ${ok56}; fast = plain: quiet ${Math.abs(fastQ - catchQ) < 1e-12}, busy ${Math.abs(fastN - catchN) < 1e-12}`);
let weeksNeeded = null; const byWeeks = [];
for (let w = 8; w <= 40; w++) {
  const c = catchRateFast(7 * w, nOn, NOISY); byWeeks.push([w, c]);
  if (c >= catchQ) { weeksNeeded = w; break; }
}
console.log('Busy weeks, longer tests: ' + byWeeks.map(([w, c]) => `${w} wk ${pct(c)}%`).join(', '));
console.log(`Busy weeks needed to catch the sauce at least as often as eight quiet weeks (${pct(catchQ)}%): ${weeksNeeded}`);
const sixQuiet = catchRate(42, qOn, QUIET);
console.log(`Two settling weeks taken out of the eight, so the quiet test runs six weeks: catches ${pct(sixQuiet)}%  (eight busy weeks: ${pct(catchN)}%)`);

// ---- the figure: eight weeks of coins, catch rate by background ----
const curve = [];
for (let i = 0; i <= 14; i++) { const bg = i / 20; curve.push([bg, catchRate(DAYS, withSauce(bg), bg)]); }
curve.push([NOISY, catchN]); curve.sort((x, y) => x[0] - y[0]);   // the busy-weeks point sits on the line too
console.log('\nFIGURE: eight weeks of coins, the sauce looks guilty, by how often other things bring heartburn');
console.log(curve.map(([bg, c]) => `${pct(bg)}%: ${pct(c)}%  (${in100(c)} in 100)`).join('\n'));

// ---- if the sauce needed company instead ----
// Say the sauce only mattered on late evenings, and quiet weeks have no late dinners: on quiet weeks it does
// nothing, so it looks guilty only by luck, the same rate as falseQ.
console.log(`\nIf the sauce only mattered alongside late dinners, quiet weeks clear it: passes ${pct(1 - falseQ)}%`);

console.log(`\nOn the page: quiet 1 in ${(1 / QUIET).toFixed(2)} -> 1 in ${(1 / qOn).toFixed(2)} ("about 1 in 3"); busy 1 in ${(1 / NOISY).toFixed(2)} -> 1 in ${(1 / nOn).toFixed(2)};` +
  ` in 100: catch quiet ${in100(catchQ)}, busy ${in100(catchN)}; false alarm quiet ${in100(falseQ)}, busy ${in100(falseN)};` +
  ` weeks needed ${weeksNeeded}; six quiet weeks ${in100(sixQuiet)}; company case passes ${in100(1 - falseQ)}`);

// ---- simulation check ----
function rng(seed) { let s = seed >>> 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// Simulates the mechanism itself (background and sauce as separate chances), not the combined formula.
function sim(seed, bg, sauceActs) {
  const r = rng(seed); let g = 0, burn = 0, sauceDays = 0, burnSauce = 0;
  for (let s = 0; s < SIMS; s++) {
    let a = 0, n1 = 0, b = 0, n0 = 0;
    for (let d = 0; d < DAYS; d++) {
      const sauce = r() < 0.5, fromOther = r() < bg, fromSauce = sauce && sauceActs && r() < SAUCE;
      const hb = fromOther || fromSauce;
      if (sauce) { n1++; a += hb; sauceDays++; burnSauce += hb; } else { n0++; b += hb; }
      burn += hb;
    }
    g += guilty(a, n1, b, n0);
  }
  return { g: g / SIMS, withSauce: burnSauce / sauceDays };
}
console.log(`\nSIMULATION CHECK (${SIMS} eight-week logs each; seeds 12112026-9)`);
const sQ = sim(12112026, QUIET, true), sN = sim(12112027, NOISY, true), fQ = sim(12112028, QUIET, false), fN = sim(12112029, NOISY, false);
console.log(`quiet: looks guilty ${pct(sQ.g)}% (heartburn on sauce evenings ${pct(sQ.withSauce)}%);  does nothing: ${pct(fQ.g)}%`);
console.log(`busy:  looks guilty ${pct(sN.g)}% (heartburn on sauce evenings ${pct(sN.withSauce)}%);  does nothing: ${pct(fN.g)}%`);
