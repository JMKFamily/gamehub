// flow-01 모양 함수 (art-director). 점 모양 표지 6개·별·손가락을 단위 좌표 경로로 만듭니다.
// 표지 경로는 [-1, 1] 상자 안(표지 반지름 = 1). 빌드는 layout.json marks 의 path 를 Path2D 로 그대로 씁니다:
//   ctx.translate(cx, cy); ctx.scale(r, r); fill(path) + stroke(path, lineWidth = stroke_unit, lineJoin round) — 같은 흰색.
const f = (n) => +n.toFixed(3);

function starPath(outer = 1, inner = 0.46, n = 5, dy = 0.06) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : outer, a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push([f(r * Math.cos(a)), f(r * Math.sin(a) + dy)]);
  }
  return 'M' + pts.map((p) => p.join(' ')).join(' L') + ' Z';
}
function moonPath() {
  // 바깥 원 (0,0) r 0.92 에서 안쪽 원 (0.40,-0.30) r 0.74 를 뺀 초승달
  const R = 0.92, c = [0.40, -0.30], r = 0.74;
  const d = Math.hypot(c[0], c[1]);
  const a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
  const ux = c[0] / d, uy = c[1] / d;
  const px = a * ux, py = a * uy;
  const p1 = [f(px + h * -uy), f(py + h * ux)], p2 = [f(px - h * -uy), f(py - h * ux)];
  // p1 → (바깥 큰 호, 반시계 반대쪽) → p2 → (안쪽 원 호) → p1
  return `M${p1[0]} ${p1[1]} A${R} ${R} 0 1 1 ${p2[0]} ${p2[1]} A${r} ${r} 0 0 0 ${p1[0]} ${p1[1]} Z`;
}
export const MARKS = {
  heart: 'M0 0.86 C-0.28 0.66 -1 0.18 -1 -0.30 C-1 -0.74 -0.56 -0.96 -0.24 -0.84 C-0.10 -0.79 -0.02 -0.68 0 -0.58 C0.02 -0.68 0.10 -0.79 0.24 -0.84 C0.56 -0.96 1 -0.74 1 -0.30 C1 0.18 0.28 0.66 0 0.86 Z',
  circle: 'M0 -0.80 A0.80 0.80 0 1 1 0 0.80 A0.80 0.80 0 1 1 0 -0.80 Z',
  star: starPath(),
  triangle: 'M0 -0.90 L0.90 0.66 L-0.90 0.66 Z',
  moon: moonPath(),
  square: 'M-0.58 -0.74 L0.58 -0.74 Q0.74 -0.74 0.74 -0.58 L0.74 0.58 Q0.74 0.74 0.58 0.74 L-0.58 0.74 Q-0.74 0.74 -0.74 0.58 L-0.74 -0.58 Q-0.74 -0.74 -0.58 -0.74 Z',
};
export const MARK_STROKE_UNIT = 0.16; // 모서리를 둥글게 보이게 하는 같은 색 테두리(단위 좌표)
export const STAR = starPath(1, 0.48, 5, 0.04);

// 손가락(검지 하나 편 손, 둥근 도형만). 원점 = 손가락 끝(누르는 점). 단위 = 칸 1개(1.0).
// 손은 오른쪽 아래로 뻗음(세로 화면에서 앞길을 덜 가림). 왼쪽 아래가 필요하면 x 를 뒤집어 씀.
export const FINGER = {
  tip: [0, 0],
  path: 'M-0.11 0.02 C-0.11 -0.08 0.11 -0.08 0.11 0.02 L0.13 0.46 C0.18 0.40 0.30 0.40 0.33 0.50 C0.38 0.44 0.50 0.45 0.52 0.56 C0.58 0.52 0.68 0.55 0.69 0.66 L0.70 0.92 C0.70 1.10 0.58 1.22 0.40 1.22 L0.18 1.22 C0.04 1.22 -0.06 1.14 -0.12 1.02 L-0.30 0.70 C-0.36 0.60 -0.30 0.50 -0.20 0.52 C-0.16 0.53 -0.13 0.56 -0.11 0.60 Z',
  stroke_unit: 0.05,
};
