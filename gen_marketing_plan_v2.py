#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.graphics.shapes import (
    Drawing, Rect, Circle, Ellipse, Line, String, Polygon,
    Path, Group, ArcPath
)
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics import renderPDF
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import math, os

# ══════════════════════════════════════════════════════════════════════
# ЦВЕТА
# ══════════════════════════════════════════════════════════════════════
C_DARK    = colors.HexColor('#2C1503')
C_BROWN   = colors.HexColor('#6F3B1A')
C_MID     = colors.HexColor('#A0522D')
C_LIGHT   = colors.HexColor('#C8956C')
C_CREAM   = colors.HexColor('#FDF6EC')
C_CREAM2  = colors.HexColor('#F0E0C8')
C_WHITE   = colors.white
C_GRAY    = colors.HexColor('#444444')
C_LGRAY   = colors.HexColor('#CCCCCC')
C_GREEN   = colors.HexColor('#2E7D32')
C_LGREEN  = colors.HexColor('#E8F5E9')
C_BLUE    = colors.HexColor('#1565C0')
C_LBLUE   = colors.HexColor('#E3F2FD')
C_ORANGE  = colors.HexColor('#E65100')
C_LORANGE = colors.HexColor('#FFF3E0')
C_PURPLE  = colors.HexColor('#6A1B9A')
C_LPURPLE = colors.HexColor('#F3E5F5')
C_TEAL    = colors.HexColor('#00695C')
C_LTEAL   = colors.HexColor('#E0F2F1')
C_RED     = colors.HexColor('#C62828')

OUTPUT = r'C:\Users\User10\jarvis-bot\marketing-plan-demo-v2.pdf'

# ══════════════════════════════════════════════════════════════════════
# ШРИФТЫ
# ══════════════════════════════════════════════════════════════════════
def register_fonts():
    dirs = [r'C:\Windows\Fonts', r'C:\Users\User10\AppData\Local\Microsoft\Windows\Fonts']
    cands = {
        'R': ['DejaVuSans.ttf','arial.ttf','calibri.ttf'],
        'B': ['DejaVuSans-Bold.ttf','arialbd.ttf','calibrib.ttf'],
        'I': ['DejaVuSans-Oblique.ttf','ariali.ttf','calibrii.ttf'],
    }
    found = {}
    for k, names in cands.items():
        for d in dirs:
            for n in names:
                p = os.path.join(d, n)
                if os.path.exists(p):
                    found[k] = p; break
            if k in found: break
    if len(found) < 2:
        return 'Helvetica','Helvetica-Bold','Helvetica-Oblique'
    pdfmetrics.registerFont(TTFont('F',  found['R']))
    pdfmetrics.registerFont(TTFont('FB', found['B']))
    if 'I' in found:
        pdfmetrics.registerFont(TTFont('FI', found['I']))
    return 'F','FB','FI' if 'I' in found else 'F'

F, FB, FI = register_fonts()

# ══════════════════════════════════════════════════════════════════════
# СТИЛИ
# ══════════════════════════════════════════════════════════════════════
def S(name, **kw):
    return ParagraphStyle(name, **kw)

ST = {
    'h1':      S('h1',  fontName=FB, fontSize=28, textColor=C_WHITE, alignment=TA_CENTER, leading=34),
    'h1b':     S('h1b', fontName=FB, fontSize=16, textColor=C_WHITE, alignment=TA_CENTER, leading=22),
    'sec':     S('sec', fontName=FB, fontSize=13, textColor=C_WHITE, leading=18),
    'sub':     S('sub', fontName=FB, fontSize=11, textColor=C_BROWN, leading=16, spaceBefore=10, spaceAfter=3),
    'body':    S('body',fontName=F,  fontSize=10, textColor=C_GRAY,  leading=15, alignment=TA_JUSTIFY, spaceAfter=5),
    'bullet':  S('blt', fontName=F,  fontSize=10, textColor=C_GRAY,  leading=14, leftIndent=14, firstLineIndent=-10, spaceAfter=3),
    'small':   S('sm',  fontName=F,  fontSize=8,  textColor=colors.HexColor('#777777'), leading=11),
    'caption': S('cap', fontName=FB, fontSize=8,  textColor=C_BROWN, alignment=TA_CENTER, spaceAfter=6),
    'th':      S('th',  fontName=FB, fontSize=9,  textColor=C_WHITE, alignment=TA_CENTER, leading=12),
    'tc':      S('tc',  fontName=F,  fontSize=9,  textColor=C_GRAY,  alignment=TA_LEFT,  leading=12),
    'tcc':     S('tcc', fontName=F,  fontSize=9,  textColor=C_GRAY,  alignment=TA_CENTER,leading=12),
    'tcb':     S('tcb', fontName=FB, fontSize=9,  textColor=C_BROWN, alignment=TA_LEFT,  leading=12),
    'kpi_g':   S('kg',  fontName=FB, fontSize=9,  textColor=C_GREEN, alignment=TA_CENTER,leading=12),
    'cov_sub': S('cs',  fontName=F,  fontSize=11, textColor=C_CREAM2,alignment=TA_CENTER,leading=16),
    'persona_name': S('pn', fontName=FB, fontSize=12, textColor=C_WHITE, alignment=TA_CENTER, leading=16),
    'persona_val':  S('pv', fontName=F,  fontSize=9,  textColor=C_GRAY,  alignment=TA_LEFT,  leading=13),
    'persona_key':  S('pk', fontName=FB, fontSize=9,  textColor=C_BROWN, alignment=TA_LEFT,  leading=13),
}

def p(text, style='body'): return Paragraph(text, ST[style])
def sp(h=6): return Spacer(1, h)
def hr(): return HRFlowable(width='100%', thickness=0.5, color=C_LIGHT, spaceAfter=5, spaceBefore=3)

# ══════════════════════════════════════════════════════════════════════
# КАСТОМНЫЕ FLOWABLE — иконки, диаграммы
# ══════════════════════════════════════════════════════════════════════

class CoffeeCupIcon(Flowable):
    """Векторная иконка кофейной чашки"""
    def __init__(self, size=80, color=C_LIGHT):
        Flowable.__init__(self)
        self.size = size
        self.color = color
        self.width = size
        self.height = size

    def draw(self):
        s = self.size
        c = self.canv
        c.saveState()
        # Блюдце
        c.setFillColor(self.color)
        c.setStrokeColor(C_BROWN)
        c.setLineWidth(1.5)
        c.ellipse(s*0.05, s*0.02, s*0.95, s*0.18, fill=1, stroke=1)
        # Чашка тело
        c.setFillColor(self.color)
        pts = [s*0.15, s*0.18, s*0.22, s*0.72, s*0.78, s*0.72, s*0.85, s*0.18]
        c.beginPath()
        c.moveTo(pts[0], pts[1])
        c.lineTo(pts[2], pts[3])
        c.curveTo(s*0.25, s*0.85, s*0.75, s*0.85, pts[4], pts[5])
        c.lineTo(pts[6], pts[7])
        c.closePath()
        c.drawPath(fillColor=self.color, strokeColor=C_BROWN, fill=1, stroke=1)
        # Ручка
        c.setFillColor(C_CREAM)
        c.setStrokeColor(C_BROWN)
        c.setLineWidth(2)
        c.arc(s*0.72, s*0.30, s*0.92, s*0.62, startAng=-90, extent=180, stroke=1)
        # Пар (3 волны)
        c.setStrokeColor(C_LIGHT)
        c.setLineWidth(1.5)
        for i, x in enumerate([s*0.33, s*0.5, s*0.67]):
            y0 = s*0.75
            c.beginPath()
            c.moveTo(x, y0)
            c.curveTo(x - s*0.04, y0 + s*0.07, x + s*0.04, y0 + s*0.12, x, y0 + s*0.19)
            c.stroke()
        c.restoreState()


