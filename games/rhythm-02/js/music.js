// rhythm-02 곡 음 시작 목록(박 단위) — 순수 함수만. 빌드·sound-check·balance 검증기가 같은 정의를 import 한다(30-art 9-1, 1-2 D16).
// 의존: 없음(node 모듈·DOM 없음). 입력은 레벨 JSON(levels/*.json) 과 assets/sound.json 객체.
//
//   musicOnsets(level, S)            → [{ beat, sound, part }]  곡 음이 시작하는 박(레벨 시간 0 = 첫 받침 쉼 첫 박)
//   onsetClash(level, S, judge)      → [{ m, c }]  곡 음 시작 m(박) 이 접촉 c(박)의 놓침 구역 [c − pe − miss, c − pe) 안 (같은 시각 접촉 있으면 제외)
//   onsetClashBeats(cs, ms, bpm, pe, miss)  → 위와 같은 검사(박 목록 직접)
//
// 규칙(sound.json music.onset_rule 이 원본, 여기 코드는 그 규칙을 그대로 읽음):
//   받침 쉼 안의 박 b(정수, 구절 [start_beat, start_beat + rest_beats)): k = b − start_beat. k 짝수 → rest_a, 홀수 → rest_b("콩" 공 까딱 소리).
//     b % meter ∈ rest.bass_bar_beats 이면 bass. 멜로디 없음.
//   그 밖의 박: b % grid_beats === 0 일 때만. b % meter ∈ play.bass_bar_beats 이면 bass, 동기 자리 slot = (b / grid_beats) % frame_slots 에 음이 있으면 멜로디.
//   L10 되부름(levels.10.recall): 마지막 구절 시작 박부터 끝까지 멜로디는 recall.motif_from 레벨의 동기(악기·근음은 이 레벨 것).
//   반박·점 리듬 자리(홀수 박이 아닌 x.5 박 등)에는 곡 음이 시작하지 않음 → 엇박을 채우는 것은 아이 탭뿐.

export function musicOnsets(level, S) {
  const M = S.music, R = M.onset_rule;
  const id = String(level.id).padStart(2, '0');
  const lm = M.levels[id];
  const rests = (level.phrases || []).map((p) => [p.start_beat, p.start_beat + p.rest_beats]);
  const restOf = (b) => rests.find(([a, z]) => b >= a && b < z);
  const lastPhraseStart = level.phrases && level.phrases.length ? level.phrases[level.phrases.length - 1].start_beat : Infinity;
  const recall = lm && lm.recall ? lm.recall : null;
  const out = [];
  const len = level.length_beats || 0;
  for (let b = 0; b < len; b++) {
    const r = restOf(b);
    const bar = b % M.meter;
    if (r) {
      out.push({ beat: b, sound: (b - r[0]) % 2 === 0 ? R.rest.even_k : R.rest.odd_k, part: 'rest' });
      if (R.rest.bass_bar_beats.includes(bar)) out.push({ beat: b, sound: 'bass', part: 'rest' });
      continue;
    }
    if (b % R.play.grid_beats !== 0) continue;
    if (R.play.bass_bar_beats.includes(bar)) out.push({ beat: b, sound: 'bass', part: 'play' });
    if (!lm) continue;
    const motif = recall && b >= lastPhraseStart ? M.levels[recall.motif_from].motif : lm.motif;
    const slot = (b / R.play.grid_beats) % M.frame_slots;
    const n = motif.find((x) => x.s === slot);
    if (n) out.push({ beat: b, sound: lm.melody, part: recall && b >= lastPhraseStart ? 'recall' : 'melody', degree: n.d, len: n.len });
  }
  return out;
}

export function onsetClashBeats(contactsBeats, musicBeats, bpm, pe, miss) {
  const ms = 60000 / bpm, out = [];
  for (const m of [...new Set(musicBeats)]) {
    const tm = m * ms;
    if (contactsBeats.some((c) => Math.abs(c * ms - tm) < 5)) continue;
    for (const c of contactsBeats) { const tc = c * ms; if (tm >= tc - pe - miss && tm < tc - pe) out.push({ m, c }); }
  }
  return out;
}

// judge = 그 레벨 판정 값({ pass_early_ms, miss_zone_ms }). 없으면 level.judge.
export function onsetClash(level, S, judge = level.judge) {
  const cs = level.contacts.map((c) => c.beat);
  return onsetClashBeats(cs, musicOnsets(level, S).map((o) => o.beat), level.bpm, judge.pass_early_ms, judge.miss_zone_ms);
}
