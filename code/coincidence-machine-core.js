// Coincidence machine core. The page and the test harness run this same code.
var CM=(function(){
  var FOODS=[['coffee',0.85],['bread',0.6],['eggs',0.5],['cheese',0.4],['onions',0.35],['chicken',0.3],
    ['chocolate',0.25],['beer',0.2],['spicy food',0.2],['ice cream',0.15],['beans',0.15],['pizza',0.1]];
  var DAYS=42, BASE=0.2, PLANT=3; // cheese
  var LF=[0]; for(var k=1;k<=200;k++) LF[k]=LF[k-1]+Math.log(k);
  function hyp(a,b,c,d){ return Math.exp(LF[a+b]+LF[c+d]+LF[a+c]+LF[b+d]-LF[a]-LF[b]-LF[c]-LF[d]-LF[a+b+c+d]); }
  // One-sided Fisher exact test: chance of this many bad days (or more) among the food's days, by luck alone.
  function fisher(a,n1,b,n0){ var K=a+b,p=0; for(var x=a;x<=Math.min(n1,K);x++) p+=hyp(x,n1-x,K-x,n0-K+x); return Math.min(1,p); }
  function rng(seed){ var s=seed>>>0; return function(){ s=s+0x6D2B79F5|0; var t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  // Six weeks of made-up days. Bad days are a 1-in-5 roll; if plant is on, cheese doubles the odds the next day.
  function simulate(rand,plant){
    var eat=[],bad=[],d,i;
    for(d=0;d<DAYS;d++){ var row=[]; for(i=0;i<FOODS.length;i++) row.push(rand()<FOODS[i][1]); eat.push(row); }
    for(d=0;d<DAYS;d++){ var p=BASE; if(plant&&d>0&&eat[d-1][PLANT]) p=BASE*2; bad.push(rand()<p); }
    return {eat:eat,bad:bad};
  }
  function look(run,i,lag){
    var a=0,n1=0,b=0,n0=0;
    for(var d=lag;d<DAYS;d++){ var e=run.eat[d-lag][i],y=run.bad[d]; if(e){n1++; if(y)a++;} else {n0++; if(y)b++;} }
    var r1=n1?a/n1:0, r0=n0?b/n0:0, p=fisher(a,n1,b,n0);
    return {i:i,lag:lag,a:a,n1:n1,b:b,n0:n0,r1:r1,r0:r0,p:p,
      eye: a>=3 && r1>=2*r0,                       // the hopeful eye: twice as often, at least 3 times
      careful: a>=3 && r1-r0>=0.3 && p<0.02};      // the careful test
  }
  // Check every food against the same day and the next day: 24 looks.
  function scan(run){ var out=[]; for(var i=0;i<FOODS.length;i++) for(var lag=0;lag<=1;lag++) out.push(look(run,i,lag)); return out; }
  function prime(looks){ var best=null; looks.forEach(function(l){ if(l.eye&&(!best||l.p<best.p||(l.p===best.p&&l.a>best.a))) best=l; }); return best; }
  return {FOODS:FOODS,DAYS:DAYS,BASE:BASE,PLANT:PLANT,rng:rng,simulate:simulate,look:look,scan:scan,prime:prime,fisher:fisher};
})();
if(typeof module!=='undefined') module.exports=CM;
