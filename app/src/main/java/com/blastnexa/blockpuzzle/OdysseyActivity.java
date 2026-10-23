package com.blastnexa.blockpuzzle;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;
import org.json.JSONArray;
import org.json.JSONObject;

/** Bundled game with native ads, bounded HTTPS ranking and renderer recovery. */
public final class OdysseyActivity extends Activity {
    private static final String GAME_URL = "file:///android_asset/index.html";
    private WebView game;
    private FrameLayout root;
    private OdysseyAds ads;
    private OdysseyRanking ranking;
    private boolean pageReady;
    private boolean backPending;
    private boolean foreground;
    private boolean invitePermissionPending;
    private int safeLeft,safeRight;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        OdysseyReminders.scheduleAll(this);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.rgb(8,19,43));
        getWindow().setNavigationBarColor(Color.rgb(8,19,43));
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8,19,43));
        root.setOnApplyWindowInsetsListener((v,insets) -> {
            // Paint through the camera cutout instead of reserving an empty
            // native strip. Only the game's controls need the safe inset.
            safeLeft=0;safeRight=0;
            if(Build.VERSION.SDK_INT>=28 && insets.getDisplayCutout()!=null){
                safeLeft=insets.getDisplayCutout().getSafeInsetLeft();
                safeRight=insets.getDisplayCutout().getSafeInsetRight();
            }
            v.setPadding(0,0,0,0);applySafeArea();
            return insets;
        });
        game = new WebView(this);
        game.setBackgroundColor(Color.rgb(8,19,43));
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setTextZoom(100);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        root.addView(game,new FrameLayout.LayoutParams(-1,-1));
        ads = new OdysseyAds(this,root,game,this::evaluate);
        ranking = new OdysseyRanking(this,this::evaluate);
        Bridge bridge = new Bridge();
        game.addJavascriptInterface(bridge,"BlastNexaAds");
        game.addJavascriptInterface(bridge,"BlastNexaNative");
        game.setWebViewClient(Build.VERSION.SDK_INT>=26?new RecoveryClient():new GameClient());
        game.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                if(message.messageLevel()==ConsoleMessage.MessageLevel.ERROR) android.util.Log.e("BlastNexa-Web",message.message());
                return true;
            }
        });
        setContentView(root);
        enterImmersiveMode();
        root.requestApplyInsets();
        if(Build.VERSION.SDK_INT>=33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::requestBack);
        }
        game.loadUrl(GAME_URL);
    }


    private boolean requestInviteNotificationPermission() {
        if(invitePermissionPending)return true;
        if(Build.VERSION.SDK_INT<33 || !foreground || isFinishing() || isDestroyed())return false;
        if(BuildConfig.DEBUG && getIntent().getBooleanExtra("bn_qa_no_ads",false))return false;
        if(checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)==android.content.pm.PackageManager.PERMISSION_GRANTED)return false;
        android.content.SharedPreferences prefs=OdysseyReminders.preferences(this);
        if(prefs.getBoolean("permission_asked",false))return false;
        prefs.edit().putBoolean("permission_asked",true).apply();
        invitePermissionPending=true;
        requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},7907);
        return true;
    }
    private void startAdsWhenReady() {
        if(!pageReady || !foreground || invitePermissionPending || ads==null || isFinishing() || isDestroyed())return;
        if(BuildConfig.DEBUG && getIntent().getBooleanExtra("bn_qa_no_ads",false))return;
        ads.start();
    }
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults) {
        super.onRequestPermissionsResult(requestCode,permissions,grantResults);
        if(requestCode==7907){invitePermissionPending=false;OdysseyReminders.scheduleAll(this);if(game!=null)game.post(this::startAdsWhenReady);}
    }

    private class GameClient extends WebViewClient {
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                Uri uri=request.getUrl();
                if(GAME_URL.equals(uri.toString())) return false;
                if(request.isForMainFrame() && ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); } catch(Exception ignored) {}
                }
                return true;
            }
            @Override public void onPageFinished(WebView view,String url) {
                if(view!=game || ads==null || isDestroyed() || !GAME_URL.equals(url)) return;
                pageReady=true;
                boolean askingPermission=requestInviteNotificationPermission();
                applySafeArea();
                evaluate("navigator.vibrate=function(p){window.BlastNexaNative.vibrate(JSON.stringify(p));return true;};"
                    +"window.BlastNexaBannerReady&&window.BlastNexaBannerReady();");
                // Permission and consent dialogs share the Activity: finish
                // the Android prompt before UMP attempts to show its form.
                if(!askingPermission)startAdsWhenReady();
            }

    }
    /** API 26+: a lost renderer must not take down the native host. */
    @android.annotation.TargetApi(26)
    private final class RecoveryClient extends GameClient {
        @Override public boolean onRenderProcessGone(WebView view,android.webkit.RenderProcessGoneDetail detail) {
            pageReady=false;
            android.util.Log.e("BlastNexa-Recovery","WebView interrupted; native recovery shown; crashed="+detail.didCrash());
            if(ads!=null){ads.destroy();ads=null;}
            if(ranking!=null){ranking.destroy();ranking=null;}
            view.removeJavascriptInterface("BlastNexaAds");view.removeJavascriptInterface("BlastNexaNative");
            root.removeView(view);view.destroy();if(game==view)game=null;
            if(!isFinishing()&&!isDestroyed())new AlertDialog.Builder(OdysseyActivity.this)
                .setTitle("Riapri BlastNexa")
                .setMessage("Il gioco è stato interrotto. Puoi riaprirlo per recuperare i progressi salvati.")
                .setCancelable(false).setPositiveButton("RIAPRI",(dialog,which)->recreate())
                .setNegativeButton("ESCI",(dialog,which)->finish()).show();
            return true;
        }
    }

    void evaluate(String script) {
        runOnUiThread(() -> { if(game!=null && pageReady && !isDestroyed()) game.evaluateJavascript(script,null); });
    }

    private void applySafeArea() {
        float density=getResources().getDisplayMetrics().density;
        evaluate("document.documentElement.style.setProperty('--bn-safe-left','"+(safeLeft/density)+"px');"
            +"document.documentElement.style.setProperty('--bn-safe-right','"+(safeRight/density)+"px');"
            +"window.BlastNexaBannerReady&&window.BlastNexaBannerReady();");
    }

    private void requestBack() {
        if(backPending || game==null) return;
        if(!pageReady) { finish(); return; }
        backPending=true;
        game.evaluateJavascript("(window.BlastNexaBack?window.BlastNexaBack():'exit')",result -> {
            backPending=false;
            if("\"exit\"".equals(result)) new AlertDialog.Builder(this)
                .setTitle("Uscire da BlastNexa?").setMessage("I tuoi progressi sono salvati.")
                .setNegativeButton("RESTA",(dialog,which)->{})
                .setPositiveButton("ESCI",(dialog,which)->finish()).show();
        });
    }

    @Override public void onBackPressed() { requestBack(); }
    @Override public void onConfigurationChanged(Configuration configuration) {
        super.onConfigurationChanged(configuration);
        // The responsive game handles viewport changes in place. Recreating
        // its WebView here would interrupt a spin or the return from an ad.
        enterImmersiveMode();
        if(root!=null)root.requestApplyInsets();
        evaluate("window.BlastNexaBannerReady&&window.BlastNexaBannerReady();");
    }
    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) enterImmersiveMode();
        if(ads!=null) ads.setActive(focused && foreground);
        if(pageReady) evaluate(focused?"window.dispatchEvent(new Event('focus'));"
            :"if(typeof stopSlotAuto==='function')stopSlotAuto();window.dispatchEvent(new Event('blur'));");
    }

    /** The edge swipe still reveals Android controls; the game keeps its full landscape area. */
    @SuppressWarnings("deprecation")
    private void enterImmersiveMode() {
        if(Build.VERSION.SDK_INT>=28){
            WindowManager.LayoutParams attributes=getWindow().getAttributes();
            if(attributes.layoutInDisplayCutoutMode!=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES){
                attributes.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                getWindow().setAttributes(attributes);
            }
        }
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }
    @Override protected void onPause() {
        foreground=false;
        if(ads!=null) ads.setActive(false);
        evaluate("window.dispatchEvent(new Event('blur'));if(typeof cancelSlotAnimation==='function')cancelSlotAnimation();"
            +"window.BlastNexaSave&&window.BlastNexaSave();");
        if(game!=null) game.onPause();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();foreground=true;
        OdysseyReminders.scheduleAll(this);
        if(game!=null) game.onResume();
        if(ads!=null) ads.setActive(hasWindowFocus());
        if(pageReady&&!requestInviteNotificationPermission())startAdsWhenReady();
        if(pageReady) evaluate("window.dispatchEvent(new Event('focus'));"
            +"if(typeof slotVisible==='function'&&slotVisible()&&!bnPendingAd)renderLifeSlot(document.getElementById('universeBody'));"
            +"window.BlastNexaBannerReady&&window.BlastNexaBannerReady();");
    }
    @Override protected void onDestroy() {
        if(ads!=null) ads.destroy();
        if(ranking!=null) ranking.destroy();
        pageReady=false;
        if(game!=null) { game.removeJavascriptInterface("BlastNexaAds");game.removeJavascriptInterface("BlastNexaNative");root.removeView(game);game.destroy();game=null; }
        super.onDestroy();
    }

    public final class Bridge {
        @JavascriptInterface public void rankingRequest(int id,String payload) { if(ranking!=null)ranking.request(id,payload); }
        @JavascriptInterface public void betweenRounds(int token) { runOnUiThread(()->{if(ads!=null)ads.betweenRounds(token);}); }
        @JavascriptInterface public void slotBreak(int token) { runOnUiThread(()->{if(ads!=null)ads.slotBreak(token);}); }
        @JavascriptInterface public void rewarded(int token) { runOnUiThread(()->{if(ads!=null)ads.rewarded(token);}); }
        @JavascriptInterface public void privacyOptions() { runOnUiThread(()->{if(ads!=null)ads.privacyOptions();}); }
        @JavascriptInterface public void syncStatus() { runOnUiThread(()->{if(ads!=null)ads.syncStatus();}); }
        @JavascriptInterface public void bannerLayout(String payload) { runOnUiThread(()->{if(ads!=null)ads.bannerLayout(payload);}); }
        @JavascriptInterface public void vibrate(String payload) {
            runOnUiThread(()->{
                try {
                    JSONArray values=payload.startsWith("[")?new JSONArray(payload):new JSONArray("["+payload+"]");
                    int count=Math.min(16,values.length());if(count==0)return;
                    long[] pattern=new long[count+1];for(int i=0;i<count;i++)pattern[i+1]=Math.max(0,Math.min(300,values.optLong(i)));
                    Vibrator vibrator=(Vibrator)getSystemService(VIBRATOR_SERVICE);if(vibrator==null||!vibrator.hasVibrator())return;
                    if(Build.VERSION.SDK_INT>=26)vibrator.vibrate(VibrationEffect.createWaveform(pattern,-1));else vibrator.vibrate(pattern,-1);
                } catch(Exception ignored) {}
            });
        }
    }
}
