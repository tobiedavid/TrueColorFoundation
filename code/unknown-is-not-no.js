// The numbers behind /posts/2026-11-09-unknown-is-not-no.html
// Run it yourself: node code/unknown-is-not-no.js   (prints every number on the page; no dependencies)
//                  node code/unknown-is-not-no.js --svg  (prints the page's figure)
// The rates on the page are exact: they add up every possible eight-week log, weighted by its chance.
// A seeded simulation then checks them, and picks the one made-up log the page opens with. Same seeds, same numbers.
//
// A made-up person, Rosa, is bloated in the evening about one evening in 3. She wonders whether a short walk after
// dinner helps. Each evening her app flips a coin: walk or no walk. Eight weeks: 56 evenings.
// Two worlds: the walk does nothing (bloated 1 evening in 3 either way), or it cuts bloated evenings to 1 in 5.
//
// How she records it. The app only asks her to tap "bloated" when she is; an evening with no tap reads as fine.
// On no-walk evenings that end bloated, she taps 95 times in 100. On walk evenings that end bloated anyway, she's
// let down, and taps only 60 times in 100.
// Had the app asked for an answer every evening ("fine" or "bloated"), the same evenings would have gone
// unanswered, and so would 1 fine evening in 10, walk or not (plain forgetting).
//
// "Clearly better" is this series' yardstick: fewer bloated evenings on the walk side, by a gap that luck alone
// would give less than 1 time in 10 (a one-sided Fisher exact test on the counts), with one look, after evening 56.
//
// Ways to read the log:
//   full     - nothing missing: the truth about every evening.
//   tapOnly  - the app's reading: no tap means fine.
//   dropped  - the app asks every evening; unanswered evenings ("?") are left out.
//   hard     - the app asks every evening; each "?" is filled in the way that's hardest on the walk:
//              a "?" on a walk evening counts as bloated, a "?" on a no-walk evening counts as fine.
//   easy     - the opposite filling, the kindest to the walk.
//   few...   - a cleaner log: 1 evening in 20 goes unanswered, at random, whatever the side or the evening.

const EVENINGS = 56, BLOATED = 1 / 3, WALK_REAL = 1 / 5, BAR = 0.1;
const ROSA = { wb: 0.60, wf: 0.90, nb: 0.95, nf: 0.90 };   // chance an evening gets recorded: walk/no-walk x bloated/fine
const CLEAN = { wb: 0.95, wf: 0.95, nb: 0.95, nf: 0.95 };  // gaps at random, 1 evening in 20
const SIMS = 50000;

const LF = [0]; for (let k = 1; k <= 200; k++) LF[k] = LF[k - 1] + Math.log(k);
const hyp = (a, b, c, d) => Math.exp(LF[a + b] + LF[c + d] + LF[a + c] + LF[b + d] - LF[a] - LF[b] - LF[c] - LF[d] - LF[a + b + c + d]);
// One-sided Fisher exact test: the chance, by luck alone, of this few bloated evenings (or fewer) on the walk side,
// given the totals. a bloated out of n1 walk evenings; b bloated out of n0 no-walk evenings.
function fisherFewer(a, n1, b, n0) {
  if (n1 === 0 || n0 === 0) return 1;
  const K = a + b, lo = Math.max(0, K - n0); let p = 0;
  for (let x = a; x >= lo; x--) { const t = hyp(x, n1 - x, K - x, n0 - K + x); p += t; if (t < 1e-15 * p) break; }
  return Math.min(1, p);
}
const S = EVENINGS + 1, cache = new Float64Array(S * S * S * S).fill(-1);
function pval(a, n1, b, n0) {
  const i = ((a * S + n1) * S + b) * S + n0;
  if (cache[i] < 0) cache[i] = fisherFewer(a, n1, b, n0);
  return cache[i];
}
const yes = (a, n1, b, n0) => pval(a, n1, b, n0) < BAR;

