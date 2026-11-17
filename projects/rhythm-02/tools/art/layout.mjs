#!/usr/bin/env node
// rhythm-02 화면 배치 원본(assets/layout.json) 생성 + 4해상도 계산 검사. 30-art 4절.
//   node tools/art/layout.mjs            layout.json 쓰기 + 표 출력 + 목업 SVG(assets/mockup-*.svg) 쓰기
//   node tools/art/layout.mjs --check    layout.json 을 읽어 계산·검사만 (실패 시 종료 코드 1)
// 빌드는 assets/layout.json 의 식(계수)만 읽어 같은 식으로 계산합니다(문서 표 파싱 금지).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '../..');
const OUT = join(PROJ, 'assets/layout.json');
const PAL = JSON.parse(readFileSync(join(PROJ, 'assets/palette.json'), 'utf8'));
import { ballSvg, cloudSvg, fingerSvg } from './cards.mjs';

export const LAYOUT = {
  schema_version: 1,
  _source: 'tools/art/layout.mjs 가 생성(art-director 원본). 30-art 4절 표는 이 식으로 계산한 요약. 단위 px(CSS px), W·H = 화면, S = min(W,H), d = 공 지름.',
  ball: { d_of_S: 0.078, d_min: 24, d_max: 44, outline_of_d: 0.08, shine: { r_of_radius: 0.62, from_deg: 200, to_deg: 255, w_of_d: 0.12 } },
  drum: { w_of_d: 3.2, h_of_d: 0.95, skin_h_of_d: 0.28, rx_of_d: 0.3, outline_of_d: 0.08, tap_lift_of_d: 0.22, tap_ms: [50, 70],
    twoball_x_of_d: 0.78, _tap: '탭마다 북 전체가 tap_lift 만큼 올라갔다(50 ms, ease-out) 내려옴(70 ms, ease-in). 합 120 ms = 00-benchmark 4-1' },
  portrait: { skin_y_of_H: 0.76, hud_h: 60 },
  landscape: { floor_h_of_H: 0.11, floor_h_min: 40, hud_h: 52 },
  play_height: {
    top_margin: 8, apex_margin: 6, apex_budget: 1.2,
    cloud_edge_of_Hp: 0.9,
    _def: '놀이 높이 Hp = (skinY − (safeTop + top_margin) − d − apex_margin) / apex_budget. 공 높이 h = 공 아랫점과 북 가죽 윗면 사이 거리. 높이 식(balance): h_apex = c × 통 길이(s), c = 0.5·Hp/s(00-benchmark 5-2). apex_budget 1.2 = 100 BPM 구름 통(2.4 s) 꼭짓점이 화면 안(위 여백 안)에 들어가게 잡은 값. 구름 아랫선은 h = cloud_edge·Hp 높이(공 아랫점이 그 위면 공 전체가 구름 뒤).',
  },
  cloud: { w_of_h: 2.6, w_max_of_W: 0.62, base_h_of_h: 0.5, bumps: [[-0.26, 0.36], [0.02, 0.5], [0.28, 0.32]], bump_r_max_of_w: 0.2, outline_of_d: 0.08,
    _shape: '아랫변이 평평한 둥근 사각형(높이의 50 %) + 원 3개(중심 x = 너비 비율, 중심 y = 아랫변 − 0.5·높이, 반지름 = min(높이 비율, 0.5·높이, 0.2·너비) — 원이 아랫변 밑으로 나오지 않음). 구름은 북 가운데 위. HUD 는 구름 위에 그림(구름 윗부분이 진행도 막대 뒤로 가도 됨).' },
  hud: { bar_x0: 72, bar_x1_from_right: 24, bar_y: 18, bar_h: 12, best_r: 7, dots_dy: 22, dot_r: 4, dot_gap: 12, dots_max: 10,
    pause: { x: 12, y: 6, size: 48 }, _dots: '시도 점: 시도마다 작은 점 1개(drumBody). 10개가 차면 큰 점 1개(반지름 7)로 묶고 다시 작은 점부터. 숫자 없음.' },
  shadow: { w_of_d_contact: 1.0, w_of_d_far: 0.45, h_of_w: 0.28, _rule: '그림자 너비 = d·lerp(1.0, 0.45, min(1, h / Hp)). 구름 뒤에 있는 동안도 그림자는 보임(G2: 내려올수록 커짐). 불투명 shadow 색, 북 가죽 위에만.' },
  finger: { anchor: 'drum_right', dx_of_d: 0.7, h_of_d: 1.5, press_ms: 100, show_from: 'toss', hide_after_ms: 300,
    press_start_beats: -0.2, press_start_min_ms_inside_pass: 20,
    _rule: '손가락은 화면 고정이 아니라 북 기준 위치(북 오른쪽 바닥 위, 손끝이 북 가죽 높이 아래). 누름 시작 = 접촉 − max(0.2박, …) 단, 누름 시작 ≥ 접촉 − (pass_early − 20 ms) — 통과 창 안(insights 5~6세 2번째 줄). 레벨 1 첫 접촉 1회만.' },
  grade_fx: { max_r_of_d: 1.6, area_max_of_screen: 0.05 },
  restart_timeline_s: {
    _owner: 'balance.json restart 이 기준. 아래는 art 연출 배분 제안(1-2에서 맞춤). 실패 순간 = 0, 확인 버튼 없음, 자동.',
    fail_motion: [0, 0.45], hold: [0.45, 0.85], reappear: [0.85, 1.1], music_fade_out_s: 0.08, best_slide_s: 0.2, reappear_grow: [0.6, 1.0],
  },
};

