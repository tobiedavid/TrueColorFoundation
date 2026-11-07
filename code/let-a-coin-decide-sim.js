// The simulation behind /posts/2026-11-07-let-a-coin-decide.html
// Run it yourself: node let-a-coin-decide-sim.js   (no dependencies; same seeds, same numbers)
//
// A made-up person, Leo, logs headache days for eight weeks. A headache comes about one day in six,
// with a drift: some weeks are worse than others, and over two months the rate can creep up or down.
// The question is whether his afternoon chocolate is to blame. Four ways of choosing the chocolate days:
//   feel   - he has it when he feels like it. On days a headache is already on its way, he wants it
//            twice as often (6 days in 10, against 3 in 10 otherwise).
//   block  - one long stretch each: four weeks without, then four weeks with it every afternoon
//            (one coin toss picks which half comes first).
//   pairs  - the weeks go in pairs (1-2, 3-4, 5-6, 7-8); a coin decides which week of each pair has it.
//   daily  - a coin each morning.
// Two worlds: chocolate does nothing, or chocolate makes a headache twice as likely that day.
// "Looks guilty": headaches more common on chocolate days by a gap that luck alone would give
// less than 1 time in 10 (one-sided Fisher exact test on the day counts).

const N = 50000;           // simulated eight-week logs per row and world
const WEEKS = 8, DAYS = 56, BASE = 1 / 6;
const TREND_SD = 0.5;      // drift over the two months (log-odds, end to end, one standard deviation either way)
const WOBBLE_SD = 0.3;     // week-to-week wobble (log-odds)
const CRAVE_COMING = 0.6, CRAVE_OTHER = 0.3;

const LF = [0]; for (let k = 1; k <= 400; k++) LF[k] = LF[k - 1] + Math.log(k);
const hyp = (a, b, c, d) => Math.exp(LF[a + b] + LF[c + d] + LF[a + c] + LF[b + d] - LF[a] - LF[b] - LF[c] - LF[d] - LF[a + b + c + d]);
// One-sided Fisher exact test: the chance of this many headache days (or more) among the chocolate days, by luck alone.
function fisher(a, n1, b, n0) { const K = a + b; let p = 0; for (let x = a; x <= Math.min(n1, K); x++) p += hyp(x, n1 - x, K - x, n0 - K + x); return Math.min(1, p); }
function rng(seed) { let s = seed >>> 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function normal(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const logit = p => Math.log(p / (1 - p)), expit = x => 1 / (1 + Math.exp(-x));

function weekRates(r) {
  const trend = normal(r) * TREND_SD, mid = (WEEKS - 1) / 2, out = [];
  for (let w = 0; w < WEEKS; w++) out.push(expit(logit(BASE) + trend * (w - mid) / mid + normal(r) * WOBBLE_SD));
  return out;
}

function oneLog(r, design, trigger) {
  const pw = weekRates(r), chocWeek = [];
  if (design === 'block') { const first = r() < 0.5; for (let w = 0; w < WEEKS; w++) chocWeek.push((w < WEEKS / 2) === first); }
  if (design === 'pairs') { for (let k = 0; k < WEEKS / 2; k++) { const h = r() < 0.5; chocWeek.push(h, !h); } }
  let a = 0, n1 = 0, b = 0, n0 = 0;
  for (let d = 0; d < DAYS; d++) {
    const w = Math.floor(d / 7), p = pw[w];
    const coming = r() < p;                                   // a headache that comes anyway
    let choc;
    if (design === 'feel') choc = r() < (coming ? CRAVE_COMING : CRAVE_OTHER);
    else if (design === 'daily') choc = r() < 0.5;
    else choc = chocWeek[w];
    let head = coming;
    if (!head && trigger && choc) head = r() < p / (1 - p);  // makes that day's chance exactly 2p
    if (choc) { n1++; if (head) a++; } else { n0++; if (head) b++; }
  }
  return { guilty: n1 > 0 && n0 > 0 && fisher(a, n1, b, n0) < 0.1, a, n1, b, n0 };
}

function row(design, trigger, seed) {
  const r = rng(seed); let g = 0, a = 0, n1 = 0, b = 0, n0 = 0;
  for (let t = 0; t < N; t++) { const x = oneLog(r, design, trigger); if (x.guilty) g++; a += x.a; n1 += x.n1; b += x.b; n0 += x.n0; }
  return { guilty: 100 * g / N, headOnChoc: a / n1, headOther: b / n0, chocShare: n1 / (n1 + n0) };
}

const names = { feel: 'He has it when he feels like it', block: 'One long stretch each (4 weeks without, 4 with)', pairs: 'A coin for each pair of weeks', daily: 'A coin each morning' };
const seeds = { feel: [7112026, 7112027], block: [7112028, 7112029], pairs: [7112030, 7112031], daily: [7112032, 7112033] };
const res = {};
console.log(`Out of every 100 eight-week logs (${N.toLocaleString('en')} simulated per cell): chocolate looks guilty`);
console.log('                                                   innocent   doubles the chance   ratio');
for (const d of ['feel', 'block', 'pairs', 'daily']) {
  const inn = row(d, false, seeds[d][0]), trg = row(d, true, seeds[d][1]);
  res[d] = { inn, trg };
  console.log(names[d].padEnd(50), inn.guilty.toFixed(1).padStart(6), trg.guilty.toFixed(1).padStart(16), (trg.guilty / inn.guilty).toFixed(1).padStart(12));
}
const f = res.feel.inn;
console.log(`\nLeo's way, chocolate innocent: headaches on ${(100 * f.headOnChoc).toFixed(1)}% of chocolate days (1 in ${(1 / f.headOnChoc).toFixed(1)}), ${(100 * f.headOther).toFixed(1)}% of other days (1 in ${(1 / f.headOther).toFixed(1)}); chocolate on ${(100 * f.chocShare).toFixed(0)}% of days`);
{ // how much the weekly rate wanders in this made-up world
  const r = rng(7112099), all = []; for (let t = 0; t < 20000; t++) all.push(...weekRates(r)); all.sort((x, y) => x - y);
  const q = p => all[Math.floor(p * all.length)];
  console.log(`Weekly headache rate: 8 weeks in 10 between 1 in ${(1 / q(0.1)).toFixed(1)} and 1 in ${(1 / q(0.9)).toFixed(1)} (median 1 in ${(1 / q(0.5)).toFixed(1)})`);
}