// Add up every possible log. `probs` are the chances of each kind of evening; `visit(counts, chance)` sees each
// possible set of counts once.
function everyLog(probs, visit) {
  const k = probs.length, lp = probs.map(p => Math.log(p)), c = new Array(k).fill(0);
  (function rec(i, left, logp) {
    if (i === k - 1) { c[i] = left; visit(c, Math.exp(LF[EVENINGS] + logp + left * lp[i] - LF[left])); return; }
    for (let x = 0; x <= left; x++) { c[i] = x; rec(i + 1, left - x, logp + (x ? x * lp[i] : 0) - LF[x]); }
  })(0, EVENINGS, 0);
}

// The truth, nothing missing: walk & bloated, walk & fine, no walk & bloated, no walk & fine.
function exactFull(pw) {
  let total = 0, hit = 0;
  everyLog([pw / 2, (1 - pw) / 2, BLOATED / 2, (1 - BLOATED) / 2], (c, p) => {
    total += p; if (yes(c[0], c[0] + c[1], c[2], c[2] + c[3])) hit += p;
  });
  return { hit, total };
}

// With gaps. Six kinds of evening: walk & bloated & recorded, walk & fine & recorded, walk & "?",
// and the same three for no-walk evenings. Every reading below can be worked out from those six counts.
function exactGaps(pw, L) {
  const probs = [
    pw * L.wb / 2, (1 - pw) * L.wf / 2, (pw * (1 - L.wb) + (1 - pw) * (1 - L.wf)) / 2,
    BLOATED * L.nb / 2, (1 - BLOATED) * L.nf / 2, (BLOATED * (1 - L.nb) + (1 - BLOATED) * (1 - L.nf)) / 2,
  ];
  const r = { total: 0, tapOnly: 0, dropped: 0, hard: 0, easy: 0, unknown: 0 };
  everyLog(probs, (c, p) => {
    const [wb, wf, wq, nb, nf, nq] = c, nW = wb + wf + wq, nN = nb + nf + nq;
    r.total += p;
    if (yes(wb, nW, nb, nN)) r.tapOnly += p;              // no tap reads as fine
    if (yes(wb, wb + wf, nb, nb + nf)) r.dropped += p;     // "?" left out
    const h = yes(wb + wq, nW, nb, nN);                   // walk "?" = bloated, no-walk "?" = fine
    const e = yes(wb, nW, nb + nq, nN);                   // walk "?" = fine, no-walk "?" = bloated
    if (h) r.hard += p; if (e) r.easy += p; if (e && !h) r.unknown += p;
  });
  return r;
}

const in100 = x => Math.round(100 * x);
const pct = x => (100 * x).toFixed(1) + '%';

