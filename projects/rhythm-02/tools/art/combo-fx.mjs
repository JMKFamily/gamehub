#!/usr/bin/env node
// rhythm-02 콤보 연출 검사(30-art 6-2, layout.json combo, palette.json combo_fx) — 2026-11-17 요청자 지시 "파격적인 콤보 연출"
//   node tools/art/combo-fx.mjs --check   검사만 (실패 시 종료 코드 1)
//   node tools/art/combo-fx.mjs --write   assets/obj-combo-fx.svg(기준 그림) 쓰기 + 검사
// 검사: ① 자리·크기(4해상도: 숫자 높이 12~18 %·H, 라벨, HUD 띠 밖, 공 세로 줄·판정 표시·글 자리·손가락과 안 겹침, 지붕·가지 위)
//       ② 레벨 물체 겹침(레벨 v2 × 4해상도: 숫자·라벨 상자 세로 범위에 걸치는 물체 = 구름만, 지붕·가지·언덕·박 표시 0)
//       ③ 층 순서(콤보 층이 공·박 표시·위험 물체·북 뒤) ④ 대비(숫자·라벨·파티클 합성색 위 물체 외곽선 ≥ 4.5·면 ≥ 3.0, 숫자 보임 1.3~2.0)
//       ⑤ 파티클 개수 상한·크기 ≤ 0.3d·하늘 덮는 비율 ⑥ 번쩍임(초당 3회 넘는 밝기 변화 면적 < WCAG 한도) ⑦ 움직임 줄이기·끊김 ≤ 0.3 s·튐 < 최소 접촉 간격
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compute, comboGeom, objTopY, labelEstW, comboFxSvg, judgementStatic, staticChecks, loadLevels, RES } from './layout.mjs';
import { contrast, mix } from './palette.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '../..');
const L = JSON.parse(readFileSync(join(PROJ, 'assets/layout.json'), 'utf8'));
const P = JSON.parse(readFileSync(join(PROJ, 'assets/palette.json'), 'utf8'));
let STR = null; try { STR = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8')); } catch {}

const out = []; let fail = 0, wait = 0;
const ok = (n, p, m) => { out.push(`${p ? 'OK  ' : 'FAIL'} ${n}: ${m}`); if (!p) fail++; };
const pend = (n, m) => { out.push(`대기 ${n}: ${m}`); wait++; };
const info = (n, m) => out.push(`정보 ${n}: ${m}`);
const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const f1 = (v) => v.toFixed(1);

const C = L.combo, N = C.number, B = C.label, PT = C.particles, F = P.combo_fx;
if (!C?.number || !F) { console.log('combo-fx FAIL: layout.json combo.number 또는 palette.json combo_fx 없음'); process.exit(1); }

let D = null; try { D = await loadLevels(); } catch (e) { pend('레벨', `balance·levels 읽기 실패: ${e.message}`); }
const bal = D?.bal ?? {};

// 라벨 글: lore strings.json combo_label 이 있으면 그 글(가장 긴 언어)로, 없으면 후보(콤보·COMBO)로 재고 "대기"
const labelCands = [...B.check_candidates];
if (STR?.[B.text_key]) labelCands.push(...Object.values(STR[B.text_key]).filter((v) => typeof v === 'string'));
else pend('라벨 글', `strings.json ${B.text_key} 없음(lore) — 후보 ${B.check_candidates.join('·')} 로 폭 검사`);

// 실제 레벨 최대 콤보(hit + hold = 접촉 수) → 자리 수
let maxCombo = 0, maxAt = '', minGapMs = 1e9;
for (const x of D?.comp ?? []) {
  const n = x.C.contacts.length; if (n > maxCombo) { maxCombo = n; maxAt = `L${x.lv.id}`; }
  for (let i = 1; i < x.C.contacts.length; i++) minGapMs = Math.min(minGapMs, x.C.contacts[i].t - x.C.contacts[i - 1].t);
}
const digitsMax = Math.max(2, String(maxCombo || 99).length);

// 레벨 물체 중 지붕·가지 아랫면 비율 가장 높은 것(= 화면에서 가장 높이 오는 것)
let roofU = bal.objects?.roof?.under_of_Hp ?? 0.45, branchU = bal.objects?.branch?.under_of_Hp ?? 0.34, hillT = bal.objects?.hill?.top_of_Hp ?? 0.3;
for (const x of D?.comp ?? []) for (const o of x.lv.objects || []) {
  if (o.type === 'roof' && o.under_of_Hp != null) roofU = Math.max(roofU, o.under_of_Hp);
  if (o.type === 'branch' && o.under_of_Hp != null) branchU = Math.max(branchU, o.under_of_Hp);
  if (o.type === 'hill' && o.top_of_Hp != null) hillT = Math.max(hillT, o.top_of_Hp);
}

// ---------- ① 자리·크기 (4해상도) ----------
const rows = [];
for (const [W, H, st, sb] of RES) {
  const g = compute(L, W, H, st, sb, bal.scroll?.drum_x_ratio ?? 0.3);
  const r = g.d / 2 + L.ball.outline_of_d * g.d, ballRight = g.cx + r;
  const top = objTopY(g, bal, roofU, branchU);
  const label = labelCands.reduce((a, s) => (labelEstW(s, 20) > labelEstW(a, 20) ? s : a), labelCands[0]);
  const base = { W, H, portrait: g.portrait, d: g.d, bandBottom: g.bandBottom, skinY: g.skinY, Hp: g.Hp, ballRight, floorTop: g.floorTop };
  const G = comboGeom(L, base, { digits: digitsMax, label, topY: top.top });
  const G3 = comboGeom(L, base, { digits: 3, label, topY: top.top });
  const ballCol = { x0: g.cx - r, x1: g.cx + r, y0: g.bandBottom, y1: g.skinY };
  const js = judgementStatic(L, D).rows.find((x) => x.g.W === W && x.g.H === H);
  const slot = staticChecks(L, D).rows.find((x) => x.g.W === W && x.g.H === H).slot;
  const hFrac = G.digitH / H;
  const c = {
    digitH: hFrac >= N.digit_h_of_H.min - 1e-9 && hFrac <= N.digit_h_of_H.max + 1e-9,
    labelSmall: G.labelPx >= B.px_min && G.labelPx <= G.digitH * 0.25,
    belowHud: G.popBox.y0 >= g.bandBottom + 1,
    aboveRoofBranch: G.popBox.y1 <= top.top - C.region.gap_above_objects_px + 1e-6,
    inScreen: G.popBox.x0 >= 0 && G.popBox.x1 <= W - N.x.side_margin_px + 1e-6,
    offBallColumn: !hit(G.popBox, ballCol),
    offJudgement: !hit(G.popBox, js.popBox),
    offTextSlot: !hit(G.popBox, slot),
    offFinger: !hit(G.popBox, g.fingerBox),
    labelFits: G.labelW <= G.region.x1 - G.region.x0,
    centered: g.portrait ? G.cx >= W / 2 - 1e-6 && G.cx <= 0.7 * W : Math.abs(G.cx - W / 2) < 1, // 세로는 공 세로 줄을 비키는 만큼만 오른쪽
  };
  for (const v of Object.values(c)) if (!v) fail++;
  rows.push({ W, H, g, G, G3, top, c, hFrac });
}
const tbl = ['| 해상도 | 숫자 글자 px / 높이(·H) | 숫자 가운데 x · 잉크 y | 튐(1.2) 상자 숫자+라벨 | 라벨 px · 폭(가장 긴 글) | 지붕·가지 윗선 | 3자리(예비) | 검사 |', '|---|---|---|---|---|---|---|---|'];
for (const x of rows) {
  const bad = Object.entries(x.c).filter(([, v]) => !v).map(([k]) => k);
  tbl.push(`| ${x.W}x${x.H} | ${x.G.fontPx} / ${f1(x.G.digitH)} (${(x.hFrac * 100).toFixed(1)} %) | ${f1(x.G.cx)} (${(x.G.cx / x.W).toFixed(2)} W) · ${f1(x.G.digitBox.y0)}~${f1(x.G.digitBox.y1)} | x ${f1(x.G.popBox.x0)}~${f1(x.G.popBox.x1)} y ${f1(x.G.popBox.y0)}~${f1(x.G.popBox.y1)} | ${x.G.labelPx} · ${f1(x.G.labelW)} (${x.G.label}) | ${f1(x.top.top)} | ${x.G3.fontPx} px ${(x.G3.digitH / x.H * 100).toFixed(1)} %${x.G3.shrunk ? ' 줄임' : ''} | ${bad.length ? 'FAIL ' + bad.join(',') : 'OK'} |`);
}
ok('자리·크기 4해상도', rows.every((x) => Object.values(x.c).every(Boolean)), `숫자 높이 ${N.digit_h_of_H.min * 100}~${N.digit_h_of_H.max * 100} %·H(목표 ${N.digit_h_of_H.target * 100} %, 레벨 최대 콤보 ${maxCombo}(${maxAt}) = ${digitsMax}자리), 라벨 ≤ 숫자 0.25배, HUD 띠 밖·지붕·가지 위·화면 안·공 세로 줄·판정 표시·tut_tap 글 자리·손가락과 안 겹침(튐 1.2배 포함)`);
for (const x of rows) if (x.G3.digitH / x.H < N.digit_h_of_H.min) info(`3자리 ${x.W}x${x.H}`, `100 이상(예비, 지금 레벨에 없음)은 자리에 맞춰 ${(x.G3.digitH / x.H * 100).toFixed(1)} %·H 로 줄어듦`);

// ---------- ② 레벨 물체 세로 범위 대조 (물체는 화면 가로 전체를 지나가므로 세로 범위가 겹치면 언젠가 겹침) ----------
if (D?.comp?.some((x) => x.v2)) {
  for (const x of rows) {
    const g = x.g, box = x.G.popBox, bad = []; let clouds = 0;
    for (const { lv } of D.comp) for (const o of lv.objects || []) {
      let y0, y1;
      if (o.type === 'roof' || o.type === 'branch') { const t = objTopY(g, bal, o.type === 'roof' ? (o.under_of_Hp ?? null) : 0, o.type === 'branch' ? (o.under_of_Hp ?? null) : 0); y0 = o.type === 'roof' ? t.roofTop : t.branchTop; y1 = g.skinY - (o.under_of_Hp ?? (o.type === 'roof' ? bal.objects?.roof?.under_of_Hp : bal.objects?.branch?.under_of_Hp)) * g.Hp; }
      else if (o.type === 'hill') { y0 = g.skinY - (o.top_of_Hp ?? hillT) * g.Hp; y1 = g.floorTop; }
      else if (o.type === 'cloud') { if (g.objTop < box.y1 && g.cloudBottom > box.y0) clouds++; continue; }
      else if (o.type === 'mark') { y0 = g.laneY - g.d; y1 = g.laneBottom; }
      else continue;
      if (y0 < box.y1 && y1 > box.y0) bad.push(`L${lv.id} ${o.type}@${o.beat_in} y ${f1(y0)}~${f1(y1)}`);
    }
    // 공: 세로 줄 고정 → ①에서 가로로 비킴. 박 표시는 바닥 길
    ok(`레벨 물체 ${x.W}x${x.H}`, !bad.length, bad.length ? bad.slice(0, 6).join(' / ') : `숫자·라벨 상자(y ${f1(box.y0)}~${f1(box.y1)})에 걸치는 물체 = 구름 ${clouds}개(흰 면 + ink 외곽선, 앞 층 — ④ 대비 검사)뿐, 지붕·가지·언덕·박 표시 0`);
  }
} else pend('레벨 물체', 'levels v2 없음');

// ---------- ③ 층 순서 ----------
{
  const ord = C.layer.order, idx = (k) => ord.indexOf(k);
  const combo = ['combo_particles', 'combo_number', 'combo_label'].map(idx);
  const must = ['hill', 'floor_lane_pebbles', 'drum_leg_shadow', 'marks', 'ball', 'cloud_roof_branch', 'bounce_lines', 'judgement', 'hud'];
  const bad = must.filter((k) => idx(k) < 0 || idx(k) <= Math.max(...combo));
  ok('층 순서', !combo.includes(-1) && !bad.length && idx('silhouette') < Math.min(...combo) && combo[0] < combo[1] && combo[1] < combo[2], bad.length ? `콤보 층보다 뒤(또는 없음): ${bad.join(', ')}` : `${ord.join(' → ')} (콤보 층 = 바탕·실루엣 바로 위, 모든 물체·북·박 표시·공·판정 표시·HUD 뒤)`);
}

// ---------- ④ 대비 (합성색 = mix(바탕, 색, 불투명도)) ----------
{
  const LM = F.limits, Cc = P.common, col = (t, k) => (k === 'accent' ? t.accent : Cc[k]);
  // 물체: [이름, 면, 외곽선(ink) 있음]
  const OBJ = [['공', Cc.ball, true], ['북·박 표시', Cc.drumBody, true], ['지붕', Cc.roof, true], ['지붕 줄무늬', Cc.roofStripe, true], ['가지 줄기', Cc.branch, true], ['가지 잎', Cc.leaf, true], ['구름', Cc.cloud, true], ['손가락', Cc.finger, true]];
  const DARK = OBJ.filter(([n]) => ['공', '북·박 표시', '지붕', '가지 줄기', '가지 잎'].includes(n)); const comp0 = (c) => c;
  const worst = {}; const note = (k, v, at) => { if (!worst[k] || v < worst[k].v) worst[k] = { v, at }; };
  const worstMax = {}; const noteMax = (k, v, at) => { if (!worstMax[k] || v > worstMax[k].v) worstMax[k] = { v, at }; };
  for (const [k, t] of Object.entries(P.themes)) for (const bg of ['bg1', 'bg2', 'bg3', 'sil']) {
    const at = `${k} ${bg}`, base = t[bg];
    const num = mix(base, col(t, F.number.color), F.number.alpha), lab = mix(base, col(t, F.label.color), F.label.alpha);
    note('숫자 보임(합성 / 바탕) ≥ ' + LM.number_vis_min, contrast(num, base), at); noteMax('숫자 보임 ≤ ' + LM.number_vis_max + '(위험 4.5 보다 약하게)', contrast(num, base), at);
    note('라벨 글 보임 ≥ ' + LM.label_vis_min, contrast(lab, base), at);
    for (const [nm, comp] of [['숫자', num], ['라벨', lab]]) {
      note(`${nm} 위 구름 가장자리(max(흰 면, ink) / 합성) ≥ ${LM.edge_min}`, Math.max(contrast(Cc.cloud, comp), contrast(Cc.ink, comp)), at);
    }
    // 숫자: 겹치는 물체는 구름뿐(②)이지만 예비로 모든 물체 가장자리 ≥ 4.5, 짙은 면 물체(공·북·지붕·가지) 면 ≥ 3.0. 라벨은 ② 대로 구름만
    for (const [on, oc] of OBJ) note(`숫자 위 물체 가장자리(max(면, ink)) ≥ ${LM.edge_min}(예비)`, Math.max(contrast(oc, comp0(num)), contrast(Cc.ink, num)), `${at} ${on}`);
    for (const [on, oc] of DARK) note(`숫자 위 짙은 물체 면 ≥ ${LM.fill_min}(예비)`, contrast(oc, num), `${at} ${on}`);
    {
    }
    for (const [pk, pc] of Object.entries(F.particles)) {
      const comp = mix(base, col(t, pc.color), pc.alpha);
      if (pk === 'accent') note(`accent 파티클 보임 ≥ ${LM.accent_particle_vis_min}`, contrast(comp, base), at);
      note(`파티클 위 ink 외곽선 ≥ ${LM.edge_min}`, contrast(Cc.ink, comp), `${at} ${pk}`);
      for (const [on, oc] of OBJ) note(`파티클 위 물체 가장자리(max(면, ink)) ≥ ${LM.edge_min}`, Math.max(contrast(oc, comp), contrast(Cc.ink, comp)), `${at} ${pk} ${on}`);
      for (const [on, oc] of DARK) note(`파티클 위 짙은 물체 면 ≥ ${LM.fill_min}(조각 ≤ 0.3d 라 공 면적의 ≤ 11.5 %)`, contrast(oc, comp), `${at} ${pk} ${on}`);
      for (const [on, oc] of [['지붕', Cc.roof], ['가지 잎', Cc.leaf], ['가지 줄기', Cc.branch]]) note(`파티클 위 위험 가장자리(max(면, ink)) ≥ ${LM.edge_min}`, Math.max(contrast(oc, comp), contrast(Cc.ink, comp)), `${at} ${pk} ${on}`);
    }
  }
  const lims = { [`숫자 보임(합성 / 바탕) ≥ ${LM.number_vis_min}`]: LM.number_vis_min, [`라벨 글 보임 ≥ ${LM.label_vis_min}`]: LM.label_vis_min, [`accent 파티클 보임 ≥ ${LM.accent_particle_vis_min}`]: LM.accent_particle_vis_min };
  let n = 0;
  for (const [k, w] of Object.entries(worst)) { const m = lims[k] ?? (k.includes(`≥ ${LM.edge_min}`) ? LM.edge_min : LM.fill_min); n++; ok(`대비 ${k}`, w.v >= m - 1e-9, `최소 ${w.v.toFixed(2)} (${w.at})`); }
  for (const [k, w] of Object.entries(worstMax)) { n++; ok(`대비 ${k}`, w.v <= LM.number_vis_max + 1e-9, `최대 ${w.v.toFixed(2)} (${w.at})`); }
  // 공 색·북 몸통·지붕·빨강 안 씀
  const used = [F.number.color, F.label.color, ...Object.values(F.particles).map((p) => p.color)];
  ok('콤보 색 금지', !used.some((u) => ['ball', 'drumBody', 'roof'].includes(u)), `쓴 색 ${[...new Set(used)].join('·')} (공 색 ball·북 몸통 drumBody·지붕 roof 아님, 빨강 없음)`);
}

// ---------- ⑤ 파티클 개수·크기·덮는 비율 ----------
{
  const T = PT.tiers, bad = []; const desc = [];
  if (!T.every((t, i) => i === 0 || t.at > T[i - 1].at && t.count_ref >= T[i - 1].count_ref && t.rise_of_H_per_s >= T[i - 1].rise_of_H_per_s)) bad.push('단계가 오를수록 개수·속도가 줄어듦');
  const chord = bal.combo?.chord_stages ?? [];
  if (chord.length && !chord.every((s) => T.some((t) => t.at === s))) bad.push(`화음 단계 ${chord.join('·')} 가 파티클 단계 시작과 다름`);
  for (const [W, H, st, sb] of RES) {
    const g = compute(L, W, H, st, sb), sky = W * (g.floorTop - g.bandBottom);
    const k = Math.max(PT.count_scale.min, Math.min(PT.count_scale.max, sky / PT.count_scale.ref_sky_px2));
    let cov = 0, cntMax = 0;
    for (const t of T) {
      const cnt = Math.min(PT.count_cap, Math.round(t.count_ref * k)); cntMax = Math.max(cntMax, cnt);
      if (Math.round(t.count_ref * k) > PT.count_cap) bad.push(`${W}x${H} 단계 ${t.at} 개수 ${Math.round(t.count_ref * k)} > 상한 ${PT.count_cap}`);
      if (t.size_of_d > 0.3 + 1e-9) bad.push(`단계 ${t.at} 크기 ${t.size_of_d}d > 0.3d`);
      cov = Math.max(cov, (cnt * (t.size_of_d * g.d) ** 2) / sky);
    }
    if (cov > 0.02) bad.push(`${W}x${H} 하늘 덮는 비율 ${(cov * 100).toFixed(2)} % > 2 %`);
    const life = (g.floorTop - g.bandBottom) / (T[T.length - 1].rise_of_H_per_s * H);
    desc.push(`${W}x${H} 최대 ${cntMax}개(×${k.toFixed(2)}) 덮음 ${(cov * 100).toFixed(2)} % 수명 ≥ ${life.toFixed(1)} s`);
  }
  const ballCover = (0.3 ** 2) / (Math.PI / 4);
  ok('파티클 개수·크기', !bad.length && PT.count_cap <= 64 && C.perf.draw_groups_max <= 4 && Math.max(...T.map((t) => t.colors.length)) <= C.perf.draw_groups_max, bad.length ? bad.join(' / ') : `단계 ${T.map((t) => `${t.at}: ${t.count_ref}개·${t.size_of_d}d·${t.rise_of_H_per_s}H/s·${t.colors.join('+')}`).join(' | ')} · 상한 ${PT.count_cap} · 색 그룹 ≤ ${C.perf.draw_groups_max}(fill 4번) · 조각 하나가 공을 덮는 비율 ≤ ${(ballCover * 100).toFixed(1)} % · ${desc.join(' / ')}`);
  const fb = PT.forbidden.join('·');
  ok('파티클 모양 금지', PT.shape.kinds.every((s) => ['rsquare', 'diamond'].includes(s)) && PT.shape.rotate === 'none' && /원 모양/.test(fb) && /별/.test(fb) && /빛줄기/.test(fb) && /번쩍임/.test(fb), `모양 ${PT.shape.kinds.join('·')}(회전 없음), 금지 ${fb}`);
}

// ---------- ⑥ 번쩍임 (WCAG 2.3.1 일반 번쩍임: 초당 3회 넘게 바뀌면 면적 < 0.25 × 341 × 256 px²) ----------
{
  const lim = C.flash.area_limit_px2, perS = minGapMs < 1e9 ? 1000 / minGapMs : 4.1, bad = []; const desc = [];
  for (const x of rows) {
    // 초당 3회 넘게 일어나는 것 = 튐 없는 값 바뀜(튐은 334 ms 간격 제한): 일의 자리 한 글자의 옛 잉크 + 새 잉크(십의 자리는 10번에 한 번 = 1초에 많아야 1회)
    const digitInk = N.digit_adv_of_font * x.G.fontPx * x.G.digitH * N.ink_fill_ratio;
    const area = 2 * digitInk;
    if (perS > C.flash.max_per_s && area >= lim) bad.push(`${x.W}x${x.H} 숫자 바뀜 면적 ${area.toFixed(0)} ≥ ${lim.toFixed(0)}`);
    desc.push(`${x.W}x${x.H} ${area.toFixed(0)} px²`);
  }
  const popHz = 1000 / N.pop.min_interval_ms;
  if (popHz > C.flash.max_per_s + 1e-9) bad.push(`튐 ${popHz.toFixed(2)}회/s > 3`);
  if (N.pop.alpha !== 'const' && !/const/.test(N.pop.alpha)) bad.push('튐 동안 불투명도가 바뀜');
  const lifeMin = Math.min(...rows.map((x) => (x.g.floorTop - x.g.bandBottom) / (PT.tiers[PT.tiers.length - 1].rise_of_H_per_s * x.H)));
  if (1 / lifeMin > C.flash.max_per_s || PT.fade.in_s < 1 / 3 - 1e-9) bad.push('파티클 나타남·사라짐이 0.33 s 보다 빠름');
  if (PT.tier_ramp_s < 1 / 3) bad.push('단계 오름 < 0.33 s');
  ok('번쩍임', !bad.length, bad.length ? bad.join(' / ') : `판정 최소 간격 ${minGapMs.toFixed(0)} ms(${perS.toFixed(2)}회/s) — 숫자 일의 자리 바뀜 면적(옛 + 새 잉크, 튐 없음) ${desc.join(' · ')} < 한도 ${lim.toFixed(0)} px², 튐 ≤ ${popHz.toFixed(2)}회/s(334 ms 간격), 튐 동안 불투명도 고정, 파티클 수명 ≥ ${lifeMin.toFixed(1)} s·나타남 ${PT.fade.in_s} s, 단계 오름 ${PT.tier_ramp_s} s, 끊김 한 번(사라짐만)`);
}

// ---------- ⑦ 시간·움직임 줄이기 ----------
{
  const brk = bal.combo?.break?.within_s ?? 0.3;
  ok('끊김 ≤ 0.3 s 조용히', N.break.ms / 1000 <= brk && PT.break.ms / 1000 <= brk && N.break.scale === 'const' && /소리 없음/.test(PT.break.rule) && /✕/.test(N.break.rule), `숫자 ${N.break.ms} ms(불투명도 → 0 + ${N.break.sink_of_digit_h}·높이 가라앉음, 크기 그대로) · 파티클 ${PT.break.ms} ms(오름 멈춤 + 흐려짐) ≤ ${brk * 1000} ms, ✕·경고음·흔들림·"0"·빨강 없음`);
  ok('튐 < 최소 접촉 간격', N.pop.ms < minGapMs && N.pop.stage_ms < minGapMs && N.appear.ms < minGapMs, `튐 ${N.pop.ms} ms·단계 튐 ${N.pop.stage_ms} ms·나타남 ${N.appear.ms} ms < ${minGapMs.toFixed(0)} ms`);
  const RM = C.reduced_motion;
  ok('움직임 줄이기', RM.particles === 0 && RM.number_pop === false && /prefers-reduced-motion/.test(RM.media) && B.tiers.n === PT.tiers.length, `${RM.media}: 파티클 0개, 숫자 튐·가라앉음 없음(값만 바뀜, 끊김 = 불투명도만), 단계 = 라벨 옆 단계 칸 ${B.tiers.n}개 채움`);
  const ch = bal.combo?.chord_stages;
  if (ch) ok('콤보 화음 규칙 그대로', JSON.stringify(ch) === JSON.stringify(PT.tiers.filter((t) => ch.includes(t.at)).map((t) => t.at)), `balance chord_stages ${ch.join('·')} = 파티클 단계 1~${ch.length} 시작(그림 = 판정 프레임, 소리 = chord_timing 빈 정박, 크기는 sound-check)`);
  ok('성능 규칙 데이터', C.perf.cap === PT.count_cap && C.perf.forbidden.includes('shadowBlur') && /Float32Array/.test(C.perf.rule) && /오프스크린/.test(C.perf.rule), `상한 ${C.perf.cap}, 그룹 ≤ ${C.perf.draw_groups_max}, 풀 미리 잡음, 숫자 오프스크린, 금지 ${C.perf.forbidden.join('·')} — 실제 fps 는 QA 6배 스로틀 측정`);
}

// ---------- 기준 그림 ----------
if (process.argv.includes('--write')) {
  const cells = [['level01', 12, 'bg1'], ['level03', 23, 'bg2'], ['level09', 37, 'bg3'], ['level10', 53, 'bg3']];
  const W = 360, H = 640, g = compute(L, W, H); const cw = 360, ch = 300; let b = '';
  cells.forEach(([th, n, bk], i) => {
    const ox = (i % 2) * cw, oy = Math.floor(i / 2) * ch, T = P.themes[th];
    // 한 칸 = 360x640 화면 윗부분(HUD 띠 아래 ~ 300 px)
    b += `<g transform="translate(${ox} ${oy})"><clipPath id="c${i}"><rect width="${cw}" height="${ch}"/></clipPath><g clip-path="url(#c${i})"><rect width="${cw}" height="${ch}" fill="${T[bk]}"/>`;
    b += comboFxSvg(L, { ...g, floorTop: ch + 60 }, th, n, { seed: 7 + i, PALx: { ...P, themes: { ...P.themes, [th]: { ...T, bg1: T[bk] } } } });
    b += `<rect x="0" y="0" width="${cw}" height="${g.bandBottom}" fill="#FFFFFF" fill-opacity="0.6"/><text x="8" y="20" font-family="sans-serif" font-size="11" fill="#23273A">${th} ${bk} · 콤보 ${n} · 단계 ${[10, 20, 30, 50].filter((s) => n >= s).length}</text></g></g>`;
  });
  writeFileSync(join(PROJ, 'assets/obj-combo-fx.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cw * 2} ${ch * 2}" width="${cw * 2}" height="${ch * 2}">\n<!-- 콤보 연출 기준 그림(30-art 6-2, layout.json combo, palette.json combo_fx, tools/art/combo-fx.mjs --write 생성 — 손으로 고치지 않음). 360x640 화면 윗부분, 위 흰 띠 = HUD 띠 자리. 큰 숫자 = 그 레벨 accent 불투명도 0.34(system-ui 굵게, 외부 글꼴 없음), 라벨 = [금빛 표지] 콤보 [단계 칸 4](ink 0.66), 조각 = 둥근 네모·마름모(accent 0.35·금빛·흰·민트). 실제 화면에서는 이 층 위에 언덕·바닥·북·박 표시·공·구름·지붕·가지·판정 표시·HUD 가 그려짐. 원작 COMBO 글자 디자인·글꼴·이펙트 모양 아님 -->\n${b}\n</svg>\n`);
  out.push('쓰기 assets/obj-combo-fx.svg');
}

console.log(tbl.join('\n'));
for (const x of out) console.log(x);
console.log(fail ? `combo-fx FAIL ${fail}${wait ? ` (대기 ${wait})` : ''}` : `combo-fx OK (자리·크기 4해상도, 레벨 물체 겹침 0(구름만), 층 순서, 대비, 파티클 상한, 번쩍임, 끊김·움직임 줄이기${wait ? ` — 대기 ${wait}` : ''})`);
process.exit(fail ? 1 : 0);
