// ─────────────────────────────────────────────────────────────
// Renders the armour page's example build to a shareable portrait PNG,
// always exactly 1080 × 1920 (9:16) — the size YouTube Shorts and
// TikTok use — laid out like the build panel on the page. Same look and
// MHFG.Quest logo footer as the Build Planner export, so shared clips
// bring hunters back to the site.
// Pure drawing code: the caller collects the data (see ExportArmourImage).
// ─────────────────────────────────────────────────────────────
import {
  C,
  DISPLAY,
  SCALE,
  SITE_ICON,
  drawImage,
  ellipsize,
  finishImage,
  font,
  loadImage,
  loadSiteFonts,
  panel,
  roundRect,
  wrapText,
} from '../../lib/exportBuildImage';

export interface ArmourImagePiece {
  slot: string;
  setName: string | null;
  monsterName?: string | null;
  icon?: string | null;
  /** Rarity the piece is shown at */
  rarity?: number | null;
  /** Starts above the hunter's rarity (can't be crafted yet) */
  locked?: boolean;
  startRarity?: number | null;
}

export interface ArmourImageData {
  title: string;
  rarity: number;
  defence: number;
  pieces: ArmourImagePiece[];
  skills: { name: string; level: number; max: number; wasted: number; color: string; wanted: boolean }[];
  wanted: { name: string; have: number; target: number; color: string }[];
  setBonuses: { setName: string; count: number; needed: number; active: boolean; bonus: string }[];
  url?: string | null;
  generatedOn: Date;
}

/** Drawn at 540 × 960 and scaled ×2 (SCALE) → a 1080 × 1920 PNG */
const W = 540;
const H = 960;
const PAD = 26;
const LOCK_ICON = '/img/ui/lock.png';

/** Text colours of the rarity badges on the site (R1 – R16) */
const RARITY_HEX: Record<number, string> = {
  1: '#cbd5e1', 2: '#6ee7b7', 3: '#93c5fd', 4: '#d8b4fe', 5: '#fcd34d', 6: '#fca5a5', 7: '#67e8f9', 8: '#a5b4fc',
  9: '#fdba74', 10: '#fda4af', 11: '#5eead4', 12: '#f0abfc', 13: '#7dd3fc', 14: '#bef264', 15: '#f9a8d4', 16: '#FFD700',
};
const rarityHex = (r: number) => RARITY_HEX[r] ?? C.gold;

function hexAlpha(hex: string, a: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** A small rounded pill with centred text */
function pill(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, color: string, size = 9) {
  ctx.font = font(800, size);
  const w = ctx.measureText(text).width + 12;
  const h = size + 7;
  roundRect(ctx, cx - w / 2, y, w, h, 4);
  ctx.fillStyle = hexAlpha(color, 0.15);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(color, 0.5);
  ctx.lineWidth = 0.75;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, y + h / 2 + size * 0.36);
  ctx.textAlign = 'left';
}

/** "❖ TITLE ───" section heading, sized for the portrait image */
function heading(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number) {
  ctx.font = font(700, 12, DISPLAY);
  ctx.fillStyle = C.gold;
  ctx.fillText('❖', x, y + 11);
  ctx.fillStyle = C.text;
  ctx.fillText(text.toUpperCase(), x + 17, y + 11);
  const tw = ctx.measureText(text.toUpperCase()).width;
  ctx.strokeStyle = 'rgba(255,215,0,0.18)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(x + 17 + tw + 8, y + 7);
  ctx.lineTo(x + width, y + 7);
  ctx.stroke();
  return y + 22;
}

