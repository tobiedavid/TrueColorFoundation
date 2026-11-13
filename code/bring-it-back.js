// Bring it back: why a planned return says more than the relief.
// Made-up Mira cuts bread after a rough week of tummy trouble, then brings it back.
// Every number on the page is printed by this script. Run: node code/bring-it-back.js
//
// The made-up truth:
// - Trouble comes in spells. Each day Mira is either in a calm stretch or a rough spell.
//   A calm day turns into a rough spell with chance 1/35 (calm stretches average 5 weeks);
//   a rough day ends the spell with chance 1/7 (rough spells average 1 week).
// - Tummy trouble (yes or no, once a day): 1 in 10 on a calm day, 1 in 2 on a rough day.
// - If bread is guilty: on a bread day, bread by itself brings trouble with chance 1/4,
//   independently of the rest; a day already troubled can't be troubled twice.
//   If bread is innocent, bread changes nothing.
//
// The story, day by day:
//   week 0      bread every day; this is the rough week that makes her cut it (4+ trouble days)
//   weeks 1-3   no bread
//   week 4      bread back, on a date set in advance (first return)
//   week 5      no bread
//   week 6      bread back again (second return)
// Rules, written down in advance:
//   "Better":   fewer trouble days per week in weeks 1-3 than in week 0.
//   "Back":     a bread week has at least 2 more trouble days than the week just before it.
//
// Exact values add up every possible log, hidden spells included, weighted by its chance.
// A seeded simulation runs the same story as a check.
'use strict';

const P_START = 1 / 35;
const P_END = 1 / 7;
const CALM = 0.1;
const ROUGH = 0.5;
const BREAD = 0.25;
const PI_ROUGH = P_START / (P_START + P_END); // long-run share of rough days

function pTrouble(rough, breadOn, guilty) {
  const b = rough ? ROUGH : CALM;
  return breadOn && guilty ? 1 - (1 - b) * (1 - BREAD) : b;
}

// ---------- exact engine ----------
// segments: [{ len, bread, reduce(mem, count) -> newMem | null }]
// null drops the path (used to condition on an event). Returns final mem -> probability,
// plus the total probability kept, so P(A | kept) = P(A and kept) / kept.
function exact(segments, guilty) {
  let dist = new Map([['[]', [1 - PI_ROUGH, PI_ROUGH]]]);
  for (const seg of segments) {
    let inner = new Map();
    for (const [k, v] of dist) inner.set(k + '|0', v.slice());
    for (let d = 0; d < seg.len; d++) {
      const next = new Map();
      for (const [kc, v] of inner) {
        const bar = kc.lastIndexOf('|');
        const k = kc.slice(0, bar);
        const c = +kc.slice(bar + 1);
        for (let s = 0; s < 2; s++) {
          if (v[s] === 0) continue;
          const pt = pTrouble(s === 1, seg.bread, guilty);
          for (const [t, pe] of [[1, pt], [0, 1 - pt]]) {
            const key = k + '|' + (c + t);
            const mass = v[s] * pe;
            let arr = next.get(key);
            if (!arr) { arr = [0, 0]; next.set(key, arr); }
            if (s === 0) { arr[0] += mass * (1 - P_START); arr[1] += mass * P_START; }
            else { arr[1] += mass * (1 - P_END); arr[0] += mass * P_END; }
          }
        }
      }
      inner = next;
    }
    dist = new Map();
    for (const [kc, v] of inner) {
      const bar = kc.lastIndexOf('|');
      const mem = JSON.parse(kc.slice(0, bar));
      const c = +kc.slice(bar + 1);
      const nm = seg.reduce(mem, c);
      if (nm === null) continue;
      const key = JSON.stringify(nm);
      let arr = dist.get(key);
      if (!arr) { arr = [0, 0]; dist.set(key, arr); }
      arr[0] += v[0]; arr[1] += v[1];
    }
  }
  const out = new Map();
  let kept = 0;
  for (const [k, v] of dist) { const m = v[0] + v[1]; out.set(k, m); kept += m; }
  return { out, kept };
}

function prob(result, pred) {
  let a = 0;
  for (const [k, m] of result.out) if (pred(JSON.parse(k))) a += m;
  return a / result.kept;
}

// The main story. mem after each segment is a small array.
function story() {
  return [
    { len: 7, bread: true, reduce: (m, c) => (c >= 4 ? [c] : null) },                 // rough week
    { len: 14, bread: false, reduce: ([c0], c) => [c0, c] },                          // weeks 1-2 off
    { len: 7, bread: false, reduce: ([c0, c12], c) => [(c12 + c) < 3 * c0 ? 1 : 0, c, c12 + c] }, // week 3 off
    { len: 7, bread: true, reduce: ([better, c3, off], c) => [better, c >= c3 + 2 ? 1 : 0, off, c] }, // first return
    { len: 7, bread: false, reduce: ([better, back1, off, c4], c) => [better, back1, off, c4, c] },  // week 5 off
    { len: 7, bread: true, reduce: ([better, back1, off, c4, c5], c) => [better, back1, c >= c5 + 2 ? 1 : 0, off, c4, c5, c] }, // second return
  ];
}

// The timing trap: she waits for a perfect week (no trouble at all) and brings bread back straight after it.
function trap() {
  return [
    { len: 7, bread: true, reduce: (m, c) => (c >= 4 ? [] : null) },
    { len: 14, bread: false, reduce: () => [] },
    { len: 7, bread: false, reduce: (m, c) => (c === 0 ? [] : null) },                // the week before is perfect
    { len: 7, bread: true, reduce: (m, c) => [c >= 2 ? 1 : 0] },                      // "back" = 2 more than 0
  ];
}