const RES = [[360, 640, 0, 0], [412, 915, 24, 34], [640, 360, 0, 0], [1280, 720, 0, 0]];

export function compute(L, W, H, safeTop = 0, safeBottom = 0) {
  const S = Math.min(W, H), portrait = H > W;
  const d = Math.round(Math.max(L.ball.d_min, Math.min(L.ball.d_max, L.ball.d_of_S * S)));
  const dw = L.drum.w_of_d * d, dh = L.drum.h_of_d * d;
  let skinY, floorTop;
  if (portrait) { skinY = Math.round(L.portrait.skin_y_of_H * H); floorTop = skinY + dh; }
  else { const fh = Math.max(L.landscape.floor_h_min, L.landscape.floor_h_of_H * H) + safeBottom; floorTop = H - fh; skinY = floorTop - dh; }
  const hudH = (portrait ? L.portrait.hud_h : L.landscape.hud_h) + safeTop;
  const topLimit = safeTop + L.play_height.top_margin;
  const Hp = (skinY - topLimit - d - L.play_height.apex_margin) / L.play_height.apex_budget;
  const cloudEdgeY = skinY - L.play_height.cloud_edge_of_Hp * Hp; // 공 아랫점이 이 선 위면 공 전체가 구름 뒤
  const cloudH = cloudEdgeY - topLimit;
  const cloudW = Math.min(L.cloud.w_of_h * cloudH, L.cloud.w_max_of_W * W);
  const cx = W / 2;
  const c = 0.5 * Hp; // px/s (00-benchmark 5-2 초안, balance 확정)
  const fingerX = cx + dw / 2 + L.finger.dx_of_d * d, fingerH = L.finger.h_of_d * d;
  return { W, H, safeTop, safeBottom, portrait, S, d, dw, dh, skinY, floorTop, hudH, topLimit, Hp, cloudEdgeY, cloudH, cloudW, cx, c, fingerX, fingerH };
}

// 높이 → 화면 y (공 중심)
const ballCY = (g, h) => g.skinY - h - g.d / 2;

