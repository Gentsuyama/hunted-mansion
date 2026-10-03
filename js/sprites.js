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

    // olhos: menores, tortos entre si e FUNDOS — buracos, não óculos
    const eL = { x: -R * 0.40, y: -R * (0.05 + r() * 0.09), rr: R * (0.20 + r() * 0.05) };
    const eR = { x:  R * 0.38, y: -R * (0.09 + r() * 0.09), rr: R * (0.18 + r() * 0.06) };

    const faceRx = R * 1.02, faceRy = R * 1.18;
    const wash = g.createRadialGradient(0, -R * 0.05, R * 0.15, 0, -R * 0.05, R * 1.1);
    wash.addColorStop(0, "rgba(150,150,160,0.52)");
    wash.addColorStop(0.7, "rgba(118,118,130,0.30)");
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
      const overFace = !wild && r() < 0.42;
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
      const halo = g.createRadialGradient(e.x, e.y, e.rr * 0.4, e.x, e.y, e.rr * 1.3);
      halo.addColorStop(0, "rgba(0,0,0,1)");
      halo.addColorStop(0.75, "rgba(0,0,0,0.7)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = halo;
      g.beginPath(); g.arc(e.x, e.y, e.rr * 1.3, 0, 7); g.fill();
      // a órbita: um buraco torto (nunca um círculo perfeito — círculo vira desenho animado)
      g.fillStyle = "#000";
      g.beginPath();
      const tilt = (r() - 0.5) * 0.7, ex = e.rr * (0.8 + r() * 0.3), ey = e.rr * (1.1 + r() * 0.4);
      for (let i2 = 0; i2 <= 26; i2++) {
        const a = i2 / 26 * 6.283, wob = 1 + (r() - 0.5) * 0.2;
        const px = Math.cos(a) * ex * wob, py = Math.sin(a) * ey * wob;
        const X = e.x + px * Math.cos(tilt) - py * Math.sin(tilt), Y = e.y + px * Math.sin(tilt) + py * Math.cos(tilt);
        i2 ? g.lineTo(X, Y) : g.moveTo(X, Y);
      }
      g.closePath(); g.fill();

      for (let k = 0; k < 5; k++) {                     // aro apagado: só sugere a órbita
        const rad2 = e.rr * (1.0 + r() * 0.3);
        g.strokeStyle = `rgba(232,232,240,${0.04 + r() * 0.14})`;
        g.lineWidth = 0.5 + r() * 0.6;
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
      for (let k = 0; k < 10; k++) {
        const a = r() * 6.283;
        const r0 = e.rr * (1.0 + r() * 0.15), r1 = r0 + 2 + r() * 5;
        pen(e.x + Math.cos(a) * r0, e.y + Math.sin(a) * r0,
            e.x + Math.cos(a) * r1, e.y + Math.sin(a) * r1,
            0.04 + r() * 0.1, 0.6);
      }
      for (let k = 0; k < 30; k++) {                    // olheiras: a órbita afunda
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
      // um talho fino, cantos caídos, costurado com pontos escuros — nunca um sorriso
      const mw = R * (0.42 + r() * 0.12), my = R * 0.70;
      g.save();
      g.translate((r() - 0.5) * R * 0.1, my);
      g.rotate((r() - 0.5) * 0.2);
      g.strokeStyle = "rgba(0,0,0,0.9)"; g.lineWidth = 2.2 + r() * 1.2; g.lineCap = "round";
      g.beginPath(); g.moveTo(-mw / 2, -R * 0.03);
      g.quadraticCurveTo(0, R * 0.02, mw / 2, -R * 0.04 + r() * R * 0.02); g.stroke();
      dark(-mw / 2, -R * 0.03, -mw / 2 - R * 0.06, R * 0.06, 0.8, 1.6);   // os cantos caem
      dark(mw / 2, -R * 0.04, mw / 2 + R * 0.05, R * 0.07, 0.8, 1.6);
      const nT = 4 + (r() * 3 | 0);
      for (let i2 = 0; i2 < nT; i2++) {
        const tx2 = -mw * 0.38 + (i2 / (nT - 1)) * mw * 0.76;
        dark(tx2, -R * 0.07, tx2 + (r() - 0.5) * 1.5, R * 0.04, 0.6, 1.1);
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
      // os CANTOS ficam abaixo do meio: boca caída, escancarada — não um sorriso
      g.moveTo(-mw2 / 2, mhh * 1.3);
      g.quadraticCurveTo(0, -mhh * 0.9, mw2 / 2, mhh * 1.3 + (r() - 0.5) * 4);
      g.quadraticCurveTo(0, mhh * 2.4, -mw2 / 2, mhh * 1.3);
      g.closePath(); g.fill();
      const nT3 = 4 + (r() * 4 | 0);                   // poucos dentes, apagados
      for (let i2 = 0; i2 < nT3; i2++) {
        const t = (i2 + 0.5) / nT3;
        const tx2 = -mw2 * 0.4 + t * mw2 * 0.8;
        const topY = mhh * 0.2, botY = mhh * (0.8 + Math.sin(t * Math.PI) * 1.2);
        pen(tx2, topY, tx2 + (r() - 0.5) * 2, botY, 0.12 + r() * 0.18, 0.8 + r() * 0.4);
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
// --- ECOS do Gemini (Assets/Ecos/eco01.jpg, eco02.jpg, … — guia, Etapa 8): corpo inteiro
// sobre preto. Carrega em sequência até faltar um. Cada imagem vira um sprite ESPECTRAL:
// fundo transparente, sem cor (prata), pés dissolvendo no chão; metade sai espelhada.
const ECO_IMGS = [];
(function loadEcoImgs(n) {
  if (n > 60) return;
  const im = new Image();
  im.onload = () => { ECO_IMGS.push(ecoEspectral(im)); loadEcoImgs(n + 1); };
  im.onerror = () => {};
  im.src = "Assets/Ecos/eco" + String(n).padStart(2, "0") + ".jpg";
})(1);
function ecoEspectral(im, espelha) {
  const base = keyBlackToAlpha(im), w = base.width, h = base.height;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  if (espelha) { g.translate(w, 0); g.scale(-1, 1); }
  g.drawImage(base, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const d = g.getImageData(0, 0, w, h), p = d.data;
  for (let y = 0; y < h; y++) {
    const f = y > h * 0.72 ? 1 - (y - h * 0.72) / (h * 0.28) : 1;   // os pés somem
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = Math.min(255, (0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) * 1.12);
      p[i] = v; p[i + 1] = v; p[i + 2] = Math.min(255, v * 1.04);
      p[i + 3] = p[i + 3] * f * f;
    }
  }
  g.putImageData(d, 0, 0);
  cv._aspect = w / h; cv._hscale = 1.0; cv._img = im;
  return cv;
}
function ghostSprite(seed) {
  if (ECO_IMGS.length) {
    const spr = ECO_IMGS[(seed * ECO_IMGS.length) | 0];
    if ((seed * 977) % 1 < 0.5) return spr;
    return spr._esp || (spr._esp = ecoEspectral(spr._img, true));
  }
  if (GHOST_POOL.length) return GHOST_POOL[(seed * GHOST_POOL.length) | 0];
  return makeGhostSprite(seed);
}

// ------------------------------------------------------------------
// Itens e efeitos
// ------------------------------------------------------------------
let FILM_SPR = null, GLOW_SPR = null, GLOW_AZUL = null;

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

function makeGlowSprite(cor) {
  const s = 128;
  const cv = document.createElement("canvas");
  cv.width = s; cv.height = s;
  const g = cv.getContext("2d");
  const rad = g.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2 - 2);
  const c = cor === "azul" ? "120,170,255" : "255,250,235";
  rad.addColorStop(0, `rgba(${c},0.60)`);
  rad.addColorStop(0.6, `rgba(${c},0.22)`);
  rad.addColorStop(1, `rgba(${c},0)`);
  g.fillStyle = rad; g.fillRect(0, 0, s, s);
  return cv;
}

// ------------------------------------------------------------------
// MÓVEIS — tipos e sprites de foto (nanquim simples)
// ------------------------------------------------------------------
// def: ch = caractere no mapa; w,h em células; ph/pw = proporção na foto
// w/h = footprint em células no mapa; hC = altura relativa do móvel: na foto
// vale hC × FOTO.FURN_K células (2,9), contra um pé-direito de FOTO.WALL (6) —
// hC 1.0 dá meia parede. A largura vem do footprint projetado.
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
    im.src = "Assets/Furniture/" + k + ".jpg";
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
  // recorta ao conteúdo (bounding box): âncora no chão e proporção corretas,
  // sem as margens transparentes inflando o tamanho
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (p[(y * w + x) * 4 + 3] > 0) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
  g.putImageData(d, 0, 0);
  if (maxX < 0) return cv;
  const cw2 = maxX - minX + 1, ch2 = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = cw2; out.height = ch2;
  out.getContext("2d").drawImage(cv, minX, minY, cw2, ch2, 0, 0, cw2, ch2);
  return out;
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

// ==================================================================
// AS 7 CORRENTES — sprites: borrão de lente rachada, retratos
// aprisionadores (Gemini com fallback procedural) e correntes da porta
// ==================================================================

// marca ilegível (lente rachada): riscos que sugerem escrita sem revelar
let SMUDGE_SPR = null;
function smudgeSprite() {
  if (SMUDGE_SPR) return SMUDGE_SPR;
  const cv = document.createElement("canvas");
  cv.width = 90; cv.height = 120;
  const g = cv.getContext("2d");
  g.strokeStyle = "rgba(235,235,242,0.55)";
  g.lineWidth = 3; g.lineCap = "round";
  const rr = mulberry32(777);
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    let x = 14 + rr() * 60, y = 16 + rr() * 80;
    g.moveTo(x, y);
    for (let k = 0; k < 3; k++)
      g.lineTo(x += (rr() - 0.4) * 26, y += (rr() - 0.3) * 20);
    g.stroke();
  }
  // rachadura da lente por cima
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(8, 30);
  for (let k = 1; k <= 5; k++) g.lineTo(8 + k * 16, 30 + (rr() - 0.5) * 50);
  g.stroke();
  return (SMUDGE_SPR = cv);
}

// retratos: Assets/Retratos/<alma>.jpg (Gemini, fundo preto) ou fallback
const RET_IMGS = {}, RET_SPRS = {}, RET_ORIG = {};
// (lista fixa: sprites.js carrega antes de souls.js)
const RET_SOUL_IDS = ["tomas", "cecilia", "bento", "olivia",
                      "hospede", "aurora", "blackwood"];
(function loadRetImgs() {
  for (const k of RET_SOUL_IDS) {
    const im = new Image();
    im.onload = () => { RET_IMGS[k] = keyBlackToAlpha(im); RET_ORIG[k] = im; };
    im.onerror = () => {};
    im.src = "Assets/Retratos/" + k + ".jpg";
  }
})();
function retratoSprite(soulId) {
  if (RET_IMGS[soulId]) return RET_IMGS[soulId];
  if (RET_SPRS[soulId]) return RET_SPRS[soulId];
  const cv = document.createElement("canvas");
  cv.width = 110; cv.height = 140;
  const g = cv.getContext("2d");
  // moldura oval antiga
  g.strokeStyle = "rgba(220,215,200,0.85)";
  g.lineWidth = 5;
  g.strokeRect(6, 6, 98, 128);
  g.lineWidth = 2;
  g.beginPath(); g.ellipse(55, 70, 38, 52, 0, 0, 7); g.stroke();
  // vulto sépia dentro (cabeça + ombros de criança)
  const sep = g.createRadialGradient(55, 58, 4, 55, 70, 48);
  sep.addColorStop(0, "rgba(190,170,130,0.5)");
  sep.addColorStop(1, "rgba(60,50,35,0.25)");
  g.fillStyle = sep;
  g.beginPath(); g.ellipse(55, 70, 36, 50, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(30,26,20,0.75)";
  g.beginPath(); g.arc(55, 55, 14, 0, 7); g.fill();          // cabeça
  g.beginPath(); g.ellipse(55, 92, 24, 18, 0, 0, 7); g.fill(); // ombros
  // olhos claros (a alma olha para fora)
  g.fillStyle = "rgba(240,240,235,0.8)";
  g.fillRect(49, 52, 3, 3); g.fillRect(60, 52, 3, 3);
  RET_SPRS[soulId] = cv;
  return cv;
}

// ALMAS na foto: Assets/Almas/<alma>.jpg (Gemini, fundo preto, corpo inteiro).
// O brilho vira transparência — a aparição sai translúcida, nunca recortada.
function keyLumToAlpha(im) {
  const w = im.naturalWidth, h = im.naturalHeight;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, w, h), p = d.data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const m = Math.max(p[o], p[o + 1], p[o + 2]);
      const a = Math.max(0, Math.min(255, (m - 14) * 4));
      p[o + 3] = a;
      if (a > 40) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  g.putImageData(d, 0, 0);
  if (maxX < 0) return cv;
  const cw2 = maxX - minX + 1, ch2 = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = cw2; out.height = ch2;
  out.getContext("2d").drawImage(cv, minX, minY, cw2, ch2, 0, 0, cw2, ch2);
  return out;
}
const SOUL_IMGS = {};
(function loadSoulImgs() {
  for (const k of RET_SOUL_IDS) {
    const im = new Image();
    im.onload = () => {
      const cv = keyLumToAlpha(im);
      cv._aspect = cv.width / cv.height; cv._hscale = 1;
      SOUL_IMGS[k] = cv;
    };
    im.onerror = () => {};
    im.src = "Assets/Almas/" + k + ".jpg";
  }
})();
function soulArt(id) { return SOUL_IMGS[id] || null; }

// correntes espectrais da porta: 7 no total, as quebradas pendem soltas
const CHAIN_SPRS = {};
function chainsSprite(broken) {
  if (CHAIN_SPRS[broken]) return CHAIN_SPRS[broken];
  const cv = document.createElement("canvas");
  cv.width = 150; cv.height = 190;
  const g = cv.getContext("2d");
  const rr = mulberry32(1234 + broken);
  const elo = (x1, y1, x2, y2, alpha) => {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, d / 15 | 0);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = (k + 0.85) / n;
      const mx = x1 + (x2 - x1) * t, my = y1 + (y2 - y1) * t;
      const mx2 = x1 + (x2 - x1) * t2, my2 = y1 + (y2 - y1) * t2;
      const ex = (mx + mx2) / 2, ey = (my + my2) / 2;
      const ang = Math.atan2(my2 - my, mx2 - mx);
      // sombra + elo claro espectral (lê como corrente, não como grade)
      g.strokeStyle = `rgba(20,30,55,${alpha})`;
      g.lineWidth = 5;
      g.beginPath(); g.ellipse(ex, ey, 7.5, 4.5, ang, 0, 7); g.stroke();
      g.strokeStyle = `rgba(185,210,255,${alpha})`;
      g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(ex, ey, 7.5, 4.5, ang, 0, 7); g.stroke();
    }
  };
  const passo = 150 / CHAINS_TOTAL;
  for (let i = 0; i < CHAINS_TOTAL; i++) {
    const y = 18 + i * passo + (rr() - 0.5) * 6;
    if (i < broken) {
      // corrente quebrada: duas pontas caídas, apagadas
      elo(4, y, 36 + rr() * 12, y + 30 + rr() * 18, 0.25);
      elo(146, y, 114 - rr() * 12, y + 30 + rr() * 18, 0.25);
    } else {
      elo(4, y, 146, y + (rr() - 0.5) * 14, 0.8);
    }
  }
  // cadeado central fantasmagórico
  if (broken < CHAINS_TOTAL) {
    g.strokeStyle = "rgba(20,30,55,0.8)";
    g.lineWidth = 6;
    g.strokeRect(58, 84, 34, 28);
    g.strokeStyle = "rgba(195,220,255,0.9)";
    g.lineWidth = 3;
    g.strokeRect(58, 84, 34, 28);
    g.beginPath(); g.arc(75, 84, 12, Math.PI, 0); g.stroke();
    g.fillStyle = "rgba(195,220,255,0.9)";
    g.beginPath(); g.arc(75, 97, 3.5, 0, 7); g.fill();
  }
  CHAIN_SPRS[broken] = cv;
  return cv;
}

// ==================================================================
// UI do Gemini (opcional, com fallback procedural):
// câmera do HUD em PEÇAS (Assets/UI/cam_<parte>.jpg, fundo preto) e o
// fundo do álbum de fotos (Assets/UI/album.jpg, página dupla aberta)
// ==================================================================
const CAM_IMGS = {};
(function loadCamImgs() {
  for (const k of ["corpo", "tampa", "lente", "obturador", "flash", "passado"]) {
    const im = new Image();
    im.onload = () => { CAM_IMGS[k] = keyBlackToAlpha(im); };
    im.onerror = () => {};
    im.src = "Assets/UI/cam_" + k + ".jpg";
  }
})();
let ALBUM_IMG = null;
(function loadAlbumImg() {
  const im = new Image();
  im.onload = () => { ALBUM_IMG = im; };   // fundo inteiro: sem recorte
  im.onerror = () => {};
  im.src = "Assets/UI/album.jpg";
})();
// fundos de tela (imagem = cenário; o código desenha os controles por cima)
const UI_IMGS = {};
(function loadUiImgs() {
  for (const k of ["titulo", "cofre", "fusebox", "quartoescuro", "elevador",
                   "final_alvorada", "final_cinzas", "final_fotografo"]) {
    const im = new Image();
    im.onload = () => { UI_IMGS[k] = im; };
    im.onerror = () => {};
    im.src = "Assets/UI/" + k + ".jpg";
  }
})();
// desenha cobrindo o retângulo (corta sobras, mantém proporção)
function drawCover(c2, im, x, y, w, h) {
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  c2.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// ESCADA no nicho (para a FOTO): degraus em perspectiva, estilo nanquim
const STAIR_SPRS = {};
function stairSprite(up) {
  const k = up ? "u" : "d";
  if (STAIR_SPRS[k]) return STAIR_SPRS[k];
  // o vão na parede com uma escada DE VERDADE dentro: degraus emendados (piso e
  // espelho), afunilando em perspectiva, corrimão com balaústres e pilar de arranque
  const W = 110, H = 240, vx = W / 2;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.fillStyle = "rgb(5,5,6)"; g.fillRect(8, 0, W - 16, H);
  const trap = (yA, wA, yB, wB, fill) => {          // trapézio centrado no vão
    g.fillStyle = fill; g.beginPath();
    g.moveTo(vx - wA / 2, yA); g.lineTo(vx + wA / 2, yA);
    g.lineTo(vx + wB / 2, yB); g.lineTo(vx - wB / 2, yB); g.closePath(); g.fill();
  };
  const cor = (l, a) => `rgba(${(206 * l) | 0},${(190 * l) | 0},${(152 * l) | 0},${a === undefined ? 1 : a})`;
  const W0 = W - 22;
  const corrimao = (xA, yA, xB, yB, yBaseA, yBaseB) => {
    g.strokeStyle = cor(0.68); g.lineCap = "round";
    g.lineWidth = 3; g.beginPath(); g.moveTo(xA, yA); g.lineTo(xB, yB); g.stroke();
    g.lineWidth = 1.3;
    for (let i = 0; i <= 7; i++) {                   // balaústres
      const t = i / 7, bx = xA + (xB - xA) * t;
      g.beginPath(); g.moveTo(bx, yA + (yB - yA) * t); g.lineTo(bx, yBaseA + (yBaseB - yBaseA) * t); g.stroke();
    }
    g.lineWidth = 5; g.beginPath(); g.moveTo(xA, yA - 8); g.lineTo(xA, yBaseA + 2); g.stroke();   // pilar
  };
  if (up) {
    // SOBE: espelhos (faces verticais) empilhados, cada um mais estreito, até o patamar
    let y = H - 6, w = W0, l = 0.80;
    for (let i = 0; i < 9; i++) {
      const hr = 24 * Math.pow(0.84, i), ht = 7 * Math.pow(0.84, i);   // espelho + beiral
      const w1 = w * 0.955;
      trap(y, w, y - hr, w1, cor(l));
      trap(y - hr, w1, y - hr - ht, w1 * 0.985, cor(Math.min(1, l * 1.4)));   // o beiral pega mais flash
      g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(vx - w1 / 2, y - hr - ht - 1, w1, 1.2);
      y -= hr + ht; w = w1 * 0.985; l *= 0.9;
    }
    const pg = g.createLinearGradient(0, y, 0, y - 56);
    pg.addColorStop(0, cor(0.2)); pg.addColorStop(1, "rgba(5,5,6,0)");
    trap(y, w, y - 56, w * 0.9, pg);                                   // o patamar some no escuro
    corrimao(vx - W0 / 2 + 5, H - 58, vx - w / 2 + 3, y - 34, H - 6, y);
  } else {
    // DESCE: a aresta do patamar e os pisos descendo, encolhendo e escurecendo
    const tg = g.createLinearGradient(0, 0, 0, 50);
    tg.addColorStop(0, "rgba(44,42,38,0.95)"); tg.addColorStop(1, "rgba(16,15,14,0.95)");
    g.fillStyle = tg; g.fillRect(vx - W0 / 2, 0, W0, 50);              // parede do fundo do poço
    g.fillStyle = cor(0.55); g.fillRect(vx - W0 / 2, 50, W0, 4);        // a aresta do primeiro degrau
    let y = 54, w = W0, l = 0.62;
    for (let i = 0; i < 9; i++) {
      const ht = 20 * Math.pow(0.86, i), hr = 4 * Math.pow(0.86, i);
      const w1 = w * 0.93;
      trap(y, w, y + ht, w1, cor(l));                                   // o piso
      trap(y + ht, w1, y + ht + hr, w1 * 0.99, cor(l * 0.3));           // o espelho, na sombra
      y += ht + hr; w = w1 * 0.99; l *= 0.8;
    }
    const pg = g.createLinearGradient(0, y, 0, H);
    pg.addColorStop(0, cor(0.05)); pg.addColorStop(1, "rgba(0,0,0,0)");
    trap(y, w, H, w * 0.9, pg);
    corrimao(vx + W0 / 2 - 5, 16, vx + w / 2 + 2, y - 28, 54, y);
  }
  // batentes de pedra
  g.fillStyle = "rgb(74,66,54)"; g.fillRect(0, 0, 9, H); g.fillRect(W - 9, 0, 9, H);
  g.strokeStyle = "rgba(220,212,190,0.55)"; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(9.5, 0); g.lineTo(9.5, H); g.moveTo(W - 9.5, 0); g.lineTo(W - 9.5, H); g.stroke();
  STAIR_SPRS[k] = cv;
  return cv;
}

// o SINAL do Hóspede: um olho riscado, rabiscado na parede
let SINAL_SPR = null;
function sinalSprite() {
  if (SINAL_SPR) return SINAL_SPR;
  const cv = document.createElement("canvas");
  cv.width = 110; cv.height = 110;
  const g = cv.getContext("2d");
  const rr = mulberry32(666);
  g.strokeStyle = "rgba(235,235,242,0.8)";
  g.lineWidth = 3; g.lineCap = "round";
  // amêndoa do olho (dois arcos tremidos)
  for (const dir of [1, -1]) {
    g.beginPath();
    g.moveTo(12, 55);
    for (let k = 1; k <= 8; k++)
      g.lineTo(12 + k * 10.7,
               55 + dir * Math.sin(k / 8 * Math.PI) * 26 + (rr() - 0.5) * 3);
    g.stroke();
  }
  // íris vazia (aro rabiscado, centro NEGRO)
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.arc(55 + (rr() - 0.5) * 3, 55 + (rr() - 0.5) * 3,
          13 + k * 2 + (rr() - 0.5) * 2, rr() * 2, rr() * 2 + 5.5);
    g.stroke();
  }
  // o RISCO atravessado (fundo e raivoso, 3 passadas)
  g.lineWidth = 5;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.moveTo(18 + (rr() - 0.5) * 8, 14 + (rr() - 0.5) * 8);
    g.lineTo(94 + (rr() - 0.5) * 8, 98 + (rr() - 0.5) * 8);
    g.stroke();
  }
  return (SINAL_SPR = cv);
}

