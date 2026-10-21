const fs=require('node:fs'),vm=require('node:vm');
// Executes the exact production script. This records DOM events and state, not browser layout.
function createRuntime(filename,{fast=true,initialStorage=null}={}){
 const html=fs.readFileSync(filename,'utf8'),scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)],elements=new Map(),stored=new Map([['blastnexa_muted','true']]);
 if(initialStorage)for(const [k,v]of initialStorage instanceof Map?initialStorage:Object.entries(initialStorage))stored.set(k,String(v));
 class Element{
  constructor(tag='div'){
   this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.className='';this.style={setProperty(k,v){this[k]=String(v)},getPropertyValue(k){return this[k]||''}};this.dataset={};this.attributes={};this.listeners={};this.disabled=false;this._text='';this._html='';
   const set=()=>new Set(this.className.split(/\s+/).filter(Boolean));this.classList={contains:k=>set().has(k),add:(...ks)=>{const s=set();ks.forEach(k=>s.add(k));this.className=[...s].join(' ')},remove:(...ks)=>{const s=set();ks.forEach(k=>s.delete(k));this.className=[...s].join(' ')},toggle:(k,on)=>{const s=set(),active=on===undefined?!s.has(k):on;active?s.add(k):s.delete(k);this.className=[...s].join(' ');return active}};
  }
  set id(v){this._id=v;elements.set(v,this)}get id(){return this._id}
  set textContent(v){this._text=String(v);this._html='';this.children=[]}get textContent(){return this._text+this.children.map(c=>c.textContent||'').join('')}
  set innerHTML(v){this._html=String(v);this._text='';this.children=[]}get innerHTML(){return this._html||this._text}
  append(...children){for(let child of children){if(typeof child==='string'){const n=new Element('#text');n.textContent=child;child=n}if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(n=>n!==child);child.parentElement=this;this.children.push(child)}}
  replaceChildren(...children){this.children.forEach(c=>c.parentElement=null);this.children=[];this._text='';this._html='';this.append(...children)}
  setAttribute(k,v){this.attributes[k]=String(v)}getAttribute(k){return this.attributes[k]??null}
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn)}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);if(this.id)elements.delete(this.id)}
  closest(selector){if(selector==='.stat'){if(!this._stat)this._stat=new Element();return this._stat}let el=this;while(el){if(selector[0]==='.'&&el.classList.contains(selector.slice(1)))return el;el=el.parentElement}return null}
  getBoundingClientRect(){return{left:16,top:200,width:this.id==='board'?416:120,height:this.id==='board'?416:82,right:432,bottom:616}}
  click(){if(!this.disabled){this.onclick?.();for(const fn of this.listeners.click||[])fn({target:this})}}
  get offsetWidth(){return 416}
 }
 for(const match of html.matchAll(/\bid="([^"]+)"/g)){const node=new Element();node.id=match[1]}
 for(const script of scripts.filter(s=>s[1].includes('application/json'))){const id=script[1].match(/\bid="([^"]+)"/)?.[1];if(id&&elements.has(id))elements.get(id).textContent=script[2]}
 for(const id of ['game','adventureMap','mosaicGallery','themeStudio','settingsScreen','trophiesScreen'])elements.get(id).style.display='none';
 const documentListeners={},document={getElementById:id=>elements.get(id)||null,createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('#fragment'),createTextNode:text=>{const n=new Element('#text');n.textContent=text;return n},body:new Element('body'),addEventListener(name,fn){(documentListeners[name]??=[]).push(fn)},hidden:false};
 let now=0,sequence=0;const timers=new Map(),clock={get now(){return now},set(fn,ms=0){const id=++sequence;timers.set(id,{id,fn,at:now+Number(ms)});return id},clear:id=>timers.delete(id),advance(ms){const end=now+ms;let count=0;for(;;){const due=[...timers.values()].filter(t=>t.at<=end).sort((a,b)=>a.at-b.at||a.id-b.id)[0];if(!due)break;timers.delete(due.id);now=due.at;due.fn();if(++count>10000)throw Error('Timer loop')}now=end;return count},timers};
 const windowListeners={},window={__BN_TEST_FAST__:fast,matchMedia:()=>({matches:false}),addEventListener(name,fn){(windowListeners[name]??=[]).push(fn)}},math=Object.create(Math);let seed=948137;math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const context=vm.createContext({document,window,performance:{now:()=>now},localStorage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v)),removeItem:k=>stored.delete(k)},navigator:{vibrate(){}},setTimeout:clock.set,clearTimeout:clock.clear,Math:math,console});
 vm.runInContext(scripts.find(s=>!s[1].includes('application/json'))[2],context,{filename});return{html,context,elements,stored,clock,documentListeners,windowListeners,run:code=>vm.runInContext(code,context,{timeout:180000})};
}
module.exports={createRuntime};
