#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-evidence
# Keep first-boot Google assistant/indexing jobs from competing with the game
# on the 7 GB hosted runner. Notification UI, Play services and networking stay.
for package in com.google.android.googlequicksearchbox com.google.android.as com.google.android.as.oss com.google.android.apps.wellbeing com.google.android.apps.messaging; do
  timeout 15 adb shell pm disable-user --user 0 "$package" >> android-evidence/emulator-background-apps.txt 2>&1 || true
done
(
  while true; do
    date -u +%FT%TZ
    free -m
    ps -eo pid,comm,rss --sort=-rss | head -n 8
    sleep 10
  done
) > android-evidence/host-memory.txt &
memory_pid=$!
trap 'kill "$memory_pid" 2>/dev/null || true' EXIT
timeout 20 adb shell wm size "${BN_QA_SIZE:-720x1280}"
timeout 20 adb shell wm density "${BN_QA_DENSITY:-320}"
cutout=false
if [ "${BN_QA_CUTOUT:-0}" = 1 ]; then
  timeout 20 adb shell cmd overlay list > android-evidence/available-overlays.txt
  grep -Fq 'com.android.internal.display.cutout.emulation.tall' android-evidence/available-overlays.txt
  timeout 20 adb shell cmd overlay enable --user 0 com.android.internal.display.cutout.emulation.tall
  cutout=true
fi
timeout 45 adb install -r imported-artifacts/preview/debug/app-preview-debug.apk
timeout 45 adb install -r imported-artifacts/androidTest/preview/debug/app-preview-debug-androidTest.apk
timeout 20 adb shell dumpsys webviewupdate > android-evidence/webview-provider.txt
timeout 20 adb logcat -c
adb logcat -v threadtime > android-evidence/logcat.txt 2>&1 &
logcat_pid=$!
trap 'kill "$logcat_pid" "$memory_pid" 2>/dev/null || true' EXIT
instrument_status=0
timeout 1800 adb shell am instrument -w -r -e bn_qa_cutout "$cutout" com.blastnexa.blockpuzzle.preview.test/androidx.test.runner.AndroidJUnitRunner | tee android-evidence/instrumentation.txt || instrument_status=$?
timeout 20 adb shell dumpsys activity lastanr > android-evidence/last-anr.txt || true
timeout 20 adb shell uiautomator dump /sdcard/validation-ui.xml || true
timeout 20 adb pull /sdcard/validation-ui.xml android-evidence/ui-final.xml || true
timeout 20 adb shell screencap -p /sdcard/validation-screen.png || true
timeout 20 adb pull /sdcard/validation-screen.png android-evidence/screen-final.png || true
timeout 25 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/store android-evidence/store || true
timeout 25 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/metrics android-evidence/metrics || true
if [ "$instrument_status" -ne 0 ]; then exit "$instrument_status"; fi
grep -Eq '^OK \(19 tests\)' android-evidence/instrumentation.txt