export function report(L) {
  let fail = 0;
  const rows = [];
  for (const [W, H, st, sb] of RES) {
    const g = compute(L, W, H, st, sb);
    const half128 = g.c * (60 / 128 / 2), beat100 = g.c * 0.6, beat128 = g.c * (60 / 128);
    const hide = (bpm, beats) => { const T = beats * 60 / bpm, Ha = g.c * T, e = L.play_height.cloud_edge_of_Hp * g.Hp; return Ha > e ? T * Math.sqrt(1 - e / Ha) : 0; };
    const vContact = 4 * g.c; // 접촉 순간 공 속도 px/s = 4·H/T = 4c
    const fx = Math.PI * (L.grade_fx.max_r_of_d * g.d) ** 2 / (W * H);
    const apexTop = g.skinY - 1.2 * g.Hp - g.d; // 100 BPM 구름 통 꼭짓점 공 윗점
    const checks = {
      ball24: g.d >= 24,
      apexInside: apexTop >= g.topLimit + L.play_height.apex_margin - 0.01,
      cloudBelowHud: g.cloudEdgeY >= g.hudH + 4,
      fingerInside: g.fingerX + 0.95 * g.d <= W - 4,
      fx5: fx <= L.grade_fx.area_max_of_screen,
      floorThumb: H - g.floorTop >= (g.portrait ? 0.15 * H : 40),
    };
    for (const v of Object.values(checks)) if (!v) fail++;
    rows.push({ g, half128, beat100, beat128, hide108: hide(108, 4), hide128: hide(128, 4), hide100: hide(100, 4), vContact, fx, apexTop, checks });
  }
  return { rows, fail };
}

