import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = new URL('../assets/logo/', import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

const FONT_STACK = 'Avenir Next, SF Pro Display, Helvetica Neue, Arial, sans-serif';

function cell({ x, y, size, fill, stroke = 'rgba(255,255,255,0.34)', opacity = 1, id = 'mark', raised = true }) {
  const radius = size * 0.22;
  if (!raised) {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${Math.max(0.55, size * 0.032)}" opacity="${opacity}"/>`;
  }
  return `
    <g opacity="${opacity}">
      <rect x="${x + 0.9}" y="${y + 2.2}" width="${size}" height="${size}" rx="${radius}" fill="#071331" opacity="0.42"/>
      <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${Math.max(0.55, size * 0.032)}"/>
      <rect x="${x + size * 0.12}" y="${y + size * 0.1}" width="${size * 0.7}" height="${size * 0.25}" rx="${size * 0.1}" fill="#FFFFFF" opacity="0.32"/>
      <path d="M${x + size * 0.1} ${y + size * 0.86}H${x + size * 0.86}" stroke="#08143A" stroke-width="${size * 0.065}" stroke-linecap="round" opacity="0.18"/>
    </g>`;
}

function digit({ x, y, text, color, size, opacity = 1 }) {
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="${FONT_STACK}" font-size="${size}" font-weight="900" fill="${color}" opacity="${opacity}">${text}</text>`;
}

function markDefs(id) {
  return `
    <defs>
      <linearGradient id="${id}-aura" x1="20" y1="14" x2="212" y2="224" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#00F5FF"/>
        <stop offset="0.46" stop-color="#3B82F6"/>
        <stop offset="1" stop-color="#FF2D95"/>
      </linearGradient>
      <linearGradient id="${id}-gold" x1="72" y1="28" x2="188" y2="220" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#FDE68A"/>
        <stop offset="0.52" stop-color="#F59E0B"/>
        <stop offset="1" stop-color="#F97316"/>
      </linearGradient>
      <linearGradient id="${id}-board-top" x1="34" y1="28" x2="208" y2="218" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#1D4ED8"/>
        <stop offset="0.36" stop-color="#0B3C92"/>
        <stop offset="1" stop-color="#06113D"/>
      </linearGradient>
      <linearGradient id="${id}-board-rim" x1="24" y1="24" x2="216" y2="218" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#67E8F9"/>
        <stop offset="0.5" stop-color="#0EA5E9"/>
        <stop offset="1" stop-color="#7C3AED"/>
      </linearGradient>
      <linearGradient id="${id}-cream-tile" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFDF7"/>
        <stop offset="0.52" stop-color="#FDF2D8"/>
        <stop offset="1" stop-color="#D9C7AE"/>
      </linearGradient>
      <linearGradient id="${id}-blue-tile" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#60A5FA"/>
        <stop offset="0.52" stop-color="#0B5DB8"/>
        <stop offset="1" stop-color="#052A66"/>
      </linearGradient>
      <linearGradient id="${id}-art-sky" x1="47" y1="53" x2="193" y2="181" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#00D4FF"/>
        <stop offset="0.28" stop-color="#7DD3FC"/>
        <stop offset="0.46" stop-color="#FFE45E"/>
        <stop offset="0.66" stop-color="#FF5C8A"/>
        <stop offset="0.84" stop-color="#A3E635"/>
        <stop offset="1" stop-color="#10B981"/>
      </linearGradient>
      <linearGradient id="${id}-petal" x1="66" y1="80" x2="170" y2="166" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#FF4ECD"/>
        <stop offset="0.5" stop-color="#FFB703"/>
        <stop offset="1" stop-color="#FB5607"/>
      </linearGradient>
      <radialGradient id="${id}-shine" cx="38%" cy="24%" r="78%">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.72"/>
        <stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="${id}-board-clip">
        <rect x="38" y="39" width="164" height="164" rx="22"/>
      </clipPath>
      <filter id="${id}-shadow" x="-32" y="-24" width="296" height="296" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="18" stdDeviation="17" flood-color="#020617" flood-opacity="0.34"/>
      </filter>
      <filter id="${id}-glow" x="-48" y="-48" width="320" height="320" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation="9" result="blur"/>
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.05 0 0 0 0 0.96 0 0 0 0 1 0 0 0 0.7 0"/>
        <feBlend in="SourceGraphic"/>
      </filter>
      <filter id="${id}-gold-glow" x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#FFB703" flood-opacity="0.85"/>
      </filter>
      <filter id="${id}-paper-shadow" x="-20" y="-20" width="280" height="280" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#020617" flood-opacity="0.42"/>
        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#FFB703" flood-opacity="0.36"/>
      </filter>
    </defs>`;
}

function logoMark(id = 'mark') {
  const s = 17.2;
  const x0 = 43;
  const y0 = 44;
  const boardSize = s * 9;
  const liftedCells = new Set([
    '1-4',
    '2-3', '2-4', '2-5',
    '3-2', '3-3', '3-4', '3-5', '3-6',
    '4-2', '4-3', '4-4', '4-5', '4-6',
    '5-3', '5-4', '5-5',
    '6-4',
  ]);
  const clueCells = new Set([
    '0-0', '0-4', '0-7',
    '1-2', '1-5', '1-8',
    '2-1', '2-6',
    '3-0', '3-7',
    '4-2', '4-6',
    '5-1', '5-8',
    '6-2', '6-5',
    '7-0', '7-3', '7-7',
    '8-1', '8-4', '8-8',
  ]);
  const clueDigits = [
    [9, 0, 0, 0, 5, 0, 0, 7, 0],
    [0, 0, 3, 0, 0, 8, 0, 0, 6],
    [0, 1, 0, 0, 0, 0, 4, 0, 0],
    [6, 0, 0, 0, 0, 0, 0, 2, 0],
    [0, 0, 8, 0, 0, 0, 5, 0, 0],
    [0, 4, 0, 0, 0, 0, 0, 0, 3],
    [0, 0, 2, 0, 0, 6, 0, 0, 0],
    [7, 0, 0, 9, 0, 0, 0, 1, 0],
    [0, 5, 0, 0, 4, 0, 0, 0, 8],
  ];
  const tilePalette = [`url(#${id}-cream-tile)`, '#FFF7ED', '#FDF2F8', '#ECFCCB'];
  const accentTiles = new Map([
    ['0-7', `url(#${id}-blue-tile)`],
    ['1-8', `url(#${id}-blue-tile)`],
    ['2-2', `url(#${id}-blue-tile)`],
    ['3-0', `url(#${id}-blue-tile)`],
    ['5-8', '#F472B6'],
    ['7-0', '#FACC15'],
    ['8-6', `url(#${id}-blue-tile)`],
    ['8-8', '#34D399'],
  ]);
  const boardCells = [];
  const digits = [];
  const gridLines = [];

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const key = `${row}-${col}`;
      const x = x0 + col * s;
      const y = y0 + row * s;
      if (!liftedCells.has(key)) {
        const blockIndex = Math.floor(row / 3) + Math.floor(col / 3);
        const fill = accentTiles.get(key) ?? tilePalette[(row + col + blockIndex) % tilePalette.length];
        boardCells.push(cell({ x, y, size: s - 0.85, fill, stroke: 'rgba(15,23,42,0.26)', id }));
      }
      if (clueCells.has(key) && !liftedCells.has(key)) {
        digits.push(digit({
          x: x + s / 2 - 0.2,
          y: y + s / 2 + 0.1,
          text: clueDigits[row][col],
          color: accentTiles.has(key) ? '#FFFFFF' : '#092048',
          size: 10.7,
          opacity: row > 5 && !accentTiles.has(key) ? 0.82 : 1,
        }));
      }
    }
  }

  for (let index = 0; index <= 9; index += 1) {
    const weight = index % 3 === 0 ? 2.2 : 0.8;
    const opacity = index % 3 === 0 ? 0.76 : 0.34;
    const pos = x0 + index * s;
    gridLines.push(`<path d="M${pos} ${y0}V${y0 + boardSize}" stroke="#0B1B45" stroke-width="${weight}" opacity="${index % 3 === 0 ? 0.92 : opacity}"/>`);
    gridLines.push(`<path d="M${x0} ${pos}H${x0 + boardSize}" stroke="#0B1B45" stroke-width="${weight}" opacity="${index % 3 === 0 ? 0.92 : opacity}"/>`);
  }

  return `
    ${markDefs(id)}
    <g filter="url(#${id}-shadow)">
      <path d="M61 31H183C207 31 222 47 222 70V188C222 211 207 228 183 228H61C37 228 20 211 20 188V70C20 47 37 31 61 31Z" fill="#020817" opacity="0.58"/>
      <rect x="14" y="16" width="212" height="212" rx="50" fill="url(#${id}-board-rim)"/>
      <rect x="19" y="21" width="202" height="202" rx="46" fill="#081B4F"/>
      <rect x="24" y="26" width="192" height="188" rx="40" fill="url(#${id}-board-top)"/>
      <path d="M28 193C66 214 170 214 212 187V196C212 209 200 220 184 220H56C39 220 28 208 28 193Z" fill="#030A28" opacity="0.72"/>
      <rect x="16" y="18" width="208" height="208" rx="48" fill="url(#${id}-shine)"/>
      <path d="M54 26H186C202.6 26 216 39.4 216 56V188C216 204.6 202.6 218 186 218H54C37.4 218 24 204.6 24 188V56C24 39.4 37.4 26 54 26Z" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="2.5"/>
      <g filter="url(#${id}-glow)">
        <path d="M35 190L202 42" stroke="#00F5FF" stroke-width="7" stroke-linecap="round" opacity="0.28"/>
        <path d="M44 77C80 39 142 30 192 58" stroke="#FF2D95" stroke-width="3" stroke-linecap="round" opacity="0.28"/>
      </g>
      <g clip-path="url(#${id}-board-clip)">
        <rect x="${x0}" y="${y0}" width="${boardSize}" height="${boardSize}" rx="18" fill="#0B1B45"/>
        <rect x="${x0 + s * 1.35}" y="${y0 + s * 1.1}" width="${s * 6.55}" height="${s * 6.12}" rx="15" fill="url(#${id}-gold)" opacity="0.9" filter="url(#${id}-gold-glow)"/>
        <rect x="${x0 + s * 1.55}" y="${y0 + s * 1.3}" width="${s * 6.15}" height="${s * 5.72}" rx="13" fill="url(#${id}-art-sky)"/>
        <circle cx="${x0 + s * 5.25}" cy="${y0 + s * 3.35}" r="18" fill="#FFF176" opacity="0.92"/>
        <path d="M${x0 + s * 1.7} ${y0 + s * 6.05}C${x0 + s * 3.2} ${y0 + s * 4.8} ${x0 + s * 5.8} ${y0 + s * 5.5} ${x0 + s * 7.7} ${y0 + s * 3.9}" fill="none" stroke="#0F7A42" stroke-width="6" stroke-linecap="round"/>
        <path d="M${x0 + s * 2.25} ${y0 + s * 5.25}C${x0 + s * 3.05} ${y0 + s * 3.35} ${x0 + s * 4.55} ${y0 + s * 3.25} ${x0 + s * 6.2} ${y0 + s * 1.7}" fill="none" stroke="#5B2107" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M${x0 + s * 2.1} ${y0 + s * 3.45}C${x0 + s * 3.8} ${y0 + s * 2.25} ${x0 + s * 5.6} ${y0 + s * 2.2} ${x0 + s * 6.95} ${y0 + s * 3.15}" fill="none" stroke="#FF8AB3" stroke-width="5" stroke-linecap="round" opacity="0.84"/>
        <circle cx="${x0 + s * 2.75}" cy="${y0 + s * 4.2}" r="11" fill="url(#${id}-petal)"/>
        <circle cx="${x0 + s * 6.1}" cy="${y0 + s * 4.9}" r="10" fill="#FF4ECD"/>
        <circle cx="${x0 + s * 4.5}" cy="${y0 + s * 5.7}" r="10" fill="#FFB703"/>
        <circle cx="${x0 + s * 5.2}" cy="${y0 + s * 6.22}" r="11" fill="#F97316"/>
        <path d="M${x0 + s * 1.9} ${y0 + s * 2.3}C${x0 + s * 2.8} ${y0 + s * 1.8} ${x0 + s * 3.5} ${y0 + s * 2.1} ${x0 + s * 4.4} ${y0 + s * 1.5}" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.58" stroke-linecap="round"/>
        ${boardCells.join('')}
        ${gridLines.join('')}
        ${digits.join('')}
      </g>
      <g filter="url(#${id}-paper-shadow)">
        <path d="M107 91L136 65L161 88L130 117Z" fill="#D8CCB8" opacity="0.38"/>
        <path d="M105 84L136 59L162 84L130 111Z" fill="url(#${id}-cream-tile)" stroke="#FFFFFF" stroke-width="1.6"/>
        <path d="M111 87L136 66L155 84" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
        <path d="M114 158L145 139L164 171L127 188Z" fill="#D8CCB8" opacity="0.38"/>
        <path d="M112 151L145 133L163 164L127 181Z" fill="url(#${id}-cream-tile)" stroke="#FFFFFF" stroke-width="1.6"/>
        <path d="M158 104L188 80L205 111L174 135Z" fill="#D8CCB8" opacity="0.38"/>
        <path d="M157 97L188 74L205 104L173 128Z" fill="url(#${id}-cream-tile)" stroke="#FFFFFF" stroke-width="1.6"/>
      </g>
      <g>
        <path d="M68 178C111 171 151 151 178 112" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.42"/>
        <circle cx="190" cy="49" r="10" fill="#FFFFFF" opacity="0.84"/>
        <circle cx="190" cy="49" r="18" fill="#FFFFFF" opacity="0.16"/>
      </g>
    </g>`;
}