class GrowthChart(Flowable):
    """График роста числа кофеен + трендовая линия"""
    def __init__(self, w=240, h=120):
        Flowable.__init__(self)
        self.width = w
        self.height = h

    def draw(self):
        c = self.canv
        c.saveState()
        w, h = self.width, self.height
        pad_l, pad_b, pad_r, pad_t = 30, 25, 15, 15

        years  = [2021, 2022, 2023, 2024, 2025, 2026]
        values = [28,   38,   52,   68,   90,   120]
        proj   = [None, None, None, None, 90,   120]

        max_v = 130
        def xt(i): return pad_l + i * (w - pad_l - pad_r) / (len(years)-1)
        def yt(v): return pad_b + (v / max_v) * (h - pad_b - pad_t)

        # Фон
        c.setFillColor(C_CREAM)
        c.rect(0, 0, w, h, fill=1, stroke=0)

        # Сетка
        c.setStrokeColor(C_LGRAY)
        c.setLineWidth(0.4)
        for v in [0, 30, 60, 90, 120]:
            y = yt(v)
            c.line(pad_l, y, w - pad_r, y)
            c.setFont(F, 6.5)
            c.setFillColor(colors.HexColor('#999999'))
            c.drawRightString(pad_l - 3, y - 3, str(v))

        # Заливка под кривой
        pts_fill = [(xt(i), yt(values[i])) for i in range(len(years))]
        c.setFillColor(colors.HexColor('#F0C8A0'))
        c.setFillAlpha(0.4)
        path = c.beginPath()
        path.moveTo(pts_fill[0][0], pad_b)
        for (x, y) in pts_fill:
            path.lineTo(x, y)
        path.lineTo(pts_fill[-1][0], pad_b)
        path.close()
        c.drawPath(path, fill=1, stroke=0)
        c.setFillAlpha(1)

        # Основная линия
        c.setStrokeColor(C_BROWN)
        c.setLineWidth(2)
        path2 = c.beginPath()
        for i, (x, y) in enumerate(pts_fill[:5]):
            if i == 0: path2.moveTo(x, y)
            else: path2.lineTo(x, y)
        c.drawPath(path2, fill=0, stroke=1)

        # Прогноз — пунктир
        c.setStrokeColor(C_LIGHT)
        c.setLineWidth(2)
        c.setDash([4, 3])
        path3 = c.beginPath()
        path3.moveTo(xt(4), yt(90))
        path3.lineTo(xt(5), yt(120))
        c.drawPath(path3, fill=0, stroke=1)
        c.setDash([])

        # Точки
        for i, (x, y) in enumerate(pts_fill):
            c.setFillColor(C_BROWN if i < 5 else C_ORANGE)
            c.setStrokeColor(C_WHITE)
            c.setLineWidth(1)
            c.circle(x, y, 4, fill=1, stroke=1)
            c.setFont(FB, 6.5)
            c.setFillColor(C_DARK)
            c.drawCentredString(x, y + 5, str(values[i]))

        # Подписи X
        c.setFont(F, 7)
        c.setFillColor(C_GRAY)
        for i, yr in enumerate(years):
            c.drawCentredString(xt(i), pad_b - 14, str(yr))

        # Заголовок
        c.setFont(FB, 8)
        c.setFillColor(C_BROWN)
        c.drawString(pad_l, h - 10, 'Рост числа кофеен в Махачкале')
        c.setFont(F, 7)
        c.setFillColor(C_LIGHT)
        c.drawString(pad_l, h - 20, '— прогноз 2026')

        c.restoreState()


class PersonaCard(Flowable):
    """Карточка персоны с иконкой и цветным блоком"""
    def __init__(self, emoji_char, name, age, role, rows, accent, w=170, h=165):
        Flowable.__init__(self)
        self.emoji = emoji_char
        self.name  = name
        self.age   = age
        self.role  = role
        self.rows  = rows   # list of (key, value)
        self.accent = accent
        self.width = w
        self.height = h

    def draw(self):
        c = self.canv
        c.saveState()
        w, h = self.width, self.height
        r = 8

        # Тень
        c.setFillColor(colors.HexColor('#DDDDDD'))
        c.roundRect(3, -3, w, h, r, fill=1, stroke=0)

        # Основная карточка
        c.setFillColor(C_WHITE)
        c.setStrokeColor(self.accent)
        c.setLineWidth(1.5)
        c.roundRect(0, 0, w, h, r, fill=1, stroke=1)

        # Шапка карточки
        c.setFillColor(self.accent)
        c.roundRect(0, h - 48, w, 48, r, fill=1, stroke=0)
        c.rect(0, h - 48, w, 20, fill=1, stroke=0)  # прямые углы снизу шапки

        # Круг аватара
        cx, cy = w / 2, h - 24
        c.setFillColor(C_WHITE)
        c.setStrokeColor(C_WHITE)
        c.setLineWidth(2)
        c.circle(cx, cy, 18, fill=1, stroke=1)

        # Emoji-аватар
        c.setFont(FB, 20)
        c.setFillColor(self.accent)
        c.drawCentredString(cx, cy - 8, self.emoji)

        # Имя + возраст
        c.setFont(FB, 9)
        c.setFillColor(C_WHITE)
        c.drawCentredString(w/2, h - 44, f'{self.name}, {self.age} лет')

        # Роль
        c.setFont(F, 7.5)
        c.setFillColor(colors.HexColor('#EEEEEE'))
        c.drawCentredString(w/2, h - 54, self.role)

        # Строки данных
        y = h - 72
        for key, val in self.rows:
            c.setFont(FB, 7.5)
            c.setFillColor(self.accent)
            c.drawString(8, y, key + ':')
            c.setFont(F, 7.5)
            c.setFillColor(C_GRAY)
            # Перенос длинного текста
            max_w = w - 16
            words = val.split()
            line, lines = '', []
            for word in words:
                test = (line + ' ' + word).strip()
                if c.stringWidth(test, F, 7.5) < max_w - 5:
                    line = test
                else:
                    lines.append(line); line = word
            lines.append(line)
            for li, ln in enumerate(lines):
                c.drawString(8, y - 10 * (li + 1), ln)
            y -= 10 * (len(lines) + 1) + 2

        c.restoreState()


class PieChartFlowable(Flowable):
    """Круговая диаграмма бюджета"""
    def __init__(self, data, labels, colors_list, w=380, h=180):
        Flowable.__init__(self)
        self.data = data
        self.labels = labels
        self.colors_list = colors_list
        self.width = w
        self.height = h

    def draw(self):
        c = self.canv
        c.saveState()
        w, h = self.width, self.height

        # Фон
        c.setFillColor(C_CREAM)
        c.roundRect(0, 0, w, h, 8, fill=1, stroke=0)

        cx, cy, radius = 100, h/2, 72
        total = sum(self.data)
        start = 90.0

        for i, (val, col) in enumerate(zip(self.data, self.colors_list)):
            angle = 360.0 * val / total
            # Сектор
            c.setFillColor(col)
            c.setStrokeColor(C_WHITE)
            c.setLineWidth(1.5)
            c.wedge(cx - radius, cy - radius, cx + radius, cy + radius,
                    start, angle, fill=1, stroke=1)
            # Метка процента внутри
            mid_a = math.radians(start + angle / 2)
            lx = cx + (radius * 0.62) * math.cos(mid_a)
            ly = cy + (radius * 0.62) * math.sin(mid_a)
            pct = val / total * 100
            if pct > 7:
                c.setFont(FB, 7)
                c.setFillColor(C_WHITE)
                c.drawCentredString(lx, ly - 3, f'{pct:.0f}%')
            start += angle

        # Легенда
        lx0, ly0 = cx + radius + 20, h - 20
        for i, (lbl, col, val) in enumerate(zip(self.labels, self.colors_list, self.data)):
            ly = ly0 - i * 22
            c.setFillColor(col)
            c.roundRect(lx0, ly - 1, 10, 10, 2, fill=1, stroke=0)
            c.setFont(FB, 8)
            c.setFillColor(C_DARK)
            c.drawString(lx0 + 14, ly + 1, lbl)
            c.setFont(F, 8)
            c.setFillColor(C_GRAY)
            pct = val / total * 100
            c.drawString(lx0 + 14, ly - 9, f'{val:,} ₽  ({pct:.1f}%)')

        c.restoreState()


class ProgressBar(Flowable):
    """Прогресс-бар для KPI"""
    def __init__(self, label, current, target, unit='', color=C_BROWN, w=470, h=22):
        Flowable.__init__(self)
        self.label   = label
        self.current = current
        self.target  = target
        self.unit    = unit
        self.color   = color
        self.width   = w
        self.height  = h

    def draw(self):
        c = self.canv
        c.saveState()
        w, h = self.width, self.height
        lbl_w = 160
        bar_x = lbl_w + 8
        bar_w = w - lbl_w - 80
        bar_h = 10
        bar_y = (h - bar_h) / 2

        pct = min(self.current / self.target, 1.0) if self.target else 0

        # Метка
        c.setFont(F, 8.5)
        c.setFillColor(C_GRAY)
        c.drawString(0, bar_y + 1, self.label)

        # Дорожка
        c.setFillColor(colors.HexColor('#E0E0E0'))
        c.roundRect(bar_x, bar_y, bar_w, bar_h, bar_h/2, fill=1, stroke=0)

        # Заполнение
        fill_w = max(bar_w * pct, bar_h)
        c.setFillColor(self.color)
        c.roundRect(bar_x, bar_y, fill_w, bar_h, bar_h/2, fill=1, stroke=0)

        # Значения
        c.setFont(FB, 8)
        c.setFillColor(C_DARK)
        cur_str = f'{int(self.current):,}'.replace(',', ' ') if isinstance(self.current, (int, float)) else str(self.current)
        tgt_str = f'{int(self.target):,}'.replace(',', ' ') if isinstance(self.target, (int, float)) else str(self.target)
        c.drawString(bar_x + bar_w + 8, bar_y + 1, f'{cur_str} → {tgt_str} {self.unit}')

        c.restoreState()


