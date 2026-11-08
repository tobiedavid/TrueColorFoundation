// Numbers for "Notebook: Who checks the checker" (2026-11-07). Run: node code/who-checks-the-checker.js
// A made-up setup: 50 foods are tested against the same bar ("a gap that big would come up less than 1 time in 50
// if the food did nothing"), and the test catches a food that really matters 7 times in 10.
// The question: of the foods that clear the bar, how many are luck? It depends on how many foods really matter,
// which no single test can see. That's why "less than a 1-in-50 chance it's luck" is the wrong way to say it.
const FOODS = 50, BAR = 1 / 50, CATCH = 0.7;
const pct = x => (100 * x).toFixed(0) + '%';
console.log(`Bar: ${BAR} (1 in ${1 / BAR}); a real trigger clears it ${pct(CATCH)} of the time; ${FOODS} foods tested.\n`);
console.log('real triggers | expected real leads | expected lucky leads | share of leads that are luck');
for (const real of [0, 1, 5, 10]) {
  const realLeads = real * CATCH, luckyLeads = (FOODS - real) * BAR;
  const luck = luckyLeads / (realLeads + luckyLeads);
  console.log(`${String(real).padStart(13)} | ${realLeads.toFixed(2).padStart(19)} | ${luckyLeads.toFixed(2).padStart(20)} | ${pct(luck).padStart(4)}`);
}
// with one real trigger: how often at least one innocent food clears the bar
const anyLucky = 1 - Math.pow(1 - BAR, FOODS - 1);
console.log(`\nWith 1 real trigger among ${FOODS}: at least one of the ${FOODS - 1} innocent foods clears the bar in ${pct(anyLucky)} of runs.`);
const anyNone = 1 - Math.pow(1 - BAR, FOODS);
console.log(`With no real trigger: at least one of the ${FOODS} foods clears the bar in ${pct(anyNone)} of runs.`);
console.log('Swap foods for lines of text and leads for a reviewer\'s flags, and the table reads the same.');

// Colquhoun (2014), figure 2: 1000 tests, a real effect in 10% of them, a real effect caught 80% of the time,
// and the usual bar of 1 in 20. Same arithmetic as the table above.
const C = { tests: 1000, real: 0.10, caught: 0.8, bar: 0.05 };
const cTrue = Math.round(C.tests * C.real * C.caught), cFalse = Math.round(C.tests * (1 - C.real) * C.bar);
console.log(`\nColquhoun's example: ${cTrue} true and ${cFalse} false positives, so ${pct(cFalse / (cTrue + cFalse))} of the "discoveries" are false.`);

// The same thing by brute force, so the expected values above aren't taken on faith.
// mulberry32: a small 32-bit generator that stays exact in JavaScript numbers
let seed = 20261107; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const RUNS = 200000; let real = 0, lucky = 0;
for (let r = 0; r < RUNS; r++) { if (rnd() < CATCH) real++; for (let f = 0; f < FOODS - 1; f++) if (rnd() < BAR) lucky++; }
console.log(`Simulated, 1 real trigger, ${RUNS} runs: ${pct(lucky / (real + lucky))} of leads were luck.`);
