#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-evidence
timeout 20 adb shell wm size 720x1280
timeout 20 adb shell wm density 320
timeout 45 adb install -r imported-artifacts/preview/debug/app-preview-debug.apk
timeout 45 adb install -r imported-artifacts/androidTest/preview/debug/app-preview-debug-androidTest.apk
timeout 20 adb shell dumpsys webviewupdate > android-evidence/webview-provider.txt
timeout 20 adb logcat -c
adb logcat -v threadtime > android-evidence/logcat.txt 2>&1 &
logcat_pid=$!
trap 'kill "$logcat_pid" 2>/dev/null || true' EXIT
instrument_status=0
timeout 1200 adb shell am instrument -w -r com.blastnexa.blockpuzzle.preview.test/androidx.test.runner.AndroidJUnitRunner | tee android-evidence/instrumentation.txt || instrument_status=$?
timeout 20 adb shell uiautomator dump /sdcard/validation-ui.xml || true
timeout 20 adb pull /sdcard/validation-ui.xml android-evidence/ui-final.xml || true
timeout 20 adb shell screencap -p /sdcard/validation-screen.png || true
timeout 20 adb pull /sdcard/validation-screen.png android-evidence/screen-final.png || true
timeout 25 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/store android-evidence/store || true
timeout 25 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/metrics android-evidence/metrics || true
if [ "$instrument_status" -ne 0 ]; then exit "$instrument_status"; fi
grep -Eq '^OK \(7 tests\)' android-evidence/instrumentation.txt
