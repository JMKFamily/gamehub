// rhythm-02 "리스크가 반복되지 않음" 측정 (00-benchmark 14-4 정의의 기준 구현, 검증기 V-R1~R7 이 씀). 순수 함수만.
//
//   tokenize(level)            → 구절별 토큰열 [{phrase, tokens:[{tok, risk, beat, i}]}]  (받침 쉼 = 구절 경계 R)
//   chunksOf(level)            → 위험 덩어리 [{key, tokens, startBeat, endBeat, phrase, riskCount, contacts:[i]}] (레벨 순서)
//   repeatStats(level, opt)    → 위험 토큰 비율, 덩어리 수/서로 다른 수, 같은 덩어리 연속 최대, 2·3·4-gram 중복 비율, 덩어리 사이 간격 …
//   phraseStarts(level)        → 구절 시작(토스 뒤 첫 8박) 토큰열 [{phrase, key, risky}]
//   windows8(level)            → 위험을 포함한 8박 창 [{start, key}] (창 안 접촉의 박 위치(창 시작 기준) + 토큰, 받침 쉼 박은 'R')
//
// 토큰: hit = 들어오는 비행 길이(박) + 물체 태그(4c 구름, 3h 언덕, .5b 낮은 가지, .5B 긴 가지), nogo = X<지붕 밑 쉼 박 수>.
//       round-1(스키마 1) 레벨은 물체가 없으므로 비행 길이만, 두 공 접촉은 't' 태그(G5).
// 위험 토큰 = 물체 없는 1박 통('1') 이외 전부.
// 위험 덩어리 = 위험 토큰으로 시작·끝나고 안에 '1' 이 연달아 2개 이상 없는 가장 긴 구간(받침 쉼에서 끊김).

const fmt = (x) => (x === 0.5 ? '.5' : String(x));

export function tokenOf(level, c) {
  if (c.kind === 'nogo') {
    const ph = level.phrases[c.phrase];
    const rs = (ph.roof_sits || []).find((r) => r.contact === c.i);
    return 'X' + (rs ? rs.toss_beat - rs.beat : '?');
  }
  let tag = '';
  if (level.schema_version >= 2) {
    if (c.gimmick === 'W2') tag = 'c';
    else if (c.gimmick === 'W6') tag = 'h';
    else if (c.gimmick === 'W5') tag = 'b';
    else if (c.gimmick === 'W7') tag = 'B';
  } else if (c.gimmick === 'G5') tag = 't';
  return fmt(c.gap_beats) + tag;
}

export function tokenize(level) {
  return level.phrases.map((ph) => {
    const cs = level.contacts.filter((c) => c.phrase === ph.index);
    return { phrase: ph.index, tokens: cs.map((c) => { const tok = tokenOf(level, c); return { tok, risk: tok !== '1', beat: c.beat, i: c.i }; }) };
  });
}

export function chunksOf(level) {
  const out = [];
  for (const { phrase, tokens } of tokenize(level)) {
    let k = 0;
    while (k < tokens.length) {
      if (!tokens[k].risk) { k++; continue; }
      let end = k;
      let m = k + 1;
      while (m < tokens.length) {
        if (tokens[m].risk) { end = m; m++; continue; }
        if (m + 1 < tokens.length && !tokens[m + 1].risk) break; // '1 1' 이면 끊김
        if (m + 1 >= tokens.length) break;
        m++;
      }
      const seg = tokens.slice(k, end + 1);
      out.push({ key: seg.map((x) => x.tok).join(' '), tokens: seg.map((x) => x.tok), startBeat: seg[0].beat, endBeat: seg[seg.length - 1].beat, phrase, riskCount: seg.filter((x) => x.risk).length, contacts: seg.map((x) => x.i) });
      k = end + 1;
    }
  }
  return out;
}

// teaching: 그 레벨 새 기믹 토큰을 처음 담은 덩어리 2개(가르치기 덩어리) — 중복 계산(n-gram·덩어리 횟수)에서 뺌
export function teachingChunks(level, chunks = chunksOf(level)) {
  const g = level.new_gimmick?.id;
  if (!g) return new Set();
  const ids = new Set(level.contacts.filter((c) => c.gimmick === g).map((c) => c.i));
  const t = chunks.filter((ch) => ch.contacts.some((i) => ids.has(i))).slice(0, 2);
  return new Set(t.map((ch) => ch.startBeat));
}

