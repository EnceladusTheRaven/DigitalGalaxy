// =====================================================
//  Digital Galaxy Project
// =====================================================

// ---------- Settings ----------
const GALAXY_RADIUS = 750;
const SHOW_REGION_LABELS = [0.2, 0.3]; // big idea names fade at these levels
const SHOW_SMALL_IDEAS = [2.0, 2.7];   // small ideas + wormholes fade at these levels
const REGION_ZOOM = 3.2;               // big idea zoom level
const IDEA_ZOOM = 5;                   // small idea zoom levl
const NEBULA_IMAGE_SCALE = 2.4;        // how big nebula art is compared to its radius

// ---------- Helpers ----------
function rng(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) {
  let h = 7;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}
function gauss(rand) {
  return (rand() + rand() + rand() - 1.5) / 1.5;
}
function fade(k, start, end) {
  return Math.max(0, Math.min(1, (k - start) / (end - start)));
}

// =====================================================
//  Galaxy particles (canvas)
// =====================================================
const galaxyCanvas = document.getElementById("galaxy");
const gctx = galaxyCanvas.getContext("2d");
const particles = [];

(function buildGalaxy() {
  const rand = rng(42);
  const ARMS = 3;
  const TOTAL = 16000;
  for (let i = 0; i < TOTAL; i++) {
    let x, y, rgb, alpha;
    const kind = rand();
    if (kind < 0.15) {
      const r = Math.abs(gauss(rand)) * 170;
      const a = rand() * Math.PI * 2;
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
      rgb = `rgb(255, ${(215 + rand() * 40) | 0}, ${(160 + rand() * 50) | 0})`;
      alpha = 0.3 + rand() * 0.7;
    } else if (kind < 0.6) {
      const r = Math.min(GALAXY_RADIUS * 1.1, -260 * Math.log(1 - rand() * 0.98));
      const a = rand() * Math.PI * 2;
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
      rgb = rand() < 0.5
        ? `rgb(255, ${(225 + rand() * 30) | 0}, ${(200 + rand() * 40) | 0})`
        : `rgb(${(190 + rand() * 50) | 0}, ${(200 + rand() * 40) | 0}, 255)`;
      alpha = 0.15 + rand() * 0.45;
    } else {
      const d = Math.pow(rand(), 0.7);
      const r = 90 + d * GALAXY_RADIUS;
      const arm = Math.floor(rand() * ARMS);
      const angle = arm * (2 * Math.PI / ARMS) + r * 0.0035 + gauss(rand) * 0.4;
      x = Math.cos(angle) * r + gauss(rand) * 32;
      y = Math.sin(angle) * r + gauss(rand) * 32;
      rgb = rand() < 0.05
        ? "rgb(255, 120, 190)"
        : `rgb(${(170 + rand() * 70) | 0}, ${(190 + rand() * 50) | 0}, 255)`;
      alpha = 0.3 + rand() * 0.7;
    }
    particles.push({ x, y, rgb, size: rand() < 0.95 ? 1 : 2, alpha });
  }
})();

// Glowing gas clouds along the arms
const GLOW_SIZE = 1024;
const GLOW_WORLD = GALAXY_RADIUS * 2.4;
const glowCanvas = document.createElement("canvas");
(function buildGlow() {
  glowCanvas.width = glowCanvas.height = GLOW_SIZE;
  const c = glowCanvas.getContext("2d");
  const rand = rng(7);
  const ARMS = 3;
  const scale = GLOW_SIZE / GLOW_WORLD;
  c.globalCompositeOperation = "lighter";

  for (let i = 0; i < 700; i++) {
    let x, y, color;
    if (rand() < 0.75) {
      const r = 110 + Math.pow(rand(), 0.8) * GALAXY_RADIUS;
      const arm = Math.floor(rand() * ARMS);
      const angle = arm * (2 * Math.PI / ARMS) + r * 0.0035 + gauss(rand) * 0.3;
      x = Math.cos(angle) * r + gauss(rand) * 30;
      y = Math.sin(angle) * r + gauss(rand) * 30;
      color = rand() < 0.15 ? "255, 110, 180" : rand() < 0.5 ? "120, 150, 255" : "170, 140, 255";
    } else {
      // Scattered through the disk
      const r = -230 * Math.log(1 - rand() * 0.95);
      const a = rand() * Math.PI * 2;
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
      color = "200, 190, 255";
    }
    const px = GLOW_SIZE / 2 + x * scale;
    const py = GLOW_SIZE / 2 + y * scale;
    const pr = (25 + rand() * 55) * scale;
    const g = c.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, `rgba(${color}, ${0.05 + rand() * 0.06})`);
    g.addColorStop(1, `rgba(${color}, 0)`);
    c.fillStyle = g;
    c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }
})();

