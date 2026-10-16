const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/src/main/assets/index.html','utf8');
const code=html.slice(html.indexOf('let pulseSoundNodes=[];'),html.indexOf('const SCENE_ART='));
let nodes=[],resumed=0;
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
const node=()=>({gain:param(),frequency:param(),connect(next){return next},start(){this.started=true},stop(){this.stopped=true}});
class AudioContext{constructor(){this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.destination={}}resume(){resumed++;return Promise.resolve()}createGain(){return node()}createBiquadFilter(){return node()}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)}}createBufferSource(){const n=node();nodes.push(n);return n}createOscillator(){const n=node();nodes.push(n);return n}}
const c={window:{AudioContext},muted:true,ac:null,activeScene:'war',Math};vm.createContext(c);vm.runInContext(code,c);
c.playScenePulseSound();assert.equal(nodes.length,0);
c.muted=false;c.playScenePulseSound();assert.ok(nodes.length>=10);assert.ok(nodes.every(n=>n.started));assert.ok(resumed);
const war=nodes.slice();c.activeScene='ocean';c.playScenePulseSound();assert.ok(war.every(n=>n.stopped));
c.stopPulseSound();assert.ok(nodes.every(n=>n.stopped));
const before=nodes.length;c.muted=true;c.playScenePulseSound();assert.equal(nodes.length,before);
console.log('PASS: muted audio, resumed context, jet/bomb synthesis, ocean synthesis, cancellation');
