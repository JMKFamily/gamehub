// Web Audio 합성 음악·효과음 (30-art.md 7절, 패턴은 data/music.json). 외부 음원 없음.
// 게임 시간 t의 음은 오디오 시각 ctxStart + t - comp 에 예약한다 (comp = 출력 지연 + 사용자 박자 보정, 시도 시작마다 다시 읽음).

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
export function noteHz(n) {
  const m = /^([A-G]#?)(-?\d)$/.exec(n);
  if (!m) return 440;
  const midi = (+m[2] + 1) * 12 + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
const NAMES = Object.keys(NOTE);
// "A1", "A1:6" 같은 음 표기를 반음 n만큼 옮김 (임시 곡 파생용)
const NOTE_RE = /^([A-G]#?)(-?\d)(:[\d.]+)?$/;
export function transposeNotes(v, n) {
  if (typeof v === "string") {
    const m = NOTE_RE.exec(v);
    if (!m) return v;
    const midi = (+m[2] + 1) * 12 + NOTE[m[1]] + n;
    return NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1) + (m[3] ?? "");
  }
  if (Array.isArray(v)) return v.map((x) => transposeNotes(x, n));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, transposeNotes(x, n)]));
  return v;
}
// 레벨 4~10 곡 (30-art 7-2 표): base 곡 + 덮어쓰기 → 전체를 transpose 반음 이동. bass_octave = 베이스만 옥타브 이동 (level7)
export function deriveTheme(music, spec) {
  const base = music.levels[spec.base] ?? music.levels.level1;
  const { base: _b, transpose = 0, bass_octave: bo = 0, _note, ...over } = spec;
  const m = transposeNotes(JSON.parse(JSON.stringify({ ...base, ...over })), transpose);
  if (bo) {
    if (m.bass) m.bass = { ...m.bass, bars: transposeNotes(m.bass.bars, 12 * bo) };
    if (m.bass_drop) m.bass_drop = { ...m.bass_drop, bar_roots: transposeNotes(m.bass_drop.bar_roots, 12 * bo) };
  }
  m._from = spec.base;
  return m;
}
// music.json levels 중 {base, transpose} 항목을 펼침 (로드 때 한 번)
export function expandThemes(music) {
  for (const [th, v] of Object.entries(music.levels)) if (v && v.base && !v.kick) music.levels[th] = deriveTheme(music, v);
  return music;
}
const parseNote = (s) => { const [n, st] = s.split(':'); return { hz: noteHz(n), step: +st }; };
const db = (d) => Math.pow(10, d / 20);

