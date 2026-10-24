#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-evidence
timeout 20 adb shell wm size "${BN_QA_SIZE:-720x1280}"
timeout 20 adb shell wm density "${BN_QA_DENSITY:-320}"
if [ "${BN_QA_CUTOUT:-0}" = 1 ]; then
  timeout 20 adb shell cmd overlay enable --user 0 com.android.internal.display.cutout.emulation.tall
fi
# Exercise a cold app launch after Android's post-boot services and display
# configuration have had time to settle. Keep the same 2-core / 2-GB device.
date -u +%FT%TZ > android-evidence/boot-settle.txt
sleep 20
date -u +%FT%TZ >> android-evidence/boot-settle.txt
exec bash tools/run_android_validation.sh
