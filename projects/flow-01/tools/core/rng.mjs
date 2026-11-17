// 시드 난수 (mulberry32). 생성기·봇 공용. 브라우저에서도 import 가능.
export function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (n) => Math.floor(next() * n);
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  return next;
}
// 시드 여러 개를 섞어 하나로(레벨 번호 × 실행 시드 등)
export const mixSeed = (...xs) => xs.reduce((h, x) => (Math.imul(h ^ (x >>> 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x12345678);
