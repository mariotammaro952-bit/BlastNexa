#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-evidence
# Settle the final display orientation before the app's first cold launch.
timeout 20 adb shell wm size "${BN_QA_SIZE:-720x1600}"
timeout 20 adb shell wm density "${BN_QA_DENSITY:-320}"
timeout 20 adb shell settings put system accelerometer_rotation 0
timeout 20 adb shell settings put system user_rotation 1
timeout 20 adb shell cmd overlay enable --user 0 com.android.internal.display.cutout.emulation.tall
timeout 30 adb shell am start -W -a android.settings.SETTINGS > android-evidence/os-health-start.txt
# This control exercises Android without launching the game or its WebView.
# Preserve an independent connection record before the existing four tests.
for sample in 1 2 3 4 5 6; do
  date -u +%FT%TZ | tee -a android-evidence/os-health.txt
  state="$(timeout 10 adb get-state 2>/dev/null || true)"
  printf 'sample=%s adb=%s\n' "$sample" "$state" | tee -a android-evidence/os-health.txt
  if [ "$state" != device ]; then
    printf 'DISCONNECTED_BEFORE_GAME_LAUNCH\n' | tee -a android-evidence/os-health.txt
    exit 1
  fi
  timeout 10 adb shell getprop sys.boot_completed >> android-evidence/os-health.txt
  sleep 15
done
timeout 20 adb exec-out screencap -p > android-evidence/os-health-screen.png
timeout 15 adb shell input keyevent 3
printf 'OS_HEALTH_PASSED_GAME_NOT_YET_LAUNCHED\n' | tee -a android-evidence/os-health.txt
exec bash tools/run_android_validation_settled.sh
