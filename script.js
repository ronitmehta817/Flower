// Perfect 2D ocean-ripple water (background) + a real 3D lotus floating on
// top as a transparent Three.js overlay.
import * as THREE from "three";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* =====================================================================
   LAYER 1 — 2D OCEAN WATER with ripple refraction (the good water)
   ===================================================================== */
const CAP = 720;
const DAMP = 0.965;
const REFRACT = 0.30;
const MAX_OFF = 14;

function buildOcean(w, h) {
  const wc = document.createElement("canvas");
  wc.width = w; wc.height = h;
  const wctx = wc.getContext("2d");
  const img = wctx.createImageData(w, h);
  const D = img.data;
  const surface = [104, 206, 206]; // bright, clear turquoise
  const midSea = [28, 126, 158];
  const deep = [8, 58, 92];
  const hi = [232, 253, 250];      // foam / caustic light
  const mix = (a, b, t) => a + (b - a) * t;
  const m3 = (c1, c2, t, k) => mix(c1[k], c2[k], t);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    let r, g, b;
    if (v < 0.5) {
      const t = v / 0.5;
      r = m3(surface, midSea, t, 0); g = m3(surface, midSea, t, 1); b = m3(surface, midSea, t, 2);
    } else {
      const t = (v - 0.5) / 0.5;
      r = m3(midSea, deep, t, 0); g = m3(midSea, deep, t, 1); b = m3(midSea, deep, t, 2);
    }
    const fade = 1 - v * 0.7;
    for (let x = 0; x < w; x++) {
      let net =
        (Math.sin(x * 0.05 + Math.sin(y * 0.02) * 2.2) +
          Math.sin(y * 0.06 + Math.sin(x * 0.025) * 2.2) +
          Math.sin((x + y) * 0.03)) / 3;
      const caust = Math.pow(Math.max(0, net), 2.4) * fade;
      const ray =
        Math.pow(Math.max(0, Math.sin((x * 0.5 - y * 0.18) * 0.018 + 1)), 8) *
        (1 - v) * 0.3;
      const light = caust * 1.05 + ray;
      const i = (y * w + x) << 2;
      D[i] = clamp(mix(r, hi[0], light), 0, 255);
      D[i + 1] = clamp(mix(g, hi[1], light), 0, 255);
      D[i + 2] = clamp(mix(b, hi[2], light), 0, 255);
      D[i + 3] = 255;
    }
  }
  wctx.putImageData(img, 0, 0);
  return wc;
}

// sky behind the water — revealed as the view tilts toward the horizon
const skyCanvas = document.createElement("canvas");
skyCanvas.className = "sky-canvas";
document.querySelector(".stage").prepend(skyCanvas);
const skctx = skyCanvas.getContext("2d");
let clouds = [];
let SKW = 0, SKH = 0;
const BG_POS = [0, 0.4, 0.52, 0.62, 1];
// sunny clear-day sky: deep blue up top -> bright pale glow at the horizon
const SKY_C = [[58, 132, 206], [120, 184, 228], [214, 238, 248], [156, 206, 232], [96, 162, 206]];
const UND_C = [[18, 60, 78], [10, 40, 56], [7, 30, 44], [5, 20, 32], [2, 9, 16]];
const lerpC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function backdropResize() {
  SKW = skyCanvas.width = window.innerWidth;
  SKH = skyCanvas.height = window.innerHeight;
  clouds = [];
  for (let i = 0; i < 7; i++) {
    clouds.push({ x: Math.random(), y: 0.05 + Math.random() * 0.3, rw: 0.12 + Math.random() * 0.2 });
  }
}

