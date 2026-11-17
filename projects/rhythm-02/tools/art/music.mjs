// rhythm-02 곡 음 시작 목록(박 단위)·음 높이 — 순수 함수만. 빌드·sound-check·balance 검증기·QA 렌더가 같은 정의를 import 한다(30-art 9-1, 1-2 D16, round-2 N3).
// 의존: 없음(node 모듈·DOM 없음). 입력은 레벨 JSON(levels/*.json, 스키마 v1·v2) 과 assets/sound.json 객체.
//
//   musicOnsets(level, S)            → [{ beat, sound, part, degree?, len? }]  곡 음이 시작하는 박(레벨 시간 0 = 첫 받침 쉼 첫 박)
//   noteOf(S, levelId, o)            → 그 곡 음(또는 콤보 화음 {sound:'chord_1'})의 연주 음 높이 Hz (빌드 audio.js 의 noteOf 를 여기로 옮김 — 원본 하나, N3)
//   allNotes(levels, S)              → { 소리 이름: [Hz…] } 레벨 곡 전체에서 실제로 나오는 음 높이(중복 없음) — 소리 크기 측정의 음 높이 집합(N3)
//   onsetClash(level, S, judge)      → [{ m, c }]  곡 음 시작 m(박) 이 hit 접촉 c(박)의 놓침 구역 [c − pe − miss, c − pe) 안 (같은 시각 접촉 있으면 제외)
//   onsetClashBeats(cs, ms, bpm, pe, miss)  → 위와 같은 검사(박 목록 직접)
//   lcg32Noise(seed, n)              → Float32Array 흰 잡음(sound.json noise_gen: s = (s·1664525 + 1013904223) mod 2^32, v = s / 2^31 − 1) — 빌드와 같은 식(N3)
//   peakDb(buf) / winPeakDb(buf, SR, ms) → 표본 최고값 dBFS / ms 창 RMS 최댓값 + 3.01 dB(사인 기준 최고값, 위상에 덜 민감 — 참고)
//
// 규칙(sound.json music.onset_rule 이 원본):
//   받침 쉼 안의 박 b(정수, 구절 [start_beat, start_beat + rest_beats)): k = b − start_beat. k 짝수 → rest_a, 홀수 → rest_b("콩"). b % meter ∈ rest.bass_bar_beats 이면 bass. 멜로디 없음.
//   지붕 밑 쉼(round-2, v2 phrases[].roof_sits[]): 착지 박(beat)과 그 뒤 토스 박 전까지 [beat, toss_beat) 은 받침 쉼처럼 멜로디 없음.
//     착지 박에는 곡 음이 하나도 없음(따라 칠 소리 없음, S9). bob_beats(착지 다음 박부터)마다 k = 순번으로 rest_a/rest_b, 마디 첫 박이면 bass.
//   그 밖의 박: b % grid_beats === 0 일 때만. b % meter ∈ play.bass_bar_beats 이면 bass, 동기 자리 slot 에 음이 있으면 멜로디.
//   L10 되부름(levels.10.recall): 마지막 구절 시작 박부터 끝까지 멜로디는 recall.motif_from 레벨의 동기(악기·근음은 이 레벨 것).

export function musicOnsets(level, S) {
  const M = S.music, R = M.onset_rule;
  const id = String(level.id).padStart(2, '0');
  const lm = M.levels[id];
  const rests = (level.phrases || []).map((p) => [p.start_beat, p.start_beat + p.rest_beats]);
  const restOf = (b) => rests.find(([a, z]) => b >= a && b < z);
  const roofs = (level.phrases || []).flatMap((p) => p.roof_sits || []).map((r) => ({ land: r.beat, toss: r.toss_beat, bobs: r.bob_beats || [] }));
  const roofOf = (b) => roofs.find((r) => b >= r.land && b < r.toss);
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
    const rf = roofOf(b);
    if (rf) {
      const k = rf.bobs.indexOf(b);
      if (b !== rf.land && k >= 0) {
        out.push({ beat: b, sound: k % 2 === 0 ? R.rest.even_k : R.rest.odd_k, part: 'roof' });
        if (R.rest.bass_bar_beats.includes(bar)) out.push({ beat: b, sound: 'bass', part: 'roof' });
      }
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

export function noteOf(S, levelId, o) {
  const M = S.music, lm = M.levels[String(levelId).padStart(2, '0')];
  if (o.sound === 'bass') return lm.root_hz / 2;
  if (o.part === 'rest' || o.part === 'roof') return lm.root_hz;
  if (/^chord_/.test(o.sound)) return lm.root_hz * M.melody_octave_mul; // 콤보 화음: 그 레벨 으뜸음 한 옥타브 위(곡과 같은 조)
  const sc = lm.scale, deg = o.degree ?? 0;
  const semi = sc[deg % sc.length] + 12 * Math.floor(deg / sc.length);
  return lm.root_hz * M.melody_octave_mul * Math.pow(2, semi / 12);
}

export function allNotes(levels, S) {
  const out = {};
  for (const lv of levels) {
    const id = String(lv.id).padStart(2, '0');
    for (const o of musicOnsets(lv, S)) (out[o.sound] ||= new Set()).add(+noteOf(S, id, o).toFixed(4));
    for (const k of Object.keys(S.sounds)) if (/^chord_/.test(k)) (out[k] ||= new Set()).add(+noteOf(S, id, { sound: k }).toFixed(4));
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort((a, b) => a - b)]));
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

// judge = 그 레벨 판정 값({ pass_early_ms, miss_zone_ms }). 없으면 level.judge. nogo(지붕 밑 착지)는 놓침 구역이 없어 빼고 봄
export function onsetClash(level, S, judge = level.judge) {
  const cs = level.contacts.filter((c) => (c.kind || 'hit') !== 'nogo').map((c) => c.beat);
  return onsetClashBeats(cs, musicOnsets(level, S).map((o) => o.beat), level.bpm, judge.pass_early_ms, judge.miss_zone_ms);
}

export function lcg32Noise(seed, n) {
  const d = new Float32Array(n);
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
  return d;
}
export function peakDb(buf) { let pk = 0; for (let i = 0; i < buf.length; i++) { const v = Math.abs(buf[i]); if (v > pk) pk = v; } return 20 * Math.log10(Math.max(pk, 1e-12)); }
export function winPeakDb(buf, SR, ms = 5) {
  const n = Math.max(1, Math.round((ms / 1000) * SR));
  let ss = 0, best = 0;
  for (let i = 0; i < buf.length; i++) { ss += buf[i] * buf[i]; if (i >= n) ss -= buf[i - n] * buf[i - n]; if (ss > best) best = ss; }
  return 10 * Math.log10(Math.max(best / n, 1e-24)) + 3.0103;
}
