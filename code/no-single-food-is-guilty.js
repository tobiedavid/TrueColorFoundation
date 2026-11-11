// The numbers behind /posts/2026-11-11-no-single-food-is-guilty.html
// Run it yourself: node code/no-single-food-is-guilty.js   (prints every number on the page; no dependencies)
// The rates on the page are exact: they add up every possible eight-week log, weighted by its chance.
// A seeded simulation then checks them. Same seed, same numbers.
//
// A made-up person, Noor, is bloated on some evenings. She suspects four foods she eats often.
// The made-up truth: no single food matters on its own. It's the total. Each of the four counts as one "scoop";
// on a day with three or four scoops she's bloated on 4 evenings in 5; with two or fewer, 1 in 10
// (other causes). On her usual days each of the four turns up about half the time, in no particular pattern.
//
// Tests, each over eight weeks (56 days), each with coins:
//   quiet - a coin each day for one food (call it A); the other three are cut for the whole test.
//   busy  - a coin each day for every one of the four (so the others come and go, as on her usual days).
//           Looked at food by food: is A guilty? Looked at by count: are days with 3+ worse than days with 0-2?
//           And: are days with exactly three worse than days with exactly two?
//
// "Looks guilty" (or "looks worse") is this series' yardstick: more bloated evenings on the days with it, by a gap
// that luck alone would give less than 1 time in 10 (a one-sided Fisher exact test on the counts), one look, at the end.

const DAYS = 56, BAR = 0.1, LOW = 0.1, HIGH = 0.8, LINE = 3, FOODS = 4;
const SIMS = 200000;
const chance = k => (k >= LINE ? HIGH : LOW);          // chance of a bloated evening with k scoops that day

const LF = [0]; for (let k = 1; k <= 200; k++) LF[k] = LF[k - 1] + Math.log(k);
const choose = (n, k) => Math.round(Math.exp(LF[n] - LF[k] - LF[n - k]));   // only used for small n
const hyp = (a, b, c, d) => Math.exp(LF[a + b] + LF[c + d] + LF[a + c] + LF[b + d] - LF[a] - LF[b] - LF[c] - LF[d] - LF[a + b + c + d]);
// One-sided Fisher exact test: the chance, by luck alone, of this many bloated evenings (or more) on the suspect's
// side, given the totals. a bloated out of n1 days with it; b bloated out of n0 days without it.
function fisherMore(a, n1, b, n0) {
  if (n1 === 0 || n0 === 0) return 1;
  const K = a + b, hi = Math.min(K, n1); let p = 0;
  for (let x = a; x <= hi; x++) { const t = hyp(x, n1 - x, K - x, n0 - K + x); p += t; if (t < 1e-15 * p) break; }
  return Math.min(1, p);
}
const S = DAYS + 1, cache = new Float64Array(S * S * S * S).fill(-1);
function pval(a, n1, b, n0) {
  const i = ((a * S + n1) * S + b) * S + n0;
  if (cache[i] < 0) cache[i] = fisherMore(a, n1, b, n0);
  return cache[i];
}
const guilty = (a, n1, b, n0) => pval(a, n1, b, n0) < BAR;
const bin = (k, n, p) => (k < 0 || k > n) ? 0 : Math.exp(LF[n] - LF[k] - LF[n - k] + (k ? k * Math.log(p) : 0) + (n - k ? (n - k) * Math.log(1 - p) : 0));

// Each day independently lands on the "with" side with chance q. With it: bloated with chance pOn; without: pOff.
// The chance the "with" days look worse, exactly.
function groupTest(n, q, pOn, pOff) {
  let g = 0;
  for (let m = 0; m <= n; m++) {
    const pm = bin(m, n, q);
    for (let a = 0; a <= m; a++) {
      const pa = bin(a, m, pOn);
      for (let b = 0; b <= n - m; b++) if (guilty(a, m, b, n - m)) g += pm * pa * bin(b, n - m, pOff);
    }
  }
  return g;
}

