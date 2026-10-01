"use strict";
// ==================================================================
// SPRITES de foto — fantasmas (nanquim), itens e MÓVEIS
// ==================================================================

// ------------------------------------------------------------------
// FANTASMA — estilo "desenho a caneta": crânio pálido hachurado,
// olhos = buracos negros com aro rabiscado, mãos esqueléticas.
// Nunca aparece o corpo "inteiro de boneco": emerge do chão/do nada.
// ------------------------------------------------------------------
function makeGhostSprite(n) {
  const r = mulberry32((n * 1e9) | 0);
  const v = r();
  if (v < 0.30) return ghostPeek(r);
  if (v < 0.55) return ghostFloor(r);
  if (v < 0.75) return ghostReach(r);
  return ghostBody(r);
}

function penTools(g, r) {
  function pen(x0, y0, x1, y1, alpha, lw) {
    g.strokeStyle = `rgba(226,226,233,${alpha})`;
    g.lineWidth = lw;
    g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * 3,
                       (y0 + y1) / 2 + (r() - 0.5) * 3, x1, y1);
    g.stroke();
  }
  function dark(x0, y0, x1, y1, alpha, lw) {
    g.strokeStyle = `rgba(2,2,4,${alpha})`;
    g.lineWidth = lw;
    g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * 3,
                       (y0 + y1) / 2 + (r() - 0.5) * 3, x1, y1);
    g.stroke();
  }

  function skull(cx, cy, R, tilt, hairLen) {
    hairLen = hairLen || 1;
    g.save();
    g.translate(cx, cy);
    g.rotate(tilt);

    g.fillStyle = "rgba(4,4,6,0.94)";
    const phase = r() * 6.28, phase2 = r() * 6.28;
    g.beginPath();
    const npts = 34;
    for (let i = 0; i <= npts; i++) {
      const a = i / npts * 6.283;
      const wob = 1 + 0.09 * Math.sin(a * 3 + phase) + 0.06 * Math.sin(a * 7 + phase2);
      const x = Math.cos(a) * R * 1.14 * wob;
      const y = Math.sin(a) * R * 1.30 * wob - R * 0.05;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.fill();
    // pescoço curto e fino
    g.beginPath();
    g.moveTo(-R * 0.20, R * 0.95);
    g.quadraticCurveTo(-R * 0.15, R * 1.1, -R * (0.08 + r() * 0.05), R * 1.3);
    g.lineTo(R * (0.10 + r() * 0.05), R * 1.3);
    g.quadraticCurveTo(R * 0.16, R * 1.1, R * 0.20, R * 0.95);
    g.closePath(); g.fill();
    for (let i = 0; i < 8; i++) {
      const t = r();
      pen(-R * 0.12 + r() * R * 0.24, R * (1.0 + t * 0.25),
          -R * 0.12 + r() * R * 0.24 + (r() - 0.5) * 4, R * (1.0 + t * 0.25) + 4 + r() * 6,
          0.08 + r() * 0.15, 0.7);
    }

    const eL = { x: -R * 0.42, y: -R * 0.08, rr: R * (0.30 + r() * 0.05) };
    const eR = { x:  R * 0.40, y: -R * 0.10, rr: R * (0.27 + r() * 0.05) };

    const faceRx = R * 1.02, faceRy = R * 1.18;
    const wash = g.createRadialGradient(0, -R * 0.05, R * 0.15, 0, -R * 0.05, R * 1.1);
    wash.addColorStop(0, "rgba(158,158,168,0.62)");
    wash.addColorStop(0.7, "rgba(126,126,138,0.36)");
    wash.addColorStop(1, "rgba(90,90,100,0)");
    g.fillStyle = wash;
    g.beginPath(); g.ellipse(0, -R * 0.05, faceRx, faceRy, 0, 0, 7); g.fill();

    for (let i = 0; i < 1100; i++) {
      const a = r() * 6.283, rad = Math.sqrt(r());
      const x = Math.cos(a) * rad * faceRx;
      const y = Math.sin(a) * rad * faceRy - R * 0.05;
      if (Math.hypot(x - eL.x, y - eL.y) < eL.rr * 1.02) continue;
      if (Math.hypot(x - eR.x, y - eR.y) < eR.rr * 1.02) continue;
      let b = Math.pow(1 - rad, 0.5) * (0.5 + 0.5 * r());
      if (y > R * 0.8) b *= 0.55;
      const sa = -1.05 + (r() - 0.5) * 0.5 + (r() < 0.25 ? 1.4 : 0);
      const sl = 2.5 + r() * 4;
      pen(x - Math.cos(sa) * sl, y - Math.sin(sa) * sl,
          x + Math.cos(sa) * sl, y + Math.sin(sa) * sl,
          0.07 + 0.24 * b, 0.6 + r() * 0.5);
    }

    // cabelo: nasce quase parado e despenca rente ao crânio
    for (let i = 0; i < 240; i++) {
      const a0 = -Math.PI + r() * Math.PI;
      let x = Math.cos(a0) * R * (0.72 + r() * 0.14);
      let y = Math.sin(a0) * R * (0.80 + r() * 0.14) - R * 0.08;
      const wild = r() < 0.12;
      const side = Math.cos(a0) >= 0 ? 1 : -1;
      const overFace = !wild && r() < 0.22;
      let vx2 = wild ? side * (0.6 + r() * 0.8)
                     : overFace ? (r() - 0.5) * 0.08
                     : side * (0.06 + Math.abs(Math.cos(a0)) * 0.12);
      let vy2 = wild ? 0.15 + r() * 0.3 : 0.08 + r() * 0.08;
      g.strokeStyle = `rgba(215,215,222,${0.05 + r() * 0.2})`;
      g.lineWidth = 0.5 + r() * 0.8;
      g.beginPath(); g.moveTo(x, y);
      const segs = 4 + (r() * 4 | 0);
      for (let s2 = 0; s2 < segs; s2++) {
        vx2 += (r() - 0.5) * 0.45;
        vy2 += 0.85 + (r() - 0.5) * 0.3;
        const il = 1 / Math.hypot(vx2, vy2);
        vx2 *= il; vy2 *= il;
        const len = R * (0.18 + r() * 0.28) * hairLen;
        x += vx2 * len; y += vy2 * len;
        g.lineTo(x, y);
      }
      g.stroke();
    }

    // olhos: vazios com aros rabiscados
    for (const e of [eL, eR]) {
      const halo = g.createRadialGradient(e.x, e.y, e.rr * 0.4, e.x, e.y, e.rr * 1.5);
      halo.addColorStop(0, "rgba(0,0,0,1)");
      halo.addColorStop(0.75, "rgba(0,0,0,0.85)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = halo;
      g.beginPath(); g.arc(e.x, e.y, e.rr * 1.5, 0, 7); g.fill();
      g.fillStyle = "#000";
      g.beginPath(); g.arc(e.x, e.y, e.rr, 0, 7); g.fill();

      for (let k = 0; k < 14; k++) {
        const rad2 = e.rr * (0.98 + r() * 0.28);
        g.strokeStyle = `rgba(232,232,240,${0.15 + r() * 0.5})`;
        g.lineWidth = 0.6 + r() * 1.0;
        g.beginPath();
        const aa0 = r() * 6.28, arc = 1.2 + r() * 3.5, steps = 14;
        for (let i2 = 0; i2 <= steps; i2++) {
          const a = aa0 + i2 / steps * arc;
          const rj = rad2 * (1 + (r() - 0.5) * 0.16);
          const x = e.x + Math.cos(a) * rj, y = e.y + Math.sin(a) * rj;
          i2 ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
      for (let k = 0; k < 40; k++) {
        const a = r() * 6.283;
        const r0 = e.rr * (1.0 + r() * 0.15), r1 = r0 + 2 + r() * 6;
        pen(e.x + Math.cos(a) * r0, e.y + Math.sin(a) * r0,
            e.x + Math.cos(a) * r1, e.y + Math.sin(a) * r1,
            0.12 + r() * 0.3, 0.6);
      }
      for (let k = 0; k < 18; k++) {
        const a = r() * 6.283;
        const r0 = e.rr * (1.3 + r() * 0.3);
        dark(e.x + Math.cos(a) * r0, e.y + Math.sin(a) * r0,
             e.x + Math.cos(a) * (r0 + 4 + r() * 4), e.y + Math.sin(a) * (r0 + 4),
             0.3, 1.2);
      }
    }

    // nariz mínimo
    dark(0, R * 0.28, (r() - 0.5) * 3, R * 0.45, 0.5, 2.5);
    g.fillStyle = "rgba(0,0,0,0.75)";
    g.beginPath(); g.ellipse(-R * 0.07, R * 0.44, 2.2, 1.6, 0.3, 0, 7); g.fill();
    g.beginPath(); g.ellipse( R * 0.06, R * 0.45, 2.2, 1.6, -0.3, 0, 7); g.fill();

    // boca: costurada / escancarada / rasgo largo
    const mtype = r();
    if (mtype < 0.38) {
      const mw = R * (0.5 + r() * 0.15), my = R * 0.72;
      g.save();
      g.translate((r() - 0.5) * R * 0.1, my);
      g.rotate((r() - 0.5) * 0.25);
      g.fillStyle = "rgba(0,0,0,0.92)";
      g.beginPath();
      g.moveTo(-mw / 2, 0);
      g.quadraticCurveTo(0, R * 0.16, mw / 2, -R * 0.02);
      g.quadraticCurveTo(0, R * 0.05, -mw / 2, 0);
      g.closePath(); g.fill();
      const nT = 7 + (r() * 4 | 0);
      for (let i2 = 0; i2 < nT; i2++) {
        const tx2 = -mw * 0.42 + (i2 / (nT - 1)) * mw * 0.84;
        pen(tx2, -1 + (r() - 0.5) * 2, tx2 + (r() - 0.5) * 1.5, 3.5 + r() * 3,
            0.4 + r() * 0.35, 0.8);
      }
      for (let i2 = 0; i2 < 16; i2++) {
        const tx2 = -mw / 2 + r() * mw;
        dark(tx2, -3 + r() * 2, tx2 + (r() - 0.5) * 6, 4 + r() * 4, 0.25, 0.8);
      }
      g.restore();
    } else if (mtype < 0.72) {
      const mrx = R * (0.19 + r() * 0.07), mry = R * (0.30 + r() * 0.15);
      g.save();
      g.translate((r() - 0.5) * R * 0.12, R * (0.58 + r() * 0.06));
      g.rotate((r() - 0.5) * 0.25);
      g.save(); g.scale(1, mry / mrx);
      const mhalo = g.createRadialGradient(0, 0, mrx * 0.4, 0, 0, mrx * 1.5);
      mhalo.addColorStop(0, "rgba(0,0,0,1)");
      mhalo.addColorStop(0.75, "rgba(0,0,0,0.85)");
      mhalo.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = mhalo;
      g.beginPath(); g.arc(0, 0, mrx * 1.5, 0, 7); g.fill();
      g.fillStyle = "#000";
      g.beginPath(); g.arc(0, 0, mrx, 0, 7); g.fill();
      for (let k = 0; k < 10; k++) {
        const rad2 = mrx * (0.98 + r() * 0.25);
        g.strokeStyle = `rgba(230,230,238,${0.15 + r() * 0.45})`;
        g.lineWidth = 0.6 + r() * 0.9;
        g.beginPath();
        const aa0 = r() * 6.28, arc = 1 + r() * 3, steps = 12;
        for (let i2 = 0; i2 <= steps; i2++) {
          const a = aa0 + i2 / steps * arc;
          const rj = rad2 * (1 + (r() - 0.5) * 0.18);
          i2 ? g.lineTo(Math.cos(a) * rj, Math.sin(a) * rj)
             : g.moveTo(Math.cos(a) * rj, Math.sin(a) * rj);
        }
        g.stroke();
      }
      g.restore();
      const nT2 = 7 + (r() * 5 | 0);
      for (let i2 = 0; i2 < nT2; i2++) {
        const a = r() * 6.283;
        const ex2 = Math.cos(a) * mrx * 0.95, ey2 = Math.sin(a) * mry * 0.95;
        const len = 3 + r() * 5;
        pen(ex2, ey2, ex2 - Math.cos(a) * len, ey2 - Math.sin(a) * len * 0.7,
            0.35 + r() * 0.35, 0.8);
      }
      g.restore();
    } else {
      const mw2 = R * (0.85 + r() * 0.25), mhh = R * (0.10 + r() * 0.05);
      g.save();
      g.translate((r() - 0.5) * R * 0.08, R * (0.60 + r() * 0.08));
      g.rotate((r() - 0.5) * 0.18);
      g.fillStyle = "rgba(0,0,0,0.94)";
      g.beginPath();
      g.moveTo(-mw2 / 2, 0);
      g.quadraticCurveTo(0, -mhh * 1.2, mw2 / 2, (r() - 0.5) * 4);
      g.quadraticCurveTo(0, mhh * 3.2, -mw2 / 2, 0);
      g.closePath(); g.fill();
      const nT3 = 14 + (r() * 6 | 0);
      for (let i2 = 0; i2 < nT3; i2++) {
        const t = i2 / (nT3 - 1);
        const tx2 = -mw2 * 0.46 + t * mw2 * 0.92;
        const topY = -mhh * (0.6 + Math.sin(t * Math.PI) * 0.5);
        const botY = mhh * (0.7 + Math.sin(t * Math.PI) * 1.6);
        pen(tx2, topY, tx2 + (r() - 0.5) * 2, botY, 0.4 + r() * 0.35, 0.9 + r() * 0.5);
      }
      for (let k = 0; k < 12; k++) {
        const t = r();
        const tx2 = -mw2 / 2 + t * mw2;
        dark(tx2, -mhh - 2 + r() * 2, tx2 + (r() - 0.5) * 8, mhh * 2.5 + r() * 4, 0.3, 0.9);
      }
      g.restore();
    }

    g.restore();
  }

  function hand(cx, cy, S, baseAng, curl, spread, nF) {
    nF = nF || 5;
    const mid = (nF - 1) / 2;
    g.fillStyle = "rgba(4,4,6,0.92)";
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = i / 10 * 6.283;
      const rr2 = S * (0.22 + (r() - 0.5) * 0.05);
      const x = cx + Math.cos(a) * rr2 * 1.15, y = cy + Math.sin(a) * rr2 * 0.8;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.fill();
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28, rad = Math.sqrt(r());
      const x = cx + Math.cos(a) * rad * S * 0.2;
      const y = cy + Math.sin(a) * rad * S * 0.15;
      pen(x, y, x + (r() - 0.5) * 7, y + (r() - 0.5) * 7, 0.15 + r() * 0.25, 0.7);
    }
    for (let f = 0; f < nF; f++) {
      const fa = baseAng + (f - mid) * spread;
      const kx = cx + Math.cos(fa) * S * 0.27, ky = cy + Math.sin(fa) * S * 0.22;
      g.strokeStyle = `rgba(232,232,240,${0.5 + r() * 0.3})`;
      g.lineWidth = 1.2;
      g.beginPath(); g.arc(kx, ky, S * 0.05, fa - 2.6, fa - 0.5); g.stroke();
    }
    for (let f = 0; f < nF; f++) {
      const fa = baseAng + (f - mid) * spread + (r() - 0.5) * 0.08;
      const flen = S * (0.62 + 0.38 * Math.sin((f + 0.5) / nF * Math.PI))
                     * (0.9 + r() * 0.3);
      let x = cx + Math.cos(fa) * S * 0.27;
      let y = cy + Math.sin(fa) * S * 0.22;
      let ang = fa;
      const segLen = [flen * 0.42, flen * 0.33, flen * 0.27];
      for (let s2 = 0; s2 < 3; s2++) {
        ang += curl * (0.45 + s2 * 0.45) + (r() - 0.5) * 0.1;
        const nx = x + Math.cos(ang) * segLen[s2];
        const ny = y + Math.sin(ang) * segLen[s2];
        const th = S * (0.095 - s2 * 0.022);
        g.strokeStyle = "rgba(3,3,5,0.92)";
        g.lineWidth = th + 1.5;
        g.lineCap = "round";
        g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
        const px2 = -Math.sin(ang), py2 = Math.cos(ang);
        for (const off of [-th * 0.45, th * 0.45])
          pen(x + px2 * off, y + py2 * off, nx + px2 * off, ny + py2 * off,
              0.5 + r() * 0.3, 1.3);
        pen(nx - px2 * th * 0.7, ny - py2 * th * 0.7,
            nx + px2 * th * 0.7, ny + py2 * th * 0.7, 0.55 + r() * 0.3, 1.1);
        x = nx; y = ny;
      }
      const ca = ang + curl * 1.2;
      const clen = S * (0.17 + r() * 0.08);
      g.strokeStyle = `rgba(240,240,246,${0.7 + r() * 0.25})`;
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(ang) * clen * 0.7, y + Math.sin(ang) * clen * 0.7,
                         x + Math.cos(ca) * clen, y + Math.sin(ca) * clen);
      g.stroke();
    }
  }

  function arm(x0, y0, x1, y1, x2, y2, thick) {
    function bez(t) {
      return [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2,
              (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2];
    }
    g.strokeStyle = "rgba(3,3,5,0.92)";
    g.lineWidth = thick;
    g.lineCap = "round";
    g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * thick * 0.35;
      let p = bez(0);
      for (let t = 0.2; t <= 1.001; t += 0.2) {
        const q = bez(t);
        pen(p[0] + off + (r() - 0.5) * 2, p[1], q[0] + off + (r() - 0.5) * 2, q[1],
            0.3 + r() * 0.3, 1.0);
        p = q;
      }
    }
    for (let k = 0; k < 6; k++) {
      const p = bez(r());
      pen(p[0] - 3 - r() * 3, p[1] + (r() - 0.5) * 4,
          p[0] + 3 + r() * 3, p[1] + (r() - 0.5) * 4, 0.25 + r() * 0.2, 0.8);
    }
  }

  function claws(x, y, dir, len, n2) {
    for (let f = 0; f < n2; f++) {
      const a = dir + (f - (n2 - 1) / 2) * 0.3 + (r() - 0.5) * 0.15;
      const l2 = len * (0.7 + r() * 0.6);
      g.strokeStyle = `rgba(238,238,245,${0.55 + r() * 0.3})`;
      g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l2 * 0.6, y + Math.sin(a) * l2 * 0.6 + 2,
                         x + Math.cos(a) * l2, y + Math.sin(a) * l2 + 3);
      g.stroke();
    }
  }

  // tronco esquelético: espinha + costelas no traço dos braços
  function torso(cx, y0, y1, wTop, wBot, bend) {
    const mx2 = cx + bend, my2 = (y0 + y1) / 2;
    const ex2 = cx + bend * 0.6;
    function spine(t) {
      return [(1 - t) * (1 - t) * cx + 2 * (1 - t) * t * mx2 + t * t * ex2,
              (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my2 + t * t * y1];
    }
    arm(cx, y0, mx2, my2, ex2, y1, 5);
    pen(cx - wTop * 0.45, y0 + 4 + (r() - 0.5) * 3,
        cx + wTop * 0.45, y0 + 2 + (r() - 0.5) * 3, 0.4 + r() * 0.2, 1.4);
    const nR = 5 + (r() * 2 | 0);
    for (let k = 0; k < nR; k++) {
      const t = 0.12 + k * (0.55 / nR);
      const [sx2, sy2] = spine(t);
      const w2 = (wTop + (wBot - wTop) * t) * (0.55 + r() * 0.15);
      for (const sd of [-1, 1]) {
        g.strokeStyle = `rgba(222,222,230,${0.25 + r() * 0.3})`;
        g.lineWidth = 1 + r() * 0.7;
        g.beginPath();
        g.moveTo(sx2, sy2);
        g.quadraticCurveTo(sx2 + sd * w2 * 0.7, sy2 + 2 + r() * 3,
                           sx2 + sd * w2, sy2 + w2 * 0.35 + r() * 4);
        g.stroke();
      }
    }
    for (let k = 0; k < 14; k++) {
      const [sx2, sy2] = spine(r());
      const off = (r() - 0.5) * wTop * 0.9;
      pen(sx2 + off, sy2, sx2 + off + (r() - 0.5) * 6, sy2 + 8 + r() * 16,
          0.08 + r() * 0.18, 0.6);
    }
  }

  return { pen, dark, skull, hand, arm, claws, torso };
}

// réplica da referência: cabeça inclinada, mão(s) ossuda(s)
function ghostPeek(r) {
  const w = 210, h = 300;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.lineCap = "round";
  const T = penTools(g, r);
  const R = 52 + r() * 6;
  const hx = w * 0.5 + (r() - 0.5) * 14;
  T.skull(hx, h * 0.30, R, (r() - 0.5) * 0.22);
  const hwx = w * (0.60 + r() * 0.08), hwy = h * (0.72 + r() * 0.04);
  T.arm(hx + R * 0.55, h * 0.47, w * 0.78, h * 0.58, hwx + 4, hwy - 10, 5.5);
  T.hand(hwx, hwy, 56 + r() * 10,
         Math.PI * (0.42 + r() * 0.12), 0.30 + r() * 0.16, 0.28, 4 + (r() * 3 | 0));
  if (r() < 0.5) {
    const h2x = w * (0.24 + r() * 0.06), h2y = h * (0.66 + r() * 0.06);
    T.arm(hx - R * 0.55, h * 0.46, w * 0.16, h * 0.56, h2x - 4, h2y - 10, 5);
    T.hand(h2x, h2y, 46 + r() * 10,
           Math.PI * (0.55 + r() * 0.1), 0.12 + r() * 0.25, 0.30, 4 + (r() * 3 | 0));
  }
  cv._aspect = 0.70; cv._hscale = 0.95;
  return cv;
}

// emergindo do chão: cabeça + duas mãos fincadas
function ghostFloor(r) {
  const w = 250, h = 200;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.lineCap = "round";
  const T = penTools(g, r);
  const R = 46 + r() * 6;
  T.skull(w * 0.5 + (r() - 0.5) * 12, h * 0.42, R, (r() - 0.5) * 0.3);
  T.hand(w * 0.17 + r() * 8, h * 0.80, 42 + r() * 8,
         Math.PI * 0.55, 0.3 + r() * 0.2, 0.24, 4 + (r() * 3 | 0));
  T.hand(w * 0.83 - r() * 8, h * 0.78, 42 + r() * 8,
         Math.PI * 0.45, -(0.3 + r() * 0.2), 0.24, 4 + (r() * 3 | 0));
  for (let i = 0; i < 40; i++) {
    const x = w * 0.15 + r() * w * 0.7, y = h * (0.92 + r() * 0.06);
    T.pen(x, y, x + (r() - 0.5) * 30, y + (r() - 0.5) * 3, 0.1 + r() * 0.25, 0.7);
  }
  cv._aspect = 1.15; cv._hscale = 0.60;
  return cv;
}

// atravessando a parede invisível: cabeça e um braço comprido demais
function ghostReach(r) {
  const w = 200, h = 310;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.lineCap = "round";
  const T = penTools(g, r);
  const R = 46 + r() * 5;
  T.skull(w * 0.42, h * 0.24, R, (r() - 0.5) * 0.35);
  for (let i = 0; i < 60; i++) {
    const x = w * (0.3 + r() * 0.35);
    const y = h * (0.38 + r() * 0.08);
    T.pen(x, y, x + (r() - 0.5) * 10, y + h * (0.1 + r() * 0.25),
          0.05 + r() * 0.15, 0.6);
  }
  const ax2 = w * (0.52 + r() * 0.1), ay2 = h * 0.74;
  T.arm(w * 0.55, h * 0.42, w * (0.74 + r() * 0.06), h * 0.58, ax2, ay2, 6);
  T.hand(ax2, ay2 + 12, 60 + r() * 10,
         Math.PI * (0.45 + r() * 0.1), 0.28 + r() * 0.18, 0.28, 4 + (r() * 3 | 0));
  cv._aspect = 0.62; cv._hscale = 1.0;
  return cv;
}

// corpo inteiro distorcido: esqueleto rabiscado com pernas
function ghostBody(r) {
  const w = 220, h = 340;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.lineCap = "round";
  const T = penTools(g, r);
  const R = 40 + r() * 5;
  const bend = (r() - 0.5) * w * 0.26;
  const hx = w * 0.5 + (r() - 0.5) * 10, hy = h * 0.155;

  const hipY = h * 0.60;
  const hipX = hx + bend * 0.9;
  const fL = { x: hipX - w * (0.06 + r() * 0.05), y: h * (0.94 + r() * 0.03) };
  const fR = { x: hipX + w * (0.05 + r() * 0.05), y: h * (0.95 + r() * 0.02) };
  T.arm(hipX - R * 0.35, hipY, hipX - w * (0.14 + r() * 0.04), h * 0.78, fL.x, fL.y, 5);
  T.claws(fL.x, fL.y, Math.PI * 0.5, 8, 3);
  T.arm(hipX + R * 0.35, hipY, hipX + w * (0.15 + r() * 0.04), h * 0.80, fR.x, fR.y, 5);
  T.claws(fR.x, fR.y, Math.PI * 0.5, 8, 3);

  T.torso(hx, h * 0.235, h * 0.62, R * 1.5, R * 0.95, bend);

  const hLx = hx - w * (0.27 + r() * 0.05), hLy = h * (0.52 + r() * 0.12);
  const hRx = hx + w * (0.28 + r() * 0.05), hRy = h * (0.48 + r() * 0.14);
  T.arm(hx - R * 0.75, h * 0.285, hx - w * 0.30, h * 0.40, hLx, hLy, 5);
  T.hand(hLx, hLy + 8, 34 + r() * 10,
         Math.PI * (0.5 + (r() - 0.5) * 0.25), 0.14 + r() * 0.3, 0.3, 4 + (r() * 3 | 0));
  T.arm(hx + R * 0.75, h * 0.285, hx + w * 0.33, h * 0.42, hRx, hRy, 5);
  T.hand(hRx, hRy + 8, 34 + r() * 10,
         Math.PI * (0.5 + (r() - 0.5) * 0.25), 0.14 + r() * 0.3, 0.3, 4 + (r() * 3 | 0));

  T.skull(hx, hy, R, (r() - 0.5) * 0.4, 0.55);

  cv._aspect = 0.65; cv._hscale = 1.12;
  return cv;
}

// pool pré-aquecido na abertura
const GHOST_POOL = [];
const GHOST_POOL_N = 12;
(function warmGhostPool() {
  if (GHOST_POOL.length >= GHOST_POOL_N) return;
  GHOST_POOL.push(makeGhostSprite((GHOST_POOL.length + Math.random()) / GHOST_POOL_N));
  setTimeout(warmGhostPool, 40);
})();
function ghostSprite(seed) {
  if (GHOST_POOL.length) return GHOST_POOL[(seed * GHOST_POOL.length) | 0];
  return makeGhostSprite(seed);
}

// ------------------------------------------------------------------
// Itens e efeitos
// ------------------------------------------------------------------
let FILM_SPR = null, GLOW_SPR = null;

function makeFilmSprite() {
  const s = 120;
  const cv = document.createElement("canvas");
  cv.width = s; cv.height = s;
  const g = cv.getContext("2d");
  const c = s / 2;
  const rad = g.createRadialGradient(c, c, 2, c, c, c * 0.9);
  rad.addColorStop(0, "rgba(180,230,180,0.30)");
  rad.addColorStop(1, "rgba(180,230,180,0)");
  g.fillStyle = rad; g.fillRect(0, 0, s, s);
  const bw = s * 0.32, bh = s * 0.46;
  const bx = c - bw / 2 - s * 0.08, by = c - bh * 0.35;
  g.fillStyle = "#23262b"; g.fillRect(bx, by, bw, bh);
  const shine = g.createLinearGradient(bx, 0, bx + bw, 0);
  shine.addColorStop(0, "rgba(255,255,255,0)");
  shine.addColorStop(0.3, "rgba(255,255,255,0.22)");
  shine.addColorStop(0.6, "rgba(255,255,255,0)");
  g.fillStyle = shine; g.fillRect(bx, by, bw, bh);
  g.fillStyle = "#3a3f47"; g.fillRect(bx - 2, by - s * 0.05, bw + 4, s * 0.05);
  g.fillStyle = "#cfd6cf"; g.fillRect(bx + 3, by + bh * 0.20, bw - 6, bh * 0.44);
  g.fillStyle = "#a33630"; g.fillRect(bx + 3, by + bh * 0.56, bw - 6, 4);
  g.fillStyle = "#23262b";
  g.font = "bold 13px 'Courier New', monospace";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("35", bx + bw / 2, by + bh * 0.38);
  g.fillStyle = "#3a3320";
  g.fillRect(bx + bw, by + bh * 0.28, s * 0.30, bh * 0.36);
  g.fillStyle = "#0a0a0a";
  for (let i = 0; i < 4; i++) {
    g.fillRect(bx + bw + 4 + i * s * 0.065, by + bh * 0.32, 4, 4);
    g.fillRect(bx + bw + 4 + i * s * 0.065, by + bh * 0.54, 4, 4);
  }
  return cv;
}

// dígito rabiscado na parede (só a FOTO enxerga); pontinhos = ordem no código
const DIGIT_SPRS = {};
function digitSprite(digit, ord) {
  const k = digit + ":" + ord;
  if (DIGIT_SPRS[k]) return DIGIT_SPRS[k];
  const w = 110, h = 150;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const r = mulberry32(digit * 7919 + ord * 104729);
  g.textAlign = "center"; g.textBaseline = "middle";
  // número: várias passadas tremidas, como riscado na parede com unha
  g.font = "bold 92px 'Courier New', monospace";
  for (let i = 0; i < 7; i++) {
    g.strokeStyle = `rgba(235,230,220,${0.18 + r() * 0.25})`;
    g.lineWidth = 1.5 + r() * 1.5;
    g.strokeText(String(digit), w / 2 + (r() - 0.5) * 5, h * 0.58 + (r() - 0.5) * 5);
  }
  // pontinhos da ordem (1, 2 ou 3)
  for (let i = 0; i < ord; i++) {
    const px2 = w / 2 + (i - (ord - 1) / 2) * 22;
    for (let p2 = 0; p2 < 4; p2++) {
      g.strokeStyle = `rgba(235,230,220,${0.3 + r() * 0.3})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(px2 + (r() - 0.5) * 2, h * 0.14 + (r() - 0.5) * 2, 5 + r() * 2, 0, 7);
      g.stroke();
    }
  }
  // riscos de arranhão em volta
  for (let i = 0; i < 16; i++) {
    g.strokeStyle = `rgba(220,215,205,${0.08 + r() * 0.15})`;
    g.lineWidth = 1;
    const x = r() * w, y = h * 0.3 + r() * h * 0.6;
    g.beginPath(); g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 20, y + 6 + r() * 14);
    g.stroke();
  }
  DIGIT_SPRS[k] = cv;
  return cv;
}

function makeGlowSprite() {
  const s = 128;
  const cv = document.createElement("canvas");
  cv.width = s; cv.height = s;
  const g = cv.getContext("2d");
  const rad = g.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2 - 2);
  rad.addColorStop(0, "rgba(255,250,235,0.60)");
  rad.addColorStop(0.6, "rgba(255,250,235,0.22)");
  rad.addColorStop(1, "rgba(255,250,235,0)");
  g.fillStyle = rad; g.fillRect(0, 0, s, s);
  return cv;
}

// ------------------------------------------------------------------
// MÓVEIS — tipos e sprites de foto (nanquim simples)
// ------------------------------------------------------------------
// def: ch = caractere no mapa; w,h em células; ph/pw = proporção na foto
// w/h = footprint em células no mapa; hC = ALTURA real em "unidades de parede"
// (parede = 1.0) — a foto usa o footprint projetado p/ largura e hC p/ altura
const FURN_TYPES = {
  sofa:     { id: 1,  ch: "▬", w: 3, h: 1, hC: 0.50 },
  mesa:     { id: 2,  ch: "■", w: 2, h: 2, hC: 0.42 },
  estante:  { id: 3,  ch: "▓", w: 3, h: 1, hC: 1.15 },
  cadeira:  { id: 4,  ch: "π", w: 1, h: 1, hC: 0.55 },
  piano:    { id: 5,  ch: "♪", w: 2, h: 2, hC: 0.70 },
  cama:     { id: 6,  ch: "▭", w: 2, h: 3, hC: 0.40 },
  poltrona: { id: 7,  ch: "∩", w: 1, h: 1, hC: 0.55 },
  bau:      { id: 8,  ch: "Ξ", w: 2, h: 1, hC: 0.32 },
  escrivaninha: { id: 9, ch: "Π", w: 2, h: 1, hC: 0.48 },
  relogio:  { id: 10, ch: "Φ", w: 1, h: 1, hC: 1.25 },
  espelho:  { id: 11, ch: "◊", w: 1, h: 1, hC: 0.95 },
  berco:    { id: 12, ch: "Ш", w: 2, h: 2, hC: 0.50 },
};
const FURN_BY_ID = {};
for (const k in FURN_TYPES) FURN_BY_ID[FURN_TYPES[k].id] = { name: k, ...FURN_TYPES[k] };

// --- imagens do Gemini (Assets/Furniture/<tipo>.png): se existirem, substituem
// o desenho procedural. Pipeline: fundo PRETO puro vira transparente; o corpo
// cinza-escuro fica sólido e o traço branco por cima (ver furniture-prompts.md)
const FURN_IMGS = {};
(function loadFurnImgs() {
  for (const k in FURN_TYPES) {
    const im = new Image();
    im.onload = () => { FURN_IMGS[k] = keyBlackToAlpha(im); };
    im.onerror = () => {};
    im.src = "Assets/Furniture/" + k + ".png";
  }
})();
// recorte por INUNDAÇÃO a partir das bordas: só o preto CONECTADO à borda
// vira transparente — sombras escuras DENTRO do móvel sobrevivem intactas
function keyBlackToAlpha(im) {
  const w = im.naturalWidth, h = im.naturalHeight;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, w, h);
  const p = d.data;
  const THR = 16;                      // "quase preto" conta como fundo
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, 0); stack.push(x, h - 1); }
  for (let y = 0; y < h; y++) { stack.push(0, y); stack.push(w - 1, y); }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = y * w + x;
    if (seen[i]) continue;
    seen[i] = 1;
    const o = i * 4;
    if ((p[o] + p[o + 1] + p[o + 2]) / 3 > THR) continue;  // bateu no móvel
    p[o + 3] = 0;
    stack.push(x + 1, y); stack.push(x - 1, y);
    stack.push(x, y + 1); stack.push(x, y - 1);
  }
  g.putImageData(d, 0, 0);
  return cv;
}
function furnArt(name) { return FURN_IMGS[name] || furnSprite(name); }

const FURN_SPRS = {};
function furnSprite(name) {
  if (FURN_SPRS[name]) return FURN_SPRS[name];
  const w = 180, h = 130;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const r = mulberry32(FURN_TYPES[name].id * 99991);
  const T = penTools(g, r);
  g.lineCap = "round";

  function box(x, y, bw, bh) {
    // silhueta escura + hachura de contorno
    g.fillStyle = "rgba(6,6,8,0.92)";
    g.fillRect(x, y, bw, bh);
    g.strokeStyle = "rgba(210,210,218,0.55)";
    g.lineWidth = 1.4;
    g.strokeRect(x + (r() - 0.5) * 2, y + (r() - 0.5) * 2, bw, bh);
    for (let i = 0; i < bw * bh / 90; i++) {
      const hx = x + r() * bw, hy = y + r() * bh;
      T.pen(hx, hy, hx + 4 + r() * 5, hy + 3 + r() * 4, 0.06 + r() * 0.12, 0.6);
    }
  }

  if (name === "sofa") {
    box(10, 55, 160, 45);                 // assento
    box(10, 30, 160, 28);                 // encosto
    box(4, 45, 18, 55); box(158, 45, 18, 55); // braços
  } else if (name === "mesa") {
    box(15, 45, 150, 16);                 // tampo
    box(28, 61, 10, 55); box(142, 61, 10, 55); // pernas
    T.pen(30, 45, 150, 43, 0.5, 1.4);
  } else if (name === "estante") {
    box(20, 6, 140, 118);
    for (let s2 = 1; s2 <= 3; s2++)
      T.pen(24, 6 + s2 * 29, 156, 4 + s2 * 29 + (r() - 0.5) * 3, 0.55, 1.3);
    for (let b = 0; b < 14; b++) {        // livros: tracinhos verticais
      const bx2 = 28 + r() * 120, by2 = 10 + (r() * 4 | 0) * 29;
      T.pen(bx2, by2 + 4, bx2 + (r() - 0.5) * 2, by2 + 22, 0.25 + r() * 0.3, 1.5 + r());
    }
  } else if (name === "cadeira") {
    box(55, 15, 60, 55);                  // encosto alto
    box(50, 70, 70, 16);                  // assento
    box(54, 86, 8, 38); box(108, 86, 8, 38);
  } else if (name === "piano") {
    box(15, 25, 150, 70);                 // corpo
    g.fillStyle = "rgba(225,225,232,0.8)";
    for (let k = 0; k < 14; k++) g.fillRect(24 + k * 9.5, 78, 7, 14); // teclas
    T.pen(15, 25, 100, 8, 0.5, 2);        // tampa aberta
    box(30, 95, 10, 30); box(140, 95, 10, 30);
  } else if (name === "cama") {
    box(10, 60, 160, 45);                 // colchão
    box(10, 25, 24, 80);                  // cabeceira
    T.pen(40, 70, 160, 68, 0.4, 1.2);     // dobra do lençol
  } else if (name === "poltrona") {
    box(40, 20, 100, 45);                 // encosto alto
    box(35, 62, 110, 35);                 // assento
    box(22, 48, 20, 55); box(138, 48, 20, 55); // braços
  } else if (name === "bau") {
    box(25, 55, 130, 55);                 // corpo
    T.pen(25, 55, 155, 52, 0.55, 2);      // linha da tampa
    T.pen(85, 55, 85, 80, 0.5, 1.5);      // fecho
    g.strokeStyle = "rgba(230,230,238,0.6)";
    g.strokeRect(80, 72, 16, 14);         // cadeado
  } else if (name === "escrivaninha") {
    box(15, 40, 150, 14);                 // tampo
    box(100, 54, 60, 60);                 // gaveteiro
    T.pen(104, 72, 156, 70, 0.45, 1.2);   // gavetas
    T.pen(104, 90, 156, 88, 0.45, 1.2);
    box(24, 54, 10, 60);                  // perna
  } else if (name === "relogio") {
    box(55, 8, 70, 116);                  // caixa alta
    g.strokeStyle = "rgba(235,235,242,0.7)";
    g.lineWidth = 2;
    g.beginPath(); g.arc(90, 34, 20, 0, 7); g.stroke();   // mostrador
    T.pen(90, 34, 90, 22, 0.7, 1.5);      // ponteiros parados
    T.pen(90, 34, 100, 38, 0.7, 1.5);     // ...na hora errada
    T.pen(90, 62, 90, 104, 0.4, 1.2);     // pêndulo
    g.beginPath(); g.arc(90, 108, 7, 0, 7); g.stroke();
  } else if (name === "espelho") {
    // moldura oval de pé; o reflexo é só um borrão (de propósito)
    g.strokeStyle = "rgba(225,225,233,0.7)";
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(90, 55, 42, 52, 0, 0, 7); g.stroke();
    const sm = g.createRadialGradient(90, 55, 4, 90, 55, 40);
    sm.addColorStop(0, "rgba(120,125,140,0.35)");
    sm.addColorStop(1, "rgba(40,42,50,0.1)");
    g.fillStyle = sm;
    g.beginPath(); g.ellipse(90, 55, 40, 50, 0, 0, 7); g.fill();
    box(78, 106, 24, 10);                 // pé
    T.pen(66, 124, 114, 122, 0.5, 2);     // base
  } else if (name === "berco") {
    box(25, 50, 130, 55);                 // caixa
    for (let k = 0; k < 7; k++)           // grades verticais
      T.pen(32 + k * 17, 28, 33 + k * 17, 52, 0.55, 1.8);
    T.pen(25, 26, 155, 28, 0.6, 2);       // barra de cima
  }
  FURN_SPRS[name] = cv;
  return cv;
}