class SectionDivider(Flowable):
    """Декоративный разделитель с иконкой"""
    def __init__(self, num, title, icon='', w=470, accent=C_BROWN):
        Flowable.__init__(self)
        self.num    = num
        self.title  = title
        self.icon   = icon
        self.accent = accent
        self.width  = w
        self.height = 36

    def draw(self):
        c = self.canv
        c.saveState()
        w, h = self.width, self.height

        # Основная плашка
        c.setFillColor(C_DARK)
        c.roundRect(0, 0, w, h, 6, fill=1, stroke=0)

        # Цветной левый акцент
        c.setFillColor(self.accent)
        c.roundRect(0, 0, 6, h, 3, fill=1, stroke=0)
        c.rect(3, 0, 3, h, fill=1, stroke=0)

        # Номер в кружке
        c.setFillColor(self.accent)
        c.circle(22, h/2, 11, fill=1, stroke=0)
        c.setFont(FB, 10)
        c.setFillColor(C_WHITE)
        c.drawCentredString(22, h/2 - 4, str(self.num))

        # Заголовок
        c.setFont(FB, 13)
        c.setFillColor(C_WHITE)
        c.drawString(42, h/2 - 5, self.title)

        # Иконка-декор справа
        if self.icon:
            c.setFont(F, 16)
            c.setFillColor(self.accent)
            c.setFillAlpha(0.4)
            c.drawRightString(w - 10, h/2 - 7, self.icon)
            c.setFillAlpha(1)

        c.restoreState()


class ChannelBadge(Flowable):
    """Цветной бейдж канала с иконкой"""
    def __init__(self, icon, name, desc, color, w=220, h=80):
        Flowable.__init__(self)
        self.icon  = icon
        self.name  = name
        self.desc  = desc
        self.color = color
        self.width = w
        self.height = h

    def draw(self):
        c = self.canv
        c.saveState()
        w, h = self.width, self.height

        # Тень
        c.setFillColor(colors.HexColor('#DDDDDD'))
        c.roundRect(3, -3, w, h, 8, fill=1, stroke=0)

        # Карточка
        c.setFillColor(C_WHITE)
        c.setStrokeColor(self.color)
        c.setLineWidth(1.5)
        c.roundRect(0, 0, w, h, 8, fill=1, stroke=1)

        # Верхняя полоска
        c.setFillColor(self.color)
        c.roundRect(0, h-20, w, 20, 8, fill=1, stroke=0)
        c.rect(0, h-28, w, 8, fill=1, stroke=0)

        # Иконка
        c.setFont(F, 18)
        c.setFillColor(C_WHITE)
        c.drawString(8, h - 17, self.icon)

        # Название
        c.setFont(FB, 9)
        c.setFillColor(C_WHITE)
        c.drawString(34, h - 15, self.name)

        # Описание
        words = self.desc.split()
        line, lines = '', []
        for word in words:
            test = (line + ' ' + word).strip()
            if c.stringWidth(test, F, 8) < w - 16:
                line = test
            else:
                lines.append(line); line = word
        lines.append(line)
        c.setFont(F, 8)
        c.setFillColor(C_GRAY)
        for i, ln in enumerate(lines):
            c.drawString(8, h - 38 - i*12, ln)

        c.restoreState()


class StatBox(Flowable):
    """Статистическая плашка для резюме"""
    def __init__(self, value, label, color=C_BROWN, w=88, h=60):
        Flowable.__init__(self)
        self.value = value
        self.label = label
        self.color = color
        self.width = w
        self.height = h

    def draw(self):
        c = self.canv
        c.saveState()
        w, h = self.width, self.height
        c.setFillColor(self.color)
        c.roundRect(0, 0, w, h, 8, fill=1, stroke=0)
        c.setFont(FB, 14)
        c.setFillColor(C_WHITE)
        c.drawCentredString(w/2, h/2 + 2, self.value)
        c.setFont(F, 7)
        c.setFillColor(colors.HexColor('#FFDDBB'))
        c.drawCentredString(w/2, h/2 - 12, self.label)
        c.restoreState()


# ══════════════════════════════════════════════════════════════════════
# FOOTER
# ══════════════════════════════════════════════════════════════════════
def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(C_DARK)
    canvas.rect(0, 0, A4[0], 22, fill=1, stroke=0)
    canvas.setFont(FB, 7.5)
    canvas.setFillColor(C_LIGHT)
    canvas.drawString(1.8*cm, 7, 'КОФЕ ХАУС • Маркетинговый план 2026 • ДЕМО')
    canvas.setFont(F, 7.5)
    canvas.setFillColor(C_WHITE)
    canvas.drawRightString(A4[0] - 1.8*cm, 7, f'Стр. {doc.page}')
    # декор-линия
    canvas.setStrokeColor(C_LIGHT)
    canvas.setLineWidth(0.5)
    canvas.line(1.8*cm, 22, A4[0]-1.8*cm, 22)
    canvas.restoreState()