// uw = 0 -> sky (with clouds + horizon glow); uw = 1 -> murky underwater depth
function drawBackdrop(uw) {
  const g = skctx.createLinearGradient(0, 0, 0, SKH);
  for (let i = 0; i < BG_POS.length; i++) {
    const c = lerpC(SKY_C[i], UND_C[i], uw);
    g.addColorStop(BG_POS[i], `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`);
  }
  skctx.fillStyle = g;
  skctx.fillRect(0, 0, SKW, SKH);
  const ca = 1 - uw;
  if (ca > 0.02) {
    // the sun: warm glow with a bright core (upper-right)
    const sx = SKW * 0.74, sy = SKH * 0.2, sr = Math.min(SKW, SKH) * 0.42;
    const sg = skctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    sg.addColorStop(0, `rgba(255,250,225,${(0.95 * ca).toFixed(3)})`);
    sg.addColorStop(0.12, `rgba(255,244,200,${(0.85 * ca).toFixed(3)})`);
    sg.addColorStop(0.4, `rgba(255,238,190,${(0.25 * ca).toFixed(3)})`);
    sg.addColorStop(1, "rgba(255,238,190,0)");
    skctx.fillStyle = sg;
    skctx.fillRect(0, 0, SKW, SKH);

    // puffy white clouds
    for (const cl of clouds) {
      const cx = cl.x * SKW, cy = cl.y * SKH, rw = cl.rw * SKW, rh = rw * 0.4;
      const cg = skctx.createRadialGradient(cx, cy, 0, cx, cy, rw);
      cg.addColorStop(0, `rgba(255,255,255,${(0.7 * ca).toFixed(3)})`);
      cg.addColorStop(0.5, `rgba(245,250,255,${(0.35 * ca).toFixed(3)})`);
      cg.addColorStop(1, "rgba(245,250,255,0)");
      skctx.save();
      skctx.translate(cx, cy);
      skctx.scale(1, rh / rw);
      skctx.fillStyle = cg;
      skctx.beginPath();
      skctx.arc(0, 0, rw, 0, Math.PI * 2);
      skctx.fill();
      skctx.restore();
    }
  }
}
backdropResize();

// underwater sun rays (light shafts) — only visible once submerged
const raysCanvas = document.createElement("canvas");
raysCanvas.className = "rays-canvas";
document.querySelector(".stage").appendChild(raysCanvas);
const rayctx = raysCanvas.getContext("2d");
let RAW = 0, RAH = 0;
const beams = [];
(function beamsInit() {
  const N = 16;
  for (let i = 0; i < N; i++) {
    const f = (i + Math.random() * 0.6) / N;
    beams.push({
      ang: (f * 2 - 1) * 0.95,        // fan angle from vertical (~ +/-54deg)
      half: 0.006 + Math.random() * 0.02, // angular half-width (thin shaft)
      a: 0.09 + Math.random() * 0.16,
      sp: 0.3 + Math.random() * 0.6,
      ph: Math.random() * 6.28,
      sway: 0.02 + Math.random() * 0.04,
    });
  }
})();
function raysResize() {
  RAW = raysCanvas.width = window.innerWidth;
  RAH = raysCanvas.height = window.innerHeight;
}
function drawRays(uw, t, waterTopFrac, sunXFrac) {
  rayctx.clearRect(0, 0, RAW, RAH);
  if (uw < 0.02) return;
  const y0 = (waterTopFrac || 0) * RAH; // the waterline
  const span = RAH - y0;
  const ox = RAW * (sunXFrac == null ? 0.5 : sunXFrac); // enters through a gap
  const oy = y0;
  const L = Math.hypot(RAW, span) * 1.25;

  rayctx.save();
  rayctx.beginPath();
  rayctx.rect(0, y0, RAW, span);        // clip so rays live only in the water
  rayctx.clip();

  // shafts fanning out from the bright surface point
  for (const b of beams) {
    const ang = b.ang + Math.sin(t * b.sp + b.ph) * b.sway;
    const a = b.a * uw * (0.6 + 0.4 * Math.sin(t * b.sp * 1.7 + b.ph));
    if (a <= 0.002) continue;
    const e1 = ang - b.half, e2 = ang + b.half;
    const cx = ox + Math.sin(ang) * L, cy = oy + Math.cos(ang) * L;
    const g = rayctx.createLinearGradient(ox, oy, cx, cy);
    g.addColorStop(0, `rgba(238,249,255,${a.toFixed(3)})`);
    g.addColorStop(0.45, `rgba(212,240,255,${(a * 0.45).toFixed(3)})`);
    g.addColorStop(1, "rgba(212,240,255,0)");
    rayctx.fillStyle = g;
    rayctx.beginPath();
    rayctx.moveTo(ox, oy);
    rayctx.lineTo(ox + Math.sin(e1) * L, oy + Math.cos(e1) * L);
    rayctx.lineTo(ox + Math.sin(e2) * L, oy + Math.cos(e2) * L);
    rayctx.closePath();
    rayctx.fill();
  }

  // bright bloom where the light enters the surface
  const bloom = rayctx.createRadialGradient(ox, oy, 0, ox, oy, span * 0.34);
  bloom.addColorStop(0, `rgba(255,255,250,${(0.55 * uw).toFixed(3)})`);
  bloom.addColorStop(0.4, `rgba(240,250,255,${(0.18 * uw).toFixed(3)})`);
  bloom.addColorStop(1, "rgba(240,250,255,0)");
  rayctx.fillStyle = bloom;
  rayctx.fillRect(0, y0, RAW, span);

  rayctx.restore();
}
raysResize();

