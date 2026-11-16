// Gera imagens SVG de placeholder (tema neon) para os produtos de demonstração
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, '..', 'public', 'img', 'products');
fs.mkdirSync(OUT, { recursive: true });

const GRADIENTS = [
  ['#3b8cff', '#9b5cff'],
  ['#9b5cff', '#35e7ff'],
  ['#35e7ff', '#3b8cff'],
  ['#ff5cc6', '#9b5cff'],
  ['#3b8cff', '#35e7ff'],
];

function wrap(id, g1, g2, inner) {
  return `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#11121d"/>
      <stop offset="100%" stop-color="#171933"/>
    </linearGradient>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${g1}"/>
      <stop offset="100%" stop-color="${g2}"/>
    </linearGradient>
    <filter id="glow${id}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="600" height="600" fill="url(#bg${id})"/>
  <circle cx="90" cy="500" r="160" fill="${g1}" opacity="0.08"/>
  <circle cx="520" cy="80" r="180" fill="${g2}" opacity="0.08"/>
  <g filter="url(#glow${id})">${inner}</g>
</svg>`;
}

const icons = {
  'teclado-vortex': (id,a,b) => wrap(id,a,b, `
    <rect x="110" y="230" width="380" height="160" rx="18" fill="none" stroke="url(#g${id})" stroke-width="6"/>
    ${Array.from({length:40}).map((_,i)=>{
      const row = Math.floor(i/10), col = i%10;
      return `<rect x="${132+col*35}" y="${255+row*34}" width="24" height="20" rx="4" fill="url(#g${id})" opacity="${0.55+ (i%4)*0.12}"/>`;
    }).join('')}
  `),
  'teclado-air': (id,a,b) => wrap(id,a,b, `
    <rect x="130" y="260" width="340" height="110" rx="14" fill="none" stroke="url(#g${id})" stroke-width="6"/>
    ${Array.from({length:30}).map((_,i)=>{
      const row = Math.floor(i/10), col = i%10;
      return `<rect x="150+${col*33}" y="${280+row*30}" width="22" height="17" rx="3" fill="url(#g${id})" opacity="0.6"/>`;
    }).join('').replace(/150\+(\d+)/g,(m,p1)=>150+Number(p1))}
  `),
  'mouse-pulse': (id,a,b) => wrap(id,a,b, `
    <path d="M300 160 C380 160 420 230 420 330 C420 430 370 470 300 470 C230 470 180 430 180 330 C180 230 220 160 300 160 Z" fill="none" stroke="url(#g${id})" stroke-width="7"/>
    <line x1="300" y1="160" x2="300" y2="280" stroke="url(#g${id})" stroke-width="5"/>
    <ellipse cx="300" cy="230" rx="14" ry="40" fill="url(#g${id})" opacity="0.7"/>
  `),
  'mouse-flow': (id,a,b) => wrap(id,a,b, `
    <path d="M250 180 C370 150 440 260 420 360 C400 460 280 480 220 420 C160 360 170 220 250 180 Z" fill="none" stroke="url(#g${id})" stroke-width="7"/>
    <circle cx="300" cy="260" r="16" fill="url(#g${id})"/>
  `),
  'mousepad-horizon': (id,a,b) => wrap(id,a,b, `
    <rect x="90" y="220" width="420" height="180" rx="22" fill="none" stroke="url(#g${id})" stroke-width="6"/>
    ${Array.from({length:6}).map((_,i)=>`<line x1="${110+i*70}" y1="240" x2="${110+i*70}" y2="380" stroke="url(#g${id})" stroke-width="2" opacity="0.35"/>`).join('')}
  `),
  'mousepad-glow': (id,a,b) => wrap(id,a,b, `
    <rect x="110" y="230" width="380" height="160" rx="26" fill="none" stroke="url(#g${id})" stroke-width="7"/>
    <rect x="130" y="250" width="340" height="120" rx="16" fill="url(#g${id})" opacity="0.12"/>
  `),
  'suporte-pillar': (id,a,b) => wrap(id,a,b, `
    <rect x="270" y="160" width="60" height="220" rx="20" fill="none" stroke="url(#g${id})" stroke-width="6"/>
    <ellipse cx="300" cy="150" rx="90" ry="34" fill="none" stroke="url(#g${id})" stroke-width="6"/>
    <rect x="180" y="400" width="240" height="30" rx="10" fill="url(#g${id})" opacity="0.5"/>
  `),
  'suporte-elevate': (id,a,b) => wrap(id,a,b, `
    <path d="M150 400 L220 240 L380 240 L450 400 Z" fill="none" stroke="url(#g${id})" stroke-width="6"/>
    <rect x="200" y="220" width="200" height="22" rx="8" fill="url(#g${id})" opacity="0.6"/>
  `),
  'headset-sonic': (id,a,b) => wrap(id,a,b, `
    <path d="M190 320 C190 220 240 160 300 160 C360 160 410 220 410 320" fill="none" stroke="url(#g${id})" stroke-width="8"/>
    <rect x="160" y="300" width="50" height="90" rx="20" fill="url(#g${id})" opacity="0.75"/>
    <rect x="390" y="300" width="50" height="90" rx="20" fill="url(#g${id})" opacity="0.75"/>
  `),
  'caixa-orbit': (id,a,b) => wrap(id,a,b, `
    <rect x="210" y="160" width="180" height="280" rx="36" fill="none" stroke="url(#g${id})" stroke-width="7"/>
    <circle cx="300" cy="260" r="46" fill="none" stroke="url(#g${id})" stroke-width="5"/>
    <circle cx="300" cy="360" r="28" fill="url(#g${id})" opacity="0.6"/>
  `),
  'garrafa-flux': (id,a,b) => wrap(id,a,b, `
    <path d="M270 160 h60 v40 l20 30 v230 a20 20 0 0 1 -20 20 h-60 a20 20 0 0 1 -20 -20 v-230 l20 -30 Z" fill="none" stroke="url(#g${id})" stroke-width="7"/>
    <rect x="260" y="320" width="80" height="18" rx="6" fill="url(#g${id})" opacity="0.7"/>
  `),
  'mochila-commuter': (id,a,b) => wrap(id,a,b, `
    <rect x="190" y="200" width="220" height="270" rx="40" fill="none" stroke="url(#g${id})" stroke-width="7"/>
    <rect x="225" y="160" width="150" height="70" rx="26" fill="none" stroke="url(#g${id})" stroke-width="6"/>
    <rect x="230" y="300" width="140" height="18" rx="6" fill="url(#g${id})" opacity="0.6"/>
  `),
  'placeholder': (id,a,b) => wrap(id,a,b, `
    <circle cx="300" cy="300" r="120" fill="none" stroke="url(#g${id})" stroke-width="8"/>
    <path d="M250 300 l35 35 l65 -75" fill="none" stroke="url(#g${id})" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  `),
};

let i = 0;
for (const [name, fn] of Object.entries(icons)) {
  const [a, b] = GRADIENTS[i % GRADIENTS.length];
  const svg = fn(name.replace(/[^a-z0-9]/g,''), a, b);
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg, 'utf8');
  i++;
}

console.log(`Geradas ${Object.keys(icons).length} imagens SVG em ${OUT}`);