// o Hóspede NA FOTO: corpo de rabisco com um rosto humano LISO demais
// (sem rosto no mundo; na foto, um rosto que não devia estar ali)
let HOSPEDE_SPR = null;
function hospedeSprite() {
  if (HOSPEDE_SPR) return HOSPEDE_SPR;
  const base = ghostSprite(0.751);
  const cv = document.createElement("canvas");
  cv.width = base.width; cv.height = base.height;
  const g = cv.getContext("2d");
  g.drawImage(base, 0, 0);
  // rosto fotográfico suave sobre a cabeça rabiscada — errado de propósito
  const fx = cv.width / 2, fy = cv.height * 0.16;
  const fr = cv.width * 0.13;
  const grad = g.createRadialGradient(fx, fy, fr * 0.2, fx, fy, fr);
  grad.addColorStop(0, "rgba(225,210,195,0.95)");
  grad.addColorStop(0.8, "rgba(180,165,150,0.85)");
  grad.addColorStop(1, "rgba(120,105,95,0)");
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(fx, fy, fr * 0.85, fr * 1.1, 0, 0, 7); g.fill();
  // olhos escuros fixos + boca neutra (nenhuma expressão. nenhuma.)
  g.fillStyle = "rgba(25,20,18,0.9)";
  g.beginPath(); g.ellipse(fx - fr * 0.34, fy - fr * 0.12, fr * 0.11, fr * 0.14, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(fx + fr * 0.34, fy - fr * 0.12, fr * 0.11, fr * 0.14, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(70,55,50,0.8)";
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(fx - fr * 0.3, fy + fr * 0.5);
  g.lineTo(fx + fr * 0.3, fy + fr * 0.5); g.stroke();
  cv._aspect = base._aspect; cv._hscale = base._hscale;
  return (HOSPEDE_SPR = cv);
}

// ==================================================================
// PEÇAS DE CENÁRIO que só a foto mostra: cofre, quadro de força,
// bancada de revelação, cavalete e a cadeira do Fotógrafo.
// Assets/Props/<nome>.jpg (Gemini, fundo preto) substitui o desenho.
// ==================================================================
const PROP_IMGS = {}, PROP_SPRS = {};
(function loadPropImgs() {
  for (const k of ["cofre", "quadro", "bancada", "cavalete", "cadeira", "lamparina", "grade", "candelabro"]) {
    const im = new Image();
    im.onload = () => { PROP_IMGS[k] = keyBlackToAlpha(im); };
    im.onerror = () => {};
    im.src = "Assets/Props/" + k + ".jpg";
  }
})();
function propSprite(name) {
  if (PROP_IMGS[name]) return PROP_IMGS[name];
  if (PROP_SPRS[name]) return PROP_SPRS[name];
  const dims = { cofre: [150, 170], quadro: [130, 170], bancada: [300, 170],
                 cavalete: [130, 220], cadeira: [140, 210],
                 lamparina: [120, 220], grade: [200, 300] }[name] || [150, 150];
  const cv = document.createElement("canvas");
  cv.width = dims[0]; cv.height = dims[1];
  const g = cv.getContext("2d");
  const r = mulberry32(name.charCodeAt(0) * 7919 + name.length);
  g.lineCap = "round"; g.lineJoin = "round";
  // corpo em cinza de foto antiga, contorno escuro, luz vinda da frente
  const box = (x, y, w, h, tone) => {
    const gr = g.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, `rgb(${tone + 26},${tone + 24},${tone + 20})`);
    gr.addColorStop(1, `rgb(${tone - 14},${tone - 15},${tone - 16})`);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.strokeStyle = "rgba(8,7,6,0.9)"; g.lineWidth = 2.2;
    g.strokeRect(x, y, w, h);
    for (let i = 0; i < w * h / 160; i++) {
      g.fillStyle = `rgba(0,0,0,${(r() * 0.2).toFixed(3)})`;
      g.fillRect(x + r() * w, y + r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  };
  const linha = (x0, y0, x1, y1, lw, cor) => {
    g.strokeStyle = cor || "rgba(8,7,6,0.9)"; g.lineWidth = lw;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  };
  if (name === "cofre") {
    box(14, 20, 122, 132, 84);
    box(26, 32, 98, 108, 104);                       // a porta
    g.strokeStyle = "rgba(8,7,6,0.9)"; g.lineWidth = 2.4;
    g.fillStyle = "rgb(150,146,136)";
    g.beginPath(); g.arc(64, 86, 20, 0, 7); g.fill(); g.stroke();   // o disco
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * 6.283;
      linha(64 + Math.cos(a) * 14, 86 + Math.sin(a) * 14,
            64 + Math.cos(a) * 19, 86 + Math.sin(a) * 19, 1.2);
    }
    linha(98, 70, 98, 104, 5, "rgb(160,156,146)");   // a alavanca
    linha(98, 70, 110, 70, 5, "rgb(160,156,146)");
    box(18, 152, 16, 12, 60); box(116, 152, 16, 12, 60);
  } else if (name === "quadro") {
    box(16, 14, 98, 142, 78);
    box(26, 26, 78, 76, 46);                         // o miolo aberto
    for (let i = 0; i < 3; i++) {                    // três soquetes
      g.fillStyle = "rgb(150,140,110)";
      g.beginPath(); g.arc(44 + i * 21, 50, 7, 0, 7); g.fill();
      g.strokeStyle = "rgba(8,7,6,0.9)"; g.lineWidth = 1.6; g.stroke();
    }
    linha(40, 84, 90, 84, 3, "rgb(120,116,108)");
    box(88, 108, 12, 34, 120);                       // a chave geral
    linha(114, 20, 126, 30, 2.2); linha(126, 30, 126, 150, 2.2);    // tampa aberta
    linha(126, 150, 114, 156, 2.2);
  } else if (name === "bancada") {
    // a bancada de revelação: tampo claro, três bandejas com líquido, vidros, a
    // lâmpada vermelha pendurada e o varal com fotos secando
    box(8, 74, 284, 18, 118);                         // tampo
    box(20, 92, 14, 74, 82); box(266, 92, 14, 74, 82); // pernas
    box(34, 130, 232, 8, 72);                         // travessa
    for (let i = 0; i < 3; i++) {                     // bandejas com líquido
      const bx = 26 + i * 86;
      box(bx, 56, 72, 20, 152);
      const liq = g.createLinearGradient(bx, 58, bx, 74);
      liq.addColorStop(0, "rgba(96,74,64,0.95)"); liq.addColorStop(1, "rgba(28,22,20,0.98)");
      g.fillStyle = liq; g.fillRect(bx + 4, 60, 64, 12);
      g.fillStyle = "rgba(255,240,230,0.35)"; g.fillRect(bx + 8, 61, 30, 2);   // o reflexo da lâmpada
    }
    for (const [vx, vh, vw] of [[232, 46, 14], [252, 36, 12], [10, 30, 10]]) {   // vidros de química
      box(vx, 74 - vh, vw, vh, 98);
      box(vx + vw / 2 - 3, 74 - vh - 8, 6, 9, 72);
    }
    linha(150, 0, 150, 20, 1.4);                      // o fio da lâmpada vermelha
    box(145, 20, 10, 8, 60);
    const halo = g.createRadialGradient(150, 34, 2, 150, 34, 44);
    halo.addColorStop(0, "rgba(255,90,70,0.95)"); halo.addColorStop(0.3, "rgba(255,60,40,0.45)");
    halo.addColorStop(1, "rgba(255,60,40,0)");
    g.fillStyle = halo; g.fillRect(104, -10, 92, 90);
    g.fillStyle = "rgb(255,130,110)"; g.beginPath(); g.arc(150, 33, 6, 0, 7); g.fill();
    linha(10, 12, 112, 16, 1.4);                      // o varal, à esquerda
    for (let i = 0; i < 3; i++) {
      const hx = 16 + i * 32;
      g.fillStyle = "rgb(178,172,158)"; g.fillRect(hx, 16, 22, 26);
      g.strokeStyle = "rgba(8,7,6,0.9)"; g.lineWidth = 1.2; g.strokeRect(hx, 16, 22, 26);
      g.fillStyle = "rgba(20,18,16,0.8)"; g.fillRect(hx + 3, 19, 16, 14);
    }
  } else if (name === "cavalete") {
    linha(64, 10, 20, 212, 6, "rgb(92,82,66)");      // as três pernas
    linha(64, 10, 108, 212, 6, "rgb(92,82,66)");
    linha(64, 30, 70, 206, 5, "rgb(70,62,50)");
    box(22, 132, 86, 9, 96);                         // o apoio
    box(28, 36, 74, 96, 156);                        // a tela
  } else if (name === "grade") {
    // a grade pantográfica do elevador: losangos de ferro, o breu do poço atrás
    g.fillStyle = "rgba(4,4,5,0.94)"; g.fillRect(14, 30, 172, 264);
    box(6, 22, 188, 12, 70);                         // verga
    box(6, 22, 10, 276, 60); box(184, 22, 10, 276, 60);   // montantes
    g.strokeStyle = "rgb(120,116,104)"; g.lineWidth = 2.4;
    for (let i = -1; i < 7; i++) {
      const x0 = 16 + i * 28;
      g.beginPath();
      for (let j = 0; j <= 8; j++) {
        const y = 34 + j * 32.5, x = x0 + (j % 2 ? 28 : 0);
        j ? g.lineTo(Math.max(16, Math.min(184, x)), y) : g.moveTo(Math.max(16, Math.min(184, x)), y);
      }
      g.stroke();
      g.beginPath();
      for (let j = 0; j <= 8; j++) {
        const y = 34 + j * 32.5, x = x0 + (j % 2 ? 0 : 28);
        j ? g.lineTo(Math.max(16, Math.min(184, x)), y) : g.moveTo(Math.max(16, Math.min(184, x)), y);
      }
      g.stroke();
    }
    // o mostrador de andares: um arco com ponteiro
    g.strokeStyle = "rgb(170,160,130)"; g.lineWidth = 2.2;
    g.beginPath(); g.arc(100, 22, 18, Math.PI, 0); g.stroke();
    linha(100, 22, 110, 8, 2, "rgb(200,190,150)");
  } else if (name === "lamparina") {
    box(14, 118, 92, 10, 96);                        // tampo da mesinha
    box(22, 128, 9, 88, 62); box(89, 128, 9, 88, 62);
    box(30, 160, 60, 6, 56);                         // travessa
    // a lamparina a óleo: base, vidro bojudo, chaminé e alça
    box(42, 102, 36, 16, 70);
    const vid = g.createRadialGradient(60, 76, 3, 60, 76, 30);
    vid.addColorStop(0, "rgb(255,244,200)");
    vid.addColorStop(0.45, "rgb(236,186,96)");
    vid.addColorStop(1, "rgba(120,84,40,0.85)");
    g.fillStyle = vid;
    g.beginPath(); g.ellipse(60, 78, 21, 27, 0, 0, 7); g.fill();
    g.strokeStyle = "rgba(8,7,6,0.9)"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "rgb(255,252,232)";                // a chama
    g.beginPath(); g.ellipse(60, 82, 5, 11, 0, 0, 7); g.fill();
    box(50, 40, 20, 14, 78);                         // chaminé
    g.strokeStyle = "rgba(60,54,46,0.95)"; g.lineWidth = 2.6;
    g.beginPath(); g.arc(60, 46, 30, Math.PI * 1.12, Math.PI * 1.88); g.stroke();   // alça
  } else if (name === "cadeira") {
    box(34, 12, 72, 104, 62);                        // espaldar alto
    box(42, 22, 56, 82, 82);                         // estofado
    box(26, 112, 88, 22, 76);                        // assento
    box(18, 86, 16, 48, 58); box(106, 86, 16, 48, 58);   // braços
    box(30, 134, 10, 66, 50); box(100, 134, 10, 66, 50); // pernas
    g.strokeStyle = "rgba(8,7,6,0.9)"; g.lineWidth = 2.2;
    g.beginPath(); g.arc(70, 12, 12, Math.PI, 0); g.stroke();       // remate
  }
  return (PROP_SPRS[name] = cv);
}

// ==================================================================
// AS SETE ALMAS NA FOTO — cada uma com o SEU corpo.
// O busto vem do retrato aprovado (a pessoa que ela foi), translúcido e
// frio; o corpo é rabisco de nanquim com o traço que conta a história dela.
// Assets/Almas/<alma>.jpg (Gemini, corpo inteiro) substitui tudo isto.
// Nunca sai igual duas vezes: há variantes, sorteadas a cada foto.
// ==================================================================
// recorte do busto dentro do retrato (frações da imagem)
const SOUL_BUSTO = {
  tomas:     { cx: 0.505, cy: 0.530, rx: 0.290, ry: 0.350 },
  cecilia:   { cx: 0.513, cy: 0.500, rx: 0.270, ry: 0.340 },
  bento:     { cx: 0.505, cy: 0.500, rx: 0.290, ry: 0.330 },
  olivia:    { cx: 0.520, cy: 0.500, rx: 0.250, ry: 0.330 },
  hospede:   { cx: 0.513, cy: 0.500, rx: 0.250, ry: 0.330 },
  aurora:    { cx: 0.503, cy: 0.500, rx: 0.280, ry: 0.330 },
  blackwood: { cx: 0.513, cy: 0.500, rx: 0.270, ry: 0.340 },
};
// o busto a nanquim do streamer, na folha de referência (rosto e busto inteiro)
const STREAMER_ROSTO = { cx: 0.741, cy: 0.565, rx: 0.105, ry: 0.200 };
const STREAMER_BUSTO = { cx: 0.781, cy: 0.485, rx: 0.200, ry: 0.430 };

// a imagem vira aparição: o claro fica, o escuro some, e a máscara acompanha a
// forma de um busto (estreita na cabeça, larga nos ombros) para o fundo do
// retrato não vir junto. opts: corte (limiar de brilho), oval (máscara oval)
function bustoEspectral(im, B, larg, opts) {
  opts = opts || {};
  const iw = im.naturalWidth, ih = im.naturalHeight;
  const sw = B.rx * 2 * iw, sh = B.ry * 2 * ih;
  const w = larg | 0, h = (larg * sh / sw) | 0;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.drawImage(im, (B.cx - B.rx) * iw, (B.cy - B.ry) * ih, sw, sh, 0, 0, w, h);
  let d;
  try { d = g.getImageData(0, 0, w, h); } catch (e) { return null; }
  const p = d.data, c0 = opts.corte || 44, forca = opts.forca || 1;
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    // meia-largura da figura nesta altura: cabeça estreita, ombros largos
    const meia = opts.oval ? Math.sqrt(Math.max(0, 1 - (v * 2 - 1) * (v * 2 - 1))) * 0.98
                           : 0.40 + 0.52 * ss(0.24, 0.56, v);
    const my = ss(0, 0.07, v) * (1 - ss(0.74, 1, v));
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const ax = Math.abs((x + 0.5) / w * 2 - 1);
      const m = (1 - ss(meia - 0.16, meia + 0.04, ax)) * my;
      const lum = Math.max(p[o], p[o + 1], p[o + 2]);
      const a = Math.max(0, Math.min(1, (lum - c0) / 80)) * m * forca;
      p[o] = lum * 0.90 + p[o] * 0.08;
      p[o + 1] = lum * 0.93 + p[o + 1] * 0.06;
      p[o + 2] = Math.min(255, lum * 1.0 + 8);
      p[o + 3] = a * 255;
    }
  }
  g.putImageData(d, 0, 0);
  return cv;
}

