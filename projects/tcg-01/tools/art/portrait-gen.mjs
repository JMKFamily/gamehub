// 임시 초상 생성기 (art-director 1-1): cards-lore.json의 visual_hint → 120x90 SVG 문자열.
// 200장을 손으로 그리지 않고, "세력 색 + 세력 실루엣(배경) + 모티프 낱말 → 도형(전경)"을 데이터로 조합합니다.
// 사용:
//   node tools/art/portrait-gen.mjs --check            모티프 낱말 매칭률·크기 검사(전 200장)
//   node tools/art/portrait-gen.mjs --samples          assets/samples/에 샘플 SVG + 한눈 보기 시트
//   import { portraitSVG } from './portrait-gen.mjs'   빌드에서 카드마다 한 번 만들어 캐시(blob URL)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { factions, rarity as RAR } from './spec.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = join(HERE, '..', '..');

// ── 도형 사전: 좌표 -1..1, F = 채움색, S = 윤곽색, B = 바탕색(자름 표현) ──
export const G = {
  shield: `<path d="M-.75-.8H.75V.15Q.75.6 0 .95Q-.75.6-.75.15Z" fill="F" stroke="S"/><path d="M-.75-.45H.75" stroke="S" fill="none"/>`,
  wall: `<path d="M-.95-.6H.95V.8H-.95Z" fill="F" stroke="S"/><path d="M-.95-.13H.95M-.95.33H.95M-.3-.6V-.13M.35-.6V-.13M0-.13V.33M-.6.33V.8M.6.33V.8" stroke="S" fill="none"/>`,
  drop: `<path d="M0-.95Q.7-.1.7.35A.7.6 0 0 1-.7.35Q-.7-.1 0-.95Z" fill="F" stroke="S"/>`,
  drop_inverted: `<path d="M0 .95Q.7.1.7-.35A.7.6 0 0 0-.7-.35Q-.7.1 0 .95Z" fill="F" stroke="S"/><circle cx="0" cy="-.85" r=".14" fill="none" stroke="S"/>`,
  hexagon: `<path d="M-.5-.87H.5L1 0 .5.87H-.5L-1 0Z" fill="F" stroke="S"/>`,
  gear: `<path d="M-.17-1H.17L.22-.72.5-.6.72-.8.93-.55.78-.32.85 0 1 .17.9.5.6.55.45.82.17.75 0 1-.17.75-.45.82-.6.55-.9.5-1 .17-.85 0-.78-.32-.93-.55-.72-.8-.5-.6-.22-.72Z" fill="F" stroke="S"/><circle r=".3" fill="B" stroke="S"/>`,
  triangle: `<path d="M0-.95L.85.8H-.85Z" fill="F" stroke="S"/>`,
  triangle_lean: `<path d="M.55-.95L.85.8H-.85Z" fill="F" stroke="S"/><path d="M-.9.8A.9.45 0 0 1 .9.8" fill="none" stroke="S"/>`,
  tall_rect_flames: `<path d="M-.35-.55H.35V.95H-.35Z" fill="F" stroke="S"/><g fill="S">${[-60, -40, -20, 0, 20, 40, 60].map((a) => `<circle cx="${(Math.sin(a * Math.PI / 180) * .55).toFixed(2)}" cy="${(-.62 - Math.cos(a * Math.PI / 180) * .3).toFixed(2)}" r=".07"/>`).join('')}</g>`,
  crescent: `<path d="M.3-.9A.95.95 0 1 0 .3.9A.7.7 0 1 1 .3-.9Z" fill="F" stroke="S"/>`,
  crescent_blank: `<path d="M.3-.9A.95.95 0 1 0 .3.9A.7.7 0 1 1 .3-.9Z" fill="F" stroke="S"/><rect x="-.55" y="-.35" width=".38" height=".42" fill="B" stroke="S"/>`,
  circle: `<circle r=".8" fill="F" stroke="S"/>`,
  ring: `<circle r=".8" fill="none" stroke="S"/><circle r=".55" fill="F" stroke="S"/>`,
  dial: `<circle r=".85" fill="F" stroke="S"/>${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${(Math.cos(a) * .62).toFixed(2)} ${(Math.sin(a) * .62).toFixed(2)}L${(Math.cos(a) * .82).toFixed(2)} ${(Math.sin(a) * .82).toFixed(2)}" stroke="S"/>`; }).join('')}<path d="M0 0V-.5M0 0L.35.2" stroke="S"/>`,
  scroll: `<path d="M-.8-.5H.6Q.85-.5.85-.25V.6H-.6Q-.85.6-.85.35V-.25Q-.85-.5-.6-.5" fill="F" stroke="S"/><path d="M-.5-.15H.5M-.5.15H.4" stroke="S"/>`,
  book: `<path d="M0-.6Q-.5-.85-.95-.6V.75Q-.5.5 0 .75Q.5.5.95.75V-.6Q.5-.85 0-.6Z" fill="F" stroke="S"/><path d="M0-.6V.75" stroke="S"/>`,
  cup: `<path d="M-.5-.6H.5L.35.7H-.35Z" fill="F" stroke="S"/><path d="M-.45-.3H.45" stroke="S"/>`,
  mouth: `<path d="M-.9 0Q0-.6.9 0Q0 .6-.9 0Z" fill="F" stroke="S"/><path d="M-.9 0H.9" stroke="S"/>`,
  hook: `<path d="M0-.95V.3A.45.45 0 1 1-.6.05" fill="none" stroke="F" stroke-width="3"/><circle cy="-.9" r=".12" fill="S"/>`,
  keel: `<path d="M-.95-.2Q0 .9.95-.2" fill="F" stroke="S"/><path d="M-.6-.2L-.2-.55M.1-.2L.5-.6" stroke="S"/>`,
  grid: `<rect x="-.8" y="-.8" width="1.6" height="1.6" fill="F" stroke="S"/><path d="M-.27-.8V.8M.27-.8V.8M-.8-.27H.8M-.8.27H.8" stroke="S"/>`,
  scope: `<path d="M-.9.25L.7-.55L.85-.25L-.75.55Z" fill="F" stroke="S"/><path d="M-.1.2L-.4.9M-.1.2L.2.9" stroke="S"/>`,
  lines: `<path d="M-.95-.4Q-.3-.7.2-.4T.95-.4M-.95.05Q-.3-.25.2.05T.95.05M-.95.5Q-.3.2.2.5T.95.5" fill="none" stroke="F" stroke-width="2.5"/>`,
  key: `<circle cx="-.5" cy="0" r=".35" fill="F" stroke="S"/><path d="M-.15 0H.9M.6 0V.3M.8 0V.25" stroke="S" stroke-width="2.5"/>`,
  flame: `<path d="M0-.95Q.65-.3.55.3A.55.6 0 0 1-.55.3Q-.6-.15-.2-.45Q-.15-.1.05-.05Q.1-.5 0-.95Z" fill="F" stroke="S"/>`,
  quill: `<path d="M.8-.9Q-.1-.6-.5.6L-.7.9M.8-.9Q.3.1-.5.6" fill="F" stroke="S"/>`,
  lamp: `<path d="M-.45-.3H.45L.6.6H-.6Z" fill="F" stroke="S"/><path d="M-.3-.3V-.6H.3V-.3" fill="none" stroke="S"/><path d="M0-.95Q.15-.75 0-.62Q-.15-.75 0-.95Z" fill="S"/>`,
  lock: `<rect x="-.6" y="-.1" width="1.2" height=".95" fill="F" stroke="S"/><path d="M-.35-.1V-.45A.35.35 0 0 1 .35-.45V-.1" fill="none" stroke="S" stroke-width="2.5"/>`,
  hand: `<path d="M-.5.9V-.1L-.75-.45Q-.6-.6-.4-.35V-.8Q-.25-.95-.1-.8V-.5V-.9Q.05-1 .2-.85V-.45V-.75Q.35-.9.5-.7V.1Q.6.5.4.9Z" fill="F" stroke="S"/>`,
  plaque: `<rect x="-.85" y="-.45" width="1.7" height=".9" rx=".1" fill="F" stroke="S"/><rect x="-.6" y="-.2" width="1.2" height=".4" fill="B" stroke="S"/>`,
  hammer: `<rect x="-.75" y="-.8" width="1.1" height=".5" fill="F" stroke="S"/><path d="M-.2-.3V.95" stroke="S" stroke-width="3"/>`,
  blade: `<path d="M0-.95L.18.4H-.18Z" fill="F" stroke="S"/><path d="M-.45.4H.45M0 .4V.9" stroke="S" stroke-width="2.5"/>`,
  tower: `<path d="M-.35.95L-.25-.6H.25L.35.95Z" fill="F" stroke="S"/><path d="M-.35-.6H.35L0-.95Z" fill="S"/>`,
  scissors: `<circle cx="-.5" cy=".55" r=".25" fill="none" stroke="S"/><circle cx=".5" cy=".55" r=".25" fill="none" stroke="S"/><path d="M-.35.35L.6-.9M.35.35L-.6-.9" stroke="F" stroke-width="2.5"/>`,
  candle: `<rect x="-.25" y="-.3" width=".5" height="1.2" fill="F" stroke="S"/><path d="M0-.85Q.2-.55 0-.4Q-.2-.55 0-.85Z" fill="S"/>`,
  crystal: `<path d="M0-.9L.5-.3L.3.7L-.3.7L-.5-.3Z" fill="F" stroke="S"/><path d="M0-.9V.7M-.5-.3L.5-.3" stroke="S"/>`,
  squares: `<rect x="-.95" y="-.25" width=".55" height=".55" fill="F" stroke="S"/><rect x="-.27" y="-.25" width=".55" height=".55" fill="F" stroke="S"/><rect x=".4" y="-.25" width=".55" height=".55" fill="F" stroke="S"/>`,
  flag: `<path d="M-.6-.9V.95" stroke="S" stroke-width="2.5"/><path d="M-.6-.85L.9-.45L-.6-.05Z" fill="F" stroke="S"/>`,
  ladle: `<path d="M-.8.2A.45.4 0 0 0 .1.2Z" fill="F" stroke="S"/><path d="M.1.2L.9-.8" stroke="S" stroke-width="2.5"/>`,
  banner: `<path d="M-.9-.8H.9V.6L0 .9L-.9.6Z" fill="F" stroke="S"/><path d="M-.9-.5H.9" stroke="S"/>`,
  arrow: `<path d="M0 .95L.7.15H.25V-.9H-.25V.15H-.7Z" fill="F" stroke="S"/>`,
  plates: `<rect x="-.8" y="-.55" width="1.3" height=".85" fill="F" stroke="S"/><rect x="-.5" y="-.25" width="1.3" height=".85" fill="F" stroke="S"/>`,
  spear: `<path d="M-.85.85L.6-.6" stroke="S" stroke-width="2.5"/><path d="M.95-.95L.75-.35L.35-.75Z" fill="F" stroke="S"/>`,
  helmet: `<path d="M-.7.6V0A.7.7 0 0 1 .7 0V.6Z" fill="F" stroke="S"/><circle cy=".05" r=".28" fill="B" stroke="S"/>`,
  grains: `<circle cx="-.45" cy="-.2" r=".2" fill="F" stroke="S"/><circle cx=".35" cy="-.45" r=".17" fill="F" stroke="S"/><circle cx=".1" cy=".35" r=".24" fill="F" stroke="S"/><circle cx="-.6" cy=".55" r=".13" fill="F" stroke="S"/><circle cx=".65" cy=".3" r=".14" fill="F" stroke="S"/>`,
  chain: `<ellipse cx="-.5" rx=".4" ry=".25" fill="none" stroke="F" stroke-width="2.5"/><ellipse rx=".4" ry=".25" fill="none" stroke="S" stroke-width="2.5"/><ellipse cx=".5" rx=".4" ry=".25" fill="none" stroke="F" stroke-width="2.5"/>`,
  hood: `<path d="M-.8.95Q-.85-.9 0-.9Q.85-.9.8.95Z" fill="F" stroke="S"/><path d="M-.35.1Q0-.5.35.1V.5H-.35Z" fill="B" stroke="S"/>`,
  bell: `<path d="M-.75.6Q-.6-.85 0-.85Q.6-.85.75.6Z" fill="F" stroke="S"/><circle cy=".75" r=".14" fill="S"/>`,
  altar: `<rect x="-.85" y="-.15" width="1.7" height=".4" fill="F" stroke="S"/><path d="M-.6.25V.9M.6.25V.9" stroke="S" stroke-width="3"/>`,
  bone: `<path d="M-.6-.12H.6" stroke="F" stroke-width="5"/><circle cx="-.7" cy="-.25" r=".17" fill="F"/><circle cx="-.7" cy=".05" r=".17" fill="F"/><circle cx=".7" cy="-.25" r=".17" fill="F"/><circle cx=".7" cy=".05" r=".17" fill="F"/>`,
  wave: `<path d="M-.95.6Q-.6-.6 0-.1Q.2-.75.6-.55Q.25-.35.45 0Q.7.3.95.1V.8H-.95Z" fill="F" stroke="S"/>`,
  steps: `<path d="M-.9.8V.35H-.3V-.1H.3V-.55H.9V.8Z" fill="F" stroke="S"/>`,
  claw: `<path d="M-.2.9Q-.9.2-.4-.6Q-.2-.95.2-.8L-.05-.25Q.45-.6.8-.3Q.5.3-.05.25Z" fill="F" stroke="S"/>`,
  cylinder: `<rect x="-.5" y="-.45" width="1" height="1.2" fill="F" stroke="S"/><ellipse cy="-.45" rx=".5" ry=".15" fill="F" stroke="S"/><path d="M-.15-.7Q-.3-.85-.1-.95M.15-.7Q0-.85.2-.95" fill="none" stroke="S"/>`,
  wrench: `<path d="M-.8.8L.25-.25" stroke="F" stroke-width="4"/><path d="M.1-.45A.45.45 0 1 1 .5.0L.4-.2L.25-.25L.2-.4Z" fill="F" stroke="S"/>`,
  spiral: `<path d="M0 0Q.2-.2 0-.3Q-.35-.3-.35 0Q-.3.45.1.45Q.6.4.6-.05Q.55-.7-.05-.7Q-.8-.65-.85.05" fill="none" stroke="F" stroke-width="3"/>`,
  needle: `<path d="M-.85.85L.85-.85" stroke="F" stroke-width="2.5"/><ellipse cx=".7" cy="-.7" rx=".12" ry=".06" fill="B" stroke="S" transform="rotate(-45 .7 -.7)"/>`,
  anchor: `<path d="M0-.7V.85M-.35-.35H.35M-.8.35Q-.7.85 0 .85Q.7.85.8.35" fill="none" stroke="F" stroke-width="3"/><circle cy="-.8" r=".14" fill="none" stroke="S"/>`,
  shell_carapace: `<path d="M-.95.45A.95.8 0 0 1 .95.45Z" fill="F" stroke="S"/><path d="M0 .45V-.35M-.5.45L-.3-.2M.5.45L.3-.2" stroke="S"/>`,
  drum: `<ellipse cy="-.35" rx=".7" ry=".22" fill="F" stroke="S"/><path d="M-.7-.35V.5Q0 .8.7.5V-.35" fill="F" stroke="S"/>`,
  vortex: `<path d="M-.9 0A.9.9 0 0 1 .6-.6M.9 0A.9.9 0 0 1-.6.6M-.5 0A.5.5 0 0 1 .35-.35M.5 0A.5.5 0 0 1-.35.35" fill="none" stroke="F" stroke-width="2.5"/>`,
  seal: `<path d="M0-.85L.25-.6.6-.65.6-.3.85 0 .6.3.6.65.25.6 0 .85-.25.6-.6.65-.6.3-.85 0-.6-.3-.6-.65-.25-.6Z" fill="F" stroke="S"/><circle r=".35" fill="none" stroke="S"/>`,
  xmark: `<path d="M-.75-.75L.75.75M.75-.75L-.75.75" stroke="F" stroke-width="5"/>`,
  bottle: `<path d="M-.2-.9H.2V-.45L.6-.1V.85H-.6V-.1L-.2-.45Z" fill="F" stroke="S"/>`,
  dome: `<path d="M-.85.6A.85.85 0 0 1 .85.6Z" fill="F" stroke="S" fill-opacity=".55"/><path d="M-.95.6H.95" stroke="S"/>`,
  mask: `<path d="M-.7-.8H.7V.3Q.7.9 0 .9Q-.7.9-.7.3Z" fill="F" stroke="S"/><rect x="-.45" y="-.35" width=".3" height=".18" fill="B"/><rect x=".15" y="-.35" width=".3" height=".18" fill="B"/>`,
  smoke: `<path d="M-.6.9Q-.9.3-.3.1Q-.7-.5 0-.6Q.2-1 .6-.7Q.95-.3.5 0Q.9.5.3.9Z" fill="F" stroke="S" fill-opacity=".7"/>`,
  pendulum: `<path d="M0-.95V.35" stroke="S" stroke-width="2"/><circle cy=".6" r=".3" fill="F" stroke="S"/>`,
  hole: `<circle r=".8" fill="F" stroke="S"/><circle r=".4" fill="B" stroke="S"/>`,
  peel: `<path d="M-.8-.6Q0-.9.8-.6Q.5 0 .8.7Q0 .4-.8.7Q-.5 0-.8-.6Z" fill="F" stroke="S"/><path d="M.5-.62L.9-.95" stroke="S"/>`,
  rake: `<path d="M0 .95V-.4" stroke="S" stroke-width="2.5"/><path d="M-.7-.4H.7M-.7-.4V-.85M-.35-.4V-.85M0-.4V-.85M.35-.4V-.85M.7-.4V-.85" stroke="F" stroke-width="2.5"/>`,
  shard: `<path d="M-.6-.7L.7-.4L.4.8L-.8.3Z" fill="F" stroke="S" fill-opacity=".75"/><path d="M-.3-.4L.1.3" stroke="S"/>`,
  wing: `<path d="M-.95-.5L0 .45L.95-.5L0 .05Z" fill="F" stroke="S"/>`,
  sack: `<path d="M-.3-.6Q-.85.0-.7.6Q-.5.95 0 .95Q.5.95.7.6Q.85 0 .3-.6Z" fill="F" stroke="S"/><path d="M-.35-.6Q0-.9.35-.6M-.25-.75L-.45-.95M.25-.75L.45-.95" fill="none" stroke="S"/>`,
  eye: `<path d="M-.9 0Q0-.65.9 0Q0 .65-.9 0Z" fill="F" stroke="S"/><circle r=".25" fill="S"/>`,
  eye_closed: `<path d="M-.9-.1Q0 .55.9-.1" fill="none" stroke="F" stroke-width="3"/><path d="M-.5.15L-.6.4M0 .25V.5M.5.15L.6.4" stroke="S"/>`,
  feet: `<ellipse cx="-.4" cy=".4" rx=".2" ry=".32" fill="F" stroke="S"/><ellipse cx=".3" cy="-.3" rx=".2" ry=".32" fill="F" stroke="S"/>`,
  arch: `<path d="M-.8.9V-.1A.8.8 0 0 1 .8-.1V.9H.45V-.1A.45.45 0 0 0-.45-.1V.9Z" fill="F" stroke="S"/>`,
  semicircle: `<path d="M-.9.3A.9.9 0 0 1 .9.3Z" fill="F" stroke="S"/>`,
  pillar: `<rect x="-.3" y="-.75" width=".6" height="1.6" fill="F" stroke="S"/><rect x="-.45" y="-.9" width=".9" height=".18" fill="F" stroke="S"/><rect x="-.45" y=".75" width=".9" height=".18" fill="F" stroke="S"/>`,
  staff: `<path d="M-.3.95L.2-.85" stroke="F" stroke-width="3"/><circle cx=".2" cy="-.85" r=".12" fill="S"/>`,
  bubble: `<circle cx="-.25" cy=".1" r=".55" fill="F" stroke="S" fill-opacity=".6"/><circle cx=".5" cy="-.45" r=".28" fill="F" stroke="S" fill-opacity=".6"/>`,
  shovel: `<path d="M0-.95V.2" stroke="S" stroke-width="2.5"/><path d="M-.35.15H.35V.6L0 .95L-.35.6Z" fill="F" stroke="S"/>`,
  coffin: `<path d="M-.35-.9H.35L.6-.4L.4.9H-.4L-.6-.4Z" fill="F" stroke="S"/><path d="M-.55-.5Q0-.2.55-.5M-.5.1Q0 .4.5.1" fill="none" stroke="S"/>`,
  bolt_zig: `<path d="M.2-.95L-.55.1H0L-.25.95L.6-.15H.05Z" fill="F" stroke="S"/>`,
  mace: `<path d="M-.7.9L.1 0" stroke="S" stroke-width="3"/><circle cx=".35" cy="-.3" r=".45" fill="F" stroke="S"/>`,
  sawblade: `<path d="${Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5, b = a + Math.PI / 10; return `${i ? 'L' : 'M'}${(Math.cos(a) * .9).toFixed(2)} ${(Math.sin(a) * .9).toFixed(2)}L${(Math.cos(b) * .65).toFixed(2)} ${(Math.sin(b) * .65).toFixed(2)}`; }).join('')}Z" fill="F" stroke="S"/><circle r=".2" fill="B"/>`,
  quote: `<path d="M-.7-.6H-.1V0L-.5.7H-.7L-.4 0H-.7ZM.1-.6H.7V0L.3.7H.1L.4 0H.1Z" fill="F" stroke="S"/>`,
  target: `<circle r=".85" fill="none" stroke="F" stroke-width="2.5"/><circle r=".5" fill="none" stroke="S" stroke-width="2"/><circle r=".15" fill="F"/>`,
  teeth: `<path d="M-.9-.5L-.6 0L-.3-.5L0 0L.3-.5L.6 0L.9-.5M-.9.5L-.6 0L-.3.5L0 0L.3.5L.6 0L.9.5" fill="none" stroke="F" stroke-width="2.5"/>`,
  doll: `<circle cy="-.55" r=".3" fill="F" stroke="S" fill-opacity=".7"/><path d="M-.5.9L-.3-.2H.3L.5.9Z" fill="F" stroke="S" fill-opacity=".7"/>`,
  box: `<path d="M-.8-.3H.8V.8H-.8Z" fill="F" stroke="S"/><path d="M-.85-.3L-.55-.75H.4L.85-.3" fill="none" stroke="S"/>`,
  sword: `<path d="M-.1.5L.85-.85L.45.3Z" fill="F" stroke="S"/><path d="M-.55.15L.2.75M-.15.45L-.75.95" stroke="S" stroke-width="2.5"/>`,
  shoulder: `<path d="M-.95.9Q-.95-.1 0-.1Q.95-.1.95.9Z" fill="F" stroke="S"/><circle cy="-.5" r=".3" fill="F" stroke="S"/>`,
  hands_two: `<g transform="translate(-.4 0) scale(.6)"><path d="M-.5.9V-.1L-.75-.45Q-.6-.6-.4-.35V-.8Q-.25-.95-.1-.8V-.9Q.05-1 .2-.85V-.75Q.35-.9.5-.7V.1Q.6.5.4.9Z" fill="F" stroke="S"/></g><g transform="translate(.4 0) scale(-.6 .6)"><path d="M-.5.9V-.1L-.75-.45Q-.6-.6-.4-.35V-.8Q-.25-.95-.1-.8V-.9Q.05-1 .2-.85V-.75Q.35-.9.5-.7V.1Q.6.5.4.9Z" fill="F" stroke="S"/></g>`,
  bellows: `<path d="M-.8-.5L.4-.2V.2L-.8.5Z" fill="F" stroke="S"/><path d="M.4 0H.95M-.5-.42V.42M-.2-.35V.35" stroke="S"/>`,
  board: `<rect x="-.9" y="-.25" width="1.8" height=".5" fill="F" stroke="S"/><path d="M-.5-.25V.25M.3-.25V.25" stroke="S"/>`,
  windup: `<rect x="-.6" y="-.2" width="1.2" height=".9" fill="F" stroke="S"/><path d="M0-.2V-.6M-.4-.85A.3.25 0 0 0 0-.6A.3.25 0 0 0 .4-.85" fill="none" stroke="S" stroke-width="2.5"/>`,
  furnace: `<rect x="-.85" y="-.7" width="1.7" height="1.5" fill="F" stroke="S"/><path d="M-.4.8V.1A.4.4 0 0 1 .4.1V.8Z" fill="B" stroke="S"/><path d="M0 .65Q.25.35 0 .15Q-.25.35 0 .65Z" fill="S"/>`,
  brandmark: `<rect x="-.65" y="-.65" width="1.3" height="1.3" transform="rotate(45)" fill="F" stroke="S"/><path d="M-.3 0H.3M0-.3V.3" stroke="B" stroke-width="2.5"/>`,
  pearl_ball: `<circle r=".6" fill="F" stroke="S"/><circle cx="-.2" cy="-.22" r=".15" fill="S" fill-opacity=".6"/>`,
  waterline: `<path d="M-.95 .1H.95" stroke="F" stroke-width="3"/><path d="M-.6.4H.6M-.3.7H.3" stroke="S"/>`,
};

// 낱말 → 도형. 긴 낱말부터 찾음(첫 매칭 = 주 모티프, 두 번째 = 보조 모티프)
const WORDS = [
  ['사각 방패', 'shield'], ['방패', 'shield'], ['두루마리', 'scroll'], ['장부', 'book'], ['책장', 'book'], ['표지', 'book'], ['책', 'book'], ['목록', 'scroll'],
  ['벽보', 'plaque'], ['문패', 'plaque'], ['서명란', 'plaque'], ['물잔', 'cup'], ['눈물', 'drop'], ['물방울', 'drop'], ['입술', 'mouth'], ['입', 'mouth'],
  ['달력', 'dial'], ['시계', 'dial'], ['눈금 바늘', 'dial'], ['눈금', 'dial'], ['갈고리', 'hook'], ['너트', 'hexagon'], ['육각', 'hexagon'], ['톱날', 'sawblade'], ['톱니', 'gear'],
  ['용골', 'keel'], ['격자', 'grid'], ['그물', 'grid'], ['채반', 'grid'], ['망원경', 'scope'], ['조준선', 'target'], ['과녁', 'target'],
  ['열쇠', 'key'], ['모닥불', 'flame'], ['불꽃', 'flame'], ['불붙은', 'flame'], ['깃펜', 'quill'], ['바늘', 'needle'], ['램프', 'lamp'], ['등잔', 'lamp'],
  ['자물쇠', 'lock'], ['빗장', 'lock'], ['장갑', 'hand'], ['두 개의 손', 'hands_two'], ['이어진 손', 'hands_two'], ['손 모음', 'hands_two'], ['손짓', 'hand'], ['손가락', 'hand'], ['손', 'hand'], ['팔', 'hand'],
  ['웅덩이', 'pool'], ['경매 망치', 'hammer'], ['망치머리', 'hammer'], ['망치', 'hammer'], ['칼끝', 'blade'], ['단검', 'blade'], ['장검', 'sword'], ['칼선', 'needle'], ['교차한 칼', 'sword'], ['초승달 칼', 'crescent'], ['칼', 'blade'],
  ['탑', 'tower'], ['기둥', 'pillar'], ['가위', 'scissors'], ['심지', 'candle'], ['흘러내린 초', 'candle'], ['벽', 'wall'], ['결정', 'crystal'], ['사각들', 'squares'],
  ['삼각기', 'flag'], ['깃발', 'flag'], ['국자', 'ladle'], ['휘장', 'banner'], ['천', 'banner'], ['화살표', 'arrow'], ['철판', 'plates'], ['판자', 'board'], ['겹친 판', 'plates'], ['판', 'plates'],
  ['작살', 'spear'], ['창', 'spear'], ['투구', 'helmet'], ['헬멧', 'helmet'], ['잠수종', 'bell'], ['흙손', 'ladle'], ['소금 알', 'grains'], ['모래 점', 'grains'], ['볼트', 'grains'], ['리벳', 'hole'], ['알', 'grains'], ['점선', 'grains'],
  ['사슬', 'chain'], ['고리', 'chain'], ['두건', 'hood'], ['후드', 'hood'], ['종', 'bell'], ['제단', 'altar'], ['뼈', 'bone'], ['붕대', 'bone'], ['물마루', 'wave'], ['물결', 'wave'],
  ['볼', 'circle'], ['계단', 'steps'], ['집게', 'claw'], ['원통', 'cylinder'], ['렌치', 'wrench'], ['태엽', 'windup'], ['화로', 'furnace'], ['나선', 'spiral'], ['나사', 'spiral'],
  ['발사관', 'cylinder'], ['닻', 'anchor'], ['진동선', 'ring'], ['등딱지', 'shell_carapace'], ['껍데기', 'shell_carapace'], ['북', 'drum'], ['갈기', 'triangle_lean'], ['소용돌이', 'vortex'],
  ['표식', 'brandmark'], ['밀랍', 'seal'], ['봉인', 'seal'], ['X자', 'xmark'], ['잉크병', 'bottle'], ['먹 방울', 'drop'], ['덮개', 'dome'], ['가면', 'mask'], ['연기', 'smoke'], ['안개', 'smoke'],
  ['추', 'pendulum'], ['도려낸 원', 'hole'], ['껍질', 'peel'], ['정원', 'ring'], ['갈퀴', 'rake'], ['유리 조각', 'shard'], ['날개', 'wing'], ['V자', 'wing'], ['V', 'wing'], ['주머니', 'sack'], ['자루', 'sack'],
  ['감은 눈', 'eye_closed'], ['눈', 'eye'], ['발자국', 'feet'], ['빠지는 발', 'feet'], ['풀무', 'bellows'], ['아치', 'arch'], ['반원', 'semicircle'], ['지팡이', 'staff'], ['진주', 'pearl_ball'],
  ['거품', 'bubble'], ['삽', 'shovel'], ['관', 'coffin'], ['번개', 'bolt_zig'], ['철퇴', 'mace'], ['따옴표', 'quote'], ['이빨', 'teeth'], ['인형', 'doll'], ['상자', 'box'], ['어깨', 'shoulder'],
  ['머리 실루엣', 'shoulder'], ['실루엣', 'shoulder'], ['김 줄기', 'smoke'], ['김', 'smoke'], ['빛살', 'tower'], ['빛줄기', 'tower'], ['수조 원', 'ring'], ['초승달', 'crescent'], ['삼각', 'triangle'], ['사각', 'plaque'],
  ['글', 'scroll'], ['두 장', 'plates'], ['갈래', 'spear'], ['물음표', 'flame'], ['선', 'lines'], ['줄', 'lines'], ['원', 'circle'], ['게', 'claw'], ['수문', 'arch'], ['막', 'crystal'],
].sort((a, b) => b[0].length - a[0].length);
G.pool = `<ellipse cy=".3" rx=".9" ry=".4" fill="F" stroke="S"/><ellipse cy=".25" rx=".5" ry=".18" fill="none" stroke="S"/>`;

const MODS = {
  scale: [[/거대한|큰|넓은|두꺼운|길게|긴/, 1.18], [/작은|가는|짧은/, 0.78]],
  count2: /두 겹|겹쳐진|두 갈래|두 개|두 장|두 방울|겹친|겹겹|이어진|교차한/,
  count3: /셋|흩어진|줄지어|늘어선|대열|흩어진 V들|떼/,
  rot180: /거꾸로|아래로/, lean: /기운|앞으로|휘날리는|날아가는|던지는|덮치는/,
  crack: /부서진|부서지는|깨진|잘린|찢긴|도려낸|구겨진|벗겨진|타는/,
  black: /검은/, white: /흰|하얀|맑은/, red: /붉은|달군/, blue: /파란/, green: /녹색/,
};

export function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; }

export function parseHint(card) {
  const [pre, motifRaw = ''] = card.visual_hint.split(';');
  const motif = motifRaw.trim();
  const found = []; let rest = motif;
  for (const [w, g] of WORDS) {
    const i = rest.indexOf(w);
    if (i >= 0) { found.push({ w, g, i }); rest = rest.slice(0, i) + ' '.repeat(w.length) + rest.slice(i + w.length); }
    if (found.length >= 2) break;
  }
  found.sort((a, b) => b.i - a.i); // 한국어 명사구는 뒤 낱말이 중심(예: "두루마리 위 작은 방패" → 방패가 주)
  const m = {};
  for (const [re, v] of MODS.scale) if (re.test(motif)) { m.scale = v; break; }
  for (const k of ['count2', 'count3', 'rot180', 'lean', 'crack', 'black', 'white', 'red', 'blue', 'green']) m[k] = MODS[k].test(motif);
  return { prefix: pre.trim(), motif, main: found[0]?.g || null, sub: found[1]?.g || null, words: found.map((f) => f.w), mods: m };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function glyph(name, x, y, size, F, S, B, rot = 0) {
  const sw = (2 / size).toFixed(3);
  const body = G[name].replace(/"F"/g, `"${F}"`).replace(/"S"/g, `"${S}"`).replace(/"B"/g, `"${B}"`)
    .replace(/stroke-width="(\d+(?:\.\d+)?)"/g, (_, n) => `stroke-width="${(n * 1.4 / size).toFixed(3)}"`);
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${size.toFixed(1)})" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">${body}</g>`;
}

