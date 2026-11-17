// The average isn't you: why a trial that looks at each person once can't say who a treatment works for.
// Made-up Hugo gets headaches on about 1 day in 4. A made-up trial of a made-up treatment says
// 47 in 100 people "responded" (headache days at least halved). He tries it for four weeks and doesn't.
// Every number on the page is printed by this script. Run: node code/the-average-isnt-you.js
//
// Exact values are whole-number fractions (BigInt), so nothing depends on a seed or on floating point,
// except the catch rates in part 4, which add up every possible log exactly in floating point, with the
// test's yes/no decided in whole numbers. A seeded simulation runs the same checks as a second look.
'use strict';

// ---------- exact fractions ----------
const gcd = (a, b) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a; };
const F = (n, d = 1n) => { const g = gcd(BigInt(n), BigInt(d)); return [BigInt(n) / g, BigInt(d) / g]; };
const add = (x, y) => F(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
const sub = (x, y) => F(x[0] * y[1] - y[0] * x[1], x[1] * y[1]);
const mul = (x, y) => F(x[0] * y[0], x[1] * y[1]);
const div = (x, y) => F(x[0] * y[1], x[1] * y[0]);
const ONE = F(1), HALF = F(1, 2);
function val([num, den]) { const s = 10n ** 18n; return Number(num * s / den) / 1e18; }
const in100 = x => Math.round(100 * x) + ' in 100';
const pct = (x, dp = 2) => (100 * x).toFixed(dp) + '%';

function choose(n, k) {
  if (k < 0 || k > n) return 0n;
  let r = 1n;
  for (let i = 1n; i <= BigInt(k); i++) r = r * (BigInt(n) - i + 1n) / i;
  return r;
}
// P(X = k) for X ~ Binomial(n, p/d), exact
function pmf(n, k, p, d) {
  return F(choose(n, k) * BigInt(p) ** BigInt(k) * BigInt(d - p) ** BigInt(n - k), BigInt(d) ** BigInt(n));
}

// ---------- the made-up world ----------
const DAYS = 28;              // four weeks
const BASE = [1, 4];          // without the treatment: a headache on 1 day in 4
const GOOD = [1, 14];         // in a month when the treatment works: 1 day in 14
// World 1 ("it varies by month"): for everyone, each month on the treatment is a good month with chance 1/2.
// World 2 ("it varies by person"): half the people get only good months; for the other half it does nothing.
// "Responded" (the made-up trial's rule): headache days on it at most half the number in the four weeks
// before, i.e. 2 x on <= before. Each try has its own four weeks before.

// P(responded) when the before month is Binomial(28, 1/4) and the on month Binomial(28, p/d)
function respondRate(p, d) {
  let s = F(0);
  for (let b = 0; b <= DAYS; b++) {
    const pb = pmf(DAYS, b, ...BASE);
    let on = F(0);
    for (let t = 0; 2 * t <= b; t++) on = add(on, pmf(DAYS, t, p, d));
    s = add(s, mul(pb, on));
  }
  return s;
}

console.log('=== The average isn\'t you: every number on the page ===\n');

const r0 = respondRate(...BASE);     // a month with no effect (the dummy, or an off month)
const rG = respondRate(...GOOD);     // a good month
const rFirst = mul(HALF, add(rG, r0)); // one month on the treatment, either world
console.log('1. One month, one look (the made-up trial)');
console.log('   "responded" in a month that does nothing (dummy) : ' + pct(val(r0)) + '  (' + in100(val(r0)) + ')');
console.log('   "responded" in a good month                      : ' + pct(val(rG)) + '  (' + in100(val(rG)) + ')');
console.log('   "responded" on the treatment, world 1 or world 2 : ' + pct(val(rFirst)) + '  (' + in100(val(rFirst)) + ')');
console.log('   did not respond on the treatment                 : ' + pct(val(sub(ONE, rFirst))) + '  (' + in100(val(sub(ONE, rFirst))) + ')');
const meanBefore = mul(F(DAYS), F(...BASE));
const meanOn = mul(F(DAYS), mul(HALF, add(F(...GOOD), F(...BASE))));
const meanGood = mul(F(DAYS), F(...GOOD));
console.log('   average headache days in four weeks: without ' + val(meanBefore) + ', on it ' + val(meanOn) +
  ' (a good month ' + val(meanGood) + ', an off month ' + val(meanBefore) + ')');
console.log('   In both worlds a single month on the treatment is a good month with chance 1/2, so everything a');
console.log('   one-look trial can see has the same chances in both worlds.\n');

// ---------- 2. look twice ----------
console.log('2. A second try for everyone (another four weeks before, another four weeks on)');
// World 1: the two tries are independent for everyone.
const w1Again = rFirst, w1SecondIfNot = rFirst;
// World 2: mixture of two kinds of people.
const both2 = mul(HALF, add(mul(rG, rG), mul(r0, r0)));
const firstOnly2 = mul(HALF, add(mul(rG, sub(ONE, rG)), mul(r0, sub(ONE, r0))));
const neither2 = mul(HALF, add(mul(sub(ONE, rG), sub(ONE, rG)), mul(sub(ONE, r0), sub(ONE, r0))));
const w2Again = div(both2, rFirst);
const w2SecondIfNot = div(firstOnly2, sub(ONE, rFirst));
const both1 = mul(rFirst, rFirst), firstOnly1 = mul(rFirst, sub(ONE, rFirst)), neither1 = mul(sub(ONE, rFirst), sub(ONE, rFirst));
console.log('   world 1 (by month):  responded first time ' + pct(val(rFirst)) +
  '; of those, again ' + pct(val(w1Again)) + ' (' + in100(val(w1Again)) + ')' +
  '; of the rest, second time ' + pct(val(w1SecondIfNot)) + ' (' + in100(val(w1SecondIfNot)) + ')');
console.log('   world 2 (by person): responded first time ' + pct(val(rFirst)) +
  '; of those, again ' + pct(val(w2Again)) + ' (' + in100(val(w2Again)) + ')' +
  '; of the rest, second time ' + pct(val(w2SecondIfNot)) + ' (' + in100(val(w2SecondIfNot)) + ')');
console.log('   out of 100 people, both tries / one only / neither:');
console.log('     world 1: ' + [both1, mul(F(2), firstOnly1), neither1].map(x => (100 * val(x)).toFixed(2)).join(' / '));
console.log('     world 2: ' + [both2, mul(F(2), firstOnly2), neither2].map(x => (100 * val(x)).toFixed(2)).join(' / '));
console.log('   check: the two worlds agree on the first try and differ only in how the tries line up.\n');

// ---------- 3. Hugo's one "no" ----------
console.log('3. Hugo\'s month: 8 headache days before, 5 on it -> not halved, a "no"');
const noW1 = sub(ONE, rFirst), noHelped = sub(ONE, rG), noNot = sub(ONE, r0);
console.log('   chance of a "no" in a month, world 1 (it works for him as often as for anyone): ' + pct(val(noW1)) + ' (' + in100(val(noW1)) + ')');
console.log('   world 2, if he is one it helps every month                                : ' + pct(val(noHelped)) + ' (' + in100(val(noHelped)) + ')');
console.log('   world 2, if he is one it never helps                                      : ' + pct(val(noNot)) + ' (' + in100(val(noNot)) + ')');
console.log('   world 2: a "no" is ' + (val(noNot) / val(noHelped)).toFixed(2) + ' times as likely from someone it never helps');
// his exact log, for the record
const p85 = (p, d) => mul(pmf(DAYS, 8, ...BASE), pmf(DAYS, 5, p, d));
console.log('   chance of exactly 8 then 5: good month ' + (100 * val(p85(...GOOD))).toFixed(3) + '%, month that does nothing ' + (100 * val(p85(...BASE))).toFixed(3) + '%');
console.log();

// ---------- 4. Hugo tries it in turns ----------
// P pairs of four-week turns; in each pair a coin picks which four weeks are on the treatment.
// Count headache days on and off over all the turns; this series' yardstick: one-sided Fisher exact test,
// p < 0.1, one look at the end ("fewer headache days on it than luck would give 1 time in 10").
console.log('4. Hugo in turns: P pairs of four weeks, a coin picks the order in each pair; days counted, not halvings');
function flaggedTable(n) {            // n on-days and n off-days; flagged[a][b]: a headache days on, b off
  const N = 2 * n;
  const C = []; for (let k = 0; k <= N; k++) C.push(choose(N, k));
  const c = []; for (let k = 0; k <= n; k++) c.push(choose(n, k));
  const t = [];
  for (let a = 0; a <= n; a++) {
    t.push([]);
    for (let b = 0; b <= n; b++) {
      const K = a + b; let tail = 0n;   // P(X <= a), X hypergeometric: K headache days among 2n, n of them on
      for (let x = Math.max(0, K - n); x <= a; x++) tail += c[x] * c[K - x];
      t[a].push(10n * tail < C[K]);     // p < 1/10, decided in whole numbers
    }
  }
  return t;
}
function binF(n, p) { const out = []; for (let k = 0; k <= n; k++) out.push(Number(choose(n, k)) * p ** k * (1 - p) ** (n - k)); return out; }
function conv(x, y) { const z = new Array(x.length + y.length - 1).fill(0); for (let i = 0; i < x.length; i++) for (let j = 0; j < y.length; j++) z[i + j] += x[i] * y[j]; return z; }
function onDist(P, kind) {
  const bad = binF(DAYS, 1 / 4), good = binF(DAYS, 1 / 14);
  const month = kind === 'good' ? good : kind === 'none' ? bad : good.map((g, i) => (g + bad[i]) / 2);
  let d = [1]; for (let i = 0; i < P; i++) d = conv(d, month); return d;
}
function catchRate(P, kind, flagged) {
  const n = DAYS * P, on = onDist(P, kind), off = binF(n, 1 / 4);
  let s = 0;
  for (let a = 0; a <= n; a++) for (let b = 0; b <= n; b++) if (flagged[a][b]) s += on[a] * off[b];
  return s;
}
const turns = {};
for (const P of [1, 2, 3]) {
  const flagged = flaggedTable(DAYS * P);
  const w1 = catchRate(P, 'mix', flagged), helped = catchRate(P, 'good', flagged), none = catchRate(P, 'none', flagged);
  turns[P] = { w1, helped, none };
  console.log('   ' + P + ' pair' + (P > 1 ? 's' : ' ') + ' (' + 8 * P + ' weeks): world 1 caught ' + pct(w1) + ' (' + in100(w1) + ')' +
    '; world 2, helped: ' + pct(helped) + ' (' + in100(helped) + ')' +
    '; does nothing (false alarm): ' + pct(none) + ' (' + in100(none) + ')');
}
console.log();

// ---------- 5. Senn's simulated asthma trial, for the record (his Tables 4 and 5) ----------
console.log('5. Senn 2016, Tables 4 and 5 (1000 simulated patients, two pairs of periods):');
console.log('   strong personal element: again 806/846 = ' + (806 / 846).toFixed(3) + '; second time after a no 31/154 = ' + (31 / 154).toFixed(3));
console.log('   no personal element:     again 736/863 = ' + (736 / 863).toFixed(3) + '; second time after a no 116/137 = ' + (116 / 137).toFixed(3));
console.log();

// ---------- 6. seeded simulation, as a check ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261117);
const count = p => { let k = 0; for (let i = 0; i < DAYS; i++) if (rnd() < p) k++; return k; };
const responds = pOn => 2 * count(pOn) <= count(1 / 4);
const PEOPLE = 200000;
let s = { d: 0, f1: 0, a1: 0, n1: 0, s1: 0, f2: 0, a2: 0, n2: 0, s2: 0 };
for (let i = 0; i < PEOPLE; i++) {
  if (responds(1 / 4)) s.d++;
  // world 1: each month good with chance 1/2
  const x1 = responds(rnd() < 0.5 ? 1 / 14 : 1 / 4), y1 = responds(rnd() < 0.5 ? 1 / 14 : 1 / 4);
  if (x1) { s.f1++; if (y1) s.a1++; } else { s.n1++; if (y1) s.s1++; }
  // world 2: the person is helped every month, or never
  const helped = rnd() < 0.5, p2 = helped ? 1 / 14 : 1 / 4;
  const x2 = responds(p2), y2 = responds(p2);
  if (x2) { s.f2++; if (y2) s.a2++; } else { s.n2++; if (y2) s.s2++; }
}
console.log('6. Seeded simulation (' + PEOPLE.toLocaleString('en') + ' people per world), against the exact values');
const cmp = (label, sim, exact) => { console.log('   ' + label.padEnd(34) + ' sim ' + pct(sim) + '  exact ' + pct(exact) + '  diff ' + (100 * (sim - exact)).toFixed(2) + ' points'); return Math.abs(sim - exact); };
let worst = 0;
worst = Math.max(worst, cmp('dummy responded', s.d / PEOPLE, val(r0)));
worst = Math.max(worst, cmp('world 1 responded first time', s.f1 / PEOPLE, val(rFirst)));
worst = Math.max(worst, cmp('world 1 again', s.a1 / s.f1, val(w1Again)));
worst = Math.max(worst, cmp('world 1 second time after a no', s.s1 / s.n1, val(w1SecondIfNot)));
worst = Math.max(worst, cmp('world 2 responded first time', s.f2 / PEOPLE, val(rFirst)));
worst = Math.max(worst, cmp('world 2 again', s.a2 / s.f2, val(w2Again)));
worst = Math.max(worst, cmp('world 2 second time after a no', s.s2 / s.n2, val(w2SecondIfNot)));
// turns, simulated: P = 3
function fisherLE(a, b, n) { // exact p-value in floating point, for the simulation only: P(X <= a)
  const K = a + b, N = 2 * n; let lf = [0]; for (let i = 1; i <= N; i++) lf.push(lf[i - 1] + Math.log(i));
  const lc = (m, k) => lf[m] - lf[k] - lf[m - k]; let p = 0;
  for (let x = Math.max(0, K - n); x <= a; x++) p += Math.exp(lc(n, x) + lc(n, K - x) - lc(N, K));
  return p;
}
const RUNS = 100000, P3 = 3;
let t = { w1: 0, h: 0, z: 0 };
for (let i = 0; i < RUNS; i++) {
  let a1 = 0, ah = 0, az = 0, b1 = 0, bh = 0, bz = 0;
  for (let j = 0; j < P3; j++) {
    a1 += count(rnd() < 0.5 ? 1 / 14 : 1 / 4); ah += count(1 / 14); az += count(1 / 4);
    b1 += count(1 / 4); bh += count(1 / 4); bz += count(1 / 4);
  }
  const n = DAYS * P3;
  if (fisherLE(a1, b1, n) < 0.1) t.w1++;
  if (fisherLE(ah, bh, n) < 0.1) t.h++;
  if (fisherLE(az, bz, n) < 0.1) t.z++;
}
worst = Math.max(worst, cmp('3 pairs, world 1 caught', t.w1 / RUNS, turns[3].w1));
worst = Math.max(worst, cmp('3 pairs, world 2 helped caught', t.h / RUNS, turns[3].helped));
worst = Math.max(worst, cmp('3 pairs, false alarm', t.z / RUNS, turns[3].none));
console.log('   largest difference: ' + (100 * worst).toFixed(2) + ' percentage points');
