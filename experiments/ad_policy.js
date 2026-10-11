/* BlastNexa Ad Policy — policy engine, NOT an ad SDK and not connected to production. */
'use strict';
const DEFAULTS=Object.freeze({minGamesBeforeFirstInterstitial:3,minGamesBetweenInterstitials:3,minSecondsBetweenInterstitials:180,maxRewardedPerRun:1});
class AdPolicy {
 constructor(settings={}){this.config={...DEFAULTS,...settings};this.state={gamesFinished:0,lastInterstitialGame:0,lastInterstitialAt:-Infinity,rewardedRunId:null,rewardedPending:false,rewardedGranted:false}}
 gameEnded(){this.state.gamesFinished+=1}
 canInterstitial({consentAllowsRequest=false,sdkReady=false,gameplayActive=false,firstSession=false,nowSeconds=0}={}){
  const s=this.state,c=this.config;
  return consentAllowsRequest&&sdkReady&&!gameplayActive&&!firstSession&&s.gamesFinished>=c.minGamesBeforeFirstInterstitial&&
   (s.gamesFinished-s.lastInterstitialGame)>=c.minGamesBetweenInterstitials&&
   nowSeconds-s.lastInterstitialAt>=c.minSecondsBetweenInterstitials;
 }
 interstitialShown(nowSeconds){this.state.lastInterstitialAt=nowSeconds;this.state.lastInterstitialGame=this.state.gamesFinished}
 offerRewarded({runId,explicitOptIn=false,consentAllowsRequest=false,sdkReady=false}={}){
  if(!explicitOptIn||!consentAllowsRequest||!sdkReady||!runId||this.state.rewardedPending||this.state.rewardedRunId===runId)return false;
  this.state.rewardedPending=true;this.state.rewardedGranted=false;this.state.rewardedRunId=runId;return true;
 }
 rewardEarned(runId){if(!this.state.rewardedPending||this.state.rewardedGranted||this.state.rewardedRunId!==runId)return false;this.state.rewardedPending=false;this.state.rewardedGranted=true;return true}
 rewardedDismissed(){this.state.rewardedPending=false}
}
if(typeof module!=='undefined'&&module.exports)module.exports={AdPolicy,DEFAULTS};