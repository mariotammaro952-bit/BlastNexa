#!/usr/bin/env bash
# Host-side evidence survives an adb loss or a guest crash.
set -u
mkdir -p android-evidence
snapshot() {
  date -u +%FT%TZ
  free -m
  ps -eo pid,ppid,comm,rss --sort=-rss | head -n 10
  for stat in memory.current memory.peak memory.max memory.events memory.events.local memory.swap.current memory.swap.max; do
    path="/sys/fs/cgroup/$stat"
    if [ -r "$path" ]; then printf '\n%s\n' "$path"; cat "$path"; fi
  done
  printf '\nEMULATOR_PROCESSES\n'
  pgrep -a -f '/emulator/qemu/|qemu-system-x86_64|qemu-system-x86' || true
}
if [ "${1:-}" = final ]; then
  snapshot > android-evidence/host-final.txt
  sudo -n dmesg --ctime > android-evidence/host-kernel.txt 2>&1 || true
  sudo -n journalctl -k -n 200 --no-pager > android-evidence/host-kernel-journal.txt 2>&1 || true
  cat /proc/self/cgroup > android-evidence/host-cgroup.txt
  exit 0
fi
while true; do snapshot; sleep 5; done >> android-evidence/host-watch.txt 2>&1
