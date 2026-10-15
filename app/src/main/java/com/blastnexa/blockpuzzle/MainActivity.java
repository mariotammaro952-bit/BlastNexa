package com.blastnexa.blockpuzzle;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
import android.view.ViewGroup;
import android.view.WindowManager;

/** Bundled game; network is used by native ads and consent only. */
public final class MainActivity extends Activity {
    private WebView game;
    private AdsController ads;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().setStatusBarColor(Color.rgb(12,21,51));
        getWindow().setNavigationBarColor(Color.rgb(12,21,51));
        game = new WebView(this);
        game.setLayoutParams(new ViewGroup.LayoutParams(-1,-1));
        game.setBackgroundColor(Color.rgb(12,21,51));
        game.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) { return true; }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return true; }
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, android.webkit.WebResourceRequest request) {
                if ("file:///android_asset/index.html".equals(request.getUrl().toString())) return null;
                return new android.webkit.WebResourceResponse("text/plain", "UTF-8", new java.io.ByteArrayInputStream(new byte[0]));
            }
            @Override public void onPageFinished(WebView view, String url) { if (ads != null) ads.syncStatus(); }
        });
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        ads = new AdsController(this, script -> { if (game != null) game.evaluateJavascript(script, null); });
        game.addJavascriptInterface(ads, "BlastNexaAds");
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        setContentView(game);
        game.loadUrl("file:///android_asset/index.html");
        ads.start();
    }

    @Override @Deprecated public void onBackPressed() {
        if (game == null) { super.onBackPressed(); return; }
        game.evaluateJavascript("(window.BlastNexaBack ? window.BlastNexaBack() : 'exit')", result -> {
            if ("\"exit\"".equals(result)) MainActivity.super.onBackPressed();
        });
    }
    @Override protected void onPause() {
        if (game != null) {
            game.evaluateJavascript("window.BlastNexaSave && window.BlastNexaSave()", null);
            game.onPause();
        }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (game != null) game.onResume();
    }
    @Override protected void onDestroy() {
        if (ads != null) ads.destroy();
        if (game != null) {
            if (game.getParent() instanceof ViewGroup)
                ((ViewGroup) game.getParent()).removeView(game);
            game.destroy();
            game = null;
        }
        super.onDestroy();
    }
}