# ══════════════════════════════════════════════════════════════════════
# ОБЛОЖКА
# ══════════════════════════════════════════════════════════════════════
def cover_page(canvas, doc):
    """Полностраничная обложка, рисуется на canvas напрямую"""
    canvas.saveState()
    W, H = A4

    # Фон — тёмный
    canvas.setFillColor(C_DARK)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)

    # Декор: диагональные полосы
    canvas.setStrokeColor(colors.HexColor('#3B1F0A'))
    canvas.setLineWidth(28)
    for i in range(-3, 8):
        canvas.line(i * 80, 0, i * 80 + H, H)

    # Верхний акцентный блок
    canvas.setFillColor(C_BROWN)
    canvas.rect(0, H - 90, W, 90, fill=1, stroke=0)

    # Нижний акцентный блок
    canvas.setFillColor(C_BROWN)
    canvas.rect(0, 0, W, 70, fill=1, stroke=0)

    # Кофейный узор фоновый (большой круг)
    canvas.setFillColor(colors.HexColor('#4A2810'))
    canvas.circle(W * 0.85, H * 0.55, 160, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor('#3B1F0A'))
    canvas.circle(W * 0.85, H * 0.55, 120, fill=1, stroke=0)

    # Рисуем иконку чашки (крупная) — только поддерживаемые методы canvas
    cx, cy = W * 0.78, H * 0.53
    sz = 110
    # Блюдце
    canvas.setFillColor(C_LIGHT)
    canvas.setStrokeColor(C_CREAM2)
    canvas.setLineWidth(2)
    canvas.ellipse(cx - sz*0.45, cy - sz*0.48, cx + sz*0.45, cy - sz*0.30, fill=1, stroke=1)
    # Чашка: трапеция через beginPath
    canvas.setFillColor(C_LIGHT)
    canvas.setStrokeColor(C_CREAM2)
    canvas.setLineWidth(2)
    cup = canvas.beginPath()
    cup.moveTo(cx - sz*0.38, cy - sz*0.30)
    cup.lineTo(cx - sz*0.25, cy + sz*0.35)
    cup.lineTo(cx + sz*0.25, cy + sz*0.35)
    cup.lineTo(cx + sz*0.38, cy - sz*0.30)
    cup.close()
    canvas.drawPath(cup, fill=1, stroke=1)
    # Верхняя и нижняя кромки (эллипсы)
    canvas.setFillColor(C_LIGHT)
    canvas.setStrokeColor(C_CREAM2)
    canvas.ellipse(cx - sz*0.38, cy - sz*0.36, cx + sz*0.38, cy - sz*0.24, fill=1, stroke=1)
    canvas.ellipse(cx - sz*0.26, cy + sz*0.30, cx + sz*0.26, cy + sz*0.42, fill=1, stroke=1)
    # Ручка
    canvas.setStrokeColor(C_CREAM2)
    canvas.setLineWidth(6)
    canvas.arc(cx + sz*0.28, cy - sz*0.05, cx + sz*0.56, cy + sz*0.28, startAng=-90, extent=180)
    # Пар
    canvas.setStrokeColor(C_CREAM)
    canvas.setLineWidth(2)
    for ox in [-sz*0.12, 0, sz*0.12]:
        y0 = cy + sz*0.44
        pth = canvas.beginPath()
        pth.moveTo(cx + ox, y0)
        pth.curveTo(cx + ox - 8, y0 + 14, cx + ox + 8, y0 + 24, cx + ox, y0 + 36)
        canvas.drawPath(pth, fill=0, stroke=1)

    # Заголовок
    canvas.setFont(FB, 42)
    canvas.setFillColor(C_WHITE)
    canvas.drawCentredString(W * 0.42, H * 0.68, 'КОФЕ ХАУС')

    # Линия-акцент под заголовком
    canvas.setStrokeColor(C_LIGHT)
    canvas.setLineWidth(2)
    canvas.line(W * 0.15, H * 0.65, W * 0.68, H * 0.65)

    # Подзаголовок
    canvas.setFont(F, 16)
    canvas.setFillColor(C_LIGHT)
    canvas.drawCentredString(W * 0.42, H * 0.59, 'МАРКЕТИНГОВЫЙ ПЛАН')

    canvas.setFont(F, 12)
    canvas.setFillColor(C_CREAM2)
    canvas.drawCentredString(W * 0.42, H * 0.545, 'Июль — Сентябрь 2026')

    # Мета-инфо (4 плашки)
    boxes = [
        ('Махачкала', 'Регион'),
        ('3 месяца', 'Горизонт'),
        ('55 000 ₽', 'Бюджет/мес'),
        ('+30%', 'Цель роста'),
    ]
    bw, bh = 90, 52
    total_w = len(boxes) * bw + (len(boxes)-1) * 10
    bx0 = (W - total_w) / 2
    for i, (val, lbl) in enumerate(boxes):
        bx = bx0 + i * (bw + 10)
        by = H * 0.40
        canvas.setFillColor(colors.HexColor('#4A2810'))
        canvas.roundRect(bx, by, bw, bh, 6, fill=1, stroke=0)
        canvas.setStrokeColor(C_LIGHT)
        canvas.setLineWidth(1)
        canvas.roundRect(bx, by, bw, bh, 6, fill=0, stroke=1)
        canvas.setFont(FB, 13)
        canvas.setFillColor(C_WHITE)
        canvas.drawCentredString(bx + bw/2, by + bh/2 + 2, val)
        canvas.setFont(F, 7.5)
        canvas.setFillColor(C_LIGHT)
        canvas.drawCentredString(bx + bw/2, by + bh/2 - 11, lbl)

    # Нижняя плашка
    canvas.setFont(FB, 9)
    canvas.setFillColor(C_WHITE)
    canvas.drawCentredString(W/2, 42, 'Составил: Рустам, фриланс-маркетолог  •  trangvi801@gmail.com  •  13.06.2026')
    canvas.setFont(F, 8)
    canvas.setFillColor(C_LIGHT)
    canvas.drawCentredString(W/2, 26, 'Демонстрационный документ для портфолио')

    # Верхняя плашка — теги
    canvas.setFont(F, 9)
    canvas.setFillColor(C_CREAM)
    canvas.drawCentredString(W/2, H - 55, 'Instagram  •  2ГИС  •  Яндекс.Директ  •  Флаеры  •  Контент  •  KPI')

    canvas.restoreState()


# ══════════════════════════════════════════════════════════════════════
# РАЗДЕЛ 1: РЕЗЮМЕ
# ══════════════════════════════════════════════════════════════════════
def section_summary():
    e = []
    e.append(SectionDivider(1, 'Резюме проекта', '☕', accent=C_MID))
    e.append(sp(10))

    e.append(p(
        'Кофейня <b>«Кофе Хаус»</b> — камерное заведение премиальной повседневной категории '
        'в центральном районе Махачкалы. Концепция: авторский кофе, домашняя выпечка '
        'и уютная атмосфера для встреч и удалённой работы. 40 посадочных мест, 08:00–22:00.'))
    e.append(sp(10))

    # Статбоксы
    boxes = [
        StatBox('450 ₽',  'Средний чек',  C_BROWN),
        StatBox('1.2 млн','Выручка / мес',C_MID),
        StatBox('55 тыс.','Бюджет / мес', C_TEAL),
        StatBox('+30%',   'Цель роста',   C_GREEN),
        StatBox('3 мес',  'Горизонт',     C_PURPLE),
    ]
    box_row = [[b] for b in boxes]
    stat_tbl = Table([[b for b in boxes]], colWidths=[88]*5)
    stat_tbl.setStyle(TableStyle([
        ('ALIGN',  (0,0),(-1,-1),'CENTER'),
        ('VALIGN', (0,0),(-1,-1),'MIDDLE'),
        ('LEFTPADDING',  (0,0),(-1,-1), 4),
        ('RIGHTPADDING', (0,0),(-1,-1), 4),
    ]))
    e.append(stat_tbl)
    e.append(sp(12))

    e.append(p('<b>Ключевые цели на квартал:</b>', 'sub'))
    goals = [
        ('50 000+', 'уникальных пользователей через digital-каналы'),
        ('300+',    'новых гостей через 2GIS и Яндекс.Карты'),
        ('2 000',   'подписчиков в Instagram-аккаунте'),
        ('4.8★',   'средний рейтинг на картографических сервисах'),
        ('180%+',  'ROI маркетинговых вложений'),
    ]
    goal_data = [[
        Paragraph(f'<b>{v}</b>', ParagraphStyle('gv', fontName=FB, fontSize=14,
                  textColor=C_BROWN, alignment=TA_CENTER, leading=18)),
        Paragraph(lbl, ST['tc']),
    ] for v, lbl in goals]
    goal_tbl = Table(goal_data, colWidths=[3*cm, 13.5*cm])
    goal_tbl.setStyle(TableStyle([
        ('VALIGN',        (0,0),(-1,-1),'MIDDLE'),
        ('TOPPADDING',    (0,0),(-1,-1), 5),
        ('BOTTOMPADDING', (0,0),(-1,-1), 5),
        ('LEFTPADDING',   (0,0),(-1,-1), 8),
        ('ROWBACKGROUNDS',(0,0),(-1,-1),[C_WHITE, C_CREAM]),
        ('GRID',          (0,0),(-1,-1), 0.3, C_LGRAY),
        ('LINEBEFORE',    (0,0),(0,-1),  3, C_BROWN),
    ]))
    e.append(goal_tbl)
    return e


