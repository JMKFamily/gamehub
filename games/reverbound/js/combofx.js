// 콤보 연출 (30-art 5-8, round-3): 큰 콤보 숫자 블록 · 단계 파티클 · 판정 이름 + %.
// 게임 캔버스 하나에 그린다. 글자는 레벨을 열 때 오프스크린 아틀라스에 미리 그리고, 프레임 안에서는 drawImage·fillRect만 쓴다
// (fillText·strokeText·measureText·shadowBlur·그라데이션·새 객체 생성 0, 결정 22).
// 시간 인자 now는 화면 문구 시계 uiT(게임이 진행될 때만 흐름)라 ?test=1 step() 화면과 일반 모드 화면이 같다.

export const JFONT = '"Segoe UI", system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
const POOL = 32;              // 5-8-3 풀 32개 (6절 입자 48개와 따로)
const STAGE_N = [0, 8, 16, 24, 32];
const STAGE_VY = [0, 0.5, 0.8, 1.1, 1.4]; // 타일/s
const A_FREE = 0.30, A_NEAR = 0.04;       // 5-8-1
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createComboFx(R, art, bal, { t, reduced = false, rand = Math.random } = {}) {
  const C = art.common;
  const CB = bal.combo;
  const JH = CB.judge_pct?.hud ?? {};
  const POP_S = (CB.hud?.pop_ms ?? 120) / 1000, POP_K = CB.hud?.pop_scale ?? 1.15;
  const BREAK_S = CB.hud?.break_fade_s ?? 0.3;
  const J_POP = (JH.pop_ms ?? 60) / 1000, J_HOLD = (JH.hold_ms ?? 240) / 1000, J_FADE = (JH.fade_ms ?? 150) / 1000;
  const J_TOTAL = J_POP + J_HOLD + J_FADE; // 0.45 s (결정 15)
  const J_DIE = JH.hide_on_death_s ?? 0.3;
  const marks = CB.mark_at ?? [5, 10, 15, 20];
  const stageOf = (n) => { let s = 0; for (const m of marks) if (n >= m) s++; return Math.min(4, s); };
  const FX = { stageOf, marks };

  // ---------------------------------------------------------------- 아틀라스 (레벨 첫 프레임 전, 크기·dpr·언어·테마가 바뀔 때만)
  let A = null, akey = '', curTheme = 'level1';
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function geom() {
    const T = R.T;
    let portrait = R.portrait, Hn;
    const lab = (hn) => Math.max(14, 0.26 * hn);
    if (portrait) {
      // clamp(H × 0.12, 28, 위 빈 띠 − 라벨 − 0.5타일). 빈 띠가 28 px + 라벨을 못 담으면 가로 규칙 (5-8-1 세로 자리)
      // 빈 띠 = HUD 띠 아래 끝 ~ gameTop (HUD 글자와 겹치지 않게). 블록 높이 ≈ 숫자 칸 1.2 Hn + 0.08 Hn + 라벨 1.25줄 + 아래 0.3타일
      const band = R.gameTop - (R.hudBottom ?? 0) - 4;
      const need = (hn) => hn * 1.28 + lab(hn) * 1.25 + 0.3 * T;
      let hn = R.H * 0.12;
      while (hn > 28 && need(hn) > band) hn -= 1;
      if (need(28) > band) { portrait = false; Hn = R.H * 0.14; }
      else Hn = Math.max(28, hn);
    } else Hn = R.H * 0.14;
    return { Hn, label: lab(Hn), portraitBand: portrait };
  }
  FX.build = (theme) => {
    const dpr = R.dpr, T = R.T;
    // 테마(파티클 색)가 바뀌어도 다시 만들지 않음: 10레벨 점 스프라이트를 한 번에 구움
    curTheme = theme;
    if (A) { A.fx = A.fxBy[theme] ?? A.fxBy.level1; A.dots = A.dotsBy[theme] ?? A.dotsBy.level1; }
    const key = [R.W, R.H, dpr, Math.round(R.hudBottom ?? 0)].join('|');
    if (key === akey) return false;
    akey = key;
    const g0 = geom();
    const probe = mk(4, 4).getContext('2d');
    // 숫자: "0"의 실제 글자 높이 = Hn (measureText는 여기서만)
    probe.font = `800 100px ${JFONT}`;
    const asc0 = probe.measureText('0').actualBoundingBoxAscent || 72;
    const fs = (g0.Hn / asc0) * 100;
    probe.font = `800 ${fs}px ${JFONT}`;
    let cw = 0; for (let d = 0; d <= 9; d++) cw = Math.max(cw, probe.measureText(String(d)).width);
    cw = Math.ceil(cw + 1);
    const desc = Math.ceil(fs * 0.08), padT = Math.ceil(fs * 0.06);
    const nh = Math.ceil(g0.Hn + padT + desc);
    probe.font = `600 ${g0.label}px ${JFONT}`;
    const labTxt = t('combo_label');
    const lm = probe.measureText(labTxt);
    const lAsc = Math.ceil(lm.actualBoundingBoxAscent || g0.label * 0.75), lDesc = Math.ceil(lm.actualBoundingBoxDescent || g0.label * 0.2);
    const lw = Math.ceil(lm.width + 2), lh = lAsc + lDesc + 2;
    // 막대 4개 (5-8-1): 폭 0.14 Hn, 간격 0.08 Hn, 높이 0.6 Hn × 0.25/0.5/0.75/1, 모서리 0.03 Hn. 단계 0~4 다섯 장
    const bw = 0.14 * g0.Hn, bg = 0.08 * g0.Hn, bh = 0.6 * g0.Hn;
    const barsW = 4 * bw + 3 * bg;
    // 판정 글 (5-8-2): 이름 clamp(0.5T,16,36)·등급 배율, % clamp(0.32T,12,22), 받침 judgePlate α0.5
    const fp = Math.max(12, Math.min(22, 0.32 * T));
    const padX = 0.06 * T, padY = 0.04 * T, rad = 0.1 * T;
    probe.font = `800 ${fp}px ${JFONT}`;
    const gl = '0123456789%';
    const gw = [...gl].map((ch) => Math.ceil(probe.measureText(ch).width));
    const pctAsc = Math.ceil(probe.measureText('0').actualBoundingBoxAscent || fp * 0.72);
    const pctW = gw[1] + gw[0] * 2 + gw[10]; // "100%"
    const grades = [1, 2, 3].map((gr) => {
      const sc = gr === 1 ? 1 : gr === 2 ? 0.9 : 0.8;
      const fn = Math.max(16, Math.min(36, 0.5 * T) * sc);
      probe.font = `900 ${fn}px ${JFONT}`;
      const nm = t('judge_name_' + gr);
      const m = probe.measureText(nm);
      const nAsc = Math.ceil(m.actualBoundingBoxAscent || fn * 0.75), nDesc = Math.ceil(m.actualBoundingBoxDescent || fn * 0.15);
      const dotD = fn * 0.2, nDot = gr === 1 ? 3 : gr === 2 ? 1 : 0;
      const dotsH = nDot ? dotD * 1.9 : 0;
      const nameW = Math.ceil(m.width);
      const col = gr === 1 ? C.player : gr === 2 ? C.trigger : C.hud;
      return { gr, fn, nm, nAsc, nDesc, dotD, nDot, dotsH, nameW, col };
    });
    // 레이아웃: 한 줄에 [숫자 0~9][라벨][막대 5장] / 판정 6장(등급 × %줄 있음·없음) / % 글리프 / 파티클 점 4색 × 3크기
    const items = [];
    const P = Math.ceil(2 * dpr); // 칸 사이 여백(device px)
    let x = P, y = P, rowH = 0, maxW = 0;
    const W0 = 2048;
    const place = (w, h) => { const dw = Math.ceil(w * dpr), dh = Math.ceil(h * dpr); if (x + dw + P > W0) { x = P; y += rowH + P; rowH = 0; } const r = { x, y, w: dw, h: dh }; x += dw + P; rowH = Math.max(rowH, dh); maxW = Math.max(maxW, x); items.push(r); return r; };
    const digits = []; for (let d = 0; d <= 9; d++) digits.push(place(cw, nh));
    const label = place(lw, lh);
    const bars = []; for (let s = 0; s <= 4; s++) bars.push(place(barsW + 2, bh + 2));
    const judge = grades.map((g) => {
      const w = Math.ceil(Math.max(g.nameW, pctW) + 2 * padX);
      const hNo = Math.ceil(padY * 2 + g.dotsH + g.nAsc + g.nDesc);
      const hYes = Math.ceil(hNo + pctAsc + fp * 0.25);
      return { g, w, hNo, hYes, no: place(w, hNo), yes: place(w, hYes) };
    });
    const glyph = gw.map((w) => place(w + 1, pctAsc + 2));
    const dotSz = [0.08, 0.12, 0.16].map((k) => Math.max(2, k * T));
    const themes = Object.keys(art.palette);
    const dotsBy = {};
    for (const th of themes) dotsBy[th] = [1, 2, 3, 4].map(() => dotSz.map((s) => place(s + 1, s + 1)));
    const cv = mk(maxW + P, y + rowH + P);
    const g = cv.getContext('2d');
    g.textBaseline = 'alphabetic';
    // 숫자
    g.fillStyle = C.comboNum; g.font = `800 ${fs * dpr}px ${JFONT}`; g.textAlign = 'center';
    digits.forEach((r, d) => g.fillText(String(d), r.x + r.w / 2, r.y + (padT + g0.Hn) * dpr));
    // 라벨 (숫자 아래, 소문자 그대로)
    g.font = `600 ${g0.label * dpr}px ${JFONT}`;
    g.fillText(labTxt, label.x + label.w / 2, label.y + (lAsc + 1) * dpr);
    // 막대 (닿은 막대 = 불투명, 못 닿은 막대 = × 0.35)
    bars.forEach((r, s) => {
      for (let i = 0; i < 4; i++) {
        const h = bh * (i + 1) / 4;
        g.globalAlpha = i < s ? 1 : 0.35;
        rr(g, r.x + (1 + i * (bw + bg)) * dpr, r.y + (1 + bh - h) * dpr, bw * dpr, h * dpr, 0.03 * g0.Hn * dpr); g.fill();
      }
      g.globalAlpha = 1;
    });
    // 판정 글: 받침 + 등급 점 + 이름 (테·그림자 없이 채움만)
    for (const j of judge) {
      for (const [r, h, withPct] of [[j.no, j.hNo, false], [j.yes, j.hYes, true]]) {
        g.globalAlpha = 0.5; g.fillStyle = C.judgePlate;
        rr(g, r.x, r.y, j.w * dpr, h * dpr, rad * dpr); g.fill();
        g.globalAlpha = 1; g.fillStyle = j.g.col;
        const cx = r.x + (j.w / 2) * dpr;
        const dy0 = r.y + (padY + j.g.dotsH * 0.5) * dpr;
        for (let i = 0; i < j.g.nDot; i++) {
          const off = j.g.nDot === 1 ? 0 : (i - 1) * j.g.dotD * 1.8;
          const lift = j.g.nDot === 1 ? 0 : i === 1 ? -j.g.dotD * 0.45 : 0;
          g.beginPath(); g.arc(cx + off * dpr, dy0 + (lift + j.g.dotD * 0.2) * dpr, (j.g.dotD / 2) * dpr, 0, Math.PI * 2); g.fill();
        }
        g.font = `900 ${j.g.fn * dpr}px ${JFONT}`; g.textAlign = 'center';
        g.fillText(j.g.nm, cx, r.y + (padY + j.g.dotsH + j.g.nAsc) * dpr);
        j[withPct ? 'pctTop' : 'nameBottom'] = padY + j.g.dotsH + j.g.nAsc + j.g.nDesc; // % 줄 시작 y (CSS px)
      }
    }
    // % 글리프 (hud)
    g.fillStyle = C.hud; g.font = `800 ${fp * dpr}px ${JFONT}`; g.textAlign = 'left';
    glyph.forEach((r, i) => g.fillText(gl[i], r.x, r.y + (pctAsc + 1) * dpr));
    // 파티클 점 스프라이트 (그 레벨 comboFx1~4)
    const fxBy = {};
    for (const th of themes) {
      const env = art.palette[th];
      fxBy[th] = [1, 2, 3, 4].map((i) => env['comboFx' + i] ?? C.hud);
      dotsBy[th].forEach((row, ci) => row.forEach((r, si) => { g.fillStyle = fxBy[th][ci]; const s = dotSz[si] * dpr; g.beginPath(); g.arc(r.x + s / 2 + 0.5, r.y + s / 2 + 0.5, s / 2, 0, Math.PI * 2); g.fill(); }));
    }
    A = { cv, dpr, Hn: g0.Hn, cw, nh, padT, label, lw, lh, bars, barsW, bh, digits, judge, glyph, gw, pctAsc, pctW, fp, padX, padY, dotSz, portraitBand: g0.portraitBand, labelSize: g0.label,
      fxBy, dotsBy, fx: fxBy[curTheme] ?? fxBy.level1, dots: dotsBy[curTheme] ?? dotsBy.level1 };
    FX.warmPending = true;
    return true;
  };
  FX.atlas = () => A;
  // 첫 사용 비용을 미리 냄: 아틀라스 전체를 화면 안 좌표에 한 번 그림 (호출하는 쪽이 바로 위에 배경을 덮음, 5-8-4)
  FX.warm = (ctx) => {
    if (!A || !FX.warmPending) return;
    FX.warmPending = false;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.drawImage(A.cv, 0, 0);
    ctx.restore();
  };
  const blit = (ctx, r, dx, dy, s = 1) => ctx.drawImage(A.cv, r.x, r.y, r.w, r.h, dx, dy, (r.w / A.dpr) * s, (r.h / A.dpr) * s);

  // ---------------------------------------------------------------- 큰 숫자 블록 상태 (5-8-1)
  const B = { value: 0, shown: 0, visAt: -9, popAt: -9, stageAt: -9, stage: 0, prevStage: 0, dieAt: -9, clearAt: -9, a: A_FREE, nearUntil: -9, nearOn: false, card: 1, rect: { l: 0, t: 0, r: 0, b: 0 }, alpha: 0, visible: false };
  FX.block = B;
  // ---------------------------------------------------------------- 파티클 (5-8-3)
  const parts = Array.from({ length: POOL }, () => ({ on: false, x: 0, y: 0, vy: 0, age: 0, life: 1, c: 0, sq: true, si: 0, boostAt: -9, boostK: 1, boostS: 0 }));
  const PS = { dieAt: -9, clearAt: -9, active: 0 };
  FX.parts = parts;

  FX.reset = () => {
    Object.assign(B, { value: 0, shown: 0, visAt: -9, popAt: -9, stageAt: -9, stage: 0, prevStage: 0, dieAt: -9, clearAt: -9, a: A_FREE, nearUntil: -9, nearOn: false, card: 1, alpha: 0, visible: false });
    for (const p of parts) p.on = false;
    PS.dieAt = -9; PS.clearAt = -9; PS.active = 0;
    jf.on = false;
  };
  function area() {
    const T = R.T;
    const top = R.portrait ? Math.max(1.2 * T, R.hudBottom ?? 0) : R.gameTop + 1.3 * T;
    const bot = R.portrait ? R.H : R.groundPx;
    return { top, bot };
  }
  function spawnP(p, c, now, fresh) {
    const T = R.T, ar = area();
    p.on = true; p.c = c; p.age = 0; p.life = 1.6 + rand() * 0.8;
    p.sq = rand() < 0.5; p.si = Math.floor(rand() * 3) % 3;
    p.x = rand() * R.W;
    if (fresh) { p.y = R.groundPx - rand() * T; p.boostAt = now; p.boostK = 2.5; p.boostS = 0.6; }
    else { p.y = ar.top + rand() * (ar.bot - ar.top); p.boostAt = -9; }
  }
  // 콤보 값이 바뀔 때 (판정 성공마다)
  FX.onCombo = (n, now) => {
    const prev = B.value;
    B.value = n;
    if (n >= CB.show_from && prev < CB.show_from) B.visAt = now;
    B.popAt = now;
    const s = stageOf(n);
    if (s > B.stage) {
      B.prevStage = B.stage; B.stage = s; B.stageAt = now;
      // 파티클: 새 8개(새 색) + 기존 vy × 1.5 0.4 s. 움직임 줄이기면 0개
      if (!reduced) {
        for (const p of parts) if (p.on) { p.boostAt = now; p.boostK = 1.5; p.boostS = 0.4; }
        let need = STAGE_N[s] - PS.active;
        for (const p of parts) { if (need <= 0) break; if (!p.on) { spawnP(p, s - 1, now, true); need--; PS.active++; } }
      }
    }
  };
  FX.onBreak = (now) => { if (B.dieAt < 0) B.dieAt = now; if (PS.dieAt < 0) PS.dieAt = now; if (jf.on && jf.dieAt < 0) jf.dieAt = now; };
  FX.onClear = (now) => { B.clearAt = now; PS.clearAt = now; if (jf.on) jf.clearAt = now; };

  // dt: 게임 진행 시간(s), speed: 지금 속도(타일/s)
  FX.update = (dt, now, speed) => {
    if (PS.active === 0) return;
    const T = R.T, ar = area();
    const vx = -0.2 * speed * T;
    if (PS.dieAt >= 0 && now - PS.dieAt >= BREAK_S) { for (const p of parts) p.on = false; PS.active = 0; return; }
    const noNew = PS.dieAt >= 0 || PS.clearAt >= 0;
    const vy0 = STAGE_VY[B.stage] * T;
    for (const p of parts) {
      if (!p.on) continue;
      p.age += dt;
      if (p.age >= p.life) { if (noNew) { p.on = false; PS.active--; continue; } spawnP(p, p.c, now, false); }
      let k = 1;
      if (p.boostAt >= 0) { const e = (now - p.boostAt) / p.boostS; if (e >= 1) p.boostAt = -9; else k = p.boostK + (1 - p.boostK) * e; }
      p.x += vx * dt; p.y -= vy0 * k * dt;
      if (p.x < -8) p.x += R.W + 16;
      if (p.y < ar.top) p.y = ar.bot - (ar.top - p.y);
    }
  };

  // 블록 상자 (CSS px). s = 튐 배율, 기준점 = 블록 위 끝 가운데
  function blockBox(digits, s) {
    const T = R.T, Hn = A.Hn;
    const numW = digits * A.cw;
    const gap = 0.15 * Hn;
    let cx = R.W / 2;
    const top0 = A.portraitBand ? R.gameTop - 0.3 * T - A.lh - 0.08 * Hn - A.nh : R.gameTop + 1.2 * T + 0.12 * T;
    // 왼쪽 끝(두 자리·최대 튐 1.30) ≥ 플레이어 오른쪽 + 0.5타일
    const leftAt = (c, dg, sc) => c - Math.max(dg * A.cw / 2, A.lw / 2) * sc;
    const pr = R.W * R.playerRatio + T + 0.5 * T;
    const l2 = leftAt(cx, 2, 1.3);
    if (!A.portraitBand && l2 < pr) cx += pr - l2;
    const numL = cx - numW / 2;
    const barsL = numL + numW + gap;
    const right = Math.max(barsL + A.barsW, cx + A.lw / 2);
    const left = Math.min(numL, cx - A.lw / 2);
    const bottom = top0 + A.nh + 0.08 * Hn + A.lh;
    // 튐 적용 (위 끝 가운데 기준)
    const ax = cx, ay = top0;
    return { cx, numL, barsL, top0, ax, ay, s, l: ax - (ax - left) * s, r: ax + (right - ax) * s, t: top0, b: ay + (bottom - ay) * s };
  }
  // 그 프레임의 블록 alpha 계산 (가까움·카드·끊김·클리어)
  let lastA = 0;
  FX.frameBlock = (now, near, cardRect) => {
    const dt = Math.min(0.1, Math.max(0, now - lastA)); lastA = now;
    if (!A) return null;
    const vis = CB.enabled && B.value >= CB.show_from || (B.dieAt >= 0 && B.shown >= CB.show_from);
    let v = B.dieAt >= 0 ? B.shown : B.value;
    if (B.dieAt < 0) B.shown = B.value;
    B.visible = false;
    if (!vis || !CB.enabled) return null;
    // 튐
    let s = 1;
    if (!reduced) {
      const st = now - B.stageAt, pp = now - B.popAt;
      if (st >= 0 && st < 0.22) { const k = st / 0.22; s = k < 0.5 ? 1 + 0.3 * (k / 0.5) : 1.3 - 0.3 * ((k - 0.5) / 0.5); }
      else if (pp >= 0 && pp < POP_S) { const k = pp / POP_S; s = k < 0.5 ? 1 + (POP_K - 1) * (k / 0.5) : POP_K - (POP_K - 1) * ((k - 0.5) / 0.5); }
    }
    let alphaK = 1;
    if (B.dieAt >= 0) { const k = clamp01((now - B.dieAt) / BREAK_S); if (k >= 1) return null; alphaK *= 1 - k; if (!reduced) s *= 1 - 0.15 * k; }
    if (B.clearAt >= 0) { const k = clamp01((now - B.clearAt) / 0.2); if (k >= 1) return null; alphaK *= 1 - k; }
    const fin = clamp01((now - B.visAt) / 0.12);
    const digits = v >= 10 ? 2 : 1;
    const box = blockBox(digits, Math.max(s, 1));
    // 가까움: 흐림 상자(좌·상·하 +0.3, 우 +2.0타일)와 물체 겹침 → 0.10 s에 0.04, 비고 0.25 s 뒤 0.25 s에 0.30
    const T = R.T;
    const nearNow = near ? near(box.l - 0.3 * T, box.r + 2.0 * T, box.t - 0.3 * T, box.b + 0.3 * T) : false;
    if (nearNow) { B.nearOn = true; B.nearUntil = now; }
    if (nearNow) B.a = Math.max(A_NEAR, B.a - ((A_FREE - A_NEAR) / 0.10) * dt);
    else if (now - B.nearUntil > 0.25) B.a = Math.min(A_FREE, B.a + ((A_FREE - A_NEAR) / 0.25) * dt);
    // 튜토리얼 카드와 겹치면 0 (0.15 s)
    const cardHit = cardRect && cardRect.l < box.r && box.l < cardRect.r && cardRect.t < box.b && box.t < cardRect.b;
    B.card = cardHit ? Math.max(0, B.card - dt / 0.15) : Math.min(1, B.card + dt / 0.15);
    const alpha = B.a * alphaK * fin * B.card;
    B.rect = box; B.alpha = alpha; B.visible = alpha > 0.001; B.v = v; B.s = s;
    return B.visible ? box : null;
  };
  FX.drawBlock = (ctx, now) => {
    if (!A || !B.visible) return;
    const box = B.rect, s = B.s, v = B.v, Hn = A.Hn;
    ctx.save();
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    ctx.translate(box.ax, box.ay); ctx.scale(s, s); ctx.translate(-box.ax, -box.ay);
    ctx.globalAlpha = B.alpha;
    const str = v >= 10 ? [Math.floor(v / 10) % 10, v % 10] : [v];
    str.forEach((d, i) => blit(ctx, A.digits[d], box.numL + i * A.cw, box.top0));
    // 라벨: 숫자 아래 가운데
    blit(ctx, A.label, box.cx - A.lw / 2, box.top0 + A.nh + 0.08 * Hn);
    // 막대: 아래 끝 = 숫자 아래 끝 (Hn 기준선)
    const by = box.top0 + A.padT + Hn - A.bh - 1;
    const sk = reduced ? 0.2 : 0.12, se = clamp01((now - B.stageAt) / sk);
    if (se < 1 && B.stage > B.prevStage) {
      blit(ctx, A.bars[B.prevStage], box.barsL - 1, by);
      ctx.globalAlpha = B.alpha * se; blit(ctx, A.bars[B.stage], box.barsL - 1, by);
    } else blit(ctx, A.bars[B.stage], box.barsL - 1, by);
    ctx.restore();
  };
  FX.drawParticles = (ctx, now) => {
    if (!A || PS.active === 0) return;
    let gk = 1;
    if (PS.dieAt >= 0) gk *= 1 - clamp01((now - PS.dieAt) / BREAK_S);
    if (PS.clearAt >= 0) gk *= 1 - clamp01((now - PS.clearAt) / 0.2);
    if (gk <= 0) return;
    ctx.save();
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    const T = R.T;
    for (let c = 0; c < 4; c++) {
      let set = false;
      for (const p of parts) {
        if (!p.on || p.c !== c) continue;
        const a = gk * Math.min(1, p.age / 0.25) * clamp01((p.life - p.age) / 0.4);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        const sz = A.dotSz[p.si];
        if (p.sq) { if (!set) { ctx.fillStyle = A.fx[c]; set = true; } ctx.fillRect(p.x, p.y, sz, sz); }
        else blit(ctx, A.dots[c][p.si], p.x, p.y);
      }
    }
    ctx.restore();
  };
  FX.particleCount = () => PS.active;

  // ---------------------------------------------------------------- 판정 이름 + % (5-8-2)
  const jf = { on: false, grade: 1, pct: 0, t0: 0, dieAt: -9, clearAt: -9, box: null, withPct: true, dotsOnly: false, kind: 'ground' };
  FX.judge = jf;
  const stats = { ground: { n: 0, skip: 0, hidePct: 0 }, orb: { n: 0, skip: 0, hidePct: 0 } };
  FX.stats = stats;
  // 판정 순간 한 번: 자리 계산. ctxInfo = { playerTop, playerL, playerR (CSS px), orb: {cx, cy} | null, hudBottom, blocked(l,r,t,b) }
  FX.onJudge = (grade, pct, now, info) => {
    if (!A) return null;
    const T = R.T, j = A.judge[grade - 1];
    const kind = info.orb ? 'orb' : 'ground';
    const st = stats[kind]; st.n++;
    const tryBox = (withPct, dx, dy) => {
      const w = j.w, h = withPct ? j.hYes : j.hNo;
      let r, top;
      if (info.orb) { r = Math.min(info.playerL - 0.15 * T, info.orb.cx - 0.75 * T); top = info.orb.cy - 0.1 * T; }
      else { r = info.playerL - 0.15 * T; top = info.playerTop - h; }
      r -= dx; top += dy;
      const b = { l: r - w, r, t: top, b: top + h };
      if (b.t < info.hudBottom + 4) return null;           // (a) HUD 띠
      if (info.blocked(b.l, b.r, b.t, b.b)) return null;   // (b) 앞쪽 물체
      return { ...b, withPct };
    };
    let box = tryBox(pct != null, 0, 0), hidePct = false;
    if (!box && pct != null) { box = tryBox(false, 0, 0); hidePct = !!box; }
    for (const dx of [0.5, 1]) if (!box) { box = tryBox(false, dx * T, 0); hidePct = !!box; }
    for (const dy of [0.25, 0.5]) if (!box) { box = tryBox(false, T, dy * T); hidePct = !!box; }
    let dotsOnly = false;
    if (!box) { // ③ 등급 점만: 플레이어 박스 왼쪽 위 0.15타일
      dotsOnly = true; st.skip++;
      box = { l: info.playerL - 0.15 * T - j.g.dotD * 4, r: info.playerL - 0.15 * T, t: info.playerTop - 0.15 * T - j.g.dotD * 1.2, b: info.playerTop - 0.15 * T, withPct: false };
    }
    if (hidePct) st.hidePct++;
    Object.assign(jf, { on: true, grade, pct, t0: now, dieAt: -9, clearAt: -9, box, withPct: box.withPct, dotsOnly, hidePct, kind, drawn: false });
    return jf;
  };
  FX.drawJudge = (ctx, now) => {
    if (!A || !jf.on) return;
    const age = now - jf.t0;
    let dieK = 0;
    if (jf.dieAt >= 0) dieK = clamp01((now - jf.dieAt) / J_DIE);
    let clrK = 0;
    if (jf.clearAt >= 0) clrK = clamp01((now - jf.clearAt) / 0.2);
    if (age >= J_TOTAL || dieK >= 1 || clrK >= 1) { jf.on = false; return; }
    const T = R.T, b = jf.box, j = A.judge[jf.grade - 1];
    let sc = 1, rise = 0, alpha = 1;
    if (reduced) { if (age > J_TOTAL - J_FADE) alpha = 1 - (age - (J_TOTAL - J_FADE)) / J_FADE; }
    else {
      if (age < J_POP) sc = 0.7 + 0.3 * (age / J_POP);
      if (age > J_POP + J_HOLD) { const k = (age - J_POP - J_HOLD) / J_FADE; alpha = 1 - k; rise = 0.2 * T * k; }
    }
    if (dieK > 0) { alpha *= 1 - dieK; if (!reduced) sc *= 1 - 0.5 * dieK; }
    if (clrK > 0) alpha *= 1 - clrK;
    ctx.save();
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    ctx.globalAlpha = Math.max(0, alpha);
    const cx = (b.l + b.r) / 2, cy = b.b - rise;
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    if (jf.dotsOnly) {
      // 이름·% 생략: 등급 점만 (점 그림은 이름 칸 위쪽에서 잘라 씀)
      const r = j.no, dh = Math.ceil((A.padY + j.g.dotsH) * A.dpr);
      if (j.g.nDot) ctx.drawImage(A.cv, r.x, r.y, r.w, dh, b.l - rise * 0, b.t - rise, r.w / A.dpr, dh / A.dpr);
    } else {
      const r = jf.withPct ? j.yes : j.no;
      blit(ctx, r, b.l, b.t - rise);
      if (jf.withPct) {
        const s = String(jf.pct);
        let w = A.gw[10]; for (const ch of s) w += A.gw[+ch];
        let x = b.l + (j.w - w) / 2;
        const y = b.t - rise + j.pctTop;
        for (const ch of s) { const i = +ch; blit(ctx, A.glyph[i], x, y); x += A.gw[i]; }
        blit(ctx, A.glyph[10], x, y);
      }
    }
    jf.drawn = true;
    ctx.restore();
  };
  return FX;
}
