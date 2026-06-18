#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus.flowables import Flowable
import os

# ─── Цвета бренда ────────────────────────────────────────────────────────────
BROWN_DARK   = colors.HexColor('#3B1F0A')   # шапки
BROWN_MID    = colors.HexColor('#6F3B1A')   # акценты
BROWN_LIGHT  = colors.HexColor('#C8956C')   # подзаголовки
CREAM        = colors.HexColor('#FDF6EC')   # фон ячеек
CREAM_DARK   = colors.HexColor('#F0E0C8')   # чередование строк
WHITE        = colors.white
GRAY_LIGHT   = colors.HexColor('#F5F5F5')
GRAY_TEXT    = colors.HexColor('#444444')
GREEN_KPI    = colors.HexColor('#2E7D32')

OUTPUT = r'C:\Users\User10\jarvis-bot\marketing-plan-demo.pdf'

# ─── Шрифты ──────────────────────────────────────────────────────────────────
def register_fonts():
    font_dirs = [
        r'C:\Windows\Fonts',
        r'C:\Users\User10\AppData\Local\Microsoft\Windows\Fonts',
    ]
    candidates = {
        'Regular': ['DejaVuSans.ttf', 'arial.ttf', 'calibri.ttf'],
        'Bold':    ['DejaVuSans-Bold.ttf', 'arialbd.ttf', 'calibrib.ttf'],
        'Italic':  ['DejaVuSans-Oblique.ttf', 'ariali.ttf', 'calibrii.ttf'],
    }
    found = {}
    for style, names in candidates.items():
        for d in font_dirs:
            for n in names:
                p = os.path.join(d, n)
                if os.path.exists(p):
                    found[style] = (n.split('.')[0].replace('-',''), p)
                    break
            if style in found:
                break
    if len(found) < 2:
        return 'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique'
    reg_name = 'DocFont'
    bold_name = 'DocFontBold'
    ital_name = 'DocFontItalic' if 'Italic' in found else reg_name
    pdfmetrics.registerFont(TTFont(reg_name,  found['Regular'][1]))
    pdfmetrics.registerFont(TTFont(bold_name, found['Bold'][1]))
    if 'Italic' in found:
        pdfmetrics.registerFont(TTFont(ital_name, found['Italic'][1]))
    return reg_name, bold_name, ital_name

F, FB, FI = register_fonts()

# ─── Стили ───────────────────────────────────────────────────────────────────
def make_styles():
    s = {}
    s['h1'] = ParagraphStyle('H1', fontName=FB, fontSize=22, textColor=WHITE,
                              alignment=TA_CENTER, leading=28, spaceAfter=4)
    s['h1sub'] = ParagraphStyle('H1sub', fontName=F, fontSize=11, textColor=CREAM,
                                 alignment=TA_CENTER, leading=16)
    s['section'] = ParagraphStyle('Section', fontName=FB, fontSize=14,
                                   textColor=WHITE, leading=20,
                                   spaceBefore=18, spaceAfter=4)
    s['sub'] = ParagraphStyle('Sub', fontName=FB, fontSize=11,
                               textColor=BROWN_MID, leading=16,
                               spaceBefore=10, spaceAfter=2)
    s['body'] = ParagraphStyle('Body', fontName=F, textColor=GRAY_TEXT, leading=14,
                                fontSize=10, spaceAfter=6, alignment=TA_JUSTIFY)
    s['bullet'] = ParagraphStyle('Bullet', fontName=F, textColor=GRAY_TEXT, leading=14,
                                  fontSize=10, leftIndent=14, firstLineIndent=-10, spaceAfter=3)
    s['small'] = ParagraphStyle('Small', fontName=F, fontSize=8.5,
                                 textColor=colors.HexColor('#666666'), leading=12)
    s['caption'] = ParagraphStyle('Caption', fontName=FB, fontSize=9,
                                   textColor=BROWN_DARK, alignment=TA_CENTER,
                                   spaceBefore=4, spaceAfter=8)
    s['table_h'] = ParagraphStyle('TH', fontName=FB, fontSize=9, textColor=WHITE,
                                   alignment=TA_CENTER, leading=12)
    s['table_c'] = ParagraphStyle('TC', fontName=F, fontSize=9, textColor=GRAY_TEXT,
                                   alignment=TA_LEFT, leading=12)
    s['table_cc'] = ParagraphStyle('TCC', fontName=F, fontSize=9, textColor=GRAY_TEXT,
                                    alignment=TA_CENTER, leading=12)
    s['kpi_good'] = ParagraphStyle('KGood', fontName=FB, fontSize=9,
                                    textColor=GREEN_KPI, alignment=TA_CENTER, leading=12)
    s['cover_meta'] = ParagraphStyle('CM', fontName=F, fontSize=10,
                                      textColor=CREAM_DARK, alignment=TA_CENTER, leading=16)
    return s