function drawGalaxy() {
  const t = transform;
  const dpr = window.devicePixelRatio || 1;
  gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gctx.clearRect(0, 0, innerWidth, innerHeight);

  // The galaxy dims as you zoom in
  const visibility = 1 - 0.75 * fade(t.k, 1.2, 3);

  // Soft glow around the core
  const glowR = 280 * t.k;
  const glow = gctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, glowR);
  glow.addColorStop(0, `rgba(255, 215, 160, ${0.35 * visibility})`);
  glow.addColorStop(1, "rgba(255, 215, 160, 0)");
  gctx.globalAlpha = 1;
  gctx.fillStyle = glow;
  gctx.fillRect(t.x - glowR, t.y - glowR, glowR * 2, glowR * 2);

  // Faint haze across the whole disk
  const hazeR = GALAXY_RADIUS * 1.05 * t.k;
  const haze = gctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, hazeR);
  haze.addColorStop(0, `rgba(170, 185, 255, ${0.12 * visibility})`);
  haze.addColorStop(0.6, `rgba(150, 165, 255, ${0.05 * visibility})`);
  haze.addColorStop(1, "rgba(150, 165, 255, 0)");
  gctx.fillStyle = haze;
  gctx.fillRect(t.x - hazeR, t.y - hazeR, hazeR * 2, hazeR * 2);

  // Glowing gas along the arms
  const glowW = GLOW_WORLD * t.k;
  gctx.globalAlpha = visibility;
  gctx.drawImage(glowCanvas, t.x - glowW / 2, t.y - glowW / 2, glowW, glowW);
  gctx.globalAlpha = 1;

  // Stars in the arms
  const s = Math.max(1, Math.min(2, Math.sqrt(t.k))); 
  for (const p of particles) {
    const sx = t.x + p.x * t.k;
    const sy = t.y + p.y * t.k;
    if (sx < -5 || sy < -5 || sx > innerWidth + 5 || sy > innerHeight + 5) continue;
    gctx.globalAlpha = p.alpha * visibility;
    gctx.fillStyle = p.rgb;
    gctx.fillRect(sx, sy, p.size * s, p.size * s);
  }
  gctx.globalAlpha = 1;
}

// =====================================================
//  Parallax starfield (canvas, behind the galaxy)
// =====================================================
const bgCanvas = document.getElementById("bg-stars");
const bctx = bgCanvas.getContext("2d");
const TILE = 1024; 

// depth
const starLayers = [
  { depth: 0.03, count: 900, size: 0.8, bright: 0.5 },
  { depth: 0.08, count: 350, size: 1.2, bright: 0.75 },
  { depth: 0.15, count: 120, size: 1.8, bright: 1.0 },
].map((layer, i) => {
  const rand = rng(1000 + i);
  layer.stars = Array.from({ length: layer.count }, () => ({
    x: rand() * TILE,
    y: rand() * TILE,
    a: layer.bright * (0.3 + rand() * 0.7),
    tint: rand() < 0.15 ? (rand() < 0.5 ? "#ffd6a8" : "#a8c8ff") : "#ffffff",
  }));
  return layer;
});

function drawBackground() {
  const dpr = window.devicePixelRatio || 1;
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bctx.clearRect(0, 0, innerWidth, innerHeight);

  for (const layer of starLayers) {
    const scale = 1 + Math.log2(transform.k / 0.4) * layer.depth;
    const tile = TILE * scale;
    const ox = ((transform.x * layer.depth) % tile + tile) % tile;
    const oy = ((transform.y * layer.depth) % tile + tile) % tile;

    for (let tx = ox - tile; tx < innerWidth; tx += tile) {
      for (let ty = oy - tile; ty < innerHeight; ty += tile) {
        for (const s of layer.stars) {
          const x = tx + s.x * scale;
          const y = ty + s.y * scale;
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
          bctx.globalAlpha = s.a;
          bctx.fillStyle = s.tint;
          bctx.fillRect(x, y, layer.size, layer.size);
        }
      }
    }
  }
  bctx.globalAlpha = 1;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  for (const c of [galaxyCanvas, bgCanvas]) {
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
  }
}

