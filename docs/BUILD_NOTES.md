# BlastNexa Android build v0.9

- APK debug: generated automatically when source is pushed to main. Get it from Actions → latest run → Artifacts.
- Play Console requires the .aab file, not the debug .apk.
- Signed release AAB: Actions → BlastNexa APK and signed AAB → Run workflow → release_aab=true, only after configuring all four secrets.
- Secrets names: BN_KEYSTORE_B64, BN_STORE_PASSWORD, BN_KEY_ALIAS, BN_KEY_PASSWORD.
- Never put .jks files or passwords in the Git repository or this conversation. Back up the private upload key and passwords.
- Confirm signature verification succeeded before uploading to Play Console.
- The native app is currently a WebView containing the local offline HTML game; Android device testing is still required.