// type: 'answerer' | 'rite' | 'brand' (balance 미정이면 guessKind)
export function guessKind(card) {
  if (card.kind) return card.kind;
  if (/^(d_|ai_bolt|ai_sweep|b_fit|b_sealwrit)/.test(card.branch)) return 'rite';
  if (card.branch === 'ad_brand') return 'brand';
  return 'answerer';
}

export function portraitSVG(card, opt = {}) {
  const W = 120, H = 90;
  const fac = factions[card.owner] || factions.neutral, rar = card.rarity || card.rarity_hint || 'sand';
  const p = parseHint(card), R = rng(hash(card.id));
  const kind = guessKind(card);
  let F = fac.primary, S = fac.secondary; const B = fac.deep;
  if (p.mods.black) { F = '#0A1016'; S = RAR.abyss.edge; }
  else if (p.mods.white) F = '#F2EEE4';
  else if (p.mods.red) F = '#B8352D';
  else if (p.mods.blue) F = '#3D7BD9';
  else if (p.mods.green) F = '#4E9A6E';
  if (F === S) S = '#F2EEE4';
  const horizon = 60 + Math.round(R() * 8 - 4);
  const parts = [];
  parts.push(`<rect width="${W}" height="${H}" fill="${B}"/>`);
  // 땅(소금 평원) + 수평선
  parts.push(`<path d="M0 ${horizon}H${W}V${H}H0Z" fill="${fac.primary}" fill-opacity=".12"/>`);
  parts.push(`<path d="M0 ${horizon}H${W}" stroke="${fac.secondary}" stroke-opacity=".35" stroke-width="1"/>`);
  // 소금 알갱이(시드)
  for (let i = 0; i < 6; i++) parts.push(`<circle cx="${(R() * W).toFixed(0)}" cy="${(horizon + 4 + R() * (H - horizon - 6)).toFixed(0)}" r="${(0.6 + R()).toFixed(1)}" fill="${fac.secondary}" fill-opacity=".3"/>`);
  // 세력 실루엣(배경, 흐리게) — 같은 세력 카드가 한 덱에서 한눈에 묶여 보이게
  parts.push(`<g opacity=".2">${glyph(fac.shape, 60 + (R() * 10 - 5), 44, 40, fac.primary, fac.primary, B)}</g>`);
  if (kind === 'rite') { parts.push(`<circle cx="60" cy="44" r="30" fill="none" stroke="${fac.secondary}" stroke-opacity=".35" stroke-width="1.2"/><circle cx="60" cy="44" r="38" fill="none" stroke="${fac.secondary}" stroke-opacity=".2" stroke-width="1"/>`); }
  else parts.push(`<ellipse cx="60" cy="${horizon + 6}" rx="26" ry="4" fill="#000" fill-opacity=".3"/>`);
  if (kind === 'brand') parts.push(`<path d="M18 80L102 10" stroke="${fac.secondary}" stroke-opacity=".25" stroke-width="3"/>`);
  // 주 모티프
  const main = p.main || fac.shape;
  const size = 24 * (p.mods.scale || 1);
  const rot = (p.mods.rot180 ? 180 : 0) + (p.mods.lean ? 18 : 0) + (R() * 8 - 4);
  const n = p.mods.count3 ? 3 : p.mods.count2 ? 2 : 1;
  const cy = 42;
  if (n === 1) parts.push(glyph(main, 60, cy, size, F, S, B, rot));
  else for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * size * (n === 3 ? 1.25 : 1.1); parts.push(glyph(main, 60 + off, cy + (n === 3 ? (i % 2) * 6 - 3 : 0), size * (n === 3 ? 0.62 : 0.75), F, S, B, rot)); }
  // 보조 모티프(작게, 오른쪽 위 또는 아래)
  if (p.sub && p.sub !== main) parts.push(glyph(p.sub, 94, 22, 11, fac.secondary, fac.primary, B, 0));
  // 금 가기
  if (p.mods.crack) parts.push(`<path d="M${50 + R() * 6} 18L${58 + R() * 4} 38L${52 + R() * 4} 50L${64 + R() * 6} 70" fill="none" stroke="${B}" stroke-width="2.4"/>`);
  // 희귀도 덧칠
  if (rar === 'pearl') parts.push(`<path d="M8 22Q20 6 40 6" fill="none" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/>`);
  if (rar === 'coral') parts.push(`<path d="M6 90V76L2 68M6 76L12 66L10 58M12 66L18 62" fill="none" stroke="${RAR.coral.fill}" stroke-width="2.2" stroke-linecap="round"/>`);
  if (rar === 'abyss') parts.push(`<path d="M0 78Q20 70 40 78T80 78T120 76V90H0Z" fill="#05090D"/><path d="M0 78Q20 70 40 78T80 78T120 76" fill="none" stroke="${RAR.abyss.glow}" stroke-width="1.4" stroke-opacity=".9"/><rect width="${W}" height="${H}" fill="none" stroke="${RAR.abyss.glow}" stroke-opacity=".35" stroke-width="3"/>`);
  const title = opt.title === false ? '' : `<title>${esc(card.name_ko || card.id)}</title>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${opt.w || W}" height="${opt.h || H}">${title}${parts.join('')}</svg>`;
}