ST = make_styles()

# ─── Вспомогательные элементы ────────────────────────────────────────────────
def section_header(num, title):
    bg = Table([[Paragraph(f'{num}. {title}', ST['section'])]],
               colWidths=[17*cm])
    bg.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BROWN_DARK),
        ('ROUNDEDCORNERS', [6,6,6,6]),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING',   (0,0), (-1,-1), 14),
        ('RIGHTPADDING',  (0,0), (-1,-1), 14),
    ]))
    return bg

def sub_header(title):
    return Paragraph(title, ST['sub'])

def body(text):
    return Paragraph(text, ST['body'])

def bullet(text):
    return Paragraph(f'• {text}', ST['bullet'])

def sp(h=6):
    return Spacer(1, h)

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BROWN_LIGHT,
                       spaceAfter=6, spaceBefore=4)

def styled_table(data, col_widths, header_rows=1, row_colors=True):
    tbl = Table(data, colWidths=col_widths, repeatRows=header_rows)
    style = [
        ('BACKGROUND',   (0,0), (-1, header_rows-1), BROWN_MID),
        ('TEXTCOLOR',    (0,0), (-1, header_rows-1), WHITE),
        ('FONTNAME',     (0,0), (-1, header_rows-1), FB),
        ('FONTSIZE',     (0,0), (-1,-1), 9),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ('LEFTPADDING',  (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID',         (0,0), (-1,-1), 0.4, colors.HexColor('#CCCCCC')),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, header_rows), (-1,-1),
         [WHITE, CREAM] if row_colors else [WHITE]),
    ]
    tbl.setStyle(TableStyle(style))
    return tbl

# ─── Нумерация страниц ────────────────────────────────────────────────────────
def add_page_number(canvas, doc):
    canvas.saveState()
    # Footer line
    canvas.setStrokeColor(BROWN_LIGHT)
    canvas.setLineWidth(0.5)
    canvas.line(2*cm, 1.6*cm, 19*cm, 1.6*cm)
    # Logo text left
    canvas.setFont(FB, 8)
    canvas.setFillColor(BROWN_MID)
    canvas.drawString(2*cm, 1.2*cm, 'Кофе Хаус • Маркетинговый план 2026')
    # Page number right
    canvas.setFont(F, 8)
    canvas.setFillColor(GRAY_TEXT)
    canvas.drawRightString(19*cm, 1.2*cm, f'Стр. {doc.page}')
    canvas.restoreState()

# ─── ОБЛОЖКА ─────────────────────────────────────────────────────────────────
def cover_page():
    elems = []
    elems.append(sp(60))

    # Главный блок
    cover_data = [[
        Paragraph('☕ КОФЕ ХАУС', ST['h1']),
    ]]
    cover_tbl = Table(cover_data, colWidths=[17*cm])
    cover_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), BROWN_DARK),
        ('TOPPADDING',    (0,0), (-1,-1), 20),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 20),
        ('RIGHTPADDING',  (0,0), (-1,-1), 20),
    ]))
    elems.append(cover_tbl)

    sub_data = [[Paragraph('МАРКЕТИНГОВЫЙ ПЛАН', ST['h1'])]]
    sub_tbl = Table(sub_data, colWidths=[17*cm])
    sub_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), BROWN_MID),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 20),
        ('LEFTPADDING',   (0,0), (-1,-1), 20),
        ('RIGHTPADDING',  (0,0), (-1,-1), 20),
    ]))
    elems.append(sub_tbl)
    elems.append(sp(14))

    meta_data = [[
        Paragraph('Город: Махачкала, Республика Дагестан', ST['cover_meta']),
        Paragraph('Период: Июль — Сентябрь 2026', ST['cover_meta']),
    ],[
        Paragraph('Составил: Рустам • Фриланс-маркетолог', ST['cover_meta']),
        Paragraph('Дата: 13 июня 2026 г.', ST['cover_meta']),
    ]]
    meta_tbl = Table(meta_data, colWidths=[8.5*cm, 8.5*cm])
    meta_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), BROWN_DARK),
        ('TOPPADDING',    (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('RIGHTPADDING',  (0,0), (-1,-1), 10),
        ('LINEABOVE',     (0,0), (-1,0), 1, BROWN_LIGHT),
        ('LINEBEFORE',    (1,0), (1,-1), 0.5, BROWN_LIGHT),
    ]))
    elems.append(meta_tbl)
    elems.append(sp(20))

    # Аннотация
    anno_data = [[
        Paragraph(
            'Демонстрационный документ для портфолио. Все данные о конкурентах, '
            'аудитории и бюджетах являются оценочными и созданы в учебных целях.',
            ST['small']
        )
    ]]
    anno_tbl = Table(anno_data, colWidths=[17*cm])
    anno_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), CREAM),
        ('TOPPADDING',    (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING',   (0,0), (-1,-1), 14),
        ('RIGHTPADDING',  (0,0), (-1,-1), 14),
        ('LINEABOVE',     (0,0), (-1,0), 2, BROWN_LIGHT),
    ]))
    elems.append(anno_tbl)
    elems.append(PageBreak())
    return elems

