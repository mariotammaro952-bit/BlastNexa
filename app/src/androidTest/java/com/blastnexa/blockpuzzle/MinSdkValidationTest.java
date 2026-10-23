package com.blastnexa.blockpuzzle;

import android.content.Intent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.Until;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Minimum supported Android smoke test. DOM clicks exercise the bundled game;
 * native lifecycle, alarm registration and pre-channel notifications are real. */
@RunWith(AndroidJUnit4.class)
public class MinSdkValidationTest {
 private ActivityScenario<OdysseyActivity> scenario;
 private String js(String code)throws Exception {
  AtomicReference<String> result=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->scenario.onActivity(activity->{try{
   java.lang.reflect.Field field=OdysseyActivity.class.getDeclaredField("game");field.setAccessible(true);
   WebView web=(WebView)field.get(activity);
   if(web==null||web.getProgress()!=100){result.set("null");done.countDown();return;}
   web.evaluateJavascript(code,value->{result.set(value);done.countDown();});
  }catch(Exception error){throw new RuntimeException(error);}}));
  assertTrue("JavaScript response",done.await(30,TimeUnit.SECONDS));return result.get();
 }
 private void waitFor(String expression)throws Exception {
  long until=android.os.SystemClock.uptimeMillis()+45000;
  while(android.os.SystemClock.uptimeMillis()<until){if("true".equals(js("Boolean("+expression+")")))return;Thread.sleep(150);}
  fail("Timed out: "+expression);
 }
 @Test public void minimumAndroidLaunchSlotPersistenceAndInvitations()throws Exception {
  assertEquals("This workflow exercises the declared minimum",24,android.os.Build.VERSION.SDK_INT);
  Intent intent=new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(),OdysseyActivity.class).putExtra("bn_qa_no_ads",true);
  scenario=ActivityScenario.launch(intent);
  UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
  try {
   androidx.test.uiautomator.UiObject2 education=device.wait(Until.findObject(By.text("Got it")),3000);
   if(education!=null)education.click();
   waitFor("document.readyState==='complete'");
   android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
   if(!"true".equals(js("typeof playerTotals==='function'"))) {
    assertTrue("Old provider must show a native update screen",device.wait(Until.hasObject(By.text("Aggiorna il motore del gioco")),15000));
    assertNotNull(device.findObject(By.text("AGGIORNA")));assertNotNull(device.findObject(By.text("ESCI")));
    AtomicReference<OdysseyActivity> original=new AtomicReference<>();scenario.onActivity(original::set);
    js("localStorage.setItem('__minimum_qa_saved','kept');true");device.findObject(By.text("RIPROVA")).click();
    java.util.concurrent.atomic.AtomicBoolean changed=new java.util.concurrent.atomic.AtomicBoolean();long until=android.os.SystemClock.uptimeMillis()+20000;
    while(!changed.get()&&android.os.SystemClock.uptimeMillis()<until){try{scenario.onActivity(activity->changed.set(activity!=original.get()));}catch(IllegalStateException transition){}Thread.sleep(100);}
    assertTrue("Retry recreates the native Activity",changed.get());waitFor("document.readyState==='complete'");
    assertTrue(device.wait(Until.hasObject(By.text("Aggiorna il motore del gioco")),15000));assertEquals("\"kept\"",js("localStorage.getItem('__minimum_qa_saved')"));
    java.io.File folder=new java.io.File(context.getExternalFilesDir(null),"minimum-sdk");assertTrue(folder.isDirectory()||folder.mkdirs());assertTrue(device.takeScreenshot(new java.io.File(folder,"android7-upgrade-required.png")));
    try(java.io.FileOutputStream output=new java.io.FileOutputStream(new java.io.File(folder,"result.json"))){output.write("{\"api\":24,\"legacyProvider\":true,\"gameLaunch\":false,\"nativeUpgradeScreen\":true,\"retryRecreatesActivity\":true,\"localStorageRetained\":true,\"updatedWebViewGameNotTested\":true}".getBytes("UTF-8"));}
    return;
   }
   waitFor("innerWidth>innerHeight");
   assertEquals("true",js("Boolean(lifeData.slot.wallet.balance===100&&document.getElementById('openLifeSlot'))"));
   js("window.__minErrors=[];window.addEventListener('error',e=>window.__minErrors.push(e.message));muted=true;playerSettings.effects='lite';localStorage.setItem('blastnexa_help_seen','true');openUniverse('slot');slotRandomInt=()=>0;true");
   int[] lines={1,5,10};String[] worlds={"temple","crystal","forge"};int coins=100;
   for(int i=0;i<worlds.length;i++) {
    js("setArcadeMachine('"+worlds[i]+"');setSlotLineCount("+lines[i]+");document.getElementById('slotSpinButton').click();true");
    waitFor("!slotBusy");coins-=lines[i];
    assertEquals(String.valueOf(coins),js("lifeData.slot.wallet.balance"));
    assertEquals("15",js("document.querySelectorAll('.bn-temple-cell').length"));
   }
   String lives=js("lifeData.balance"),total=js("lifeData.slot.total");js("saveLives();true");
   scenario.recreate();waitFor("document.readyState==='complete'&&typeof lifeData!=='undefined'&&innerWidth>innerHeight");
   assertEquals(String.valueOf(coins),js("lifeData.slot.wallet.balance"));assertEquals(lives,js("lifeData.balance"));assertEquals(total,js("lifeData.slot.total"));
   OdysseyReminders.scheduleAll(context);
   for(int slot=0;slot<3;slot++)assertTrue(OdysseyReminders.preferences(context).getLong("next_"+slot,0)>System.currentTimeMillis());
   android.app.NotificationManager manager=context.getSystemService(android.app.NotificationManager.class);assertTrue(manager.areNotificationsEnabled());
   java.util.Calendar now=java.util.Calendar.getInstance();now.set(java.util.Calendar.HOUR_OF_DAY,10);now.set(java.util.Calendar.MINUTE,0);
   long stamp=now.getTimeInMillis();OdysseyReminders.preferences(context).edit().remove("last_0").commit();
   assertTrue("Pre-channel notification posted",OdysseyReminders.deliver(context,0,OdysseyReminders.dayKey(stamp),stamp));
   boolean found=false;for(android.service.notification.StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==OdysseyReminders.BASE_ID)found=true;
   assertTrue("Notification visible to Android",found);assertFalse("Duplicate suppressed",OdysseyReminders.deliver(context,0,OdysseyReminders.dayKey(stamp),stamp));manager.cancelAll();
   java.io.File folder=new java.io.File(context.getExternalFilesDir(null),"minimum-sdk");assertTrue(folder.isDirectory()||folder.mkdirs());
   assertTrue(device.takeScreenshot(new java.io.File(folder,"android7-after-recreation.png")));
   try(java.io.FileOutputStream output=new java.io.FileOutputStream(new java.io.File(folder,"result.json"))){output.write(("{\"api\":24,\"launch\":true,\"threeWorlds\":true,\"remainingCoins\":"+coins+",\"recreation\":true,\"threeAlarms\":true,\"nativeNotification\":true,\"duplicateSuppressed\":true}").getBytes("UTF-8"));}
  } finally {if(scenario!=null)scenario.close();}
 }
}
