// The numbers behind /posts/2026-11-15-when-to-stop-testing.html
// Run it yourself: node code/when-to-stop-testing.js   (no dependencies; same seed, same numbers)
//
// Part 1. NICE's 3% line, counted out in whole people (and made-up Sam's 1 in 12, for comparison).
//
// Part 2. A slow climb. Made-up Elsa logs stomach aches, yes or no, once a day, for eight weeks.
//   In the made-up truth, each day of week w is an aching day with chance p_w, independently of every
//   other day, and p_w climbs in equal steps from 1 day in 7 (week 1) to 3 days in 7 (week 8).
//   "Nothing changing" is the same log with every day at 2 in 7, the climb's average.
//   Every rate below is worked out exactly, by adding up every possible log weighted by its chance.
//   A seeded simulation of 200,000 logs per world is only a check.
//
//   "Looks better than the week before": fewer aching days than the week before (the same is "the same").
//   "Clearly more": the series' yardstick, a one-sided Fisher exact test on the day counts, p < 0.1,
//   here for MORE aching days in weeks 5-8 than in weeks 1-4.

const WEEKS = 8, D = 7, BAR = 0.1, NSIM = 200000;
const climb = Array.from({ length: WEEKS }, (_, w) => (1 + 2 * w / (WEEKS - 1)) / 7);
const flat = Array.from({ length: WEEKS }, () => 2 / 7);

// ---------- helpers
const LF = [0]; for (let k = 1; k <= 200; k++) LF[k] = LF[k - 1] + Math.log(k);
const choose = (n, k) => Math.round(Math.exp(LF[n] - LF[k] - LF[n - k]));
const binomPmf = (n, p) => Array.from({ length: n + 1 }, (_, k) => choose(n, k) * p ** k * (1 - p) ** (n - k));
const hyp = (a, b, c, d) => Math.exp(LF[a + b] + LF[c + d] + LF[a + c] + LF[b + d] - LF[a] - LF[b] - LF[c] - LF[d] - LF[a + b + c + d]);
// One-sided Fisher exact test: chance, by luck alone, of this many aching days (or more) in the later
// block, given the totals. a aching days out of n1 later days; b out of n0 earlier days.
function fisherMore(a, n1, b, n0) {
  const K = a + b, hi = Math.min(n1, K); let p = 0;
  for (let x = a; x <= hi; x++) p += hyp(x, n1 - x, K - x, n0 - K + x);
  return Math.min(1, p);
}
function convolve(f, g) {
  const h = new Array(f.length + g.length - 1).fill(0);
  for (let i = 0; i < f.length; i++) for (let j = 0; j < g.length; j++) h[i + j] += f[i] * g[j];
  return h;
}
const pct = x => (100 * x).toFixed(2) + '%';
const in100 = x => Math.round(100 * x);

// ---------- Part 1: whole people
function part1() {
  // NICE NG12: a 3% positive predictive value underpins its urgent (suspected cancer pathway) referrals.
  const crowd = 1000, ppvPer100 = 3;
  const withCancer = crowd * ppvPer100 / 100, without = crowd - withCancer;
  if (!Number.isInteger(withCancer)) throw new Error('not whole people');
  // Made-up Sam (Count a thousand people): out of 1,000, 9 true yeses and 99 false ones.
  const samTrue = 9, samFalse = 99, samRight = samTrue / (samTrue + samFalse);
  console.log('Part 1. Whole people');
  console.log(`  At a 3% line, out of ${crowd.toLocaleString('en')} people with the symptom: ${withCancer} have cancer, ${without} don't (${without / 10} in 100 don't).`);
  console.log(`  Made-up Sam's yes: ${samTrue} right out of ${samTrue + samFalse} = 1 in ${(1 / samRight).toFixed(0)} = ${pct(samRight)}, above the 3% line.`);
}