function svgFrame({ width, height, background = 'none', body }) {
  const bg = background === 'none'
    ? ''
    : `<rect width="${width}" height="${height}" fill="${background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Sudoku Reveal logo">${bg}${body}</svg>\n`;
}

function wordmarkDefs(id) {
  return `
    <defs>
      <linearGradient id="${id}-sudoku-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFFFF"/>
        <stop offset="0.45" stop-color="#F8FBFF"/>
        <stop offset="1" stop-color="#7DD3FC"/>
      </linearGradient>
      <linearGradient id="${id}-reveal-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFF8A8"/>
        <stop offset="0.34" stop-color="#FFE45E"/>
        <stop offset="1" stop-color="#FB8C00"/>
      </linearGradient>
      <filter id="${id}-word-shadow" x="-80" y="-70" width="720" height="310" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="12" stdDeviation="6" flood-color="#00134F" flood-opacity="0.78"/>
      </filter>
      <filter id="${id}-cyan-glow" x="-80" y="-70" width="720" height="310" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#00D4FF" flood-opacity="0.9"/>
      </filter>
    </defs>`;
}

function gameText({ x, y, text, size, fill, id, stroke = '#061E72', strokeWidth = 18 }) {
  return `
    <text x="${x}" y="${y}" font-family="${FONT_STACK}" font-size="${size}" font-weight="950" font-style="italic" letter-spacing="-3" fill="none" stroke="#00B7FF" stroke-width="${strokeWidth + 10}" stroke-linejoin="round" opacity="0.9" filter="url(#${id}-cyan-glow)">${text}</text>
    <text x="${x}" y="${y}" font-family="${FONT_STACK}" font-size="${size}" font-weight="950" font-style="italic" letter-spacing="-3" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" filter="url(#${id}-word-shadow)">${text}</text>
    <text x="${x}" y="${y}" font-family="${FONT_STACK}" font-size="${size}" font-weight="950" font-style="italic" letter-spacing="-3" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" opacity="0.92">${text}</text>
    <text x="${x}" y="${y}" font-family="${FONT_STACK}" font-size="${size}" font-weight="950" font-style="italic" letter-spacing="-3" fill="${fill}">${text}</text>
  `;
}

