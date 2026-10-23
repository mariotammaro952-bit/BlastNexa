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
 private WebView readyWeb;
 private static boolean bootstrapFailed;
 private final UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
 @Before public void launch() throws Exception {
  Assume.assumeFalse("A previous startup failed; see startup diagnostics",bootstrapFailed);
  // Continuously animated reels must not make accessibility wait ten seconds
  // for an idle screen before each physical touch.
  androidx.test.uiautomator.Configurator.getInstance().setWaitForIdleTimeout(250);
  Intent intent=new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(),OdysseyActivity.class);intent.putExtra("bn_qa_no_ads",true);
  scenario=ActivityScenario.launch(intent);bind();
  try{waitFor("typeof playerTotals==='function' && !!document.getElementById('openLifeSlot')",45000);}catch(AssertionError error){bootstrapFailed=true;try{writeEvidence("startup.txt",js("JSON.stringify({url:location.href,state:document.readyState,agent:navigator.userAgent,text:document.body?document.body.innerText.slice(0,1000):'',scripts:document.scripts.length})"));capture("startup_failure");}catch(Exception ignored){}throw error;}
  // Android shows its own one-time full-screen education above the WebView.
  // Acknowledge the actual system UI before lifecycle/back/touch assertions.
  androidx.test.uiautomator.UiObject2 education=device.wait(Until.findObject(By.text("Got it")),3000);
  if(education!=null){education.click();assertTrue(device.wait(Until.gone(By.text("Got it")),5000));}
  js("window.__qaErrors=[];window.__qaRealClicks=0;window.__qaWatchSpin=false;window.__qaFilled=()=>document.querySelectorAll('#slotReels>.bn-temple-reel').length===5&&[...document.querySelectorAll('#slotReels>.bn-temple-reel')].every(reel=>{const r=reel.getBoundingClientRect();return [0,1,2].every(row=>document.elementFromPoint(r.left+r.width/2,r.top+r.height*(row+.5)/3)?.closest('.bn-temple-cell'));});document.addEventListener('click',e=>{window.__qaRealClicks++;const b=e.target.closest?.('button');window.__qaLastTouch={label:b?.getAttribute('aria-label')||b?.textContent,phase:typeof slotPhase!=='undefined'?slotPhase:null};if(b?.id==='slotAutoStop')window.__qaStopTotal=lifeData.slot.total;if(window.__qaWatchSpin&&b?.id==='slotSpinButton'&&b.getAttribute('aria-label')==='GIRA'){setTimeout(()=>window.__qaSpinStart={phase:slotPhase,disabled:document.getElementById('slotSpinButton').disabled,scroll:document.getElementById('app').scrollTop,total:lifeData.slot.total},0);setTimeout(()=>window.__qaSpinMid={phase:slotPhase,filled:window.__qaFilled()},400);setTimeout(()=>window.__qaSpinLate={phase:slotPhase,filled:window.__qaFilled()},1700);}},true);window.addEventListener('error',e=>window.__qaErrors.push(e.message));localStorage.setItem('blastnexa_help_seen','true');muted=true;displayMenu();true");
 }
 private void withActivity(ActivityScenario.ActivityAction<OdysseyActivity> action){Runnable observe=()->scenario.onActivity(action);if(android.os.Looper.myLooper()==android.os.Looper.getMainLooper())observe.run();else InstrumentationRegistry.getInstrumentation().runOnMainSync(observe);}
 private void bind(){withActivity(activity->{try{java.lang.reflect.Field field=OdysseyActivity.class.getDeclaredField("game");field.setAccessible(true);web=(WebView)field.get(activity);}catch(Exception e){throw new RuntimeException(e);}});}
 private void recreateActivity()throws Exception{
  WebView previous=web;withActivity(activity->activity.recreate());readyWeb=null;
  long until=android.os.SystemClock.uptimeMillis()+30000;java.util.concurrent.atomic.AtomicBoolean changed=new java.util.concurrent.atomic.AtomicBoolean();
  while(android.os.SystemClock.uptimeMillis()<until){
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{scenario.onActivity(activity->{try{java.lang.reflect.Field field=OdysseyActivity.class.getDeclaredField("game");field.setAccessible(true);changed.set(field.get(activity)!=null&&field.get(activity)!=previous);}catch(Exception error){throw new RuntimeException(error);}});}catch(IllegalStateException|NullPointerException transition){}});
   if(changed.get()){awaitCurrentPage();return;}Thread.sleep(100);
  }
  fail("Native Activity was not recreated");
 }
 private void awaitForeground()throws Exception{
  long until=android.os.SystemClock.uptimeMillis()+15000;java.util.concurrent.atomic.AtomicBoolean focused=new java.util.concurrent.atomic.AtomicBoolean();
  while(android.os.SystemClock.uptimeMillis()<until){withActivity(activity->focused.set(activity.hasWindowFocus()));if(focused.get())return;Thread.sleep(100);}
  fail("Original game task did not return to the foreground");
 }
 @After public void close(){if(scenario!=null){try{withActivity(activity->activity.finish());}finally{scenario.close();}}}
 private void awaitCurrentPage()throws Exception{
  // Landscape launch may recreate the Activity after ActivityScenario first
  // reaches RESUMED. Never evaluate against the destroyed WebView retained by
  // that first instance. Observe the current native page before dispatching JS.
  long until=android.os.SystemClock.uptimeMillis()+45000,stableAt=0;WebView candidate=null;
  AtomicReference<WebView> current=new AtomicReference<>();java.util.concurrent.atomic.AtomicBoolean loaded=new java.util.concurrent.atomic.AtomicBoolean();
  while(android.os.SystemClock.uptimeMillis()<until){
   // ActivityScenario waits for global UI idle when called from the test
   // thread. Inspect the current page on the main thread instead: an animated
   // game need not become globally idle for an observation to be valid.
   loaded.set(false);InstrumentationRegistry.getInstrumentation().runOnMainSync(()->withActivity(activity->{try{
    java.lang.reflect.Field view=OdysseyActivity.class.getDeclaredField("game"),ready=OdysseyActivity.class.getDeclaredField("pageReady");view.setAccessible(true);ready.setAccessible(true);WebView target=(WebView)view.get(activity);current.set(target);
    loaded.set(target!=null&&ready.getBoolean(activity)&&target.getProgress()==100&&target.getWidth()>target.getHeight());
   }catch(Exception error){throw new RuntimeException(error);}}));
   WebView target=current.get();long now=android.os.SystemClock.uptimeMillis();
   if(loaded.get()){
    if(target==readyWeb){web=target;return;}
    if(target!=candidate){candidate=target;stableAt=now;}
    else if(now-stableAt>=350){web=target;readyWeb=target;return;}
   }else{candidate=null;stableAt=0;}
   Thread.sleep(100);
  }
  fail("Current landscape WebView did not finish loading");
 }
 private String js(String code)throws Exception{
  awaitCurrentPage();
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
  js("lifeData.slot.wallet.balance=500000;true");
  js("openUniverse('slot');setArcadeMachine('temple');slotRandomInt=max=>0;playerSettings.effects='full';document.getElementById('slotSpinButton').click();window.__qaCommitted=lifeData.slot.total;true");
  waitFor("!slotBusy",15000);truth("lifeData.slot.total===window.__qaCommitted");
  js("window.__BN_TEST_FAST__=true;playerSettings.effects='lite';true");
  for(String world:new String[]{"crystal","temple","forge"}){
   js("if(lifeData.slot.arcade.revealed&&!lifeData.slot.arcade.revealed.presented)dismissTempleScene();setArcadeMachine('"+world+"');slotRandomInt=max=>0;spinLifeSlot();true");waitFor("!slotBusy",10000);truth("document.querySelectorAll('.bn-temple-cell').length===15");
  }
  js("setArcadeMachine('crystal');window.__qaStartSpins=lifeData.slot.total;true");
  // Run the same fifty persisted transactions inside the real WebView. This
  // avoids making hundreds of cross-process observations between lite spins.
  js("window.__qaBatchLeft=50;window.__qaBatchDone=false;(function step(){if(slotBusy||bnPendingAd){setTimeout(step,30);return;}if(!window.__qaBatchLeft){window.__qaBatchDone=true;return;}if(lifeData.slot.sinceAd>=SLOT_AD_INTERVAL){if(!document.getElementById('overlay').classList.contains('on'))openSlotBreak();document.getElementById('dialogPrimary').click();setTimeout(step,30);return;}if(spinLifeSlot())window.__qaBatchLeft--;setTimeout(step,30);})();true");
  waitFor("window.__qaBatchDone",30000);
  truth("lifeData.slot.total===window.__qaStartSpins+50");String expectedBalance=js("lifeData.balance"),expectedSpins=js("lifeData.slot.total");
  js("saveLives();true");recreateActivity();waitFor("typeof lifeData!=='undefined'",30000);
  assertEquals(expectedBalance,js("lifeData.balance"));assertEquals(expectedSpins,js("lifeData.slot.total"));
  truth("window.__qaErrors===undefined || window.__qaErrors.length===0");
 }
 @Test public void c_allAdventureLevelsAcrossFourScenes()throws Exception{
  // Exact placement/scoring/mission/result code. Expensive presentation/IO is adapted only in this test.
  js("document.body.style.display='none';window.__BN_TEST_FAST__=true;for(const n of ['render','showPlacementFx','showBlastFx','showUniverseImpact','showAdrenalineMoveFX','showVictoryFinish','sPlace','sClear','haptic','adUnlockAudio','syncFlair','refreshUniverseMenu','refreshLivesUI','refreshWordMenu','saveUniverse','storeSession','refreshPlayerUI','saveRanking']){try{eval(n+'=()=>{}')}catch{}}storage.set=()=>{};unlocked=2000;lifeData.balance=999999;playerSettings.effects='lite';true");
  for(String scene:new String[]{"war","ocean","alien","explosive"})for(int start=1;start<=2000;start+=100){int end=start+100;
   truth("(()=>{setScene('"+scene+"');for(let n="+start+";n<"+end+";n++){if(start('adventure',n)!==true)return false;for(const p of LEVELS[n-1].proof){if(roundOutcome)break;if(!placePiece(p.slot,p.x,p.y))return false;}if(roundOutcome!=='win'||!roundFinalized||playing||!missionMet()||!hasMove())return false;}return true;})()");
   if(start%500==401)android.util.Log.i("BlastNexa-QA","Adventure "+scene+" completed: "+(end-1));
  }
 }
 @Test public void d_pauseResumeBackAndNavigation()throws Exception{
  js("openUniverse('slot');slotRandomInt=max=>0;spinLifeSlot();true");String spins=js("lifeData.slot.total"),balance=js("lifeData.balance");
  AtomicReference<OdysseyActivity> sameActivity=new AtomicReference<>();java.util.concurrent.atomic.AtomicInteger taskId=new java.util.concurrent.atomic.AtomicInteger();withActivity(activity->{taskId.set(activity.getTaskId());sameActivity.set(activity);});
  device.pressHome();
  // Re-select the existing task, as in Android Recents. A launcher Intent has
  // different action/categories from ActivityScenario's explicit test Intent
  // and may create another Activity that the scenario intentionally ignores.
  String resumed=device.executeShellCommand("am task focus "+taskId.get());
  assertFalse("Cannot restore the original task: "+resumed,resumed.contains("Error"));
  awaitForeground();waitFor("!slotBusy",15000);
  withActivity(activity->assertSame("Window changes must retain the game Activity",sameActivity.get(),activity));
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
 @Test public void g_landscapePuzzleSlotAndBanner()throws Exception{
  truth("innerWidth>innerHeight");
  js("displayMenu();window.BlastNexaBannerReady();true");
  truth("window.BlastNexaBannerLayout().visible");
  truth("document.getElementById('gameBannerFrame').getBoundingClientRect().height===50");
  js("lifeData.balance=Math.max(10,lifeData.balance);start('adventure',1);true");
  truth("!!document.querySelector('#game .bn-wide-left #boardShell')");
  truth("!!document.querySelector('#game .bn-wide-right #tray')");
  truth("getComputedStyle(document.querySelector('#tray .mini-tile')).backgroundImage!=='none'");
  truth("getComputedStyle(document.querySelector('#board .cell.tile')).backgroundImage!=='none'");
  truth("document.getElementById('boardShell').getBoundingClientRect().right<=document.getElementById('tray').getBoundingClientRect().left+16");
  truth("document.getElementById('boardShell').getBoundingClientRect().bottom<=document.getElementById('gameBannerFrame').getBoundingClientRect().top+2");
  truth("window.BlastNexaBannerLayout().visible");
  js("openUniverse('slot');setArcadeMachine('temple');true");
  truth("document.querySelectorAll('#slotReels .bn-temple-reel').length===5");
  truth("document.querySelectorAll('#slotReels .bn-temple-cell').length===15");
  truth("document.getElementById('slotSpinButton').getBoundingClientRect().right<=innerWidth");
  truth("window.BlastNexaBannerLayout().visible");
  js("startWord(0);true");
  truth("document.getElementById('wordBoard').getBoundingClientRect().right<=document.getElementById('wordControls').getBoundingClientRect().left+16");
  truth("window.BlastNexaBannerLayout().visible");
  truth("window.__qaErrors.length===0");
  js("openUniverse('slot');setArcadeMachine('temple');lifeData.slot.arcade.treasure=29;playerSettings.effects='lite';slotRandomInt=max=>max===100?31:0;spinLifeSlot();true");
  waitFor("!slotBusy",15000);
  truth("!!lifeData.slot.arcade.bonus && document.querySelectorAll('.bn-world-chest').length===3");
  assertPinnedSlot();
  capture("08_bonus_temple");
  js("document.getElementById('slotChest1').click();document.getElementById('slotSpinButton').click();true");
  truth("!lifeData.slot.arcade.bonus && !!document.getElementById('slotReels')");
 }
 @Test public void z_rendererRecoveryReopensSavedGame()throws Exception{
  js("playerProfile.name='Recupero Android';savePlayer();true");
  android.util.Log.i("BlastNexa-QA","EXPECTED_RENDERER_TERMINATION");
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{assertNotNull(web.getWebViewRenderProcess());assertTrue(web.getWebViewRenderProcess().terminate());});
  assertTrue("Native recovery dialog missing",device.wait(Until.hasObject(By.text("RIAPRI")),15000));device.findObject(By.text("RIAPRI")).click();
  device.wait(Until.gone(By.text("RIAPRI")),10000);bind();waitFor("typeof playerProfile!=='undefined'",30000);truth("playerProfile.name==='Recupero Android'");
 }
 private void capture(String name)throws Exception{
  js("window.__qaPaint=false;requestAnimationFrame(()=>requestAnimationFrame(()=>window.__qaPaint=true));true");waitFor("window.__qaPaint",5000);device.waitForIdle(1000);
  File folder=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"store");assertTrue(folder.isDirectory()||folder.mkdirs());assertTrue(device.takeScreenshot(new File(folder,name+".png")));
 }
 // These helpers inject actual Android touch events. JS is used only to set a
 // reproducible fixture and observe the production state, never to click.
 private android.graphics.Rect touchBounds(String label)throws Exception{
  long until=android.os.SystemClock.uptimeMillis()+7000;
  while(android.os.SystemClock.uptimeMillis()<until){
   androidx.test.uiautomator.UiObject2 node=device.findObject(By.text(label));if(node==null)node=device.findObject(By.desc(label));
   if(node!=null)try{android.graphics.Rect bounds=node.getVisibleBounds();if(bounds.width()>0&&bounds.height()>0)return bounds;}catch(androidx.test.uiautomator.StaleObjectException changed){}
   Thread.sleep(100);
  }
  writeEvidence("touch-failure.txt","Accessible touch target missing: "+label);device.dumpWindowHierarchy(new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"metrics/missing-touch.xml"));throw new AssertionError("Accessible touch target missing: "+label);
 }
 private void rawTouch(int x,int y)throws Exception{
  long down=android.os.SystemClock.uptimeMillis();
  android.view.MotionEvent press=android.view.MotionEvent.obtain(down,down,android.view.MotionEvent.ACTION_DOWN,x,y,0);
  press.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(press,false));press.recycle();
  Thread.sleep(20);
  android.view.MotionEvent release=android.view.MotionEvent.obtain(down,android.os.SystemClock.uptimeMillis(),android.view.MotionEvent.ACTION_UP,x,y,0);
  release.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(release,false));release.recycle();
 }
 private void touch(String label)throws Exception{android.graphics.Rect b=touchBounds(label);rawTouch(b.centerX(),b.centerY());Thread.sleep(100);}
 private void touchText(String label)throws Exception{androidx.test.uiautomator.UiObject2 node=device.wait(Until.findObject(By.text(label)),7000);assertNotNull("Visible text target missing: "+label,node);android.graphics.Rect b=node.getVisibleBounds();rawTouch(b.centerX(),b.centerY());Thread.sleep(100);}
 private void touchId(String id)throws Exception{androidx.test.uiautomator.UiObject2 node=device.wait(Until.findObject(By.res(id)),7000);assertNotNull("Visible ID target missing: "+id,node);android.graphics.Rect b=node.getVisibleBounds();rawTouch(b.centerX(),b.centerY());Thread.sleep(100);}
 private void slotFixture(String machine,String effects)throws Exception{
  js("cancelSlotAnimation();openUniverse('slot');lifeData.slot.sinceAd=0;lifeData.slot.wallet.balance=50000;lifeData.slot.wallet.anchor=Date.now();Object.assign(lifeData.slot.arcade,{bonus:null,revealed:null,freeSpins:0,crystalJourney:null,reactor:0,treasure:0});setArcadeMachine('"+machine+"');slotRandomInt=max=>0;playerSettings.effects='"+effects+"';window.__BN_TEST_FAST__=false;renderLifeSlot(document.getElementById('universeBody'));true");
 }
 private void assertPinnedSlot()throws Exception{
  truth("document.getElementById('app').scrollTop===0 && document.scrollingElement.scrollTop===0");
  truth("document.getElementById('universeScreen').getBoundingClientRect().top>=0");
  truth("(()=>{let s=document.querySelector('.bn-slot-sidebar'),b=s.getBoundingClientRect();return s.scrollTop>0||Array.from(s.querySelectorAll('#slotAuto5,#slotAuto10')).every(e=>e.getBoundingClientRect().bottom<=b.bottom);})()");
  truth("(()=>{let d=document.getElementById('gameBanner').getBoundingClientRect(),s=document.getElementById('slotBannerSeat').getBoundingClientRect();return d.bottom<=innerHeight+1&&Math.abs(d.top-s.top)<1&&Math.abs(d.bottom-s.bottom)<1;})()");
  truth("(()=>{let b=document.getElementById('slotSpinButton').getBoundingClientRect(),a=document.getElementById('gameBannerFrame').getBoundingClientRect();return b.width>=48&&b.height>=48&&b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight&&b.left-a.right>=8;})()");
 }
 private void assertFilledReels()throws Exception{
  truth("(()=>{for(const reel of document.querySelectorAll('#slotReels>.bn-temple-reel')){let r=reel.getBoundingClientRect();for(let row=0;row<3;row++){let hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height*(row+.5)/3);if(!hit?.closest('.bn-temple-cell'))return false;}}return document.querySelectorAll('#slotReels>.bn-temple-reel').length===5;})()");
 }
 @Test public void h_realTouchesRapidTapsAndFullAnimation()throws Exception{
  for(String machine:new String[]{"temple","crystal","forge"}){
   slotFixture(machine,"full");assertPinnedSlot();truth("!reducedFX() && slotSpinDuration()===2600");
   // Only the collect window is extended for the accessibility controller;
   // reel timing, payouts and input handling remain the production behavior.
   js("slotCelebrationDuration=()=>6000;window.__qaWatchSpin=true;window.__qaSpinStart=null;window.__qaSpinMid=null;window.__qaSpinLate=null;window.__touchTotal=lifeData.slot.total;window.__touchBalance=lifeData.balance;window.__touchY=document.getElementById('slotSpinButton').getBoundingClientRect().top;true");
   android.graphics.Rect bounds=touchBounds("GIRA");
   // Repeated presses at the same physical point must commit exactly one spin.
   long burst=android.os.SystemClock.uptimeMillis();for(int i=0;i<8;i++)rawTouch(bounds.centerX(),bounds.centerY());
   long elapsed=android.os.SystemClock.uptimeMillis()-burst;
   assertTrue("Touch burst exceeded the reel animation: "+elapsed+"ms",elapsed<2400);
   // GIRA and INCASSA occupy the same pinned target. Reuse its observed UI
   // bounds instead of querying a transient, freshly replaced WebView node.
   waitFor("slotPhase==='celebrating'",15000);rawTouch(bounds.centerX(),bounds.centerY());Thread.sleep(100);waitFor("!slotBusy",5000);
   truth("window.__qaLastTouch.label==='Incassa la vincita' && window.__qaLastTouch.phase==='celebrating'");
   truth("lifeData.slot.total===window.__touchTotal+1 && lifeData.balance===window.__touchBalance+5");
   writeEvidence("touch-observed-"+machine+".json",js("JSON.stringify({start:window.__qaSpinStart,mid:window.__qaSpinMid,late:window.__qaSpinLate,last:window.__qaLastTouch,total:lifeData.slot.total,previous:window.__touchTotal,burstMs:"+elapsed+"})"));
   truth("window.__qaSpinStart.phase==='spinning' && window.__qaSpinStart.disabled && window.__qaSpinStart.scroll===0 && window.__qaSpinStart.total===window.__touchTotal+1");
   truth("window.__qaSpinMid.phase==='spinning' && window.__qaSpinMid.filled && window.__qaSpinLate.phase==='spinning' && window.__qaSpinLate.filled");assertPinnedSlot();assertFilledReels();
   writeEvidence("touch-burst-"+machine+".json",js("JSON.stringify({machine:lifeData.slot.arcade.machine,previous:window.__touchTotal,total:lifeData.slot.total,start:window.__qaSpinStart,mid:window.__qaSpinMid,late:window.__qaSpinLate,burstMs:"+elapsed+"})"));js("window.__qaWatchSpin=false;true");
   truth("Math.abs(document.getElementById('slotSpinButton').getBoundingClientRect().top-window.__touchY)<1");
   // A touch away from the centre also works inside the round control.
   bounds=touchBounds("GIRA");rawTouch(bounds.left+bounds.width()/3,bounds.top+bounds.height()*2/3);
   waitFor("lifeData.slot.total===window.__touchTotal+2",5000);waitFor("!slotBusy",12000);assertPinnedSlot();
  }
  capture("09_slot_after_real_touches");truth("window.__qaErrors.length===0");
 }
 @Test public void i_realTouchesChestCrystalAndForge()throws Exception{
  slotFixture("temple","lite");js("lifeData.slot.arcade.treasure=29;slotRandomInt=max=>max===100?31:0;true");touch("GIRA");waitFor("!!lifeData.slot.arcade.bonus&&!slotBusy",5000);
  js("window.__touchBalance=lifeData.balance;window.__touchTotal=lifeData.slot.total;window.__chestPrize=lifeData.slot.arcade.bonus.choices[1];true");
  android.graphics.Rect chest=touchBounds("Apri il forziere 2");for(int i=0;i<4;i++)rawTouch(chest.centerX(),chest.centerY());
  waitFor("!lifeData.slot.arcade.bonus",5000);
  truth("lifeData.balance===window.__touchBalance+window.__chestPrize && lifeData.slot.total===window.__touchTotal");
  touch("TORNA AI RULLI");truth("!!document.getElementById('slotReels') && !lifeData.slot.arcade.bonus");assertPinnedSlot();
  slotFixture("crystal","lite");js("slotRandomInt=max=>max===100?98:0;true");touch("GIRA");waitFor("lifeData.slot.arcade.freeSpins===3&&!slotBusy",5000);
  js("slotRandomInt=max=>0;window.__touchTotal=lifeData.slot.total;true");
  for(int i=0;i<3;i++){touch("GIRA NELLA CAVERNA");waitFor("lifeData.slot.total===window.__touchTotal+"+(i+1)+" && !slotBusy",5000);}
  truth("lifeData.slot.total===window.__touchTotal+3 && lifeData.slot.arcade.crystalJourney.played===3");touch("TORNA AI RULLI");assertPinnedSlot();
  slotFixture("forge","lite");touch("GIRA");waitFor("!slotBusy",5000);js("lifeData.slot.arcade.reactor=6;renderLifeSlot(document.getElementById('universeBody'));window.__touchTotal=lifeData.slot.total;true");
  touch("Tieni il rullo 1");touch("Tieni il rullo 4");truth("slotHolds.size===2");assertPinnedSlot();capture("12_forge_ready_touch_targets");touch("Rilancia i rulli");waitFor("!slotBusy",5000);
  truth("lifeData.slot.total===window.__touchTotal+1 && lifeData.slot.last.arcade.held.join(',')==='0,3' && lifeData.slot.arcade.reactor===0");assertPinnedSlot();capture("10_forge_after_touch_respin");
 }
 @Test public void j_realTouchesAutoStopPauseAndFiftySpinBreak()throws Exception{
  slotFixture("crystal","lite");js("window.__touchTotal=lifeData.slot.total;true");touch("Avvia 5 giri automatici");waitFor("lifeData.slot.total===window.__touchTotal+5 && !slotBusy && slotAutoLeft===0 && slotAutoTimer===null",15000);
  js("playerSettings.effects='full';window.__qaStopTotal=null;window.__touchTotal=lifeData.slot.total;true");truth("!reducedFX()");
  android.graphics.Rect autoFive=touchBounds("Avvia 5 giri automatici"),autoTen=touchBounds("Avvia 10 giri automatici");
  android.graphics.Rect autoArea=new android.graphics.Rect(autoFive);autoArea.union(autoTen);
  rawTouch(autoTen.centerX(),autoTen.centerY());waitFor("!!document.getElementById('slotAutoStop') && slotAutoLeft>0",15000);
  // Stop fills the same control area previously occupied by Auto 5/10.
  rawTouch(autoArea.centerX(),autoArea.centerY());Thread.sleep(100);waitFor("!slotBusy",12000);Thread.sleep(900);truth("window.__qaStopTotal!==null && lifeData.slot.total===window.__qaStopTotal && slotAutoLeft===0 && slotAutoTimer===null");
  java.util.concurrent.atomic.AtomicInteger task=new java.util.concurrent.atomic.AtomicInteger();withActivity(a->task.set(a.getTaskId()));touch("GIRA");waitFor("slotBusy",5000);String total=js("lifeData.slot.total"),balance=js("lifeData.balance");device.pressHome();device.executeShellCommand("am task focus "+task.get());awaitForeground();waitFor("!slotBusy",10000);assertEquals(total,js("lifeData.slot.total"));assertEquals(balance,js("lifeData.balance"));assertPinnedSlot();
  js("playerSettings.effects='lite';lifeData.slot.sinceAd=49;window.__touchTotal=lifeData.slot.total;renderLifeSlot(document.getElementById('universeBody'));true");touch("GIRA");waitFor("lifeData.slot.sinceAd===50 && !slotBusy",5000);touch("CONTINUA");truth("document.getElementById('overlay').classList.contains('on') && !window.BlastNexaBannerLayout().visible");
  truth("document.getElementById('app').dataset.modal==='on' && document.getElementById('universeScreen').getAttribute('aria-hidden')==='true' && getComputedStyle(document.getElementById('gameBanner')).display==='none'");
  assertTrue("Background spin must be absent from modal accessibility",device.wait(Until.gone(By.res("slotSpinButton")),3000));
  truth("(()=>{let d=document.querySelector('#overlay>.dialog').getBoundingClientRect(),b=document.getElementById('dialogPrimary').getBoundingClientRect(),h=document.getElementById('dialogHome').getBoundingClientRect();return d.top>=0&&d.bottom<=innerHeight&&b.top>=d.top&&b.bottom<=d.bottom&&h.bottom<=d.bottom;})()");capture("13_fifty_spin_dialog");
  // The native SDK is disabled in QA: this tests the real no-ad callback path.
  touchId("dialogPrimary");waitFor("!bnPendingAd && !document.getElementById('overlay').classList.contains('on')",15000);truth("lifeData.slot.sinceAd===0 && lifeData.slot.total===window.__touchTotal+1");touch("GIRA");waitFor("!slotBusy",5000);truth("lifeData.slot.total===window.__touchTotal+2");assertPinnedSlot();
 }
 @Test public void k_fullWidthNativeCanvasAndCutout()throws Exception{
  slotFixture("temple","lite");
  withActivity(activity->{
   try{java.lang.reflect.Field field=OdysseyActivity.class.getDeclaredField("root");field.setAccessible(true);android.widget.FrameLayout root=(android.widget.FrameLayout)field.get(activity);assertEquals(0,root.getPaddingLeft());assertEquals(0,root.getPaddingRight());assertEquals(device.getDisplayWidth(),web.getWidth());int[] position=new int[2];web.getLocationOnScreen(position);assertEquals(0,position[0]);assertEquals(0,position[1]);
    if("true".equals(InstrumentationRegistry.getArguments().getString("bn_qa_cutout"))){assertNotNull(root.getRootWindowInsets().getDisplayCutout());assertTrue(root.getRootWindowInsets().getDisplayCutout().getSafeInsetLeft()>0||root.getRootWindowInsets().getDisplayCutout().getSafeInsetRight()>0);}
   }catch(Exception error){throw new RuntimeException(error);}
  });
  truth("(()=>{let b=document.getElementById('app').getBoundingClientRect();return b.left===0&&b.top===0&&b.width===innerWidth&&b.height===innerHeight;})()");
  js("window.__touchTotal=lifeData.slot.total;true");truth("reducedFX() && slotSpinDuration()===0");
  android.graphics.Rect bounds=touchBounds("GIRA");assertTrue(device.click(bounds.centerX(),bounds.centerY()));
  waitFor("lifeData.slot.total===window.__touchTotal+1 && !slotBusy",5000);assertPinnedSlot();capture("11_full_width_cutout");
 }
 @Test public void l_virtualCoinsUseRealTouchAndSurviveRecreation()throws Exception{
  slotFixture("crystal","lite");js("lifeData.slot.arcade.lineCount=1;lifeData.slot.wallet.balance=2;lifeData.slot.wallet.spent=0;lifeData.slot.wallet.anchor=Date.now();window.__coinsStart=lifeData.slot.total;renderLifeSlot(document.getElementById('universeBody'));true");
  touch("GIRA");waitFor("!slotBusy",5000);truth("lifeData.slot.wallet.balance===1&&lifeData.slot.wallet.spent===1");
  touch("GIRA");waitFor("!slotBusy",5000);truth("lifeData.slot.wallet.balance===0&&lifeData.slot.wallet.spent===2");
  touch("GIRA");truth("lifeData.slot.total===window.__coinsStart+2&&document.getElementById('overlay').classList.contains('on')&&!window.BlastNexaBannerLayout().visible");
  touchId("dialogPrimary");waitFor("!bnPendingAd",15000);truth("lifeData.slot.wallet.balance===0&&lifeData.slot.wallet.spent===2");
  touchId("dialogSecondary");js("saveLives();true");recreateActivity();truth("lifeData.slot.wallet.balance===0&&lifeData.slot.wallet.spent===2");
  js("openUniverse('slot');lifeData.slot.sinceAd=0;lifeData.slot.wallet.anchor=Date.now();lifeData.slot.arcade.freeSpins=1;slotRandomInt=()=>0;playerSettings.effects='lite';renderLifeSlot(document.getElementById('universeBody'));true");
  touch("GIRA NELLA CAVERNA");waitFor("!slotBusy",5000);truth("lifeData.slot.wallet.balance===0&&lifeData.slot.wallet.spent===2&&lifeData.slot.last.coinCost===0");
  assertPinnedSlot();capture("14_coins_and_embedded_banner");
 }
 @Test public void m_neonAdaptiveLauncherIcon()throws Exception{
  android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
  android.graphics.drawable.Drawable icon=context.getPackageManager().getApplicationIcon(context.getPackageName());
  assertTrue("Launcher must use the new adaptive icon",icon instanceof android.graphics.drawable.AdaptiveIconDrawable);
  android.graphics.Bitmap bitmap=android.graphics.Bitmap.createBitmap(216,216,android.graphics.Bitmap.Config.ARGB_8888);icon.setBounds(0,0,216,216);icon.draw(new android.graphics.Canvas(bitmap));
  int neon=0;for(int y=0;y<216;y++)for(int x=0;x<216;x++){int color=bitmap.getPixel(x,y);if(android.graphics.Color.green(color)>170&&(android.graphics.Color.red(color)>140||android.graphics.Color.blue(color)>140))neon++;}
  assertTrue("Icon should contain vivid lime/cyan block artwork",neon>200);
  File dir=new File(context.getExternalFilesDir(null),"store");assertTrue(dir.exists()||dir.mkdirs());try(java.io.FileOutputStream stream=new java.io.FileOutputStream(new File(dir,"15_launcher_icon.png"))){bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,stream);}
 }
 @Test public void f_storeScreenshots()throws Exception{
  js("localStorage.clear();localStorage.setItem('blastnexa_muted','true');localStorage.setItem('blastnexa_help_seen','true');true");
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.reload());readyWeb=null;waitFor("typeof playerTotals==='function'",30000);
  js("displayMenu();true");capture("01_menu");js("start('adventure',1);true");capture("02_avventura");
  js("startWord(0);true");capture("03_cruciverba");js("openUniverse('slot');setArcadeMachine('temple');true");capture("04_slot_temple");
  js("setArcadeMachine('crystal');true");capture("05_slot_crystal");js("setArcadeMachine('forge');true");capture("06_slot_forge");
  js("displayMenu();true");capture("07_menu_finale");
 } @Test public void n_automaticInviteScheduleSurvivesRecreationAndClockChanges()throws Exception{
  android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
  OdysseyReminders.scheduleAll(context);long now=System.currentTimeMillis();
  for(int slot=0;slot<3;slot++){
   long time=OdysseyReminders.preferences(context).getLong("next_"+slot,0);assertTrue(time>now&&time<now+27*3600000L);
   java.util.Calendar calendar=java.util.Calendar.getInstance();calendar.setTimeInMillis(time);assertEquals(OdysseyReminders.HOURS[slot],calendar.get(java.util.Calendar.HOUR_OF_DAY));assertEquals(OdysseyReminders.MINUTES[slot],calendar.get(java.util.Calendar.MINUTE));
   Intent intent=new Intent(context,OdysseyReminderReceiver.class).setAction(OdysseyReminders.ACTION);
   assertNotNull(android.app.PendingIntent.getBroadcast(context,OdysseyReminders.BASE_ID+slot,intent,android.app.PendingIntent.FLAG_NO_CREATE|android.app.PendingIntent.FLAG_IMMUTABLE));
  }
  java.util.Calendar before=java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("Europe/Rome"));before.clear();before.set(2026,java.util.Calendar.OCTOBER,24,22,0);
  java.util.Calendar after=(java.util.Calendar)before.clone();after.setTimeInMillis(OdysseyReminders.nextTrigger(before,0));assertEquals(25,after.get(java.util.Calendar.DAY_OF_MONTH));assertEquals(9,after.get(java.util.Calendar.HOUR_OF_DAY));assertEquals(0,after.get(java.util.Calendar.MINUTE));
  for(String action:new String[]{Intent.ACTION_BOOT_COMPLETED,Intent.ACTION_MY_PACKAGE_REPLACED,Intent.ACTION_TIME_CHANGED,Intent.ACTION_TIMEZONE_CHANGED})new OdysseyReminderReceiver().onReceive(context,new Intent(action));
  recreateActivity();
  for(int slot=0;slot<3;slot++)assertTrue(OdysseyReminders.preferences(context).getLong("next_"+slot,0)>System.currentTimeMillis());
  js("openUniverse('slot');true");truth("!document.getElementById('slotReminderOpen')&&!document.getElementById('playInvitesToggle')&&!document.getElementById('settingReminders')&&typeof openPlayReminders==='undefined'");
  android.content.pm.ActivityInfo receiver=context.getPackageManager().getReceiverInfo(new android.content.ComponentName(context,OdysseyReminderReceiver.class),0);assertTrue(receiver.enabled);assertFalse(receiver.exported);
  writeEvidence("automatic-invites-schedule.json","{\"automatic\":true,\"localTimes\":[\"09:00\",\"14:00\",\"20:30\"],\"rebootAndClockRecovery\":true,\"toggle\":false}");
 }
 @Test public void o_nativeInviteDeliveryPermissionDeduplicationAndTouch()throws Exception{
  android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
  if(android.os.Build.VERSION.SDK_INT>=33){device.executeShellCommand("pm grant "+context.getPackageName()+" android.permission.POST_NOTIFICATIONS");assertEquals(android.content.pm.PackageManager.PERMISSION_GRANTED,context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS));}
  android.app.NotificationManager manager=context.getSystemService(android.app.NotificationManager.class);assertTrue(manager.areNotificationsEnabled());
  OdysseyReminders.preferences(context).edit().remove("last_0").commit();manager.cancel(OdysseyReminders.BASE_ID);
  java.util.Calendar due=java.util.Calendar.getInstance();due.set(java.util.Calendar.HOUR_OF_DAY,9);due.set(java.util.Calendar.MINUTE,5);due.set(java.util.Calendar.SECOND,0);due.set(java.util.Calendar.MILLISECOND,0);long timestamp=due.getTimeInMillis();String day=OdysseyReminders.dayKey(timestamp);
  assertFalse(OdysseyReminders.deliver(context,-1,day,timestamp));
  assertFalse(OdysseyReminders.deliver(context,0,"2000-01-01",timestamp));
  assertFalse(OdysseyReminders.deliver(context,1,day,timestamp));
  assertTrue(OdysseyReminders.deliver(context,0,day,timestamp));assertFalse(OdysseyReminders.deliver(context,0,day,timestamp));
  android.service.notification.StatusBarNotification shown=null;
  for(int n=0;n<40&&shown==null;n++){for(android.service.notification.StatusBarNotification item:manager.getActiveNotifications())if(item.getId()==OdysseyReminders.BASE_ID)shown=item;if(shown==null)Thread.sleep(100);}
  assertNotNull("Native invitation must appear in NotificationManager",shown);assertEquals(OdysseyReminders.TITLES[0],shown.getNotification().extras.getString(android.app.Notification.EXTRA_TITLE));assertNotNull(shown.getNotification().contentIntent);
  assertTrue(device.openNotification());androidx.test.uiautomator.UiObject2 notification=device.wait(Until.findObject(By.text(OdysseyReminders.TITLES[0])),7000);assertNotNull("Actual notification must be tappable",notification);capture("16_automatic_native_invitation");android.graphics.Rect bounds=notification.getVisibleBounds();rawTouch(bounds.centerX(),bounds.centerY());awaitForeground();awaitCurrentPage();
  truth("typeof playerTotals==='function'&&!document.getElementById('playInvitesToggle')");
  if(android.os.Build.VERSION.SDK_INT>=33){
   android.content.Context denied=new android.content.ContextWrapper(context){@Override public int checkSelfPermission(String permission){return android.content.pm.PackageManager.PERMISSION_DENIED;}};
   OdysseyReminders.preferences(context).edit().remove("last_0").commit();assertFalse(OdysseyReminders.deliver(denied,0,day,timestamp));
  }
  manager.cancel(OdysseyReminders.BASE_ID);OdysseyReminders.scheduleAll(context);
  writeEvidence("automatic-invites-delivery.json","{\"nativeNotification\":true,\"duplicateBlocked\":true,\"tappedIntoGame\":true,\"permissionGuard\":true}");
 }

}