export function repeatStats(level, { excludeTeaching = false, tail = 4 } = {}) {
  const tz = tokenize(level);
  const all = tz.flatMap((p) => p.tokens);
  const chunks = chunksOf(level);
  const teach = excludeTeaching ? teachingChunks(level, chunks) : new Set();
  const teachIdx = new Set(chunks.filter((ch) => teach.has(ch.startBeat)).flatMap((ch) => ch.contacts));
  const ngram = (n) => {
    let total = 0;
    const seen = new Set();
    for (const { tokens } of tz) for (let k = 0; k + n <= tokens.length; k++) {
      const g = tokens.slice(k, k + n);
      if (!g.some((x) => x.risk)) continue;
      if (excludeTeaching && g.some((x) => teachIdx.has(x.i))) continue;
      total++;
      seen.add(g.map((x) => x.tok).join(' '));
    }
    return { total, distinct: seen.size, dup: total ? 1 - seen.size / total : null };
  };
  let maxRun = chunks.length ? 1 : 0, run = 1;
  for (let k = 1; k < chunks.length; k++) { if (chunks[k].key === chunks[k - 1].key) { run++; maxRun = Math.max(maxRun, run); } else run = 1; }
  const counts = {};
  for (const ch of chunks) if (!teach.has(ch.startBeat)) counts[ch.key] = (counts[ch.key] || 0) + 1;
  const gaps = [];
  for (let k = 1; k < chunks.length; k++) gaps.push(+(chunks[k].startBeat - chunks[k - 1].endBeat).toFixed(3));
  // 앞·뒤 절반 위험 비율(V-R6): 레벨 끝 고정 1박 통 tail 개(배치 규칙 ⑥)는 뺌 — 뒤 절반을 늘 낮추는 고정 구간이라서
  const body = all.slice(0, Math.max(0, all.length - tail));
  const half = Math.floor(body.length / 2);
  const rr = (a) => (a.length ? a.filter((x) => x.risk).length / a.length : 0);
  return {
    tokens: all.length,
    risk_ratio: +rr(all).toFixed(3),
    risk_ratio_halves: [+rr(body.slice(0, half)).toFixed(3), +rr(body.slice(half)).toFixed(3)],
    chunks: chunks.length,
    distinct_chunks: new Set(chunks.map((c) => c.key)).size,
    max_same_run: chunks.length ? maxRun : null,
    max_occurrence: Object.keys(counts).length ? Math.max(...Object.values(counts)) : 0,
    gram2: ngram(2), gram3: ngram(3), gram4: ngram(4),
    gaps,
    chunk_list: chunks.map((c) => c.key),
    chunks_detail: chunks,
  };
}

// 구절 시작 = 토스(구절 첫 토스) 뒤 첫 8박 안 접촉 토큰열
export function phraseStarts(level) {
  return level.phrases.map((ph) => {
    const toss = ph.tosses[0].beat;
    const cs = level.contacts.filter((c) => c.phrase === ph.index && c.beat <= toss + 8 + 1e-9);
    const toks = cs.map((c) => tokenOf(level, c));
    return { phrase: ph.index, key: toks.join(' '), risky: toks.some((t) => t !== '1') };
  });
}

// 8박(2마디) 창: 마디 첫 박마다 시작하는 [s, s+8), 받침 쉼 박이 하나도 없는(놀이 중) 창만, 위험 토큰이 1개 이상인 창만.
// 창 열쇠 = 창 안 접촉의 (박 − s, 토큰) 목록. 받침 쉼 경계가 걸친 창은 "쉼 + 구절 시작"이라 V-R4 ①(구절 시작)이 따로 봄.
export function windows8(level, { bar = level.beats_per_bar || 4, len = 8 } = {}) {
  const rest = [];
  for (const ph of level.phrases) rest.push([ph.start_beat, ph.start_beat + ph.rest_beats]);
  const toks = level.contacts.map((c) => ({ beat: c.beat, tok: tokenOf(level, c) }));
  const out = [];
  for (let s = 0; s + len <= level.length_beats; s += bar) {
    if (rest.some(([a, z]) => a < s + len && z > s)) continue;
    const inW = toks.filter((x) => x.beat >= s && x.beat < s + len);
    if (!inW.some((x) => x.tok !== '1')) continue;
    const parts = inW.map((x) => `${fmt(+(x.beat - s).toFixed(3))}:${x.tok}`);
    out.push({ start: s, key: parts.join(',') });
  }
  return out;
}
