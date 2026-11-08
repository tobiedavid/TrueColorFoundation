// The simulation behind /posts/2026-11-08-looking-every-day.html
// Run it yourself: node code/looking-every-day.js        (prints every number on the page; no dependencies)
//                  node code/looking-every-day.js --svg  (prints the page's figure)
// Same seeds, same numbers.
//
// Part 1. A made-up person, Ines, has a rough night (she lies awake more than half an hour) about one night in 3.
// She wonders whether reading a paper book instead of her phone before bed helps. Each evening a coin decides:
// book or phone. Each morning she adds the night to her tally and can run a test.
// "Clearly better" is this series' yardstick: fewer rough nights after book evenings, by a gap that luck alone
// would give less than 1 time in 10 (one-sided Fisher exact test on the night counts).
// Ways to look:
//   once           - one test, the morning after night 56 (eight weeks).
//   weekly         - a test after nights 7, 14, ..., 56; she stops the first time it says "clearly better".
//   daily          - a test every morning from night 7 to night 56; she stops the first time it says so.
//   daily, longer  - the same, carried on to night 182 (26 weeks) or night 364 (52 weeks).
// Two worlds: the book does nothing (rough nights 1 in 3 either way), or the book cuts them to 1 in 5.
//
// Part 2. The classic trial numbers, reproduced: a normally distributed outcome, tested after each new pair at the
// usual two-sided 1-in-20 bar (Armitage, McPherson & Rowe 1969, as tabled by Ludbrook 2003), and the stricter bar
// for ten looks that keeps the overall rate at 1 in 20 (McPherson 1974: 1.07%).

const N = 50000;                       // simulated logs per world
const ROUGH = 1 / 3, BOOK_REAL = 1 / 5;
const FIRST = 7, END = 56, HALF = 182, YEAR = 364, BAR = 0.1;