# ─── РАЗДЕЛ 1: РЕЗЮМЕ ────────────────────────────────────────────────────────
def section_summary():
    e = []
    e.append(section_header(1, 'Резюме проекта'))
    e.append(sp(8))
    e.append(body(
        'Кофейня <b>«Кофе Хаус»</b> — камерное заведение премиальной повседневной категории, '
        'расположенное в центральном районе Махачкалы. Концепция: авторский кофе, '
        'домашняя выпечка и уютная атмосфера для встреч и удалённой работы. '
        'Вместимость — 40 посадочных мест, режим работы 08:00–22:00 ежедневно.'
    ))
    e.append(sp(6))

    kv = [
        ['Показатель', 'Значение'],
        ['Средний чек', '450 ₽'],
        ['Плановая загрузка (июль)', '55%'],
        ['Целевая выручка / мес', '1 200 000 ₽'],
        ['Маркетинговый бюджет', '55 000 ₽ / мес'],
        ['Горизонт плана', '3 месяца (июль–сентябрь 2026)'],
        ['Ключевая цель', 'Увеличить поток гостей на 30% за квартал'],
    ]
    rows = [[Paragraph(r[0], ST['table_h'] if i==0 else ST['table_c']),
             Paragraph(r[1], ST['table_h'] if i==0 else ST['table_cc'])]
            for i, r in enumerate(kv)]
    e.append(styled_table(rows, [8*cm, 9*cm]))
    e.append(sp(10))

    e.append(sub_header('Ключевые цели на квартал'))
    for g in [
        'Охват 50 000+ уникальных пользователей через digital-каналы',
        'Привлечь 300+ новых гостей через 2GIS и Яндекс.Карты',
        'Набрать 2 000 подписчиков в Instagram-аккаунте',
        'Достичь среднего рейтинга 4.8★ на картографических сервисах',
        'Обеспечить ROI маркетинга не ниже 180%',
    ]:
        e.append(bullet(g))
    return e

# ─── РАЗДЕЛ 2: АНАЛИЗ РЫНКА ──────────────────────────────────────────────────
def section_market():
    e = []
    e.append(sp(14))
    e.append(section_header(2, 'Анализ рынка и ниши'))
    e.append(sp(8))
    e.append(body(
        'Рынок общественного питания Махачкалы демонстрирует устойчивый рост: '
        'по оценкам 2ГИС и Яндекс.Бизнес, число кофеен в городе за 2023–2025 гг. '
        'выросло с 47 до 90+ заведений (+91%). Тем не менее сегмент '
        '<b>«specialty-кофе + работа/учёба»</b> остаётся недозаполненным — '
        'большинство игроков работают в фастфуд-формате.'
    ))
    e.append(sp(8))

    mkt = [
        ['Параметр', 'Данные', 'Источник'],
        ['Население Махачкалы', '700 000+ чел.', 'Росстат 2024'],
        ['Доля молодёжи 18–35 лет', '~34% (238 000)', 'Оценка по данным переписи'],
        ['Число кофеен в городе', '90+', '2ГИС, май 2026'],
        ['Средний чек в сегменте', '350–600 ₽', 'Mystery shopping'],
        ['Рост рынка кофе РФ 2025', '+12% г/г', 'РБК Исследования'],
        ['Популярность доставки кофе', '27% заказов', 'Яндекс.Еда, 2025'],
    ]
    rows = [[Paragraph(c, ST['table_h'] if i==0 else ST['table_c'])
             for c in r] for i, r in enumerate(mkt)]
    e.append(styled_table(rows, [5.5*cm, 6.5*cm, 5*cm]))
    e.append(sp(10))

    e.append(sub_header('Тренды и возможности'))
    for t in [
        '<b>Рост кофейной культуры</b> — махачкалинцы всё чаще выбирают альтернативные методы заваривания',
        '<b>Удалённая работа</b> — спрос на «третье место» с Wi-Fi и розетками',
        '<b>Instagram-экономика</b> — фотогеничный интерьер = бесплатный UGC-контент',
        '<b>Халяль-запрос</b> — аудитория ждёт заведений без алкоголя с качественными продуктами',
        '<b>Доставка</b> — подключение к Яндекс.Еда/Delivery Club даёт +20–30% оборота',
    ]:
        e.append(bullet(t))

    e.append(sp(8))
    e.append(sub_header('Угрозы'))
    for t in [
        'Низкий порог входа → активный рост конкурентов',
        'Сезонный спад в летние месяцы (туристический, а не деловой поток)',
        'Волатильность цен на зерно арабика (+18% в 2024)',
    ]:
        e.append(bullet(t))
    return e