# ══════════════════════════════════════════════════════════════════════
# РАЗДЕЛ 2: РЫНОК
# ══════════════════════════════════════════════════════════════════════
def section_market():
    e = []
    e.append(sp(14))
    e.append(SectionDivider(2, 'Анализ рынка и ниши', '📈', accent=C_TEAL))
    e.append(sp(8))
    e.append(p(
        'Рынок общепита Махачкалы растёт: число кофеен за 2021–2025 гг. выросло с 28 до 90+ заведений (+221%). '
        'Сегмент <b>«specialty-кофе + пространство для работы»</b> остаётся недозаполненным.'))
    e.append(sp(8))

    # График + таблица рядом
    chart = GrowthChart(w=240, h=130)
    mkt_data = [
        [Paragraph('Параметр', ST['th']), Paragraph('Значение', ST['th'])],
        [Paragraph('Население', ST['tc']), Paragraph('700 000+', ST['tcc'])],
        [Paragraph('Молодёжь 18–35', ST['tc']), Paragraph('238 000 (34%)', ST['tcc'])],
        [Paragraph('Кофеен в городе', ST['tc']), Paragraph('90+', ST['tcc'])],
        [Paragraph('Средний чек', ST['tc']), Paragraph('350–600 ₽', ST['tcc'])],
        [Paragraph('Рост рынка РФ', ST['tc']), Paragraph('+12% г/г', ST['tcc'])],
        [Paragraph('Доля доставки', ST['tc']), Paragraph('27%', ST['tcc'])],
    ]
    mkt_tbl = Table(mkt_data, colWidths=[4.5*cm, 3.5*cm])
    mkt_tbl.setStyle(TableStyle([
        ('BACKGROUND',   (0,0),(-1,0), C_BROWN),
        ('FONTNAME',     (0,0),(-1,0), FB),
        ('FONTSIZE',     (0,0),(-1,-1), 9),
        ('TOPPADDING',   (0,0),(-1,-1), 5),
        ('BOTTOMPADDING',(0,0),(-1,-1), 5),
        ('LEFTPADDING',  (0,0),(-1,-1), 6),
        ('GRID',         (0,0),(-1,-1), 0.3, C_LGRAY),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[C_WHITE, C_CREAM]),
        ('VALIGN',       (0,0),(-1,-1),'MIDDLE'),
    ]))

    combo = Table([[chart, mkt_tbl]], colWidths=[9*cm, 8*cm])
    combo.setStyle(TableStyle([
        ('VALIGN',       (0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',  (0,0),(-1,-1), 0),
        ('RIGHTPADDING', (0,0),(-1,-1), 8),
    ]))
    e.append(combo)
    e.append(sp(8))

    # Тренды в 2 колонки
    trends = [
        ('Кофейная культура', 'Рост интереса к альтернативным методам заваривания'),
        ('Удалённая работа',  '«Третье место» с Wi-Fi и розетками'),
        ('Instagram-эффект',  'Фотогеничный интерьер = бесплатный UGC'),
        ('Халяль-запрос',     'Заведения без алкоголя с качественными продуктами'),
        ('Доставка',          '+20–30% оборота через Яндекс.Еда / Delivery Club'),
        ('Угроза: конкуренты','Низкий порог входа → рост числа игроков'),
    ]
    t_data = []
    for i in range(0, len(trends), 2):
        row = []
        for j in range(2):
            if i+j < len(trends):
                name, desc = trends[i+j]
                is_threat = 'Угроза' in name
                bg = colors.HexColor('#FFEBEE') if is_threat else C_LTEAL
                txt = Paragraph(f'<b>{name}</b><br/>{desc}',
                    ParagraphStyle('tr', fontName=F, fontSize=8.5, textColor=C_DARK,
                                   leading=13, leftIndent=4))
                row.append(txt)
            else:
                row.append(Paragraph('', ST['tc']))
        t_data.append(row)

    t_tbl = Table(t_data, colWidths=[8.5*cm, 8.5*cm])
    t_tbl.setStyle(TableStyle([
        ('TOPPADDING',   (0,0),(-1,-1), 6),
        ('BOTTOMPADDING',(0,0),(-1,-1), 6),
        ('LEFTPADDING',  (0,0),(-1,-1), 8),
        ('RIGHTPADDING', (0,0),(-1,-1), 8),
        ('GRID',         (0,0),(-1,-1), 0.4, C_LGRAY),
        ('ROWBACKGROUNDS',(0,0),(-1,-1),[C_LTEAL, C_LTEAL]),
        ('BACKGROUND',   (0,2),(-1,2), colors.HexColor('#FFEBEE')),
    ]))
    e.append(t_tbl)
    return e


# ══════════════════════════════════════════════════════════════════════
# РАЗДЕЛ 3: АУДИТОРИЯ
# ══════════════════════════════════════════════════════════════════════
def section_audience():
    e = []
    e.append(PageBreak())
    e.append(SectionDivider(3, 'Целевая аудитория — 3 портрета', '👥', accent=C_PURPLE))
    e.append(sp(12))

    personas = [
        {
            'emoji': 'A', 'name': 'Амир', 'age': 22, 'role': 'Студент / фрилансер',
            'accent': C_BLUE,
            'rows': [
                ('Возраст', '20–26 лет, муж.'),
                ('Доход', '25–50 тыс. ₽'),
                ('Частота', '3–4 раза в неделю'),
                ('Боль', 'Ищет Wi-Fi + тишину'),
                ('Канал', 'Instagram, Telegram'),
                ('Крючок', 'Wi-Fi + розетки + тихая зона'),
            ]
        },
        {
            'emoji': 'P', 'name': 'Патимат', 'age': 31, 'role': 'Мама / part-time',
            'accent': C_PURPLE,
            'rows': [
                ('Возраст', '27–38 лет, жен.'),
                ('Доход', 'Семья 70–100 тыс.'),
                ('Частота', '1–2 раза в неделю'),
                ('Боль', 'Красивое место без суеты'),
                ('Канал', 'Instagram, рекомендации'),
                ('Крючок', 'Детский уголок + фотозона'),
            ]
        },
        {
            'emoji': 'Р', 'name': 'Расул', 'age': 38, 'role': 'Предприниматель',
            'accent': C_TEAL,
            'rows': [
                ('Возраст', '32–45 лет, муж.'),
                ('Доход', '120 000+ ₽'),
                ('Частота', 'Деловые встречи'),
                ('Боль', 'Нет места для переговоров'),
                ('Канал', 'Яндекс.Карты, 2ГИС'),
                ('Крючок', 'VIP-зона + экспресс 5 мин'),
            ]
        },
    ]

    cards = [PersonaCard(
        p['emoji'], p['name'], p['age'], p['role'], p['rows'], p['accent'],
        w=148, h=200
    ) for p in personas]

    card_tbl = Table([cards], colWidths=[155, 155, 155])
    card_tbl.setStyle(TableStyle([
        ('ALIGN',  (0,0),(-1,-1),'CENTER'),
        ('VALIGN', (0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',  (0,0),(-1,-1), 4),
        ('RIGHTPADDING', (0,0),(-1,-1), 4),
    ]))
    e.append(card_tbl)
    e.append(sp(12))

    # Сводная матрица
    e.append(p('<b>Сводная матрица аудитории</b>', 'sub'))
    matrix = [
        [Paragraph(h, ST['th']) for h in ['Параметр', 'Амир', 'Патимат', 'Расул']],
        [Paragraph('Частота визитов', ST['tc']),
         Paragraph('3–4×/нед', ST['tcc']),
         Paragraph('1–2×/нед', ST['tcc']),
         Paragraph('По запросу', ST['tcc'])],
        [Paragraph('Средний чек', ST['tc']),
         Paragraph('300–400 ₽', ST['tcc']),
         Paragraph('500–700 ₽', ST['tcc']),
         Paragraph('600–900 ₽', ST['tcc'])],
        [Paragraph('Приоритет', ST['tc']),
         Paragraph('Wi-Fi / тишина', ST['tcc']),
         Paragraph('Атмосфера / фото', ST['tcc']),
         Paragraph('Скорость / статус', ST['tcc'])],
        [Paragraph('LTV / мес', ST['tc']),
         Paragraph('~4 800 ₽', ST['tcc']),
         Paragraph('~4 200 ₽', ST['tcc']),
         Paragraph('~6 000 ₽', ST['tcc'])],
    ]
    m_tbl = Table(matrix, colWidths=[5*cm, 4*cm, 4*cm, 4*cm])
    m_tbl.setStyle(TableStyle([
        ('BACKGROUND',   (0,0),(-1,0), C_DARK),
        ('BACKGROUND',   (1,0),(1,0), C_BLUE),
        ('BACKGROUND',   (2,0),(2,0), C_PURPLE),
        ('BACKGROUND',   (3,0),(3,0), C_TEAL),
        ('FONTNAME',     (0,0),(-1,0), FB),
        ('FONTSIZE',     (0,0),(-1,-1), 9),
        ('TOPPADDING',   (0,0),(-1,-1), 5),
        ('BOTTOMPADDING',(0,0),(-1,-1), 5),
        ('LEFTPADDING',  (0,0),(-1,-1), 6),
        ('GRID',         (0,0),(-1,-1), 0.4, C_LGRAY),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[C_WHITE, C_CREAM]),
        ('FONTNAME',     (0,1),(0,-1), FB),
        ('BACKGROUND',   (0,1),(0,-1), C_CREAM2),
        ('VALIGN',       (0,0),(-1,-1),'MIDDLE'),
    ]))
    e.append(m_tbl)
    return e


# ══════════════════════════════════════════════════════════════════════
# РАЗДЕЛ 4: КОНКУРЕНТЫ
# ══════════════════════════════════════════════════════════════════════
def section_competitors():
    e = []
    e.append(sp(12))
    e.append(SectionDivider(4, 'Анализ конкурентов', '🏆', accent=C_RED))
    e.append(sp(8))
    e.append(p('Анализ трёх прямых конкурентов в радиусе 1,5 км. Данные: mystery shopping + открытые источники.'))
    e.append(sp(8))

    hdrs = ['Параметр', 'Barista Point', 'Coffee Lab', 'Дагкофе', 'Кофе Хаус (мы)']
    rows_data = [
        ('Позиционирование','Масс-маркет, быстро','Specialty, дорого','Сети, демократично','Specialty + уют + халяль'),
        ('Средний чек',     '250–350 ₽',          '550–750 ₽',        '200–300 ₽',        '<b>400–500 ₽</b>'),
        ('Рейтинг 2ГИС',   '4.5★',               '4.7★',             '4.3★',             '<b>Цель: 4.8★</b>'),
        ('Instagram',       '3 200 подп.',         '8 100 подп.',      '1 800 подп.',      '<b>Цель: 2 000</b>'),
        ('Wi-Fi',           'Нет',                 'Нет',              'Нет',              '<b>Да</b>'),
        ('Детская зона',    'Нет',                 'Нет',              'Нет',              '<b>Да</b>'),
        ('Слабость',        'Нет атмосферы',       'Дорого',           'Слабый контент',   'Новичок на рынке'),
    ]

    # Цвет колонки "мы"
    our_col = colors.HexColor('#FFF8F0')
    tbl_data = [[Paragraph(h, ST['th']) for h in hdrs]]
    for r in rows_data:
        row = [Paragraph(str(c), ST['tc']) for c in r]
        row[-1] = Paragraph(str(r[-1]), ParagraphStyle('our', fontName=FB, fontSize=9,
                            textColor=C_BROWN, alignment=TA_LEFT, leading=12))
        tbl_data.append(row)

    tbl = Table(tbl_data, colWidths=[3.5*cm, 3.3*cm, 3.3*cm, 3.3*cm, 3.6*cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',   (0,0),(-1,0), C_DARK),
        ('BACKGROUND',   (4,0),(4,0), C_BROWN),
        ('FONTNAME',     (0,0),(-1,0), FB),
        ('FONTSIZE',     (0,0),(-1,-1), 8.5),
        ('TOPPADDING',   (0,0),(-1,-1), 5),
        ('BOTTOMPADDING',(0,0),(-1,-1), 5),
        ('LEFTPADDING',  (0,0),(-1,-1), 5),
        ('RIGHTPADDING', (0,0),(-1,-1), 5),
        ('GRID',         (0,0),(-1,-1), 0.3, C_LGRAY),
        ('VALIGN',       (0,0),(-1,-1),'MIDDLE'),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[C_WHITE, C_CREAM]),
        ('BACKGROUND',   (4,1),(4,-1), our_col),
        ('LINEBEFORE',   (4,0),(4,-1), 2, C_BROWN),
        ('FONTNAME',     (0,1),(0,-1), FB),
        ('BACKGROUND',   (0,1),(0,-1), C_CREAM2),
    ]))
    e.append(tbl)
    e.append(sp(8))
    e.append(p('<b>УТП «Кофе Хаус»:</b> specialty-качество по демократичной цене + '
               'Wi-Fi + халяль + детская зона — ни один конкурент не закрывает все четыре запроса одновременно.'))
    return e


# ══════════════════════════════════════════════════════════════════════
# РАЗДЕЛ 5: КАНАЛЫ
# ══════════════════════════════════════════════════════════════════════
def section_channels():
    e = []
    e.append(PageBreak())
    e.append(SectionDivider(5, 'Каналы продвижения', '📣', accent=C_MID))
    e.append(sp(10))

    channels = [
        ('Inst', 'Instagram / Reels', 'Визуальный канал №1. Ставка на Reels + UGC + таргет на Махачкалу 18–40 лет.', C_PURPLE),
        ('2GIS', '2ГИС',             'Главный локальный справочник. Карточка на 100%, QR на столах, акции.', C_BLUE),
        ('Янд.',  'Яндекс.Директ',   'Перехват горячего спроса: «кофейня рядом» по геозапросам, радиус 2 км.', C_RED),
        ('OFF',  'Офлайн / Флаеры',  'Флаеры у ДГТУ, ДГУ, БЦ «Орион». Тираж 2 000 А5. Штендер + лояльность.', C_TEAL),
    ]

    badges = [ChannelBadge(icon, name, desc, color, w=108, h=90)
              for icon, name, desc, color in channels]

    badge_tbl = Table([badges], colWidths=[112]*4)
    badge_tbl.setStyle(TableStyle([
        ('ALIGN',  (0,0),(-1,-1),'CENTER'),
        ('VALIGN', (0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
    ]))
    e.append(badge_tbl)
    e.append(sp(12))

    # Детальные тактики
    tactics = [
        ('Instagram', C_PURPLE, [
            '5 постов/нед: 3 Reels + 2 карусели',
            'Stories ежедневно: опросы, меню дня',
            'Хэштеги: #кофемахачкала #кофехаус',
            'Коллаборации: 2–3 микроинфлюенсера',
            'Таргет: 18–40 лет, Махачкала',
        ]),
        ('2ГИС + Яндекс', C_BLUE, [
            'Заполнить карточку на 100%: 15+ фото',
            'Ответ на отзывы в течение 24 ч',
            'QR-код на столах → отзыв на 2ГИС',
            'Директ: ключи «кофейня Махачкала»',
            'Бюджет Директ: 15 000 ₽/мес',
        ]),
        ('Офлайн', C_TEAL, [
            'Тираж 2 000 флаеров А5 со скидкой 15%',
            'ДГТУ, ДГУ, БЦ «Орион», рынок Анжи',
            'Партнёрство с соседними магазинами',
            'Штендер у входа с актуальным меню',
            'Карта лояльности: 6-я чашка в подарок',
        ]),
    ]

    for name, color, items in tactics:
        tbl_data = [[
            Paragraph(name, ParagraphStyle('tn', fontName=FB, fontSize=10,
                      textColor=C_WHITE, alignment=TA_CENTER, leading=14)),
            *[Paragraph(f'• {it}', ST['tc']) for it in items],
        ]]
        rows = [[
            Paragraph(name, ParagraphStyle('tn2', fontName=FB, fontSize=10,
                      textColor=C_WHITE, alignment=TA_LEFT, leading=14)),
        ]] + [[Paragraph(f'• {it}', ST['tc'])] for it in items]

        hdr = Table([[Paragraph(name, ParagraphStyle('tn3', fontName=FB, fontSize=10,
                     textColor=C_WHITE, alignment=TA_LEFT, leading=14))]],
                    colWidths=[17*cm])
        hdr.setStyle(TableStyle([
            ('BACKGROUND',   (0,0),(-1,-1), color),
            ('TOPPADDING',   (0,0),(-1,-1), 5),
            ('BOTTOMPADDING',(0,0),(-1,-1), 5),
            ('LEFTPADDING',  (0,0),(-1,-1), 12),
        ]))
        e.append(hdr)
        item_data = [[Paragraph(f'• {it}', ST['tc'])] for it in items]
        item_tbl = Table(item_data, colWidths=[17*cm])
        item_tbl.setStyle(TableStyle([
            ('TOPPADDING',   (0,0),(-1,-1), 4),
            ('BOTTOMPADDING',(0,0),(-1,-1), 4),
            ('LEFTPADDING',  (0,0),(-1,-1), 16),
            ('ROWBACKGROUNDS',(0,0),(-1,-1),[C_WHITE, C_CREAM]),
            ('LINEBEFORE',   (0,0),(0,-1), 3, color),
            ('GRID',         (0,0),(-1,-1), 0.3, C_LGRAY),
        ]))
        e.append(item_tbl)
        e.append(sp(6))
    return e


# ══════════════════════════════════════════════════════════════════════
# РАЗДЕЛ 6: КОНТЕНТ-ПЛАН
# ══════════════════════════════════════════════════════════════════════
def section_content():
    e = []
    e.append(SectionDivider(6, 'Контент-план — июль 2026', '📅', accent=C_GREEN))
    e.append(sp(8))

    # Цвета каналов
    CHAN_COLORS = {
        'Instagram': (colors.HexColor('#E91E63'), colors.HexColor('#FCE4EC')),
        '2ГИС':      (C_BLUE,                    C_LBLUE),
        'Яндекс':    (C_RED,                     C_LORANGE),
        'Офлайн':    (C_TEAL,                    C_LTEAL),
        'Все':       (C_BROWN,                   C_CREAM),
    }
    WEEK_COLORS = {
        '1': colors.HexColor('#FFF9C4'),
        '2': colors.HexColor('#F3E5F5'),
        '3': colors.HexColor('#E8F5E9'),
        '4': colors.HexColor('#E3F2FD'),
    }

    posts = [
        ['1','1 июл','Instagram','Reels',   'Открытие сезона: «Летнее меню уже здесь»','Охват'],
        ['1','2 июл','Instagram','Story',   'Опрос: «Какой кофе любите летом?»','Вовлечение'],
        ['1','3 июл','2ГИС',    'Акция',   'Скидка 15% каждый вторник до 12:00','Визиты'],
        ['1','4 июл','Instagram','Карусель','5 причин работать в Кофе Хаус','Подписки'],
        ['1','5 июл','Instagram','Reels',   'Бариста готовит колд-брю — таймлапс','Охват'],
        ['2','8 июл','Instagram','Reels',   'UGC: репост гостя + благодарность','Доверие'],
        ['2','9 июл','Яндекс',  'Директ',  'Запуск кампании «Кофейня рядом»','Трафик'],
        ['2','10 июл','Instagram','Карусель','Гайд: как мы варим эспрессо','Экспертиза'],
        ['2','11 июл','Instagram','Story',  'За кулисами: утро до открытия','Близость'],
        ['2','12 июл','Офлайн', 'Флаеры',  'Раздача у ДГТУ и ДГУ','Новые гости'],
        ['3','15 июл','Instagram','Reels',  'Инфлюенсер Алия: обзор меню','Охват/Доверие'],
        ['3','16 июл','Instagram','Пост',   'История бренда: почему «Кофе Хаус»?','Лояльность'],
        ['3','17 июл','2ГИС',   'Фото',    'Обновить фото летней веранды','Конверсия'],
        ['3','18 июл','Instagram','Reels',  '«День бариста» — мини-интервью','Вовлечение'],
        ['3','19 июл','Instagram','Story',  'Голосование за новый десерт','UGC'],
        ['4','22 июл','Instagram','Карусель','Топ-5 летних напитков: рейтинг гостей','Охват'],
        ['4','23 июл','Instagram','Reels',  'Тайм-лапс: аншлаг в пятницу вечером','Соц. доказательство'],
        ['4','24 июл','Яндекс', 'Аналитика','Ревизия Директ: отключить нерабочие ключи','ROI'],
        ['4','25 июл','Instagram','Story',  'Анонс: каждый 6-й кофе в подарок','Удержание'],
        ['4','26 июл','Все',    'Итоги',   'Итоги месяца: охваты, гости, выручка','Оптимизация'],
    ]

    hdrs = ['Нед.', 'Дата', 'Канал', 'Формат', 'Тема', 'Цель']
    tbl_data = [[Paragraph(h, ST['th']) for h in hdrs]]

    style_cmds = [
        ('BACKGROUND',   (0,0), (-1,0), C_DARK),
        ('FONTNAME',     (0,0), (-1,0), FB),
        ('FONTSIZE',     (0,0), (-1,-1), 8),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('GRID',         (0,0), (-1,-1), 0.3, C_LGRAY),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
    ]

    for i, row in enumerate(posts, 1):
        wk, date, chan, fmt, topic, goal = row
        wk_bg  = WEEK_COLORS.get(wk, C_WHITE)
        ch_fg, ch_bg = CHAN_COLORS.get(chan, (C_GRAY, C_WHITE))

        chan_p = Paragraph(chan, ParagraphStyle('chp', fontName=FB, fontSize=8,
                           textColor=ch_fg, alignment=TA_CENTER, leading=11))
        tbl_data.append([
            Paragraph(f'W{wk}', ParagraphStyle('wk', fontName=FB, fontSize=8,
                      textColor=C_WHITE, alignment=TA_CENTER, leading=11,
                      backColor=WEEK_COLORS[wk])),
            Paragraph(date, ST['tcc']),
            chan_p,
            Paragraph(fmt, ST['tcc']),
            Paragraph(topic, ST['tc']),
            Paragraph(goal, ParagraphStyle('gl', fontName=FB, fontSize=7.5,
                      textColor=C_GREEN, alignment=TA_CENTER, leading=11)),
        ])
        # Фон строки по неделе
        style_cmds.append(('BACKGROUND', (0,i), (-1,i), wk_bg))
        # Цветной фон ячейки канала
        style_cmds.append(('BACKGROUND', (2,i), (2,i), ch_bg))

    tbl = Table(tbl_data, colWidths=[1.3*cm, 1.6*cm, 2.4*cm, 2.1*cm, 6.3*cm, 3.3*cm], repeatRows=1)
    tbl.setStyle(TableStyle(style_cmds))
    e.append(tbl)
    e.append(sp(6))

    # Легенда недель
    legend_cells = []
    legend_labels = [('W1 — Запуск', WEEK_COLORS['1']), ('W2 — Рост', WEEK_COLORS['2']),
                     ('W3 — Инфлюенсеры', WEEK_COLORS['3']), ('W4 — Итоги', WEEK_COLORS['4'])]
    leg_data = [[Paragraph(lbl, ParagraphStyle('leg', fontName=FB, fontSize=8,
                textColor=C_DARK, alignment=TA_CENTER, leading=11,
                backColor=bg)) for lbl, bg in legend_labels]]
    leg_tbl = Table(leg_data, colWidths=[4.25*cm]*4)
    leg_tbl.setStyle(TableStyle([
        ('TOPPADDING',   (0,0),(-1,-1), 5),
        ('BOTTOMPADDING',(0,0),(-1,-1), 5),
        ('GRID',         (0,0),(-1,-1), 0.5, C_WHITE),
        ('BACKGROUND',   (0,0),(0,0), WEEK_COLORS['1']),
        ('BACKGROUND',   (1,0),(1,0), WEEK_COLORS['2']),
        ('BACKGROUND',   (2,0),(2,0), WEEK_COLORS['3']),
        ('BACKGROUND',   (3,0),(3,0), WEEK_COLORS['4']),
    ]))
    e.append(leg_tbl)
    return e


# ══════════════════════════════════════════════════════════════════════
# РАЗДЕЛ 7: БЮДЖЕТ
# ══════════════════════════════════════════════════════════════════════
def section_budget():
    e = []
    e.append(PageBreak())
    e.append(SectionDivider(7, 'Маркетинговый бюджет', '💰', accent=C_ORANGE))
    e.append(sp(10))

    budget_items = [
        ('Instagram таргет',    'Реклама',    12000, C_PURPLE),
        ('Яндекс.Директ',       'Реклама',    15000, C_RED),
        ('Инфлюенсеры (×2)',    'Размещение',  8000, C_MID),
        ('Флаеры (2 000 шт.)',  'Полиграфия',  4000, C_TEAL),
        ('SMM (ведение)',        'Услуга',     10000, C_BLUE),
        ('Фотосъёмка (2 сес.)', 'Произв-во',   4000, C_GREEN),
        ('2ГИС Premium',        'Подписка',    2000, colors.HexColor('#795548')),
    ]
    total = sum(x[2] for x in budget_items)

    # Таблица + диаграмма
    hdrs = ['Статья', 'Тип', 'Сумма', '% бюджета', 'Результат']
    results = [
        '+500–800 охватов/сутки', '150–200 кликов/мес',
        '5 000–10 000 охват',     '80–120 новых гостей',
        '20 постов, Reels',       '60+ фото для контента',
        'Приоритет в выдаче',
    ]
    tbl_data = [[Paragraph(h, ST['th']) for h in hdrs]]
    for i, ((name, typ, amt, col), res) in enumerate(zip(budget_items, results)):
        pct = amt / total * 100
        bar_w = int(pct / 5)
        bar = '█' * bar_w + '░' * (20 - bar_w)
        hex_col = '#%02X%02X%02X' % (int(col.red*255), int(col.green*255), int(col.blue*255))
        pct_p = Paragraph(
            f'<font color="{hex_col}">{bar[:bar_w]}</font>'
            f'<font color="#CCCCCC">{bar[bar_w:]}</font> {pct:.1f}%',
            ParagraphStyle('pct', fontName=F, fontSize=7, leading=10, alignment=TA_LEFT))
        tbl_data.append([
            Paragraph(name, ST['tc']),
            Paragraph(typ, ST['tcc']),
            Paragraph(f'{amt:,} ₽'.replace(',', ' '), ST['tcc']),
            pct_p,
            Paragraph(res, ST['small']),
        ])

    # Итог
    tot_st = ParagraphStyle('tot', fontName=FB, fontSize=10, textColor=C_DARK,
                             alignment=TA_CENTER, leading=14)
    tbl_data.append([
        Paragraph('<b>ИТОГО</b>', ParagraphStyle('ti', fontName=FB, fontSize=10,
                  textColor=C_DARK, alignment=TA_LEFT, leading=14)),
        Paragraph('', ST['tcc']),
        Paragraph(f'<b>{total:,} ₽</b>'.replace(',', ' '), tot_st),
        Paragraph('', ST['tcc']),
        Paragraph('Комплексное присутствие', ST['small']),
    ])

    col_w = [4.2*cm, 2.4*cm, 2.5*cm, 4.5*cm, 3.4*cm]
    tbl = Table(tbl_data, colWidths=col_w, repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0),(-1,0), C_DARK),
        ('FONTNAME',      (0,0),(-1,0), FB),
        ('FONTSIZE',      (0,0),(-1,-1), 8.5),
        ('TOPPADDING',    (0,0),(-1,-1), 5),
        ('BOTTOMPADDING', (0,0),(-1,-1), 5),
        ('LEFTPADDING',   (0,0),(-1,-1), 5),
        ('RIGHTPADDING',  (0,0),(-1,-1), 5),
        ('GRID',          (0,0),(-1,-1), 0.3, C_LGRAY),
        ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS',(0,1),(-1,-2), [C_WHITE, C_CREAM]),
        ('BACKGROUND',    (0,-1),(-1,-1), C_CREAM2),
        ('LINEABOVE',     (0,-1),(-1,-1), 2, C_BROWN),
    ]))
    e.append(tbl)
    e.append(sp(12))

    # Круговая диаграмма
    e.append(p('<b>Распределение бюджета</b>', 'sub'))
    e.append(sp(4))
    pie = PieChartFlowable(
        data   =[x[2] for x in budget_items],
        labels =[x[0] for x in budget_items],
        colors_list=[x[3] for x in budget_items],
        w=470, h=190,
    )
    e.append(pie)
    return e


