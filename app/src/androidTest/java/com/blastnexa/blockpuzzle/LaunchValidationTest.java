package com.blastnexa.blockpuzzle;

import android.content.Intent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.Until;
import org.junit.*;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;
import org.json.JSONObject;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.io.File;
import static org.junit.Assert.*;

/** Tests the bundled game in Android WebView with actual Activity lifecycle and HTTPS bridge.
 * Game-wide proof replay adapts rendering/audio/storage IO; other tests retain the real UI.
 * No live ad is requested or clicked by instrumentation.
 */
@RunWith(AndroidJUnit4.class) @FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class LaunchValidationTest {
 private ActivityScenario<OdysseyActivity> scenario;
 private WebView web;
 private static boolean bootstrapFailed;
 private final UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
 @Before public void launch() throws Exception {
  Assume.assumeFalse("A previous startup failed; see startup diagnostics",bootstrapFailed);
  Intent intent=new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(),OdysseyActivity.class);intent.putExtra("bn_qa_no_ads",true);
  scenario=ActivityScenario.launch(intent);bind();
  try{waitFor("typeof playerTotals==='function' && !!document.getElementById('openLifeSlot')",45000);}catch(AssertionError error){bootstrapFailed=true;try{writeEvidence("startup.txt",js("JSON.stringify({url:location.href,state:document.readyState,agent:navigator.userAgent,text:document.body?document.body.innerText.slice(0,1000):'',scripts:document.scripts.length})"));capture("startup_failure");}catch(Exception ignored){}throw error;}
  js("window.__qaErrors=[];window.addEventListener('error',e=>window.__qaErrors.push(e.message));localStorage.setItem('blastnexa_help_seen','true');muted=true;displayMenu();true");
 }
 private void bind(){scenario.onActivity(activity->{try{java.lang.reflect.Field field=OdysseyActivity.class.getDeclaredField("game");field.setAccessible(true);web=(WebView)field.get(activity);}catch(Exception e){throw new RuntimeException(e);}});}
 @After public void close(){if(scenario!=null)scenario.close();}
 private String js(String code)throws Exception{
  AtomicReference<String> value=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.evaluateJavascript(code,r->{value.set(r);done.countDown();}));
  assertTrue("WebView JavaScript response timed out",done.await(45,TimeUnit.SECONDS));return value.get();
 }
 private void truth(String expression)throws Exception{assertEquals("Assertion failed: "+expression,"true",js("Boolean("+expression+")"));}
 private void waitFor(String expression,long timeout)throws Exception{
  long until=System.currentTimeMillis()+timeout;while(System.currentTimeMillis()<until){if("true".equals(js("Boolean("+expression+")")))return;Thread.sleep(150);}fail("Timed out waiting for "+expression);
 }
 @Test public void a_menuProfileAnd400Crosswords()throws Exception{
  js("document.getElementById('openPlayerProfile').click();document.getElementById('playerNickname').value='Cometa Android';[...document.querySelectorAll('#universeBody button')].find(b=>b.textContent==='SALVA NOME').click();true");truth("playerProfile.name==='Cometa Android'");
  for(int start=0;start<400;start+=20){int end=Math.min(400,start+20);assertEquals("Crossword bounds", "true",js("(()=>{for(let id="+start+";id<"+end+";id++){startWord(id);const cells=[...document.getElementById('wordBoard').children],n=WORD_CATALOG[id].size;for(let i=0;i<cells.length;i++){const a=cells[i].getBoundingClientRect(),gap=i%n<n-1?cells[i+1].getBoundingClientRect().left-a.right:0;if(Math.abs(a.width-a.height)>.2||Math.abs(gap)>.2)return{word:id,cell:i,width:a.width,height:a.height,gap};}}return true;})()"));}
  truth("document.documentElement.scrollWidth<=innerWidth");truth("window.__qaErrors.length===0");
 }
 @Test public void b_threeSlotWorldsAndFiftySpinPersistence()throws Exception{
  js("openUniverse('slot');setArcadeMachine('temple');slotRandomInt=max=>0;playerSettings.effects='full';document.getElementById('slotSpinButton').click();window.__qaCommitted=lifeData.slot.total;true");
  waitFor("!slotBusy",15000);truth("lifeData.slot.total===window.__qaCommitted");
  js("window.__BN_TEST_FAST__=true;playerSettings.effects='lite';true");
  for(String world:new String[]{"crystal","temple","forge"}){
   js("if(lifeData.slot.arcade.revealed&&!lifeData.slot.arcade.revealed.presented)dismissTempleScene();setArcadeMachine('"+world+"');slotRandomInt=max=>0;spinLifeSlot();true");waitFor("!slotBusy",10000);truth("document.querySelectorAll('.bn-temple-cell').length===15");
  }
  js("setArcadeMachine('crystal');window.__qaStartSpins=lifeData.slot.total;true");
  for(int i=0;i<50;i++){js("if(lifeData.slot.sinceAd>=SLOT_AD_INTERVAL){openSlotBreak();document.getElementById('dialogPrimary').click();}true");waitFor("!bnPendingAd",15000);js("spinLifeSlot();true");waitFor("!slotBusy&&!bnPendingAd",15000);if(i%10==9)android.util.Log.i("BlastNexa-QA","Slot spins completed: "+(i+1));}
  truth("lifeData.slot.total===window.__qaStartSpins+50");String expectedBalance=js("lifeData.balance"),expectedSpins=js("lifeData.slot.total");
  js("saveLives();true");scenario.recreate();bind();waitFor("typeof lifeData!=='undefined'",30000);
  assertEquals(expectedBalance,js("lifeData.balance"));assertEquals(expectedSpins,js("lifeData.slot.total"));
  truth("window.__qaErrors===undefined || window.__qaErrors.length===0");
 }
 @Test public void c_allAdventureLevelsAcrossFourScenes()throws Exception{
  // Exact placement/scoring/mission/result code. Expensive presentation/IO is adapted only in this test.
  js("window.__BN_TEST_FAST__=true;for(const n of ['render','showPlacementFx','showBlastFx','showUniverseImpact','showAdrenalineMoveFX','showVictoryFinish','sPlace','sClear','haptic','adUnlockAudio','syncFlair','refreshUniverseMenu','refreshLivesUI','refreshWordMenu','saveUniverse','storeSession','refreshPlayerUI','saveRanking']){try{eval(n+'=()=>{}')}catch{}}storage.set=()=>{};unlocked=2000;lifeData.balance=999999;playerSettings.effects='lite';true");
  for(String scene:new String[]{"war","ocean","alien","explosive"})for(int start=1;start<=2000;start+=100){int end=start+100;
   truth("(()=>{setScene('"+scene+"');for(let n="+start+";n<"+end+";n++){if(start('adventure',n)!==true)return false;for(const p of LEVELS[n-1].proof){if(roundOutcome)break;if(!placePiece(p.slot,p.x,p.y))return false;}if(roundOutcome!=='win'||!roundFinalized||playing||!missionMet()||!hasMove())return false;}return true;})()");
   if(start%500==401)android.util.Log.i("BlastNexa-QA","Adventure "+scene+" completed: "+(end-1));
  }
 }
 @Test public void d_pauseResumeBackAndNavigation()throws Exception{
  js("openUniverse('slot');slotRandomInt=max=>0;spinLifeSlot();true");String spins=js("lifeData.slot.total"),balance=js("lifeData.balance");
  device.pressHome();
  // Resume through Android's launcher/task manager, as a player does. Moving only
  // ActivityScenario's lifecycle cannot foreground a task after the Home key.
  String component=InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageName()+"/com.blastnexa.blockpuzzle.OdysseyActivity";
  device.executeShellCommand("am start -W -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -f 0x10200000 -n "+component);
  scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);waitFor("!slotBusy",15000);
  assertEquals(spins,js("lifeData.slot.total"));assertEquals(balance,js("lifeData.balance"));
  js("displayMenu();true");writeEvidence("meminfo_before_navigation.txt",device.executeShellCommand("dumpsys meminfo com.blastnexa.blockpuzzle.preview"));device.executeShellCommand("dumpsys gfxinfo com.blastnexa.blockpuzzle.preview reset");
  for(int i=0;i<50;i++)truth("(()=>{displayMenu();openPlayer('profile');openUniverse('slot');startWord("+(i%400)+");displayMenu();return document.documentElement.scrollWidth<=innerWidth;})()");
  device.waitForIdle(1000);writeEvidence("meminfo_after_navigation.txt",device.executeShellCommand("dumpsys meminfo com.blastnexa.blockpuzzle.preview"));writeEvidence("gfxinfo_navigation.txt",device.executeShellCommand("dumpsys gfxinfo com.blastnexa.blockpuzzle.preview"));
  js("openPlayer('profile');true");device.pressBack();waitFor("document.getElementById('menu').style.display!=='none'",5000);
  truth("window.__qaErrors.length===0");
 }
 private void writeEvidence(String name,String content)throws Exception{File folder=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"metrics");assertTrue(folder.isDirectory()||folder.mkdirs());java.nio.file.Files.write(new File(folder,name).toPath(),content.getBytes(java.nio.charset.StandardCharsets.UTF_8));}
 @Test public void e_nativeOnlineProfileVerificationAndDelete()throws Exception{
  js("playerProfile.name='Verifica Android QA';playerNetwork.token=null;playerNetwork.joined=false;playerNetwork.pending=[];joinPlayerRanking();true");waitFor("!playerBusy",30000);truth("playerNetwork.joined && !!playerNetwork.token");
  try{
   js("window.__BN_TEST_FAST__=true;unlocked=2000;lifeData.balance=99999;setScene('war');start('adventure',1);for(const p of LEVELS[0].proof){if(roundOutcome)break;placePiece(p.slot,p.x,p.y);}openPlayer('ranking');true");waitFor("!playerBusy",30000);truth("playerRanking.me.points>=125 && playerNetwork.pending.length===0");
  }finally{js("deletePlayerRanking();true");waitFor("!playerBusy",20000);truth("!playerNetwork.joined && !playerNetwork.token");}
 }
 @Test public void z_rendererRecoveryReopensSavedGame()throws Exception{
  js("playerProfile.name='Recupero Android';savePlayer();true");
  android.util.Log.i("BlastNexa-QA","EXPECTED_RENDERER_TERMINATION");
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{assertNotNull(web.getWebViewRenderProcess());assertTrue(web.getWebViewRenderProcess().terminate());});
  assertTrue("Native recovery dialog missing",device.wait(Until.hasObject(By.text("RIAPRI")),15000));device.findObject(By.text("RIAPRI")).click();
  device.wait(Until.gone(By.text("RIAPRI")),10000);InstrumentationRegistry.getInstrumentation().waitForIdleSync();bind();waitFor("typeof playerProfile!=='undefined'",30000);truth("playerProfile.name==='Recupero Android'");
 }
 private void capture(String name)throws Exception{
  js("window.__qaPaint=false;requestAnimationFrame(()=>requestAnimationFrame(()=>window.__qaPaint=true));true");waitFor("window.__qaPaint",5000);device.waitForIdle(1000);
  File folder=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"store");assertTrue(folder.isDirectory()||folder.mkdirs());assertTrue(device.takeScreenshot(new File(folder,name+".png")));
 }
 @Test public void f_storeScreenshots()throws Exception{
  js("window.__qaReloading=true;localStorage.clear();localStorage.setItem('blastnexa_muted','true');localStorage.setItem('blastnexa_help_seen','true');location.reload();true");waitFor("typeof window.__qaReloading==='undefined' && typeof playerTotals==='function'",30000);
  js("displayMenu();true");capture("01_menu");js("start('adventure',1);true");capture("02_avventura");
  js("startWord(0);true");capture("03_cruciverba");js("openUniverse('slot');setArcadeMachine('temple');true");capture("04_slot_temple");
  js("setArcadeMachine('crystal');true");capture("05_slot_crystal");js("setArcadeMachine('forge');true");capture("06_slot_forge");
  js("displayMenu();true");capture("07_menu_finale");
 }
}
