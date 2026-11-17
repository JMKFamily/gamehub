// 진행도·최고 기록·설정 저장 (localStorage, 모든 접근 try/catch — 사생활 창·막힘에서도 게임은 돎)
const KEY = 'rhythm02.v1';
const fresh = () => ({ v: 1, lang: null, sound: true, levels: {}, syncOffsetMs: 0, syncDone: false, latRef: null, drift: { on: false, sessions: 0 } });
export const Store = {
  load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) return { ...fresh(), ...s, drift: { ...fresh().drift, ...(s.drift || {}) } }; } catch {}
    return fresh();
  },
  save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } },
  lv(s, id) { return (s.levels[id] ||= { best: 0, grade: 0, cleared: false, practiceCleared: false, seenCard: false }); },
};