// =====================================================
//  SVG setup: layers, glow and gradients
// =====================================================
const svg = d3.select("#map");
const defs = svg.append("defs");
const world = svg.append("g");             // everything that pans/zooms
const regionLayer = world.append("g");     // nebulae and clusters
const coreLayer = world.append("g");       // black hole
const laneLayer = world.append("g");       // lanes between small ideas
const wormLayer = world.append("g");       // wormholes
const smallLayer = world.append("g");      // small ideas (stars/planets)
const labelLayer = world.append("g");      // big-idea names

// Glow filter for stars
const glowFilter = defs.append("filter").attr("id", "glow")
  .attr("x", "-100%").attr("y", "-100%").attr("width", "300%").attr("height", "300%");
glowFilter.append("feGaussianBlur").attr("stdDeviation", 2.5).attr("result", "blur");
const merge = glowFilter.append("feMerge");
merge.append("feMergeNode").attr("in", "blur");
merge.append("feMergeNode").attr("in", "SourceGraphic");

function radialGradient(id, color) {
  const g = defs.append("radialGradient").attr("id", id);
  g.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.8);
  g.append("stop").attr("offset", "60%").attr("stop-color", color).attr("stop-opacity", 0.25);
  g.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0);
}

// Cloudy, wispy texture for code-drawn nebulae
function nebulaFilter(id, seed) {
  const f = defs.append("filter").attr("id", `cloud-${id}`)
    .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
  f.append("feTurbulence").attr("type", "fractalNoise").attr("baseFrequency", 0.012)
    .attr("numOctaves", 4).attr("seed", seed).attr("result", "noise");
  f.append("feDisplacementMap").attr("in", "SourceGraphic").attr("in2", "noise")
    .attr("scale", 70).attr("xChannelSelector", "R").attr("yChannelSelector", "G")
    .attr("result", "warped");
  f.append("feGaussianBlur").attr("in", "warped").attr("stdDeviation", 6);
}

// Soft-edge mask
const edgeFade = defs.append("radialGradient").attr("id", "edge-fade");
edgeFade.append("stop").attr("offset", "50%").attr("stop-color", "white");
edgeFade.append("stop").attr("offset", "100%").attr("stop-color", "black");
defs.append("mask")
  .attr("id", "soft-edges")
  .attr("maskContentUnits", "objectBoundingBox")
  .append("rect")
  .attr("width", 1)
  .attr("height", 1)
  .attr("fill", "url(#edge-fade)");

// =====================================================
//  Drawing each kind of object
// =====================================================
// Draws a picture centered on the object's position
function drawImage(g, src, size) {
  g.append("image")
    .attr("href", src)
    .attr("width", size)
    .attr("height", size)
    .attr("x", -size / 2)
    .attr("y", -size / 2)
    .attr("preserveAspectRatio", "xMidYMid meet");
}

function sprinkleStars(g, rand, radius, count, color) {
  const stars = g.append("g").attr("filter", "url(#glow)");
  for (let i = 0; i < count; i++) {
    const r = Math.abs(gauss(rand)) * radius;
    const a = rand() * Math.PI * 2;
    stars.append("circle")
      .attr("cx", Math.cos(a) * r)
      .attr("cy", Math.sin(a) * r)
      .attr("r", 0.6 + rand() * 1.4)
      .attr("fill", rand() < 0.7 ? "#ffffff" : color)
      .attr("opacity", 0.4 + rand() * 0.6);
  }
}