export function loadCards() { return JSON.parse(readFileSync(join(PROJ, 'lore', 'cards-lore.json'), 'utf8')); }

export const SAMPLE_IDS = ['D001', 'B003', 'B018', 'B036', 'B042', 'B051', 'B064', 'B078', 'B090', 'D012', 'A002', 'A010', 'A048', 'A060', 'B097', 'B120'];

if (process.argv[1] && process.argv[1].endsWith('portrait-gen.mjs')) {
  const cards = loadCards();
  const args = process.argv.slice(2);
  let main = 0, sub = 0, fallback = [], maxBytes = 0, total = 0;
  const usage = {};
  for (const c of cards) {
    const p = parseHint(c);
    if (p.main) main++; else fallback.push(c.id + ' ' + p.motif);
    if (p.sub) sub++;
    usage[p.main || '(세력 도형)'] = (usage[p.main || '(세력 도형)'] || 0) + 1;
    const s = portraitSVG(c); total += s.length; maxBytes = Math.max(maxBytes, s.length);
  }
  const distinct = new Set(cards.map((c) => { const p = parseHint(c); return [c.owner, p.main, p.sub, p.mods.count2, p.mods.count3, p.mods.rot180, p.mods.black].join('|'); })).size;
  console.log(`카드 ${cards.length}장: 모티프 매칭 ${main}/${cards.length}, 보조 모티프 ${sub}, 서로 다른 조합 ${distinct}, 도형 종류 ${Object.keys(usage).length}`);
  console.log(`SVG 크기 평균 ${(total / cards.length / 1024).toFixed(2)} KB, 최대 ${(maxBytes / 1024).toFixed(2)} KB, 전체 ${(total / 1024).toFixed(0)} KB`);
  if (fallback.length) console.log('세력 도형으로 대체:', fallback.join(', '));
  if (args.includes('--samples')) {
    const out = join(PROJ, 'assets', 'samples'); mkdirSync(out, { recursive: true });
    for (const id of SAMPLE_IDS) { const c = cards.find((x) => x.id === id); writeFileSync(join(out, `portrait-${id}.svg`), portraitSVG(c)); }
    // 200장 한눈 보기(검수용)
    const cols = 20, cw = 60, ch = 45;
    const cells = cards.map((c, i) => `<g transform="translate(${(i % cols) * cw} ${Math.floor(i / cols) * ch})">${portraitSVG(c, { w: cw - 2, h: ch - 2, title: false })}</g>`).join('');
    writeFileSync(join(out, 'portraits-all-200.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * cw} ${Math.ceil(cards.length / cols) * ch}" width="${cols * cw}" height="${Math.ceil(cards.length / cols) * ch}"><rect width="100%" height="100%" fill="#0B151B"/>${cells}</svg>`);
    console.log(`샘플 ${SAMPLE_IDS.length}장 + portraits-all-200.svg → assets/samples/`);
  }
  if (args.includes('--check') && main < cards.length) process.exit(1);
}
