package com.blastnexa.blockpuzzle;
import android.content.Context;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import javax.net.ssl.HttpsURLConnection;
/** Bounded HTTPS transport for a fixed ranking endpoint; file access stays restricted. */
public final class OdysseyRanking {
 private final ThreadPoolExecutor executor=new ThreadPoolExecutor(1,1,15,TimeUnit.SECONDS,new ArrayBlockingQueue<Runnable>(8));
 private final Consumer<String> evaluate;
 private String endpoint="",publishable="";
 private volatile boolean destroyed;
 OdysseyRanking(Context context,Consumer<String> callback){
  evaluate=callback;
  try(InputStream in=context.getAssets().open("online-config.json")){
   JSONObject config=new JSONObject(read(in,8192));String url=config.optString("url"),key=config.optString("publishableKey");
   if(url.equals("https://blastnexa-online.mariotammaro952.chatgpt.site/api/ranking")){endpoint=url;publishable=key;}
  }catch(Exception ignored){}
 }
 void request(int id,String payload){
  if(destroyed)return;
  if(endpoint.isEmpty()||payload==null||payload.length()>96000){reply(id,503,"{\"message\":\"Classifica non disponibile\"}");return;}
  try{executor.execute(()->send(id,payload));}catch(Exception ignored){reply(id,429,"{\"message\":\"Attendi prima di riprovare\"}");}
 }
 private void send(int id,String payload){
  HttpsURLConnection connection=null;
  try{
   JSONObject data=new JSONObject(payload);String token=data.optString("token","");data.remove("token");byte[] bytes=data.toString().getBytes("UTF-8");
   connection=(HttpsURLConnection)new URL(endpoint).openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(7000);connection.setReadTimeout(7000);
   connection.setRequestMethod("POST");connection.setRequestProperty("Content-Type","application/json");
   if(token.matches("[a-f0-9]{64}"))connection.setRequestProperty("X-BlastNexa-Token",token);
   connection.setDoOutput(true);connection.setFixedLengthStreamingMode(bytes.length);
   try(java.io.OutputStream out=connection.getOutputStream()){out.write(bytes);}
   int status=connection.getResponseCode();try(InputStream in=status>=400?connection.getErrorStream():connection.getInputStream()){reply(id,status,in==null?"{}":read(in,96000));}
  }catch(Exception ignored){reply(id,503,"{\"message\":\"Connessione non disponibile\"}");}finally{if(connection!=null)connection.disconnect();}
 }
 private void reply(int id,int status,String payload){if(!destroyed)evaluate.accept("window.BlastNexaOnlineResult&&window.BlastNexaOnlineResult("+id+","+status+","+JSONObject.quote(payload)+");");}
 private static String read(InputStream in,int limit)throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] block=new byte[4096];int count;while((count=in.read(block))!=-1){if(out.size()+count>limit)throw new IllegalArgumentException("Response too large");out.write(block,0,count);}return out.toString("UTF-8");}
 void destroy(){destroyed=true;executor.shutdownNow();}
}