function drawNebula(g, d) {
  if (d.image) {
    drawImage(g, d.image, d.radius * NEBULA_IMAGE_SCALE);
    g.select("image").attr("mask", "url(#soft-edges)");
    return;
  }
  const rand = rng(hash(d.id));
  radialGradient(`grad-${d.id}`, d.color);
  radialGradient(`grad2-${d.id}`, d.color2 || "#6fa8ff");
  nebulaFilter(d.id, Math.floor(rand() * 1000));

  const cloud = g.append("g").attr("filter", `url(#cloud-${d.id})`);
  for (let i = 0; i < 5; i++) {
    cloud.append("ellipse")
      .attr("cx", gauss(rand) * d.radius * 0.4)
      .attr("cy", gauss(rand) * d.radius * 0.4)
      .attr("rx", d.radius * (0.5 + rand() * 0.5))
      .attr("ry", d.radius * (0.3 + rand() * 0.4))
      .attr("transform", `rotate(${rand() * 180})`)
      .attr("fill", `url(#${i % 2 ? "grad2" : "grad"}-${d.id})`)
      .attr("opacity", 0.6);
  }
  sprinkleStars(g, rand, d.radius * 0.6, 25, d.color);
}

function drawCluster(g, d) {
  if (d.image) {
    drawImage(g, d.image, d.radius * NEBULA_IMAGE_SCALE);
    return;
  }
  const rand = rng(hash(d.id));
  radialGradient(`grad-${d.id}`, d.color);
  g.append("circle").attr("r", d.radius).attr("fill", `url(#grad-${d.id})`).attr("opacity", 0.35);
  sprinkleStars(g, rand, d.radius * 0.5, 150, d.color);
}

function drawBlackHole(g, d) {
  if (d.image) {
    drawImage(g, d.image, d.size || 220);
    return;
  }
  const disk = defs.append("radialGradient").attr("id", "disk");
  disk.append("stop").attr("offset", "35%").attr("stop-color", "#ffffff").attr("stop-opacity", 1);
  disk.append("stop").attr("offset", "50%").attr("stop-color", "#ffb347").attr("stop-opacity", 0.9);
  disk.append("stop").attr("offset", "75%").attr("stop-color", "#ff5e1a").attr("stop-opacity", 0.4);
  disk.append("stop").attr("offset", "100%").attr("stop-color", "#ff5e1a").attr("stop-opacity", 0);

  g.append("ellipse").attr("rx", 90).attr("ry", 32).attr("transform", "rotate(-20)")
    .attr("fill", "url(#disk)").attr("filter", "url(#glow)");
  g.append("circle").attr("r", 30).attr("fill", "none")
    .attr("stroke", "#ffd9a0").attr("stroke-width", 2).attr("filter", "url(#glow)");
  g.append("circle").attr("r", 28).attr("fill", "#000");
}

function drawSmallIdea(g, d) {
  g.append("circle").attr("r", 14).attr("fill", "transparent");
  if (d.type === "planet") {
    g.append("circle").attr("r", 5).attr("fill", d.color || "#7cc8ff");
    g.append("ellipse").attr("rx", 10).attr("ry", 3).attr("fill", "none")
      .attr("stroke", "#ffffff").attr("stroke-opacity", 0.5).attr("transform", "rotate(-20)");
  } else {
    g.append("circle").attr("r", 4).attr("fill", "#ffffff").attr("filter", "url(#glow)");
    g.append("circle").attr("r", 9).attr("fill", "none")
      .attr("stroke", "#ffffff").attr("stroke-opacity", 0.3);
  }
}

// =====================================================
//  Zoom, level of detail, camera moves
// =====================================================
let transform = d3.zoomIdentity;
let regionLabels = d3.selectAll([]);
let regionRings = d3.selectAll([]);
let smallLabels = d3.selectAll([]);
const backdrop = document.getElementById("backdrop");

const zoom = d3.zoom()
  .scaleExtent([0.15, 8])
  .on("zoom", (event) => {
    transform = event.transform;
    world.attr("transform", transform);
    updateDetail();
    drawBackground();
    drawGalaxy();
    moveBackdrop();
  });
svg.call(zoom);

