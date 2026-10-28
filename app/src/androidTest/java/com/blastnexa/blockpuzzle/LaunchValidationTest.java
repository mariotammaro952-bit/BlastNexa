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
  // Settle the emulator's display before cold-launching the landscape Activity.
  // The app still performs a fresh WebView load, without a warm-up launch.
  device.setOrientationLeft();device.waitForIdle(1000);
  Intent intent=new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(),OdysseyActivity.class);intent.putExtra("bn_qa_no_ads",true);
  java.util.concurrent.atomic.AtomicBoolean startupPending=new java.util.concurrent.atomic.AtomicBoolean(true);
  Thread startupObserver=new Thread(()->{try{Thread.sleep(3000);if(startupPending.get()){StringBuilder trace=new StringBuilder("Cold-start main thread:\n");for(StackTraceElement frame:android.os.Looper.getMainLooper().getThread().getStackTrace())trace.append(frame).append('\n');android.util.Log.w("BlastNexa-QA",trace.toString());}}catch(InterruptedException ignored){}},"BN-startup-observer");startupObserver.setDaemon(true);startupObserver.start();
  scenario=ActivityScenario.launch(intent);bind();
  // On newer Android, the full-screen education sheet may block readiness.
  // Older WebViews must finish initialization before accessibility queries.
  if(android.os.Build.VERSION.SDK_INT>=34)acknowledgeFullscreenEducation();
  try{waitFor("typeof playerTotals==='function' && !!document.getElementById('openLifeSlot')",45000);}catch(AssertionError error){bootstrapFailed=true;try{writeEvidence("startup.txt",js("JSON.stringify({url:location.href,state:document.readyState,agent:navigator.userAgent,text:document.body?document.body.innerText.slice(0,1000):'',scripts:document.scripts.length})"));capture("startup_failure");}catch(Exception ignored){}throw error;}finally{startupPending.set(false);}
  // Android shows its own one-time full-screen education above the WebView.
  // Acknowledge the actual system UI before lifecycle/back/touch assertions.
  androidx.test.uiautomator.UiObject2 education=device.wait(Until.findObject(By.text("Got it")),3000);
  if(education!=null){education.click();assertTrue(device.wait(Until.gone(By.text("Got it")),5000));}
  js("window.__qaErrors=[];window.__qaRealClicks=0;window.__qaWatchSpin=false;window.__qaFilled=()=>document.querySelectorAll('#slotReels>.bn-temple-reel').length===5&&[...document.querySelectorAll('#slotReels>.bn-temple-reel')].every(reel=>{const r=reel.getBoundingClientRect();return [0,1,2].every(row=>document.elementFromPoint(r.left+r.width/2,r.top+r.height*(row+.5)/3)?.closest('.bn-temple-cell'));});document.addEventListener('click',e=>{window.__qaRealClicks++;const b=e.target.closest?.('button');window.__qaLastTouch={label:b?.getAttribute('aria-label')||b?.textContent,phase:typeof slotPhase!=='undefined'?slotPhase:null};if(b?.id==='slotAutoStop')window.__qaStopTotal=lifeData.slot.total;if(window.__qaWatchSpin&&b?.id==='slotSpinButton'&&b.getAttribute('aria-label')==='GIRA'){setTimeout(()=>window.__qaSpinStart={phase:slotPhase,disabled:document.getElementById('slotSpinButton').disabled,scroll:document.getElementById('app').scrollTop,total:lifeData.slot.total},0);setTimeout(()=>window.__qaSpinMid={phase:slotPhase,filled:window.__qaFilled()},400);setTimeout(()=>window.__qaSpinLate={phase:slotPhase,filled:window.__qaFilled()},1700);}},true);window.addEventListener('error',e=>window.__qaErrors.push(e.message));localStorage.setItem('blastnexa_help_seen','true');muted=true;displayMenu();true");
 }
 private void acknowledgeFullscreenEducation()throws Exception{
  androidx.test.uiautomator.UiObject2 education=device.findObject(By.text("Got it"));
  if(education!=null){education.click();assertTrue(device.wait(Until.gone(By.text("Got it")),5000));}
 }
 private void withActivity(ActivityScenario.ActivityAction<OdysseyActivity> action){Runnable observe=()->scenario.onActivity(action);if(android.os.Looper.myLooper()==android.os.Looper.getMainLooper())observe.run();else InstrumentationRegistry.getInstrumentation().runOnMainSync(observe);}
 private void bind(){withActivity(activity->{try{java.lang.reflect.Field field=OdysseyActivity.class.getDeclaredField("game");field.setAccessible(true);web=(WebView)field.get(activity);}catch(Exception e){throw new RuntimeException(e);}});}
 private void recreateActivity()throws Exception{
  WebView previous=web;withActivity(activity->activity.recreate());readyWeb=null;
  long until=android.os.SystemClock.uptimeMillis()+30000;java.util.concurrent.atomic.AtomicBoolean changed=new java.util.concurrent.atomic.AtomicBoolean();
  while(android.os.SystemClock.uptimeMillis()<until){
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{scenario.onActivity(activity->{try{java.lang.reflect.Field field=OdysseyActivity.class.getDeclaredField("game");field.setAccessible(true);changed.set(field.get(activity)!=null&&field.get(activity)!=previous);}catch(Exception error){throw new RuntimeException(error);}});}catch(IllegalStateException|NullPointerException transition){}});
   if(changed.get()){awaitCurrentPage();awaitForeground();return;}Thread.sleep(100);
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
   // The OS education sheet can appear while the first page is loading. It
   // must be acknowledged before waiting for the Activity's ready state.
   if(!loaded.get()&&android.os.Build.VERSION.SDK_INT>=34)acknowledgeFullscreenEducation();
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
 private void truth(String expression)throws Exception{String result=js("Boolean("+expression+")");if(!"true".equals(result))recordFailure("assert-"+expression);assertEquals("Assertion failed: "+expression,"true",result);}
 private void waitFor(String expression,long timeout)throws Exception{
  long until=android.os.SystemClock.uptimeMillis()+timeout;while(android.os.SystemClock.uptimeMillis()<until){if("true".equals(js("Boolean("+expression+")")))return;Thread.sleep(150);}recordFailure("wait-"+expression);fail("Timed out waiting for "+expression);
 }
 private void recordFailure(String reason){
  try{String name=reason.replaceAll("[^a-zA-Z0-9_-]","_");if(name.length()>65)name=name.substring(0,65);
   writeEvidence(name+".json",js("JSON.stringify({phase:typeof slotPhase==='undefined'?null:slotPhase,busy:typeof slotBusy==='undefined'?null:slotBusy,total:lifeData.slot.total,sinceAd:lifeData.slot.sinceAd,coins:lifeData.slot.wallet.balance,rush:lifeData.slot.rush.active,shotEvents:window.__shotEvents,autoLeft:slotAutoLeft,autoTimer:slotAutoTimer,batchLeft:window.__qaBatchLeft,batchTrace:window.__qaBatchTrace,pending:bnPendingAd?{token:bnPendingAd.token,session:bnPendingAd.session}:null,session:gameSession,hidden:document.hidden,focused:document.hasFocus(),active:document.activeElement?.outerHTML.slice(0,600),overlay:document.getElementById('overlay').className,spin:document.getElementById('slotSpinButton')?.outerHTML,spinAncestors:(()=>{let n=document.getElementById('slotSpinButton'),a=[];for(;n;n=n.parentElement){const r=n.getBoundingClientRect(),s=getComputedStyle(n);a.push({tag:n.tagName,id:n.id,cls:n.className,rect:[r.x,r.y,r.width,r.height],hidden:n.getAttribute('aria-hidden'),inert:n.hasAttribute('inert'),display:s.display,visibility:s.visibility,overflow:s.overflow});}return a;})(),bannerLayout:window.BlastNexaBannerLayout?.(),bannerGeometry:['gameBanner','gameBannerFrame','puzzleBannerSeat','wordsBannerSeat','wordsScreen','wordsScroll'].map(id=>{const n=document.getElementById(id);if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return{id,rect:[r.x,r.y,r.width,r.height],display:s.display,visibility:s.visibility,basis:s.flexBasis,fits:n.dataset.fits};}),errors:window.__qaErrors})"));
   File folder=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"metrics");device.takeScreenshot(new File(folder,name+".png"));
  }catch(Exception ignored){}
 }
 @Test public void a00_freshCampaignStartsOnceWithTwentyLivesAndOneThousandCoins()throws Exception{
  js("storage.set('blastnexa_unlocked_v041',1800);storage.set('blastnexa_stars_v041',{1:3,1799:3});storage.set(WORD_KEY,{progress:{0:true,1:true},active:null});lifeData.balance=999;lifeData.slot.wallet.balance=99999;saveLives();playerProfile.name='Profilo conservato';savePlayer();localStorage.removeItem('blastnexa_fresh_campaign_v29');true");
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.reload());readyWeb=null;waitFor("typeof playerTotals==='function'",30000);
  truth("unlocked===1&&Object.keys(stars).length===0&&Object.keys(wordData.progress).length===0&&lifeData.balance===20&&lifeData.slot.wallet.balance===1000&&playerProfile.name==='Profilo conservato'");
  capture("00_fresh_start_20_lives_1000_coins");
  js("storage.set('blastnexa_unlocked_v041',2);storage.set('blastnexa_stars_v041',{1:3});lifeData.balance=19;lifeData.slot.wallet.balance=987;saveLives();true");
  recreateActivity();truth("unlocked===2&&stars[1]===3&&lifeData.balance===19&&lifeData.slot.wallet.balance===987");
  js("localStorage.removeItem('blastnexa_fresh_campaign_v29');true");
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.reload());readyWeb=null;waitFor("typeof playerTotals==='function'",30000);
  truth("unlocked===1&&lifeData.balance===20&&lifeData.slot.wallet.balance===1000");
 }
 @Test public void a01_centeredBoardAndStaticPagedScreensUsePhysicalTouches()throws Exception{
  // Resume a paused authored game with a physical touch. The foreground-focus
  // pause must settle before measuring and placing the first piece.
  js("start('adventure',1);pauseGame();true");
  awaitForeground();touchId("dialogPrimary");
  waitFor("document.hasFocus()&&playing&&!document.getElementById('overlay').classList.contains('on')",5000);
  waitFor("document.getElementById('boardShell').getBoundingClientRect().width>innerHeight*.72",5000);
  truth("(()=>{const b=document.getElementById('boardShell').getBoundingClientRect(),a=document.querySelector('#game .bn-wide-game').getBoundingClientRect();return Math.abs(b.left+b.width/2-a.left-a.width/2)<2&&b.top>=0&&b.bottom<=innerHeight&&Math.abs(b.width-b.height)<2;})()");
  truth("window.BlastNexaBannerLayout().slot==='puzzle_sidepanel'");
  capture("01_centered_puzzle_before_touch");
  js("window.__nativeProof=LEVELS[0].proof[0];true");
  int piece=Integer.parseInt(js("window.__nativeProof.slot"))+1,row=Integer.parseInt(js("window.__nativeProof.y"))+1,column=Integer.parseInt(js("window.__nativeProof.x"))+1;
  touch("Pezzo "+piece);touch("Riga "+row+", colonna "+column);waitFor("pieces[window.__nativeProof.slot]===null",5000);
  capture("01_centered_large_puzzle");
  js("displayMenu();openUniverse('words');true");
  waitFor("document.getElementById('universeSectionSelect')&&document.getElementById('wordLevelGrid').children.length===2",5000);
  truth("(()=>{const h=document.getElementById('universeBody').getBoundingClientRect();return ['wordLevelGrid','wordPagePrev','wordPageNext','wordTopicFilter','wordDifficultyFilter'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=h.top&&r.bottom<=h.bottom+1;});})()");
  android.graphics.Rect panel=touchBounds("universeBody",true);device.swipe(panel.centerX(),panel.bottom-20,panel.centerX(),panel.top+20,25);
  truth("document.getElementById('app').scrollTop===0&&document.scrollingElement.scrollTop===0&&document.getElementById('universeBody').scrollTop===0");
  touchId("wordPageNext");truth("wordHubState.page===1&&document.getElementById('wordListSummary').textContent.includes('3–4')");
  capture("02_static_crossword_library");
  js("renderUniverse('styles');true");waitFor("!!document.getElementById('bnPageNext_universeBody')&&!document.getElementById('bnPages_universeBody').hidden",5000);
  truth("(()=>{const b=document.getElementById('bnPages_universeBody'),r=b.getBoundingClientRect();return getComputedStyle(b).position==='absolute'&&r.top>=0&&r.bottom<=innerHeight&&r.height>=24;})()");
  String before=js("document.getElementById('universeBody').scrollTop");panel=touchBounds("universeBody",true);device.swipe(panel.centerX(),panel.bottom-20,panel.centerX(),panel.top+20,25);assertEquals(before,js("document.getElementById('universeBody').scrollTop"));
  touchId("bnPageNext_universeBody");truth("document.getElementById('universeBody').scrollTop>0&&document.getElementById('app').scrollTop===0&&document.scrollingElement.scrollTop===0");
  capture("03_static_page_navigation");
  js("displayMenu();storage.set(BN_SESSION_KEY,null);document.getElementById('resumeGame').hidden=true;true");
 }
 @Test public void a0_homeBannerSharesTheSidebarAndCollapsesWithoutAnAd()throws Exception{
  js("displayMenu();window.BlastNexaBannerReady();true");
  truth("document.getElementById('app').dataset.bannerContext==='home'");
  truth("document.getElementById('menuBannerSeat').parentElement.classList.contains('bn-home-sidebar')");
  truth("parseFloat(getComputedStyle(document.getElementById('app')).paddingBottom)<20");
  truth("(()=>{const ad=document.getElementById('gameBannerFrame').getBoundingClientRect(),cards=document.querySelector('#menu>.menu-buttons').getBoundingClientRect();return ad.width>=200&&ad.height===50&&ad.right<=cards.left&&ad.top>=0&&ad.bottom<=innerHeight;})()");
  truth("window.BlastNexaBannerLayout().visible&&window.BlastNexaBannerLayout().slot==='home_sidebar'");
  truth("['openWords','openLifeSlot'].every(id=>{const card=document.getElementById(id).getBoundingClientRect();return [...document.querySelectorAll('#'+id+' .bn-words-feature-copy>strong,#'+id+' .bn-words-feature-copy>small:first-child,#'+id+' #slotMenuLives')].every(e=>{const r=e.getBoundingClientRect();return r.top>=card.top&&r.bottom<=card.bottom&&e.scrollWidth<=e.clientWidth+1;});})");
  truth("(()=>{const c=document.getElementById('openLifeSlot').getBoundingClientRect(),a=document.querySelector('#openLifeSlot>.bn-slot-feature-art').getBoundingClientRect();return a.left>=c.left&&a.right<=c.right&&a.top>=c.top&&a.bottom<=c.bottom;})()");
  truth("(()=>{const cards=document.querySelector('#menu>.menu-buttons');return cards.scrollHeight<=cards.clientHeight+1||cards.classList.contains('bn-static-paged');})()");
  capture("00_home_embedded_banner");
  js("window.BlastNexaBannerStatus({session:gameSession,status:'unavailable'});true");
  truth("document.getElementById('menuBannerSeat').getBoundingClientRect().height===0&&!window.BlastNexaBannerLayout().visible");
  truth("getComputedStyle(document.getElementById('gameBanner')).visibility==='hidden'");
  capture("00_home_no_empty_ad_rail");
  js("window.BlastNexaBannerStatus({session:gameSession,status:'loading'});window.BlastNexaBannerReady();true");
  truth("window.BlastNexaBannerLayout().visible");
 }
 @Test public void a_menuProfileAnd400Crosswords()throws Exception{
  js("document.getElementById('openPlayerProfile').click();document.getElementById('playerNickname').value='Cometa Android';[...document.querySelectorAll('#universeBody button')].find(b=>b.textContent==='SALVA NOME').click();true");truth("playerProfile.name==='Cometa Android'");
  for(int start=0;start<400;start+=20){int end=Math.min(400,start+20);assertEquals("Crossword bounds", "true",js("(()=>{for(let id="+start+";id<"+end+";id++){startWord(id);const cells=[...document.getElementById('wordBoard').children],n=WORD_CATALOG[id].size;for(let i=0;i<cells.length;i++){const a=cells[i].getBoundingClientRect(),gap=i%n<n-1?cells[i+1].getBoundingClientRect().left-a.right:0;if(Math.abs(a.width-a.height)>.2||Math.abs(gap)>.2)return{word:id,cell:i,width:a.width,height:a.height,gap};}}return true;})()"));}
  truth("document.documentElement.scrollWidth<=innerWidth");truth("window.__qaErrors.length===0");
 }
 @Test public void b_threeSlotWorldsAndFiftySpinPersistence()throws Exception{
  js("lifeData.slot.wallet.balance=500000;true");
  js("openUniverse('slot');setArcadeMachine('temple');slotRandomInt=max=>0;playerSettings.effects='full';applyPlayerSettings();document.getElementById('slotSpinButton').click();window.__qaCommitted=lifeData.slot.total;true");
  waitFor("!slotBusy",15000);truth("lifeData.slot.total===window.__qaCommitted");
  js("window.__BN_TEST_FAST__=true;playerSettings.effects='lite';applyPlayerSettings();true");
  for(String world:new String[]{"crystal","temple","forge"}){
   js("if(lifeData.slot.arcade.revealed&&!lifeData.slot.arcade.revealed.presented)dismissTempleScene();setArcadeMachine('"+world+"');slotRandomInt=max=>0;spinLifeSlot();true");waitFor("!slotBusy",10000);truth("document.querySelectorAll('.bn-temple-cell').length===15");
  }
  js("setArcadeMachine('crystal');window.__qaStartSpins=lifeData.slot.total;true");
  // Run the same fifty persisted transactions inside the real WebView. This
  // avoids making hundreds of cross-process observations between lite spins.
  js("window.__qaBatchLeft=50;window.__qaBatchDone=false;window.__qaBatchTrace=[];window.__qaBatchStarted=performance.now();(function step(){if(slotBusy||bnPendingAd){setTimeout(step,30);return;}if(!window.__qaBatchLeft){window.__qaBatchDone=true;return;}if(spinLifeSlot()){window.__qaBatchLeft--;if(window.__qaBatchLeft%5===0)window.__qaBatchTrace.push({left:window.__qaBatchLeft,total:lifeData.slot.total,elapsed:performance.now()-window.__qaBatchStarted});}setTimeout(step,30);})();true");
  // Fifty actual DOM rebuilds, native saves and the ad bridge can exceed 30 s
  // on the software-rendered API 31 runner. Record progress; retain every debit.
  waitFor("window.__qaBatchDone",120000);
  writeEvidence("fifty-persisted-spins.json",js("JSON.stringify({start:window.__qaStartSpins,total:lifeData.slot.total,trace:window.__qaBatchTrace,elapsed:performance.now()-window.__qaBatchStarted})"));
  truth("lifeData.slot.total===window.__qaStartSpins+50");String expectedBalance=js("lifeData.balance"),expectedSpins=js("lifeData.slot.total");
  js("saveLives();true");recreateActivity();waitFor("typeof lifeData!=='undefined'",30000);
  assertEquals(expectedBalance,js("lifeData.balance"));assertEquals(expectedSpins,js("lifeData.slot.total"));
  truth("window.__qaErrors===undefined || window.__qaErrors.length===0");
 }
 @Test public void c_allAdventureLevelsAcrossFourScenes()throws Exception{
  // Exact placement/scoring/mission/result code. Expensive presentation/IO is adapted only in this test.
  js("document.body.style.display='none';window.__BN_TEST_FAST__=true;for(const n of ['render','showPlacementFx','showBlastFx','showUniverseImpact','showAdrenalineMoveFX','showVictoryFinish','sPlace','sClear','haptic','adUnlockAudio','syncFlair','refreshUniverseMenu','refreshLivesUI','refreshWordMenu','saveUniverse','storeSession','refreshPlayerUI','saveRanking']){try{eval(n+'=()=>{}')}catch{}}storage.set=()=>{};unlocked=2000;lifeData.balance=999999;playerSettings.effects='lite';applyPlayerSettings();true");
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
  truth("document.getElementById('boardShell').getBoundingClientRect().right<=document.getElementById('gameBannerFrame').getBoundingClientRect().left+2");
  assertSideBanner("puzzleBannerSeat");
  truth("[...document.querySelectorAll('#game .power-tool')].every(b=>b.scrollWidth<=b.clientWidth+1)");
  js("openUniverse('slot');setArcadeMachine('temple');true");
  truth("document.querySelectorAll('#slotReels .bn-temple-reel').length===5");
  truth("document.querySelectorAll('#slotReels .bn-temple-cell').length===15");
  truth("document.getElementById('slotSpinButton').getBoundingClientRect().right<=innerWidth");
  truth("window.BlastNexaBannerLayout().visible");
  js("startWord(0);true");
  truth("document.getElementById('wordBoard').getBoundingClientRect().right<=document.getElementById('wordControls').getBoundingClientRect().left+16");
  assertSideBanner("wordsBannerSeat");
  truth("window.__qaErrors.length===0");
  js("openUniverse('slot');setArcadeMachine('temple');lifeData.slot.arcade.treasure=29;playerSettings.effects='lite';applyPlayerSettings();slotRandomInt=max=>max===100?31:0;spinLifeSlot();true");
  waitFor("!slotBusy",15000);
  truth("!!lifeData.slot.arcade.bonus && document.querySelectorAll('.bn-world-chest').length===3");
  assertPinnedSlot();
  capture("08_bonus_temple");
  js("document.getElementById('slotChest1').click();if(bnSupernovaRun)bnSupernovaFinish();document.getElementById('slotSpinButton').click();true");
  truth("!lifeData.slot.arcade.bonus && !!document.getElementById('slotReels')");
 }
 private void assertSideBanner(String seat)throws Exception{
  waitFor("(()=>{const r=document.getElementById('"+seat+"').getBoundingClientRect(),layout=window.BlastNexaBannerLayout();return r.width>0&&layout.slot==='"+(seat.equals("wordsBannerSeat")?"words_sidepanel":"puzzle_sidepanel")+"'&&(r.width>=200?layout.visible&&r.height===59:!layout.visible&&r.height===0&&getComputedStyle(document.getElementById('gameBanner')).visibility==='hidden');})()",5000);
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
 private void awaitTouchFrame()throws Exception{
  js("window.__qaTouchPaint=false;requestAnimationFrame(()=>requestAnimationFrame(()=>window.__qaTouchPaint=true));true");waitFor("window.__qaTouchPaint",10000);device.waitForIdle(250);
 }
 private android.graphics.Rect touchBounds(String label)throws Exception{
  return touchBounds(label,false);
 }
 private android.graphics.Rect touchBounds(String label,boolean byId)throws Exception{
  awaitTouchFrame();
  long until=android.os.SystemClock.uptimeMillis()+7000;
  while(android.os.SystemClock.uptimeMillis()<until){
   // Refresh UiAutomation's own cached nodes after a WebView cabinet update.
   // The coordinates still come from the current Android accessibility tree.
   if(android.os.Build.VERSION.SDK_INT>=34)InstrumentationRegistry.getInstrumentation().getUiAutomation().clearCache();
   androidx.test.uiautomator.UiObject2 node=device.findObject(byId?By.res(label):By.text(label));if(node==null&&!byId)node=device.findObject(By.desc(label));
   if(node!=null)try{android.graphics.Rect bounds=node.getVisibleBounds();if(bounds.width()>0&&bounds.height()>0)return bounds;}catch(androidx.test.uiautomator.StaleObjectException changed){}
   Thread.sleep(100);
  }
  // Some WebView accessibility providers invalidate a UiObject2 while a whole
  // cabinet is replaced. A fresh UI-tree snapshot is authoritative: use only
  // the matching enabled accessibility node's bounds, never DOM coordinates.
  File snapshot=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"metrics/missing-touch.xml");snapshot.getParentFile().mkdirs();device.dumpWindowHierarchy(snapshot);
  org.xmlpull.v1.XmlPullParser parser=android.util.Xml.newPullParser();
  try(java.io.FileInputStream stream=new java.io.FileInputStream(snapshot)){parser.setInput(stream,"UTF-8");for(int event=parser.getEventType();event!=org.xmlpull.v1.XmlPullParser.END_DOCUMENT;event=parser.next()){
   if(event!=org.xmlpull.v1.XmlPullParser.START_TAG||!"node".equals(parser.getName()))continue;
   if(byId?!label.equals(parser.getAttributeValue(null,"resource-id")):!label.equals(parser.getAttributeValue(null,"text"))&&!label.equals(parser.getAttributeValue(null,"content-desc")))continue;
   if(!"true".equals(parser.getAttributeValue(null,"enabled")))continue;
   java.util.regex.Matcher match=java.util.regex.Pattern.compile("\\[(-?\\d+),(-?\\d+)\\]\\[(-?\\d+),(-?\\d+)\\]").matcher(parser.getAttributeValue(null,"bounds"));
   if(match.matches()){android.graphics.Rect bounds=new android.graphics.Rect(Integer.parseInt(match.group(1)),Integer.parseInt(match.group(2)),Integer.parseInt(match.group(3)),Integer.parseInt(match.group(4)));if(bounds.width()>0&&bounds.height()>0){writeEvidence("accessibility-snapshot-fallback.txt",label+" "+bounds);return bounds;}}
  }}
  writeEvidence("touch-failure.txt","Accessible touch target missing: "+label);recordFailure("touch-"+label);throw new AssertionError("Accessible touch target missing: "+label);
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
 private void touchId(String id)throws Exception{android.graphics.Rect b=touchBounds(id,true);rawTouch(b.centerX(),b.centerY());Thread.sleep(100);}
 private void slotFixture(String machine,String effects)throws Exception{
  js("cancelSlotAnimation();openUniverse('slot');lifeData.slot.sinceAd=0;lifeData.slot.wallet.balance=50000;lifeData.slot.wallet.anchor=Date.now();Object.assign(lifeData.slot.arcade,{bonus:null,revealed:null,freeSpins:0,crystalJourney:null,reactor:0,treasure:0});setArcadeMachine('"+machine+"');slotRandomInt=max=>0;playerSettings.effects='"+effects+"';applyPlayerSettings();window.__BN_TEST_FAST__=false;renderLifeSlot(document.getElementById('universeBody'));true");
 }
 private void assertPinnedSlot()throws Exception{
  truth("document.getElementById('app').scrollTop===0 && document.scrollingElement.scrollTop===0");
  truth("document.getElementById('universeScreen').getBoundingClientRect().top>=0");
  truth("(()=>{const ids=['slotAuto5','slotAuto10','slotAutoStop'];return ids.map(id=>document.getElementById(id)).filter(Boolean).every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&r.height>=24;});})()");
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
   js("window.__qaNaturalCelebrationDuration=slotCelebrationDuration;slotCelebrationDuration=()=>60000;window.__qaWatchSpin=true;window.__qaSpinStart=null;window.__qaSpinMid=null;window.__qaSpinLate=null;window.__touchTotal=lifeData.slot.total;window.__touchBalance=lifeData.balance;window.__touchY=document.getElementById('slotSpinButton').getBoundingClientRect().top;true");
   android.graphics.Rect bounds=touchBounds("GIRA");
   // Repeated presses at the same physical point must commit exactly one spin.
   long burst=android.os.SystemClock.uptimeMillis();for(int i=0;i<8;i++)rawTouch(bounds.centerX(),bounds.centerY());
   long elapsed=android.os.SystemClock.uptimeMillis()-burst;
   assertTrue("Touch burst exceeded the reel animation: "+elapsed+"ms",elapsed<2400);
   // Observe the native collect control before tapping. A slow accessibility
   // bridge must not outlive the collect window and accidentally buy a new spin.
   waitFor("!!document.getElementById('bnSupernova')",15000);
   touchId("snSkip");waitFor("!slotBusy",15000);
   truth("window.__qaLastTouch.label==='CONTINUA'");
   truth("lifeData.slot.total===window.__touchTotal+1 && lifeData.balance===window.__touchBalance+5");
   writeEvidence("touch-observed-"+machine+".json",js("JSON.stringify({start:window.__qaSpinStart,mid:window.__qaSpinMid,late:window.__qaSpinLate,last:window.__qaLastTouch,total:lifeData.slot.total,previous:window.__touchTotal,burstMs:"+elapsed+"})"));
   truth("window.__qaSpinStart.phase==='spinning' && window.__qaSpinStart.disabled && window.__qaSpinStart.scroll===0 && window.__qaSpinStart.total===window.__touchTotal+1");
   truth("window.__qaSpinMid.phase==='spinning' && window.__qaSpinMid.filled && window.__qaSpinLate.phase==='spinning' && window.__qaSpinLate.filled");assertPinnedSlot();assertFilledReels();
   writeEvidence("touch-burst-"+machine+".json",js("JSON.stringify({machine:lifeData.slot.arcade.machine,previous:window.__touchTotal,total:lifeData.slot.total,start:window.__qaSpinStart,mid:window.__qaSpinMid,late:window.__qaSpinLate,burstMs:"+elapsed+"})"));js("window.__qaWatchSpin=false;slotCelebrationDuration=window.__qaNaturalCelebrationDuration;true");
   truth("Math.abs(document.getElementById('slotSpinButton').getBoundingClientRect().top-window.__touchY)<1");
   // A touch away from the centre also works inside the round control.
   bounds=touchBounds("GIRA");rawTouch(bounds.left+bounds.width()/3,bounds.top+bounds.height()*2/3);
   waitFor("lifeData.slot.total===window.__touchTotal+2",5000);waitFor("!slotBusy",12000);assertPinnedSlot();
  }
  capture("09_slot_after_real_touches");truth("window.__qaErrors.length===0");
 }
 @Test public void i_realTouchesChestCrystalAndForge()throws Exception{
  slotFixture("temple","lite");js("lifeData.slot.arcade.treasure=29;slotRandomInt=max=>max===100?31:0;true");touch("GIRA");waitFor("!!lifeData.slot.arcade.bonus&&!slotBusy",15000);
  js("window.__touchBalance=lifeData.balance;window.__touchTotal=lifeData.slot.total;window.__chestPrize=lifeData.slot.arcade.bonus.choices[1];true");
  android.graphics.Rect chest=touchBounds("Apri il forziere 2");for(int i=0;i<4;i++)rawTouch(chest.centerX(),chest.centerY());
  waitFor("!lifeData.slot.arcade.bonus",15000);
  truth("lifeData.balance===window.__touchBalance+window.__chestPrize && lifeData.slot.total===window.__touchTotal");
  touch("TORNA AI RULLI");truth("!!document.getElementById('slotReels') && !lifeData.slot.arcade.bonus");assertPinnedSlot();
  slotFixture("crystal","lite");js("slotRandomInt=max=>max===100?98:0;true");touch("GIRA");waitFor("lifeData.slot.arcade.freeSpins===3&&!slotBusy",15000);
  js("slotRandomInt=max=>0;window.__touchTotal=lifeData.slot.total;true");
  for(int i=0;i<3;i++){touch("GIRA NELLA CAVERNA");waitFor("lifeData.slot.total===window.__touchTotal+"+(i+1)+" && !slotBusy",15000);}
  truth("lifeData.slot.total===window.__touchTotal+3 && lifeData.slot.arcade.crystalJourney.played===3");touch("TORNA AI RULLI");assertPinnedSlot();
  slotFixture("forge","lite");touch("GIRA");waitFor("!slotBusy",15000);js("lifeData.slot.arcade.reactor=6;renderLifeSlot(document.getElementById('universeBody'));window.__touchTotal=lifeData.slot.total;true");
  touch("Tieni il rullo 1");waitFor("document.activeElement.id==='slotHold0'",15000);touch("Tieni il rullo 4");waitFor("document.activeElement.id==='slotHold3'",15000);truth("slotHolds.size===2");assertPinnedSlot();capture("12_forge_ready_touch_targets");touch("Rilancia i rulli");waitFor("!slotBusy",15000);
  truth("lifeData.slot.total===window.__touchTotal+1 && lifeData.slot.last.arcade.held.join(',')==='0,3' && lifeData.slot.arcade.reactor===0");assertPinnedSlot();capture("10_forge_after_touch_respin");
 }
 @Test public void j_realTouchesAutoStopPauseAndUninterruptedSpins()throws Exception{
  slotFixture("crystal","lite");js("window.__qaAutoDraw=0;slotRandomInt=max=>max===100?[0,14,31,47,63][Math.floor(window.__qaAutoDraw++/3)%5]:0;window.__touchTotal=lifeData.slot.total;true");touch("Avvia 5 giri automatici");waitFor("lifeData.slot.total===window.__touchTotal+5 && !slotBusy && slotAutoLeft===0 && slotAutoTimer===null",15000);
  js("playerSettings.effects='full';applyPlayerSettings();window.__qaStopTotal=null;window.__touchTotal=lifeData.slot.total;true");truth("!reducedFX()");
  android.graphics.Rect autoFive=touchBounds("Avvia 5 giri automatici"),autoTen=touchBounds("Avvia 10 giri automatici");
  android.graphics.Rect autoArea=new android.graphics.Rect(autoFive);autoArea.union(autoTen);
  rawTouch(autoTen.centerX(),autoTen.centerY());waitFor("!!document.getElementById('slotAutoStop') && slotAutoLeft>0",15000);
  // Stop fills the same control area previously occupied by Auto 5/10.
  touch("Ferma i giri automatici");waitFor("!slotBusy",12000);Thread.sleep(900);truth("window.__qaStopTotal!==null && lifeData.slot.total===window.__qaStopTotal && slotAutoLeft===0 && slotAutoTimer===null");
  java.util.concurrent.atomic.AtomicInteger task=new java.util.concurrent.atomic.AtomicInteger();withActivity(a->task.set(a.getTaskId()));touch("GIRA");waitFor("slotBusy",5000);String total=js("lifeData.slot.total"),balance=js("lifeData.balance");device.pressHome();device.executeShellCommand("am task focus "+task.get());awaitForeground();waitFor("!slotBusy",10000);assertEquals(total,js("lifeData.slot.total"));assertEquals(balance,js("lifeData.balance"));assertPinnedSlot();
  js("playerSettings.effects='lite';applyPlayerSettings();lifeData.slot.sinceAd=49;window.__touchTotal=lifeData.slot.total;renderLifeSlot(document.getElementById('universeBody'));true");
  touch("GIRA");waitFor("!slotBusy",15000);truth("lifeData.slot.sinceAd===0 && !document.getElementById('overlay').classList.contains('on')");
  touch("GIRA");waitFor("!slotBusy",15000);truth("lifeData.slot.total===window.__touchTotal+2 && lifeData.slot.sinceAd===0");assertPinnedSlot();

 }
 @Test public void k_fullWidthNativeCanvasAndCutout()throws Exception{
  slotFixture("temple","lite");
  withActivity(activity->{
   assertEquals(android.content.pm.ApplicationInfo.CATEGORY_GAME,activity.getApplicationInfo().category);
   try{java.lang.reflect.Field field=OdysseyActivity.class.getDeclaredField("root");field.setAccessible(true);android.widget.FrameLayout root=(android.widget.FrameLayout)field.get(activity);assertEquals(0,root.getPaddingLeft());assertEquals(0,root.getPaddingRight());assertEquals(device.getDisplayWidth(),web.getWidth());int[] position=new int[2];web.getLocationOnScreen(position);assertEquals(0,position[0]);assertEquals(0,position[1]);
    if("true".equals(InstrumentationRegistry.getArguments().getString("bn_qa_cutout"))){assertNotNull(root.getRootWindowInsets().getDisplayCutout());assertTrue(root.getRootWindowInsets().getDisplayCutout().getSafeInsetLeft()>0||root.getRootWindowInsets().getDisplayCutout().getSafeInsetRight()>0);}
   }catch(Exception error){throw new RuntimeException(error);}
  });
  truth("(()=>{let b=document.getElementById('app').getBoundingClientRect();return b.left===0&&b.top===0&&b.width===innerWidth&&b.height===innerHeight;})()");
  js("window.__touchTotal=lifeData.slot.total;true");truth("reducedFX() && slotSpinDuration()===0");
  android.graphics.Rect bounds=touchBounds("GIRA");assertTrue(device.click(bounds.centerX(),bounds.centerY()));
  waitFor("lifeData.slot.total===window.__touchTotal+1 && !slotBusy",15000);assertPinnedSlot();capture("11_full_width_cutout");
 }
 @Test public void l_virtualCoinsUseRealTouchAndSurviveRecreation()throws Exception{
  slotFixture("crystal","lite");js("lifeData.slot.arcade.lineCount=1;lifeData.slot.wallet.balance=2;lifeData.slot.wallet.spent=0;lifeData.slot.wallet.anchor=Date.now();window.__coinsStart=lifeData.slot.total;window.__qaDraw=0;slotRandomInt=max=>max===100?[0,14,31,47,63][Math.floor(window.__qaDraw++/3)%5]:0;renderLifeSlot(document.getElementById('universeBody'));true");
  touch("GIRA");waitFor("!slotBusy",15000);truth("lifeData.slot.wallet.balance===1&&lifeData.slot.wallet.spent===1");
  touch("GIRA");waitFor("!slotBusy",15000);truth("lifeData.slot.wallet.balance===0&&lifeData.slot.wallet.spent===2");
  touch("GIRA");truth("lifeData.slot.total===window.__coinsStart+2&&document.getElementById('overlay').classList.contains('on')&&!window.BlastNexaBannerLayout().visible");
  touchId("dialogPrimary");waitFor("!bnPendingAd",15000);truth("lifeData.slot.wallet.balance===0&&lifeData.slot.wallet.spent===2");
  touchId("dialogSecondary");js("saveLives();true");recreateActivity();truth("lifeData.slot.wallet.balance===0&&lifeData.slot.wallet.spent===2");
  // A player reopens the slot through the home control after a cold page load.
  // Retain that physical navigation and its WebView focus before the bonus fixture.
  touchId("openLifeSlot");truth("slotVisible()");
  js("openUniverse('slot');lifeData.slot.sinceAd=0;lifeData.slot.wallet.anchor=Date.now();Object.assign(lifeData.slot.arcade,{machine:'crystal',lineCount:1,freeLineCount:1,freeSpins:1,bonus:null,revealed:null,crystalJourney:{id:'crystal:'+lifeData.slot.total,awarded:1,played:0,lives:0,coins:0,dismissed:false}});slotRandomInt=()=>0;playerSettings.effects='lite';applyPlayerSettings();renderLifeSlot(document.getElementById('universeBody'));true");
  waitFor("document.getElementById('slotSpinButton')?.getAttribute('aria-label')==='GIRA NELLA CAVERNA'&&!document.getElementById('slotSpinButton').disabled",15000);
  touchId("slotSpinButton");waitFor("!slotBusy",15000);truth("lifeData.slot.wallet.balance===25&&lifeData.slot.wallet.spent===2&&lifeData.slot.last.coinCost===0&&lifeData.slot.last.coinsCredited===25");
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
 }
 @Test public void n0_actualAndroidNotificationPermission()throws Exception{
  if(android.os.Build.VERSION.SDK_INT<33)return;
  android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
  assertEquals(android.content.pm.PackageManager.PERMISSION_DENIED,context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS));
  withActivity(activity->{try{
   activity.getIntent().putExtra("bn_qa_no_ads",false);
   OdysseyReminders.preferences(activity).edit().remove("permission_asked").commit();
   java.lang.reflect.Method ask=OdysseyActivity.class.getDeclaredMethod("requestInviteNotificationPermission");ask.setAccessible(true);ask.invoke(activity);
   java.lang.reflect.Field pending=OdysseyActivity.class.getDeclaredField("invitePermissionPending");pending.setAccessible(true);assertTrue(pending.getBoolean(activity));
   java.lang.reflect.Method start=OdysseyActivity.class.getDeclaredMethod("startAdsWhenReady");start.setAccessible(true);start.invoke(activity);
   java.lang.reflect.Field controller=OdysseyActivity.class.getDeclaredField("ads");controller.setAccessible(true);Object ads=controller.get(activity);java.lang.reflect.Field started=ads.getClass().getDeclaredField("started");started.setAccessible(true);assertFalse("UMP must wait for the Android permission prompt",started.getBoolean(ads));
  }catch(Exception error){throw new RuntimeException(error);}finally{activity.getIntent().putExtra("bn_qa_no_ads",true);}});
  try{
   androidx.test.uiautomator.UiObject2 allow=device.wait(Until.findObject(By.res("com.android.permissioncontroller:id/permission_allow_button")),10000);
   assertNotNull("Android notification permission dialog must appear automatically",allow);device.waitForIdle(500);
   if(android.os.Build.VERSION.SDK_INT>=34)InstrumentationRegistry.getInstrumentation().getUiAutomation().clearCache();
   allow=device.wait(Until.findObject(By.res("com.android.permissioncontroller:id/permission_allow_button")),5000);assertNotNull(allow);allow.click();assertTrue(device.wait(Until.gone(By.res("com.android.permissioncontroller:id/permission_allow_button")),10000));
   long until=android.os.SystemClock.uptimeMillis()+10000;while(context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED&&android.os.SystemClock.uptimeMillis()<until)Thread.sleep(100);
   assertEquals(android.content.pm.PackageManager.PERMISSION_GRANTED,context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS));
   assertTrue(OdysseyReminders.preferences(context).getBoolean("permission_asked",false));
   writeEvidence("notification-system-permission.json","{\"automaticSystemPrompt\":true,\"physicalAllowTap\":true,\"permissionGranted\":true}");
  }finally{withActivity(activity->activity.getIntent().putExtra("bn_qa_no_ads",true));}
 }
 @Test public void n_automaticInviteScheduleSurvivesRecreationAndClockChanges()throws Exception{
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
 @Test public void p_coloredLineChoicesChargeTheDisplayedCoins()throws Exception{
  for(String machine:new String[]{"temple","crystal","forge"}){
   slotFixture(machine,"lite");js("lifeData.slot.arcade.lineCount=1;lifeData.slot.wallet.balance=100;window.__lineStart=lifeData.slot.total;renderLifeSlot(document.getElementById('universeBody'));true");
   for(int lines:new int[]{1,5,10}){
    touch(lines==1?"1 linea, 1 moneta per giro":lines+" linee, "+lines+" monete per giro");truth("slotLineCount()==="+lines+" && document.getElementById('slotLines"+lines+"').getAttribute('aria-pressed')==='true'");
    js("window.__lineBefore=lifeData.slot.wallet.balance;window.__lineLives=lifeData.balance;true");touch("GIRA");waitFor("!slotBusy",15000);
    truth("lifeData.slot.wallet.balance===window.__lineBefore-"+lines+"+25*"+lines+" && lifeData.slot.last.coinsCredited===25*"+lines+" && lifeData.slot.last.coinCost==="+lines+" && lifeData.slot.last.arcade.lineCount==="+lines+" && lifeData.balance===window.__lineLives+5");
   }
   truth("lifeData.slot.wallet.balance===484 && lifeData.slot.total===window.__lineStart+3");assertPinnedSlot();
  }
  js("saveLives();true");recreateActivity();truth("lifeData.slot.wallet.balance===484 && slotLineCount()===10");
  writeEvidence("native-line-wagers.json","{\"worlds\":3,\"lineChoices\":[1,5,10],\"physicalTaps\":true,\"exactDebitsCoinsAndLives\":true,\"reloadPreserved\":true}");
 }
 @Test public void q_offlinePuzzleAndSlotKeepCommittedProgress()throws Exception{
  device.executeShellCommand("svc wifi disable");device.executeShellCommand("svc data disable");
  try{
   slotFixture("crystal","lite");js("lifeData.slot.arcade.lineCount=1;lifeData.slot.wallet.balance=100;window.__offlineStart=lifeData.slot.total;renderLifeSlot(document.getElementById('universeBody'));true");touch("GIRA");waitFor("!slotBusy",15000);truth("lifeData.slot.wallet.balance===124 && lifeData.slot.total===window.__offlineStart+1");
   js("unlocked=2000;lifeData.balance=1000;playerSettings.effects='lite';applyPlayerSettings();setScene('war');true");truth("start('adventure',1)===true");
   int moves=Integer.parseInt(js("LEVELS[0].proof.length"));
   for(int i=0;i<moves;i++){
    if("true".equals(js("!!roundOutcome")))break;
    waitFor("!fxBusy",10000);truth("(()=>{const p=LEVELS[0].proof["+i+"];return placePiece(p.slot,p.x,p.y);})()");
   }
   waitFor("roundOutcome==='win' && roundFinalized && !playing",10000);
   js("saveLives();true");recreateActivity();truth("lifeData.slot.wallet.balance===124 && stars[1]>0");
   writeEvidence("offline-gameplay.json","{\"networkDisabled\":true,\"slotDebit\":1,\"puzzleWon\":true,\"reloadPreserved\":true}");
  }finally{device.executeShellCommand("svc wifi enable");device.executeShellCommand("svc data enable");}
 }


 @Test public void r_bonusSongOnlyDuringBonusAndNativeLifecycle()throws Exception{
  slotFixture("temple","full");
  js("muted=false;playerSettings.music=true;lifeData.slot.arcade.musicEnabled=true;applyPlayerSettings();slotMediaSync();true");
  waitFor("slotMusicKey==='music' && !!slotMusicNode",20000);
  truth("slotMusicProfile().key==='music' && !bnSupernovaRun");
  js("window.__bonusTotal=lifeData.slot.total;window.__bonusCoins=lifeData.slot.wallet.balance;window.__bonusLives=lifeData.balance;true");
  touch("GIRA");waitFor("!!bnSupernovaRun && slotMusicKey==='hype' && !!slotMusicNode",20000);
  truth("!window.BlastNexaBannerLayout().visible && slotBusy && slotMusicOffset===0");
  truth("lifeData.slot.total===window.__bonusTotal+1 && lifeData.slot.wallet.balance===window.__bonusCoins-lifeData.slot.last.coinCost+lifeData.slot.last.coinsCredited && lifeData.balance===window.__bonusLives+lifeData.slot.last.credited");
  capture("31_bonus_song_and_hidden_banner");
  touchId("snSkip");waitFor("!slotBusy && !bnSupernovaRun && slotMusicKey==='music'",10000);
  truth("lifeData.slot.total===window.__bonusTotal+1 && slotSampleVoices.size===0 && window.BlastNexaBannerLayout().visible");
  js("bnSupernovaStart({title:'MEGA BONUS',duration:8000});true");waitFor("slotMusicKey==='hype'",10000);
  java.util.concurrent.atomic.AtomicInteger task=new java.util.concurrent.atomic.AtomicInteger();withActivity(a->task.set(a.getTaskId()));
  device.pressHome();device.executeShellCommand("am task focus "+task.get());awaitForeground();
  waitFor("!bnSupernovaRun && !slotBusy && slotMusicKey!=='hype'",10000);
  truth("lifeData.slot.total===window.__bonusTotal+1 && window.__qaErrors.length===0");
 }
 @Test public void s_bannerStaysInsideRequestedCentreDeck()throws Exception{
  slotFixture("temple","lite");
  truth("(()=>{const seat=document.getElementById('slotBannerSeat').getBoundingClientRect(),frame=document.getElementById('gameBannerFrame').getBoundingClientRect(),spin=document.getElementById('slotSpinButton').getBoundingClientRect(),wallet=document.getElementById('slotCoinWallet').getBoundingClientRect(),b=window.BlastNexaBannerLayout();return b.slot==='slot_control_deck'&&b.visible&&frame.height===50&&frame.left>=seat.left&&frame.right<=seat.right&&frame.top>=seat.top&&frame.bottom<=seat.bottom&&frame.right<spin.left&&frame.left>wallet.right&&!document.querySelector('#slotBannerSeat .bn-radiance-note');})()");
  js("window.BlastNexaBannerStatus({session:gameSession,status:'loaded'});true");truth("document.getElementById('gameBannerPreview').hidden");
  js("window.BlastNexaBannerStatus({session:gameSession,status:'unavailable'});true");truth("!document.getElementById('gameBannerPreview').hidden");
  capture("31_centre_banner_deck");
  for(String world:new String[]{"crystal","forge","temple"}){js("setArcadeMachine('"+world+"');true");truth("window.BlastNexaBannerLayout().slot==='slot_control_deck'&&window.BlastNexaBannerLayout().visible");}
  truth("window.__qaErrors.length===0");
 }
 @Test public void t_v32RelaunchIsLargeRedAndUsesPhysicalTouches()throws Exception{
  slotFixture("forge","full");
  js("lifeData.slot.last=chooseSlotResult('spin');lifeData.slot.arcade.reactor=6;slotHolds.clear();renderLifeSlot(document.getElementById('universeBody'));true");
  truth("document.getElementById('slotRespinButton').disabled && getComputedStyle(document.getElementById('slotRespinButton'),'::after').animationName==='none'");
  touchId("slotHold0");
  truth("(()=>{const a=document.getElementById('slotRespinButton'),b=document.getElementById('slotSpinButton'),x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return !a.disabled&&a.dataset.ready==='true'&&getComputedStyle(a,'::after').animationName==='bnRedRelaunch'&&Math.abs(x.width-y.width)<1&&Math.abs(x.height-y.height)<1&&x.top>=0&&x.bottom<=innerHeight;})()");
  capture("32_large_red_relaunch");
  js("window.__relaunchTotal=lifeData.slot.total;window.__relaunchCoins=lifeData.slot.wallet.balance;true");touchId("slotRespinButton");
  truth("lifeData.slot.total===window.__relaunchTotal+1 && lifeData.slot.last.arcade.kind==='respin' && lifeData.slot.last.arcade.held[0]===0 && lifeData.slot.wallet.balance===window.__relaunchCoins-lifeData.slot.last.coinCost+lifeData.slot.last.coinsCredited && !spinLifeSlot('respin')");
 }
 @Test public void u_v33VariedCoinPagesPreserveSavedRewards()throws Exception{
  slotFixture("temple","lite");
  js("window.__coinBonusTotal=lifeData.slot.total;true");touchId("slotSpinButton");waitFor("!!bnSupernovaRun",12000);
  js("window.__coinBonusWallet=lifeData.slot.wallet.balance;window.__coinBonusLives=lifeData.balance;true");
  truth("new Set(bnSupernovaRun.parts.map(p=>p.coins)).size>1 && new Set(bnSupernovaRun.parts.filter(p=>p.lives).map(p=>p.lives)).size>1");
  truth("['coins','lives','free'].every(key=>bnSupernovaRun.parts.reduce((n,p)=>n+p[key],0)===(bnSupernovaRun.counters.find(c=>c.key===key)?.value||0))");
  Thread.sleep(8500);truth("!!bnSupernovaRun && slotBusy && bnSupernovaRun.revealed.size===0 && !window.BlastNexaBannerLayout().visible");
  capture("33_coin_bonus_page_1");
  for(int page=0;page<3;page++){
   truth("bnSupernovaRun.page==="+page+" && document.getElementById('snContinue').disabled");
   touchId("snCoin0");truth("bnSupernovaRun.revealed.has("+(page*12)+")");
   touchId("snRevealAll");truth("!document.getElementById('snContinue').disabled");
   if(page==0)capture("33_varied_coin_prizes");
   if(page==2)truth("bnSupernovaRun.counters.every(c=>c.collected===c.value)");
   touchId("snContinue");
  }
  truth("!bnSupernovaRun && !slotBusy && lifeData.slot.total===window.__coinBonusTotal+1 && lifeData.slot.wallet.balance===window.__coinBonusWallet && lifeData.balance===window.__coinBonusLives && !document.getElementById('universeScreen').hasAttribute('inert')");
  js("saveLives();true");recreateActivity();truth("lifeData.slot.wallet.balance===lifeData.slot.last.beforeCoins-lifeData.slot.last.coinCost+lifeData.slot.last.coinsCredited && !bnSupernovaRun");
 }
 @Test public void v_v33CompleteWorldPageUsesNativeNavigation()throws Exception{
  js("displayMenu();openAdventureMap();true");waitFor("!!document.getElementById('bnPages_mapScroll')",8000);
  truth("(()=>{const a=document.getElementById('adventureMap').getBoundingClientRect(),s=document.getElementById('mapScroll').getBoundingClientRect(),h=document.querySelector('#adventureMap>.map-header').getBoundingClientRect(),c=document.getElementById('mapCurrentWorld').getBoundingClientRect(),p=document.getElementById('bnPages_mapScroll').getBoundingClientRect(),ad=document.getElementById('gameBanner').getBoundingClientRect(),levels=[...document.querySelectorAll('#worlds .level-node')];return !document.getElementById('bnPages_adventureMap')&&document.querySelectorAll('#worlds>.world-card').length===1&&Math.abs(a.left+a.width/2-innerWidth/2)<2&&s.bottom<=p.top+1&&p.bottom<=ad.top+1&&levels.length===10&&[document.querySelector('.bn-world-heading'),document.querySelector('.world-pagebar'),...levels].every(n=>{const r=n.getBoundingClientRect();return r.left>=s.left&&r.right<=s.right+1&&r.top>=h.bottom&&r.bottom<=s.bottom+1&&r.bottom<=c.bottom+1});})()");
  capture("33_complete_adventure_world");
  touchId("bnPageNext_mapScroll");truth("BlastNexaWorldPage().world===1");touchId("bnPagePrev_mapScroll");truth("BlastNexaWorldPage().world===0");
  touchId("mapLevelsNext");truth("BlastNexaWorldPage().first===11");touchId("mapLevelsPrev");truth("BlastNexaWorldPage().first===1");
  truth("!document.getElementById('mapLevel1').disabled && document.getElementById('mapLevel2').disabled");
  touchId("mapLevel1");waitFor("document.getElementById('game').style.display==='flex'",10000);
  truth("(()=>{const b=document.getElementById('boardShell').getBoundingClientRect(),a=document.querySelector('#game .bn-wide-game').getBoundingClientRect();return Math.abs(b.left+b.width/2-a.left-a.width/2)<2&&Math.abs(b.width-b.height)<2&&b.top>=0&&b.bottom<=innerHeight;})()");
  capture("33_centred_puzzle_board");truth("window.__qaErrors.length===0");
 }

 @Test public void w_v34TimedCoinCollection()throws Exception{
  truth("[...document.querySelectorAll('#bnPrimaryGames>button')].map(n=>n.id).join(',')==='openLifeSlot,openPuzzle,openWords'");
  capture("34_trio_home");slotFixture("temple","lite");touchId("slotSpinButton");waitFor("!!bnSupernovaRun",12000);
  truth("!!document.getElementById('snHourglass') && lifeData.slot.rush.active.endsAt-lifeData.slot.rush.active.startedAt===10000 && !document.getElementById('snRevealAll')");
  touchId("snCoin0");truth("lifeData.slot.rush.active.claimed.length===1");
  js("window.__rushSaved=JSON.stringify([lifeData.slot.wallet.balance,lifeData.balance,coinRushTokens()]);true");
  waitFor("!!document.getElementById('snSummary')",15000);
  truth("lifeData.slot.rush.active.state==='closed' && JSON.stringify([lifeData.slot.wallet.balance,lifeData.balance,coinRushTokens()])===window.__rushSaved && !coinRushClaim(lifeData.slot.rush.active.id,1)");
  capture("34_timed_bonus_summary");touchId("snContinue");truth("!slotBusy && !bnSupernovaRun");
  js("saveLives();true");recreateActivity();truth("lifeData.slot.rush.active.state==='closed' && !bnSupernovaRun");
 }

 @Test public void x_v38SmoothTenSecondRifleBonus()throws Exception{
  truth("[...document.querySelectorAll('#bnPrimaryGames>button')].map(n=>n.id).join(',')==='openLifeSlot,openPuzzle,openWords'");
  // Accessibility discovery can take longer than the real ten-second round.
  // Preflight the unchanged layout using actual UI-tree bounds, then inject
  // the live shot immediately. Never extend or pause the production clock.
  slotFixture("temple","lite");android.graphics.Rect spin=touchBounds("slotSpinButton",true);rawTouch(spin.centerX(),spin.centerY());waitFor("!!bnSupernovaRun",8000);
  android.graphics.Rect target=touchBounds("snCoin0",true);android.graphics.Rect weapon=touchBounds("snRifle",true);android.graphics.Rect gallery=touchBounds("snCoinGrid",true);
  // Resolve the moved weapon before the measured round; UIAutomator may
  // spend eight seconds waiting for this continuously animated screen to idle.
  slotFixture("temple","lite");awaitTouchFrame();rawTouch(spin.centerX(),spin.centerY());waitFor("!!bnSupernovaRun && bnSupernovaRun.ready",8000);
  js("(()=>{const r=document.getElementById('snCoin0').getBoundingClientRect();bnRushAim(bnSupernovaRun,r.left+r.width/2,r.top+r.height/2);return true;})()");awaitTouchFrame();
  android.graphics.Rect aimedWeapon=touchBounds("snRifle",true);
  slotFixture("temple","lite");awaitTouchFrame();
  js("window.__shotEvents=[];for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>{if(bnSupernovaRun&&window.__shotEvents.length<40)window.__shotEvents.push({type,at:Date.now(),button:e.button,pointerType:e.pointerType,primary:e.isPrimary,target:e.target.id,left:lifeData.slot.rush.active.endsAt-Date.now()});},true);true");
  rawTouch(spin.centerX(),spin.centerY());waitFor("!!bnSupernovaRun",8000);
  truth("!!document.getElementById('snRifle') && !!document.getElementById('snHourglass') && lifeData.slot.rush.active.endsAt-lifeData.slot.rush.active.startedAt===10000");
  waitFor("bnSupernovaRun.ready===true",3000);
  float sx=weapon.centerX(),sy=weapon.centerY(),ex=sx+(target.centerX()-gallery.centerX())/1f,ey=sy+(target.centerY()-gallery.centerY())/1f;
  long down=android.os.SystemClock.uptimeMillis();
  for(int i=0;i<=10;i++){int action=i==0?android.view.MotionEvent.ACTION_DOWN:i==10?android.view.MotionEvent.ACTION_UP:android.view.MotionEvent.ACTION_MOVE;android.view.MotionEvent event=android.view.MotionEvent.obtain(down,android.os.SystemClock.uptimeMillis(),action,sx+(ex-sx)*Math.min(i,9)/9f,sy+(ey-sy)*Math.min(i,9)/9f,0);event.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);assertTrue(androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(event,true));event.recycle();Thread.sleep(18);}
  truth("lifeData.slot.rush.active.shots===0 && bnSupernovaRun.aimIndex===0");rawTouch(aimedWeapon.centerX(),aimedWeapon.centerY());Thread.sleep(170);
  writeEvidence("37_live_shot.json",js("JSON.stringify({round:lifeData.slot.rush.active,now:Date.now(),events:window.__shotEvents})"));
  truth("lifeData.slot.rush.active.shots===1 && lifeData.slot.rush.active.claimed.length===1");
  js("window.__shotSaved=JSON.stringify([lifeData.slot.wallet.balance,lifeData.balance,coinRushTokens()]);true");
  waitFor("!!document.getElementById('snSummary')",10000);
  truth("lifeData.slot.rush.active.state==='closed' && JSON.stringify([lifeData.slot.wallet.balance,lifeData.balance,coinRushTokens()])===window.__shotSaved && !coinRushClaim(lifeData.slot.rush.active.id,1)");
  capture("37_rifle_bonus_summary");touchId("snContinue");truth("!slotBusy && !bnSupernovaRun");
  js("saveLives();true");recreateActivity();truth("lifeData.slot.rush.active.state==='closed' && !bnSupernovaRun");
 }

 @Test public void z_v38LeverageSelection()throws Exception{
  slotFixture("temple","lite");touchId("slotLines10");touchId("slotLeverage");touchText("×100");
  truth("slotWager()===100 && slotSpinCoinCost()===1000");capture("38_leverage_100");
  touchId("slotSpinButton");waitFor("lifeData.slot.last && lifeData.slot.last.arcade.wager===100",5000);
  truth("lifeData.slot.last.coinCost===1000 && lifeData.slot.last.coinPrize===25000 && lifeData.slot.last.credited===500");
 }

}