const waterCanvas = document.getElementById("water");
const wctx = waterCanvas.getContext("2d");
const srcCanvas = document.createElement("canvas");
const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });

let WW = 0, WH = 0, wOut = null, wPrev = null, wCur = null, wSrc = null;
let waveRow = null, waveCol = null; // continuous ocean swell offsets

function waterRebuild() {
  const vw = window.innerWidth || 800, vh = window.innerHeight || 600;
  const asp = vw / vh;
  if (asp >= 1) { WW = CAP; WH = Math.round(CAP / asp); }
  else { WH = CAP; WW = Math.round(CAP * asp); }
  waterCanvas.width = WW; waterCanvas.height = WH;
  srcCanvas.width = WW; srcCanvas.height = WH;
  wOut = wctx.createImageData(WW, WH);
  wPrev = new Float32Array(WW * WH);
  wCur = new Float32Array(WW * WH);
  waveRow = new Float32Array(WW);
  waveCol = new Float32Array(WH);
  srcCtx.drawImage(buildOcean(WW, WH), 0, 0);
  wSrc = srcCtx.getImageData(0, 0, WW, WH);
}

// continuous traveling swell (cheap, separable) added on top of the ripples
function fillWaves(t) {
  for (let x = 0; x < WW; x++) {
    waveRow[x] = 3.2 * Math.sin(x * 0.045 + t * 1.7) + 2.0 * Math.sin(x * 0.017 - t * 1.0 + 1.3);
  }
  for (let y = 0; y < WH; y++) {
    waveCol[y] = 3.2 * Math.sin(y * 0.05 + t * 1.4) + 2.0 * Math.sin(y * 0.02 - t * 0.8 + 0.6);
  }
}

function waterDisturb(px, py, power, radius) {
  const x0 = clamp((px | 0) - radius, 1, WW - 2);
  const x1 = clamp((px | 0) + radius, 1, WW - 2);
  const y0 = clamp((py | 0) - radius, 1, WH - 2);
  const y1 = clamp((py | 0) + radius, 1, WH - 2);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - px, dy = y - py;
      if (dx * dx + dy * dy <= radius * radius) wPrev[y * WW + x] += power;
    }
  }
}

function waterStep() {
  for (let y = 1; y < WH - 1; y++) {
    let i = y * WW + 1;
    for (let x = 1; x < WW - 1; x++, i++) {
      const v = (wPrev[i - 1] + wPrev[i + 1] + wPrev[i - WW] + wPrev[i + WW]) * 0.5 - wCur[i];
      wCur[i] = v * DAMP;
    }
  }
  const tmp = wPrev; wPrev = wCur; wCur = tmp;
}

