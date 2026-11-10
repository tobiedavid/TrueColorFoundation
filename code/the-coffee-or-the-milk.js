// The numbers behind /posts/2026-11-10-the-coffee-or-the-milk.html
// Run it yourself: node code/the-coffee-or-the-milk.js   (prints every number on the page; no dependencies)
// The rates on the page are exact: they add up every possible eight-week log, weighted by its chance.
// A seeded simulation then checks them. Same seed, same numbers.
//
// A made-up person, Jules, has a latte every morning: coffee and milk. Some mornings bring tummy trouble before lunch.
// The made-up truth: the coffee does nothing. The milk doubles the chance of trouble:
// 2 mornings in 5 with regular milk, 1 in 5 with lactose-free milk, whatever the coffee. Eight weeks: 56 mornings.
//
// Three ways to test, all with coins:
//   bundle   - one coin each morning. Heads: the usual latte. Tails: a decaf latte with lactose-free milk
//              (both swapped at once).
//   oneByOne - weeks 1-4: a coin each morning for coffee or decaf, regular milk throughout;
//              weeks 5-8: a coin each morning for regular or lactose-free milk, regular coffee throughout.
//   twoCoins - two coins each morning: one for coffee or decaf, one for regular or lactose-free milk.
//
// "Looks guilty" is this series' yardstick: more trouble on the mornings with it, by a gap that luck alone would
// give less than 1 time in 10 (a one-sided Fisher exact test on the counts), with one look, at the end.
// "Right answer": the milk looks guilty and the coffee doesn't.

const MORNINGS = 56, WITH_MILK = 2 / 5, WITHOUT_MILK = 1 / 5, BAR = 0.1;
const SIMS = 200000;

const LF = [0]; for (let k = 1; k <= 200; k++) LF[k] = LF[k - 1] + Math.log(k);
const hyp = (a, b, c, d) => Math.exp(LF[a + b] + LF[c + d] + LF[a + c] + LF[b + d] - LF[a] - LF[b] - LF[c] - LF[d] - LF[a + b + c + d]);
// One-sided Fisher exact test: the chance, by luck alone, of this much trouble (or more) on the suspect's side,
// given the totals. a troubled mornings out of n1 with the suspect; b troubled out of n0 without it.
function fisherMore(a, n1, b, n0) {
  if (n1 === 0 || n0 === 0) return 1;
  const K = a + b, hi = Math.min(K, n1); let p = 0;
  for (let x = a; x <= hi; x++) { const t = hyp(x, n1 - x, K - x, n0 - K + x); p += t; if (t < 1e-15 * p) break; }
  return Math.min(1, p);
}
const S = MORNINGS + 1, cache = new Float64Array(S * S * S * S).fill(-1);
function pval(a, n1, b, n0) {
  const i = ((a * S + n1) * S + b) * S + n0;
  if (cache[i] < 0) cache[i] = fisherMore(a, n1, b, n0);
  return cache[i];
}
const guilty = (a, n1, b, n0) => pval(a, n1, b, n0) < BAR;
const bin = (k, n, p) => (k < 0 || k > n) ? 0 : Math.exp(LF[n] - LF[k] - LF[n - k] + (k ? k * Math.log(p) : 0) + (n - k ? (n - k) * Math.log(1 - p) : 0));

// One coin each morning for one thing, over n mornings. The chance it looks guilty, exactly.
// pOn: chance of trouble on mornings with it; pOff: without it.
function oneCoin(n, pOn, pOff) {
  let g = 0;
  for (let m = 0; m <= n; m++) {
    const pm = bin(m, n, 0.5);
    for (let a = 0; a <= m; a++) {
      const pa = bin(a, m, pOn);
      for (let b = 0; b <= n - m; b++) if (guilty(a, m, b, n - m)) g += pm * pa * bin(b, n - m, pOff);
    }
  }
  return g;
}

// Two coins. The coffee does nothing, so its coin is independent of everything else: given K troubled mornings
// in all, the troubled coffee mornings are Binomial(K, 1/2) and the fine coffee mornings Binomial(56-K, 1/2).
// coffeeGivenK[K] = chance the coffee looks guilty, given K.
const coffeeGivenK = [];
for (let K = 0; K <= MORNINGS; K++) {
  let g = 0;
  for (let x = 0; x <= K; x++) for (let y = 0; y <= MORNINGS - K; y++)
    if (guilty(x, x + y, K - x, MORNINGS - x - y)) g += bin(x, K, 0.5) * bin(y, MORNINGS - K, 0.5);
  coffeeGivenK[K] = g;
}
function twoCoinsExact() {
  let milk = 0, coffee = 0, right = 0, total = 0;
  for (let M = 0; M <= MORNINGS; M++) {
    const L = MORNINGS - M, pM = bin(M, MORNINGS, 0.5);
    for (let tm = 0; tm <= M; tm++) for (let tl = 0; tl <= L; tl++) {
      const w = pM * bin(tm, M, WITH_MILK) * bin(tl, L, WITHOUT_MILK), cg = coffeeGivenK[tm + tl];
      total += w; coffee += w * cg;
      if (guilty(tm, M, tl, L)) { milk += w; right += w * (1 - cg); }
    }
  }
  return { milk, coffee, right, total };
}

