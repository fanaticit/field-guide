/**
 * Renders a Build Planner build to a shareable PNG with the Canvas 2D API.
 * Pure drawing code: the caller collects the data (see ExportBuildImageButton).
 */

export interface ExportImageRef {
  src?: string | null;
  label?: string;
}

export interface ExportInk {
  name: string;
  /** Path of the ink artwork, or null when the ink only has a line icon in the app */
  icon?: string | null;
  /** Solid colour used when there is no artwork */
  color: string;
}

export interface ExportSkill {
  name: string;
  level: number;
  maxLevel: number;
  color: string;
}

export interface ExportInkSet {
  ink: ExportInk;
  count: number;
  bonuses: { label: string; description: string; achieved: boolean }[];
}

export interface ExportBuildData {
  title: string;
  description?: string | null;
  buildRole: 'main' | 'support';
  adventurer?: { name: string; image?: string | null } | null;
  tacticalRole?: { name: string; icon?: string | null } | null;
  weaponType?: { name: string; icon?: string | null } | null;
  buddy?: { name: string; image?: string | null; corePassive?: string | null } | null;
  weapon?: { name: string; image?: string | null; detail?: string | null } | null;
  armour: { slot: string; name: string | null; icon?: string | null }[];
  coreVisage?: { name: string; icon?: string | null; points: number; coreEffect?: string | null; ink?: ExportInk | null } | null;
  supportVisages: ({ name: string; points: number; ink: ExportInk | null } | null)[];
  inkSets: ExportInkSet[];
  totalVisagePoints: number;
  skills: ExportSkill[];
  buildUrl?: string | null;
  generatedOn: Date;
}

// ── Palette ──────────────────────────────────────────────
const C = {
  bgTop: '#161a28',
  bgBottom: '#0b0d14',
  panel: 'rgba(255,255,255,0.035)',
  panelBorder: 'rgba(255,255,255,0.08)',
  gold: '#FFD700',
  goldSoft: '#d9b44a',
  text: '#f1f5f9',
  textDim: '#94a3b8',
  textFaint: '#64748b',
  orange: '#fb923c',
  rarity5: '#f59e0b',
};

const W = 1200;
const PAD = 44;
const SCALE = 2;
const DISPLAY = "'Cinzel', serif";
const SANS = "'Inter', system-ui, sans-serif";