export async function renderArmourImage(data: ArmourImageData): Promise<HTMLCanvasElement> {
  await loadSiteFonts();
  const [siteIcon, lockIcon, ...pieceImgs] = await Promise.all([
    loadImage(SITE_ICON),
    loadImage(LOCK_ICON),
    ...data.pieces.map((p) => loadImage(p.icon)),
  ]);

  const scratch = document.createElement('canvas');
  scratch.width = W * SCALE;
  scratch.height = H * SCALE;
  const ctx = scratch.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'alphabetic';
  const cw = W - PAD * 2;

  // ── Header ──
  let y = PAD + 6;
  ctx.font = font(800, 9);
  const tag = 'ARMOUR SET';
  const tagW = ctx.measureText(tag).width + 16;
  roundRect(ctx, PAD, y, tagW, 18, 4);
  ctx.fillStyle = 'rgba(255,215,0,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,0,0.4)';
  ctx.lineWidth = 0.75;
  ctx.stroke();
  ctx.fillStyle = C.gold;
  ctx.fillText(tag, PAD + 8, y + 12.5);
  ctx.font = font(600, 9);
  ctx.fillStyle = C.textDim;
  ctx.fillText('MONSTER HUNTER OUTLANDERS', PAD + tagW + 8, y + 12.5);

  y += 50;
  ctx.font = font(700, 30, DISPLAY);
  let titleLines = wrapText(ctx, data.title.trim() || 'My Armour Set', cw);
  if (titleLines.length > 2) titleLines = [titleLines[0], ellipsize(ctx, titleLines.slice(1).join(' '), cw)];
  const grad = ctx.createLinearGradient(PAD, 0, PAD + cw, 0);
  grad.addColorStop(0, '#fff3b0');
  grad.addColorStop(0.5, C.gold);
  grad.addColorStop(1, C.goldSoft);
  ctx.fillStyle = grad;
  titleLines.forEach((l, i) => ctx.fillText(l, PAD, y + i * 34));
  y += (titleLines.length - 1) * 34 + 18;

  // Stats: my rarity · defence · wanted (or skill count)
  const met = data.wanted.filter((w) => w.have >= w.target).length;
  const stats = [
    { label: 'MY RARITY', value: `R${data.rarity}`, color: rarityHex(data.rarity) },
    { label: 'DEFENCE', value: String(data.defence), color: '#e2e8f0' },
    data.wanted.length > 0
      ? { label: 'WANTED SKILLS', value: `${met}/${data.wanted.length}`, color: met === data.wanted.length ? '#6ee7b7' : '#7dd3fc' }
      : { label: 'SKILLS', value: String(data.skills.length), color: '#7dd3fc' },
  ];
  const sGap = 8;
  const sW = (cw - sGap * 2) / 3;
  const sH = 52;
  stats.forEach((s, i) => {
    const x = PAD + i * (sW + sGap);
    panel(ctx, x, y, sW, sH, { r: 10, fill: hexAlpha(s.color, 0.08), stroke: hexAlpha(s.color, 0.45) });
    ctx.textAlign = 'center';
    ctx.font = font(700, 8);
    ctx.fillStyle = C.textFaint;
    ctx.fillText(s.label, x + sW / 2, y + 16);
    ctx.font = font(700, 22, DISPLAY);
    ctx.fillStyle = s.color;
    ctx.fillText(s.value, x + sW / 2, y + 42);
    ctx.textAlign = 'left';
  });
  y += sH + 16;

  // ── The five pieces in a row: Helm → Greaves ──
  y = heading(ctx, 'Armour', PAD, y, cw);
  const gap = 6;
  const tileW = (cw - gap * 4) / 5;
  const tileH = 156;
  const icon = 70;
  data.pieces.forEach((p, i) => {
    const x = PAD + i * (tileW + gap);
    const cx = x + tileW / 2;
    if (!p.setName) {
      ctx.save();
      roundRect(ctx, x, y, tileW, tileH, 9);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.restore();
    } else {
      panel(ctx, x, y, tileW, tileH, {
        r: 9,
        fill: p.locked ? 'rgba(244,63,94,0.07)' : C.panel,
        stroke: p.locked ? 'rgba(244,63,94,0.55)' : C.panelBorder,
      });
    }
    ctx.textAlign = 'center';
    ctx.font = font(700, 8);
    ctx.fillStyle = C.goldSoft;
    ctx.fillText(p.slot.toUpperCase(), cx, y + 14);
    if (!p.setName) {
      ctx.font = font(500, 12);
      ctx.fillStyle = C.textFaint;
      ctx.fillText('—', cx, y + tileH / 2 + 4);
      ctx.textAlign = 'left';
      return;
    }

    const ix = cx - icon / 2;
    const iy = y + 21;
    roundRect(ctx, ix, iy, icon, icon, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    ctx.save();
    if (p.locked) ctx.globalAlpha = 0.6;
    drawImage(ctx, pieceImgs[i], ix + 4, iy + 4, icon - 8, icon - 8);
    ctx.restore();
    if (p.locked) drawImage(ctx, lockIcon, ix + icon - 15, iy + icon - 17, 20, 20);

    ctx.font = font(700, 9);
    ctx.fillStyle = C.text;
    let nameLines = wrapText(ctx, p.setName, tileW - 8);
    if (nameLines.length > 2) nameLines = [nameLines[0], ellipsize(ctx, nameLines.slice(1).join(' '), tileW - 8)];
    nameLines.forEach((l, li) => ctx.fillText(l, cx, y + 104 + li * 11));
    if (p.monsterName) {
      ctx.font = font(500, 8);
      ctx.fillStyle = C.textDim;
      ctx.fillText(ellipsize(ctx, p.monsterName, tileW - 8), cx, y + 104 + nameLines.length * 11 + 1);
    }
    ctx.textAlign = 'left';
    if (p.locked && p.startRarity) pill(ctx, `Needs R${p.startRarity}`, cx, y + tileH - 21, '#fb7185', 8);
    else if (p.rarity) pill(ctx, `R${p.rarity}`, cx, y + tileH - 21, rarityHex(p.rarity));
  });
  y += tileH + 16;

  // ── Footer is fixed at the bottom; everything else shares the space above it ──
  const footerH = 64;
  const footerTop = H - PAD - footerH;

  // Wanted skills and set bonuses (side by side) sit just above the footer
  const wantedRowH = 17;
  const bonusRowH = 26;
  const lowerH = Math.max(
    data.wanted.length ? 22 + data.wanted.length * wantedRowH : 0,
    data.setBonuses.length ? 22 + data.setBonuses.length * bonusRowH : 0,
  );
  const lowerTop = footerTop - 14 - lowerH;

  // ── Skills fill the space between the armour and the lower block ──
  y = heading(ctx, `Skills · ${data.skills.length}`, PAD, y, cw);
  const skillsBottom = lowerH > 0 ? lowerTop - 12 : footerTop - 14;
  const avail = skillsBottom - y;
  const n = data.skills.length;
  if (n === 0) {
    ctx.font = font(500, 11);
    ctx.fillStyle = C.textFaint;
    ctx.fillText('No skills yet.', PAD + 2, y + 14);
  } else {
    // One column with rows up to 46 tall (few skills = bigger rows); two columns when they'd get too short
    let cols = 1;
    let rowH = Math.min(46, avail / n);
    if (rowH < 19) {
      cols = 2;
      rowH = Math.min(30, avail / Math.ceil(n / 2));
    }
    rowH = Math.max(rowH, 13);
    const perCol = Math.min(n, Math.floor(avail / rowH) || 1);
    const shown = Math.min(n, perCol * cols);
    const colGap = 8;
    const rowW = (cw - colGap * (cols - 1)) / cols;
    const fs = Math.max(8, Math.min(16, rowH * 0.4));
    for (let i = 0; i < shown; i++) {
      const s = data.skills[i];
      const col = Math.floor(i / perCol);
      const rx = PAD + col * (rowW + colGap);
      const ry = y + (i % perCol) * rowH;
      const h = rowH - 4;
      panel(ctx, rx, ry, rowW, h, { r: 6, fill: s.wanted ? hexAlpha(s.color, 0.1) : C.panel, stroke: s.wanted ? hexAlpha(s.color, 0.45) : C.panelBorder });
      ctx.fillStyle = s.color;
      roundRect(ctx, rx, ry, 3, h, 1.5);
      ctx.fill();
      const baseY = ry + h / 2 + fs * 0.36;

      ctx.font = font(800, fs, DISPLAY);
      ctx.textAlign = 'right';
      const lvText = `Lv ${s.level}/${s.max}`;
      ctx.fillStyle = s.level >= s.max ? '#6ee7b7' : C.text;
      ctx.fillText(lvText, rx + rowW - 8, baseY);
      const lvW = ctx.measureText(lvText).width;
      ctx.textAlign = 'left';

      let nameRight = rx + rowW - 8 - lvW - 8;
      if (cols === 1) {
        // Pips only when there is room
        const pipW = Math.max(4.5, rowH * 0.15);
        const pipGap = Math.max(2, rowH * 0.06);
        const pipH = Math.min(rowH * 0.36, h - 8);
        const pipsW = s.max * (pipW + pipGap) - pipGap;
        const pipsX = nameRight - pipsW;
        for (let p = 0; p < s.max; p++) {
          roundRect(ctx, pipsX + p * (pipW + pipGap), ry + (h - pipH) / 2, pipW, pipH, 1);
          ctx.fillStyle = p < s.level ? (s.level >= s.max ? s.color : '#38bdf8') : 'rgba(255,255,255,0.1)';
          ctx.fill();
        }
        nameRight = pipsX - 8;
      }
      if (s.wasted > 0) {
        ctx.font = font(700, fs * 0.8);
        const wt = `+${s.wasted} wasted`;
        const ww = ctx.measureText(wt).width;
        ctx.fillStyle = '#fda4af';
        ctx.fillText(wt, nameRight - ww, baseY);
        nameRight -= ww + 6;
      }
      ctx.font = font(700, fs);
      ctx.fillStyle = C.text;
      ctx.fillText(ellipsize(ctx, (s.wanted ? '★ ' : '') + s.name, nameRight - rx - 10), rx + 10, baseY);
    }
    if (shown < n) {
      ctx.font = font(600, 9);
      ctx.fillStyle = C.textDim;
      ctx.textAlign = 'right';
      ctx.fillText(`+${n - shown} more skills on MHFG.Quest`, PAD + cw, skillsBottom + 6);
      ctx.textAlign = 'left';
    }
  }

  // ── Wanted skills (left) · set bonuses (right) ──
  if (lowerH > 0) {
    const both = data.wanted.length > 0 && data.setBonuses.length > 0;
    const colW = both ? (cw - 14) / 2 : cw;
    let lx = PAD;
    if (data.wanted.length > 0) {
      let ly = heading(ctx, 'Wanted skills', lx, lowerTop, colW);
      data.wanted.forEach((w) => {
        const ok = w.have >= w.target;
        ctx.beginPath();
        ctx.arc(lx + 4, ly + 6, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = w.color;
        ctx.fill();
        ctx.font = font(700, 10);
        ctx.fillStyle = ok ? '#a7f3d0' : C.text;
        ctx.fillText(ellipsize(ctx, w.name, colW - 96), lx + 13, ly + 10);
        const barW = 44;
        const barX = lx + colW - 36 - barW;
        roundRect(ctx, barX, ly + 3, barW, 5, 2.5);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        if (w.have > 0) {
          roundRect(ctx, barX, ly + 3, Math.max(5, barW * Math.min(1, w.have / w.target)), 5, 2.5);
          ctx.fillStyle = ok ? '#34d399' : '#38bdf8';
          ctx.fill();
        }
        ctx.font = font(700, 10);
        ctx.textAlign = 'right';
        ctx.fillStyle = ok ? '#6ee7b7' : C.textDim;
        ctx.fillText(`${ok ? '✓ ' : ''}${w.have}/${w.target}`, lx + colW, ly + 10);
        ctx.textAlign = 'left';
        ly += wantedRowH;
      });
      lx += both ? colW + 14 : 0;
    }
    if (data.setBonuses.length > 0) {
      let by = heading(ctx, 'Set bonuses', lx, lowerTop, colW);
      data.setBonuses.forEach((b) => {
        panel(ctx, lx, by, colW, bonusRowH - 4, {
          r: 6,
          fill: b.active ? 'rgba(251,146,60,0.08)' : C.panel,
          stroke: b.active ? 'rgba(251,146,60,0.45)' : C.panelBorder,
        });
        ctx.font = font(700, 9);
        ctx.fillStyle = b.active ? '#fdba74' : C.textDim;
        const right = b.active ? b.bonus : `${b.needed - b.count} more for ${b.bonus}`;
        ctx.textAlign = 'right';
        ctx.fillText(ellipsize(ctx, right, colW * 0.55), lx + colW - 8, by + 14);
        const rw = Math.min(ctx.measureText(right).width, colW * 0.55);
        ctx.textAlign = 'left';
        ctx.fillStyle = b.active ? C.text : C.textFaint;
        ctx.fillText(ellipsize(ctx, `${b.setName} ${Math.min(b.count, b.needed)}/${b.needed}`, colW - rw - 24), lx + 8, by + 14);
        by += bonusRowH;
      });
    }
  }

  // ── Footer with the logo ──
  ctx.strokeStyle = 'rgba(255,215,0,0.25)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(PAD, footerTop);
  ctx.lineTo(W - PAD, footerTop);
  ctx.stroke();
  const fy = footerTop + 14;
  const logo = 42;
  drawImage(ctx, siteIcon, PAD, fy, logo, logo);
  ctx.font = font(700, 22, DISPLAY);
  ctx.fillStyle = C.gold;
  ctx.fillText('MHFG.Quest', PAD + logo + 10, fy + 22);
  ctx.font = font(500, 9);
  ctx.fillStyle = C.textDim;
  ctx.fillText('Monster Hunter Field Guide', PAD + logo + 10, fy + 36);
  const dateStr = data.generatedOn.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.textAlign = 'right';
  ctx.font = font(500, 9);
  ctx.fillStyle = C.textDim;
  ctx.fillText(dateStr, W - PAD, fy + 20);
  if (data.url) {
    ctx.font = font(700, 10);
    ctx.fillStyle = C.goldSoft;
    ctx.fillText(data.url, W - PAD, fy + 36);
  }
  ctx.textAlign = 'left';

  return finishImage(scratch, W, H);
}