// ---- the made-up truth, worked out ----
const pK = k => choose(FOODS, k) / 2 ** FOODS;                     // chance of k of the four on a usual day
let usual = 0; for (let k = 0; k <= FOODS; k++) usual += pK(k) * chance(k);
let cutOne = 0; for (let j = 0; j < FOODS; j++) cutOne += choose(FOODS - 1, j) / 2 ** (FOODS - 1) * chance(j);
const prevented = (usual - cutOne) / usual;                            // share of bloated evenings that go if one food goes
// Busy days (a coin for each food): the chance of a bloated evening with A and without A.
let pWithA = 0, pWithoutA = 0;
for (let j = 0; j < FOODS; j++) { const w = choose(FOODS - 1, j) / 2 ** (FOODS - 1); pWithA += w * chance(j + 1); pWithoutA += w * chance(j); }
const aOnBloated = 0.5 * pWithA / usual;                               // on usual days: share of bloated evenings that had A
let pLine = 0; for (let k = LINE; k <= FOODS; k++) pLine += pK(k);    // share of usual days at or over the line
// The only days on which food A changes anything: exactly LINE-1 of the other three are already in.
const tipShare = choose(FOODS - 1, LINE - 1) / 2 ** (FOODS - 1);

// ---- exact test rates ----
const quiet = groupTest(DAYS, 0.5, chance(1), chance(0));              // A alone, the others cut
const busyA = groupTest(DAYS, 0.5, pWithA, pWithoutA);                 // A, with a coin for every food
const countTest = groupTest(DAYS, pLine, HIGH, LOW);                   // days with 3+ against days with 0-2
// Exactly three against exactly two: the day counts are multinomial; other days are left out of this comparison.
function stepTest() {
  const p3 = pK(3), p2 = pK(2), pr = 1 - p3 - p2; let g = 0, tot = 0;
  for (let n3 = 0; n3 <= DAYS; n3++) for (let n2 = 0; n2 <= DAYS - n3; n2++) {
    const nr = DAYS - n3 - n2;
    const w = Math.exp(LF[DAYS] - LF[n3] - LF[n2] - LF[nr] + n3 * Math.log(p3) + n2 * Math.log(p2) + nr * Math.log(pr));
    tot += w;
    for (let a = 0; a <= n3; a++) { const pa = bin(a, n3, chance(3)); for (let b = 0; b <= n2; b++) if (guilty(a, n3, b, n2)) g += w * pa * bin(b, n2, chance(2)); }
  }
  return { g, tot };
}
const step = stepTest();
// "Something to try": a coin each day between a day just under the line (two of the four) and just over it (three).
const twoVsThree = groupTest(DAYS, 0.5, chance(LINE), chance(LINE - 1));

const pct = x => (100 * x).toFixed(1);
const in100 = x => Math.round(100 * x);
console.log('Made-up Noor: four suspects, each about half her days. Bloated 4 evenings in 5 with 3+ of them in a day, 1 in 10 with 0-2.');
console.log('56 days per test; "looks guilty" = one-sided Fisher exact p < 0.1, one look at the end.\n');
console.log('THE MADE-UP TRUTH, WORKED OUT');
console.log(`Usual days: share with 0,1,2,3,4 of the four: ${[0, 1, 2, 3, 4].map(k => pct(pK(k)) + '%').join(', ')}`);
console.log(`Usual days: bloated evenings ${pct(usual)}%  (about 1 in ${(1 / usual).toFixed(1)})`);
console.log(`One food cut for good, the rest as usual: ${pct(cutOne)}%`);
console.log(`Share of bloated evenings that go when any one food goes: ${pct(prevented)}%; four foods added up: ${pct(FOODS * prevented)}%`);
console.log(`Usual days: food A was on the plate on ${pct(aOnBloated)}% of bloated evenings (and on 50.0% of all days)`);
console.log(`What adding A does, by how many of the other three are already in that day:`);
for (let j = 0; j < FOODS; j++) console.log(`   ${j} others: ${pct(chance(j))}% -> ${pct(chance(j + 1))}%  (difference ${pct(chance(j + 1) - chance(j))} points)`);
console.log(`Usual days on which A changes anything (exactly ${LINE - 1} of the other three in): ${pct(tipShare)}%  (= ${choose(FOODS - 1, LINE - 1)} in ${2 ** (FOODS - 1)})`);
console.log(`Busy days (a coin for each): bloated with A ${pct(pWithA)}%, without A ${pct(pWithoutA)}%\n`);
console.log('EXACT TEST RATES (every possible log added up)');
console.log(`Food A alone, the other three cut, a coin each day:        looks guilty ${pct(quiet)}%`);
console.log(`   if each of the four got its own eight weeks like this, all four pass: ${pct((1 - quiet) ** FOODS)}%`);
console.log(`Food A, with a coin for every food each day:              looks guilty ${pct(busyA)}%`);
console.log(`Same logs, by count: days with 3+ look worse than 0-2:    ${pct(countTest)}%   (to four places: ${(100 * countTest).toFixed(4)}%)`);
console.log(`Same logs, exactly three look worse than exactly two:    ${pct(step.g)}%   (to four places: ${(100 * step.g).toFixed(4)}%; total probability added up = ${step.tot.toFixed(12)})`);
console.log(`A coin each day, two of the four against three (the "something to try"): three looks worse ${pct(twoVsThree)}%   (to four places: ${(100 * twoVsThree).toFixed(4)}%)`);
console.log(`\nOn the page, in 100: quiet ${in100(quiet)}; all four pass ${in100((1 - quiet) ** FOODS)}; busy ${in100(busyA)};` +
  ` usual ${in100(usual)}; one cut ${in100(cutOne)}; gone ${in100(prevented)} each, ${in100(FOODS * prevented)} added up;` +
  ` A on ${in100(aOnBloated)} of bloated evenings; A matters on ${choose(FOODS - 1, LINE - 1)} usual days in ${2 ** (FOODS - 1)}`);
