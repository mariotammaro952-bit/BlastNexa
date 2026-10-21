package com.blastnexa.blockpuzzle;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.View;
import android.webkit.WebView;
import android.widget.FrameLayout;
import com.google.android.libraries.ads.mobile.sdk.MobileAds;
import com.google.android.libraries.ads.mobile.sdk.banner.AdSize;
import com.google.android.libraries.ads.mobile.sdk.banner.AdView;
import com.google.android.libraries.ads.mobile.sdk.banner.BannerAd;
import com.google.android.libraries.ads.mobile.sdk.banner.BannerAdRequest;
import com.google.android.libraries.ads.mobile.sdk.common.AdLoadCallback;
import com.google.android.libraries.ads.mobile.sdk.common.AdRequest;
import com.google.android.libraries.ads.mobile.sdk.common.FullScreenContentError;
import com.google.android.libraries.ads.mobile.sdk.common.LoadAdError;
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig;
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAd;
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAdEventCallback;
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAd;
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAdEventCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

/** Build flavors keep QA ad units separate. The game owns the persisted fifty-spin cadence. */
final class OdysseyAds {
    private static final String APP_ID=BuildConfig.AD_APP_ID;
    private static final String BANNER_ID=BuildConfig.BANNER_AD_UNIT;
    private static final String INTERSTITIAL_ID=BuildConfig.INTERSTITIAL_AD_UNIT;
    private static final String REWARDED_ID=BuildConfig.REWARDED_AD_UNIT;
    interface Events { void evaluate(String script); }
    private final Activity activity;
    private final FrameLayout root;
    private final WebView web;
    private final Events events;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final ConsentInformation consent;
    private final Set<Integer> completed=new HashSet<>();
    private boolean started,initializing,initialized,destroyed,busy,active;
    private boolean loadingInterstitial,loadingReward,loadingBanner,bannerLoaded;
    private InterstitialAd interstitial;
    private RewardedAd reward;
    private AdView banner;
    private FrameLayout bannerHost;
    private JSONObject layout;
    private int bannerWidth,rounds,adEpoch;
    private long interstitialLoaded,rewardLoaded,lastAd=SystemClock.elapsedRealtime(),lastBannerTry;
    private int pendingToken=-1;