function wordmark({ x, y, mode = 'dark', scale = 1, tagline = true, id = 'word' }) {
  const taglineFill = mode === 'light' ? '#082F67' : '#C7D8FF';
  const revealY = y + 72 * scale;
  const transform = `translate(${x} ${y - 82 * scale}) skewX(-8) translate(${-x} ${-(y - 82 * scale)})`;
  return `
    ${wordmarkDefs(id)}
    <g transform="${transform}">
      ${gameText({ x, y, text: 'Sudoku', size: 78 * scale, fill: `url(#${id}-sudoku-fill)`, id, strokeWidth: 16 * scale })}
      ${gameText({ x: x + 24 * scale, y: revealY, text: 'Reveal', size: 82 * scale, fill: `url(#${id}-reveal-fill)`, id, stroke: '#123B87', strokeWidth: 17 * scale })}
    </g>
    ${tagline ? `<text x="${x + 18 * scale}" y="${y + 152 * scale}" font-family="${FONT_STACK}" font-size="${19 * scale}" font-weight="950" letter-spacing="${2.2 * scale}" fill="${taglineFill}" stroke="${mode === 'light' ? '#FFFFFF' : '#061E72'}" stroke-width="${mode === 'light' ? 2 : 0}" paint-order="stroke">SOLVE THE HIDDEN PICTURE</text>` : ''}
  `;
}

function monoMark({ x = 0, y = 0, scale = 1, ink = '#000', paper = 'none' }) {
  const boardX = x + 16 * scale;
  const boardY = y + 18 * scale;
  const boardSize = 208 * scale;
  const cellSize = boardSize / 9;
  const lines = [];
  for (let index = 0; index <= 9; index += 1) {
    const weight = (index % 3 === 0 ? 5 : 2.2) * scale;
    const pos = boardX + index * cellSize;
    lines.push(`<path d="M${pos} ${boardY}V${boardY + boardSize}" stroke="${ink}" stroke-width="${weight}"/>`);
    lines.push(`<path d="M${boardX} ${pos}H${boardX + boardSize}" stroke="${ink}" stroke-width="${weight}"/>`);
  }
  const fill = paper === 'none' ? 'none' : paper;
  return `
    <g>
      <rect x="${boardX}" y="${boardY}" width="${boardSize}" height="${boardSize}" rx="${40 * scale}" fill="${fill}" stroke="${ink}" stroke-width="${8 * scale}"/>
      ${lines.join('')}
      <path d="M${boardX + 42 * scale} ${boardY + 148 * scale}C${boardX + 88 * scale} ${boardY + 144 * scale} ${boardX + 134 * scale} ${boardY + 122 * scale} ${boardX + 165 * scale} ${boardY + 75 * scale}" fill="none" stroke="${ink}" stroke-width="${7 * scale}" stroke-linecap="round"/>
      <path d="M${boardX + 92 * scale} ${boardY + 70 * scale}L${boardX + 124 * scale} ${boardY + 44 * scale}L${boardX + 150 * scale} ${boardY + 73 * scale}L${boardX + 114 * scale} ${boardY + 98 * scale}Z" fill="${paper === 'none' ? ink : paper}" stroke="${ink}" stroke-width="${4 * scale}"/>
      <circle cx="${boardX + 170 * scale}" cy="${boardY + 32 * scale}" r="${10 * scale}" fill="${ink}"/>
    </g>`;
}

const variants = {
  'sudoku-reveal-mark.svg': svgFrame({
    width: 240,
    height: 240,
    body: logoMark('mark'),
  }),
  'sudoku-reveal-horizontal-dark.svg': svgFrame({
    width: 960,
    height: 320,
    background: '#020617',
    body: `<g transform="translate(44 40)">${logoMark('hDark')}</g>${wordmark({ x: 324, y: 130, mode: 'dark', scale: 1, tagline: false })}`,
  }),
  'sudoku-reveal-horizontal-light.svg': svgFrame({
    width: 960,
    height: 320,
    background: '#FFFFFF',
    body: `<g transform="translate(44 40)">${logoMark('hLight')}</g>${wordmark({ x: 324, y: 130, mode: 'light', scale: 1, tagline: false })}`,
  }),
  'sudoku-reveal-horizontal-transparent.svg': svgFrame({
    width: 960,
    height: 320,
    body: `<g transform="translate(44 40)">${logoMark('hTransparent')}</g>${wordmark({ x: 324, y: 130, mode: 'dark', scale: 1, tagline: false })}`,
  }),
  'sudoku-reveal-horizontal-transparent-darktext.svg': svgFrame({
    width: 960,
    height: 320,
    body: `<g transform="translate(44 40)">${logoMark('hTransparentDarkText')}</g>${wordmark({ x: 324, y: 130, mode: 'light', scale: 1, tagline: false })}`,
  }),
  'sudoku-reveal-home-wordmark.svg': svgFrame({
    width: 960,
    height: 320,
    body: `<g transform="translate(44 40)">${logoMark('homeWordmark')}</g>${wordmark({ x: 324, y: 130, mode: 'light', scale: 1, tagline: false })}`,
  }),
  'sudoku-reveal-home-wordmark-no-lines.svg': svgFrame({
    width: 960,
    height: 320,
    body: `<g transform="translate(44 40)">${logoMark('homeWordmarkNoLines')}</g>${wordmark({ x: 324, y: 130, mode: 'light', scale: 1, tagline: false })}`,
  }),
  'sudoku-reveal-home-wordmark-tight.svg': svgFrame({
    width: 760,
    height: 320,
    body: `<g transform="translate(32 40)">${logoMark('homeWordmarkTight')}</g>${wordmark({ x: 300, y: 130, mode: 'light', scale: 1, tagline: false })}`,
  }),
  'sudoku-reveal-square-dark.svg': svgFrame({
    width: 1024,
    height: 1024,
    background: '#020617',
    body: `<g transform="translate(274 118) scale(1.98)">${logoMark('sDark')}</g>${wordmark({ x: 252, y: 656, mode: 'dark', scale: 1.2, tagline: false })}<text x="512" y="866" text-anchor="middle" font-family="${FONT_STACK}" font-size="34" font-weight="800" letter-spacing="4" fill="#B9C7E5">SOLVE THE HIDDEN PICTURE</text>`,
  }),
  'sudoku-reveal-square-light.svg': svgFrame({
    width: 1024,
    height: 1024,
    background: '#FFFFFF',
    body: `<g transform="translate(274 118) scale(1.98)">${logoMark('sLight')}</g>${wordmark({ x: 252, y: 656, mode: 'light', scale: 1.2, tagline: false })}<text x="512" y="866" text-anchor="middle" font-family="${FONT_STACK}" font-size="34" font-weight="800" letter-spacing="4" fill="#334155">SOLVE THE HIDDEN PICTURE</text>`,
  }),
  'sudoku-reveal-app-icon.svg': svgFrame({
    width: 1024,
    height: 1024,
    background: '#020617',
    body: `<rect x="80" y="80" width="864" height="864" rx="224" fill="#08111F"/><rect x="80" y="80" width="864" height="864" rx="224" fill="url(#appIcon-aura)" opacity="0.12"/><g transform="translate(274 250) scale(1.98)">${logoMark('appIcon')}</g><text x="512" y="804" text-anchor="middle" font-family="${FONT_STACK}" font-size="90" font-weight="950" fill="#FFFFFF">Reveal</text>`,
  }),
  'sudoku-reveal-mono-black.svg': svgFrame({
    width: 960,
    height: 320,
    body: `${monoMark({ x: 64, y: 48, scale: 0.82, ink: '#000' })}<text x="300" y="138" font-family="${FONT_STACK}" font-size="72" font-weight="950" fill="#000">Sudoku</text><text x="300" y="210" font-family="${FONT_STACK}" font-size="72" font-weight="950" fill="#000">Reveal</text>`,
  }),
  'sudoku-reveal-mono-white.svg': svgFrame({
    width: 960,
    height: 320,
    background: '#000000',
    body: `${monoMark({ x: 64, y: 48, scale: 0.82, ink: '#FFF' })}<text x="300" y="138" font-family="${FONT_STACK}" font-size="72" font-weight="950" fill="#FFF">Sudoku</text><text x="300" y="210" font-family="${FONT_STACK}" font-size="72" font-weight="950" fill="#FFF">Reveal</text>`,
  }),
};

for (const [filename, svg] of Object.entries(variants)) {
  writeFileSync(join(OUT_DIR.pathname, filename), svg);
}

console.log(`Generated ${Object.keys(variants).length} logo SVG files in assets/logo`);