// ── Helpers ──────────────────────────────────────────────
function loadImage(src?: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    try {
      const url = new URL(src, window.location.href);
      if (url.origin !== window.location.origin) img.crossOrigin = 'anonymous';
    } catch { /* relative path */ }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, opts: { fill?: string; stroke?: string; r?: number } = {}) {
  roundRect(ctx, x, y, w, h, opts.r ?? 12);
  ctx.fillStyle = opts.fill ?? C.panel;
  ctx.fill();
  ctx.strokeStyle = opts.stroke ?? C.panelBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Draws an image inside a box, keeping its aspect ratio (contain) or filling the box (cover) */
function drawImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number, mode: 'contain' | 'cover' = 'contain', radius = 0) {
  if (!img) return false;
  const ir = img.naturalWidth / img.naturalHeight;
  const br = w / h;
  let dw = w, dh = h;
  if ((mode === 'contain') === (ir > br)) dh = w / ir; else dw = h * ir;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  if (radius > 0 || mode === 'cover') {
    roundRect(ctx, x, y, w, h, radius);
    ctx.clip();
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) { lines.push(''); continue; }
    let line = words[0];
    for (const word of words.slice(1)) {
      const test = line + ' ' + word;
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

function font(weight: number, size: number, family = SANS) {
  return `${weight} ${size}px ${family}`;
}

function sectionHeading(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number) {
  ctx.font = font(700, 15, DISPLAY);
  ctx.fillStyle = C.gold;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('❖', x, y + 14);
  ctx.fillStyle = C.text;
  ctx.fillText(text.toUpperCase(), x + 22, y + 14);
  const tw = ctx.measureText(text.toUpperCase()).width;
  ctx.strokeStyle = 'rgba(255,215,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(x + 22 + tw + 12, y + 9);
  ctx.lineTo(x + width, y + 9);
  ctx.stroke();
  return y + 30;
}

function emptyTile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 10);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.stroke();
  ctx.restore();
  ctx.font = font(500, 16);
  ctx.fillStyle = C.textFaint;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('—', x + w / 2, y + h / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawInk(ctx: CanvasRenderingContext2D, ink: ExportInk | null | undefined, img: HTMLImageElement | null, cx: number, cy: number, size: number) {
  if (!ink) return;
  if (img) {
    // Ink artwork has built-in padding, so it is drawn a little larger
    const s = size * 1.25;
    drawImage(ctx, img, cx - s / 2, cy - s / 2, s, s);
    return;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.36, 0, Math.PI * 2);
  ctx.fillStyle = ink.color;
  ctx.shadowColor = ink.color;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function withAlpha(color: string, a: number) {
  const m = color.match(/rgba?\(([^,]+),([^,]+),([^,)]+)/);
  return m ? `rgba(${m[1]},${m[2]},${m[3]},${a})` : color;
}

function solid(rgba: string) {
  return rgba.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgb($1,$2,$3)');
}
export { solid as solidInkColor };

// ── Renderer ─────────────────────────────────────────────
export async function renderBuildImage(data: ExportBuildData): Promise<HTMLCanvasElement> {
  // Make sure the site fonts are ready, or the canvas falls back to defaults
  try {
    await Promise.all([
      document.fonts.load(font(700, 40, DISPLAY)),
      document.fonts.load(font(400, 16)),
      document.fonts.load(font(600, 16)),
      document.fonts.load(font(700, 16)),
    ]);
  } catch { /* ignore */ }

  const [
    advImg, roleImg, wtImg, buddyImg, weaponImg, coreImg, coreInkImg, siteIcon, ...rest
  ] = await Promise.all([
    loadImage(data.adventurer?.image),
    loadImage(data.tacticalRole?.icon),
    loadImage(data.weaponType?.icon),
    loadImage(data.buddy?.image),
    loadImage(data.weapon?.image),
    loadImage(data.coreVisage?.icon),
    loadImage(data.coreVisage?.ink?.icon),
    loadImage('/images/ui/field-guide-icon-removebg-preview.png'),
    ...data.armour.map((a) => loadImage(a.icon)),
    ...data.supportVisages.map((v) => loadImage(v?.ink?.icon)),
    ...data.inkSets.map((s) => loadImage(s.ink.icon)),
  ]);
  const armourImgs = rest.slice(0, data.armour.length);
  const inkImgs = rest.slice(data.armour.length, data.armour.length + data.supportVisages.length);
  const inkSetImgs = rest.slice(data.armour.length + data.supportVisages.length);

  // Draw onto a tall scratch canvas, then crop to the height that was used
  const scratch = document.createElement('canvas');
  scratch.width = W * SCALE;
  scratch.height = 4000 * SCALE;
  const ctx = scratch.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'alphabetic';

  // ── Header ────────────────────────────────────────────
  const tile = 84;
  const tileGap = 14;
  const loadout = [
    { label: 'Adventurer', img: advImg, name: data.adventurer?.name, mode: 'cover' as const },
    { label: 'Class', img: roleImg, name: data.tacticalRole?.name, mode: 'contain' as const },
    { label: 'Weapon', img: wtImg, name: data.weaponType?.name, mode: 'contain' as const },
    { label: 'Buddy', img: buddyImg, name: data.buddy?.name, mode: 'cover' as const },
  ];
  const stripW = loadout.length * tile + (loadout.length - 1) * tileGap;
  const stripX = W - PAD - stripW;
  const headerTop = PAD;

  loadout.forEach((t, i) => {
    const x = stripX + i * (tile + tileGap);
    const y = headerTop;
    if (t.img) {
      panel(ctx, x, y, tile, tile, { r: 14, fill: 'rgba(0,0,0,0.35)', stroke: 'rgba(255,215,0,0.35)' });
      if (t.mode === 'cover') drawImage(ctx, t.img, x + 1, y + 1, tile - 2, tile - 2, 'cover', 13);
      else drawImage(ctx, t.img, x + 14, y + 14, tile - 28, tile - 28);
    } else {
      emptyTile(ctx, x, y, tile, tile);
    }
    ctx.font = font(700, 10);
    ctx.fillStyle = C.textFaint;
    ctx.textAlign = 'center';
    ctx.fillText(t.label.toUpperCase(), x + tile / 2, y + tile + 16);
    ctx.font = font(600, 11);
    ctx.fillStyle = C.text;
    ctx.fillText(ellipsize(ctx, t.name || '—', tile + tileGap), x + tile / 2, y + tile + 32);
    ctx.textAlign = 'left';
  });

  // Title (wraps to two lines at most)
  const titleMaxW = stripX - PAD - 30;
  ctx.font = font(700, 40, DISPLAY);
  let titleLines = wrapText(ctx, data.title.trim() || 'Untitled Build', titleMaxW);
  if (titleLines.length > 2) titleLines = [titleLines[0], ellipsize(ctx, titleLines.slice(1).join(' '), titleMaxW)];
  ctx.font = font(700, 12);
  const roleLabel = data.buildRole === 'support' ? 'NON-MAIN BUILD' : 'MAIN BUILD';
  const roleColor = data.buildRole === 'support' ? C.orange : '#4ade80';
  const pillW = ctx.measureText(roleLabel).width + 22;
  roundRect(ctx, PAD, headerTop + 4, pillW, 24, 6);
  ctx.fillStyle = data.buildRole === 'support' ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)';
  ctx.fill();
  ctx.strokeStyle = data.buildRole === 'support' ? 'rgba(249,115,22,0.4)' : 'rgba(34,197,94,0.4)';
  ctx.stroke();
  ctx.fillStyle = roleColor;
  ctx.fillText(roleLabel, PAD + 11, headerTop + 20.5);
  ctx.font = font(600, 12);
  ctx.fillStyle = C.textDim;
  ctx.fillText('MONSTER HUNTER OUTLANDERS · BUILD PLANNER', PAD + pillW + 12, headerTop + 20.5);

  let ty = headerTop + 74;
  ctx.font = font(700, 40, DISPLAY);
  const grad = ctx.createLinearGradient(PAD, 0, PAD + titleMaxW, 0);
  grad.addColorStop(0, '#fff3b0');
  grad.addColorStop(0.5, C.gold);
  grad.addColorStop(1, C.goldSoft);
  ctx.fillStyle = grad;
  titleLines.forEach((l) => { ctx.fillText(l, PAD, ty); ty += 46; });
  let headerContentBottom = ty - 46 + 14;

  const desc = data.description?.trim();
  if (desc) {
    ctx.font = font(400, 15);
    let descLines = wrapText(ctx, desc, titleMaxW);
    if (descLines.length > 3) descLines = [...descLines.slice(0, 2), ellipsize(ctx, descLines.slice(2).join(' '), titleMaxW)];
    ctx.fillStyle = '#cbd5e1';
    let dy = ty - 46 + 32;
    descLines.forEach((l) => { ctx.fillText(l, PAD, dy); dy += 22; });
    headerContentBottom = dy - 22 + 8;
  }

  const headerBottom = Math.max(headerContentBottom, headerTop + tile + 40) + 24;
  ctx.strokeStyle = 'rgba(255,215,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(PAD, headerBottom);
  ctx.lineTo(W - PAD, headerBottom);
  ctx.stroke();

  // ── Columns ───────────────────────────────────────────
  const colGap = 32;
  const leftW = 500;
  const leftX = PAD;
  const rightX = PAD + leftW + colGap;
  const rightW = W - PAD - rightX;
  const colTop = headerBottom + 28;

  // Left: Equipment
  let ly = sectionHeading(ctx, 'Equipment', leftX, colTop, leftW);
  const rowH = 64;
  const equipRows = [
    { slot: data.weapon?.detail ? `Weapon · ${data.weapon.detail}` : 'Weapon', name: data.weapon?.name ?? null, img: weaponImg, highlight: true },
    ...data.armour.map((a, i) => ({ slot: a.slot, name: a.name, img: armourImgs[i], highlight: false })),
  ];
  equipRows.forEach((r) => {
    panel(ctx, leftX, ly, leftW, rowH - 8, {
      r: 10,
      fill: r.highlight ? 'rgba(255,215,0,0.06)' : C.panel,
      stroke: r.highlight ? 'rgba(255,215,0,0.3)' : C.panelBorder,
    });
    const iconBox = 44;
    const ix = leftX + 8;
    const iy = ly + (rowH - 8 - iconBox) / 2;
    roundRect(ctx, ix, iy, iconBox, iconBox, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    if (r.name) drawImage(ctx, r.img, ix + 3, iy + 3, iconBox - 6, iconBox - 6);
    ctx.font = font(700, 10);
    ctx.fillStyle = r.highlight ? C.goldSoft : C.textFaint;
    ctx.fillText(r.slot.toUpperCase(), ix + iconBox + 14, ly + 22);
    ctx.font = r.name ? font(700, 18) : font(500, 16);
    ctx.fillStyle = r.name ? C.text : C.textFaint;
    ctx.fillText(ellipsize(ctx, r.name ?? 'Empty', leftW - iconBox - 40), ix + iconBox + 14, ly + 44);
    ly += rowH;
  });

  // Left: Visage cards
  ly += 14;
  ly = sectionHeading(ctx, `Visage Cards · ${data.totalVisagePoints}/12 pts`, leftX, ly, leftW);
  const coreH = 112;
  panel(ctx, leftX, ly, leftW, coreH, { r: 12, fill: 'rgba(245,158,11,0.07)', stroke: 'rgba(245,158,11,0.4)' });
  const coreIcon = 88;
  if (data.coreVisage) {
    // Lighter tile with an amber glow so dark monster icons stay readable
    const cx = leftX + 12 + coreIcon / 2;
    const cy = ly + 12 + coreIcon / 2;
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, coreIcon * 0.7);
    glow.addColorStop(0, 'rgba(255,214,140,0.35)');
    glow.addColorStop(1, 'rgba(255,255,255,0.06)');
    roundRect(ctx, leftX + 12, ly + 12, coreIcon, coreIcon, 10);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,158,11,0.45)';
    ctx.stroke();
    drawImage(ctx, coreImg, leftX + 16, ly + 16, coreIcon - 8, coreIcon - 8);
    ctx.font = font(700, 10);
    ctx.fillStyle = C.rarity5;
    ctx.fillText('CORE VISAGE', leftX + coreIcon + 28, ly + 34);
    ctx.font = font(700, 22, DISPLAY);
    ctx.fillStyle = C.text;
    ctx.fillText(ellipsize(ctx, data.coreVisage.name, leftW - coreIcon - 110), leftX + coreIcon + 28, ly + 64);
    ctx.font = font(600, 13);
    ctx.fillStyle = C.textDim;
    const inkName = data.coreVisage.ink?.name;
    ctx.fillText(`${data.coreVisage.points} pts${inkName ? ' · ' + inkName : ''}`, leftX + coreIcon + 28, ly + 88);
    drawInk(ctx, data.coreVisage.ink, coreInkImg, leftX + leftW - 44, ly + coreH / 2, 52);
  } else {
    emptyTile(ctx, leftX + 12, ly + 12, coreIcon, coreIcon);
    ctx.font = font(500, 16);
    ctx.fillStyle = C.textFaint;
    ctx.fillText('No core visage selected', leftX + coreIcon + 28, ly + coreH / 2 + 6);
  }
  ly += coreH + 12;

  const supCount = data.supportVisages.length;
  const supGap = 10;
  const supW = (leftW - supGap * (supCount - 1)) / supCount;
  const supH = 70;
  data.supportVisages.forEach((v, i) => {
    const x = leftX + i * (supW + supGap);
    if (!v) { emptyTile(ctx, x, ly, supW, supH); return; }
    panel(ctx, x, ly, supW, supH, { r: 10 });
    drawInk(ctx, v.ink, inkImgs[i], x + supW / 2, ly + 27, 32);
    ctx.font = font(700, 9);
    ctx.fillStyle = C.textFaint;
    ctx.fillText(`S${i + 2}`, x + 8, ly + 15);
    ctx.textAlign = 'right';
    ctx.fillText(`${v.points}PT`, x + supW - 8, ly + 15);
    ctx.font = font(600, 11);
    ctx.fillStyle = C.textDim;
    ctx.textAlign = 'center';
    ctx.fillText(ellipsize(ctx, v.ink?.name.replace(/^Ink of /i, '') ?? '—', supW - 12), x + supW / 2, ly + 60);
    ctx.textAlign = 'left';
  });
  ly += supH;

  // Right: Core effect, buddy passive, skills
  let ry = sectionHeading(ctx, 'Skills & Effects', rightX, colTop, rightW);

  const effectBox = (label: string, body: string, color: string, fill: string, stroke: string) => {
    ctx.font = font(400, 14);
    const lines = wrapText(ctx, body, rightW - 28);
    const h = 40 + lines.length * 20 + 6;
    panel(ctx, rightX, ry, rightW, h, { r: 10, fill, stroke });
    ctx.font = font(700, 11);
    ctx.fillStyle = color;
    ctx.fillText(ellipsize(ctx, label.toUpperCase(), rightW - 28), rightX + 14, ry + 24);
    ctx.font = font(400, 14);
    ctx.fillStyle = '#e2e8f0';
    lines.forEach((l, i) => ctx.fillText(l, rightX + 14, ry + 48 + i * 20));
    ry += h + 12;
  };

  if (data.buddy) {
    effectBox(`Buddy Core Passive — ${data.buddy.name}`, data.buddy.corePassive || 'No core passive listed.', C.orange, 'rgba(249,115,22,0.08)', 'rgba(249,115,22,0.35)');
  }

  if (data.skills.length === 0) {
    ctx.font = font(500, 14);
    ctx.fillStyle = C.textFaint;
    ctx.fillText('No armour skills active.', rightX + 4, ry + 20);
    ry += 32;
  } else {
    const skRowH = 38;
    data.skills.forEach((s) => {
      panel(ctx, rightX, ry, rightW, skRowH - 6, { r: 8 });
      ctx.fillStyle = s.color;
      roundRect(ctx, rightX, ry, 4, skRowH - 6, 2);
      ctx.fill();
      ctx.font = font(700, 14);
      ctx.fillStyle = C.text;
      ctx.fillText(ellipsize(ctx, s.name, rightW - 120), rightX + 16, ry + 21);
      ctx.font = font(800, 14, DISPLAY);
      ctx.fillStyle = s.color;
      ctx.textAlign = 'right';
      ctx.fillText(`Lv. ${s.level}${s.maxLevel > 1 ? '/' + s.maxLevel : ''}`, rightX + rightW - 14, ry + 21);
      ctx.textAlign = 'left';
      ry += skRowH;
    });
  }

  // Visage core effect, with the ink set bonuses under it
  if (data.coreVisage || data.inkSets.length > 0) {
    ry += 14;
    ry = sectionHeading(ctx, 'Visage Effects', rightX, ry, rightW);
  }
  if (data.coreVisage) {
    effectBox(`Visage Core Effect — ${data.coreVisage.name}`, data.coreVisage.coreEffect || 'No core effect listed.', C.rarity5, 'rgba(245,158,11,0.07)', 'rgba(245,158,11,0.4)');
  }
  data.inkSets.forEach((set, si) => {
    const color = set.ink.color;
    ctx.font = font(700, 10);
    const tagW = Math.max(40, ...set.bonuses.map((b) => ctx.measureText(b.label).width + 14));
    const textX = rightX + 14 + tagW + 10;
    const textW = rightX + rightW - 34 - textX;
    ctx.font = font(500, 13);
    const rows = set.bonuses.map((b) => ({ ...b, lines: wrapText(ctx, b.description, textW) }));
    const bodyH = rows.length ? rows.reduce((h, r) => h + r.lines.length * 18 + 8, 0) : 26;
    const h = 42 + bodyH + 4;
    panel(ctx, rightX, ry, rightW, h, { r: 10, fill: withAlpha(color, 0.07), stroke: withAlpha(color, 0.35) });

    drawInk(ctx, set.ink, inkSetImgs[si], rightX + 24, ry + 21, 24);
    ctx.font = font(700, 14);
    ctx.fillStyle = C.text;
    ctx.fillText(set.ink.name, rightX + 44, ry + 26);

    // Card count pips
    for (let i = 0; i < 4; i++) {
      const px = rightX + rightW - 14 - (4 - i) * 13;
      roundRect(ctx, px, ry + 14, 9, 14, 2);
      ctx.fillStyle = i < set.count ? color : 'rgba(255,255,255,0.1)';
      ctx.fill();
    }

    let by = ry + 42;
    if (rows.length === 0) {
      ctx.font = font(500, 12);
      ctx.fillStyle = C.textFaint;
      ctx.fillText('Bonus data not yet available.', rightX + 14, by + 14);
    }
    rows.forEach((r) => {
      roundRect(ctx, rightX + 14, by, tagW, 18, 4);
      ctx.fillStyle = r.achieved ? withAlpha(color, 0.22) : 'rgba(255,255,255,0.04)';
      ctx.fill();
      ctx.font = font(800, 10);
      ctx.fillStyle = r.achieved ? C.text : C.textFaint;
      ctx.textAlign = 'center';
      ctx.fillText(r.label, rightX + 14 + tagW / 2, by + 13);
      ctx.textAlign = 'left';
      ctx.font = font(r.achieved ? 600 : 500, 13);
      ctx.fillStyle = r.achieved ? '#e2e8f0' : '#4b5563';
      r.lines.forEach((l, i) => ctx.fillText(l, textX, by + 13 + i * 18));
      if (r.achieved) {
        ctx.font = font(800, 13);
        ctx.fillStyle = '#4ade80';
        ctx.textAlign = 'right';
        ctx.fillText('✓', rightX + rightW - 14, by + 13);
        ctx.textAlign = 'left';
      }
      by += r.lines.length * 18 + 8;
    });
    ry += h + 10;
  });

  // ── Footer ────────────────────────────────────────────
  const footerTop = Math.max(ly, ry) + 32;
  ctx.strokeStyle = 'rgba(255,215,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(PAD, footerTop);
  ctx.lineTo(W - PAD, footerTop);
  ctx.stroke();

  const fy = footerTop + 22;
  const iconSize = 44;
  drawImage(ctx, siteIcon, PAD, fy, iconSize, iconSize);
  ctx.font = font(700, 24, DISPLAY);
  ctx.fillStyle = C.gold;
  ctx.fillText('MHFG.Quest', PAD + iconSize + 14, fy + 26);
  ctx.font = font(500, 12);
  ctx.fillStyle = C.textDim;
  ctx.fillText('Monster Hunter Field Guide', PAD + iconSize + 14, fy + 43);

  const dateStr = data.generatedOn.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.textAlign = 'right';
  ctx.font = font(500, 13);
  ctx.fillStyle = C.textDim;
  ctx.fillText(`Generated on MHFG.Quest · ${dateStr}`, W - PAD, fy + 24);
  if (data.buildUrl) {
    ctx.font = font(600, 12);
    ctx.fillStyle = C.goldSoft;
    ctx.fillText(data.buildUrl, W - PAD, fy + 43);
  }
  ctx.textAlign = 'left';

  const H = fy + iconSize + PAD - 6;

  // ── Crop and paint the background behind everything ──
  const out = document.createElement('canvas');
  out.width = W * SCALE;
  out.height = H * SCALE;
  const o = out.getContext('2d')!;
  o.drawImage(scratch, 0, 0);
  o.scale(SCALE, SCALE);
  o.globalCompositeOperation = 'destination-over';
  // Gold glow at the top
  const glow = o.createRadialGradient(W * 0.25, 0, 0, W * 0.25, 0, 700);
  glow.addColorStop(0, 'rgba(255,215,0,0.10)');
  glow.addColorStop(1, 'rgba(255,215,0,0)');
  o.fillStyle = glow;
  o.fillRect(0, 0, W, H);
  const bg = o.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, C.bgTop);
  bg.addColorStop(1, C.bgBottom);
  o.fillStyle = bg;
  o.fillRect(0, 0, W, H);
  // Thin gold frame
  o.globalCompositeOperation = 'source-over';
  o.strokeStyle = 'rgba(255,215,0,0.35)';
  o.lineWidth = 2;
  o.strokeRect(1, 1, W - 2, H - 2);

  return out;
}
