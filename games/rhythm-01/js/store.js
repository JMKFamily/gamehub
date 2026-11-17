// localStorage 저장 (진행도·최고 기록·오프셋·카드 본 여부·소리 설정). 실패해도 게임은 돈다.
const KEY = 'rhythm01.save.v1';
const fresh = () => ({ unlocked: 1, levels: {}, offsetMs: 0, calibDone: false, calibAutoLat: null, music: true, sfx: true, sound: true, late: { drift: false, sig: '', sessions: 0, device: false } });
export function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return { ...fresh(), ...s, late: { ...fresh().late, ...(s.late || {}) } }; } catch {}
  return fresh();
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export function reset(s) { const f = fresh(); f.calibDone = s.calibDone; f.offsetMs = s.offsetMs; f.calibAutoLat = s.calibAutoLat; f.music = s.music; f.sfx = s.sfx; f.sound = s.sound; return f; }
export function lv(s, id) { return (s.levels[id] ||= { best: 0, grade: 0, flag: false, cardSeen: false, attempts: 0 }); }