export function createAudio(music) {
  const A = {
    ctx: null, enabled: true,
    musicVol: 0.8, sfxVol: 0.8, offsetMs: 0, triggerSfx: false,
    playing: false,
  };
  let master, musicGain, sfxGain, duck, runGain, noise, timer = null;
  let run = null; // 현재 재생 중인 시도: {level, L, theme, ctxStart, comp, nextStep, stepS}
  const I = music.instruments;

  A.init = () => {
    if (A.ctx || !A.enabled) return A.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { A.enabled = false; return null; }
    const ctx = new AC({ latencyHint: 'interactive' });
    A.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = music.master.threshold_db;
    comp.ratio.value = music.master.ratio;
    master = ctx.createGain(); master.gain.value = music.master.gain;
    comp.connect(master); master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.connect(comp);
    sfxGain = ctx.createGain(); sfxGain.connect(comp);
    A.setVolumes(A.musicVol, A.sfxVol);
    // (round-3 메뉴 전환 ≤ 100 ms) 잡음 버퍼는 첫 탭 프레임 밖에서 만듦. 첫 소리(음악·사망음)는 자동 지연 안정 대기(≥ 0.25 s) 뒤라 그 전에 준비됨
    setTimeout(makeNoise, 60);
    return ctx;
  };
  // 반환: resume 약속(이미 켜져 있으면 바로 끝난 약속). 컨텍스트는 로드 때 멈춘 상태로 만들어 둘 수 있음 (main setup)
  A.unlock = () => { const c = A.init(); if (c && c.state === 'suspended') return c.resume().catch(() => {}); return Promise.resolve(); };
  A.running = () => !!A.ctx && A.ctx.state === 'running';
  A.setVolumes = (m, s) => {
    A.musicVol = m; A.sfxVol = s;
    if (musicGain) { musicGain.gain.value = m; sfxGain.gain.value = s; }
  };
  // 출력 지연 + 사용자 보정 (양수 = 소리를 더 일찍 냄). 부를 때마다 그 순간의 outputLatency를 다시 읽음 (시도 시작마다 호출됨)
  A.autoLatency = () => { const c = A.ctx; return c ? (c.outputLatency || 0) + (c.baseLatency || 0) : 0; };
  A.comp = () => A.autoLatency() + A.offsetMs / 1000;
  // 자동 지연 안정 대기 (insights rhythm-01: 잠금 해제 직후 outputLatency가 약 0.2 s 뒤 실제 값으로 바뀜).
  // running이 된 뒤 STABLE_S 이상 지났고 값이 STABLE_S 동안 그대로면 안정. MAX_WAIT_S가 지나면 바뀌는 중이어도 진행
  const STABLE_S = 0.25, MAX_WAIT_S = 1.0;
  let lat = { since: null, runAt: null, v: null };
  A.pollLatency = (nowS) => {
    if (!A.running()) { lat = { since: null, runAt: null, v: null }; return; }
    if (lat.runAt == null) lat.runAt = nowS;
    const v = A.autoLatency();
    if (lat.v == null || Math.abs(v - lat.v) > 0.0005) { lat.v = v; lat.since = nowS; }
  };
  A.latencyStable = (nowS) => {
    if (!A.running()) return true;
    if (lat.runAt == null) return false;
    if (nowS - lat.runAt >= MAX_WAIT_S) return true;
    return nowS - lat.runAt >= STABLE_S && nowS - lat.since >= STABLE_S;
  };
  A.latencyState = () => ({ ...lat });

  // ---------------------------------------------------------------- 악기
  function env(g, t, a, peak, dec, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.max(a, 0.001));
    g.gain.exponentialRampToValueAtTime(end, t + a + dec);
  }
  function osc(type, hz, t, dur, dest, detune = 0) {
    const o = A.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(hz, t); o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function makeNoise() {
    if (noise || !A.ctx) return;
    const ctx = A.ctx, len = ctx.sampleRate;
    const nb = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = nb.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff) - 1; }
    noise = nb;
  }
  function noiseSrc(t, dur, dest) {
    makeNoise(); // 아직 없으면 바로 만듦 (같은 값)
    const n = A.ctx.createBufferSource();
    n.buffer = noise; n.loop = true;
    n.connect(dest); n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.05);
    return n;
  }
  const ctxNode = (fn) => fn(A.ctx);

  const inst = {
    kick(t, out, vel = 1) {
      const p = I.kick, g = A.ctx.createGain(); g.connect(out);
      env(g, t, 0.001, p.gain * vel, p.decay_s);
      const o = osc('sine', p.f0, t, p.decay_s, g);
      o.frequency.exponentialRampToValueAtTime(p.f1, t + p.pitch_s);
      // 사이드체인: 베이스·패드 버스를 잠깐 누름
      if (duck) {
        duck.gain.cancelScheduledValues(t);
        duck.gain.setValueAtTime(music.sidechain.depth, t);
        duck.gain.linearRampToValueAtTime(1, t + music.sidechain.release_s);
      }
    },
    snare(t, out) {
      const p = I.snare;
      const bp = A.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = p.bp_hz; bp.Q.value = p.q;
      const g = A.ctx.createGain(); bp.connect(g); g.connect(out);
      env(g, t, 0.001, p.noise_gain, p.noise_s);
      noiseSrc(t, p.noise_s, bp);
      const g2 = A.ctx.createGain(); g2.connect(out);
      env(g2, t, 0.001, p.tone_gain, p.tone_s);
      osc('triangle', p.tone_hz, t, p.tone_s, g2);
    },
    clap(t, out) {
      const p = I.clap;
      const bp = A.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = p.bp_hz;
      const g = A.ctx.createGain(); bp.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.0001, t);
      for (let i = 0; i < p.count; i++) {
        const ti = t + i * p.retrig_s;
        g.gain.setValueAtTime(p.gain, ti);
        g.gain.exponentialRampToValueAtTime(0.05, ti + p.retrig_s * 0.9);
      }
      const tl = t + p.count * p.retrig_s;
      g.gain.setValueAtTime(p.gain, tl);
      g.gain.exponentialRampToValueAtTime(0.0001, tl + p.tail_s);
      noiseSrc(t, p.count * p.retrig_s + p.tail_s, bp);
    },
    hat(t, out, open = false, vel = 1) {
      const p = I.hat, dur = open ? p.open_s : p.closed_s;
      const hp = A.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = p.hp_hz;
      const g = A.ctx.createGain(); hp.connect(g); g.connect(out);
      env(g, t, 0.001, p.gain * vel, dur);
      noiseSrc(t, dur, hp);
    },
    bass(t, out, hz, dur) {
      const p = I.bass;
      const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = p.q;
      lp.frequency.setValueAtTime(p.env_hi, t);
      lp.frequency.exponentialRampToValueAtTime(p.env_lo, t + p.env_s);
      const g = A.ctx.createGain(); lp.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p.gain, t + p.a);
      g.gain.exponentialRampToValueAtTime(p.gain * p.s, t + p.a + p.d);
      g.gain.setValueAtTime(p.gain * p.s, t + Math.max(dur, p.a + p.d));
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, p.a + p.d) + p.r);
      osc('sawtooth', hz, t, dur + p.r, lp);
      const sg = A.ctx.createGain(); sg.gain.value = p.sub_mix; sg.connect(lp);
      osc('square', hz / 2, t, dur + p.r, sg);
    },
    lead(t, out, hz, dur) {
      const p = I.lead;
      const g = A.ctx.createGain(); g.connect(out);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p.gain, t + p.a);
      g.gain.exponentialRampToValueAtTime(p.gain * p.s, t + p.a + p.d);
      g.gain.setValueAtTime(p.gain * p.s, t + Math.max(dur, p.a + p.d));
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, p.a + p.d) + p.r);
      const lfo = A.ctx.createOscillator(); lfo.frequency.value = p.vib_hz;
      const lg = A.ctx.createGain(); lg.gain.value = p.vib_cents; lfo.connect(lg);
      const o1 = osc('triangle', hz, t, dur + p.r, g);
      const fg = A.ctx.createGain(); fg.gain.value = p.fifth_mix; fg.connect(g);
      const o2 = osc('sine', hz * 1.5, t, dur + p.r, fg);
      lg.connect(o1.detune); lg.connect(o2.detune);
      lfo.start(t); lfo.stop(t + dur + p.r + 0.05);
    },
    pad(t, out, notes, dur, lpHz) {
      const p = I.pad;
      const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lpHz ?? p.lp_hz;
      const g = A.ctx.createGain(); lp.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(p.gain, t + p.a);
      g.gain.setValueAtTime(p.gain, t + dur);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + p.r);
      for (const n of notes) {
        osc('sawtooth', noteHz(n), t, dur + p.r, lp, -p.detune_cents);
        osc('sawtooth', noteHz(n), t, dur + p.r, lp, p.detune_cents);
      }
    },
    fork(t, out, hz) {
      const p = I.fork;
      const g = A.ctx.createGain(); g.connect(out);
      env(g, t, p.a, p.gain, p.decay_s);
      osc('sine', hz, t, p.decay_s, g);
      const g2 = A.ctx.createGain(); g2.gain.value = p.partial_mix; g2.connect(g);
      osc('sine', hz * p.partial, t, p.decay_s, g2);
    },
    bell(t, out, hz, vel = 1) {
      const p = I.bell;
      for (const [mul, mix, dec] of p.partials) {
        const g = A.ctx.createGain(); g.connect(out);
        env(g, t, p.a, p.gain * mix * vel, dec);
        osc('sine', hz * mul, t, dec, g);
      }
    },
  };
  A._inst = inst;

  // ---------------------------------------------------------------- 음악 스케줄러
  function sectionAt(level, beat) {
    let s = level.sections[0];
    for (const x of level.sections) if (x.start_beat <= beat + 1e-6) s = x;
    return s;
  }
  // intensity 0은 위치로 intro/breath/outro (30-art 7-2). 구간 이름에 의존하지 않음
  function partsFor(level, sec) {
    const P = music.parts_by_section;
    if (sec.intensity === 0) {
      const i = level.sections.indexOf(sec);
      return i === 0 ? P.intro : i === level.sections.length - 1 ? P.outro : P.breath;
    }
    return P[String(sec.intensity)] ?? P['2'];
  }
  // 레벨 데이터에서 규칙 위치 계산: intensity 4 구간마다 마지막 마디, 마지막 intensity 3 구간
  function rulesFor(level) {
    const secs = level.sections, endOf = (i) => (i + 1 < secs.length ? secs[i + 1].start_beat : level.length_beats);
    const fills = [];
    secs.forEach((x, i) => { if (x.intensity >= 4) { const e = endOf(i); fills.push([Math.max(x.start_beat, e - level.beats_per_bar), e]); } });
    let last3 = null;
    secs.forEach((x) => { if (x.intensity === 3) last3 = x; });
    return { fills, last3 };
  }

  function scheduleStep(n, t) {
    const r = run, m = r.m, level = r.level;
    const s16 = ((n % 16) + 16) % 16;
    const bar = Math.floor(n / 16);
    const beat = n / 4;
    const sec = sectionAt(level, beat);
    const parts = partsFor(level, sec);
    const has = (p) => parts.includes(p);
    // 템포 문 편곡 (30-art 부록 B-6): BPM 그대로. 느림 = 킥 4분·햇 끔·패드 800 Hz, 빠름 = 햇 16분 추가
    const tick = Math.max(0, Math.min(r.L.V.length - 1, Math.round((beat * r.beatS) * r.L.bal.physics_hz)));
    const v = r.L.V[tick];
    const GT = music.gates ?? {};
    const slowSpec = m.slow ?? GT.slow;
    const slow = !!slowSpec && v === r.L.bal.speeds_t_s.slow;
    const fast = !!GT.fast?.hat16 && v > r.L.bal.speeds_t_s.normal + 1e-9;
    const out = runGain, soft = duck;
    const hit = (pat) => pat && pat[s16] === 'x';

    // 킥
    let kp = has('kick_intro') ? m.kick_intro : has('kick') ? m.kick : null;
    if (kp && slow && slowSpec.kick) kp = slowSpec.kick;
    if (kp && m.kick_fill && sec.intensity >= 4 && r.rules.fills.some(([a, b]) => beat >= a - 1e-6 && beat < b - 1e-6)) kp = m.kick_fill.pattern;
    if (hit(kp)) inst.kick(t, out);
    // 스네어/클랩
    if (has('snare')) {
      const sp = slow && slowSpec.snare ? slowSpec.snare : m.snare;
      if (sp && hit(sp)) inst.snare(t, out);
      if (m.clap && hit(m.clap)) inst.clap(t, out);
    }
    // 햇
    if (has('hat') && !(slow && slowSpec.hat === false)) {
      const h16 = m.hat16 ?? GT.hat16_default;
      if ((has('hat16') || fast) && h16) {
        if (h16.pattern[s16] === 'x') inst.hat(t, out, false, s16 % 2 === 0 ? h16.even_gain : 1);
      } else if (m.hat) {
        const c = m.hat[s16];
        if (c === 'x' || c === 'o') inst.hat(t, out, c === 'o');
      }
    }
    // 베이스
    if (has('bass')) {
      if (sec.intensity >= 4 && m.bass_drop) {
        const bd = m.bass_drop;
        if (s16 % 2 === 0) {
          const root = bd.bar_roots[((bar % bd.bar_roots.length) + bd.bar_roots.length) % bd.bar_roots.length];
          inst.bass(t, soft, noteHz(root), bd.len_steps * r.stepS);
        }
      } else {
        const bars = m.bass.bars;
        const notes = bars[((bar % bars.length) + bars.length) % bars.length];
        for (const s of notes) { const p = parseNote(s); if (p.step === s16) inst.bass(t, soft, p.hz, m.bass.len_steps * r.stepS); }
      }
    }
    // 패드 (마디 첫 스텝, 1마디 길이)
    if (has('pad') && s16 === 0 && m.pad) {
      const bars = m.pad.bars;
      const chord = bars[((bar % bars.length) + bars.length) % bars.length];
      let lp = slow ? slowSpec.pad_lp_hz : (sec.intensity >= 3 && m.pad.drop_lp_hz) ? m.pad.drop_lp_hz : undefined;
      inst.pad(t, soft, chord, 16 * r.stepS * 0.9, lp);
    }
    // 리드
    if (has('lead') && m.lead) {
      if (m.lead.arp16) {
        if (sec.intensity >= 4) inst.lead(t, out, noteHz(m.lead.arp16[s16 % m.lead.arp16.length]), r.stepS * 0.8);
      } else {
        const bars = m.lead.bars;
        const notes = bars[((bar % bars.length) + bars.length) % bars.length];
        for (const s of notes) {
          const p = parseNote(s);
          if (p.step !== s16) continue;
          if (m.lead.instrument === 'fork') inst.fork(t, out, p.hz);
          else inst.lead(t, out, p.hz, 4 * r.stepS * 0.9);
        }
      }
    }
    // 종 (마디 첫 박)
    if (m.bell_bar && s16 === 0 && sec === r.rules.last3) inst.bell(t, out, noteHz(m.bell_bar.note));
    // 마무리 음: outro 구간 첫 스텝
    if (has('outro_note') && m.outro_note && Math.abs(beat - sec.start_beat) < 1e-6) {
      const on = m.outro_note, hz = noteHz(on.note);
      if (on.instrument === 'bell') inst.bell(t, out, hz);
      else if (on.instrument === 'fork') inst.fork(t, out, hz);
      else inst.lead(t, out, hz, 8 * r.stepS);
    }
  }

  function pump() {
    if (!run || !A.ctx) return;
    const now = A.ctx.currentTime;
    while (true) {
      const tGame = run.nextStep * run.stepS;
      const tc = run.ctxStart + tGame - run.comp;
      if (tc > now + music.lookahead_s) break;
      if (tc >= now - 0.01) scheduleStep(run.nextStep, Math.max(tc, now));
      run.nextStep++;
      if (tGame > run.endS) break;
    }
  }

  // 시도 시작: 게임 시간 fromS 부터. 반환 = 게임 시간 0의 ctx 시각 (main이 시계 동기화에 씀)
  A.startRun = (level, L, theme, fromS, leadS) => {
    if (!A.running()) return null;
    A.stopRun(true);
    const ctx = A.ctx;
    runGain = ctx.createGain(); runGain.connect(musicGain);
    duck = ctx.createGain(); duck.connect(runGain);
    const comp = A.comp();
    const beatS = 60 / level.bpm, stepS = beatS / 4;
    // 게임 시간 fromS 가 ctx 시각 now + leadS 에 화면에 나오도록
    const ctxStart = ctx.currentTime + leadS - fromS;
    run = { level, L, theme, m: music.levels[theme] ?? music.levels.level1, rules: rulesFor(level), ctxStart, comp, beatS, stepS,
      nextStep: Math.ceil(fromS / stepS - 1e-6), endS: level.duration_s + 4 };
    // (round-3) 첫 예약을 시도 시작 프레임 밖으로 (첫 음은 leadS ≥ 0.05 s + 지연 뒤라 다음 작업에서 예약해도 늦지 않음)
    setTimeout(pump, 0);
    timer = setInterval(pump, music.scheduler_interval_ms);
    A.playing = true;
    return ctxStart;
  };
  // 사망 등: 즉시 정지
  A.stopRun = (instant = false) => {
    if (timer) { clearInterval(timer); timer = null; }
    if (runGain && A.ctx) {
      const g = runGain, t = A.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + (instant ? 0.01 : 0.04));
      setTimeout(() => { try { g.disconnect(); } catch {} }, 300);
    }
    runGain = null; duck = null; run = null;
    A.playing = false;
  };
  A.runCtxStart = () => (run ? run.ctxStart : null);
  A.runComp = () => (run ? run.comp : 0);
  A.suspend = () => A.ctx?.state === 'running' && A.ctx.suspend();
  A.resume = () => A.ctx?.state === 'suspended' && A.ctx.resume();

  // ---------------------------------------------------------------- 효과음
  const S = music.sfx;
  function sfxOut(d) { const g = A.ctx.createGain(); g.gain.value = db(d); g.connect(sfxGain); return g; }
  function beep(f, dur, d, t, type = 'sine') {
    const g = sfxOut(d), e = A.ctx.createGain(); e.connect(g);
    env(e, t, 0.002, 1, dur);
    osc(type, f, t, dur, e);
  }
  A.sfx = (name, opt = {}) => {
    if (!A.running()) return;
    const t = A.ctx.currentTime + 0.005;
    if (name === 'death') {
      const p = S.death, out = sfxOut(p.db);
      const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(p.lp0, t); lp.frequency.exponentialRampToValueAtTime(p.lp1, t + p.noise_s);
      const g = A.ctx.createGain(); lp.connect(g); g.connect(out);
      env(g, t, p.attack_s ?? 0.005, 0.9, p.noise_s);
      noiseSrc(t, p.noise_s, lp);
      const g2 = A.ctx.createGain(); g2.connect(out); env(g2, t, p.attack_s ?? 0.005, 0.5, p.tone_s);
      const o = osc(p.tone_type ?? 'triangle', p.tone0, t, p.tone_s, g2);
      o.frequency.exponentialRampToValueAtTime(p.tone1, t + p.tone_s);
    } else if (name === 'clear') {
      const p = S.clear, m = music.levels[opt.theme] ?? music.levels.level1;
      const root = noteHz(m.root);
      const st = [0, m.third ?? 4, 7, 12];
      st.forEach((s, i) => {
        const ti = t + i * p.note_s;
        const last = i === st.length - 1;
        if (last && m.clear_bell) { inst.bell(ti, sfxOut(p.db), noteHz(m.clear_bell), 1.4); return; }
        const g = sfxOut(p.db), e = A.ctx.createGain(); e.connect(g);
        env(e, ti, 0.003, 0.8, last ? p.release_s : p.note_s);
        osc('triangle', root * Math.pow(2, s / 12), ti, last ? p.release_s : p.note_s, e);
      });
    } else if (name === 'checkpoint') {
      const p = S.checkpoint;
      beep(p.f1, p.s1, p.db, t); beep(p.f2, p.s2, p.db, t + p.s1);
    } else if (name === 'menu') {
      beep(S.menu.f, S.menu.s, S.menu.db, t);
    } else if (name === 'trigger') {
      if (!A.triggerSfx) return;
      // 다음 16분 스텝에 양자화
      let tq = t;
      if (run) {
        const g = (t - run.ctxStart + run.comp) / run.stepS;
        tq = run.ctxStart - run.comp + Math.ceil(g) * run.stepS;
      }
      beep(S.trigger.f, S.trigger.s, S.trigger.db, tq, 'triangle');
    } else if (name === 'new_best') {
      beep(S.new_best.f, S.new_best.s, S.new_best.db, t + S.new_best.delay_s);
    } else if (name === 'combo_mark') {
      // 콤보 단계 화음 (30-art 5-8-6, round-3: 5·10·15·20, 음 2·3·4·5개): 판정 박 + delay_beats 시각에 예약.
      // 음 하나 gain = (1/3)·√(3/음 수) (voice_norm sqrt_3_over_n: 음 수가 늘어도 크기가 같게, 3음 = round-2 렌더 기준)
      const p = S.combo_mark; if (!p || !run) return;
      const m = run.m, rootName = /^([A-G]#?)/.exec(m.root ?? 'A3')[1];
      const rootHz = noteHz(rootName + (p.root_octave ?? 4));
      const tones = p.tones[String(opt.mark)];
      if (!tones) return;
      const peak = p.voice_norm === 'sqrt_3_over_n' ? Math.sqrt(3 / tones.length) / 3 : 1 / tones.length;
      const tGame = opt.beatTimeS + p.delay_beats * run.beatS;
      const tc = Math.max(t, run.ctxStart + tGame - run.comp);
      for (const st of tones) {
        const semi = st === 'third' ? (m.third ?? 4) : st;
        const g = sfxOut(p.db), e = A.ctx.createGain(); e.connect(g);
        env(e, tc, p.a, peak, p.decay_s);
        osc(p.wave, rootHz * Math.pow(2, semi / 12), tc, p.decay_s, e);
      }
    } else if (name === 'tick') {
      // 박자 보정 테스트용 메트로놈
      inst.fork(opt.at ?? t, sfxOut(-10), opt.hz ?? 880);
    }
  };
  A.ctxNode = ctxNode;
  return A;
}