console.log(`On the page as "more than 99 in 100": count ${(100 * countTest).toFixed(2)}, three vs two ${(100 * step.g).toFixed(2)},` +
  ` coin two vs three ${(100 * twoVsThree).toFixed(2)}  (all > 99: ${[countTest, step.g, twoVsThree].every(x => x > 0.99)})`);

// ---- simulation check ----
function rng(seed) { let s = seed >>> 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function simQuiet(seed) {
  const r = rng(seed); let g = 0;
  for (let s = 0; s < SIMS; s++) {
    const c = [0, 0, 0, 0];
    for (let d = 0; d < DAYS; d++) { const a = r() < 0.5; const bl = r() < chance(a ? 1 : 0); if (a) { c[1]++; c[0] += bl; } else { c[3]++; c[2] += bl; } }
    g += guilty(c[0], c[1], c[2], c[3]);
  }
  return g / SIMS;
}
function simBusy(seed) {
  const r = rng(seed); let gA = 0, all4 = 0, none4 = 0, cnt = 0, stp = 0, bloated = 0;
  for (let s = 0; s < SIMS; s++) {
    const f = Array.from({ length: FOODS }, () => [0, 0, 0, 0]); const byK = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
    for (let d = 0; d < DAYS; d++) {
      const on = Array.from({ length: FOODS }, () => r() < 0.5); const k = on.filter(Boolean).length;
      const bl = r() < chance(k); bloated += bl; byK[k][0] += bl; byK[k][1]++;
      for (let i = 0; i < FOODS; i++) { if (on[i]) { f[i][1]++; f[i][0] += bl; } else { f[i][3]++; f[i][2] += bl; } }
    }
    const gs = f.map(c => guilty(c[0], c[1], c[2], c[3]));
    gA += gs[0]; all4 += gs.every(Boolean); none4 += !gs.some(Boolean);
    const hiA = byK[3][0] + byK[4][0], hiN = byK[3][1] + byK[4][1], loA = byK[0][0] + byK[1][0] + byK[2][0], loN = byK[0][1] + byK[1][1] + byK[2][1];
    cnt += guilty(hiA, hiN, loA, loN); stp += guilty(byK[3][0], byK[3][1], byK[2][0], byK[2][1]);
  }
  return { gA: gA / SIMS, all4: all4 / SIMS, none4: none4 / SIMS, cnt: cnt / SIMS, stp: stp / SIMS, bloated: bloated / (SIMS * DAYS) };
}
console.log(`\nSIMULATION CHECK (${SIMS} eight-week logs each; seeds 11112026-7)`);
console.log(`quiet: A looks guilty ${pct(simQuiet(11112026))}%`);
const b = simBusy(11112027);
console.log(`busy:  A looks guilty ${pct(b.gA)}%   count 3+ vs 0-2 ${pct(b.cnt)}%   three vs two ${pct(b.stp)}%   bloated evenings ${pct(b.bloated)}%`);
console.log(`busy (simulation only): all four foods look guilty in the same log ${pct(b.all4)}%; none of the four ${pct(b.none4)}%`);
