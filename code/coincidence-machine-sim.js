// The 10,000-run check behind the table on /posts/2026-11-06-the-coincidence-machine.html
// Run it yourself: node coincidence-machine-sim.js   (needs coincidence-machine-core.js next to it)
const CM = require('./coincidence-machine-core.js');
const N = 10000;
function setting(mult, seed) {
  const rand = CM.rng(seed);
  const c = { eyeAny: 0, carAny: 0, eyeCheese: 0, carCheese: 0, eyeInno: 0, carInno: 0, oneEye: 0, oneCar: 0 };
  for (let t = 0; t < N; t++) {
    const eat = [], bad = [];
    for (let d = 0; d < CM.DAYS; d++) eat.push(CM.FOODS.map(f => rand() < f[1]));
    for (let d = 0; d < CM.DAYS; d++) { let p = CM.BASE; if (mult > 1 && d > 0 && eat[d - 1][CM.PLANT]) p = Math.min(1, CM.BASE * mult); bad.push(rand() < p); }
    const run = { eat, bad }, L = CM.scan(run);
    if (L.some(l => l.eye)) c.eyeAny++;
    if (L.some(l => l.careful)) c.carAny++;
    if (L.some(l => l.eye && l.i === CM.PLANT)) c.eyeCheese++;
    if (L.some(l => l.careful && l.i === CM.PLANT)) c.carCheese++;
    if (L.some(l => l.eye && l.i !== CM.PLANT)) c.eyeInno++;
    if (L.some(l => l.careful && l.i !== CM.PLANT)) c.carInno++;
    const one = CM.look(run, CM.PLANT, 1);   // cheese, the day after, named before looking
    if (one.eye) c.oneEye++;
    if (one.careful) c.oneCar++;
  }
  const r = {}; for (const k in c) r[k] = (100 * c[k] / N).toFixed(1); return r;
}
const none = setting(1, 6112026), dbl = setting(2, 20261106), tri = setting(3, 3112026);
console.log('Per 100 runs (hopeful eye / careful test)');
console.log('Nothing causes anything, scan all 24 looks: a food is blamed        ', none.eyeAny, '/', none.carAny);
console.log('Nothing causes anything, cheese named first: cheese is blamed        ', none.oneEye, '/', none.oneCar);
console.log('Cheese doubles the odds, scan: cheese is caught                      ', dbl.eyeCheese, '/', dbl.carCheese);
console.log('Cheese doubles the odds, scan: an innocent food is blamed            ', dbl.eyeInno, '/', dbl.carInno);
console.log('Cheese doubles the odds, named first: cheese is caught               ', dbl.oneEye, '/', dbl.oneCar);
console.log('Cheese triples the odds, scan: cheese is caught                      ', tri.eyeCheese, '/', tri.carCheese);
console.log('Cheese triples the odds, named first: cheese is caught               ', tri.oneEye, '/', tri.oneCar);