const LF = [0]; for (let k = 1; k <= 800; k++) LF[k] = LF[k - 1] + Math.log(k);
const hyp = (a, b, c, d) => Math.exp(LF[a + b] + LF[c + d] + LF[a + c] + LF[b + d] - LF[a] - LF[b] - LF[c] - LF[d] - LF[a + b + c + d]);
// One-sided Fisher exact test: the chance, by luck alone, of this few rough nights (or fewer) after book evenings,
// given the totals. a rough nights out of n1 book nights; b rough nights out of n0 phone nights.
function fisherFewer(a, n1, b, n0) {
  if (n1 === 0 || n0 === 0) return 1;
  const K = a + b, lo = Math.max(0, K - n0); let p = 0;
  for (let x = a; x >= lo; x--) { const t = hyp(x, n1 - x, K - x, n0 - K + x); p += t; if (t < 1e-15 * p) break; }
  return Math.min(1, p);
}
function rng(seed) { let s = seed >>> 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function normal(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// One log of `horizon` nights. Returns the smallest p-value under each way of looking, and the tallies needed.
function oneLog(r, pBook, horizon, keepPath) {
  let a = 0, n1 = 0, b = 0, n0 = 0;
  const out = { p28: 1, p56: 1, minWeekly: 1, minDaily: 1, minHalf: 1, minYear: 1, stop: 0, atStop: null, at56: null, path: keepPath ? [] : null };
  for (let d = 1; d <= horizon; d++) {
    const book = r() < 0.5;
    const rough = r() < (book ? pBook : ROUGH);
    if (book) { n1++; if (rough) a++; } else { n0++; if (rough) b++; }
    if (d < FIRST) continue;
    const p = fisherFewer(a, n1, b, n0);
    if (keepPath) out.path.push({ d, p, book: n1 ? a / n1 : null, phone: n0 ? b / n0 : null });
    if (d <= END) {
      if (p < out.minDaily) out.minDaily = p;
      if (d % 7 === 0 && p < out.minWeekly) out.minWeekly = p;
      if (!out.stop && p < BAR) { out.stop = d; out.atStop = { a, n1, b, n0 }; }
      if (d === 28) out.p28 = p;
      if (d === END) { out.p56 = p; out.at56 = { a, n1, b, n0 }; }
    }
    if (d <= HALF && p < out.minHalf) out.minHalf = p;
    if (p < out.minYear) out.minYear = p;
  }
  return out;
}

const pct = x => (100 * x).toFixed(1);
const in100 = x => Math.round(100 * x);
const median = xs => { const s = [...xs].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

function partOne() {
  // World 1: the book does nothing. Run a full year so every way of looking uses the same logs.
  const r0 = rng(8112026), nul = [];
  for (let t = 0; t < N; t++) nul.push(oneLog(r0, ROUGH, YEAR, false));
  const share = f => nul.filter(f).length / N;
  const once = share(x => x.p56 < BAR), weekly = share(x => x.minWeekly < BAR), daily = share(x => x.minDaily < BAR);
  const half = share(x => x.minHalf < BAR), year = share(x => x.minYear < BAR);
  console.log(`Part 1. Made-up Ines, a coin each evening, ${N.toLocaleString('en')} simulated logs per world.`);
  console.log(`"Clearly better": one-sided Fisher exact test, p < ${BAR}. Tests start after night ${FIRST}.\n`);
  console.log('The book does nothing (rough nights 1 in 3 either way). Says "clearly better" at some point:');
  console.log(`  once, after night ${END}:                 ${pct(once)}%  (${in100(once)} in 100)`);
  console.log(`  every week, nights 7..${END} (8 looks):     ${pct(weekly)}%  (${in100(weekly)} in 100)`);
  console.log(`  every morning, nights 7..${END} (50 looks): ${pct(daily)}%  (${in100(daily)} in 100)`);
  console.log(`  every morning for 26 weeks (176 looks):  ${pct(half)}%  (${in100(half)} in 100)`);
  console.log(`  every morning for 52 weeks (358 looks):  ${pct(year)}%  (${in100(year)} in 100)`);
  console.log(`  daily looking vs one look: ${(daily / once).toFixed(1)} times as many false alarms`);
  const crossed = nul.filter(x => x.minDaily < BAR);
  const faded = crossed.filter(x => x.p56 >= BAR).length / crossed.length;
  const flipped = crossed.filter(x => x.p56 >= 0.5).length / crossed.length;
  console.log(`  of the daily-look false alarms, no longer "clearly better" by night ${END}: ${pct(faded)}%; book nights no better at all (p >= 0.5) by then: ${pct(flipped)}%`);
  console.log(`  median morning she stops, among daily-look false alarms: after night ${median(crossed.map(x => x.stop))}`);

  // World 2: the book cuts rough nights from 1 in 3 to 1 in 5 (8 weeks is all that's needed).
  const r1 = rng(8112027), real = [];
  for (let t = 0; t < N; t++) real.push(oneLog(r1, BOOK_REAL, END, false));
  const rs = f => real.filter(f).length / N;
  const rOnce = rs(x => x.p56 < BAR), rWeekly = rs(x => x.minWeekly < BAR), rDaily = rs(x => x.minDaily < BAR);
  console.log('\nThe book cuts rough nights from 1 in 3 to 1 in 5. Says "clearly better" at some point:');
  console.log(`  once, after night ${END}: ${pct(rOnce)}% (${in100(rOnce)} in 100)   every week: ${pct(rWeekly)}% (${in100(rWeekly)} in 100)   every morning: ${pct(rDaily)}% (${in100(rDaily)} in 100; exactly ${Math.round(rDaily * N)} of ${N.toLocaleString('en')})`);
  console.log(`  how much more common "clearly better" is when the book works: once ${(rOnce / once).toFixed(1)} times, every week ${(rWeekly / weekly).toFixed(1)}, every morning ${(rDaily / daily).toFixed(1)}`);
  const stopped = real.filter(x => x.stop);
  const mean = (xs, f) => xs.reduce((s, x) => s + f(x), 0) / xs.length;
  const sPhone = mean(stopped, x => x.atStop.b / x.atStop.n0), sBook = mean(stopped, x => x.atStop.a / x.atStop.n1);
  const ePhone = mean(real, x => x.at56.b / x.at56.n0), eBook = mean(real, x => x.at56.a / x.at56.n1);
  console.log(`  every morning, on the morning she stops (average over the ${pct(rDaily)}% that stop):`);
  console.log(`    rough nights after phone evenings ${pct(sPhone)}%, after book evenings ${pct(sBook)}%: a gap of ${(100 * (sPhone - sBook)).toFixed(1)} points`);
  console.log(`    median morning she stops: after night ${median(stopped.map(x => x.stop))}`);
  console.log(`  all eight weeks, every log: phone ${pct(ePhone)}%, book ${pct(eBook)}%: a gap of ${(100 * (ePhone - eBook)).toFixed(1)} points`);
  console.log(`  the truth: phone ${pct(ROUGH)}%, book ${pct(BOOK_REAL)}%: a gap of ${(100 * (ROUGH - BOOK_REAL)).toFixed(1)} points`);
  console.log(`  stopping on the first good morning makes the gap look ${((sPhone - sBook) / (ROUGH - BOOK_REAL)).toFixed(1)} times its real size`);

  // A stricter bar for daily looks: the bar that keeps daily looking's false alarms down to one look's.
  const sorted = nul.map(x => x.minDaily).sort((x, y) => x - y);
  const strict = sorted[Math.floor(once * N)];
  const sDaily = share(x => x.minDaily < strict), sPower = rs(x => x.minDaily < strict);
  console.log(`\nA stricter bar for every-morning looks over 8 weeks, chosen so false alarms match one look (${pct(once)}%):`);
  console.log(`  bar: p < ${strict.toFixed(4)} (about 1 in ${Math.round(1 / strict)}); false alarms ${pct(sDaily)}%; catches the real cut ${pct(sPower)}% (one look: ${pct(rOnce)}%)`);
  // Does the stricter bar fix the overstatement? Replay the same real-world logs (same seed, same draws)
  // and stop at the first morning under the stricter bar.
  const r2 = rng(8112027); let gap = 0, k = 0;
  for (let t = 0; t < N; t++) {
    let a = 0, n1 = 0, b = 0, n0 = 0, done = false;
    for (let d = 1; d <= END; d++) {
      const book = r2() < 0.5, rough = r2() < (book ? BOOK_REAL : ROUGH);
      if (book) { n1++; if (rough) a++; } else { n0++; if (rough) b++; }
      if (!done && d >= FIRST && fisherFewer(a, n1, b, n0) < strict) { gap += b / n0 - a / n1; k++; done = true; }
    }
  }
  console.log(`  with the stricter bar, on the morning she stops (${pct(k / N)}% of logs): a gap of ${(100 * gap / k).toFixed(1)} points, ${(gap / k / (ROUGH - BOOK_REAL)).toFixed(1)} times its real size`);

  // One planned early look: after night 28, stopping only for a gap luck would give less than 1 time in 100,
  // then the usual look at the end.
  const hFalse = share(x => x.p28 < 0.01 || x.p56 < BAR), hPower = rs(x => x.p28 < 0.01 || x.p56 < BAR);
  console.log(`\nOne planned look after night 28 at p < 0.01, then the end look at p < ${BAR}:`);
  console.log(`  book does nothing: ${pct(hFalse)}% (one look: ${pct(once)}%); book works: ${pct(hPower)}% (one look: ${pct(rOnce)}%); stops at night 28 when it works: ${pct(rs(x => x.p28 < 0.01))}%`);
}

// Part 2: a normal outcome tested after each new pair at the two-sided 1-in-20 bar.
function erfc(x) { const z = Math.abs(x), t = 1 / (1 + 0.5 * z); const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; }
const twoSidedP = z => erfc(Math.abs(z) / Math.SQRT2);
function partTwo() {
  const M = 200000, K = 100, Z = 1.959963985, r = rng(8112028);
  const looks = [5, 10, 20, 50, 100], ever = { 5: 0, 10: 0, 20: 0, 50: 0, 100: 0 }, max10 = new Float64Array(M);
  for (let t = 0; t < M; t++) {
    let s = 0, crossedAt = 0, m10 = 0;
    for (let n = 1; n <= K; n++) {
      s += normal(r); const z = Math.abs(s / Math.sqrt(n));
      if (n <= 10 && z > m10) m10 = z;
      if (!crossedAt && z > Z) crossedAt = n;
    }
    max10[t] = m10;
    for (const k of looks) if (crossedAt && crossedAt <= k) ever[k]++;
  }
  console.log(`\nPart 2. A normal outcome, tested after each new pair at the two-sided 5% bar (${M.toLocaleString('en')} simulated runs).`);
  console.log('  looks | chance of a false "significant" at some look | Ludbrook 2003, Table 2, after Armitage et al. 1969');
  const theirs = { 10: 0.194, 20: 0.248, 50: 0.320, 100: 0.374 };
  for (const k of looks) console.log(`  ${String(k).padStart(5)} | ${(ever[k] / M).toFixed(3).padStart(44)} | ${k in theirs ? theirs[k].toFixed(3) : '(not in the table)'}`);
  const s = Array.from(max10).sort((x, y) => x - y), c = s[Math.floor(0.95 * M)];
  console.log(`  ten looks: a per-look bar of |z| > ${c.toFixed(3)}, i.e. p < ${(100 * twoSidedP(c)).toFixed(2)}%, keeps the overall rate at 5% (McPherson 1974: 1.07%)`);
}

// The figure: one made-up log where the book does nothing, picked by a fixed rule (the first, in seed order,
// whose every-morning test first says "clearly better" between nights 21 and 35 and that has no gap left by night 56).
function figureRun() {
  const r = rng(8112029);
  for (let t = 1; ; t++) {
    const x = oneLog(r, ROUGH, END, true);
    if (x.stop >= 21 && x.stop <= 35 && x.p56 >= 0.5) return { t, x };
  }
}
function printFigureNumbers() {
  const { t, x } = figureRun(), s = x.atStop, e = x.at56;
  console.log(`\nThe figure: log number ${t} in its seed order. The book does nothing.`);
  console.log(`  "clearly better" on the morning after night ${x.stop}: rough after ${s.b} of ${s.n0} phone evenings (${pct(s.b / s.n0)}%), after ${s.a} of ${s.n1} book evenings (${pct(s.a / s.n1)}%); p = ${x.path.find(q => q.d === x.stop).p.toFixed(3)}`);
  console.log(`  night ${END}: rough after ${e.b} of ${e.n0} phone evenings (${pct(e.b / e.n0)}%), after ${e.a} of ${e.n1} book evenings (${pct(e.a / e.n1)}%); p = ${x.p56.toFixed(3)}`);
}
function printSvg() {
  const { x } = figureRun();
  const W = 600, H = 330, L = 62, R = 16, T = 24, B = 56, ymax = 0.8, F = 'system-ui,sans-serif';
  const X = d => L + (d - FIRST) / (END - FIRST) * (W - L - R), Y = v => T + (1 - v / ymax) * (H - T - B);
  const line = key => x.path.filter(q => q[key] !== null).map(q => `${X(q.d).toFixed(1)},${Y(q[key]).toFixed(1)}`).join(' ');
  const s = x.path.find(q => q.d === x.stop);
  const o = [];
  o.push(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Two lines, the share of rough nights after phone evenings and after book evenings, over eight weeks. They pull apart early, the test says clearly better after night ${x.stop}, and by night ${END} they have come back together.">`);
  for (const v of [0, 0.2, 0.4, 0.6, 0.8]) {
    o.push(`<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="${W - R}" y2="${Y(v).toFixed(1)}" style="stroke:var(--line)" stroke-width="1.5"/>`);
    o.push(`<text x="${L - 8}" y="${(Y(v) + 6).toFixed(1)}" text-anchor="end" style="fill:var(--muted);font:19px ${F}">${Math.round(v * 100)}%</text>`);
  }
  for (const d of [7, 14, 21, 28, 35, 42, 49, 56]) o.push(`<text x="${X(d).toFixed(1)}" y="${H - B + 26}" text-anchor="middle" style="fill:var(--muted);font:19px ${F}">${d}</text>`);
  o.push(`<text x="${((L + W - R) / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" style="fill:var(--muted);font:19px ${F}">night</text>`);
  o.push(`<line x1="${X(x.stop).toFixed(1)}" y1="${T}" x2="${X(x.stop).toFixed(1)}" y2="${H - B}" style="stroke:var(--muted)" stroke-width="2" stroke-dasharray="5 5"/>`);
  o.push(`<polyline points="${line('phone')}" fill="none" style="stroke:var(--ink)" stroke-width="3" stroke-linejoin="round"/>`);
  o.push(`<polyline points="${line('book')}" fill="none" style="stroke:var(--flame)" stroke-width="3" stroke-linejoin="round"/>`);
  o.push(`<circle cx="${X(s.d).toFixed(1)}" cy="${Y(s.book).toFixed(1)}" r="6" style="fill:var(--flame)"/>`);
  o.push(`<text x="${(X(x.stop) + 8).toFixed(1)}" y="${T + 16}" style="fill:var(--ink);font:600 19px ${F}">“clearly better”</text>`);
  // legend, top right, where the lines don't go
  const lx = 452, ly = T + 56;
  o.push(`<line x1="${lx}" y1="${ly}" x2="${lx + 30}" y2="${ly}" style="stroke:var(--ink)" stroke-width="3"/>`);
  o.push(`<text x="${lx + 38}" y="${ly + 6}" style="fill:var(--ink);font:600 19px ${F}">phone</text>`);
  o.push(`<line x1="${lx}" y1="${ly + 28}" x2="${lx + 30}" y2="${ly + 28}" style="stroke:var(--flame)" stroke-width="3"/>`);
  o.push(`<text x="${lx + 38}" y="${ly + 34}" style="fill:var(--flame);font:600 19px ${F}">book</text>`);
  o.push('</svg>');
  console.log(o.join('\n'));
}

if (process.argv.includes('--svg')) printSvg();
else { partOne(); partTwo(); printFigureNumbers(); }