// ---------- Part 2: the slow climb, exactly
function exact(ps) {
  const pm = ps.map(p => binomPmf(D, p));
  // (a) each week against the week before
  const pairs = [];
  for (let w = 1; w < WEEKS; w++) {
    let better = 0, same = 0;
    for (let i = 0; i <= D; i++) for (let j = 0; j <= D; j++) {
      const pr = pm[w - 1][i] * pm[w][j];
      if (j < i) better += pr; else if (j === i) same += pr;
    }
    pairs.push({ better, same, worse: 1 - better - same });
  }
  const avg = k => pairs.reduce((s, x) => s + x[k], 0) / pairs.length;
  // (b) how many of the 7 weeks look better than the week before: forward sum over (last count, tally)
  let state = new Map(); // key "count,tally" -> prob
  for (let k = 0; k <= D; k++) state.set(`${k},0`, pm[0][k]);
  for (let w = 1; w < WEEKS; w++) {
    const next = new Map();
    for (const [key, pr] of state) {
      const [k, t] = key.split(',').map(Number);
      for (let j = 0; j <= D; j++) {
        const nk = `${j},${t + (j < k ? 1 : 0)}`;
        next.set(nk, (next.get(nk) || 0) + pr * pm[w][j]);
      }
    }
    state = next;
  }
  const tally = new Array(WEEKS).fill(0);
  for (const [key, pr] of state) tally[Number(key.split(',')[1])] += pr;
  const meanBetter = tally.reduce((s, p, t) => s + p * t, 0);
  const atLeast = m => tally.slice(m).reduce((s, p) => s + p, 0);
  // (c) the last week no worse than the first
  let lastNoWorse = 0;
  for (let i = 0; i <= D; i++) for (let j = 0; j <= i; j++) lastNoWorse += pm[0][i] * pm[WEEKS - 1][j];
  // (d) weeks 5-8 against weeks 1-4
  const early = pm.slice(0, 4).reduce(convolve), late = pm.slice(4).reduce(convolve);
  let more = 0, clearlyMore = 0, noMore = 0;
  for (let b = 0; b < early.length; b++) for (let a = 0; a < late.length; a++) {
    const pr = early[b] * late[a];
    if (a > b) more += pr; else noMore += pr;
    if (fisherMore(a, 28, b, 28) < BAR) clearlyMore += pr;
  }
  // the first week that looks better than the week before (the chance it happens by week 4 is a check on (b))
  return { pairs, better: avg('better'), same: avg('same'), worse: avg('worse'), meanBetter, tally, atLeast1: atLeast(1), atLeast2: atLeast(2), atLeast3: atLeast(3), lastNoWorse, more, noMore, clearlyMore, expected: ps.map(p => D * p) };
}