function waterRefract() {
  const s = wSrc.data, d = wOut.data;
  for (let y = 1; y < WH - 1; y++) {
    let i = y * WW + 1;
    for (let x = 1; x < WW - 1; x++, i++) {
      let xo = (wPrev[i - 1] - wPrev[i + 1]) * REFRACT + waveCol[y];
      let yo = (wPrev[i - WW] - wPrev[i + WW]) * REFRACT + waveRow[x];
      if (xo > MAX_OFF) xo = MAX_OFF; else if (xo < -MAX_OFF) xo = -MAX_OFF;
      if (yo > MAX_OFF) yo = MAX_OFF; else if (yo < -MAX_OFF) yo = -MAX_OFF;
      let sx = x + (xo | 0), sy = y + (yo | 0);
      if (sx < 0) sx = 0; else if (sx >= WW) sx = WW - 1;
      if (sy < 0) sy = 0; else if (sy >= WH) sy = WH - 1;
      const si = (sy * WW + sx) << 2, di = i << 2;
      const hl = clamp(1 + (wPrev[i] - wPrev[i - WW]) * 0.06, 0.85, 1.4);
      d[di] = clamp(s[si] * hl, 0, 255);
      d[di + 1] = clamp(s[si + 1] * hl, 0, 255);
      d[di + 2] = clamp(s[si + 2] * hl, 0, 255);
      d[di + 3] = 255;
    }
  }
}

let lastPt = null;
function toWater(e) {
  const r = waterCanvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * WW, y: ((e.clientY - r.top) / r.height) * WH };
}
window.addEventListener("pointermove", (e) => {
  const p = toWater(e);
  if (p.x < 0 || p.x >= WW || p.y < 0 || p.y >= WH) { lastPt = null; return; }
  if (lastPt) {
    const steps = Math.min(6, Math.ceil(Math.hypot(p.x - lastPt.x, p.y - lastPt.y) / 6));
    for (let k = 1; k <= steps; k++) {
      waterDisturb(lastPt.x + ((p.x - lastPt.x) * k) / steps,
        lastPt.y + ((p.y - lastPt.y) * k) / steps, 70, 3);
    }
  } else waterDisturb(p.x, p.y, 90, 3);
  lastPt = p;
}, { passive: true });
window.addEventListener("pointerleave", () => (lastPt = null));
window.addEventListener("pointerdown", (e) => {
  const p = toWater(e);
  waterDisturb(p.x, p.y, 520, 6);
});

/* =====================================================================
   LAYER 2 — 3D LOTUS (transparent Three.js overlay)
   ===================================================================== */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0); // transparent -> water shows through
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("lotus").appendChild(renderer.domElement);

const projV = new THREE.Vector3();
let sunX = 0.5; // screen-x (0..1) where the rays enter — kept in a gap

scene.add(new THREE.HemisphereLight(0xcfeaff, 0x16323a, 1.05));
const sun = new THREE.DirectionalLight(0xfff3d6, 1.5); // warm sunlight
sun.position.set(7, 10, 4);
scene.add(sun);
const fill = new THREE.PointLight(0xffd9a8, 0.45, 30);
fill.position.set(-4, 3, 5);
scene.add(fill);

function makePetalGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.40, 0.32, 0.17, 0.92, 0, 1);
  s.bezierCurveTo(-0.17, 0.92, -0.40, 0.32, 0, 0);
  const g = new THREE.ShapeGeometry(s, 20);
  const p = g.attributes.position;
  const colors = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, -0.18 * x * x - 0.06 * Math.sin(y * Math.PI)); // gentle cup
    const tip = 0.55 + 0.45 * clamp(y, 0, 1); // tips brighter
    colors.push(tip, tip, tip);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

const petalList = [];          // for the scroll-driven blooming animation
const CLOSED_TILT = 88;        // petals nearly upright (a closed bud)
let bloomP = 0;                // eased bloom progress (0 = bud, 1 = open)
let camP = 0;                  // eased camera progress (0 = top, 1 = bottom)
const BLOOM_END = 0.4;         // fraction of scroll used for blooming
const hintEl = document.getElementById("hint");
const lerp = (a, b, t) => a + (b - a) * t;