// o Hóspede não tem rosto no mundo; na foto ele aparece com o rosto do STREAMER
let HOSPEDE_SEU_ROSTO = true;
const SOUL_SPRS = {};
function soulSprite(id) {
  const art = soulArt(id);
  if (art) return art;
  const im = RET_ORIG[id] || null;
  const key = id + ((Math.random() * 2) | 0) + (im ? "a" : "p");
  if (SOUL_SPRS[key]) return SOUL_SPRS[key];
  const W = 240, H = 420, cx = W / 2;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.lineCap = "round"; g.lineJoin = "round";
  const r = mulberry32((id.length * 7919 + key.charCodeAt(key.length - 2) * 131 + id.charCodeAt(0)) | 0);
  const T = penTools(g, r);
  // massa escura por trás do traço: nasce transparente no alto, borda roída
  const massa = (larT, yTop, larB, yBot, a) => {
    const gr = g.createLinearGradient(0, yTop, 0, yBot);
    gr.addColorStop(0, "rgba(4,4,6,0)");
    gr.addColorStop(0.16, `rgba(4,4,6,${a})`);
    gr.addColorStop(0.86, `rgba(4,4,6,${a * 0.9})`);
    gr.addColorStop(1, "rgba(4,4,6,0)");
    g.fillStyle = gr;
    g.beginPath();
    const N = 12;
    for (let i = 0; i <= N; i++) {
      const t = i / N, lar = larT + (larB - larT) * t + (r() - 0.5) * 7;
      const x = cx - lar, y = yTop + (yBot - yTop) * t;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    for (let i = N; i >= 0; i--) {
      const t = i / N, lar = larT + (larB - larT) * t + (r() - 0.5) * 7;
      g.lineTo(cx + lar, yTop + (yBot - yTop) * t);
    }
    g.closePath(); g.fill();
  };
  const fios = (x0, x1, y0, y1, n, abre, a0) => {   // fios que caem (vestido, véu, pano)
    for (let i = 0; i < n; i++) {
      const t = r(), xa = x0 + (x1 - x0) * t;
      const xb = cx + (xa - cx) * abre + (r() - 0.5) * 8;
      const ya = y0 + r() * 14, yb = y1 - r() * (y1 - y0) * 0.25;
      T.pen(xa, ya, xb, yb, a0 * (0.4 + r() * 0.9), 0.6 + r() * 0.7);
    }
  };
  const vestido = (yTop, larT, larB, n) => {
    massa(larT, yTop, larB, H - 6, 0.84);
    fios(cx - larT, cx + larT, yTop + 10, H - 8, n, larB / larT, 0.26);
    for (let i = 0; i < 26; i++) {        // barra esfiapada
      const x = cx - larB + r() * larB * 2;
      T.pen(x, H - 24 - r() * 8, x + (r() - 0.5) * 6, H - 4 - r() * 6, 0.14 + r() * 0.2, 0.7);
    }
  };
  const pernas = (yTop, abre, gross, yPe) => {
    for (const sd of [-1, 1]) {
      const x0 = cx + sd * 15, x1 = cx + sd * (abre + r() * 4);
      T.arm(x0, yTop, x0 + sd * (4 + r() * 6), (yTop + yPe) / 2, x1, yPe, gross);
      T.pen(x1 - 6, yPe + 2, x1 + sd * 16, yPe + 4 + r() * 2, 0.5, 2.4);   // o sapato
    }
  };

  // ---- o corpo (atrás do busto) ----
  if (id === "tomas") {
    pernas(250, 19, 4.2, 370);            // os pés NÃO tocam o chão
    massa(34, 196, 30, 276, 0.8);         // calça curta
    fios(cx - 28, cx + 28, 206, 272, 22, 1.05, 0.24);
    for (let k = 0; k < 2; k++) {         // ele ainda conta até cem: riscos de contagem no ar
      const bx = k ? 14 : W - 52, by = 104 + k * 64 + r() * 18;
      for (let i = 0; i < 4; i++) T.pen(bx + i * 7, by, bx + i * 7 + 1, by + 20, 0.6, 1.5);
      T.pen(bx - 4, by + 15, bx + 26, by + 4, 0.6, 1.5);
    }
  } else if (id === "cecilia") {
    vestido(190, 46, 86, 110);
    fios(cx - 62, cx - 30, 30, H - 14, 46, 1.5, 0.22);      // o véu desce dos dois lados
    fios(cx + 30, cx + 62, 30, H - 14, 46, 1.5, 0.22);
    for (let i = 0; i < 16; i++) {        // pétalas secas do buquê, caindo
      const x = cx - 18 + r() * 50, y = 240 + r() * 150;
      T.pen(x, y, x + 3 + r() * 4, y + 2 + r() * 3, 0.3 + r() * 0.35, 1.6);
    }
  } else if (id === "bento") {
    pernas(286, 28, 8, 398);
    massa(50, 186, 44, 312, 0.82);        // avental
    fios(cx - 46, cx + 46, 200, 304, 40, 0.95, 0.22);
    for (let i = 0; i < 3; i++) {         // o molho de chaves na cintura
      g.strokeStyle = `rgba(232,232,240,${0.45 + r() * 0.3})`; g.lineWidth = 1.4;
      g.beginPath(); g.arc(cx + 46 + i * 3, 264 + i * 9, 5 + r() * 2, 0, 7); g.stroke();
      T.pen(cx + 46 + i * 3, 269 + i * 9, cx + 48 + i * 3, 286 + i * 9, 0.5, 1.2);
    }
  } else if (id === "olivia") {
    vestido(190, 44, 78, 100);
    // as mãos dela: compridas demais, ainda procurando o teclado
    T.arm(cx - 56, 178, cx - 92, 236, cx - 84, 292, 4.5);
    T.hand(cx - 84, 300, 64, Math.PI * 0.52, 0.10, 0.22, 5);
    T.arm(cx + 56, 178, cx + 94, 232, cx + 88, 286, 4.5);
    T.hand(cx + 88, 294, 64, Math.PI * 0.48, -0.10, 0.22, 5);
  } else if (id === "hospede") {
    pernas(300, 24, 7, 400);
    massa(48, 180, 58, 330, 0.84);        // sobretudo
    fios(cx - 46, cx + 46, 196, 322, 44, 1.2, 0.2);
  } else if (id === "aurora") {
    vestido(184, 56, 96, 130);
    for (let i = 0; i < 3; i++) {         // os lugares que a SUA câmera já olhou
      const fx = i === 0 ? 16 : i === 1 ? W - 60 : 26, fy = 64 + i * 96 + r() * 14;
      g.save(); g.translate(fx + 22, fy + 18); g.rotate((r() - 0.5) * 0.5);
      g.strokeStyle = `rgba(232,232,240,${0.35 + r() * 0.25})`; g.lineWidth = 1.4;
      g.strokeRect(-22, -18, 44, 36); g.strokeRect(-17, -14, 34, 24);
      g.restore();
    }
  } else if (id === "blackwood") {
    // o tripé nasce das costas dele: três pernas a mais
    for (const dx of [-78, 6, 82])
      T.pen(cx + dx * 0.14, 190, cx + dx, H - 6, 0.5, 2.6);
    pernas(292, 22, 6, 400);
    massa(52, 150, 74, 340, 0.7);         // o pano preto do fotógrafo
    fios(cx - 50, cx + 50, 170, 336, 60, 1.4, 0.16);
  }

  // ---- o busto: a pessoa do retrato ----
  let ok = false;
  if (im && SOUL_BUSTO[id]) {
    const b = bustoEspectral(im, SOUL_BUSTO[id], id === "tomas" ? 176 : 196);
    if (b) { g.drawImage(b, cx - b.width / 2, id === "tomas" ? 18 : 2); ok = true; }
    if (b && id === "hospede" && HOSPEDE_SEU_ROSTO && typeof STREAMER_IMG !== "undefined" && STREAMER_IMG) {
      // ele não tem rosto. NA FOTO, usa o SEU.
      const f = bustoEspectral(STREAMER_IMG, STREAMER_ROSTO, 44, { corte: 84, oval: true, forca: 0.7 });
      if (f) g.drawImage(f, 117 - f.width / 2, 63 - f.height / 2);
    }
  }
  if (!ok) {                              // sem o retrato: crânio de rabisco, como os ecos
    T.torso(cx, 96, 230, 62, 40, 0);
    T.skull(cx, 62, 40, (r() - 0.5) * 0.3, id === "cecilia" || id === "olivia" ? 1.4 : 0.6);
  }

  // ---- o que só existe por cima ----
  if (id === "bento") {                   // a lamparina dele ainda acende
    const lg = g.createRadialGradient(cx + 2, 196, 2, cx + 2, 196, 46);
    lg.addColorStop(0, "rgba(255,246,214,0.85)");
    lg.addColorStop(0.4, "rgba(240,224,180,0.3)");
    lg.addColorStop(1, "rgba(240,224,180,0)");
    g.fillStyle = lg; g.fillRect(cx - 46, 150, 96, 96);
  } else if (id === "aurora") {           // o camafeu: o primeiro retrato
    const cg = g.createRadialGradient(cx + 1, 136, 1, cx + 1, 136, 16);
    cg.addColorStop(0, "rgba(255,250,236,0.95)");
    cg.addColorStop(1, "rgba(255,250,236,0)");
    g.fillStyle = cg; g.fillRect(cx - 16, 120, 34, 34);
  } else if (id === "blackwood") {        // a lente dele dispara
    const fx = cx + 30, fy = 168;
    const fg = g.createRadialGradient(fx, fy, 1, fx, fy, 30);
    fg.addColorStop(0, "rgba(255,255,255,0.98)");
    fg.addColorStop(0.3, "rgba(255,255,255,0.4)");
    fg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = fg; g.fillRect(fx - 30, fy - 30, 60, 60);
    T.pen(fx - 46, fy, fx + 46, fy, 0.7, 1.2); T.pen(fx, fy - 34, fx, fy + 34, 0.7, 1.2);
  } else if (id === "hospede" && !(HOSPEDE_SEU_ROSTO && ok && typeof STREAMER_IMG !== "undefined" && STREAMER_IMG)) {
    for (let i = 0; i < 16; i++) {        // o rosto raspado da emulsão: riscos em cima
      const y = 52 + r() * 40;
      T.pen(cx - 22 + r() * 8, y, cx + 16 + r() * 10, y + (r() - 0.5) * 8, 0.3 + r() * 0.4, 0.8 + r());
    }
  }
  // riscos por cima de tudo: a emulsão não aguenta a presença
  for (let i = 0; i < 26; i++) {
    const x = 20 + r() * (W - 40), y = 10 + r() * 240;
    T.pen(x, y, x + (r() - 0.5) * 34, y + 6 + r() * 26, 0.05 + r() * 0.12, 0.6);
  }
  cv._aspect = W / H; cv._hscale = 1.06;
  return (SOUL_SPRS[key] = cv);
}

// o eco de moletom: quem caiu na live passada
let ECO_STREAMER = null;
function ecoStreamerSprite() {
  const temArte = typeof STREAMER_IMG !== "undefined" && !!STREAMER_IMG;
  if (ECO_STREAMER && ECO_STREAMER._arte === temArte) return ECO_STREAMER;
  const W = 230, H = 410, cx = W / 2;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.lineCap = "round";
  const r = mulberry32(54054);
  const T = penTools(g, r);
  for (const sd of [-1, 1]) {             // pernas
    T.arm(cx + sd * 18, 280, cx + sd * 24, 340, cx + sd * 26, 396, 8);
    T.pen(cx + sd * 20, 398, cx + sd * 42, 400, 0.5, 2.4);
  }
  // moletom: ombros e tronco em massa escura, riscado
  const gr = g.createLinearGradient(0, 118, 0, 300);
  gr.addColorStop(0, "rgba(4,4,6,0.9)"); gr.addColorStop(0.85, "rgba(4,4,6,0.82)");
  gr.addColorStop(1, "rgba(4,4,6,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(cx - 66, 300); g.lineTo(cx - 70, 170);
  g.quadraticCurveTo(cx - 64, 128, cx, 122);
  g.quadraticCurveTo(cx + 64, 128, cx + 70, 170);
  g.lineTo(cx + 66, 300); g.closePath(); g.fill();
  for (let i = 0; i < 80; i++) {
    const x = cx - 62 + r() * 124, y = 140 + r() * 146;
    T.pen(x, y, x + (r() - 0.5) * 8, y + 10 + r() * 22, 0.08 + r() * 0.2, 0.7);
  }
  // o braço do celular, ainda estendido — a live dele nunca caiu de verdade
  T.arm(cx + 62, 172, cx + 96, 150, cx + 98, 92, 6);
  g.strokeStyle = "rgba(240,240,246,0.85)"; g.lineWidth = 2;
  g.strokeRect(cx + 88, 56, 20, 36);
  const lg = g.createRadialGradient(cx + 98, 46, 1, cx + 98, 46, 24);
  lg.addColorStop(0, "rgba(255,255,255,0.9)"); lg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = lg; g.fillRect(cx + 72, 20, 52, 52);
  // o capuz: uma sombra em volta do rosto
  g.fillStyle = "rgba(4,4,6,0.92)";
  g.beginPath(); g.ellipse(cx, 78, 56, 66, 0, 0, 7); g.fill();
  let ok = false;
  if (temArte) {
    const b = bustoEspectral(STREAMER_IMG, STREAMER_ROSTO, 84, { corte: 96, oval: true, forca: 0.6 });
    if (b) { g.drawImage(b, cx - b.width / 2, 84 - b.height / 2); ok = true; }
  }
  if (!ok) T.skull(cx, 84, 34, 0.1, 0.3);
  for (let i = 0; i < 60; i++) {          // a borda do capuz, em rabisco
    const a = Math.PI * (0.9 + r() * 1.2), rr = 0.92 + r() * 0.12;
    const x = cx + Math.cos(a) * 56 * rr, y = 78 + Math.sin(a) * 66 * rr;
    T.pen(x, y, x + (r() - 0.5) * 10, y + 4 + r() * 12, 0.12 + r() * 0.3, 0.8);
  }
  T.pen(cx - 12, 142, cx - 14, 190, 0.5, 1.3); T.pen(cx + 12, 142, cx + 14, 190, 0.5, 1.3);   // cordões
  cv._aspect = W / H; cv._hscale = 1.02; cv._arte = temArte;
  return (ECO_STREAMER = cv);
}

// AS MOLDURAS DO ATELIÊ (só na foto): o estado de cada alma vira o estado do
// quadro — dormindo: coberto por um pano; desperta ou presa: o retrato;
// libertada: moldura VAZIA; queimada: carvão.
const MOLD_SPRS = {};
function molduraSprite(id, estado) {
  const temArte = !!RET_ORIG[id];
  const k = id + estado + (temArte ? "a" : "p");
  if (MOLD_SPRS[k]) return MOLD_SPRS[k];
  const cv = document.createElement("canvas");
  cv.width = 130; cv.height = 160;
  const g = cv.getContext("2d");
  const r = mulberry32(id.length * 97 + estado.length * 13 + id.charCodeAt(1));
  g.fillStyle = "#33261a"; g.fillRect(0, 0, 130, 160);
  g.strokeStyle = "rgba(168,134,84,0.95)"; g.lineWidth = 4; g.strokeRect(5, 5, 120, 150);
  g.strokeStyle = "rgba(20,12,6,0.9)"; g.lineWidth = 2; g.strokeRect(12, 12, 106, 136);
  g.fillStyle = "#0c0a08"; g.fillRect(14, 14, 102, 132);
  if (estado === "freed") {                 // vazia: só o papel de fundo, mais claro no meio
    const lg = g.createRadialGradient(65, 76, 6, 65, 76, 70);
    lg.addColorStop(0, "rgb(206,196,170)"); lg.addColorStop(1, "rgb(110,100,82)");
    g.fillStyle = lg; g.fillRect(14, 14, 102, 132);
  } else if (estado === "burned") {         // carvão: buraco de borda irregular
    g.fillStyle = "rgb(70,60,48)"; g.fillRect(14, 14, 102, 132);
    g.fillStyle = "#050404";
    g.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = i / 18 * 6.283, rr = 34 + r() * 22;
      const x = 65 + Math.cos(a) * rr * 0.9, y = 80 + Math.sin(a) * rr * 1.15;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(190,96,40,0.7)"; g.lineWidth = 1.6; g.stroke();
  } else if (estado === "dormant") {        // pano por cima: ainda não é hora
    const lg = g.createLinearGradient(0, 14, 0, 146);
    lg.addColorStop(0, "rgb(120,112,98)"); lg.addColorStop(1, "rgb(70,64,56)");
    g.fillStyle = lg; g.fillRect(10, 10, 110, 140);
    g.strokeStyle = "rgba(20,16,12,0.5)"; g.lineWidth = 1.4;
    for (let i = 0; i < 7; i++) {
      const x = 18 + i * 16 + r() * 6;
      g.beginPath(); g.moveTo(x, 12); g.quadraticCurveTo(x + (r() - 0.5) * 14, 80, x + (r() - 0.5) * 10, 148); g.stroke();
    }
  } else if (temArte) {                     // o retrato (desperta ou presa)
    const im = RET_ORIG[id], B = SOUL_BUSTO[id];
    const iw = im.naturalWidth, ih = im.naturalHeight;
    g.drawImage(im, (B.cx - B.rx) * iw, (B.cy - B.ry) * ih, B.rx * 2 * iw, B.ry * 2 * ih, 14, 14, 102, 132);
  } else {
    g.fillStyle = "rgba(190,170,130,0.5)"; g.fillRect(14, 14, 102, 132);
    g.fillStyle = "rgba(30,26,20,0.8)";
    g.beginPath(); g.arc(65, 62, 20, 0, 7); g.fill();
    g.beginPath(); g.ellipse(65, 118, 34, 26, 0, 0, 7); g.fill();
  }
  return (MOLD_SPRS[k] = cv);
}
