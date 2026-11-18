// 저장(localStorage, 새로고침 유지). 접근이 막힌 환경에서도 게임은 그대로 동작.
const KEY = 'flow01.v1';
const fresh = () => ({ v: 1, levels: {}, sound: true, vibrate: true, motion: false, lang: null });

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.v === 1) return { ...fresh(), ...s, levels: s.levels || {} };
  } catch {}
  return fresh();
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export function clearProgress(s) { s.levels = {}; save(s); }
export const levelRec = (s, id) => (s.levels[id] ||= { done: false, star: false, bestPct: null, bestFill: 0 });