function buildLotus() {
  const group = new THREE.Group();
  const petalGeo = makePetalGeometry();
  const deg = Math.PI / 180;
  const layers = [
    { count: 13, tilt: 14, len: 2.15, wid: 1.05, y: 0.0, color: 0xffa6c4 },
    { count: 11, tilt: 30, len: 1.8, wid: 1.0, y: 0.04, color: 0xff7aa6 },
    { count: 9, tilt: 47, len: 1.45, wid: 0.94, y: 0.08, color: 0xf25b90 },
    { count: 7, tilt: 64, len: 1.1, wid: 0.88, y: 0.12, color: 0xe14d86 },
  ];
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    const mat = new THREE.MeshStandardMaterial({
      color: L.color, roughness: 0.5, metalness: 0.0,
      emissive: 0x40121f, emissiveIntensity: 0.22,
      vertexColors: true, side: THREE.DoubleSide,
    });
    const step = (Math.PI * 2) / L.count;
    const off = li * step * 0.5;
    for (let j = 0; j < L.count; j++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = off + j * step;
      const m = new THREE.Mesh(petalGeo, mat);
      m.scale.set(L.wid, L.len, L.wid);
      const openX = -(Math.PI / 2 - L.tilt * deg);
      const closedX = -(Math.PI / 2 - CLOSED_TILT * deg);
      m.rotation.x = closedX;          // start closed (bud)
      m.position.y = L.y;
      pivot.add(m);
      group.add(pivot);
      // outer layers (lower li) start opening earlier in the scroll
      petalList.push({ m, openX, closedX, sf: li * 0.16 });
    }
  }
  const pod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.27, 0.3, 26),
    new THREE.MeshStandardMaterial({ color: 0xe6d25c, roughness: 0.5, emissive: 0x2a2406, emissiveIntensity: 0.3 })
  );
  pod.position.y = 0.18;
  group.add(pod);
  const stamenMat = new THREE.MeshStandardMaterial({ color: 0xf8e69a, emissive: 0x3a2e08, emissiveIntensity: 0.4, roughness: 0.4 });
  for (let j = 0; j < 22; j++) {
    const a = (j / 22) * Math.PI * 2;
    const sm = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), stamenMat);
    sm.position.set(Math.cos(a) * 0.3, 0.31, Math.sin(a) * 0.3);
    group.add(sm);
  }
  return group;
}

const lotus = buildLotus();
scene.add(lotus);

// soft contact shadow on the water (semi-transparent dark disc)
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(2.4, 48),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = -0.02;
scene.add(shadow);

/* ---- lily pads (leaves) ---- */
function makePadTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const cx = 128, cy = 128, R = 124;
  const grd = g.createRadialGradient(cx, cy, 8, cx, cy, R);
  grd.addColorStop(0, "#6aa84f");
  grd.addColorStop(0.65, "#3f8537");
  grd.addColorStop(1, "#1f5128");
  g.fillStyle = grd;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  // radial veins (slightly wavy)
  g.strokeStyle = "rgba(18,54,26,0.5)"; g.lineWidth = 2;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    g.beginPath(); g.moveTo(cx, cy);
    for (let s = 1; s <= 8; s++) {
      const rr = R * s / 8;
      const aa = a + Math.sin(s * 0.9) * 0.05;
      g.lineTo(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr);
    }
    g.stroke();
  }
  // darker rim
  g.strokeStyle = "rgba(12,40,20,0.85)"; g.lineWidth = 7;
  g.beginPath(); g.arc(cx, cy, R - 4, 0, Math.PI * 2); g.stroke();
  // water droplets (specular dots)
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.random() * R * 0.82;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    const rad = 2 + Math.random() * 4;
    const dg = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
    dg.addColorStop(0, "rgba(225,255,225,0.95)");
    dg.addColorStop(1, "rgba(225,255,225,0)");
    g.fillStyle = dg;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}
const padTex = makePadTexture();

function makeLilyPad() {
  const notch = 0.34;
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.lineTo(Math.cos(notch), Math.sin(notch));
  sh.absarc(0, 0, 1, notch, Math.PI * 2 - notch, false);
  sh.lineTo(0, 0);
  const g = new THREE.ShapeGeometry(sh, 72);
  const p = g.attributes.position;
  const uv = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const r = Math.hypot(x, y);
    // gently raised, wavy rim for an organic 3D curl
    p.setZ(i, 0.07 * r * r + 0.02 * Math.sin(Math.atan2(y, x) * 6) * r);
    uv.push((x + 1) / 2, (y + 1) / 2);
  }
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: padTex, roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}