// mulberry32: a small 32-bit generator that stays exact in JavaScript numbers
function rng(seed) { let s = seed >>> 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function drawLog(r, ps) { return ps.map(p => { let c = 0; for (let d = 0; d < D; d++) if (r() < p) c++; return c; }); }
function simulate(ps, seed) {
  const r = rng(seed); let better = 0, same = 0, atLeast1 = 0, atLeast2 = 0, lastNoWorse = 0, more = 0, clearlyMore = 0, tallySum = 0;
  for (let t = 0; t < NSIM; t++) {
    const x = drawLog(r, ps);
    let nb = 0;
    for (let w = 1; w < WEEKS; w++) { if (x[w] < x[w - 1]) { better++; nb++; } else if (x[w] === x[w - 1]) same++; }
    tallySum += nb; if (nb >= 1) atLeast1++; if (nb >= 2) atLeast2++;
    if (x[WEEKS - 1] <= x[0]) lastNoWorse++;
    const b = x.slice(0, 4).reduce((s, v) => s + v, 0), a = x.slice(4).reduce((s, v) => s + v, 0);
    if (a > b) more++;
    if (fisherMore(a, 28, b, 28) < BAR) clearlyMore++;
  }
  const pairsN = NSIM * (WEEKS - 1);
  return { better: better / pairsN, same: same / pairsN, meanBetter: tallySum / NSIM, atLeast1: atLeast1 / NSIM, atLeast2: atLeast2 / NSIM, lastNoWorse: lastNoWorse / NSIM, more: more / NSIM, clearlyMore: clearlyMore / NSIM };
}

function report(name, e, s) {
  console.log(`\n${name}`);
  console.log(`  chance of an aching day, weeks 1-8: ${e.expected.map(v => (v / 7 * 7).toFixed(2) + '/7').join(', ')}`);
  console.log('  each week against the week before (weeks 2-8):');
  e.pairs.forEach((x, i) => console.log(`    week ${i + 2}: looks better ${pct(x.better)}, the same ${pct(x.same)}, worse ${pct(x.worse)}`));
  console.log(`  averaged over the 7 comparisons: looks better ${pct(e.better)} (sim ${pct(s.better)}) = ${in100(e.better)} in 100; the same ${pct(e.same)} (sim ${pct(s.same)}) = ${in100(e.same)} in 100; worse ${pct(e.worse)} = ${in100(e.worse)} in 100`);
  console.log(`  weeks that look better than the week before, out of 7: ${e.meanBetter.toFixed(3)} on average (sim ${s.meanBetter.toFixed(3)})`);
  console.log(`    distribution: ${e.tally.map((p, t) => `${t}: ${pct(p)}`).join(', ')}`);
  console.log(`    at least 1: ${pct(e.atLeast1)} (sim ${pct(s.atLeast1)}) = ${in100(e.atLeast1)} in 100; at least 2: ${pct(e.atLeast2)} (sim ${pct(s.atLeast2)}) = ${in100(e.atLeast2)} in 100; at least 3: ${pct(e.atLeast3)} = ${in100(e.atLeast3)} in 100`);
  console.log(`  last week no worse than the first: ${pct(e.lastNoWorse)} (sim ${pct(s.lastNoWorse)}) = ${in100(e.lastNoWorse)} in 100`);
  console.log(`  weeks 5-8 have more aching days than weeks 1-4: ${pct(e.more)} (sim ${pct(s.more)}) = ${in100(e.more)} in 100; not more: ${pct(e.noMore)} = ${in100(e.noMore)} in 100`);
  console.log(`  weeks 5-8 "clearly more" than weeks 1-4 (one-sided Fisher, p < ${BAR}): ${pct(e.clearlyMore)} (sim ${pct(s.clearlyMore)}) = ${in100(e.clearlyMore)} in 100`);
}

part1();
console.log(`\nPart 2. Eight weeks of daily yes/no logs, exact (seeded simulation of ${NSIM.toLocaleString('en')} logs per world in brackets)`);
const ec = exact(climb), ef = exact(flat);
report('A steady climb, 1 in 7 to 3 in 7', ec, simulate(climb, 15112026));
report('Nothing changing, 2 in 7 every week', ef, simulate(flat, 15112027));

// How many times as often each sign turns up when the log is climbing as when nothing is changing
console.log('\nHow many times as often when getting worse as when nothing is changing:');
console.log(`  a week looks better than the week before: ${(ec.better / ef.better).toFixed(2)}`);
console.log(`  the last week looks no worse than the first: ${(ec.lastNoWorse / ef.lastNoWorse).toFixed(2)}`);
console.log(`  weeks 5-8 have more aching days than weeks 1-4: ${(ec.more / ef.more).toFixed(2)}`);
console.log(`  ...clearly more: ${(ec.clearlyMore / ef.clearlyMore).toFixed(2)}`);

// ---------- the figure: one made-up log, picked by a rule stated in advance
// The first seed from 1 upward whose log has exactly the typical number of weeks that look better
// than the week before (the most likely tally under the climb), and whose weeks 5-8 have more aching
// days than weeks 1-4 (as most logs do).
{
  const mode = ec.tally.indexOf(Math.max(...ec.tally));
  for (let seed = 1; seed < 1000; seed++) {
    const x = drawLog(rng(seed), climb);
    let nb = 0; for (let w = 1; w < WEEKS; w++) if (x[w] < x[w - 1]) nb++;
    const b = x.slice(0, 4).reduce((s, v) => s + v, 0), a = x.slice(4).reduce((s, v) => s + v, 0);
    if (nb === mode && a > b) {
      const better = []; for (let w = 1; w < WEEKS; w++) if (x[w] < x[w - 1]) better.push(w + 1);
      console.log(`\nFigure: the most likely tally of better-looking weeks is ${mode}. First seed with that tally and weeks 5-8 above weeks 1-4: ${seed}.`);
      console.log(`  aching days per week: ${x.join(', ')}; weeks that look better than the week before: ${better.join(', ')}; weeks 1-4: ${b}, weeks 5-8: ${a}`);
      console.log(`  the made-up truth, expected aching days per week: ${ec.expected.map(v => v.toFixed(2)).join(', ')}`);
      break;
    }
  }
}