// Show/hide things depending on how far you're zoomed in
function updateDetail() {
  const k = transform.k;
  regionRings
    .attr("stroke-width", 2 / k)
    .attr("stroke-dasharray", `${6 / k} ${5 / k}`);
  regionLayer.attr("opacity", 0.55 + 0.45 * fade(k, 0.8, 1.6));
  regionLabels
    .attr("opacity", fade(k, ...SHOW_REGION_LABELS))
    .attr("font-size", 16 / k); 

  const smallVisible = fade(k, ...SHOW_SMALL_IDEAS);
  const clickable = smallVisible > 0.5 ? "auto" : "none";
  smallLayer.attr("opacity", smallVisible).style("pointer-events", clickable);
  wormLayer.attr("opacity", smallVisible).style("pointer-events", clickable);
  laneLayer.attr("opacity", smallVisible);
  smallLabels.attr("font-size", 12 / k).attr("y", (d) => d.y + 10 + 14 / k);
}

// Slight parallax on the SpaceEngine image
function moveBackdrop() {
  const s = 1 + 0.04 * Math.log2(transform.k / 0.15);
  const dx = (transform.x - innerWidth / 2) * 0.01;
  const dy = (transform.y - innerHeight / 2) * 0.01;
  backdrop.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
}

function overviewTransform() {
  const k = Math.min(innerWidth, innerHeight) / (GALAXY_RADIUS * 2.1);
  return d3.zoomIdentity.translate(innerWidth / 2, innerHeight / 2).scale(k);
}

function flyTo(x, y, k, duration = 1200) {
  // Keep the target visible next to (or above) the panel
  const wide = innerWidth > 700;
  const cx = wide ? (innerWidth - 360) / 2 : innerWidth / 2;
  const cy = wide ? innerHeight / 2 : innerHeight * 0.3;
  svg.transition().duration(duration).ease(d3.easeCubicInOut)
    .call(zoom.transform, d3.zoomIdentity.translate(cx, cy).scale(k).translate(-x, -y));
}

function flyHome() {
  svg.transition().duration(1400).ease(d3.easeCubicInOut)
    .call(zoom.transform, overviewTransform());
}

// =====================================================
//  Side panel and buttons
// =====================================================
const panel = document.getElementById("panel");
const figure = document.getElementById("panel-figure");
const photo = document.getElementById("panel-photo");
const caption = document.getElementById("panel-caption");
photo.onerror = () => { figure.hidden = true; }; 

function showPanel(title, text, photoSrc, captionText) {
  document.getElementById("panel-title").textContent = title;
  document.getElementById("panel-text").textContent = text;
  if (photoSrc) {
    photo.src = photoSrc;
    photo.alt = captionText || title;
    caption.textContent = captionText || "";
    caption.hidden = !captionText;
    figure.hidden = false;
  } else {
    photo.removeAttribute("src");
    figure.hidden = true;
  }
  panel.classList.remove("hidden");
}
function hidePanel() {
  panel.classList.add("hidden");
}
document.getElementById("close").onclick = hidePanel;
document.getElementById("home").onclick = () => { hidePanel(); flyHome(); };
svg.on("click", hidePanel); 

// =====================================================
//  Lanes
// =====================================================
function drawLanes(smalls, byId) {
  const groups = d3.group(smalls, (d) => d.parent);
  for (const [parentId, kids] of groups) {
    if (kids.length < 2) continue;
    const p = byId.get(parentId);
    const ordered = [...kids].sort(
      (a, b) => Math.atan2(a.y - p.y, a.x - p.x) - Math.atan2(b.y - p.y, b.x - p.x)
    );
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i], b = ordered[i + 1];
      laneLayer.append("line").attr("class", "lane")
        .attr("x1", a.x).attr("y1", a.y)
        .attr("x2", b.x).attr("y2", b.y);
    }
  }
}

// =====================================================
//  Wormholes
// =====================================================
function drawWormholes(links, byId) {
  for (const link of links) {
    const a = byId.get(link.from);
    const b = byId.get(link.to);
    if (!a || !b) {
      console.warn("Wormhole skipped, id not found:", link);
      continue;
    }

    // A gentle curve: the control point sits off to the side of the midpoint
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const cx = mx - (b.y - a.y) * 0.25;
    const cy = my + (b.x - a.x) * 0.25;
    const path = `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`;

    const g = wormLayer.append("g").attr("class", "wormhole-group");
    g.append("path").attr("class", "wormhole").attr("d", path);
    g.append("path").attr("class", "wormhole-hit").attr("d", path)
      .on("click", (event) => {
        event.stopPropagation();
        travel(a, b, link);
      });

    // Spinning portal rings at both ends
    for (const end of [a, b]) {
      wormLayer.append("circle").attr("class", "portal")
        .attr("cx", end.x).attr("cy", end.y).attr("r", 13);
    }
  }
}

