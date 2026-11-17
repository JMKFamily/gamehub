// localStorage 저장 (진행도·최고 기록·오프셋·카드 본 여부·소리 설정). 실패해도 게임은 돈다.
// round-3 북길: 레벨 배치·그림 카드가 모두 바뀌어 레벨 기록(해금·최고 진행도·등급·카드 본 여부)은 v3 에서 새로 시작.
// 보정 결과(R11 방식으로 잰 v2 값)와 소리 설정은 옮김(첫 실행 보정을 다시 하게 하지 않음). v1 은 옮기지 않음(R11).
const KEY = 'rhythm01.save.v3', PREV = 'rhythm01.save.v2';
const fresh = () => ({ unlocked: 1, levels: {}, offsetMs: 0, calibDone: false, calibAutoLat: null, music: true, sfx: true, sound: true, late: { drift: false, sig: '', sessions: 0, device: false } });
export function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return { ...fresh(), ...s, late: { ...fresh().late, ...(s.late || {}) } }; } catch {}
  try {
    const o = JSON.parse(localStorage.getItem(PREV));
    if (o && typeof o === 'object') { const f = fresh(); for (const k of ['offsetMs', 'calibDone', 'calibAutoLat', 'music', 'sfx', 'sound']) if (k in o) f[k] = o[k]; return f; }
  } catch {}
  return fresh();
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export function reset(s) { const f = fresh(); f.calibDone = s.calibDone; f.offsetMs = s.offsetMs; f.calibAutoLat = s.calibAutoLat; f.music = s.music; f.sfx = s.sfx; f.sound = s.sound; return f; }
export function lv(s, id) { return (s.levels[id] ||= { best: 0, grade: 0, flag: false, cardSeen: false, attempts: 0 }); }
