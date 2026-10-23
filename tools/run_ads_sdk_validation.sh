#!/usr/bin/env bash
set -euo pipefail
mkdir -p sdk-evidence
adb install -r app/build/outputs/apk/preview/debug/app-preview-debug.apk
adb install -r app/build/outputs/apk/androidTest/preview/debug/app-preview-debug-androidTest.apk
adb shell pm grant com.blastnexa.blockpuzzle.preview android.permission.POST_NOTIFICATIONS
adb logcat -c
status=0
timeout 600 adb shell am instrument -w -r -e class com.blastnexa.blockpuzzle.AdsSdkValidationTest com.blastnexa.blockpuzzle.preview.test/androidx.test.runner.AndroidJUnitRunner | tee sdk-evidence/instrumentation.txt || status=$?
adb logcat -d > sdk-evidence/logcat.txt
adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/sdk-smoke sdk-evidence/ || true
adb shell uiautomator dump /sdcard/sdk-final.xml || true
adb pull /sdcard/sdk-final.xml sdk-evidence/ || true
adb shell screencap -p /sdcard/sdk-final.png
adb pull /sdcard/sdk-final.png sdk-evidence/
if [ "$status" -ne 0 ]; then exit "$status"; fi
grep -Eq '^OK \(1 test\)' sdk-evidence/instrumentation.txt
