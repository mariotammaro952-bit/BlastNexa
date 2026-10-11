package com.blastnexa.blockpuzzle;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
import android.view.ViewGroup;
import android.view.WindowManager;

/** Offline BlastNexa prototype: bundled original HTML/JS, no Internet permission. */
public final class MainActivity extends Activity {
    private WebView game;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().setStatusBarColor(Color.rgb(12,21,51));
        getWindow().setNavigationBarColor(Color.rgb(12,21,51));
        game = new WebView(this);
        game.setLayoutParams(new ViewGroup.LayoutParams(-1,-1));
        game.setBackgroundColor(Color.rgb(12,21,51));
        game.setWebViewClient(new WebViewClient());
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        setContentView(game);
        game.loadUrl("file:///android_asset/index.html");
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
        if (game != null) {
            if (game.getParent() instanceof ViewGroup)
                ((ViewGroup) game.getParent()).removeView(game);
            game.destroy();
            game = null;
        }
        super.onDestroy();
    }
}
