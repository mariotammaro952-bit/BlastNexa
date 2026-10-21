import {verifyAdventure} from './verify.mjs';
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,content-type,x-blastnexa-token','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...CORS,'Content-Type':'application/json;charset=UTF-8'}});
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
const clean=value=>String(value||'').normalize('NFKC').replace(/[^\p{L}\p{N} _.-]/gu,'').replace(/\s+/g,' ').trim().slice(0,18);
export function createHandler({rpc,catalog,rateSalt}){
 return async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});if(req.method!=='POST')return json({message:'Metodo non consentito'},405);
  try{
   if(Number(req.headers.get('content-length')||0)>96000)return json({message:'Richiesta troppo grande'},413);
   if(!req.body)return json({message:'Richiesta non valida'},400);
   const reader=req.body.getReader(),chunks=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>96000){await reader.cancel();return json({message:'Richiesta troppo grande'},413);}chunks.push(value);}const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}const raw=new TextDecoder().decode(bytes);let body;try{body=JSON.parse(raw);}catch{return json({message:'Richiesta non valida'},400);}
   if(!body||typeof body!=='object'||Array.isArray(body))return json({message:'Richiesta non valida'},400);
   if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return json({message:'Formato non consentito'},415);
   // Cloudflare sets this header. Never trust caller-controlled X-Forwarded-For.
   const ip=req.headers.get('cf-connecting-ip')||'unknown',ipKey='ip:'+await hash(rateSalt+':'+ip);
   if(!await rpc('bn_rank_rate',{p_key:ipKey,p_seconds:60,p_limit:120}))return json({message:'Attendi prima di riprovare'},429);
   if(body.action==='register'){
    const name=clean(body.nickname);if(name.length<3||!Number.isInteger(body.avatar)||body.avatar<0||body.avatar>3)return json({message:'Nome o avatar non valido'},400);
    if(!await rpc('bn_rank_rate',{p_key:'join:'+ipKey,p_seconds:3600,p_limit:5}))return json({message:'Troppi nuovi profili. Riprova più tardi'},429);
    const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');await rpc('bn_rank_register',{p_hash:await hash(token),p_nickname:name,p_avatar:body.avatar});return json({token},201);
   }
   const token=req.headers.get('x-blastnexa-token');if(!/^[a-f0-9]{64}$/.test(token||''))return json({message:'Profilo richiesto'},401);
   const player=await rpc('bn_rank_identify',{p_hash:await hash(token)});if(!player)return json({message:'Profilo non disponibile'},401);
   if(!await rpc('bn_rank_rate',{p_key:'player:'+player,p_seconds:60,p_limit:120}))return json({message:'Attendi prima di riprovare'},429);
   if(body.action==='self')return json(await rpc('bn_rank_self',{p_id:player}));
   if(['report','block'].includes(body.action)){
    if(!/^[a-f0-9-]{36}$/.test(body.target||''))return json({message:'Giocatore non valido'},400);
    if(!await rpc('bn_rank_rate',{p_key:'moderation:'+player,p_seconds:3600,p_limit:20}))return json({message:'Troppe segnalazioni. Riprova più tardi'},429);
    const ok=await rpc(body.action==='report'?'bn_rank_report':'bn_rank_block',{p_id:player,p_target:body.target,p_reason:'inappropriate_name'});return json({ok:!!ok});
   }
   if(body.action==='unblock'){await rpc('bn_rank_unblock',{p_id:player});return json({ok:true});}
   if(body.action==='profile'){
    const name=clean(body.nickname);if(name.length<3||!Number.isInteger(body.avatar)||body.avatar<0||body.avatar>3)return json({message:'Nome o avatar non valido'},400);await rpc('bn_rank_profile',{p_id:player,p_nickname:name,p_avatar:body.avatar});return json({ok:true});
   }
   if(body.action==='submit'){
    if(!Array.isArray(body.runs)||body.runs.length>20||!body.runs.length)return json({message:'Gruppo di risultati non valido'},400);
    const checked=body.runs.map(run=>({run,result:verifyAdventure(run,catalog)})),valid=checked.filter(x=>x.result.ok).map(x=>x.result),rejected=checked.filter(x=>!x.result.ok).map(x=>({id:typeof x.run?.id==='string'?x.run.id.slice(0,96):'',reason:x.result.reason}));
    if(valid.length)await rpc('bn_rank_apply',{p_id:player,p_runs:valid});return json({processed:body.runs.map(x=>typeof x?.id==='string'?x.id.slice(0,96):''),rejected});
   }
   if(body.action==='leaderboard')return json(await rpc('bn_rank_leaderboard',{p_me:player,p_limit:Math.min(50,Math.max(1,Number.isInteger(body.limit)?body.limit:50))}));
   if(body.action==='delete'){await rpc('bn_rank_delete',{p_id:player});return json({ok:true});}
   return json({message:'Azione non valida'},400);
  }catch{return json({message:'Servizio temporaneamente non disponibile'},503);}
 };
}