function mockup(L, W, H) {
  const g = compute(L, W, H), C = PAL.common, T = PAL.themes.level01;
  const o = Math.max(2, L.ball.outline_of_d * g.d);
  const s = [];
  s.push(`<rect width="${W}" height="${H}" fill="${T.bg1}"/>`);
  s.push(`<rect x="0" y="${g.floorTop}" width="${W}" height="${H - g.floorTop}" fill="${T.floor}"/><rect x="0" y="${g.floorTop}" width="${W}" height="2" fill="${T.floorEdge}"/>`);
  const h = g.c * 0.6;
  const by2 = ballCY(g, h);
  // 북
  const dx = g.cx - g.dw / 2;
  s.push(`<rect x="${dx.toFixed(1)}" y="${g.skinY}" width="${g.dw.toFixed(1)}" height="${g.dh.toFixed(1)}" rx="${(L.drum.rx_of_d * g.d).toFixed(1)}" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="${o.toFixed(1)}"/>`);
  s.push(`<rect x="${dx.toFixed(1)}" y="${g.skinY}" width="${g.dw.toFixed(1)}" height="${(L.drum.skin_h_of_d * g.d).toFixed(1)}" rx="${(L.drum.skin_h_of_d * g.d / 2).toFixed(1)}" fill="${C.skin}" stroke="${C.ink}" stroke-width="${o.toFixed(1)}"/>`);
  const sw = g.d * (1 - 0.55 * Math.min(1, h / g.Hp));
  s.push(`<ellipse cx="${g.cx}" cy="${(g.skinY + L.drum.skin_h_of_d * g.d / 2).toFixed(1)}" rx="${(sw / 2).toFixed(1)}" ry="${(sw * 0.14).toFixed(1)}" fill="${C.shadow}"/>`);
  s.push(ballSvg(g.cx, by2 - g.d / 2, g.d));
  s.push(cloudSvg(g.cx, g.cloudEdgeY, g.cloudW, g.cloudH));
  // HUD
  const bx1 = W - L.hud.bar_x1_from_right;
  s.push(`<rect x="${L.hud.bar_x0}" y="${L.hud.bar_y}" width="${bx1 - L.hud.bar_x0}" height="${L.hud.bar_h}" rx="6" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>`);
  const p = 0.35, best = 0.62;
  s.push(`<rect x="${L.hud.bar_x0 + 2}" y="${L.hud.bar_y + 2}" width="${((bx1 - L.hud.bar_x0 - 4) * p).toFixed(1)}" height="${L.hud.bar_h - 4}" rx="4" fill="${C.drumBody}"/>`);
  s.push(`<circle cx="${(L.hud.bar_x0 + (bx1 - L.hud.bar_x0) * best).toFixed(1)}" cy="${L.hud.bar_y + L.hud.bar_h / 2}" r="${L.hud.best_r}" fill="${C.ball}" stroke="${C.ink}" stroke-width="2"/>`);
  for (let i = 0; i < 4; i++) s.push(`<circle cx="${L.hud.bar_x0 + 4 + i * L.hud.dot_gap}" cy="${L.hud.bar_y + L.hud.dots_dy + 6}" r="${L.hud.dot_r}" fill="${C.drumBody}"/>`);
  const pz = L.hud.pause;
  s.push(`<rect x="${pz.x}" y="${pz.y}" width="${pz.size}" height="${pz.size}" rx="14" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/><rect x="${pz.x + 16}" y="${pz.y + 14}" width="6" height="20" rx="3" fill="${C.ink}"/><rect x="${pz.x + 26}" y="${pz.y + 14}" width="6" height="20" rx="3" fill="${C.ink}"/>`);
  // 손가락(레벨 1 첫 접촉) — 북 오른쪽 바닥
  s.push(fingerSvg(g.fingerX, g.skinY + g.dh, g.fingerH, true));
  // 치수 표시(목업 전용, 빌드에 그리지 않음)
  const yHp = g.skinY - g.Hp;
  s.push(`<g stroke="#D11" stroke-width="1" fill="none" stroke-dasharray="4 3"><line x1="8" y1="${g.skinY}" x2="${W - 8}" y2="${g.skinY}"/><line x1="8" y1="${yHp.toFixed(1)}" x2="${W - 8}" y2="${yHp.toFixed(1)}"/><line x1="8" y1="${g.cloudEdgeY.toFixed(1)}" x2="${W - 8}" y2="${g.cloudEdgeY.toFixed(1)}"/></g>`);
  s.push(`<g font-family="sans-serif" font-size="10" fill="#D11"><text x="10" y="${g.skinY - 3}">북 가죽 h=0</text><text x="10" y="${(yHp - 3).toFixed(1)}">h = Hp ${g.Hp.toFixed(0)}px</text><text x="10" y="${(g.cloudEdgeY + 11).toFixed(1)}">구름 아랫선 h = 0.9 Hp</text></g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<!-- rhythm-02 플레이 화면 목업 ${W}x${H} (tools/art/layout.mjs 생성, 손으로 고치지 않음). 레벨 1 색, 공 = 1박 꼭짓점(100 BPM), 손가락 = 레벨 1 첫 접촉. 빨간 점선·글자는 치수 표시(빌드에 없음). 30-art 4절 -->\n${s.join('\n')}\n</svg>\n`;
}



const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/art/layout.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const L = args.includes('--check') ? JSON.parse(readFileSync(OUT, 'utf8')) : LAYOUT;
  if (!args.includes('--check')) {
    writeFileSync(OUT, JSON.stringify(L, null, 1) + '\n');
    writeFileSync(join(PROJ, 'assets/mockup-play-360x640.svg'), mockup(L, 360, 640));
    writeFileSync(join(PROJ, 'assets/mockup-play-640x360.svg'), mockup(L, 640, 360));
  }
  const { rows, fail } = report(L);
  console.log('| 해상도(safe 위/아래) | 공 d | 북 w×h | 북 가죽 y | 놀이 높이 Hp | 구름 아랫선 y | 접촉 속도 4c | 1박 꼭짓점 100/128 BPM | 반박 꼭짓점 128 BPM | 구름 숨는 시간 100/108/128 BPM 4박 | 딱 이펙트 면적 | 검사 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const g = r.g;
    const bad = Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k);
    console.log(`| ${g.W}x${g.H} (${g.safeTop}/${g.safeBottom}) | ${g.d} | ${g.dw.toFixed(0)}×${g.dh.toFixed(0)} | ${g.skinY.toFixed(0)} | ${g.Hp.toFixed(0)} | ${g.cloudEdgeY.toFixed(0)} | ${r.vContact.toFixed(0)} px/s (${(r.vContact / 60).toFixed(1)} px/프레임) | ${r.beat100.toFixed(0)} / ${r.beat128.toFixed(0)} px | ${r.half128.toFixed(0)} px = ${(r.half128 / g.d).toFixed(2)} d | ${r.hide100.toFixed(2)} / ${r.hide108.toFixed(2)} / ${r.hide128.toFixed(2)} s | ${(r.fx * 100).toFixed(2)} % | ${bad.length ? 'FAIL ' + bad.join(',') : 'OK'} |`);
  }
  console.log(fail ? `layout FAIL ${fail}` : 'layout OK (공 ≥ 24 px, 꼭짓점 화면 안, 구름 아랫선이 HUD 아래, 손가락 화면 안, 딱 이펙트 ≤ 5 %, 바닥 띠)');
  process.exit(fail ? 1 : 0);
}
