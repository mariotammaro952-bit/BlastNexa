#!/usr/bin/env bash
set -euo pipefail
mkdir -p sdk-evidence
for package in com.google.android.googlequicksearchbox com.google.android.as com.google.android.as.oss com.google.android.apps.wellbeing com.google.android.apps.messaging; do
  timeout 15 adb shell pm disable-user --user 0 "$package" >> sdk-evidence/emulator-background-apps.txt 2>&1 || true
done
timeout 20 adb shell wm size 720x1280
timeout 20 adb shell wm density 320
timeout 60 adb install -r app/build/outputs/apk/preview/debug/app-preview-debug.apk
timeout 60 adb install -r app/build/outputs/apk/androidTest/preview/debug/app-preview-debug-androidTest.apk
timeout 20 adb shell pm grant com.blastnexa.blockpuzzle.preview android.permission.POST_NOTIFICATIONS
timeout 20 adb logcat -c
adb logcat -v threadtime > sdk-evidence/logcat.txt 2>&1 &
log_pid=$!
trap 'kill "$log_pid" 2>/dev/null || true' EXIT
status=0
timeout 600 adb shell am instrument -w -r -e class com.blastnexa.blockpuzzle.AdsSdkValidationTest com.blastnexa.blockpuzzle.preview.test/androidx.test.runner.AndroidJUnitRunner | tee sdk-evidence/instrumentation.txt || status=$?
timeout 20 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/sdk-smoke sdk-evidence/ || true
timeout 20 adb shell uiautomator dump /sdcard/sdk-final.xml || true
timeout 20 adb pull /sdcard/sdk-final.xml sdk-evidence/ || true
timeout 20 adb shell screencap -p /sdcard/sdk-final.png || true
timeout 20 adb pull /sdcard/sdk-final.png sdk-evidence/ || true
if [ "$status" -ne 0 ]; then exit "$status"; fi
grep -Eq '^OK \(1 test\)' sdk-evidence/instrumentation.txt
