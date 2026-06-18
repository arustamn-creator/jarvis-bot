/**
 * Kwork cover: МАРКЕТИНГ-ПЛАН  1200×800 px
 * Design: Digital Depth — dark navy, electric blue glow
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'kwork-cover-marketing.png');

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }

  @font-face {
    font-family: 'BigShoulders';
    src: url('file:///C:/skills/.claude/skills/canvas-design/canvas-fonts/BigShoulders-Bold.ttf');
    font-weight: 700;
  }
  @font-face {
    font-family: 'WorkSans';
    src: url('file:///C:/skills/.claude/skills/canvas-design/canvas-fonts/WorkSans-Regular.ttf');
    font-weight: 400;
  }
  @font-face {
    font-family: 'WorkSans';
    src: url('file:///C:/skills/.claude/skills/canvas-design/canvas-fonts/WorkSans-Bold.ttf');
    font-weight: 700;
  }
  @font-face {
    font-family: 'GeistMono';
    src: url('file:///C:/skills/.claude/skills/canvas-design/canvas-fonts/GeistMono-Regular.ttf');
  }
  @font-face {
    font-family: 'InstrumentSans';
    src: url('file:///C:/skills/.claude/skills/canvas-design/canvas-fonts/InstrumentSans-Regular.ttf');
    font-weight: 400;
  }
  @font-face {
    font-family: 'InstrumentSans';
    src: url('file:///C:/skills/.claude/skills/canvas-design/canvas-fonts/InstrumentSans-Bold.ttf');
    font-weight: 700;
  }

  html, body {
    width: 1200px; height: 800px;
    overflow: hidden;
  }

  body {
    background: linear-gradient(155deg, #060C20 0%, #0A1434 55%, #0D1A48 100%);
    position: relative;
    color: white;
  }

  /* dot grid */
  body::before {
    content: '';
    position: absolute; inset: 0;
    background-image: radial-gradient(circle, rgba(60,120,255,0.18) 1px, transparent 1px);
    background-size: 48px 48px;
    background-position: 24px 24px;
  }

  /* right-side radial glow */
  .glow-bg {
    position: absolute;
    top: -80px; right: -40px;
    width: 680px; height: 680px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(30,100,255,0.18) 0%, rgba(10,40,140,0.10) 50%, transparent 75%);
    pointer-events: none;
  }

  .canvas {
    position: relative;
    width: 1200px; height: 800px;
    padding: 0;
  }

  /* ── TOP LABELS ── */
  .top-labels {
    position: absolute;
    top: 36px; left: 52px;
    display: flex; align-items: center; gap: 0;
    font-family: 'GeistMono', monospace;
    font-size: 13px;
    color: rgba(110,185,255,0.75);
    letter-spacing: 1.5px;
  }
  .top-labels .sep { margin: 0 16px; color: rgba(60,140,255,0.5); }

  /* ── VERTICAL DIVIDER ── */
  .v-div {
    position: absolute;
    left: 596px; top: 48px; bottom: 120px;
    width: 1px;
    background: linear-gradient(to bottom, transparent 0%, rgba(50,100,200,0.35) 20%, rgba(50,100,200,0.35) 80%, transparent 100%);
  }

  /* ── LEFT PANEL ── */
  .left {
    position: absolute;
    top: 0; left: 0; bottom: 0; width: 596px;
    padding: 86px 48px 130px 52px;
    display: flex; flex-direction: column;
  }

  .title-block {
    margin-bottom: 20px;
  }
  .title-line {
    font-family: 'BigShoulders', sans-serif;
    font-size: 116px;
    font-weight: 700;
    line-height: 0.90;
    color: #ffffff;
    letter-spacing: -2.5px;
    text-shadow: 0 0 60px rgba(30,100,255,0.35), 0 2px 0 rgba(0,0,0,0.4);
  }

  /* blue underline accent */
  .underline-accent {
    width: 220px; height: 5px;
    background: linear-gradient(90deg, #2277FF, #55AAFF);
    border-radius: 3px;
    margin-top: 10px;
    box-shadow: 0 0 18px rgba(34,119,255,0.8), 0 0 40px rgba(34,119,255,0.4);
  }

  .subtitle {
    font-family: 'WorkSans', sans-serif;
    font-size: 21px;
    color: rgba(255,255,255,0.60);
    margin-top: 16px;
    margin-bottom: 30px;
    letter-spacing: 0.2px;
  }

  /* ── ARROW LIST ── */
  .list {
    display: flex; flex-direction: column; gap: 14px;
    flex: 1;
  }
  .list-item {
    display: flex; align-items: center; gap: 16px;
    font-family: 'InstrumentSans', sans-serif;
    font-size: 21px;
    font-weight: 400;
    color: rgba(255,255,255,0.92);
    letter-spacing: 0.1px;
  }
  .arrow {
    flex-shrink: 0;
    width: 28px; height: 20px;
    position: relative;
  }
  .arrow svg {
    filter: drop-shadow(0 0 5px rgba(34,119,255,1.0)) drop-shadow(0 0 12px rgba(34,119,255,0.7)) drop-shadow(0 0 22px rgba(34,119,255,0.4));
  }

  /* ── RIGHT PANEL: CHART ── */
  .right {
    position: absolute;
    top: 0; left: 600px; right: 0; bottom: 0;
    padding: 72px 40px 120px 36px;
  }
  .chart-label {
    font-family: 'GeistMono', monospace;
    font-size: 13px;
    color: rgba(110,185,255,0.65);
    letter-spacing: 1.2px;
    margin-bottom: 10px;
  }
  .chart-wrap {
    position: relative;
    flex: 1;
    height: 440px;
  }
  .chart-svg {
    width: 100%; height: 100%;
    overflow: visible;
  }

  /* annotation bubble */
  .ann-bubble {
    position: absolute;
    background: rgba(34,120,255,0.92);
    border: 1px solid rgba(110,185,255,0.5);
    border-radius: 8px;
    padding: 6px 14px;
    top: 22px; right: 38px;
  }
  .ann-val {
    font-family: 'WorkSans', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: white;
  }
  .ann-lbl {
    font-family: 'GeistMono', monospace;
    font-size: 12px;
    color: rgba(255,255,255,0.7);
    margin-top: 1px;
  }

  /* ── BOTTOM DIVIDER ── */
  .h-div {
    position: absolute;
    left: 0; right: 0; height: 1px;
    bottom: 112px;
    background: linear-gradient(90deg, transparent 0%, rgba(60,120,220,0.45) 15%, rgba(60,120,220,0.45) 85%, transparent 100%);
  }
  .h-div-glow {
    position: absolute;
    left: 0; right: 0; height: 8px;
    bottom: 108px;
    background: linear-gradient(90deg, transparent 0%, rgba(34,100,255,0.12) 20%, rgba(34,100,255,0.12) 80%, transparent 100%);
  }

  /* ── BADGES ── */
  .badges {
    position: absolute;
    bottom: 24px; left: 0; right: 0;
    display: flex; justify-content: center;
    gap: 24px;
  }
  .badge {
    width: 220px; height: 76px;
    background: rgba(10,22,66,0.92);
    border: 1px solid rgba(50,100,200,0.7);
    border-radius: 8px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 4px;
    box-shadow: 0 0 24px rgba(34,100,255,0.18), 0 0 6px rgba(34,100,255,0.10);
  }
  .badge-main {
    font-family: 'WorkSans', sans-serif;
    font-size: 23px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.8px;
    text-shadow: 0 0 20px rgba(100,170,255,0.4);
  }
  .badge-sub {
    font-family: 'GeistMono', monospace;
    font-size: 12px;
    color: rgba(110,185,255,0.72);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  /* branding */
  .brand {
    position: absolute;
    bottom: 18px; right: 30px;
    font-family: 'GeistMono', monospace;
    font-size: 11px;
    color: rgba(100,160,255,0.35);
    letter-spacing: 1.5px;
  }
</style>
</head>
<body>
<div class="glow-bg"></div>
<div class="canvas">

  <!-- top labels -->
  <div class="top-labels">
    <span>МАРКЕТИНГОВАЯ СТРАТЕГИЯ</span>
    <span class="sep">·</span>
    <span>АНАЛИТИКА</span>
    <span class="sep">·</span>
    <span>РОСТ</span>
  </div>

  <!-- vertical divider -->
  <div class="v-div"></div>

  <!-- ── LEFT ── -->
  <div class="left">
    <div class="title-block">
      <div class="title-line">МАРКЕТИНГ-</div>
      <div class="title-line">ПЛАН</div>
      <div class="underline-accent"></div>
    </div>
    <div class="subtitle">стратегия роста для вашего бизнеса</div>
    <div class="list">
      ${[
        'Анализ рынка и конкурентов',
        'Портреты ЦА',
        'Контент-план',
        'Бюджет и KPI',
        'Roadmap',
      ].map(item => `
      <div class="list-item">
        <div class="arrow">
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <line x1="0" y1="10" x2="20" y2="10" stroke="#2277FF" stroke-width="2.5"/>
            <polygon points="16,4 26,10 16,16" fill="#2277FF"/>
          </svg>
        </div>
        <span>${item}</span>
      </div>`).join('')}
    </div>
  </div>

  <!-- ── RIGHT: CHART ── -->
  <div class="right">
    <div class="chart-label">ДИНАМИКА РОСТА КЛИЕНТОВ &nbsp;↑</div>
    <div class="chart-wrap" style="position:relative;">

      <svg class="chart-svg" viewBox="0 0 520 440" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2277FF" stop-opacity="0.38"/>
            <stop offset="100%" stop-color="#2277FF" stop-opacity="0.02"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#00AAFF" filter="url(#glow)"/>
          </marker>
        </defs>

        <!-- grid lines -->
        <line x1="0" y1="88"  x2="520" y2="88"  stroke="rgba(60,120,200,0.15)" stroke-width="1"/>
        <line x1="0" y1="176" x2="520" y2="176" stroke="rgba(60,120,200,0.15)" stroke-width="1"/>
        <line x1="0" y1="264" x2="520" y2="264" stroke="rgba(60,120,200,0.15)" stroke-width="1"/>
        <line x1="0" y1="352" x2="520" y2="352" stroke="rgba(60,120,200,0.15)" stroke-width="1"/>

        <!-- y axis labels -->
        <text x="0" y="85"  font-family="monospace" font-size="13" fill="rgba(110,185,255,0.5)">100%</text>
        <text x="4" y="173" font-family="monospace" font-size="13" fill="rgba(110,185,255,0.5)">75%</text>
        <text x="4" y="261" font-family="monospace" font-size="13" fill="rgba(110,185,255,0.5)">50%</text>
        <text x="4" y="349" font-family="monospace" font-size="13" fill="rgba(110,185,255,0.5)">25%</text>
        <text x="10" y="437" font-family="monospace" font-size="13" fill="rgba(110,185,255,0.5)">0</text>

        <!-- curve points: (x, y) in viewBox 0-520, 0-440 -->
        <!-- data: roughly exponential growth curve -->
        <!-- Q labels -->
        <text x="56"  y="435" font-family="monospace" font-size="13" fill="rgba(110,185,255,0.5)">Q1</text>
        <text x="186" y="435" font-family="monospace" font-size="13" fill="rgba(110,185,255,0.5)">Q2</text>
        <text x="316" y="435" font-family="monospace" font-size="13" fill="rgba(110,185,255,0.5)">Q3</text>
        <text x="446" y="435" font-family="monospace" font-size="13" fill="rgba(110,185,255,0.5)">Q4</text>

        <!-- filled area -->
        <path d="M60,396 C90,380 120,360 160,330 S220,280 260,248 S330,190 380,155 S440,100 490,48 L490,420 L60,420 Z"
              fill="url(#fillGrad)"/>

        <!-- glow line (wide, blurred) -->
        <path d="M60,396 C90,380 120,360 160,330 S220,280 260,248 S330,190 380,155 S440,100 490,48"
              fill="none"
              stroke="rgba(34,119,255,0.4)"
              stroke-width="14"
              stroke-linecap="round"
              filter="url(#glow-strong)"/>

        <!-- main curve -->
        <path d="M60,396 C90,380 120,360 160,330 S220,280 260,248 S330,190 380,155 S440,100 490,48"
              fill="none"
              stroke="#6AB9FF"
              stroke-width="3.5"
              stroke-linecap="round"
              filter="url(#glow)"/>

        <!-- data dots -->
        <circle cx="60"  cy="396" r="5" fill="#4499FF" filter="url(#glow)"/>
        <circle cx="160" cy="330" r="5" fill="#4499FF" filter="url(#glow)"/>
        <circle cx="260" cy="248" r="5" fill="#4499FF" filter="url(#glow)"/>
        <circle cx="380" cy="155" r="5" fill="#4499FF" filter="url(#glow)"/>

        <!-- last dot — big glow -->
        <circle cx="490" cy="48" r="12" fill="rgba(34,119,255,0.3)" filter="url(#glow-strong)"/>
        <circle cx="490" cy="48" r="8"  fill="#0099FF" filter="url(#glow)"/>
        <circle cx="490" cy="48" r="4"  fill="white"/>

        <!-- upward arrow from last point -->
        <line x1="490" y1="48" x2="516" y2="10"
              stroke="#00AAFF" stroke-width="3.5" stroke-linecap="round"
              marker-end="url(#arrowhead)"
              filter="url(#glow)"/>
        <!-- glow arrow -->
        <line x1="490" y1="48" x2="516" y2="10"
              stroke="rgba(0,180,255,0.3)" stroke-width="14"
              stroke-linecap="round"
              filter="url(#glow-strong)"/>
        <line x1="490" y1="48" x2="516" y2="10"
              stroke="#00AAFF" stroke-width="3.5" stroke-linecap="round"
              marker-end="url(#arrowhead)"/>
      </svg>

      <!-- annotation bubble -->
      <div class="ann-bubble">
        <div class="ann-val">+240%</div>
        <div class="ann-lbl">за год</div>
      </div>
    </div>
  </div>

  <!-- bottom dividers -->
  <div class="h-div-glow"></div>
  <div class="h-div"></div>

  <!-- badges -->
  <div class="badges">
    <div class="badge">
      <div class="badge-main">ОТ 3500 ₽</div>
      <div class="badge-sub">стоимость</div>
    </div>
    <div class="badge">
      <div class="badge-main">ЗА 3 ДНЯ</div>
      <div class="badge-sub">быстро и точно</div>
    </div>
    <div class="badge">
      <div class="badge-main">PDF-ОТЧЁТ</div>
      <div class="badge-sub">готовый документ</div>
    </div>
  </div>

  <!-- branding -->
  <div class="brand">KWORK.MARKETING</div>

</div>
</body>
</html>`;

async function main() {
  const htmlPath = path.join(__dirname, 'tmp', 'cover_marketing.html');
  if (!fs.existsSync(path.join(__dirname, 'tmp'))) {
    fs.mkdirSync(path.join(__dirname, 'tmp'), { recursive: true });
  }
  fs.writeFileSync(htmlPath, HTML, 'utf8');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  await page.screenshot({
    path: OUT,
    fullPage: false,
    clip: { x: 0, y: 0, width: 1200, height: 800 },
  });

  await browser.close();

  const { statSync } = require('fs');
  console.log(`✅  ${OUT}  (${(statSync(OUT).size / 1024).toFixed(0)} KB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
