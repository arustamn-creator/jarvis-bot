/**
 * Генерирует marketing-plan-demo-v4.pdf
 * 8 полных страниц A4, фото чашки с Unsplash, ВКонтакте вместо Instagram
 */

const { chromium } = require('playwright');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'marketing-plan-demo-v4.pdf');
const TMP_IMG = path.join(__dirname, 'tmp', 'coffee_v4.jpg');

function downloadFile(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 10) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, dest, redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const f = fs.createWriteStream(dest);
      res.pipe(f);
      f.on('finish', () => { f.close(); resolve(); });
      f.on('error', reject);
    }).on('error', reject);
  });
}

function toBase64(filepath) {
  const data = fs.readFileSync(filepath);
  return `data:image/jpeg;base64,${data.toString('base64')}`;
}

function buildHTML(imgSrc) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  :root {
    --br: #2C1503; --bm: #6F3B1A; --bl: #A0522D; --bc: #C8956C;
    --cr: #FDF6EC; --c2: #F0E0C8; --w: #FFFFFF;
    --g: #333; --g2: #666; --g3: #999;
    --green: #1B5E20; --gl: #E8F5E9;
    --blue: #0D47A1; --bll: #E3F2FD;
    --vk: #0077FF; --vkl: #E3F0FF;
    --tg: #0088CC; --tgl: #E0F4FF;
    --yt: #CC0000; --ytl: #FFE8E8;
    --ora: #E65100; --orl: #FFF3E0;
    --pur: #6A1B9A; --pul: #F3E5F5;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; background: #f0ebe3; color: var(--g); font-size: 11px; line-height: 1.45; }

  .page {
    width: 210mm;
    height: 297mm;
    margin: 0 auto 12px;
    background: white;
    overflow: hidden;
    page-break-after: always;
    position: relative;
  }

  /* ── PAGE 1: COVER ── */
  .cover {
    width: 210mm; height: 297mm;
    background: linear-gradient(160deg, #1a0800 0%, #3B1F0A 30%, #6F3B1A 65%, #A85C30 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    position: relative; overflow: hidden;
  }
  .cover-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .cover-topbar {
    position: absolute; top: 0; left: 0; right: 0; height: 5px;
    background: linear-gradient(90deg, var(--bc), var(--ora), var(--bc));
  }
  .cover-photo-wrap {
    position: relative; z-index: 2;
    margin-top: 44px;
    width: 186mm; height: 100mm;
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    border: 3px solid rgba(200,149,108,0.4);
  }
  .cover-photo-wrap img {
    width: 100%; height: 100%; object-fit: cover; object-position: center;
    filter: brightness(0.88) saturate(1.1);
  }
  .cover-photo-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, transparent 40%, rgba(26,8,0,0.7) 100%);
  }
  .cover-photo-label {
    position: absolute; bottom: 14px; left: 18px; right: 18px;
    color: rgba(255,255,255,0.6); font-size: 8px; letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .cover-body {
    position: relative; z-index: 2;
    text-align: center; padding: 22px 36px 0;
  }
  .cover-tag {
    display: inline-block; background: rgba(200,149,108,0.2);
    border: 1px solid rgba(200,149,108,0.5); color: var(--bc);
    font-size: 9px; font-weight: 700; letter-spacing: 2.5px;
    text-transform: uppercase; padding: 5px 18px; border-radius: 20px; margin-bottom: 14px;
  }
  .cover-title {
    font-size: 46px; font-weight: 900; color: white;
    letter-spacing: -1px; line-height: 1; margin-bottom: 6px;
    text-shadow: 0 4px 20px rgba(0,0,0,0.6);
  }
  .cover-sub {
    font-size: 14px; font-weight: 300; color: var(--c2);
    letter-spacing: 4px; text-transform: uppercase; margin-bottom: 6px;
  }
  .cover-period {
    font-size: 11px; color: var(--bc); font-weight: 500; margin-bottom: 24px;
  }
  .cover-stats {
    display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
  }
  .cover-stat {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px; padding: 12px 18px; text-align: center; min-width: 80px;
  }
  .cover-stat-val { display: block; font-size: 18px; font-weight: 800; color: var(--bc); }
  .cover-stat-lbl { display: block; font-size: 8px; font-weight: 500; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
  .cover-bottom {
    position: absolute; bottom: 0; left: 0; right: 0; height: 60px;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center; gap: 20px;
  }
  .cover-bottom span { color: rgba(255,255,255,0.65); font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase; }
  .cover-bottom .sep { color: var(--bc); font-size: 12px; }

  /* ── SHARED PAGE LAYOUT ── */
  .ph { /* page header */
    background: linear-gradient(135deg, var(--br) 0%, var(--bm) 100%);
    padding: 14px 22px 12px;
    display: flex; align-items: center; gap: 12px;
  }
  .ph-icon {
    width: 34px; height: 34px; border-radius: 8px;
    background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .ph-text { flex: 1; }
  .ph-num { font-size: 8px; color: var(--bc); font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
  .ph-title { font-size: 18px; font-weight: 800; color: white; letter-spacing: -0.5px; line-height: 1; }
  .ph-sub { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px; }
  .ph-badge { background: rgba(200,149,108,0.25); border: 1px solid rgba(200,149,108,0.5); color: var(--bc); font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }

  .pb { /* page body */
    padding: 16px 22px;
    height: calc(297mm - 60px - 32px);
    overflow: hidden;
  }
  .pf { /* page footer */
    position: absolute; bottom: 0; left: 0; right: 0; height: 32px;
    background: var(--br); display: flex; align-items: center;
    justify-content: space-between; padding: 0 22px;
  }
  .pf span { font-size: 8px; color: rgba(255,255,255,0.5); letter-spacing: 1px; text-transform: uppercase; }
  .pf-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--bc); }

  /* ── REUSABLE COMPONENTS ── */
  h2 { font-size: 12px; font-weight: 700; color: var(--br); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  h3 { font-size: 11px; font-weight: 700; color: var(--bm); margin-bottom: 5px; }

  .row { display: flex; gap: 12px; }
  .col { flex: 1; }
  .col-40 { flex: 0 0 40%; }
  .col-60 { flex: 0 0 60%; }
  .col-33 { flex: 0 0 calc(33.33% - 8px); }

  .card {
    background: var(--cr); border-radius: 10px; padding: 12px;
    border-left: 3px solid var(--bm); margin-bottom: 10px;
  }
  .card-blue { border-left-color: var(--blue); background: var(--bll); }
  .card-green { border-left-color: var(--green); background: var(--gl); }
  .card-vk { border-left-color: var(--vk); background: var(--vkl); }
  .card-tg { border-left-color: var(--tg); background: var(--tgl); }
  .card-yt { border-left-color: var(--yt); background: var(--ytl); }
  .card-ora { border-left-color: var(--ora); background: var(--orl); }
  .card-pur { border-left-color: var(--pur); background: var(--pul); }

  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
  .kpi { background: white; border: 1px solid #e8ddd0; border-radius: 10px; padding: 10px 12px; text-align: center; }
  .kpi-val { font-size: 20px; font-weight: 900; color: var(--bm); display: block; }
  .kpi-lbl { font-size: 8px; color: var(--g2); text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2px; }
  .kpi-arrow { font-size: 9px; color: var(--green); margin-top: 2px; display: block; }

  .tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 8.5px; font-weight: 600; margin: 2px; }
  .tag-br { background: var(--c2); color: var(--br); }
  .tag-green { background: var(--gl); color: var(--green); }
  .tag-blue { background: var(--bll); color: var(--blue); }
  .tag-vk { background: var(--vkl); color: var(--vk); }

  .divider { height: 1px; background: linear-gradient(90deg, var(--c2), transparent); margin: 10px 0; }

  .table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  .table th { background: var(--br); color: white; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; }
  .table th:first-child { border-radius: 6px 0 0 0; }
  .table th:last-child { border-radius: 0 6px 0 0; }
  .table td { padding: 6px 8px; border-bottom: 1px solid #f0e8df; color: var(--g); vertical-align: top; }
  .table tr:nth-child(even) td { background: #fdf8f2; }
  .table tr:hover td { background: var(--c2); }

  .progress-bar { height: 6px; background: #e8ddd0; border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--bm), var(--bc)); border-radius: 3px; }
  .progress-fill-green { background: linear-gradient(90deg, var(--green), #4CAF50); }
  .progress-fill-blue { background: linear-gradient(90deg, var(--blue), #1976D2); }
  .progress-fill-vk { background: linear-gradient(90deg, var(--vk), #4DA3FF); }

  .persona-card {
    background: white; border: 1px solid #e8ddd0; border-radius: 12px;
    padding: 12px; display: flex; flex-direction: column; gap: 6px;
  }
  .persona-avatar {
    width: 44px; height: 44px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; margin-bottom: 4px;
  }
  .persona-name { font-size: 12px; font-weight: 800; color: var(--br); }
  .persona-role { font-size: 9px; color: var(--g2); margin-bottom: 4px; }
  .persona-tags { display: flex; flex-wrap: wrap; gap: 3px; }

  .timeline-row { display: flex; align-items: stretch; gap: 8px; margin-bottom: 6px; }
  .timeline-month { width: 32px; flex-shrink: 0; font-size: 8px; font-weight: 700; color: var(--bm); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; }
  .timeline-track { flex: 1; display: flex; gap: 4px; }
  .tl-item { flex: 1; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 7.5px; font-weight: 600; letter-spacing: 0.3px; text-align: center; }
  .tl-br { background: var(--bm); color: white; }
  .tl-vk { background: var(--vk); color: white; }
  .tl-tg { background: var(--tg); color: white; }
  .tl-green { background: var(--green); color: white; }
  .tl-ora { background: var(--ora); color: white; }
  .tl-gray { background: #e0d8d0; color: var(--g2); }
  .tl-pur { background: var(--pur); color: white; }

  .budget-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .budget-label { width: 120px; font-size: 9.5px; font-weight: 600; color: var(--g); }
  .budget-bar-wrap { flex: 1; }
  .budget-amount { width: 60px; text-align: right; font-size: 9.5px; font-weight: 700; color: var(--bm); }
  .budget-pct { width: 30px; text-align: right; font-size: 8px; color: var(--g2); }

  .swot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .swot-cell { padding: 10px; border-radius: 8px; }
  .swot-s { background: #E8F5E9; border-top: 3px solid #2E7D32; }
  .swot-w { background: #FFF3E0; border-top: 3px solid #E65100; }
  .swot-o { background: #E3F2FD; border-top: 3px solid #0D47A1; }
  .swot-t { background: #FCE4EC; border-top: 3px solid #880E4F; }
  .swot-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .swot-s .swot-title { color: #1B5E20; }
  .swot-w .swot-title { color: #BF360C; }
  .swot-o .swot-title { color: #0D47A1; }
  .swot-t .swot-title { color: #880E4F; }
  .swot-list { list-style: none; }
  .swot-list li { font-size: 9px; color: var(--g); padding: 2px 0; padding-left: 12px; position: relative; }
  .swot-list li::before { content: '•'; position: absolute; left: 0; color: var(--bc); font-weight: 700; }

  .smm-channel { background: white; border: 1px solid #e8ddd0; border-radius: 10px; padding: 11px; margin-bottom: 8px; }
  .smm-channel-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .smm-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .smm-icon-vk { background: var(--vkl); }
  .smm-icon-tg { background: var(--tgl); }
  .smm-icon-yt { background: var(--ytl); }
  .smm-name { font-size: 12px; font-weight: 800; }
  .smm-handle { font-size: 9px; color: var(--g2); }
  .smm-stats { display: flex; gap: 8px; }
  .smm-stat { text-align: center; }
  .smm-stat-val { font-size: 13px; font-weight: 800; display: block; }
  .smm-stat-lbl { font-size: 7.5px; color: var(--g2); text-transform: uppercase; }
  .content-types { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 6px; }

  .check-list { list-style: none; }
  .check-list li { padding: 3px 0 3px 16px; position: relative; font-size: 9.5px; }
  .check-list li::before { content: '✓'; position: absolute; left: 0; color: var(--green); font-weight: 700; }

  .section-title {
    font-size: 10px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 1px; color: var(--bm); margin-bottom: 7px;
    padding-bottom: 4px; border-bottom: 2px solid var(--c2);
    display: flex; align-items: center; gap: 6px;
  }
  .section-title::before { content: ''; display: inline-block; width: 3px; height: 12px; background: var(--bm); border-radius: 2px; }

  .roi-card { background: linear-gradient(135deg, var(--br) 0%, var(--bm) 100%); color: white; border-radius: 12px; padding: 14px; text-align: center; }
  .roi-val { font-size: 36px; font-weight: 900; color: var(--bc); }
  .roi-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.7); }
  .roi-sub { font-size: 10px; color: rgba(255,255,255,0.8); margin-top: 4px; }

  .metric-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #f0e8df; }
  .metric-row:last-child { border-bottom: none; }
  .metric-name { font-size: 9.5px; color: var(--g); }
  .metric-val { font-size: 10px; font-weight: 700; color: var(--bm); }
  .metric-change { font-size: 8.5px; color: var(--green); }

  @media print {
    body { background: white; }
    .page { margin: 0; }
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 1: COVER                                          -->
<!-- ═══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="cover">
    <div class="cover-grid"></div>
    <div class="cover-topbar"></div>
    <div class="cover-photo-wrap">
      <img src="${imgSrc}" alt="Кофе Хаус — авторский кофе">
      <div class="cover-photo-overlay"></div>
      <div class="cover-photo-label">Фото: Unsplash · Specialty Coffee · г. Москва, 2025</div>
    </div>
    <div class="cover-body">
      <div class="cover-tag">Маркетинговый план 2025–2026</div>
      <div class="cover-title">Кофе Хаус</div>
      <div class="cover-sub">Авторский кофе и атмосфера</div>
      <div class="cover-period">Стратегический период: Июль 2025 — Июнь 2026 · 12 месяцев</div>
      <div class="cover-stats">
        <div class="cover-stat">
          <span class="cover-stat-val">8</span>
          <span class="cover-stat-lbl">Разделов</span>
        </div>
        <div class="cover-stat">
          <span class="cover-stat-val">240K</span>
          <span class="cover-stat-lbl">Охват / мес</span>
        </div>
        <div class="cover-stat">
          <span class="cover-stat-val">+35%</span>
          <span class="cover-stat-lbl">Рост выручки</span>
        </div>
        <div class="cover-stat">
          <span class="cover-stat-val">4.8★</span>
          <span class="cover-stat-lbl">Рейтинг</span>
        </div>
        <div class="cover-stat">
          <span class="cover-stat-val">850K</span>
          <span class="cover-stat-lbl">Бюджет ₽</span>
        </div>
      </div>
    </div>
    <div class="cover-bottom">
      <span>Конфиденциально</span>
      <span class="sep">·</span>
      <span>Кофе Хаус © 2025</span>
      <span class="sep">·</span>
      <span>Маркетинговый отдел</span>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 2: РЕЗЮМЕ И СИТУАЦИОННЫЙ АНАЛИЗ                  -->
<!-- ═══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="ph">
    <div class="ph-icon">📋</div>
    <div class="ph-text">
      <div class="ph-num">Раздел 02</div>
      <div class="ph-title">Резюме и ситуационный анализ</div>
      <div class="ph-sub">Текущее положение бизнеса, ключевые показатели и цели на 2025–2026</div>
    </div>
    <div class="ph-badge">Стр. 2 из 8</div>
  </div>
  <div class="pb">
    <div class="row" style="gap:12px; margin-bottom:10px;">
      <div class="col">
        <div class="section-title">Исполнительное резюме</div>
        <div class="card" style="margin-bottom:8px;">
          <div style="font-size:10px; color:var(--g); line-height:1.55;">
            «Кофе Хаус» — московская сеть кофеен премиум-сегмента, специализирующаяся на авторских рецептурах эспрессо и альтернативных методах заваривания. С 2022 года работают 3 точки в Центральном и Западном административных округах. Средний чек — 520 ₽, NPS — 74, рейтинг Google — 4.8★.
          </div>
        </div>
        <div class="section-title">Стратегические цели 2025–2026</div>
        <ul class="check-list">
          <li>Увеличить ежемесячную выручку с 1,4 до 1,9 млн ₽ (+35%)</li>
          <li>Открыть 4-ю точку в Хамовниках до Q1 2026</li>
          <li>Вырастить ВКонтакте-сообщество до 15 000 подписчиков</li>
          <li>Запустить Telegram-канал и набрать 5 000 участников</li>
          <li>Выстроить программу лояльности с удержанием 60% гостей</li>
          <li>Занять 12% рынка specialty coffee ЦАО г. Москвы</li>
          <li>Достичь ROMI маркетинговых вложений не менее 280%</li>
        </ul>
        <div class="divider"></div>
        <div class="section-title">Ключевые метрики сейчас</div>
        <div class="metric-row"><span class="metric-name">Ежемесячная выручка</span><span class="metric-val">1 420 000 ₽</span><span class="metric-change">↑ 12% vs 2024</span></div>
        <div class="metric-row"><span class="metric-name">Средний чек</span><span class="metric-val">520 ₽</span><span class="metric-change">↑ 8%</span></div>
        <div class="metric-row"><span class="metric-name">Постоянные гости (месяц)</span><span class="metric-val">1 840 чел.</span><span class="metric-change">↑ 18%</span></div>
        <div class="metric-row"><span class="metric-name">Конверсия онлайн → визит</span><span class="metric-val">6,4%</span><span class="metric-change">↑ 1.2 п.п.</span></div>
        <div class="metric-row"><span class="metric-name">Cost per Acquisition</span><span class="metric-val">310 ₽</span><span class="metric-change">↓ 40 ₽</span></div>
        <div class="metric-row"><span class="metric-name">Customer Lifetime Value</span><span class="metric-val">7 200 ₽</span><span class="metric-change">↑ 15%</span></div>
      </div>
      <div class="col-40">
        <div class="section-title">KPI-дашборд</div>
        <div class="kpi-grid" style="grid-template-columns: 1fr 1fr; gap:7px;">
          <div class="kpi"><span class="kpi-val">74</span><span class="kpi-lbl">NPS</span><span class="kpi-arrow">▲ +6</span></div>
          <div class="kpi"><span class="kpi-val">4.8★</span><span class="kpi-lbl">Google</span><span class="kpi-arrow">▲ +0.2</span></div>
          <div class="kpi"><span class="kpi-val">68%</span><span class="kpi-lbl">Возврат</span><span class="kpi-arrow">▲ +9%</span></div>
          <div class="kpi"><span class="kpi-val">3 440</span><span class="kpi-lbl">Чеков/мес</span><span class="kpi-arrow">▲ +12%</span></div>
        </div>
        <div class="divider"></div>
        <div class="section-title">Позиционирование</div>
        <div class="card card-blue" style="margin-bottom:7px;">
          <div style="font-size:9px; font-weight:700; color:var(--blue); margin-bottom:4px;">Ценностное предложение</div>
          <div style="font-size:9px; color:var(--g);">Место, где качество кофе встречается с уютной атмосферой. Каждая чашка — история от бариста с сертификатом SCA.</div>
        </div>
        <div class="card card-green" style="margin-bottom:7px;">
          <div style="font-size:9px; font-weight:700; color:var(--green); margin-bottom:4px;">Уникальные преимущества</div>
          <ul style="font-size:9px; color:var(--g); list-style:none;">
            <li style="padding:1px 0 1px 10px; position:relative;"><span style="position:absolute;left:0;color:var(--green);">✓</span>Зерно от 6 обжарщиков, ротация ежемесячно</li>
            <li style="padding:1px 0 1px 10px; position:relative;"><span style="position:absolute;left:0;color:var(--green);">✓</span>Авторское меню без алкоголя</li>
            <li style="padding:1px 0 1px 10px; position:relative;"><span style="position:absolute;left:0;color:var(--green);">✓</span>Кофейный клуб по подписке от 1 490 ₽/мес</li>
            <li style="padding:1px 0 1px 10px; position:relative;"><span style="position:absolute;left:0;color:var(--green);">✓</span>Бесплатные воркшопы 2 раза в месяц</li>
          </ul>
        </div>
        <div class="section-title" style="margin-top:4px;">Целевые рынки</div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:9px; width:80px; color:var(--g);">Specialty Coffee</span>
            <div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:78%"></div></div>
            <span style="font-size:9px; width:28px; color:var(--bm); font-weight:700;">78%</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:9px; width:80px; color:var(--g);">Доставка b2b</span>
            <div class="progress-bar" style="flex:1;"><div class="progress-fill-blue" style="width:45%"></div></div>
            <span style="font-size:9px; width:28px; color:var(--blue); font-weight:700;">45%</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:9px; width:80px; color:var(--g);">Подписка</span>
            <div class="progress-bar" style="flex:1;"><div class="progress-fill-green" style="width:30%"></div></div>
            <span style="font-size:9px; width:28px; color:var(--green); font-weight:700;">30%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="pf"><span>Кофе Хаус · Маркетинговый план 2025–2026</span><div class="pf-dot"></div><span>Страница 2</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 3: АНАЛИЗ РЫНКА                                  -->
<!-- ═══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="ph">
    <div class="ph-icon">📊</div>
    <div class="ph-text">
      <div class="ph-num">Раздел 03</div>
      <div class="ph-title">Анализ рынка кофеен Москвы</div>
      <div class="ph-sub">Объём рынка, тренды, сегменты и возможности роста</div>
    </div>
    <div class="ph-badge">Стр. 3 из 8</div>
  </div>
  <div class="pb">
    <div class="row" style="gap:12px; margin-bottom:10px;">
      <div class="col">
        <div class="section-title">Объём и динамика рынка</div>
        <div class="kpi-grid">
          <div class="kpi"><span class="kpi-val">68,4</span><span class="kpi-lbl">Млрд ₽ рынок</span><span class="kpi-arrow">▲ 11,2% г/г</span></div>
          <div class="kpi"><span class="kpi-val">4 200</span><span class="kpi-lbl">Кофеен в МСК</span><span class="kpi-arrow">▲ 340 за год</span></div>
          <div class="kpi"><span class="kpi-val">18,5%</span><span class="kpi-lbl">Доля specialty</span><span class="kpi-arrow">▲ 3,1 п.п.</span></div>
        </div>
        <div class="divider"></div>
        <div class="section-title">Сегменты рынка Москвы</div>
        <table class="table" style="margin-bottom:10px;">
          <tr><th>Сегмент</th><th>Доля</th><th>Рост г/г</th><th>Средний чек</th></tr>
          <tr><td>Specialty Coffee</td><td>18,5%</td><td style="color:var(--green);">+3,1 п.п.</td><td>480–700 ₽</td></tr>
          <tr><td>Сетевые кофейни</td><td>41,2%</td><td style="color:var(--g2);">+1,2 п.п.</td><td>220–350 ₽</td></tr>
          <tr><td>Кафе/рестораны</td><td>28,1%</td><td style="color:var(--ora);">–0,8 п.п.</td><td>600–1400 ₽</td></tr>
          <tr><td>Take-away точки</td><td>12,2%</td><td style="color:var(--green);">+2,4 п.п.</td><td>150–250 ₽</td></tr>
        </table>
        <div class="section-title">Ключевые тренды 2025–2026</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:7px;">
          <div class="card card-vk" style="margin-bottom:0;">
            <div style="font-size:9px; font-weight:700; color:var(--vk); margin-bottom:3px;">📱 Digital-first</div>
            <div style="font-size:9px;">72% гостей находят кофейню через соцсети. ВКонтакте растёт +28% аудитории в нише.</div>
          </div>
          <div class="card card-green" style="margin-bottom:0;">
            <div style="font-size:9px; font-weight:700; color:var(--green); margin-bottom:3px;">🌿 Экологичность</div>
            <div style="font-size:9px;">54% аудитории 25–35 лет выбирают заведения с эко-инициативами и многоразовой посудой.</div>
          </div>
          <div class="card card-ora" style="margin-bottom:0;">
            <div style="font-size:9px; font-weight:700; color:var(--ora); margin-bottom:3px;">📦 Подписки</div>
            <div style="font-size:9px;">Ежемесячная подписка на кофе растёт +45% г/г. Средний LTV подписчика в 3× выше разового гостя.</div>
          </div>
          <div class="card card-blue" style="margin-bottom:0;">
            <div style="font-size:9px; font-weight:700; color:var(--blue); margin-bottom:3px;">🏢 Корпоративный</div>
            <div style="font-size:9px;">B2B-заказы для офисов растут +22%. Средний контракт на поставку — 45 000 ₽/мес.</div>
          </div>
        </div>
      </div>
      <div class="col-40">
        <div class="section-title">Динамика выручки рынка</div>
        <div style="background:#fdf8f2; border-radius:10px; padding:10px; margin-bottom:10px;">
          <div style="font-size:8px; color:var(--g2); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.8px;">Рост рынка specialty coffee МСК, млрд ₽</div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${[['2021','4,2','40%'],['2022','6,8','55%'],['2023','9,4','70%'],['2024','11,9','85%'],['2025П','14,8','100%']].map(([y,v,w])=>`
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:8.5px; font-weight:600; width:28px; color:var(--bm);">${y}</span>
              <div class="progress-bar" style="flex:1;">
                <div class="progress-fill" style="width:${w};"></div>
              </div>
              <span style="font-size:8.5px; font-weight:700; width:28px; color:var(--br); text-align:right;">${v}</span>
            </div>`).join('')}
          </div>
        </div>
        <div class="section-title">Ёмкость ЦАО</div>
        <div class="card" style="margin-bottom:8px;">
          <div style="font-size:9px; line-height:1.55; color:var(--g);">
            В ЦАО работают <strong>620 кофеен</strong>, из которых specialty — около 95. Потенциальная аудитория ЦАО: <strong>2,3 млн</strong> уникальных потребителей/мес. Целевой охват «Кофе Хаус» в ЦАО на 2026 год — <strong>28 000 уникальных гостей</strong>.
          </div>
        </div>
        <div class="section-title">Регуляторная среда</div>
        <ul class="check-list" style="font-size:9px;">
          <li>Упрощённый онлайн-кассовый учёт с 01.2025</li>
          <li>Субсидии МП до 500 тыс. ₽ на digital-маркетинг</li>
          <li>Новые ГОСТы на систему лояльности (вступают в силу Q3 2025)</li>
          <li>Программа «Московский малый бизнес» — льготная аренда для ЦАО</li>
        </ul>
        <div class="divider"></div>
        <div class="section-title">Прогноз рынка 2026</div>
        <div style="background:linear-gradient(135deg,var(--br),var(--bm)); border-radius:10px; padding:10px; color:white; text-align:center;">
          <div style="font-size:24px; font-weight:900; color:var(--bc);">+11–14%</div>
          <div style="font-size:8.5px; opacity:0.8; text-transform:uppercase; letter-spacing:0.8px;">Прогноз роста рынка в 2026</div>
          <div style="font-size:9px; margin-top:6px; opacity:0.7;">Основной драйвер — рост specialty сегмента и корпоративные контракты</div>
        </div>
      </div>
    </div>
  </div>
  <div class="pf"><span>Кофе Хаус · Маркетинговый план 2025–2026</span><div class="pf-dot"></div><span>Страница 3</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 4: ЦЕЛЕВАЯ АУДИТОРИЯ                             -->
<!-- ═══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="ph">
    <div class="ph-icon">👥</div>
    <div class="ph-text">
      <div class="ph-num">Раздел 04</div>
      <div class="ph-title">Целевая аудитория</div>
      <div class="ph-sub">Персоны покупателей, демография, поведение и каналы коммуникации</div>
    </div>
    <div class="ph-badge">Стр. 4 из 8</div>
  </div>
  <div class="pb">
    <div class="section-title" style="margin-bottom:8px;">Сегментация аудитории</div>
    <div class="kpi-grid" style="margin-bottom:10px;">
      <div class="kpi"><span class="kpi-val" style="color:var(--vk);">42%</span><span class="kpi-lbl">Офисные работники</span></div>
      <div class="kpi"><span class="kpi-val" style="color:var(--pur);">31%</span><span class="kpi-lbl">Студенты/фрилансеры</span></div>
      <div class="kpi"><span class="kpi-val" style="color:var(--green);">27%</span><span class="kpi-lbl">Любители specialty</span></div>
    </div>
    <div class="row" style="gap:10px;">
      <div class="col-33">
        <div class="persona-card">
          <div class="persona-avatar" style="background:#E3F0FF;">💼</div>
          <div class="persona-name">Алексей, 32</div>
          <div class="persona-role">Руководитель проектов, IT-компания, ЦАО</div>
          <div class="divider" style="margin:5px 0;"></div>
          <div style="font-size:8.5px; color:var(--g); margin-bottom:5px;">
            <strong>Доход:</strong> 120–180 тыс. ₽/мес<br>
            <strong>Визиты:</strong> 4–5 раз в неделю<br>
            <strong>Средний чек:</strong> 560 ₽<br>
            <strong>Время:</strong> Утро 8:00–10:00
          </div>
          <div style="font-size:8.5px; color:var(--g); margin-bottom:5px;"><strong>Мотивы:</strong> Качество зерна, скорость обслуживания, стабильный wifi для созвонов.</div>
          <div class="persona-tags">
            <span class="tag tag-vk">ВКонтакте</span>
            <span class="tag tag-blue">Telegram</span>
            <span class="tag tag-br">Подписка</span>
          </div>
          <div style="margin-top:6px; font-size:8.5px; color:var(--g2);">
            <strong>Барьеры:</strong> очередь, нестабильный вкус
          </div>
        </div>
      </div>
      <div class="col-33">
        <div class="persona-card">
          <div class="persona-avatar" style="background:#F3E5F5;">🎨</div>
          <div class="persona-name">Мария, 26</div>
          <div class="persona-role">Дизайнер-фрилансер, работает из кофеен</div>
          <div class="divider" style="margin:5px 0;"></div>
          <div style="font-size:8.5px; color:var(--g); margin-bottom:5px;">
            <strong>Доход:</strong> 65–95 тыс. ₽/мес<br>
            <strong>Визиты:</strong> 2–3 раза в неделю<br>
            <strong>Средний чек:</strong> 480 ₽<br>
            <strong>Время:</strong> День 11:00–15:00
          </div>
          <div style="font-size:8.5px; color:var(--g); margin-bottom:5px;"><strong>Мотивы:</strong> Атмосфера, эстетика, фото для соцсетей, альт-методы, растительное молоко.</div>
          <div class="persona-tags">
            <span class="tag tag-vk">ВКонтакте</span>
            <span class="tag" style="background:#fff0e0;color:var(--ora);">YouTube</span>
            <span class="tag tag-br">UGC</span>
          </div>
          <div style="margin-top:6px; font-size:8.5px; color:var(--g2);">
            <strong>Барьеры:</strong> шумная обстановка, нет розеток
          </div>
        </div>
      </div>
      <div class="col-33">
        <div class="persona-card">
          <div class="persona-avatar" style="background:#E8F5E9;">☕</div>
          <div class="persona-name">Дмитрий, 39</div>
          <div class="persona-role">Кофейный энтузиаст, собственник бизнеса</div>
          <div class="divider" style="margin:5px 0;"></div>
          <div style="font-size:8.5px; color:var(--g); margin-bottom:5px;">
            <strong>Доход:</strong> 200+ тыс. ₽/мес<br>
            <strong>Визиты:</strong> 1–2 раза в неделю<br>
            <strong>Средний чек:</strong> 720 ₽<br>
            <strong>Время:</strong> Выходные 10:00–13:00
          </div>
          <div style="font-size:8.5px; color:var(--g); margin-bottom:5px;"><strong>Мотивы:</strong> Уникальные сорта, прямые поставки, общение с бариста, подписка на зерно.</div>
          <div class="persona-tags">
            <span class="tag tag-blue">Telegram</span>
            <span class="tag tag-green">Клуб</span>
            <span class="tag tag-br">B2B</span>
          </div>
          <div style="margin-top:6px; font-size:8.5px; color:var(--g2);">
            <strong>Барьеры:</strong> повторяющееся меню
          </div>
        </div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="row" style="gap:12px;">
      <div class="col">
        <div class="section-title">Каналы привлечения</div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${[['ВКонтакте / таргет','42%','vk'],['Органический поиск Google','24%','green'],['Telegram-каналы','18%','blue'],['Сарафанное радио','16%','br']].map(([n,p,c])=>`
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:9px; width:145px; color:var(--g);">${n}</span>
            <div class="progress-bar" style="flex:1;"><div class="progress-fill-${c==='vk'?'vk':c==='green'?'green':c==='blue'?'blue':''}" style="width:${p}; background:${c==='br'?'linear-gradient(90deg,var(--bm),var(--bc))':''}"></div></div>
            <span style="font-size:9px; width:28px; color:var(--bm); font-weight:700; text-align:right;">${p}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="col">
        <div class="section-title">Активность по времени суток</div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${[['08:00–10:00 (утро)','68%'],['10:00–12:00 (дополдень)','82%'],['12:00–14:00 (обед)','100%'],['14:00–17:00 (послеобед)','74%'],['17:00–20:00 (вечер)','55%']].map(([t,w])=>`
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:9px; width:145px; color:var(--g);">${t}</span>
            <div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:${w};"></div></div>
            <span style="font-size:9px; width:28px; color:var(--bm); font-weight:700; text-align:right;">${w}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="col">
        <div class="section-title">Поведенческие паттерны</div>
        <table class="table">
          <tr><th>Параметр</th><th>Значение</th></tr>
          <tr><td>Частота визитов</td><td>3,2 раза/нед</td></tr>
          <tr><td>Время в заведении</td><td>42 мин</td></tr>
          <tr><td>Доля повторных</td><td>68%</td></tr>
          <tr><td>Берут с собой</td><td>37%</td></tr>
          <tr><td>Приводят друзей</td><td>1,4 чел.</td></tr>
        </table>
      </div>
    </div>
  </div>
  <div class="pf"><span>Кофе Хаус · Маркетинговый план 2025–2026</span><div class="pf-dot"></div><span>Страница 4</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 5: SWOT И КОНКУРЕНТЫ                             -->
<!-- ═══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="ph">
    <div class="ph-icon">⚔️</div>
    <div class="ph-text">
      <div class="ph-num">Раздел 05</div>
      <div class="ph-title">SWOT-анализ и конкуренты</div>
      <div class="ph-sub">Сильные стороны, угрозы и сравнительный анализ конкурентной среды</div>
    </div>
    <div class="ph-badge">Стр. 5 из 8</div>
  </div>
  <div class="pb">
    <div class="row" style="gap:12px; margin-bottom:10px;">
      <div class="col">
        <div class="section-title">SWOT-матрица</div>
        <div class="swot-grid" style="margin-bottom:10px;">
          <div class="swot-cell swot-s">
            <div class="swot-title">S — Сильные стороны</div>
            <ul class="swot-list">
              <li>Высокий NPS (74) и рейтинг 4.8★</li>
              <li>Уникальные авторские рецептуры</li>
              <li>Сертифицированные бариста (SCA)</li>
              <li>Программа лояльности с 68% возвратом</li>
              <li>Подписка на кофейный клуб</li>
              <li>3 точки в проходимых локациях ЦАО</li>
            </ul>
          </div>
          <div class="swot-cell swot-w">
            <div class="swot-title">W — Слабые стороны</div>
            <ul class="swot-list">
              <li>Малая доля рынка (2,4%) в ЦАО</li>
              <li>Слабое присутствие в соцсетях</li>
              <li>Ограниченный маркетинговый бюджет</li>
              <li>Нет доставки и мобильного приложения</li>
              <li>Зависимость от 2 ключевых бариста</li>
              <li>Отсутствие корпоративных контрактов</li>
            </ul>
          </div>
          <div class="swot-cell swot-o">
            <div class="swot-title">O — Возможности</div>
            <ul class="swot-list">
              <li>Рост specialty сегмента +3,1 п.п. г/г</li>
              <li>Субсидии на digital-маркетинг до 500 тыс. ₽</li>
              <li>ВКонтакте: рост аудитории ниши +28%</li>
              <li>Корпоративный рынок (офисы ЦАО)</li>
              <li>Открытие 4-й точки в Хамовниках</li>
              <li>Запуск YouTube-шоу о кофейной культуре</li>
            </ul>
          </div>
          <div class="swot-cell swot-t">
            <div class="swot-title">T — Угрозы</div>
            <ul class="swot-list">
              <li>Крупные сети: «Самокат», «Кофемания»</li>
              <li>Рост стоимости аренды в ЦАО +18%</li>
              <li>Волатильность курса (зерно = импорт)</li>
              <li>Дефицит квалифицированных бариста</li>
              <li>Новые take-away форматы с низким чеком</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="col-40">
        <div class="section-title">Топ-5 конкурентов ЦАО</div>
        <table class="table" style="margin-bottom:10px; font-size:8.5px;">
          <tr><th>Конкурент</th><th>Чек ₽</th><th>ВК</th><th>Угроза</th></tr>
          <tr><td><strong>Даблби</strong></td><td>540</td><td style="color:var(--vk);">12K</td><td><span style="color:#C62828; font-weight:700;">●●●●○</span></td></tr>
          <tr><td><strong>Кофемания</strong></td><td>890</td><td style="color:var(--vk);">31K</td><td><span style="color:#E65100; font-weight:700;">●●●○○</span></td></tr>
          <tr><td><strong>Surf Coffee</strong></td><td>480</td><td style="color:var(--vk);">24K</td><td><span style="color:#C62828; font-weight:700;">●●●●○</span></td></tr>
          <tr><td><strong>Tasty Coffee</strong></td><td>420</td><td style="color:var(--vk);">8K</td><td><span style="color:#E65100; font-weight:700;">●●○○○</span></td></tr>
          <tr><td><strong>Micro Roasters</strong></td><td>600</td><td style="color:var(--vk);">5K</td><td><span style="color:#388E3C; font-weight:700;">●●○○○</span></td></tr>
        </table>
        <div class="section-title">Наши конкурентные преимущества</div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          ${[['Качество зерна','92%'],['Сервис бариста','88%'],['Атмосфера','85%'],['Программа лояльности','78%'],['Цена/качество','82%']].map(([n,p])=>`
          <div style="display:flex; align-items:center; gap:5px;">
            <span style="font-size:8.5px; width:130px;">${n}</span>
            <div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:${p};"></div></div>
            <span style="font-size:8.5px; width:28px; color:var(--bm); font-weight:700;">${p}</span>
          </div>`).join('')}
        </div>
        <div class="divider"></div>
        <div class="card card-green" style="margin-bottom:0;">
          <div style="font-size:9px; font-weight:700; color:var(--green); margin-bottom:4px;">Стратегия дифференциации</div>
          <div style="font-size:9px; line-height:1.5;">Фокус на <strong>community-building</strong> через ВКонтакте и Telegram: обучающие воркшопы, закрытый клуб подписчиков, коллаборации с локальными обжарщиками и UGC-контент с реальными историями гостей.</div>
        </div>
      </div>
    </div>
  </div>
  <div class="pf"><span>Кофе Хаус · Маркетинговый план 2025–2026</span><div class="pf-dot"></div><span>Страница 5</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 6: SMM СТРАТЕГИЯ — ВКонтакте + TELEGRAM + YouTube-->
<!-- ═══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="ph">
    <div class="ph-icon">📱</div>
    <div class="ph-text">
      <div class="ph-num">Раздел 06</div>
      <div class="ph-title">SMM-стратегия 2025–2026</div>
      <div class="ph-sub">ВКонтакте, Telegram и YouTube — контент-план, KPI, частота публикаций</div>
    </div>
    <div class="ph-badge">Стр. 6 из 8</div>
  </div>
  <div class="pb">
    <div class="smm-channel">
      <div class="smm-channel-header">
        <div class="smm-icon smm-icon-vk">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077FF"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm2.19 13.27h-1.83c-.68 0-.89-.54-2.12-1.78-1.06-1.04-1.53-.98-1.78-.98-.36 0-.46.1-.46.6v1.62c0 .43-.14.68-1.26.68-1.86 0-3.92-1.13-5.37-3.24C2.94 9.99 2.42 7.72 2.42 7.22c0-.25.1-.48.6-.48h1.83c.44 0 .61.2.78.67.86 2.48 2.3 4.66 2.89 4.66.22 0 .32-.1.32-.66V9.07c-.07-1.19-.69-1.29-.69-1.71 0-.21.17-.43.44-.43h2.88c.37 0 .5.2.5.63v3.39c0 .37.16.5.27.5.22 0 .41-.13.82-.54 1.27-1.43 2.18-3.62 2.18-3.62.12-.25.32-.49.76-.49h1.83c.55 0 .67.28.55.63-.23.99-2.44 4.19-2.44 4.19-.19.32-.26.46 0 .81.19.27.81.83 1.22 1.33.76.87 1.34 1.6 1.5 2.1.14.5-.13.75-.67.75z"/></svg>
        </div>
        <div>
          <div class="smm-name" style="color:var(--vk);">ВКонтакте</div>
          <div class="smm-handle">vk.com/kofe_house_msk · Основной канал роста</div>
        </div>
        <div class="smm-stats" style="margin-left:auto; gap:12px;">
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--vk);">3 200</span><span class="smm-stat-lbl">Сейчас</span></div>
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--green);">15 000</span><span class="smm-stat-lbl">Цель 2026</span></div>
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--bm);">5/нед</span><span class="smm-stat-lbl">Постов</span></div>
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--bm);">8,4%</span><span class="smm-stat-lbl">ER цель</span></div>
        </div>
      </div>
      <div class="row" style="gap:10px;">
        <div style="flex:1; font-size:9px; color:var(--g);">
          <strong style="color:var(--vk);">Контент-микс:</strong><br>
          <div style="display:flex; flex-wrap:wrap; gap:3px; margin-top:4px;">
            <span class="tag tag-vk">☕ Рецепты бариста 30%</span>
            <span class="tag tag-vk">📸 Атмосфера 25%</span>
            <span class="tag tag-vk">🎓 Воркшопы 20%</span>
            <span class="tag tag-vk">🏆 Отзывы гостей 15%</span>
            <span class="tag tag-vk">🎁 Акции/конкурсы 10%</span>
          </div>
        </div>
        <div style="flex:1; font-size:9px; color:var(--g);">
          <strong style="color:var(--vk);">Таргет ВКонтакте:</strong><br>
          Возраст 22–45 · Москва ЦАО · Интересы: кофе, specialty, HoReCa, ЗОЖ
          <br><strong>Бюджет таргета:</strong> 25 000 ₽/мес · CPM ≤ 180 ₽ · CPC ≤ 18 ₽
        </div>
      </div>
    </div>
    <div class="smm-channel">
      <div class="smm-channel-header">
        <div class="smm-icon smm-icon-tg" style="font-size:18px;">✈️</div>
        <div>
          <div class="smm-name" style="color:var(--tg);">Telegram-канал</div>
          <div class="smm-handle">t.me/kofe_house · Старт: Август 2025</div>
        </div>
        <div class="smm-stats" style="margin-left:auto; gap:12px;">
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--tg);">0</span><span class="smm-stat-lbl">Сейчас</span></div>
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--green);">5 000</span><span class="smm-stat-lbl">Цель 2026</span></div>
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--bm);">7/нед</span><span class="smm-stat-lbl">Постов</span></div>
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--bm);">42%</span><span class="smm-stat-lbl">Open rate</span></div>
        </div>
      </div>
      <div style="font-size:9px; color:var(--g);">
        <div style="display:flex; flex-wrap:wrap; gap:3px;">
          <span class="tag tag-blue">🔔 Ежедневный сорт дня</span>
          <span class="tag tag-blue">📦 Ранний доступ к новинкам</span>
          <span class="tag tag-blue">🎟 Приглашения на воркшопы</span>
          <span class="tag tag-blue">💬 Прямая связь с командой</span>
          <span class="tag tag-blue">🎁 Промокоды подписчикам</span>
        </div>
      </div>
    </div>
    <div class="smm-channel">
      <div class="smm-channel-header">
        <div class="smm-icon smm-icon-yt" style="font-size:18px;">▶️</div>
        <div>
          <div class="smm-name" style="color:var(--yt);">YouTube</div>
          <div class="smm-handle">youtube.com/@KofeHouseMsk · Запуск: Сентябрь 2025</div>
        </div>
        <div class="smm-stats" style="margin-left:auto; gap:12px;">
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--yt);">0</span><span class="smm-stat-lbl">Сейчас</span></div>
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--green);">2 500</span><span class="smm-stat-lbl">Цель 2026</span></div>
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--bm);">2/мес</span><span class="smm-stat-lbl">Видео</span></div>
          <div class="smm-stat"><span class="smm-stat-val" style="color:var(--bm);">8–12 мин</span><span class="smm-stat-lbl">Хронометраж</span></div>
        </div>
      </div>
      <div style="font-size:9px; color:var(--g);">
        <div style="display:flex; flex-wrap:wrap; gap:3px;">
          <span class="tag" style="background:var(--ytl);color:var(--yt);">🎬 Как варят кофе: мастер-класс</span>
          <span class="tag" style="background:var(--ytl);color:var(--yt);">🌍 Истории обжарщиков зерна</span>
          <span class="tag" style="background:var(--ytl);color:var(--yt);">🔬 Альтернативные методы</span>
          <span class="tag" style="background:var(--ytl);color:var(--yt);">📖 День из жизни бариста</span>
        </div>
      </div>
    </div>
    <div class="row" style="gap:10px; margin-top:4px;">
      <div class="col">
        <div class="section-title">Общие SMM-KPI 2026</div>
        <table class="table" style="font-size:8.5px;">
          <tr><th>Метрика</th><th>Цель</th><th>Трекинг</th></tr>
          <tr><td>Суммарный охват/мес</td><td>240 000+</td><td>Еженедельно</td></tr>
          <tr><td>ER ВКонтакте</td><td>≥ 8%</td><td>Ежемесячно</td></tr>
          <tr><td>Конверсия SMM → визит</td><td>≥ 6%</td><td>Ежемесячно</td></tr>
          <tr><td>UGC-публикации/мес</td><td>≥ 80</td><td>Еженедельно</td></tr>
          <tr><td>Упоминания бренда</td><td>≥ 200</td><td>Ежемесячно</td></tr>
        </table>
      </div>
      <div class="col">
        <div class="section-title">Контент-производство</div>
        <table class="table" style="font-size:8.5px;">
          <tr><th>Формат</th><th>ВК</th><th>TG</th><th>YT</th></tr>
          <tr><td>Фотосъёмка</td><td>3/нед</td><td>2/нед</td><td>—</td></tr>
          <tr><td>Reels/Shorts/Клипы</td><td>2/нед</td><td>1/нед</td><td>4/мес</td></tr>
          <tr><td>Сторис</td><td>5/нед</td><td>—</td><td>—</td></tr>
          <tr><td>Лонгриды/статьи</td><td>1/нед</td><td>3/нед</td><td>—</td></tr>
        </table>
      </div>
    </div>
  </div>
  <div class="pf"><span>Кофе Хаус · Маркетинговый план 2025–2026</span><div class="pf-dot"></div><span>Страница 6</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 7: БЮДЖЕТ И ROI                                  -->
<!-- ═══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="ph">
    <div class="ph-icon">💰</div>
    <div class="ph-text">
      <div class="ph-num">Раздел 07</div>
      <div class="ph-title">Маркетинговый бюджет и ROI</div>
      <div class="ph-sub">Распределение 850 000 ₽, прогноз окупаемости и финансовые KPI</div>
    </div>
    <div class="ph-badge">Стр. 7 из 8</div>
  </div>
  <div class="pb">
    <div class="row" style="gap:12px; margin-bottom:10px;">
      <div class="col">
        <div class="section-title">Распределение бюджета 850 000 ₽</div>
        <div style="margin-bottom:10px;">
          ${[
            ['Таргет ВКонтакте','300 000 ₽','35%','vk'],
            ['Контент-производство','170 000 ₽','20%','br'],
            ['SEO и контекст','102 000 ₽','12%','blue'],
            ['Воркшопы и события','85 000 ₽','10%','green'],
            ['Telegram Ads','68 000 ₽','8%','tg'],
            ['YouTube продакшн','68 000 ₽','8%','yt'],
            ['Email и SMS','34 000 ₽','4%','gray'],
            ['Аналитика и CRM','23 000 ₽','3%','gray'],
          ].map(([n,a,p])=>`
          <div class="budget-row">
            <span class="budget-label">${n}</span>
            <div class="budget-bar-wrap">
              <div class="progress-bar"><div class="progress-fill" style="width:${p};"></div></div>
            </div>
            <span class="budget-amount">${a}</span>
            <span class="budget-pct">${p}</span>
          </div>`).join('')}
        </div>
        <div class="divider"></div>
        <div class="section-title">Финансовый прогноз</div>
        <table class="table" style="font-size:8.5px;">
          <tr><th>Показатель</th><th>2024 факт</th><th>2025 план</th><th>2026 цель</th></tr>
          <tr><td>Выручка, ₽/год</td><td>17,04 млн</td><td>20,4 млн</td><td>22,8 млн</td></tr>
          <tr><td>Маркетинг-расходы, ₽</td><td>480 000</td><td>680 000</td><td>850 000</td></tr>
          <tr><td>ROMI</td><td>220%</td><td>265%</td><td>280%+</td></tr>
          <tr><td>CPA (стоимость гостя)</td><td>350 ₽</td><td>320 ₽</td><td>290 ₽</td></tr>
          <tr><td>LTV гостя, ₽</td><td>6 200</td><td>7 200</td><td>8 400</td></tr>
          <tr><td>Постоянных гостей/мес</td><td>1 560</td><td>1 840</td><td>2 400</td></tr>
        </table>
      </div>
      <div class="col-40">
        <div class="roi-card" style="margin-bottom:10px;">
          <div class="roi-lbl" style="margin-bottom:4px;">Прогноз ROMI 2026</div>
          <div class="roi-val">280%</div>
          <div class="roi-sub">На каждые 100 ₽ → 280 ₽ выручки</div>
          <div style="margin-top:8px; font-size:8.5px; color:rgba(255,255,255,0.6);">Окупаемость: 4,3 месяца</div>
        </div>
        <div class="section-title">Поквартальный план расходов</div>
        <table class="table" style="font-size:8.5px; margin-bottom:10px;">
          <tr><th>Квартал</th><th>Бюджет</th><th>Фокус</th></tr>
          <tr><td>Q3 2025</td><td>180 000 ₽</td><td>Запуск TG, ВК-таргет</td></tr>
          <tr><td>Q4 2025</td><td>220 000 ₽</td><td>НГ-акции, YouTube</td></tr>
          <tr><td>Q1 2026</td><td>230 000 ₽</td><td>Открытие 4-й точки</td></tr>
          <tr><td>Q2 2026</td><td>220 000 ₽</td><td>Летний сезон, SEO</td></tr>
        </table>
        <div class="section-title">KPI окупаемости по каналам</div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${[['ВКонтакте-таргет','420%'],['SEO/Контекст','310%'],['Voркшопы','280%'],['Telegram','260%'],['YouTube','190%']].map(([n,r])=>`
          <div style="display:flex; align-items:center; gap:5px;">
            <span style="font-size:8.5px; width:120px;">${n}</span>
            <div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:${Math.min(100,parseInt(r)/(420/100))}%;"></div></div>
            <span style="font-size:8.5px; width:36px; color:var(--bm); font-weight:700;">${r}</span>
          </div>`).join('')}
        </div>
        <div class="divider"></div>
        <div class="card card-green" style="margin-bottom:0;">
          <div style="font-size:9px; font-weight:700; color:var(--green); margin-bottom:3px;">Условие достижения ROMI 280%</div>
          <div style="font-size:9px; line-height:1.5;">Еженедельный мониторинг UTM-меток + настройка сквозной аналитики Roistat с интеграцией CRM на базе Битрикс24.</div>
        </div>
      </div>
    </div>
  </div>
  <div class="pf"><span>Кофе Хаус · Маркетинговый план 2025–2026</span><div class="pf-dot"></div><span>Страница 7</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 8: ПЛАН ДЕЙСТВИЙ / ROADMAP                       -->
<!-- ═══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="ph">
    <div class="ph-icon">🗓</div>
    <div class="ph-text">
      <div class="ph-num">Раздел 08</div>
      <div class="ph-title">Roadmap и план действий</div>
      <div class="ph-sub">Ежемесячный график активностей, ответственные, контрольные точки</div>
    </div>
    <div class="ph-badge">Стр. 8 из 8</div>
  </div>
  <div class="pb">
    <div class="section-title" style="margin-bottom:8px;">Gantt-диаграмма: Июль 2025 — Июнь 2026</div>
    <div style="background:#fdf8f2; border-radius:10px; padding:10px; margin-bottom:10px;">
      <div style="display:flex; gap:8px; margin-bottom:6px; padding-left:40px;">
        ${['Июл','Авг','Сен','Окт','Ноя','Дек','Янв','Фев','Мар','Апр','Май','Июн'].map(m=>`<div style="flex:1;text-align:center;font-size:7.5px;font-weight:700;color:var(--bm);text-transform:uppercase;">${m}</div>`).join('')}
      </div>
      ${[
        ['ВКонтакте','tl-vk','Таргет ВКонтакте','tl-vk',12],
        ['Telegram','tl-tg','Запуск TG-канала','tl-tg',11],
        ['YouTube','tl-yt','YouTube-шоу','tl-yt',10],
        ['SEO','tl-green','SEO + контекст','tl-green',12],
        ['4-я точка','tl-br','Хамовники — открытие','tl-pur',1],
        ['Воркшопы','tl-ora','Кофейные воркшопы 2×/мес','tl-ora',12],
        ['Email/CRM','tl-br','CRM + email-база','tl-br',11],
        ['Аналитика','tl-green','Сквозная аналитика Roistat','tl-green',12],
      ].map(([label, cls, title, tcls, months], i)=>`
      <div class="timeline-row">
        <div class="timeline-month" style="font-size:7.5px;">${label}</div>
        <div class="timeline-track">
          ${Array.from({length:12}).map((_,mi)=>{
            const active = label==='4-я точка' ? mi===2 : mi < months;
            if(!active && label!=='4-я точка') return `<div class="tl-item tl-gray" style="font-size:7px;"></div>`;
            if(label==='4-я точка' && mi===2) return `<div class="tl-item tl-pur" style="font-size:7px;">Откр.</div>`;
            if(label==='4-я точка') return `<div class="tl-item tl-gray" style="font-size:7px;"></div>`;
            if(mi===0) return `<div class="tl-item ${tcls}" style="font-size:7px;">${mi===0?'Старт':''}</div>`;
            return `<div class="tl-item ${tcls}" style="font-size:7px;"></div>`;
          }).join('')}
        </div>
      </div>`).join('')}
    </div>
    <div class="row" style="gap:10px;">
      <div class="col">
        <div class="section-title">Приоритеты по кварталам</div>
        <div class="card" style="margin-bottom:6px; padding:9px;">
          <div style="font-size:9px; font-weight:700; color:var(--bm); margin-bottom:4px;">Q3 2025 (Июл–Сен)</div>
          <ul class="check-list" style="font-size:9px;">
            <li>Редизайн ВКонтакте-сообщества и запуск таргета</li>
            <li>Старт Telegram-канала: первые 1 000 подписчиков</li>
            <li>Настройка UTM-меток и сквозной аналитики</li>
            <li>Найм SMM-специалиста и контент-фотографа</li>
          </ul>
        </div>
        <div class="card card-blue" style="margin-bottom:6px; padding:9px;">
          <div style="font-size:9px; font-weight:700; color:var(--blue); margin-bottom:4px;">Q4 2025 (Окт–Дек)</div>
          <ul class="check-list" style="font-size:9px;">
            <li>Запуск YouTube-шоу «Кофейная история»</li>
            <li>Новогодние акции и лимитированное меню</li>
            <li>Коллаборация с 3 московскими обжарщиками</li>
            <li>CRM-интеграция с программой лояльности</li>
          </ul>
        </div>
      </div>
      <div class="col">
        <div class="card card-pur" style="margin-bottom:6px; padding:9px;">
          <div style="font-size:9px; font-weight:700; color:var(--pur); margin-bottom:4px;">Q1 2026 (Янв–Мар)</div>
          <ul class="check-list" style="font-size:9px;">
            <li>Открытие 4-й точки в Хамовниках (Март)</li>
            <li>PR-кампания открытия: ВКонтакте + Telegram</li>
            <li>Корпоративные контракты: 10 офисов ЦАО</li>
            <li>Запуск B2B-страницы и лид-формы ВКонтакте</li>
          </ul>
        </div>
        <div class="card card-green" style="margin-bottom:6px; padding:9px;">
          <div style="font-size:9px; font-weight:700; color:var(--green); margin-bottom:4px;">Q2 2026 (Апр–Июн)</div>
          <ul class="check-list" style="font-size:9px;">
            <li>Летнее меню: холодный brew и авторские лимонады</li>
            <li>SEO-аудит и прокачка до топ-3 по «specialty coffee Москва»</li>
            <li>Итоговый ревью годового плана и корректировка</li>
            <li>Планирование маркетинг-стратегии 2027</li>
          </ul>
        </div>
      </div>
      <div class="col-33">
        <div class="section-title">Команда маркетинга</div>
        <table class="table" style="font-size:8.5px; margin-bottom:8px;">
          <tr><th>Роль</th><th>Ответственный</th></tr>
          <tr><td>Маркетинг-директор</td><td>Рустам А.</td></tr>
          <tr><td>SMM-специалист</td><td>Подбор Q3 2025</td></tr>
          <tr><td>Фотограф/Видеограф</td><td>Аутсорс</td></tr>
          <tr><td>Таргетолог ВКонтакте</td><td>Аутсорс</td></tr>
          <tr><td>SEO-специалист</td><td>Аутсорс</td></tr>
        </table>
        <div class="card" style="background:linear-gradient(135deg,var(--br),var(--bm)); padding:10px; text-align:center;">
          <div style="color:var(--bc); font-size:20px; font-weight:900;">июнь 2026</div>
          <div style="color:rgba(255,255,255,0.7); font-size:8px; text-transform:uppercase; letter-spacing:0.8px; margin-top:3px;">Контрольная точка</div>
          <div style="color:white; font-size:8.5px; margin-top:5px;">Итоговая оценка всех KPI и принятие решения о масштабировании</div>
        </div>
      </div>
    </div>
  </div>
  <div class="pf"><span>Кофе Хаус · Маркетинговый план 2025–2026 · Конфиденциально</span><div class="pf-dot"></div><span>Страница 8 из 8</span></div>
</div>

</body>
</html>`;
}

async function main() {
  if (!fs.existsSync(path.join(__dirname, 'tmp'))) {
    fs.mkdirSync(path.join(__dirname, 'tmp'), { recursive: true });
  }

  // Try multiple Unsplash coffee cup photos
  const PHOTO_URLS = [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?q=80&w=1200&auto=format&fit=crop',
  ];

  // Use URL directly — let Playwright's Chromium browser load it
  const imgSrc = PHOTO_URLS[0];
  console.log('Using image URL directly (Playwright will fetch):', imgSrc.slice(0, 60));

  const html = buildHTML(imgSrc);
  const htmlPath = path.join(__dirname, 'tmp', 'marketing_v4.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('HTML written to:', htmlPath);

  console.log('Launching Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // wait for Google Fonts

  await page.pdf({
    path: OUTPUT,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  });

  await browser.close();

  const size = (fs.statSync(OUTPUT).size / 1024).toFixed(0);
  console.log(`\n✅ PDF ready: ${OUTPUT}`);
  console.log(`   Size: ${size} KB`);
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });
