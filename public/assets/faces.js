/* Behaviour + work-ethic faces.
   CP.face(kind, level, px) -> HTML. Uses /assets/art/face-b3.png (behaviour) / face-e3.png (effort) if you add them,
   otherwise draws the built-in graffiti-style SVG face. kind: 'behaviour' | 'effort', level 1-5. */
(function () {
  const INK = '#1b1b1b';
  const COL = { 1: '#ff6b6b', 2: '#ffa94d', 3: '#bfc9d4', 4: '#9be564', 5: '#ffd23f' };
  const LABEL = {
    behaviour: { 5: 'Outstanding', 4: 'Great', 3: 'Okay', 2: 'Needs reminders', 1: 'Tough day' },
    effort: { 5: 'Superstar effort', 4: 'Working hard', 3: 'Getting there', 2: 'Distracted', 1: 'Not trying' },
  };
  const LINE = { behaviour: '#ff5a1f', effort: '#2f7cf6' };
  const st = (w) => `stroke="${INK}" stroke-width="${w || 5}" stroke-linecap="round" stroke-linejoin="round"`;
  const star4 = (x, y, r) => `<path d="M${x} ${y - r} Q${x + 2} ${y - 2} ${x + r} ${y} Q${x + 2} ${y + 2} ${x} ${y + r} Q${x - 2} ${y + 2} ${x - r} ${y} Q${x - 2} ${y - 2} ${x} ${y - r}Z" fill="#fff" ${st(2.5)}/>`;
  const star5 = (x, y, r, f) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ' ' + (y + rr * Math.sin(a)).toFixed(1); } return `<path d="${d}Z" fill="${f}" ${st(3)}/>`; };
  const dotEyes = `<ellipse cx="44" cy="58" rx="6" ry="8" fill="${INK}"/><ellipse cx="76" cy="58" rx="6" ry="8" fill="${INK}"/><circle cx="46" cy="55" r="2.2" fill="#fff"/><circle cx="78" cy="55" r="2.2" fill="#fff"/>`;
  const arcEyes = `<path d="M35 60 Q44 46 53 60M67 60 Q76 46 85 60" fill="none" ${st(5.5)}/>`;
  const grin = `<path d="M34 72 Q60 108 86 72 Z" fill="${INK}" ${st(5)}/><path d="M39 74 Q60 82 81 74 L79 79 Q60 87 41 79Z" fill="#fff"/><ellipse cx="60" cy="93" rx="12" ry="6" fill="#ff7a8a"/>`;
  const smile = `<path d="M38 74 Q60 96 82 74" fill="none" ${st(6)}/>`;
  const flat = `<path d="M43 82 L77 82" fill="none" ${st(6)}/>`;
  const frown = (k) => `<path d="M${40 - k} ${86 + k} Q60 ${74 - k * 2} ${80 + k} ${86 + k}" fill="none" ${st(6)}/>`;
  const blush = '<ellipse cx="33" cy="74" rx="8" ry="5" fill="#ff8fa3" opacity=".55"/><ellipse cx="87" cy="74" rx="8" ry="5" fill="#ff8fa3" opacity=".55"/>';
  const drop = (x, y) => `<path d="M${x} ${y} Q${x + 9} ${y + 13} ${x} ${y + 17} Q${x - 9} ${y + 13} ${x} ${y}Z" fill="#6ec6ff" ${st(3)}/>`;
  const shades = `<path d="M26 46 H56 V58 Q56 70 41 70 Q26 70 26 58Z M64 46 H94 V58 Q94 70 79 70 Q64 70 64 58Z" fill="${INK}" ${st(4)}/><path d="M56 50 H64" ${st(4)}/><path d="M31 51 L38 51 M69 51 L76 51" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
  const crown = `<path d="M30 26 L33 4 L48 17 L60 -2 L72 17 L87 4 L90 26Z" fill="#ffc400" ${st(4.5)}/><rect x="30" y="24" width="60" height="9" rx="3" fill="#ffc400" ${st(4.5)}/><circle cx="33" cy="6" r="4" fill="#ff3b30" ${st(2.5)}/><circle cx="60" cy="0" r="4.5" fill="#2f7cf6" ${st(2.5)}/><circle cx="87" cy="6" r="4" fill="#ff3b30" ${st(2.5)}/>`;
  const flame = `<path d="M28 26 C20 12 30 8 30 -4 C42 4 44 12 42 20 C48 10 52 8 54 -6 C64 6 66 16 62 24 C70 14 74 10 74 0 C88 10 94 22 90 30 Z" fill="#ff7a1a" ${st(4.5)}/><path d="M46 28 C42 18 50 14 50 6 C58 12 60 20 56 28Z M66 28 C64 22 70 18 70 12 C76 18 78 24 74 28Z" fill="#ffd23f"/>`;
  const band = `<path d="M14 42 Q60 20 106 42 L104 56 Q60 34 16 56Z" fill="#ff3b30" ${st(4.5)}/><path d="M104 44 L116 38 M104 52 L117 54" fill="none" ${st(4)}/>`;
  const pencil = `<g transform="rotate(35 100 42)"><rect x="88" y="34" width="32" height="10" fill="#ffc400" ${st(3.5)}/><rect x="112" y="34" width="8" height="10" fill="#ff8fa3" ${st(3.5)}/><path d="M88 34 L78 39 L88 44Z" fill="#f5dcb4" ${st(3.5)}/></g>`;
  const sideEye = (x) => `<circle cx="${x}" cy="58" r="10" fill="#fff" ${st(4)}/><circle cx="${x + 4}" cy="54" r="4.5" fill="${INK}"/>`;
  const zs = `<text x="84" y="26" font-family="Poppins,Arial Black,sans-serif" font-weight="900" font-size="22" fill="#fff" stroke="${INK}" stroke-width="4" paint-order="stroke">Z</text><text x="100" y="12" font-family="Poppins,Arial Black,sans-serif" font-weight="900" font-size="15" fill="#fff" stroke="${INK}" stroke-width="3.5" paint-order="stroke">z</text>`;
  const PARTS = {
    behaviour: {
      5: () => shades + grin + crown + star4(100, 52, 8) + star4(18, 30, 6),
      4: () => arcEyes + smile + blush + star4(98, 32, 8) + star4(20, 34, 5),
      3: () => dotEyes + flat,
      2: () => dotEyes + `<path d="M33 50 L54 41 M87 50 L66 41" fill="none" ${st(6)}/>` + frown(0) + drop(96, 30),
      1: () => dotEyes + `<path d="M32 40 L54 50 M88 40 L66 50" fill="none" ${st(7)}/>` + frown(2) + `<circle cx="12" cy="44" r="7" fill="#fff" ${st(3)}/><circle cx="5" cy="34" r="4.5" fill="#fff" ${st(3)}/><circle cx="108" cy="44" r="7" fill="#fff" ${st(3)}/><circle cx="115" cy="34" r="4.5" fill="#fff" ${st(3)}/>`,
    },
    effort: {
      5: () => flame + star5(44, 58, 13, '#fff3a0') + star5(76, 58, 13, '#fff3a0') + grin,
      4: () => dotEyes + `<path d="M34 48 L54 53 M86 48 L66 53" fill="none" ${st(5.5)}/>` + smile + band + drop(98, 56),
      3: () => dotEyes + `<path d="M44 80 Q62 88 80 76" fill="none" ${st(6)}/>` + pencil,
      2: () => sideEye(44) + sideEye(76) + `<path d="M38 84 Q47 74 56 84 T76 84" fill="none" ${st(5.5)}/>` + `<circle cx="98" cy="26" r="6" fill="#fff" ${st(3)}/><circle cx="108" cy="14" r="3.5" fill="#fff" ${st(2.5)}/>`,
      1: () => `<path d="M35 58 Q44 68 53 58M67 58 Q76 68 85 58" fill="none" ${st(5.5)}/><ellipse cx="60" cy="86" rx="8" ry="6" fill="${INK}"/><path d="M64 92 Q70 100 64 106 Q58 100 64 92Z" fill="#6ec6ff" ${st(2.5)}/>` + zs,
    },
  };
  const SPECK = [[10, 90, 3], [112, 82, 2.5], [18, 108, 2], [102, 104, 3.2], [6, 66, 2], [114, 62, 2]];
  function svg(kind, level, px) {
    level = Math.max(1, Math.min(5, Math.round(level) || 3));
    const c = COL[level], part = (PARTS[kind] || PARTS.behaviour)[level]();
    const sp = SPECK.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${INK}" stroke-width="1.5"/>`).join('');
    return `<svg viewBox="-6 -10 132 140" width="${px}" height="${px}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${LABEL[kind][level]}"><g transform="rotate(-6 60 60)">
      <circle cx="66" cy="68" r="46" fill="${INK}"/>${sp}
      <circle cx="60" cy="60" r="46" fill="${c}" ${st(6)}/>
      <path d="M26 40 Q34 24 52 18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".6"/>
      ${part}</g></svg>`;
  }
  function face(kind, level, px) {
    px = px || 64; level = Math.max(1, Math.min(5, Math.round(level) || 3));
    const k = kind === 'effort' ? 'e' : 'b', fb = svg(kind, level, px);
    return `<span class="fc" data-fk="${kind}" data-fl="${level}" style="display:inline-grid;width:${px}px;height:${px}px;vertical-align:middle"><img src="/assets/art/face-${k}${level}.png" alt="${LABEL[kind][level]}" width="${px}" height="${px}" style="width:${px}px;height:${px}px;object-fit:contain" onerror="this.parentNode.innerHTML=CP.faceSvg('${kind}',${level},${px})"></span>`.replace(/\n/g, '') || fb;
  }
  CP.face = face; CP.faceSvg = svg; CP.FACE = { COL, LABEL, LINE };
})();
