// Independent conservation and variety oracle for the presentation-only split.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'game/supernova-v30.js'),'utf8'),sandbox={};vm.createContext(sandbox);vm.runInContext(source.slice(0,source.indexOf('function bnSupernovaStopAudio')),sandbox);
const split=(totals,id)=>JSON.parse(JSON.stringify(sandbox.bnSupernovaParts(totals,id)));
let cases=0;
for(const total of [...Array.from({length:501},(_,i)=>i),999,1000,10000,999999999,Number.MAX_SAFE_INTEGER]){
 for(let seed=0;seed<12;seed++){
  const totals={coins:total,lives:seed%2?5:37,free:seed%3?3:0},before=JSON.stringify(totals),parts=split(totals,'spin:'+seed);
  assert.equal(parts.length,36);assert.equal(JSON.stringify(totals),before);
  for(const key of ['coins','lives','free']){
   assert.equal(parts.reduce((n,p)=>n+BigInt(p[key]),0n),BigInt(totals[key]));
   for(const p of parts)assert.ok(Number.isSafeInteger(p[key])&&p[key]>=0);
  }
  if(total>=3)assert.ok(new Set(parts.map(p=>p.coins)).size>1,'equal award regression '+total);
  assert.deepEqual(parts,split(totals,'spin:'+seed),'The same saved result must reveal the same arrangement');
  cases++;
 }
}
const large=split({coins:250,lives:5,free:3},'review:250'),other=split({coins:250,lives:5,free:3},'review:251');
assert.ok(new Set(large.map(p=>p.coins)).size>=5);assert.notDeepEqual(large,other);
for(let page=0;page<3;page++)assert.ok(new Set(large.slice(page*12,page*12+12).map(p=>p.coins)).size>1);
const lives=split({coins:0,lives:5,free:0},'small-lives');assert.ok(new Set(lives.filter(p=>p.lives).map(p=>p.lives)).size>1);
assert.ok(split({coins:0,lives:0,free:0},'zero').every(p=>!p.coins&&!p.lives&&!p.free));
fs.writeFileSync(path.join(root,'qa/v33_bonus_parts_results.json'),JSON.stringify({cases,variedCoins:true,variedLowLifeAwards:true,exactTotals:true,deterministic:true},null,2));
console.log('PASS',cases,'reward partitions: exact independent sums, varied awards, stable saved arrangement');
