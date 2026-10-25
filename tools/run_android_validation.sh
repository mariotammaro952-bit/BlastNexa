#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-evidence
# Keep the system's assistant and navigation packages enabled. Changing their
# roles during emulator boot can interrupt System UI before the game launches.
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
# Preserve already captured evidence if a cloud emulator later disconnects.
(
  while true; do
    timeout 10 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/store android-evidence/ >/dev/null 2>&1 || true
    timeout 10 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/metrics android-evidence/ >/dev/null 2>&1 || true
    sleep 15
  done
) &
evidence_pid=$!
trap 'kill "$evidence_pid" "$logcat_pid" "$memory_pid" 2>/dev/null || true' EXIT
instrument_status=0
instrument_args=()
if [ -n "${BN_QA_TEST_METHODS:-}" ]; then instrument_args=(-e class "$BN_QA_TEST_METHODS"); fi
if [ "${BN_QA_ISOLATE_TESTS:-0}" = 1 ]; then
  : > android-evidence/instrumentation.txt
  mkdir -p android-evidence/methods
  IFS=',' read -r -a methods <<< "$BN_QA_TEST_METHODS"
  completed=0
  for method in "${methods[@]}"; do
    if [ "$(timeout 10 adb get-state 2>/dev/null || true)" != device ]; then
      printf 'EMULATOR_DISCONNECTED before %s\n' "$method" | tee -a android-evidence/instrumentation.txt
      instrument_status=1
      break
    fi
    # Every independent test starts a cold app process. The production
    # Activity recreation and save/reload assertions inside each test remain.
    timeout 15 adb shell am force-stop com.blastnexa.blockpuzzle.preview || true
    label="${method##*#}"
    result="android-evidence/methods/$label.txt"
    method_status=0
    timeout 180 adb shell am instrument -w -r -e bn_qa_cutout "$cutout" -e class "$method" com.blastnexa.blockpuzzle.preview.test/androidx.test.runner.AndroidJUnitRunner | tee "$result" || method_status=$?
    cat "$result" >> android-evidence/instrumentation.txt
    if [ "$method_status" = 0 ] && grep -Eq '^OK \(1 tests?\)' "$result"; then
      completed=$((completed+1))
    else
      instrument_status=1
    fi
    timeout 15 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/metrics android-evidence/ >/dev/null 2>&1 || true
    timeout 15 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/store android-evidence/ >/dev/null 2>&1 || true
  done
  printf 'VALIDATION_SUMMARY expected=%s passed=%s\n' "$BN_QA_EXPECTED_TESTS" "$completed" | tee -a android-evidence/instrumentation.txt
  if [ "$completed" != "$BN_QA_EXPECTED_TESTS" ]; then instrument_status=1; fi
else
timeout 1800 adb shell am instrument -w -r -e bn_qa_cutout "$cutout" "${instrument_args[@]}" com.blastnexa.blockpuzzle.preview.test/androidx.test.runner.AndroidJUnitRunner | tee android-evidence/instrumentation.txt || instrument_status=$?
fi
timeout 20 adb shell dumpsys activity lastanr > android-evidence/last-anr.txt || true
timeout 20 adb shell uiautomator dump /sdcard/validation-ui.xml || true
timeout 20 adb pull /sdcard/validation-ui.xml android-evidence/ui-final.xml || true
timeout 20 adb shell screencap -p /sdcard/validation-screen.png || true
timeout 20 adb pull /sdcard/validation-screen.png android-evidence/screen-final.png || true
timeout 25 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/store android-evidence/ || true
timeout 25 adb pull /sdcard/Android/data/com.blastnexa.blockpuzzle.preview/files/metrics android-evidence/ || true
if [ "$instrument_status" -ne 0 ]; then exit "$instrument_status"; fi
if [ "${BN_QA_ISOLATE_TESTS:-0}" = 1 ]; then
  grep -Fxq "VALIDATION_SUMMARY expected=$BN_QA_EXPECTED_TESTS passed=$BN_QA_EXPECTED_TESTS" android-evidence/instrumentation.txt
else
  grep -Eq "^OK \\(${BN_QA_EXPECTED_TESTS:-20} tests?\\)" android-evidence/instrumentation.txt
fi
