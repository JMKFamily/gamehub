#!/system/bin/sh
# Usage: sh seq.sh [rep:N] <token>...
#   tokens: tap:X:Y  bg:X:Y (tap, don't wait)  hold:X:Y:MS  key:CODE  w:SECONDS
# Safety: before every input token, require the focused window to be the game activity;
# otherwise print ADSTOP and exit immediately (ads / browsers / anything else).
GAME=com.robtopx.geometryjumplite/com.robtopx.geometryjumplite.GeometryDashLite
ok() { dumpsys window | grep mCurrentFocus | grep -q "$GAME"; }
N=1; case "$1" in rep:*) N=${1#rep:}; shift;; esac
TOKS="$*"
r=0
while [ $r -lt $N ]; do
  for tok in $TOKS; do
    a=$(echo "$tok" | cut -d: -f1); p=$(echo "$tok" | cut -d: -f2); q=$(echo "$tok" | cut -d: -f3); m=$(echo "$tok" | cut -d: -f4)
    case "$a" in
      w) sleep "$p";;
      tap|bg|hold|key)
        if ! ok; then echo "ADSTOP rep=$r tok=$tok"; exit 3; fi
        case "$a" in
          tap) input tap "$p" "$q";;
          bg) input tap "$p" "$q" &;;
          hold) input swipe "$p" "$q" "$p" "$q" "$m";;
          key) input keyevent "$p";;
        esac
        echo "in $tok $(date +%s.%N)";;
    esac
  done
  r=$((r+1))
done
wait
