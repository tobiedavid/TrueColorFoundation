// Count a thousand people: why a scary yes is usually fine, and when it isn't.
// Made-up Sam gets a yes from a test that is right 9 times in 10, for something 1 in 100 people like him have.
// Every number on the page is printed by this script. Run: node code/count-a-thousand-people.js
//
// Exact values use whole counts of people and fractions, so nothing depends on a seed.
// A seeded simulation runs Sam's test as a check. The "Bring it back" ratios are read
// from that piece's own script (code/bring-it-back.js), so the two pages can't drift apart.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------- whole-number fractions ----------
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
function frac(n, d) { const g = gcd(n, d); return [n / g, d / g]; }
function pct(x, dp = 2) { return (100 * x).toFixed(dp) + '%'; }
function in100(x) { return Math.round(100 * x) + ' in 100'; }
function oneIn(x) { return 'about 1 in ' + Math.round(1 / x) + ' (1 in ' + (1 / x).toFixed(2) + ')'; }

// A test that says yes to `sens` of people who have it and to `fpr` of people who don't,
// in a crowd of `crowd` people where `prev` of them have it. All three as [numerator, denominator].
function countCrowd(crowd, prev, sens, fpr) {
  const have = crowd * prev[0] / prev[1];
  const haveNot = crowd - have;
  const trueYes = have * sens[0] / sens[1];
  const missed = have - trueYes;
  const falseYes = haveNot * fpr[0] / fpr[1];
  const trueNo = haveNot - falseYes;
  for (const v of [have, haveNot, trueYes, missed, falseYes, trueNo]) {
    if (!Number.isInteger(v)) throw new Error('pick a crowd size that gives whole people: ' + v);
  }
  const yes = trueYes + falseYes;
  return { crowd, have, haveNot, trueYes, missed, falseYes, trueNo, yes, ppv: frac(trueYes, yes) };
}

function show(label, c) {
  const [n, d] = c.ppv;
  console.log(label);
  console.log('  out of ' + c.crowd + ': ' + c.have + ' have it, ' + c.haveNot + ' do not');
  console.log('  yes and has it ' + c.trueYes + ', yes but does not ' + c.falseYes + ', missed ' + c.missed + ', right no ' + c.trueNo);
  console.log('  ' + c.yes + ' yeses, ' + c.trueYes + ' true: a yes is right ' + n + '/' + d + ' = ' + pct(n / d) + ', ' + in100(n / d) + ', ' + oneIn(n / d));
}

console.log('Count a thousand people: made-up Sam, exact values\n');

// Sam: 1 in 100 people like him have it; the test is right 9 times in 10 either way.
const NINE = [9, 10];
const ONE = [1, 10];
const sam = countCrowd(1000, [1, 100], NINE, ONE);
show('Sam (1 in 100 have it; yes to 9 in 10 who have it, and to 1 in 10 who do not)', sam);
if (sam.yes !== 108 || sam.trueYes !== 9) throw new Error('figure expects 108 yeses, 9 true');
console.log('  the figure: ' + sam.yes + ' dots, ' + sam.trueYes + ' filled, ' + sam.falseYes + ' outlined');

// The same test, different starting points.
console.log('\nSame test, right 9 times in 10 either way; only how common it is changes:');
const rows = [[[1, 1000], 10000], [[1, 100], 1000], [[1, 10], 1000], [[1, 2], 1000]];
const table = [];
for (const [prev, crowd] of rows) {
  const c = countCrowd(crowd, prev, NINE, ONE);
  const [n, d] = c.ppv;
  table.push({ prev, ppv: n / d });
  console.log('  ' + ('1 in ' + prev[1]).padEnd(10) + ' a yes is right ' + (n + '/' + d).padEnd(9) + pct(n / d).padStart(8) + '  ' + in100(n / d).padStart(10) + '  ' + oneIn(n / d));
}

// The ratio: how many times as often the test says yes when it is there as when it is not.
const ratio = (NINE[0] / NINE[1]) / (ONE[0] / ONE[1]);
console.log('\nHow many times as often a yes comes when Sam has it as when he does not: ' + ratio.toFixed(2));
// Odds before: 1 to 99. Odds after: ratio to 99.
const after = frac(9 * 1, 99);
console.log('  odds before 1 to 99; after a yes ' + (ratio * 1) + ' to 99 = ' + after[0] + ' to ' + after[1] +
  '; as a chance ' + pct(ratio / (ratio + 99)) + ' (same as counting: ' + pct(sam.ppv[0] / sam.ppv[1]) + ')');