# ─── РАЗДЕЛ 3: ЦЕЛЕВАЯ АУДИТОРИЯ ─────────────────────────────────────────────
def section_audience():
    e = []
    e.append(PageBreak())
    e.append(section_header(3, 'Целевая аудитория — 3 портрета'))
    e.append(sp(10))

    personas = [
        {
            'name': 'Портрет 1 — «Студент-удалёнщик» Амир, 22 года',
            'rows': [
                ('Демография', 'Муж., 20–26 лет, студент/фрилансер, доход 25–50 тыс. ₽'),
                ('Поведение',  'В кофейне 3–4 раза в неделю, остаётся 2–3 часа, берёт 2 напитка'),
                ('Боли',       'Нет нормального места для работы дома; ищет Wi-Fi + тишину'),
                ('Каналы',     'Instagram Reels, Telegram, 2ГИС (читает отзывы)'),
                ('УТП-крючок', 'Безлимитный Wi-Fi, розетки у каждого стола, «тихая зона»'),
            ]
        },
        {
            'name': 'Портрет 2 — «Молодая мама» Патимат, 31 год',
            'rows': [
                ('Демография', 'Жен., 27–38 лет, в декрете / на part-time, доход семьи 70–100 тыс.'),
                ('Поведение',  'Встречи с подругами 1–2 раза в неделю, фотографирует еду'),
                ('Боли',       'Хочет красивое место без суеты; важна безопасность для ребёнка'),
                ('Каналы',     'Instagram, рекомендации знакомых, Яндекс.Карты'),
                ('УТП-крючок', 'Детский уголок, фотозона, халяль-меню, детокс-напитки'),
            ]
        },
        {
            'name': 'Портрет 3 — «Деловой» Расул, 38 лет',
            'rows': [
                ('Демография', 'Муж., 32–45 лет, предприниматель / менеджер, доход 120 000+'),
                ('Поведение',  'Деловые встречи, завтраки, кофе на вынос. Ценит скорость и статус'),
                ('Боли',       'Нет достойного места для переговоров в центре города'),
                ('Каналы',     'Яндекс.Карты, 2ГИС (топ-рейтинг), сарафанное радио'),
                ('УТП-крючок', 'VIP-зона, бронирование стола, бизнес-ланч, экспресс-подача 5 мин'),
            ]
        },
    ]

    for p in personas:
        e.append(sub_header(p['name']))
        rows = [[Paragraph(r[0], ST['table_h']), Paragraph(r[1], ST['table_c'])]
                for r in p['rows']]
        tbl = styled_table(rows, [3.5*cm, 13.5*cm], header_rows=0, row_colors=True)
        e.append(tbl)
        e.append(sp(10))
    return e

