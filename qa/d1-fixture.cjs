const{DatabaseSync}=require('node:sqlite'),fs=require('node:fs');
exports.makeD1=()=>{
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(fs.readFileSync('server/schema.sql','utf8'));
 const db={prepare(sql){return{bind(...args){const stmt=sqlite.prepare(sql);return{first:async()=>stmt.get(...args)??null,run:async()=>({success:true,results:stmt.columns().length?stmt.all(...args):(stmt.run(...args),[])}),sql,args};}};},async batch(items){sqlite.exec('BEGIN');try{const out=items.map(({sql,args})=>{const stmt=sqlite.prepare(sql);return{success:true,results:stmt.columns().length?stmt.all(...args):(stmt.run(...args),[])};});sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close(){sqlite.close();},sqlite};return db;
};