// The simulation: the same logs, drawn one evening at a time, as a check on the exact values.
function rng(seed) { let s = seed >>> 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function oneLog(r, pw, L) {
  const x = { wB: 0, wN: 0, nB: 0, nN: 0, wTap: 0, nTap: 0, wF: 0, nF: 0, wQ: 0, nQ: 0 };
  for (let d = 0; d < EVENINGS; d++) {
    const walk = r() < 0.5, bloated = r() < (walk ? pw : BLOATED);
    const recorded = r() < (walk ? (bloated ? L.wb : L.wf) : (bloated ? L.nb : L.nf));
    if (walk) { x.wN++; if (bloated) x.wB++; if (recorded) { if (bloated) x.wTap++; else x.wF++; } else x.wQ++; }
    else { x.nN++; if (bloated) x.nB++; if (recorded) { if (bloated) x.nTap++; else x.nF++; } else x.nQ++; }
  }
  return x;
}
const readings = {
  full: x => yes(x.wB, x.wN, x.nB, x.nN),
  tapOnly: x => yes(x.wTap, x.wN, x.nTap, x.nN),
  dropped: x => yes(x.wTap, x.wTap + x.wF, x.nTap, x.nTap + x.nF),
  hard: x => yes(x.wTap + x.wQ, x.wN, x.nTap, x.nN),
  easy: x => yes(x.wTap, x.wN, x.nTap + x.nQ, x.nN),
};

// The log the page opens with: the walk does nothing, picked by a fixed rule. It's the first log, in seed order,
// where the app says "clearly better" while the truth shows walk evenings no better at all (p >= 0.5).
function openingLog() {
  const r = rng(9112028);
  for (let t = 1; ; t++) {
    const x = oneLog(r, BLOATED, ROSA);
    if (pval(x.wTap, x.wN, x.nTap, x.nN) < BAR && pval(x.wB, x.wN, x.nB, x.nN) >= 0.5) return { t, x };
  }
}

function main() {
  console.log(`Made-up Rosa: bloated 1 evening in 3; a coin each evening for ${EVENINGS} evenings; one look at the end.`);
  console.log(`"Clearly better": one-sided Fisher exact test, p < ${BAR}. Exact values (every possible log added up).\n`);

  const fullNull = exactFull(BLOATED), fullReal = exactFull(WALK_REAL);
  const rosaNull = exactGaps(BLOATED, ROSA), rosaReal = exactGaps(WALK_REAL, ROSA);
  const cleanNull = exactGaps(BLOATED, CLEAN), cleanReal = exactGaps(WALK_REAL, CLEAN);
  const rows = [
    ['Nothing missing', fullNull.hit, fullReal.hit],
    ['Rosa\'s app: no tap = fine', rosaNull.tapOnly, rosaReal.tapOnly],
    ['Rosa\'s gaps, "?" left out', rosaNull.dropped, rosaReal.dropped],
    ['Rosa\'s gaps, "?" filled the hard way', rosaNull.hard, rosaReal.hard],
    ['Rosa\'s gaps, "?" filled the easy way', rosaNull.easy, rosaReal.easy],
    ['1 gap in 20 at random, "?" left out', cleanNull.dropped, cleanReal.dropped],
    ['1 gap in 20 at random, "?" filled the hard way', cleanNull.hard, cleanReal.hard],
  ];
  console.log('How the log is read                              | walk does nothing: "clearly better" | walk cuts bloating to 1 in 5: "clearly better" | times as common when it works');
  for (const [name, n, w] of rows) console.log(`${name.padEnd(49)}| ${pct(n).padStart(6)} (${String(in100(n)).padStart(2)} in 100)${' '.repeat(16)}| ${pct(w).padStart(6)} (${String(in100(w)).padStart(2)} in 100)${' '.repeat(28)}| ${(w / n).toFixed(1)}`);
  console.log(`(check: the chances add up to ${fullNull.total.toFixed(6)}, ${rosaNull.total.toFixed(6)} and ${cleanNull.total.toFixed(6)})`);

  console.log('\nThe range between the hard way and the easy way:');
  for (const [world, r] of [['walk does nothing', rosaNull], ['walk works', rosaReal]]) {
    console.log(`  Rosa's gaps, ${world}: hard way says "clearly better" ${pct(r.hard)}; only the easy way does (the answer is in the gaps) ${pct(r.unknown)}; neither ${pct(r.total - r.easy)}`);
  }
  for (const [world, r] of [['walk does nothing', cleanNull], ['walk works', cleanReal]]) {
    console.log(`  1 gap in 20 at random, ${world}: hard way ${pct(r.hard)}; only the easy way ${pct(r.unknown)}; neither ${pct(r.total - r.easy)}`);
  }

  // What the app shows on average, and how many evenings go missing, straight from the chances above.
  const half = EVENINGS / 2;
  const tapW = BLOATED * ROSA.wb, tapN = BLOATED * ROSA.nb;
  const qW = BLOATED * (1 - ROSA.wb) + (1 - BLOATED) * (1 - ROSA.wf), qN = BLOATED * (1 - ROSA.nb) + (1 - BLOATED) * (1 - ROSA.nf);
  const dropW = BLOATED * ROSA.wb / (BLOATED * ROSA.wb + (1 - BLOATED) * ROSA.wf), dropN = BLOATED * ROSA.nb / (BLOATED * ROSA.nb + (1 - BLOATED) * ROSA.nf);
  console.log('\nOn average, when the walk does nothing (bloated on 33.3% of evenings either way):');
  console.log(`  the app shows bloating after ${pct(tapW)} of walk evenings and ${pct(tapN)} of the others`);
  console.log(`  with "?" left out: ${pct(dropW)} of answered walk evenings, ${pct(dropN)} of the others`);
  console.log(`  bloated walk evenings that never get a tap, out of about ${half} walk evenings: ${(half * BLOATED * (1 - ROSA.wb)).toFixed(1)}; bloated no-walk evenings with no tap: ${(half * BLOATED * (1 - ROSA.nb)).toFixed(1)}`);
  console.log(`  "?" per eight weeks if the app asked every evening: ${(half * qW).toFixed(1)} on the walk side (${pct(qW)} of walk evenings), ${(half * qN).toFixed(1)} on the other (${pct(qN)})`);

  // Why "both fillings agree" settles it: moving a walk evening from bloated to fine, or a no-walk evening from fine
  // to bloated, never raises the p-value. So every way of filling the "?" lands between the hard way and the easy way.
  let checks = 0, exceptions = 0;
  for (let n1 = 1; n1 < EVENINGS; n1++) for (let n0 = 1; n1 + n0 <= EVENINGS; n0++) for (let a = 0; a <= n1; a++) for (let b = 0; b <= n0; b++) {
    const p = pval(a, n1, b, n0);
    if (a > 0) { checks++; if (pval(a - 1, n1, b, n0) > p + 1e-12) exceptions++; }
    if (b < n0) { checks++; if (pval(a, n1, b + 1, n0) > p + 1e-12) exceptions++; }
  }
  console.log(`\nEvery filling lies between the hard way and the easy way: ${checks.toLocaleString('en')} possible one-evening moves checked, ${exceptions} raise the p-value.`);

  console.log(`\nSimulation check, ${SIMS.toLocaleString('en')} logs per world (exact value in brackets):`);
  for (const [world, pw, seed, exact] of [['walk does nothing', BLOATED, 9112026, { full: fullNull.hit, ...rosaNull }], ['walk works', WALK_REAL, 9112027, { full: fullReal.hit, ...rosaReal }]]) {
    const r = rng(seed), n = { full: 0, tapOnly: 0, dropped: 0, hard: 0, easy: 0 };
    for (let t = 0; t < SIMS; t++) { const x = oneLog(r, pw, ROSA); for (const k in readings) if (readings[k](x)) n[k]++; }
    console.log(`  ${world}: ` + Object.keys(n).map(k => `${k} ${pct(n[k] / SIMS)} [${pct(exact[k])}]`).join(', '));
  }

  const { t, x } = openingLog();
  const pFull = pval(x.wB, x.wN, x.nB, x.nN), pTap = pval(x.wTap, x.wN, x.nTap, x.nN);
  console.log(`\nThe opening log (and the figure): number ${t} in its seed order. The walk does nothing.`);
  console.log(`  app: bloated taps on ${x.wTap} of ${x.wN} walk evenings (${pct(x.wTap / x.wN)}), ${x.nTap} of ${x.nN} others (${pct(x.nTap / x.nN)}); p = ${pTap.toFixed(3)}: "clearly better"`);
  console.log(`  truth: bloated on ${x.wB} of ${x.wN} walk evenings (${pct(x.wB / x.wN)}), ${x.nB} of ${x.nN} others (${pct(x.nB / x.nN)}); p = ${pFull.toFixed(3)}`);
  console.log(`  bloated evenings with no tap: ${x.wB - x.wTap} on the walk side, ${x.nB - x.nTap} on the other`);
  console.log(`  had the app asked every evening: "?" on ${x.wQ} walk evenings and ${x.nQ} others`);
  console.log(`    "?" left out: bloated on ${x.wTap} of ${x.wTap + x.wF} answered walk evenings (${pct(x.wTap / (x.wTap + x.wF))}), ${x.nTap} of ${x.nTap + x.nF} others (${pct(x.nTap / (x.nTap + x.nF))}); p = ${pval(x.wTap, x.wTap + x.wF, x.nTap, x.nTap + x.nF).toFixed(3)}`);
  console.log(`    hard way: ${x.wTap + x.wQ} of ${x.wN} against ${x.nTap} of ${x.nN}; p = ${pval(x.wTap + x.wQ, x.wN, x.nTap, x.nN).toFixed(3)}`);
  console.log(`    easy way: ${x.wTap} of ${x.wN} against ${x.nTap + x.nQ} of ${x.nN}; p = ${pval(x.wTap, x.wN, x.nTap + x.nQ, x.nN).toFixed(3)}`);
}

// The figure: the opening log, one square per evening, grouped by side.
// Filled: she tapped "bloated". Dashed with "?": bloated, no tap (the app read it as fine). Empty: a fine evening.
function printSvg() {
  const { x } = openingLog();
  const W = 600, PER = 12, C = 40, G = 8, F = 'system-ui,sans-serif', o = [];
  let y = 0;
  const cell = (cx, cy, kind) => {
    if (kind === 'tap') o.push(`<rect x="${cx}" y="${cy}" width="${C}" height="${C}" rx="6" style="fill:var(--ink)"/>`);
    else if (kind === 'q') {
      o.push(`<rect x="${cx + 1.5}" y="${cy + 1.5}" width="${C - 3}" height="${C - 3}" rx="6" fill="none" style="stroke:var(--flame)" stroke-width="3" stroke-dasharray="6 4"/>`);
      o.push(`<text x="${cx + C / 2}" y="${cy + C / 2 + 8}" text-anchor="middle" style="fill:var(--flame);font:700 24px ${F}">?</text>`);
    } else o.push(`<rect x="${cx + 1}" y="${cy + 1}" width="${C - 2}" height="${C - 2}" rx="6" fill="none" style="stroke:var(--muted)" stroke-width="2"/>`);
  };
  const group = (title, kinds) => {
    y += 26; o.push(`<text x="0" y="${y}" style="fill:var(--ink);font:600 19px ${F}">${title}</text>`); y += 12;
    kinds.forEach((k, i) => cell((i % PER) * (C + G), y + Math.floor(i / PER) * (C + G), k));
    y += Math.ceil(kinds.length / PER) * (C + G) + 10;
  };
  const kinds = (tap, q, n) => [...Array(tap).fill('tap'), ...Array(q).fill('q'), ...Array(n - tap - q).fill('fine')];
  group(`Walk evenings (${x.wN}): the app saw ${x.wTap} bloated, there were ${x.wB}`, kinds(x.wTap, x.wB - x.wTap, x.wN));
  group(`Other evenings (${x.nN}): the app saw ${x.nTap} bloated, there were ${x.nB}`, kinds(x.nTap, x.nB - x.nTap, x.nN));
  y += 6;
  const legend = [['tap', 'tapped “bloated”'], ['q', 'bloated, no tap: the app counted it as fine'], ['fine', 'fine']];
  for (const [k, label] of legend) {
    const s = 0.7, cy = y;
    o.push(`<g transform="translate(0 ${cy}) scale(${s})">`); cell(0, 0, k); o.push('</g>');
    o.push(`<text x="${C * s + 12}" y="${cy + C * s / 2 + 7}" style="fill:var(--muted);font:19px ${F}">${label}</text>`);
    y += C * s + 10;
  }
  const H = Math.ceil(y);
  const label = `Rosa's ${EVENINGS} evenings, one square each. Walk evenings: ${x.wN}, of which she tapped bloated on ${x.wTap} and was bloated without tapping on ${x.wB - x.wTap}. Other evenings: ${x.nN}, of which she tapped bloated on ${x.nTap} and was bloated without tapping on ${x.nB - x.nTap}.`;
  console.log([`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">`, ...o, '</svg>'].join('\n'));
}

if (process.argv.includes('--svg')) printSvg();
else main();
