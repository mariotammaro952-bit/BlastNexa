package com.blastnexa.blockpuzzle;

import android.content.Intent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.uiautomator.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Real Google demo creative and SDK callbacks. The consent service is an
 * explicit test adapter; no production ad unit or real consent UI is tested. */
@RunWith(AndroidJUnit4.class)
public class AdsSdkValidationTest {
 private final UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
 private WebView web;
 private OdysseyAds ads;
 private ActivityScenario<OdysseyActivity> activeScenario;
 private String js(String code)throws Exception{
  AtomicReference<String> value=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->activeScenario.onActivity(activity->{try{
   java.lang.reflect.Field w=OdysseyActivity.class.getDeclaredField("game"),a=OdysseyActivity.class.getDeclaredField("ads");w.setAccessible(true);a.setAccessible(true);web=(WebView)w.get(activity);ads=(OdysseyAds)a.get(activity);web.evaluateJavascript(code,r->{value.set(r);done.countDown();});
  }catch(Exception error){throw new RuntimeException(error);}}));
  assertTrue(done.await(30,TimeUnit.SECONDS));return value.get();
 }
 private void waitJs(String code,long timeout)throws Exception{long end=android.os.SystemClock.uptimeMillis()+timeout;while(android.os.SystemClock.uptimeMillis()<end){if("true".equals(js("Boolean("+code+")")))return;Thread.sleep(250);}fail("Timed out: "+code);}
 private void capture(String name)throws Exception{File dir=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"sdk-smoke");dir.mkdirs();device.takeScreenshot(new File(dir,name+".png"));device.dumpWindowHierarchy(new File(dir,name+".xml"));}
 @Test public void rewardedGoogleDemoGrantsOneHundredCoins()throws Exception{
  assertEquals("preview",BuildConfig.FLAVOR);assertEquals("ca-app-pub-3940256099942544/5224354917",BuildConfig.REWARDED_AD_UNIT);
  android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
  Intent intent=new Intent(context,OdysseyActivity.class).putExtra("bn_qa_no_ads",true);
  androidx.test.uiautomator.Configurator.getInstance().setWaitForIdleTimeout(250);
  try(ActivityScenario<OdysseyActivity> scenario=ActivityScenario.launch(intent)){
   activeScenario=scenario;
   scenario.onActivity(activity->{try{java.lang.reflect.Field w=OdysseyActivity.class.getDeclaredField("game"),a=OdysseyActivity.class.getDeclaredField("ads");w.setAccessible(true);a.setAccessible(true);web=(WebView)w.get(activity);ads=(OdysseyAds)a.get(activity);}catch(Exception error){throw new RuntimeException(error);}});
   waitJs("typeof playerTotals==='function'",45000);
   UiObject2 education=device.wait(Until.findObject(By.text("Got it")),3000);if(education!=null)education.click();
   js("muted=true;localStorage.setItem('blastnexa_help_seen','true');openUniverse('slot');lifeData.slot.wallet.balance=0;lifeData.slot.sinceAd=0;saveLives();openSlotCoinRefill();true");
   // Only the consent dependency is adapted. Initialization, loading, full
   // screen display, playback, reward callback and dismiss all use the SDK.
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{
    java.lang.reflect.Field field=OdysseyAds.class.getDeclaredField("consent");field.setAccessible(true);
    Class<?> type=field.getType();Object consent=java.lang.reflect.Proxy.newProxyInstance(type.getClassLoader(),new Class<?>[]{type},(proxy,method,args)->{
     if(method.getName().equals("canRequestAds"))return true;
     if(method.getReturnType().isEnum())return java.lang.Enum.valueOf((Class)method.getReturnType(),"NOT_REQUIRED");
     if(method.getReturnType()==boolean.class)return false;
     if(method.getReturnType()==int.class)return 3;
     return null;
    });field.set(ads,consent);java.lang.reflect.Method after=OdysseyAds.class.getDeclaredMethod("afterConsent");after.setAccessible(true);after.invoke(ads);
   }catch(Exception error){throw new RuntimeException(error);}});
   java.lang.reflect.Field reward=OdysseyAds.class.getDeclaredField("reward");reward.setAccessible(true);long deadline=android.os.SystemClock.uptimeMillis()+90000;
   while(reward.get(ads)==null&&android.os.SystemClock.uptimeMillis()<deadline)Thread.sleep(250);
   assertNotNull("Google demo rewarded creative must load",reward.get(ads));capture("01_test_reward_loaded");
   UiObject2 video=device.wait(Until.findObject(By.res("dialogPrimary")),7000);assertNotNull(video);video.click();
   waitJs("!!bnPendingAd",10000);int token=Integer.parseInt(js("bnAdToken"));
   Thread.sleep(45000);capture("02_test_video_after_playback");
   if(android.os.Build.VERSION.SDK_INT>=34)InstrumentationRegistry.getInstrumentation().getUiAutomation().clearCache();
   UiObject2 close=device.findObject(By.descMatches("(?i).*(close|chiudi).*"));if(close==null)close=device.findObject(By.textMatches("(?i)(close|chiudi|close ad)"));
   if(close!=null)close.click();else device.pressBack();
   waitJs("!bnPendingAd",20000);assertEquals("100",js("lifeData.slot.wallet.balance"));assertEquals("0",js("lifeData.slot.total"));
   js("window.BlastNexaAdResult("+token+",true);true");assertEquals("100",js("lifeData.slot.wallet.balance"));capture("03_reward_credited_once");
   File dir=new File(context.getExternalFilesDir(null),"sdk-smoke");java.nio.file.Files.write(new File(dir,"result.json").toPath(),"{\"googleDemoSdkPlayback\":true,\"realSdkEarnedCallback\":true,\"coinsGranted\":100,\"duplicateBlocked\":true,\"consentAdapter\":true,\"productionAdDelivery\":false}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
  }finally{capture("04_final_sdk_state");}
 }
}
