// v34: timed bonus awards are saved on each accepted touch, once per coin.
function coinRushLoad(raw){
 const s=raw&&raw.version===34?raw:{},n=(v,max=1e12)=>Number.isSafeInteger(v)&&v>=0?Math.min(max,v):0;
 const state={version:34,tokens:n(s.tokens,9999),wonCoins:n(s.wonCoins),wonLives:n(s.wonLives),wonRespins:n(s.wonRespins),spentRespins:n(s.spentRespins),seenSpin:n(s.seenSpin,1e9),seenChest:n(s.seenChest,1e9),active:null};
 const a=s.active;if(a&&/^(spin|chest):[1-9]\d*$/.test(a.id)&&Number.isFinite(a.startedAt)&&Number.isFinite(a.endsAt)&&a.endsAt-a.startedAt===10000){
  state.active={id:a.id,seed:n(a.seed,4294967295),startedAt:a.startedAt,endsAt:a.endsAt,state:'closed',reason:a.state==='closed'?String(a.reason||'time'):'interrupted',claimed:Array.isArray(a.claimed)?[...new Set(a.claimed.filter(i=>Number.isInteger(i)&&i>=0&&i<36))]:[],receipts:{},collected:{coins:n(a.collected?.coins),lives:n(a.collected?.lives),respins:n(a.collected?.respins)}};
  for(const i of state.active.claimed)state.active.receipts[i]=n(a.receipts?.[i],300);
  const [kind,id]=a.id.split(':');state[kind==='spin'?'seenSpin':'seenChest']=Math.max(state[kind==='spin'?'seenSpin':'seenChest'],Number(id));
 }
 return state;
}
function coinRushTokens(){return lifeData.slot.rush?.tokens||0;}
function coinRushPrizes(seed){
 const list=[];
 for(const amount of [300,200,150,100,75,50,25,300,200,150,100,75,50,25,200,150,100,75,50,25,100,75,50,25])list.push({kind:'coins',amount});
 for(const amount of [1,2,3,1,2,1,2,3])list.push({kind:'lives',amount});
 for(const amount of [1,2,1,2])list.push({kind:'respins',amount});
 let value=seed>>>0;for(let i=list.length-1;i>0;i--){value=(Math.imul(value,1664525)+1013904223)>>>0;const j=value%(i+1);[list[i],list[j]]=[list[j],list[i]];}
 return list;
}
function coinRushBegin(key){
 const m=/^(spin|chest):([1-9]\d*)$/.exec(String(key));if(!m)return null;
 const index=Number(m[2]),last=lifeData.slot.last,a=lifeData.slot.arcade,s=lifeData.slot.rush;
 const valid=m[1]==='spin'?last?.spin===index&&(last.prize===5||last.arcade?.freeAward>0||a.bonus?.id==='chest:'+index):a.revealed?.id===key&&a.revealed.prize===5;
 const field=m[1]==='spin'?'seenSpin':'seenChest';if(!valid||index<=s[field])return null;
 if(s.active?.state==='active')coinRushEnd(s.active.id,'replaced');
 const now=Date.now();s[field]=index;s.active={id:key,seed:(lifeData.slot.seed^Math.imul(index,2654435761)^(m[1]==='chest'?1548590733:0))>>>0,startedAt:now,endsAt:now+10000,state:'active',claimed:[],receipts:{},collected:{coins:0,lives:0,respins:0}};
 saveLives();return s.active;
}
function coinRushEnd(id,reason='time'){
 const a=lifeData.slot.rush.active;if(!a||a.id!==id||a.state!=='active')return false;
 a.state='closed';a.reason=reason;saveLives();return true;
}
function coinRushClaim(id,index){
 const s=lifeData.slot.rush,a=s.active;if(!a||a.id!==id||a.state!=='active'||!Number.isInteger(index)||index<0||index>=36||a.claimed.includes(index))return null;
 const now=Date.now();if(document.hidden||now<a.startedAt||now>=a.endsAt){coinRushEnd(id,document.hidden?'hidden':'time');return null;}
 const prize=coinRushPrizes(a.seed)[index];let credited=0;a.claimed.push(index);
 if(prize.kind==='coins'){credited=creditSlotCoins(prize.amount);s.wonCoins=Math.min(1e12,s.wonCoins+credited);}
 if(prize.kind==='lives'){const before=lifeData.balance;lifeData.balance=Math.min(999999,before+prize.amount);credited=lifeData.balance-before;s.wonLives=Math.min(1e12,s.wonLives+credited);if(lifeData.balance>=LIFE_CAP)lifeData.anchor=now;}
 if(prize.kind==='respins'){credited=Math.min(prize.amount,9999-s.tokens);s.tokens+=credited;s.wonRespins=Math.min(1e12,s.wonRespins+credited);}
 a.receipts[index]=credited;a.collected[prize.kind]+=credited;saveLives();return {...prize,credited};
}