# ─── РАЗДЕЛ 4: КОНКУРЕНТЫ ────────────────────────────────────────────────────
def section_competitors():
    e = []
    e.append(section_header(4, 'Анализ конкурентов'))
    e.append(sp(8))
    e.append(body(
        'Проведён анализ трёх прямых конкурентов в радиусе 1,5 км от «Кофе Хаус». '
        'Данные собраны методом mystery shopping и мониторинга открытых источников (2ГИС, Instagram).'
    ))
    e.append(sp(8))

    hdrs = ['Параметр', 'Barista Point', 'Coffee Lab', 'Дагкофе']
    rows_data = [
        ('Позиционирование', 'Масс-маркет, быстро', 'Specialty, дорого', 'Сети, демократично'),
        ('Средний чек',      '250–350 ₽',           '550–750 ₽',          '200–300 ₽'),
        ('Рейтинг 2ГИС',     '4.5★ (312 отзыва)',   '4.7★ (89 отзывов)', '4.3★ (520 отзывов)'),
        ('Instagram',        '3 200 подп.',          '8 100 подп.',        '1 800 подп.'),
        ('Сильные стороны',  'Цена, скорость',       'Качество зерна',     'Точки по всему городу'),
        ('Слабости',         'Нет атмосферы, мало места для работы',
                             'Дорого, нет детской зоны',
                             'Низкое качество контента, нет Wi-Fi'),
        ('Возможность входа','Предложить атмосферу + средний чек',
                             'Схожее качество по цене ниже',
                             'Контент + Wi-Fi + сервис'),
    ]

    tbl_data = [[Paragraph(h, ST['table_h']) for h in hdrs]]
    for r in rows_data:
        tbl_data.append([Paragraph(c, ST['table_c']) for c in r])

    tbl = Table(tbl_data, colWidths=[4*cm, 4.3*cm, 4.3*cm, 4.4*cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), BROWN_MID),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), FB),
        ('FONTNAME',      (0,1), (0,-1), FB),
        ('BACKGROUND',    (0,1), (0,-1), CREAM),
        ('FONTSIZE',      (0,0), (-1,-1), 8.5),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 5),
        ('RIGHTPADDING',  (0,0), (-1,-1), 5),
        ('GRID',          (0,0), (-1,-1), 0.4, colors.HexColor('#CCCCCC')),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, CREAM]),
    ]))
    e.append(tbl)
    e.append(sp(10))

    e.append(sub_header('УТП «Кофе Хаус» на фоне конкурентов'))
    e.append(body(
        'Кофейня занимает нишу <b>«specialty-качество по демократичной цене»</b> '
        'с фокусом на атмосферу, удобство (Wi-Fi, розетки, тихая зона) '
        'и халяль-концепцию — ни один из прямых конкурентов не закрывает '
        'все три запроса одновременно.'
    ))
    return e

# ─── РАЗДЕЛ 5: КАНАЛЫ ПРОДВИЖЕНИЯ ───────────────────────────────────────────
def section_channels():
    e = []
    e.append(PageBreak())
    e.append(section_header(5, 'Каналы продвижения'))
    e.append(sp(10))

    channels = [
        {
            'name': 'Instagram / Reels',
            'icon': 'Instagram',
            'desc': 'Основной визуальный канал. Ставка на Reels (охват) + Stories (вовлечение) + UGC.',
            'actions': [
                'Публикация 5 постов в неделю (3 Reels + 2 карусели)',
                'Stories ежедневно: опросы, меню дня, «за кулисами»',
                'Хэштеги: #кофемахачкала #кофехаус #кафемахачкала',
                'Коллаборации с 2–3 местными микроинфлюенсерами (10–30 тыс. подп.)',
                'Таргетированная реклама на аудиторию Махачкалы 18–40 лет',
            ]
        },
        {
            'name': '2ГИС',
            'icon': '2GIS',
            'desc': 'Главный локальный справочник. Приоритет — карточка организации и отзывы.',
            'actions': [
                'Заполнить карточку на 100%: фото (15+), меню, Wi-Fi, парковка',
                'Ответить на все существующие отзывы в течение 24 часов',
                'Мотивировать гостей оставлять отзывы (QR-код на столах)',
                'Подключить функцию «Акции» — еженедельное спецпредложение',
                'Цель: рейтинг 4.8★ к концу августа 2026',
            ]
        },
        {
            'name': 'Яндекс (Карты + Директ)',
            'icon': 'Яндекс',
            'desc': 'Яндекс.Карты для локального поиска, Директ для перехвата горячего спроса.',
            'actions': [
                'Оптимизировать карточку Яндекс.Бизнес: фото, часы, Wi-Fi, описание',
                'Запустить Директ: кампания «Кофейня рядом» по геозапросам (радиус 2 км)',
                'Ключи: «кофейня Махачкала», «кофе с собой», «где выпить кофе центр»',
                'Бюджет Директ: 15 000 ₽/мес, CPL не более 200 ₽',
                'Еженедельный мониторинг позиций в локальном поиске',
            ]
        },
        {
            'name': 'Флаеры и офлайн',
            'icon': 'Офлайн',
            'desc': 'Локальное присутствие в радиусе 1 км: университеты, бизнес-центры, ТЦ.',
            'actions': [
                'Тираж: 2 000 флаеров А5 с QR-кодом на Instagram и скидкой 15%',
                'Распространение: ДГТУ, ДГУ, БЦ «Орион», рынок Анжи',
                'Партнёрство с соседними магазинами (взаимообмен флаерами)',
                'Штендер у входа и наружная вывеска с актуальным меню',
                'Welcome-бонус: карточка лояльности с 6-й чашкой в подарок',
            ]
        },
    ]

    for ch in channels:
        e.append(sub_header(f'{ch["icon"]}  {ch["name"]}'))
        e.append(body(ch['desc']))
        for a in ch['actions']:
            e.append(bullet(a))
        e.append(sp(6))

    return e