// Plain weeks, to describe her usual: one week at a random time, bread every day.
function oneWeek(bread) {
  return [{ len: 7, bread, reduce: (m, c) => [c] }];
}

function pct(x) { return (100 * x).toFixed(2) + '%'; }
function in100(x) { return Math.round(100 * x) + ' in 100'; }

const lines = [];
function say(label, x, extra) {
  lines.push(label.padEnd(64) + pct(x).padStart(8) + '   ' + in100(x).padStart(10) + (extra ? '   ' + extra : ''));
}

const res = {};
for (const guilty of [false, true]) {
  const name = guilty ? 'guilty' : 'innocent';
  const r = exact(story(), guilty);
  const t = exact(trap(), guilty);
  const w = exact(oneWeek(true), guilty);
  const wOff = exact(oneWeek(false), guilty);
  res[name] = {
    better: prob(r, (m) => m[0] === 1),
    back1: prob(r, (m) => m[1] === 1),
    both: prob(r, (m) => m[1] === 1 && m[2] === 1),
    trap: prob(t, (m) => m[0] === 1),
    roughWeek: prob(w, (m) => m[0] >= 4),
    meanWeekBread: [...w.out].reduce((a, [k, m]) => a + JSON.parse(k)[0] * m, 0) / w.kept,
    meanWeekOff: [...wOff.out].reduce((a, [k, m]) => a + JSON.parse(k)[0] * m, 0) / wOff.kept,
    meanOff3: [...r.out].reduce((a, [k, m]) => a + (JSON.parse(k)[3] / 3) * m, 0) / r.kept,
  };
  // mean trouble days in the rough week, given it is a rough week
  const rw = exact([{ len: 7, bread: true, reduce: (m, c) => (c >= 4 ? [c] : null) }], guilty);
  res[name].meanRough = [...rw.out].reduce((a, [k, m]) => a + JSON.parse(k)[0] * m, 0) / rw.kept;
}

console.log('Bring it back: made-up Mira, exact values');
console.log('Long-run share of days in a rough spell: ' + pct(PI_ROUGH) + ' (1 day in ' + (1 / PI_ROUGH).toFixed(2) + ')');
for (const name of ['innocent', 'guilty']) {
  const x = res[name];
  console.log('\nBread ' + name + ':');
  say('  a random week with bread has 4+ trouble days', x.roughWeek, 'about 1 week in ' + Math.round(1 / x.roughWeek));
  lines.push('  trouble days in an average week with bread every day          ' + x.meanWeekBread.toFixed(2));
  lines.push('  trouble days in an average week with no bread                 ' + x.meanWeekOff.toFixed(2));
  lines.push('  trouble days in the rough week that made her cut it           ' + x.meanRough.toFixed(2));
  lines.push('  trouble days per week over the three weeks off, on average    ' + x.meanOff3.toFixed(2));
  say('  "better": fewer trouble days per week in the 3 weeks off', x.better);
  say('  "back" at the first return (set date)', x.back1);
  say('  "back" at both returns', x.both);
  say('  "back" at the first return, brought back after a perfect week', x.trap);
  console.log(lines.join('\n'));
  lines.length = 0;
}
console.log('\nHow many times as often it happens when bread is guilty as when it is innocent:');
for (const k of ['better', 'back1', 'both', 'trap']) {
  console.log('  ' + k.padEnd(8) + (res.guilty[k] / res.innocent[k]).toFixed(2));
}

// ---------- seeded simulation, as a check ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(guilty, runs, seed) {
  const rnd = mulberry32(seed);
  let n = 0, better = 0, back1 = 0, both = 0, trapN = 0, trapBack = 0;
  while (n < runs) {
    let rough = rnd() < PI_ROUGH;
    const day = (bread) => {
      const t = rnd() < pTrouble(rough, bread, guilty) ? 1 : 0;
      rough = rough ? rnd() >= P_END : rnd() < P_START;
      return t;
    };
    const week = (bread, len = 7) => { let c = 0; for (let i = 0; i < len; i++) c += day(bread); return c; };
    const c0 = week(true);
    if (c0 < 4) continue;
    n++;
    const c12 = week(false, 14);
    const c3 = week(false);
    const c4 = week(true);
    const c5 = week(false);
    const c6 = week(true);
    if (c12 + c3 < 3 * c0) better++;
    const b1 = c4 >= c3 + 2;
    if (b1) back1++;
    if (b1 && c6 >= c5 + 2) both++;
    if (c3 === 0) { trapN++; if (c4 >= 2) trapBack++; }
  }
  return { better: better / n, back1: back1 / n, both: both / n, trap: trapBack / trapN, trapN };
}

console.log('\nSeeded simulation check (200,000 rough-week stories each):');
for (const [guilty, seed] of [[false, 20261113], [true, 20261114]]) {
  const s = simulate(guilty, 200000, seed);
  const name = guilty ? 'guilty' : 'innocent';
  const e = res[name];
  console.log('  bread ' + name + ':');
  for (const k of ['better', 'back1', 'both', 'trap']) {
    const diff = Math.abs(s[k] - e[k]);
    console.log('    ' + k.padEnd(8) + ' sim ' + pct(s[k]).padStart(8) + '  exact ' + pct(e[k]).padStart(8) + '  diff ' + (100 * diff).toFixed(2) + ' pts' + (k === 'trap' ? '  (' + s.trapN + ' stories with a perfect third week)' : ''));
  }
}