// ---- exact ----
const bundleMilk = oneCoin(MORNINGS, WITH_MILK, WITHOUT_MILK);           // the latte test: coffee and milk move together
const halfCoffee = oneCoin(MORNINGS / 2, WITH_MILK, WITH_MILK);           // weeks 1-4: coffee coin, regular milk throughout
const halfMilk = oneCoin(MORNINGS / 2, WITH_MILK, WITHOUT_MILK);          // weeks 5-8: milk coin
const two = twoCoinsExact();
const fullCoffeeOnly = oneCoin(MORNINGS, WITH_MILK, WITH_MILK);           // 8 weeks of coffee coins alone (for 16 weeks one by one)

const pct = x => (100 * x).toFixed(1);
const in100 = x => Math.round(100 * x);
console.log('Made-up Jules: trouble on 2 mornings in 5 with regular milk, 1 in 5 without; the coffee does nothing.');
console.log('56 mornings; "looks guilty" = one-sided Fisher exact p < 0.1, one look at the end.\n');
console.log('EXACT (every possible log added up)             coffee looks guilty   milk looks guilty   right answer');
console.log(`One coin, both swapped at once (bundle)        ${pct(bundleMilk).padStart(8)}%            ${pct(bundleMilk).padStart(8)}%        ${pct(0).padStart(8)}%`);
console.log(`One at a time (4 weeks each)                   ${pct(halfCoffee).padStart(8)}%            ${pct(halfMilk).padStart(8)}%        ${pct(halfMilk * (1 - halfCoffee)).padStart(8)}%`);
console.log(`Two coins each morning                         ${pct(two.coffee).padStart(8)}%            ${pct(two.milk).padStart(8)}%        ${pct(two.right).padStart(8)}%`);
console.log(`  (two coins: total probability added up = ${two.total.toFixed(12)})`);
console.log(`\nOn the page, in 100: bundle ${in100(bundleMilk)} / ${in100(bundleMilk)} / 0;` +
  ` one at a time ${in100(halfCoffee)} / ${in100(halfMilk)} / ${in100(halfMilk * (1 - halfCoffee))};` +
  ` two coins ${in100(two.coffee)} / ${in100(two.milk)} / ${in100(two.right)}`);
console.log(`Two coins catch the milk exactly as often as one coin catches the latte: ${pct(two.milk)}% vs ${pct(bundleMilk)}%`);
console.log(`One at a time needs 16 weeks (8 per question) to match: milk ${pct(oneCoin(MORNINGS, WITH_MILK, WITHOUT_MILK))}%,` +
  ` coffee false alarm ${pct(fullCoffeeOnly)}%`);
console.log(`Bundle: of the logs where the latte looks guilty, the coffee looks guilty too in ${pct(1)}% (same test, same numbers).`);

// ---- simulation check ----
function rng(seed) { let s = seed >>> 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function simulate(design, seed) {
  const r = rng(seed); let cG = 0, mG = 0, right = 0;
  for (let s = 0; s < SIMS; s++) {
    // counts: [troubled with, n with, troubled without, n without] for coffee and for milk
    const c = [0, 0, 0, 0], m = [0, 0, 0, 0];
    for (let d = 0; d < MORNINGS; d++) {
      let coffee, milk;
      if (design === 'bundle') { coffee = milk = r() < 0.5; }
      else if (design === 'twoCoins') { coffee = r() < 0.5; milk = r() < 0.5; }
      else { if (d < MORNINGS / 2) { coffee = r() < 0.5; milk = true; } else { coffee = true; milk = r() < 0.5; } }
      const trouble = r() < (milk ? WITH_MILK : WITHOUT_MILK);
      if (design === 'oneByOne') {
        if (d < MORNINGS / 2) { if (coffee) { c[1]++; c[0] += trouble; } else { c[3]++; c[2] += trouble; } }
        else { if (milk) { m[1]++; m[0] += trouble; } else { m[3]++; m[2] += trouble; } }
      } else {
        if (coffee) { c[1]++; c[0] += trouble; } else { c[3]++; c[2] += trouble; }
        if (milk) { m[1]++; m[0] += trouble; } else { m[3]++; m[2] += trouble; }
      }
    }
    const cg = guilty(c[0], c[1], c[2], c[3]), mg = guilty(m[0], m[1], m[2], m[3]);
    cG += cg; mG += mg; right += (mg && !cg);
  }
  return [cG / SIMS, mG / SIMS, right / SIMS];
}
console.log(`\nSIMULATION CHECK (${SIMS} eight-week logs each; seeds 10112026-8)`);
[['bundle', 10112026], ['oneByOne', 10112027], ['twoCoins', 10112028]].forEach(([d, seed]) => {
  const [c, m, rt] = simulate(d, seed);
  console.log(`${d.padEnd(10)} coffee ${pct(c)}%   milk ${pct(m)}%   right ${pct(rt)}%`);
});
