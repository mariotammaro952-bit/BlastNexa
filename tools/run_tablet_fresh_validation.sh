#!/usr/bin/env bash
set -euo pipefail
mkdir -p tablet-fresh-evidence
for package in com.google.android.googlequicksearchbox com.google.android.as com.google.android.as.oss com.google.android.apps.wellbeing com.google.android.apps.messaging; do
  timeout 15 adb shell pm disable-user --user 0 "$package" >> tablet-fresh-evidence/background-apps.txt 2>&1 || true
done
timeout 20 adb shell wm size 600x1024
timeout 20 adb shell wm density 160
timeout 60 adb install -r imported-artifacts/preview/debug/app-preview-debug.apk
timeout 60 adb install -r imported-artifacts/androidTest/preview/debug/app-preview-debug-androidTest.apk
timeout 20 adb shell dumpsys webviewupdate > tablet-fresh-evidence/webview.txt
timeout 20 adb logcat -c
adb logcat -v threadtime > tablet-fresh-evidence/logcat.txt 2>&1 &
log_pid=$!
trap 'kill "$log_pid" 2>/dev/null || true' EXIT
status=0
timeout 300 adb shell am instrument -w -r -e class 'com.blastnexa.blockpuzzle.LaunchValidationTest#b_threeSlotWorldsAndFiftySpinPersistence' com.blastnexa.blockpuzzle.preview.test/androidx.test.runner.AndroidJUnitRunner | tee tablet-fresh-evidence/instrumentation.txt || status=$?
timeout 20 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/metrics tablet-fresh-evidence/ || true
timeout 20 adb shell dumpsys meminfo com.blastnexa.blockpuzzle.preview > tablet-fresh-evidence/app-memory.txt || true
timeout 20 adb shell screencap -p /sdcard/tablet-fresh.png || true
timeout 20 adb pull /sdcard/tablet-fresh.png tablet-fresh-evidence/ || true
if [ "$status" -ne 0 ]; then exit "$status"; fi
grep -Eq '^OK \(1 test\)' tablet-fresh-evidence/instrumentation.txt