const pads = [];
const padCfg = [
  { x: -2.7, z: -1.1, s: 1.8, rot: 0.3, tint: 0x66a44b },
  { x: 2.9, z: 0.7, s: 2.1, rot: 1.2, tint: 0x4f9540 },
  { x: 0.3, z: 3.0, s: 1.6, rot: 2.1, tint: 0x6fae52 },
  { x: -3.1, z: 2.1, s: 1.4, rot: -0.6, tint: 0x3c7e34 },
  { x: 3.3, z: -2.3, s: 1.5, rot: 0.9, tint: 0x589c46 },
  { x: -1.3, z: 3.5, s: 1.2, rot: 2.6, tint: 0x45893a },
  { x: 1.3, z: -3.3, s: 1.3, rot: -1.4, tint: 0x5ea24c },
  { x: -3.6, z: -2.6, s: 1.1, rot: 1.8, tint: 0x4a9040 },
];
for (const c of padCfg) {
  const holder = new THREE.Group();
  const m = makeLilyPad();
  m.material = m.material.clone();
  m.material.color = new THREE.Color(c.tint);
  holder.add(m);
  holder.position.set(c.x, 0.015, c.z);
  holder.scale.setScalar(c.s);
  holder.rotation.y = c.rot;
  scene.add(holder);
  pads.push({ g: holder, phase: Math.random() * 6.28, sp: 0.5 + Math.random() * 0.6 });

  // soft contact shadow on the water beneath each pad
  const psh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 })
  );
  psh.rotation.x = -Math.PI / 2;
  psh.position.set(c.x, 0.006, c.z);
  psh.scale.setScalar(c.s * 0.96);
  scene.add(psh);
}

/* =====================================================================
   resize + loop
   ===================================================================== */