# ══════════════════════════════════════════════════════════════════════
# РАЗДЕЛ 8: KPI
# ══════════════════════════════════════════════════════════════════════
def section_kpi():
    e = []
    e.append(sp(14))
    e.append(SectionDivider(8, 'KPI и метрики успеха', '🎯', accent=C_GREEN))
    e.append(sp(10))
    e.append(p('Метрики отслеживаются еженедельно. Отчёт владельцу — каждую пятницу (Google Sheets дашборд).'))
    e.append(sp(10))

    # Прогресс-бары — цели на сентябрь
    e.append(p('<b>Прогресс к цели — сентябрь 2026</b>', 'sub'))
    e.append(sp(6))

    kpi_bars = [
        ('Instagram подписчики',   0,    2000, '',      C_PURPLE),
        ('Reels охват (ср./пост)', 0,   10000, '',      colors.HexColor('#E91E63')),
        ('Клики Яндекс.Директ',   0,     350, '/мес',  C_RED),
        ('Рейтинг 2ГИС (×100)',   430,   480, '/ 500', C_BLUE),
        ('Число отзывов',          12,   130, '',      C_TEAL),
        ('Новые гости (флаеры)',    0,   150, '/мес',  C_GREEN),
        ('ROI маркетинга',          0,   200, '%',     C_ORANGE),
        ('Повторные визиты',        0,    45, '%',     C_MID),
    ]
    for label, cur, tgt, unit, color in kpi_bars:
        e.append(ProgressBar(label, cur, tgt, unit=unit, color=color, w=460, h=22))
        e.append(sp(3))

    e.append(sp(12))

    # Таблица KPI по месяцам
    e.append(p('<b>Цели по месяцам</b>', 'sub'))
    e.append(sp(6))

    hdrs = ['Метрика', 'Июль', 'Август', 'Сентябрь', 'Инструмент']
    rows = [
        ['Instagram подписчики', '500',    '1 200',   '2 000',     'Meta Insights'],
        ['Охват Reels',          '3 000',  '6 000',   '10 000',    'Meta Insights'],
        ['Клики Директ',         '150',    '250',     '350',       'Яндекс.Метрика'],
        ['Рейтинг 2ГИС',        '4.6★',  '4.7★',   '4.8★',     '2ГИС кабинет'],
        ['Число отзывов',        '40',     '80',      '130',       '2ГИС + Яндекс'],
        ['CPL (Директ)',         '≤200 ₽', '≤180 ₽', '≤150 ₽',   'Яндекс.Метрика'],
        ['ROI маркетинга',       '120%',   '160%',   '200%',      'Таблица учёта'],
    ]

    green_st = ParagraphStyle('gs', fontName=FB, fontSize=9, textColor=C_GREEN,
                               alignment=TA_CENTER, leading=12)
    tbl_data = [[Paragraph(h, ST['th']) for h in hdrs]]
    for r in rows:
        tbl_data.append([
            Paragraph(r[0], ST['tc']),
            Paragraph(r[1], ST['tcc']),
            Paragraph(r[2], green_st),
            Paragraph(r[3], ParagraphStyle('gb', fontName=FB, fontSize=9,
                      textColor=C_ORANGE, alignment=TA_CENTER, leading=12)),
            Paragraph(r[4], ST['small']),
        ])

    tbl = Table(tbl_data, colWidths=[4.5*cm, 2.5*cm, 2.5*cm, 2.8*cm, 4.7*cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',   (0,0),(-1,0), C_DARK),
        ('BACKGROUND',   (3,0),(3,0), C_ORANGE),
        ('FONTNAME',     (0,0),(-1,0), FB),
        ('FONTSIZE',     (0,0),(-1,-1), 9),
        ('TOPPADDING',   (0,0),(-1,-1), 5),
        ('BOTTOMPADDING',(0,0),(-1,-1), 5),
        ('LEFTPADDING',  (0,0),(-1,-1), 5),
        ('RIGHTPADDING', (0,0),(-1,-1), 5),
        ('GRID',         (0,0),(-1,-1), 0.4, C_LGRAY),
        ('VALIGN',       (0,0),(-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[C_WHITE, C_CREAM]),
        ('FONTNAME',     (0,1),(0,-1), FB),
        ('BACKGROUND',   (0,1),(0,-1), C_CREAM2),
    ]))
    e.append(tbl)
    e.append(sp(12))

    # Roadmap
    e.append(p('<b>Дорожная карта</b>', 'sub'))
    e.append(sp(4))

    rm_items = [
        ('Июль 2026',     C_BROWN,  'Запуск и фундамент',
         'Настройка карточек 2ГИС/Яндекс. Старт Директ. Фотосессия. Флаеры. Первые 10 отзывов. Запуск Instagram.'),
        ('Август 2026',   C_GREEN,  'Рост и вовлечение',
         'Коллаборации с инфлюенсерами. A/B тест Reels. Оптимизация Директ. Акции 2ГИС. Рост подписчиков до 1 200.'),
        ('Сентябрь 2026', C_ORANGE, 'Оптимизация и удержание',
         'Программа лояльности. Перераспределение бюджета по ROI. Осенний сезон: тёплые напитки. Цель ROI 200%.'),
    ]
    rm_data = [[
        Paragraph(month, ParagraphStyle('rmm', fontName=FB, fontSize=10,
                  textColor=C_WHITE, alignment=TA_CENTER, leading=14)),
        Paragraph(focus, ParagraphStyle('rmf', fontName=FB, fontSize=9,
                  textColor=color, alignment=TA_LEFT, leading=13)),
        Paragraph(actions, ST['tc']),
    ] for month, color, focus, actions in rm_items]

    rm_tbl = Table(rm_data, colWidths=[3.2*cm, 4.2*cm, 9.6*cm])
    rm_style = [
        ('FONTSIZE',     (0,0),(-1,-1), 9),
        ('TOPPADDING',   (0,0),(-1,-1), 8),
        ('BOTTOMPADDING',(0,0),(-1,-1), 8),
        ('LEFTPADDING',  (0,0),(-1,-1), 8),
        ('RIGHTPADDING', (0,0),(-1,-1), 8),
        ('GRID',         (0,0),(-1,-1), 0.4, C_LGRAY),
        ('VALIGN',       (0,0),(-1,-1), 'MIDDLE'),
    ]
    for i, (_, color, _, _) in enumerate(rm_items):
        rm_style.append(('BACKGROUND', (0,i),(0,i), color))
    rm_style.append(('ROWBACKGROUNDS', (1,0),(-1,-1), [C_WHITE, C_CREAM, C_LORANGE]))
    rm_tbl.setStyle(TableStyle(rm_style))
    e.append(rm_tbl)

    e.append(sp(16))
    e.append(HRFlowable(width='100%', thickness=0.5, color=C_LIGHT, spaceBefore=4, spaceAfter=6))
    e.append(Paragraph(
        'Документ подготовлен: Рустам, фриланс-маркетолог  •  trangvi801@gmail.com  •  13.06.2026  •  ДЕМО',
        ST['small']))
    return e


# ══════════════════════════════════════════════════════════════════════
# СБОРКА
# ══════════════════════════════════════════════════════════════════════
def build():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=1.8*cm, rightMargin=1.8*cm,
        topMargin=1.8*cm,  bottomMargin=2.0*cm,
        title='Маркетинговый план — Кофе Хаус v2',
        author='Рустам',
        subject='Демо-маркетинговый план для портфолио',
    )

    story = [PageBreak()]   # первая страница — обложка через onFirstPage
    story += section_summary()
    story += section_market()
    story += section_audience()
    story += section_competitors()
    story += section_channels()
    story += section_content()
    story += section_budget()
    story += section_kpi()

    def first_page(canvas, doc):
        cover_page(canvas, doc)

    def later_pages(canvas, doc):
        footer(canvas, doc)

    doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)
    print(f'PDF saved: {OUTPUT}')

if __name__ == '__main__':
    build()