# ─── РАЗДЕЛ 6: КОНТЕНТ-ПЛАН ───────────────────────────────────────────────────
def section_content():
    e = []
    e.append(section_header(6, 'Контент-план на июль 2026'))
    e.append(sp(8))

    hdrs = ['Неделя', 'Дата', 'Канал', 'Формат', 'Тема / Идея', 'Цель']
    data = [hdrs] + [
        # Неделя 1
        ['1', '1 июл', 'Instagram', 'Reels', 'Открытие сезона: «Летнее меню уже здесь»', 'Охват'],
        ['1', '2 июл', 'Instagram', 'Story', 'Опрос: «Какой кофе любите летом?»', 'Вовлечение'],
        ['1', '3 июл', '2ГИС', 'Акция', 'Скидка 15% каждый вторник до 12:00', 'Визиты'],
        ['1', '4 июл', 'Instagram', 'Карусель', '5 причин работать в Кофе Хаус', 'Подписки'],
        ['1', '5 июл', 'Instagram', 'Reels', 'Бариста готовит колд-брю — таймлапс', 'Охват'],
        # Неделя 2
        ['2', '8 июл', 'Instagram', 'Reels', 'UGC: репост гостя + благодарность', 'Доверие'],
        ['2', '9 июл', 'Яндекс', 'Директ', 'Запуск кампании «Кофейня рядом»', 'Трафик'],
        ['2', '10 июл', 'Instagram', 'Карусель', 'Гайд: как мы варим эспрессо', 'Экспертиза'],
        ['2', '11 июл', 'Instagram', 'Story', 'За кулисами: утро до открытия', 'Близость'],
        ['2', '12 июл', 'Офлайн', 'Флаеры', 'Раздача у ДГТУ и ДГУ', 'Новые гости'],
        # Неделя 3
        ['3', '15 июл', 'Instagram', 'Reels', 'Инфлюенсер Алия: обзор меню', 'Охват/Доверие'],
        ['3', '16 июл', 'Instagram', 'Пост', 'История бренда: почему «Кофе Хаус»?', 'Лояльность'],
        ['3', '17 июл', '2ГИС', 'Фото', 'Обновить фото летней веранды', 'Конверсия'],
        ['3', '18 июл', 'Instagram', 'Reels', '«День бариста» — мини-интервью', 'Вовлечение'],
        ['3', '19 июл', 'Instagram', 'Story', 'Голосование за новый десерт в меню', 'UGC'],
        # Неделя 4
        ['4', '22 июл', 'Instagram', 'Карусель', 'Топ-5 летних напитков: рейтинг гостей', 'Охват'],
        ['4', '23 июл', 'Instagram', 'Reels', 'Тайм-лапс: аншлаг в пятницу вечером', 'Социальное доказательство'],
        ['4', '24 июл', 'Яндекс', 'Аналитика', 'Ревизия Директ: отключить нерабочие ключи', 'ROI'],
        ['4', '25 июл', 'Instagram', 'Story', 'Анонс: бонусный месяц — каждый 6-й кофе в подарок', 'Удержание'],
        ['4', '26 июл', 'Все', 'Итоги', 'Подведение итогов месяца: охваты, новые гости, выручка', 'Оптимизация'],
    ]

    col_w = [1.3*cm, 1.5*cm, 2.5*cm, 2.2*cm, 6*cm, 3.5*cm]
    tbl_data = []
    for i, row in enumerate(data):
        st = ST['table_h'] if i == 0 else ST['table_c']
        if i > 0 and i % 5 in (1, 2, 3, 4, 0):
            st = ST['table_c']
        tbl_data.append([Paragraph(str(c), ST['table_h'] if i==0 else ST['table_c']) for c in row])

    tbl = Table(tbl_data, colWidths=col_w, repeatRows=1)

    row_bg = []
    for i in range(1, len(data)):
        week = int(data[i][0])
        bg = [WHITE, CREAM, colors.HexColor('#E8F5E9'), CREAM_DARK][week-1]
        row_bg.append(('BACKGROUND', (0,i), (-1,i), bg))

    style = [
        ('BACKGROUND',    (0,0), (-1,0), BROWN_DARK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), FB),
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('TOPPADDING',    (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING',   (0,0), (-1,-1), 4),
        ('RIGHTPADDING',  (0,0), (-1,-1), 4),
        ('GRID',          (0,0), (-1,-1), 0.3, colors.HexColor('#CCCCCC')),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
    ] + row_bg

    tbl.setStyle(TableStyle(style))
    e.append(tbl)
    e.append(sp(6))
    e.append(Paragraph('Цветовое кодирование: Белый — неделя 1 | Кремовый — неделя 2 | Зелёный — неделя 3 | Бежевый — неделя 4', ST['caption']))
    return e

# ─── РАЗДЕЛ 7: БЮДЖЕТ ───────────────────────────────────────────────────────
def section_budget():
    e = []
    e.append(PageBreak())
    e.append(section_header(7, 'Маркетинговый бюджет'))
    e.append(sp(8))

    hdrs = ['Канал / Статья', 'Тип расхода', 'Бюджет / мес', '% от бюджета', 'Ожидаемый результат']
    rows = [
        ['Instagram таргет', 'Реклама', '12 000 ₽', '21.8%', '+500–800 охвата в сутки'],
        ['Яндекс.Директ', 'Реклама', '15 000 ₽', '27.3%', '150–200 кликов / мес'],
        ['Инфлюенсеры (×2)', 'Размещение', '8 000 ₽', '14.5%', '5 000–10 000 охват'],
        ['Флаеры (тираж 2 000)', 'Полиграфия', '4 000 ₽', '7.3%', '80–120 новых гостей'],
        ['SMM (ведение соцсетей)', 'Услуга', '10 000 ₽', '18.2%', '20 постов / мес, Reels'],
        ['Фотосъёмка (2 сессии)', 'Производство', '4 000 ₽', '7.3%', '60+ фото для контента'],
        ['2ГИС Premium', 'Подписка', '2 000 ₽', '3.6%', 'Приоритет в выдаче'],
        ['Резервный фонд', 'Резерв', '0 ₽', '0%', 'Буфер 10% (заложен ниже)'],
        ['ИТОГО', '', '55 000 ₽', '100%', 'Комплексное присутствие'],
    ]

    tbl_data = [[Paragraph(h, ST['table_h']) for h in hdrs]]
    for i, r in enumerate(rows):
        is_total = i == len(rows) - 1
        st = ParagraphStyle('Tot', fontName=FB, fontSize=9, textColor=BROWN_DARK,
                             alignment=TA_LEFT, leading=12) if is_total else ST['table_c']
        stc = ParagraphStyle('TotC', fontName=FB, fontSize=9, textColor=BROWN_DARK,
                              alignment=TA_CENTER, leading=12) if is_total else ST['table_cc']
        tbl_data.append([
            Paragraph(r[0], st),
            Paragraph(r[1], stc),
            Paragraph(r[2], stc),
            Paragraph(r[3], stc),
            Paragraph(r[4], st),
        ])

    tbl = Table(tbl_data, colWidths=[4.5*cm, 2.8*cm, 2.8*cm, 2.5*cm, 4.4*cm], repeatRows=1)
    style = [
        ('BACKGROUND',    (0,0), (-1,0), BROWN_MID),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), FB),
        ('FONTSIZE',      (0,0), (-1,-1), 9),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 5),
        ('RIGHTPADDING',  (0,0), (-1,-1), 5),
        ('GRID',          (0,0), (-1,-1), 0.4, colors.HexColor('#CCCCCC')),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS',(0,1), (-1,-2), [WHITE, CREAM]),
        ('BACKGROUND',    (0,-1), (-1,-1), CREAM_DARK),
        ('LINEABOVE',     (0,-1), (-1,-1), 1.5, BROWN_MID),
    ]
    tbl.setStyle(TableStyle(style))
    e.append(tbl)
    e.append(sp(10))

    e.append(sub_header('Распределение бюджета по категориям'))
    budget_vis = [
        ['Реклама (Директ + Instagram)', '▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  49.1%  — 27 000 ₽'],
        ['Услуги (SMM + съёмка)',        '▓▓▓▓▓▓▓░░░░░░░░░░░░░░  25.5%  — 14 000 ₽'],
        ['Размещение (инфлюенсеры)',     '▓▓▓▓░░░░░░░░░░░░░░░░░  14.5%  —  8 000 ₽'],
        ['Офлайн + сервисы',            '▓▓░░░░░░░░░░░░░░░░░░░  10.9%  —  6 000 ₽'],
    ]
    for row in budget_vis:
        e.append(bullet(f'<b>{row[0]}</b>: {row[1]}'))

    return e