window.addEventListener("resize", () => {
  waterRebuild();
  backdropResize();
  raysResize();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function loop(now) {
  const t = now * 0.001;
  // gentle ambient drops keep the surface alive (on top of the swell)
  if (Math.random() < 0.09) {
    waterDisturb(20 + Math.random() * (WW - 40), 20 + Math.random() * (WH - 40), 22, 2);
  }
  fillWaves(t);          // continuous ocean swell
  waterStep();
  waterRefract();
  wctx.putImageData(wOut, 0, 0);

  // scroll drives two phases: bloom first, then camera angle top->side->bottom
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const p = clamp(window.scrollY / maxScroll, 0, 1);
  const bloomTarget = clamp(p / BLOOM_END, 0, 1);
  const camTarget = clamp((p - BLOOM_END) / (1 - BLOOM_END), 0, 1);
  bloomP += (bloomTarget - bloomP) * 0.12; // smooth
  camP += (camTarget - camP) * 0.10;
  if (hintEl) hintEl.classList.toggle("hide", p > 0.03);
  let overall = 0;
  for (const pe of petalList) {
    const lp = clamp((bloomP - pe.sf) / 0.55, 0, 1);
    const e = 1 - Math.pow(1 - lp, 3); // easeOutCubic
    pe.m.rotation.x = pe.closedX + (pe.openX - pe.closedX) * e;
    overall += lp;
  }
  overall = petalList.length ? overall / petalList.length : 0;

  // lotus: gentle bob, near-top 3/4 view
  lotus.scale.setScalar(0.82 + 0.18 * overall);
  lotus.position.y = 0.18 + Math.sin(t * 1.1) * 0.05;

  // pads gently bob and rock on the water
  for (const pd of pads) {
    pd.g.position.y = 0.015 + Math.sin(t * pd.sp + pd.phase) * 0.025;
    pd.g.rotation.z = Math.sin(t * 0.4 + pd.phase) * 0.02;
  }

  // camera elevation follows scroll: 3/4 start -> side -> from below
  const targetY = 0.5;
  const R = 13.5; // camera distance (larger = more zoomed out)
  const elevDeg = lerp(52, 0, camP); // 3/4 view -> side view (stops at the horizon)
  const elev = elevDeg * (Math.PI / 180);
  const az = Math.sin(t * 0.15) * 0.12;               // gentle idle drift
  const hd = R * Math.cos(elev);
  camera.position.set(hd * Math.sin(az), targetY + R * Math.sin(elev), hd * Math.cos(az));
  camera.lookAt(0, targetY, 0);
  renderer.render(scene, camera);

  // water positioning across the orbit:
  //  top / 3-4 view -> full screen
  //  side view      -> bottom band, sky revealed above (horizon)
  //  diving below   -> water grows back up to cover the whole screen
  //                    (fully submerged) and the scene turns murky/underwater
  let waterTop, waterBot, uw = 0;
  if (elevDeg >= 0) {
    const reveal = clamp((40 - elevDeg) / 40, 0, 1);
    waterTop = reveal * 0.52;
    waterBot = 1.0;
  } else {
    uw = clamp((-elevDeg) / 40, 0, 1);   // underwater amount (0 at side -> 1 below)
    waterTop = lerp(0.52, 0.0, uw);      // water rises until it covers the screen
    waterBot = 1.0;
  }
  waterCanvas.style.top = (waterTop * 100).toFixed(2) + "%";
  waterCanvas.style.height = ((waterBot - waterTop) * 100).toFixed(2) + "%";

  drawBackdrop(uw);

  // aim the rays' entry point at the widest gap between the leaves/lotus
  // (project their world positions to screen-x, then find the largest gap)
  const obstacles = [];
  projV.setFromMatrixPosition(lotus.matrixWorld); projV.project(camera);
  obstacles.push(clamp((projV.x + 1) / 2, 0, 1));
  for (const pd of pads) {
    projV.setFromMatrixPosition(pd.g.matrixWorld); projV.project(camera);
    obstacles.push(clamp((projV.x + 1) / 2, 0, 1));
  }
  obstacles.sort((a, b) => a - b);
  const pts = [0, ...obstacles, 1];
  let best = -1, bestPos = 0.5;
  for (let i = 1; i < pts.length; i++) {
    const gap = pts[i] - pts[i - 1];
    if (gap > best) { best = gap; bestPos = (pts[i] + pts[i - 1]) / 2; }
  }
  sunX += (bestPos - sunX) * 0.05; // ease toward the clear gap

  drawRays(uw, t, waterTop, sunX); // sun rays enter through the gap, in the water

  requestAnimationFrame(loop);
}

waterRebuild();
requestAnimationFrame(loop);

/* =====================================================================
   floating notes (DOM overlay)
   ===================================================================== */
function renderNotes() {
  const layer = document.getElementById("notes");
  const notes = window.FLOWER_NOTES || [];
  if (!layer || !notes.length) return;
  const spots = [
    { top: 10, left: 4 }, { top: 8, right: 4 },
    { top: 26, right: 3 }, { top: 22, left: 3 },
    { top: 50, right: 3 }, { top: 48, left: 2 },
    { top: 72, right: 4 }, { top: 70, left: 5 },
    { top: 88, right: 6 }, { top: 90, left: 6 },
  ];
  const rnd = (a, b) => a + Math.random() * (b - a);
  notes.forEach((text, i) => {
    const s = spots[i % spots.length];
    const n = document.createElement("div");
    n.className = "note";
    n.textContent = text;
    n.style.top = s.top + "%";
    if (s.right !== undefined) { n.style.right = s.right + "%"; n.style.textAlign = "right"; }
    else n.style.left = s.left + "%";
    n.style.setProperty("--dx", rnd(-14, 14).toFixed(1) + "px");
    n.style.setProperty("--dy", rnd(-18, -6).toFixed(1) + "px");
    n.style.setProperty("--rot", rnd(-3, 3).toFixed(1) + "deg");
    n.style.setProperty("--dur", rnd(7, 13).toFixed(1) + "s");
    n.style.setProperty("--delay", (i * 0.5).toFixed(2) + "s");
    layer.appendChild(n);
  });
}
renderNotes();