    OdysseyAds(Activity activity,FrameLayout root,WebView web,Events events) {
        this.activity=activity;this.root=root;this.web=web;this.events=events;
        consent=UserMessagingPlatform.getConsentInformation(activity);
    }
    private void ui(Runnable task) { if(!destroyed)handler.post(()->{if(!destroyed)task.run();}); }
    void start() {
        if(started||destroyed)return;started=true;
        consent.requestConsentInfoUpdate(activity,new ConsentRequestParameters.Builder().build(),
            ()->UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity,error->ui(this::afterConsent)),
            error->ui(this::afterConsent));
        if(consent.canRequestAds())afterConsent();
    }
    private void afterConsent() {
        syncStatus();
        if(!consent.canRequestAds()||initialized||initializing||destroyed)return;
        initializing=true;
        try {
            MobileAds.initialize(activity.getApplicationContext(),new InitializationConfig.Builder(APP_ID).build(),status->ui(()->{
                initialized=true;initializing=false;preload();applyBanner();
            }));
        } catch(Exception error) { initializing=false;android.util.Log.e("BlastNexa-Ads","SDK initialization unavailable",error); }
    }
    void syncStatus() {
        boolean required=consent.getPrivacyOptionsRequirementStatus()==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
        events.evaluate("window.BlastNexaPrivacyStatus&&window.BlastNexaPrivacyStatus("+required+");");
    }
    void privacyOptions() {
        if(busy||destroyed)return;
        UserMessagingPlatform.showPrivacyOptionsForm(activity,error->ui(()->{
            adEpoch++;loadingInterstitial=false;loadingReward=false;
            if(interstitial!=null){interstitial.destroy();interstitial=null;}
            if(reward!=null){reward.destroy();reward=null;}
            if(banner!=null){banner.destroy();banner=null;}
            if(bannerHost!=null){bannerHost.removeAllViews();bannerHost.setVisibility(View.GONE);}
            bannerLoaded=false;loadingBanner=false;lastBannerTry=0;
            syncStatus();afterConsent();preload();applyBanner();
        }));
    }
    void setActive(boolean value) { active=value;applyBanner();if(value)preload(); }
    private boolean allowed() { return !destroyed&&initialized&&consent.canRequestAds(); }
    private void preload() {
        if(!allowed())return;
        final int epoch=adEpoch;
        if(interstitial==null&&!loadingInterstitial) {
            loadingInterstitial=true;
            InterstitialAd.load(new AdRequest.Builder(INTERSTITIAL_ID).build(),new AdLoadCallback<InterstitialAd>() {
                @Override public void onAdLoaded(InterstitialAd ad) { ui(()->{if(epoch!=adEpoch){ad.destroy();return;}loadingInterstitial=false;if(interstitial!=null)interstitial.destroy();interstitial=ad;interstitialLoaded=SystemClock.elapsedRealtime();}); }
                @Override public void onAdFailedToLoad(LoadAdError error) { ui(()->{if(epoch!=adEpoch)return;loadingInterstitial=false;handler.postDelayed(()->{if(active)preload();},60000);}); }
            });
        }
        if(reward==null&&!loadingReward) {
            loadingReward=true;
            RewardedAd.load(new AdRequest.Builder(REWARDED_ID).build(),new AdLoadCallback<RewardedAd>() {
                @Override public void onAdLoaded(RewardedAd ad) { ui(()->{if(epoch!=adEpoch){ad.destroy();return;}loadingReward=false;if(reward!=null)reward.destroy();reward=ad;rewardLoaded=SystemClock.elapsedRealtime();}); }
                @Override public void onAdFailedToLoad(LoadAdError error) { ui(()->{if(epoch!=adEpoch)return;loadingReward=false;}); }
            });
        }
    }
    private boolean validToken(int token) { return token>0&&!destroyed&&!busy&&!completed.contains(token); }
    private void complete(int token,boolean earned) {
        if(destroyed||completed.contains(token))return;
        completed.add(token);if(completed.size()>256){completed.clear();completed.add(token);}
        if(pendingToken==token)pendingToken=-1;
        busy=false;
        events.evaluate("window.BlastNexaAdResult&&window.BlastNexaAdResult("+token+","+earned+");");
        applyBanner();preload();
    }
    private void showInterstitial(int token,boolean slot) {
        if(!validToken(token))return;
        long now=SystemClock.elapsedRealtime();
        if(interstitial!=null&&now-interstitialLoaded>3000000){interstitial.destroy();interstitial=null;}
        if(!allowed()||!active||!activity.hasWindowFocus()||interstitial==null||!slot&&(rounds<3||now-lastAd<180000)) { complete(token,false);return; }
        InterstitialAd ad=interstitial;interstitial=null;busy=true;pendingToken=token;applyBanner();
        ad.setAdEventCallback(new InterstitialAdEventCallback() {
            @Override public void onAdShowedFullScreenContent() { ui(()->{lastAd=SystemClock.elapsedRealtime();rounds=0;}); }
            @Override public void onAdDismissedFullScreenContent() { ui(()->{ad.destroy();complete(token,false);}); }
            @Override public void onAdFailedToShowFullScreenContent(FullScreenContentError error) { ui(()->{ad.destroy();complete(token,false);}); }
        });
        try { ad.show(activity); } catch(Exception error) { ad.destroy();complete(token,false); }
    }
    void betweenRounds(int token) { rounds++;showInterstitial(token,false); }
    void slotBreak(int token) { showInterstitial(token,true); }
    void rewarded(int token) {
        if(!validToken(token))return;
        if(reward!=null&&SystemClock.elapsedRealtime()-rewardLoaded>3000000){reward.destroy();reward=null;}
        if(!allowed()||!active||!activity.hasWindowFocus()||reward==null){complete(token,false);return;}
        RewardedAd ad=reward;reward=null;busy=true;pendingToken=token;applyBanner();
        final AtomicBoolean earned=new AtomicBoolean(false);
        ad.setAdEventCallback(new RewardedAdEventCallback() {
            @Override public void onAdDismissedFullScreenContent() { ui(()->{ad.destroy();complete(token,earned.get());}); }
            @Override public void onAdFailedToShowFullScreenContent(FullScreenContentError error) { ui(()->{ad.destroy();complete(token,false);}); }
        });
        try { ad.show(activity,item->earned.set(true)); } catch(Exception error) { ad.destroy();complete(token,false); }
    }
    void bannerLayout(String payload) {
        try { layout=new JSONObject(payload);applyBanner(); } catch(Exception ignored) {}
    }
    private void bannerStatus(String status) {
        if(layout==null)return;
        events.evaluate("window.BlastNexaBannerStatus&&window.BlastNexaBannerStatus({session:"
            +layout.optLong("session",-1)+",status:"+JSONObject.quote(status)+"});");
    }
    private void applyBanner() {
        if(destroyed)return;
        boolean visible=layout!=null&&layout.optBoolean("visible")&&active&&!busy;
        int width=layout==null?0:Math.max(0,Math.min(360,(int)Math.floor(layout.optDouble("width",0))));
        if(!visible||width<200||BANNER_ID.isEmpty()||!allowed()) { if(bannerHost!=null)bannerHost.setVisibility(View.GONE);if(BANNER_ID.isEmpty())bannerStatus("unavailable");return; }
        float density=activity.getResources().getDisplayMetrics().density;
        if(bannerHost==null){bannerHost=new FrameLayout(activity);bannerHost.setClipChildren(true);bannerHost.setVisibility(View.GONE);root.addView(bannerHost);}
        FrameLayout.LayoutParams params=new FrameLayout.LayoutParams(Math.round(width*density),Math.round(50*density));
        params.leftMargin=Math.max(0,Math.round((float)layout.optDouble("x")*density));
        params.topMargin=Math.max(0,Math.round((float)layout.optDouble("y")*density));
        bannerHost.setLayoutParams(params);
        if(banner!=null&&bannerWidth!=width){banner.destroy();bannerHost.removeAllViews();banner=null;bannerLoaded=false;loadingBanner=false;}
        bannerWidth=width;
        if(bannerLoaded){bannerHost.setVisibility(View.VISIBLE);bannerStatus("loaded");return;}
        bannerHost.setVisibility(View.GONE);
        if(loadingBanner||lastBannerTry>0&&SystemClock.elapsedRealtime()-lastBannerTry<60000)return;
        lastBannerTry=SystemClock.elapsedRealtime();loadingBanner=true;bannerStatus("loading");
        banner=new AdView(activity);final AdView candidate=banner;
        bannerHost.addView(candidate,new FrameLayout.LayoutParams(-1,-1));
        candidate.loadAd(new BannerAdRequest.Builder(BANNER_ID,AdSize.getInlineAdaptiveBannerAdSize(width,50)).build(),new AdLoadCallback<BannerAd>() {
            @Override public void onAdLoaded(BannerAd ad) { ui(()->{if(candidate!=banner){ad.destroy();return;}loadingBanner=false;bannerLoaded=true;applyBanner();}); }
            @Override public void onAdFailedToLoad(LoadAdError error) { ui(()->{if(candidate!=banner)return;loadingBanner=false;bannerLoaded=false;candidate.destroy();bannerHost.removeAllViews();banner=null;bannerHost.setVisibility(View.GONE);bannerStatus("unavailable");}); }
        });
    }
    void destroy() {
        destroyed=true;handler.removeCallbacksAndMessages(null);
        if(banner!=null)banner.destroy();if(interstitial!=null)interstitial.destroy();if(reward!=null)reward.destroy();
        if(bannerHost!=null){root.removeView(bannerHost);bannerHost=null;}
        banner=null;interstitial=null;reward=null;
    }
}