# ─── РАЗДЕЛ 8: KPI ───────────────────────────────────────────────────────────
def section_kpi():
    e = []
    e.append(sp(14))
    e.append(section_header(8, 'KPI и метрики успеха'))
    e.append(sp(8))
    e.append(body(
        'Метрики отслеживаются еженедельно. Ответственный — маркетолог. '
        'Отчёт владельцу — каждую пятницу в формате дашборда Google Sheets.'
    ))
    e.append(sp(8))

    hdrs = ['Метрика', 'Сейчас (старт)', 'Цель: июль', 'Цель: август', 'Цель: сентябрь', 'Инструмент']
    rows = [
        ['Instagram подписчики', '0', '500', '1 200', '2 000', 'Meta Insights'],
        ['Охват Reels (сред.)', '—', '3 000', '6 000', '10 000', 'Meta Insights'],
        ['Клики из Яндекс.Директ', '—', '150', '250', '350', 'Яндекс.Метрика'],
        ['Рейтинг 2ГИС', '4.3★', '4.6★', '4.7★', '4.8★', '2ГИС кабинет'],
        ['Рейтинг Яндекс.Карты', '—', '4.5★', '4.7★', '4.8★', 'Яндекс.Бизнес'],
        ['Число отзывов (всего)', '12', '40', '80', '130', '2ГИС + Яндекс'],
        ['Новые гости с флаеров', '—', '80', '120', '150', 'QR-аналитика'],
        ['CPL (Директ)', '—', '≤ 200 ₽', '≤ 180 ₽', '≤ 150 ₽', 'Яндекс.Метрика'],
        ['ROI маркетинга', '—', '120%', '160%', '200%', 'Таблица учёта'],
        ['Доля повторных визитов', '—', '25%', '35%', '45%', 'Карта лояльности'],
    ]

    tbl_data = [[Paragraph(h, ST['table_h']) for h in hdrs]]
    for r in rows:
        tbl_data.append([
            Paragraph(r[0], ST['table_c']),
            Paragraph(r[1], ST['table_cc']),
            Paragraph(r[2], ST['kpi_good']),
            Paragraph(r[3], ST['kpi_good']),
            Paragraph(r[4], ST['kpi_good']),
            Paragraph(r[5], ST['small']),
        ])

    tbl = Table(tbl_data, colWidths=[4*cm, 2.3*cm, 2.3*cm, 2.3*cm, 2.5*cm, 3.6*cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), BROWN_DARK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), FB),
        ('FONTSIZE',      (0,0), (-1,-1), 8.5),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 4),
        ('RIGHTPADDING',  (0,0), (-1,-1), 4),
        ('GRID',          (0,0), (-1,-1), 0.4, colors.HexColor('#CCCCCC')),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, CREAM]),
    ]))
    e.append(tbl)
    e.append(sp(12))

    e.append(sub_header('Дорожная карта (Roadmap)'))
    roadmap = [
        ['Месяц', 'Фокус', 'Ключевые действия'],
        ['Июль 2026', 'Запуск и фундамент',
         'Настройка всех карточек. Старт Директ. Съёмка. Раздача флаеров. Первые 10 отзывов.'],
        ['Август 2026', 'Рост и вовлечение',
         'Коллаборации с инфлюенсерами. A/B тест Reels. Оптимизация Директ. Акции через 2ГИС.'],
        ['Сентябрь 2026', 'Оптимизация и удержание',
         'Программа лояльности. Перераспределение бюджета по ROI. Осенний сезон: тёплые напитки.'],
    ]
    rm_data = [[Paragraph(c, ST['table_h'] if i==0 else ST['table_c']) for c in r]
               for i, r in enumerate(roadmap)]
    e.append(styled_table(rm_data, [3*cm, 4*cm, 10*cm]))

    e.append(sp(14))
    e.append(hr())
    e.append(sp(6))
    e.append(Paragraph(
        'Документ подготовлен: Рустам, фриланс-маркетолог • trangvi801@gmail.com • 13.06.2026 • ДЕМО',
        ST['small']
    ))
    return e

# ─── СБОРКА ──────────────────────────────────────────────────────────────────
def build():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm,  bottomMargin=2.5*cm,
        title='Маркетинговый план — Кофе Хаус',
        author='Рустам',
        subject='Демо-маркетинговый план для портфолио',
    )

    story = []
    story += cover_page()
    story += section_summary()
    story += section_market()
    story += section_audience()
    story += section_competitors()
    story += section_channels()
    story += section_content()
    story += section_budget()
    story += section_kpi()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f'PDF saved: {OUTPUT}')

if __name__ == '__main__':
    build()
