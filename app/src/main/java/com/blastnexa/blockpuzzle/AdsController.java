package com.blastnexa.blockpuzzle;

import android.app.Activity;
import android.os.SystemClock;
import android.webkit.JavascriptInterface;
import com.google.android.libraries.ads.mobile.sdk.MobileAds;
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig;
import com.google.android.libraries.ads.mobile.sdk.common.*;
import com.google.android.libraries.ads.mobile.sdk.rewarded.*;
import com.google.android.libraries.ads.mobile.sdk.interstitial.*;
import com.google.android.ump.*;

/** All mutable state is confined to the UI thread; the bridge only accepts integer tokens. */
public final class AdsController {
    static final String APP_ID = "ca-app-pub-7428534984744854~6791579488";
    static final String REWARDED_ID = BuildConfig.LIVE_ADS
        ? "ca-app-pub-7428534984744854/7070781083" : "ca-app-pub-3940256099942544/5224354917";
    static final String INTERSTITIAL_ID = BuildConfig.LIVE_ADS
        ? "ca-app-pub-7428534984744854/2281488833" : "ca-app-pub-3940256099942544/1033173712";
    interface Events { void evaluate(String script); }
    private final Activity activity;
    private final Events events;
    private final ConsentInformation consent;
    private RewardedAd reward;
    private InterstitialAd interstitial;
    private boolean starting, initialized, destroyed, busy, loadingReward, loadingInterstitial;
    private int generation, rounds;
    private long rewardLoaded, interstitialLoaded, lastAd = SystemClock.elapsedRealtime();
    private static final long EXPIRY = 50 * 60 * 1000L;

    AdsController(Activity activity, Events events) {
        this.activity = activity; this.events = events;
        consent = UserMessagingPlatform.getConsentInformation(activity);
    }
    private void ui(Runnable task) { activity.runOnUiThread(() -> { if (!destroyed) task.run(); }); }
    void start() {
        consent.requestConsentInfoUpdate(activity, new ConsentRequestParameters.Builder().build(),
            () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, error -> ui(this::afterConsent)),
            error -> ui(this::afterConsent));
    }
    private boolean allowed() { return !destroyed && !busy && consent.canRequestAds(); }
    private void afterConsent() {
        sync();
        if (!consent.canRequestAds()) return;
        if (initialized) { preload(); return; }
        if (starting) return;
        starting = true;
        new Thread(() -> MobileAds.initialize(activity.getApplicationContext(),
            new InitializationConfig.Builder(APP_ID).build(), status -> ui(() -> {
                initialized = true; starting = false; preload();
            })), "BlastNexa-Ads").start();
    }
    @JavascriptInterface public void syncStatus() { ui(this::sync); }
    private void sync() {
        boolean required = consent.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
        events.evaluate("window.BlastNexaPrivacyStatus && window.BlastNexaPrivacyStatus(" + required + ")");
    }
    @JavascriptInterface public void privacyOptions() { ui(() -> {
        if (busy) return;
        if (consent.getPrivacyOptionsRequirementStatus() != ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED) { start(); return; }
        generation++; reward = null; interstitial = null; loadingReward = loadingInterstitial = false;
        busy = true;
        UserMessagingPlatform.showPrivacyOptionsForm(activity, error -> ui(() -> { busy = false; afterConsent(); }));
    }); }
    private void preload() {
        if (!initialized || !allowed()) return;
        int requestGeneration = generation;
        if (reward == null && !loadingReward) {
            loadingReward = true;
            RewardedAd.load(new AdRequest.Builder(REWARDED_ID).build(), new AdLoadCallback<RewardedAd>() {
                @Override public void onAdLoaded(RewardedAd ad) { ui(() -> {
                    if (requestGeneration != generation) return;
                    loadingReward = false;
                    if (consent.canRequestAds()) { reward = ad; rewardLoaded = SystemClock.elapsedRealtime(); }
                }); }
                @Override public void onAdFailedToLoad(LoadAdError error) { ui(() -> { if (requestGeneration == generation) loadingReward = false; }); }
            });
        }
        if (interstitial == null && !loadingInterstitial) {
            loadingInterstitial = true;
            InterstitialAd.load(new AdRequest.Builder(INTERSTITIAL_ID).build(), new AdLoadCallback<InterstitialAd>() {
                @Override public void onAdLoaded(InterstitialAd ad) { ui(() -> {
                    if (requestGeneration != generation) return;
                    loadingInterstitial = false;
                    if (consent.canRequestAds()) { interstitial = ad; interstitialLoaded = SystemClock.elapsedRealtime(); }
                }); }
                @Override public void onAdFailedToLoad(LoadAdError error) { ui(() -> { if (requestGeneration == generation) loadingInterstitial = false; }); }
            });
        }
    }
    private void complete(int token, boolean earned) {
        events.evaluate("window.BlastNexaAdResult && window.BlastNexaAdResult(" + token + "," + earned + ")");
    }
    @JavascriptInterface public void rewarded(int token) { ui(() -> {
        if (busy) { complete(token, false); return; }
        if (SystemClock.elapsedRealtime() - rewardLoaded > EXPIRY) reward = null;
        if (!allowed() || reward == null || !activity.hasWindowFocus()) { complete(token, false); preload(); return; }
        RewardedAd ad = reward; reward = null; busy = true;
        // Listener is the only source of rewards. Deliver after dismissal, once.
        final boolean[] earned = {false};
        final boolean[] done = {false};
        ad.setAdEventCallback(new RewardedAdEventCallback() {
            private void finish() { ui(() -> {
                if (done[0]) return; done[0] = true; busy = false;
                complete(token, earned[0]); preload();
            }); }
            @Override public void onAdDismissedFullScreenContent() { finish(); }
            @Override public void onAdFailedToShowFullScreenContent(FullScreenContentError error) { finish(); }
            @Override public void onAdShowedFullScreenContent() { ui(() -> lastAd = SystemClock.elapsedRealtime()); }
        });
        ad.show(activity, item -> ui(() -> { if (!done[0]) earned[0] = true; }));
    }); }
    @JavascriptInterface public void betweenRounds(int token) { ui(() -> {
        rounds++;
        long now = SystemClock.elapsedRealtime();
        if (now - interstitialLoaded > EXPIRY) interstitial = null;
        if (!allowed() || rounds < 3 || now - lastAd < 180000 || interstitial == null || !activity.hasWindowFocus()) {
            complete(token, false); preload(); return;
        }
        InterstitialAd ad = interstitial; interstitial = null; busy = true;
        ad.setAdEventCallback(new InterstitialAdEventCallback() {
            boolean done;
            private void finish() { ui(() -> {
                if (done) return; done = true; busy = false; complete(token, false); preload();
            }); }
            @Override public void onAdDismissedFullScreenContent() { finish(); }
            @Override public void onAdFailedToShowFullScreenContent(FullScreenContentError error) { finish(); }
            @Override public void onAdShowedFullScreenContent() { ui(() -> { lastAd = SystemClock.elapsedRealtime(); rounds = 0; }); }
        });
        ad.show(activity);
    }); }
    void destroy() { destroyed = true; generation++; reward = null; interstitial = null; }
}