// A second, separate yes from a test just as strong, whose mistakes are independent of the first's.
const second = (ratio * ratio) / (ratio * ratio + 99);
console.log('  after a second separate yes, just as strong: ' + (ratio * ratio) + ' to 99 = ' + pct(second) + ', ' + in100(second));
// A no from the same test, for completeness (not on the page).
const no = frac(sam.missed, sam.missed + sam.trueNo);
console.log('  after a no: ' + no[0] + '/' + no[1] + ' = ' + pct(no[0] / no[1], 3) + ' (not on the page)');

// The question asked in 1978 and again in 2013: prevalence 1/1000, false positive rate 5%,
// and (as Manrai et al. assume) a test that catches everyone who has it.
const cass = countCrowd(100000, [1, 1000], [1, 1], [5, 100]);
console.log('\nCasscells 1978 / Manrai 2014 question (1 in 1,000; 5% false yes; catches every case):');
console.log('  out of 100,000: ' + cass.trueYes + ' true yes, ' + cass.falseYes + ' false yes; a yes is right ' +
  cass.ppv[0] + '/' + cass.ppv[1] + ' = ' + pct(cass.ppv[0] / cass.ppv[1]) + ' (the papers: 1.96%, about 2%)');
// Their reported counts, as percentages (quoted from Manrai et al. 2014).
console.log('  1978: 11 of 60 right = ' + pct(11 / 60, 1) + '; 27 of 60 said 95% = ' + pct(27 / 60, 1));
console.log('  2013: 14 of 61 right = ' + pct(14 / 61, 1) + '; 27 of 61 said 95% = ' + pct(27 / 61, 1));

// The gynaecologists' question (Gigerenzer et al.): 1% prevalence, 90% sensitivity, 9% false yes.
const gyn = countCrowd(10000, [1, 100], [9, 10], [9, 100]);
console.log('\nGynaecologists\' question (1%, 90%, 9%): out of 10,000, ' + gyn.trueYes + ' true yes, ' + gyn.falseYes +
  ' false yes; a yes is right ' + pct(gyn.ppv[0] / gyn.ppv[1]) + ' (the paper: about 1 out of 10)');

// ---------- the "Bring it back" ratios, read from that piece's own script ----------
// Only the exact part of that script runs here; its own simulation check is left out.
const src = fs.readFileSync(path.join(__dirname, 'bring-it-back.js'), 'utf8').split('// ---------- seeded simulation')[0];
const sandbox = { console: { log() {} }, __res: null };
vm.runInNewContext(src + '\n;__res = res;', sandbox, { filename: 'bring-it-back.js' });
const r = sandbox.__res;
const lr1 = r.guilty.back1 / r.innocent.back1;
const lr2 = r.guilty.both / r.innocent.both;
console.log('\n"Bring it back" (from code/bring-it-back.js): back at the first return ' + pct(r.innocent.back1) + ' innocent, ' +
  pct(r.guilty.back1) + ' guilty, ratio ' + lr1.toFixed(4) + '; back both times ' + pct(r.innocent.both) + ' innocent, ' +
  pct(r.guilty.both) + ' guilty, ratio ' + lr2.toFixed(4));
function afterRatio(prior, lr) { const o = lr * prior / (1 - prior); return o / (1 + o); }
for (const [prior, name] of [[1 / 2, 'a coin flip (1 in 2)'], [1 / 10, 'a long shot (1 in 10)']]) {
  const a1 = afterRatio(prior, lr1);
  const a2 = afterRatio(prior, lr2);
  console.log('  bread guilty to begin with: ' + name.padEnd(22) + ' after one return that shows ' + pct(a1).padStart(7) + ' ' + in100(a1).padStart(10) +
    '   after both ' + pct(a2).padStart(7) + ' ' + in100(a2).padStart(10));
}
// Check the shortcut against Bayes' rule written out in full, for the long shot.
const p = 1 / 10;
const direct = p * r.guilty.back1 / (p * r.guilty.back1 + (1 - p) * r.innocent.back1);
if (Math.abs(direct - afterRatio(p, lr1)) > 1e-12) throw new Error('odds shortcut disagrees with Bayes rule');

// ---------- seeded simulation of Sam's test, as a check ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261114);
let yes = 0, trueYes = 0;
const N = 2000000;
for (let i = 0; i < N; i++) {
  const has = rnd() < 1 / 100;
  const says = has ? rnd() < 0.9 : rnd() < 0.1;
  if (says) { yes++; if (has) trueYes++; }
}
const simPPV = trueYes / yes;
const exactPPV = sam.ppv[0] / sam.ppv[1];
console.log('\nSeeded simulation check (' + N.toLocaleString('en-US') + ' made-up people like Sam): a yes is right ' + pct(simPPV) +
  ', exact ' + pct(exactPPV) + ', diff ' + (100 * Math.abs(simPPV - exactPPV)).toFixed(2) + ' pts');
