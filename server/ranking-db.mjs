// Prepared statements are only reachable through the private D1 server binding.
export function createRpc(db, now = () => Date.now()) {
 const first=(sql,...args)=>db.prepare(sql).bind(...args).first(),run=(sql,...args)=>db.prepare(sql).bind(...args).run();
 return async(name,p)=>{
  const time=now();
  switch(name){
   case 'bn_rank_rate':{
    const bucket=Math.floor(time/1000/p.p_seconds);
    const row=await first('INSERT INTO rate_windows(key,bucket,count,expires_at) VALUES(?,?,1,?) ON CONFLICT(key,bucket) DO UPDATE SET count=min(count+1,?) RETURNING count',p.p_key,bucket,time+86400000,p.p_limit+1);
    return row.count<=p.p_limit;
   }
   case 'bn_rank_register':return first('INSERT INTO players(id,token_hash,nickname,avatar,created_at) VALUES(?,?,?,?,?) RETURNING id',crypto.randomUUID(),p.p_hash,p.p_nickname,p.p_avatar,time).then(r=>r.id);
   case 'bn_rank_identify':return first('SELECT id FROM players WHERE token_hash=?',p.p_hash).then(r=>r?.id??null);
   case 'bn_rank_self':return first('SELECT id,nickname,avatar,moderated FROM players WHERE id=?',p.p_id);
   case 'bn_rank_profile':return run('UPDATE players SET nickname=?,avatar=? WHERE id=? AND moderated=0',p.p_nickname,p.p_avatar,p.p_id);
   case 'bn_rank_apply':{
    const player=await first('SELECT moderated FROM players WHERE id=?',p.p_id);if(!player||player.moderated)return;
    if(p.p_runs.length)await db.batch(p.p_runs.map(r=>db.prepare('INSERT INTO results(player_id,level,points,score,moves,scene,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(player_id,level) DO UPDATE SET points=excluded.points,score=excluded.score,moves=excluded.moves,scene=excluded.scene,updated_at=excluded.updated_at WHERE excluded.points>results.points').bind(p.p_id,r.level,r.points,r.score,r.moves,r.scene,time)));return;
   }
   case 'bn_rank_leaderboard':{
    const base='WITH totals AS (SELECT p.id,p.nickname,p.avatar,p.created_at,sum(r.points) AS points,count(*) AS levels FROM players p JOIN results r ON p.id=r.player_id WHERE p.moderated=0 GROUP BY p.id), ranked AS (SELECT *,rank() OVER(ORDER BY points DESC) AS rank FROM totals) ';
    const query=await db.batch([db.prepare(base+'SELECT id,rank,nickname,avatar,points,levels,id=? AS isMe FROM ranked WHERE NOT EXISTS(SELECT 1 FROM blocks b WHERE b.player_id=? AND b.target=ranked.id) ORDER BY points DESC,created_at,id LIMIT ?').bind(p.p_me,p.p_me,p.p_limit),db.prepare(base+'SELECT rank,points,levels FROM ranked WHERE id=?').bind(p.p_me)]);
    return{rows:query[0].results.map(r=>({...r,isMe:!!r.isMe})),me:query[1].results[0]??{rank:null,points:0,levels:0}};
   }
   case 'bn_rank_report':{
    if(p.p_id===p.p_target||!await first('SELECT id FROM players WHERE id=?',p.p_target))return false;
    await db.batch([db.prepare('INSERT INTO reports(id,reporter,target,reason,created_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM reports WHERE reporter=? AND target=? AND state=\'open\')').bind(crypto.randomUUID(),p.p_id,p.p_target,p.p_reason,time,p.p_id,p.p_target),db.prepare('INSERT OR IGNORE INTO blocks(player_id,target) VALUES(?,?)').bind(p.p_id,p.p_target)]);return true;
   }
   case 'bn_rank_block':await run('INSERT OR IGNORE INTO blocks(player_id,target) SELECT ?,id FROM players WHERE id=? AND id<>?',p.p_id,p.p_target,p.p_id);return true;
   case 'bn_rank_unblock':await run('DELETE FROM blocks WHERE player_id=?',p.p_id);return true;
   case 'bn_rank_delete':await run('DELETE FROM players WHERE id=?',p.p_id);return;
   default:throw Error('Unknown operation');
  }
 };
}
