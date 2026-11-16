#!/system/bin/sh
# Usage: sh taps.sh <mode:tap|hold> <count> <interval_s> [hold_ms] [x] [y]
# Safety: before every input, require the focused window to be the game activity.
# If an ad / browser / anything else has focus, stop immediately and print ADSTOP.
MODE=$1; COUNT=$2; IV=$3; HOLD=${4:-3000}; X=${5:-800}; Y=${6:-500}
GAME=com.robtopx.geometryjumplite/com.robtopx.geometryjumplite.GeometryDashLite
ok() { dumpsys window | grep mCurrentFocus | grep -q "$GAME"; }
i=0
while [ $i -lt $COUNT ]; do
  if ! ok; then echo "ADSTOP at $i"; exit 3; fi
  if [ "$MODE" = hold ]; then input swipe $X $Y $X $Y $HOLD; else input tap $X $Y & fi
  echo "input $i $(date +%s.%N)"
  i=$((i+1))
  sleep $IV
done
wait