// Fly through the wormhole to whichever end is farther from where you are
function travel(a, b, link) {
  const viewX = (innerWidth / 2 - transform.x) / transform.k;
  const viewY = (innerHeight / 2 - transform.y) / transform.k;
  const distA = Math.hypot(a.x - viewX, a.y - viewY);
  const distB = Math.hypot(b.x - viewX, b.y - viewY);
  const [from, to] = distA < distB ? [a, b] : [b, a];

  showPanel(`Wormhole: ${from.title} → ${to.title}`, link.why, link.photo, link.caption);
  flyTo(to.x, to.y, IDEA_ZOOM, 2200);
}

// =====================================================
//  Load data and build the map
// =====================================================
resizeCanvas();
svg.call(zoom.transform, overviewTransform());
window.addEventListener("resize", () => { resizeCanvas(); drawBackground(); drawGalaxy(); });

fetch("data.json")
  .then((res) => res.json())
  .then((data) => {
    const byId = new Map(data.nodes.map((n) => [n.id, n]));

    for (const n of data.nodes) {
      if (n.parent) {
        const p = byId.get(n.parent);
        if (!p) {
          console.warn("Parent not found for", n.id);
          continue;
        }
        n.x = p.x + (n.dx || 0);
        n.y = p.y + (n.dy || 0);
      }
    }
    const regions = data.nodes.filter((n) => n.type === "nebula" || n.type === "cluster");
    const smalls = data.nodes.filter((n) => n.parent && byId.has(n.parent));
    const center = data.nodes.find((n) => n.type === "blackhole");

    // Big ideas
    regionLayer.selectAll(".region")
      .data(regions)
      .join("g")
      .attr("class", "region")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .each(function (d) {
        const g = d3.select(this);
        if (d.type === "nebula") drawNebula(g, d);
        else drawCluster(g, d);
        g.append("circle").attr("r", d.radius).attr("fill", "transparent"); 
        g.append("circle")
          .attr("class", "region-ring")
          .attr("r", d.radius * 1.08)
          .attr("stroke", d.color || "#ffffff");
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        showPanel(d.title, d.text, d.photo, d.caption);
        flyTo(d.x, d.y, REGION_ZOOM);
      });

    // The black hole
    if (center) {
      const g = coreLayer.append("g")
        .attr("class", "core")
        .attr("transform", `translate(${center.x}, ${center.y})`)
        .on("click", (event) => {
          event.stopPropagation();
          showPanel(center.title, center.text, center.photo, center.caption);
          flyHome();
        });
      drawBlackHole(g, center);
    }

    // Lanes inside each big idea, then wormholes between big ideas
    drawLanes(smalls, byId);
    drawWormholes(data.links || [], byId);

    // Small ideas
    smallLayer.selectAll(".idea")
      .data(smalls)
      .join("g")
      .attr("class", "idea")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .each(function (d) { drawSmallIdea(d3.select(this), d); })
      .on("click", (event, d) => {
        event.stopPropagation();
        showPanel(d.title, d.text, d.photo, d.caption);
        flyTo(d.x, d.y, IDEA_ZOOM);
      });

    smallLabels = smallLayer.selectAll(".idea-label")
      .data(smalls)
      .join("text")
      .attr("class", "label idea-label")
      .attr("x", (d) => d.x)
      .text((d) => d.title);

    regionRings = regionLayer.selectAll(".region-ring");

    regionLabels = labelLayer.selectAll(".region-label")
      .data(regions)
      .join("text")
      .attr("class", "label region-label")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y - d.radius * 0.9)
      .text((d) => d.title);

    updateDetail();
  })
  .catch((err) => {
    console.error("Could not load data.json:", err);
    showPanel("Couldn't load data.json", "Check that it's in the same folder and has no JSON mistakes (like a missing comma).");
  });