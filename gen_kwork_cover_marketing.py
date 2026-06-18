"""
Kwork cover: МАРКЕТИНГ-ПЛАН  1200×800 px
Design: Digital Depth — dark navy, electric blue glow, BigShoulders title
"""

from PIL import Image, ImageDraw, ImageFont
import math, os

FONTS = r"C:\skills\.claude\skills\canvas-design\canvas-fonts"
OUT   = r"C:\Users\User10\jarvis-bot\kwork-cover-marketing.png"
W, H  = 1200, 800

# ── Colours ──────────────────────────────────────────────────────────────────
BG_TOP    = (6,  12, 32)
BG_BOT    = (10, 20, 52)
BLUE_GLOW = (34, 120, 255)
BLUE_MID  = (60, 145, 255)
BLUE_LT   = (110, 185, 255)
ACCENT    = (0,  170, 255)
WHITE     = (255, 255, 255)
WHITE80   = (255, 255, 255, 204)
WHITE50   = (255, 255, 255, 128)
WHITE20   = (255, 255, 255,  51)
DIVIDER   = (30,  60, 120)
BADGE_BG  = (14,  28, 72)
BADGE_BD  = (50,  95, 200)

# ── Font loader ───────────────────────────────────────────────────────────────
def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

# ── Glow helper ───────────────────────────────────────────────────────────────
def glow_rect(draw, x0, y0, x1, y1, color, layers=10, max_expand=18):
    r, g, b = color
    for i in range(layers, 0, -1):
        alpha = int(30 * (i / layers) ** 1.6)
        expand = int(max_expand * i / layers)
        draw.rounded_rectangle(
            [x0 - expand, y0 - expand, x1 + expand, y1 + expand],
            radius=6 + expand,
            fill=(r, g, b, alpha)
        )

def glow_circle(layer, cx, cy, r, color, layers=12, spread=28):
    rv, gv, bv = color
    draw = ImageDraw.Draw(layer, "RGBA")
    for i in range(layers, 0, -1):
        alpha = int(25 * (i / layers) ** 1.5)
        delta = int(spread * i / layers)
        draw.ellipse([cx - r - delta, cy - r - delta, cx + r + delta, cy + r + delta],
                     fill=(rv, gv, bv, alpha))

def glow_line(layer, x0, y0, x1, y1, color, width=3, spread=8, layers=8):
    r, g, b = color
    draw = ImageDraw.Draw(layer, "RGBA")
    for i in range(layers, 0, -1):
        alpha = int(45 * (i / layers) ** 1.8)
        w = width + int(spread * i / layers)
        draw.line([(x0, y0), (x1, y1)], fill=(r, g, b, alpha), width=w)


# ═════════════════════════════════════════════════════════════════════════════
# CANVAS
# ═════════════════════════════════════════════════════════════════════════════
img  = Image.new("RGBA", (W, H), BG_TOP)
draw = ImageDraw.Draw(img, "RGBA")

# ── Background gradient ───────────────────────────────────────────────────────
for y in range(H):
    t = y / H
    r = int(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t)
    g = int(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t)
    b = int(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# Subtle radial glow from top-right (chart area)
glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
for i in range(20, 0, -1):
    alpha = int(18 * (i / 20) ** 2)
    r = int(380 * i / 20)
    cx, cy = 920, 280
    ImageDraw.Draw(glow_layer).ellipse([cx-r, cy-r, cx+r, cy+r], fill=(20, 80, 200, alpha))
img = Image.alpha_composite(img, glow_layer)
draw = ImageDraw.Draw(img, "RGBA")

# Subtle grid dots
for gx in range(60, W, 60):
    for gy in range(60, 660, 60):
        draw.ellipse([gx-1, gy-1, gx+1, gy+1], fill=(255, 255, 255, 12))

# Thin vertical separator
draw.line([(620, 48), (620, 650)], fill=(*DIVIDER, 160), width=1)

# ── TOP LABEL ROW ─────────────────────────────────────────────────────────────
f_mono_sm = font("GeistMono-Regular.ttf", 16)
tags = ["МАРКЕТИНГОВАЯ СТРАТЕГИЯ", "АНАЛИТИКА", "РОСТ"]
x_tag = 52
for tag in tags:
    tw = draw.textlength(tag, font=f_mono_sm)
    draw.text((x_tag, 36), tag, font=f_mono_sm, fill=(*BLUE_LT, 190))
    x_tag += tw + 34
    if tag != tags[-1]:
        draw.text((x_tag - 20, 36), "·", font=f_mono_sm, fill=(*BLUE_GLOW, 140))

# ── MAIN TITLE ────────────────────────────────────────────────────────────────
f_title1 = font("BigShoulders-Bold.ttf", 118)
f_title2 = font("BigShoulders-Bold.ttf", 118)
f_sub    = font("WorkSans-Regular.ttf", 26)
f_item   = font("InstrumentSans-Regular.ttf", 22)
f_item_b = font("InstrumentSans-Bold.ttf", 22)
f_badge  = font("WorkSans-Bold.ttf", 20)
f_badge2 = font("WorkSans-Regular.ttf", 13)
f_small  = font("GeistMono-Regular.ttf", 13)

# Shadow pass
draw.text((52+2, 88+2), "МАРКЕТИНГ-", font=f_title1, fill=(0, 0, 0, 90))
draw.text((52+2, 198+2), "ПЛАН", font=f_title2, fill=(0, 0, 0, 90))

# Main title
draw.text((52, 88),  "МАРКЕТИНГ-", font=f_title1, fill=WHITE)
draw.text((52, 198), "ПЛАН",        font=f_title2, fill=WHITE)

# Blue accent underline beneath ПЛАН
plan_w = int(draw.textlength("ПЛАН", font=f_title2))
ul_y = 198 + 108
ul_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_rect(ImageDraw.Draw(ul_layer, "RGBA"), 52, ul_y, 52 + plan_w, ul_y + 5, BLUE_GLOW, layers=8, max_expand=10)
ImageDraw.Draw(ul_layer, "RGBA").rectangle([52, ul_y, 52 + plan_w, ul_y + 5], fill=(*BLUE_GLOW, 255))
img = Image.alpha_composite(img, ul_layer)
draw = ImageDraw.Draw(img, "RGBA")

# Subtitle
draw.text((52, 324), "стратегия роста для вашего бизнеса", font=f_sub, fill=(*WHITE, 170))

# ── LEFT LIST WITH BLUE ARROWS ────────────────────────────────────────────────
items = [
    "Анализ рынка и конкурентов",
    "Портреты ЦА",
    "Контент-план",
    "Бюджет и KPI",
    "Roadmap",
]
y_item = 378
for item in items:
    # Glow arrow
    arrow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arrow_layer, "RGBA")
    ax, ay = 52, y_item + 10
    # Arrow body glow
    for gi in range(6, 0, -1):
        alpha_g = int(50 * (gi/6)**2)
        ad.line([(ax, ay), (ax+18, ay)], fill=(*BLUE_GLOW, alpha_g), width=gi*2)
    # Arrow solid
    ad.line([(ax, ay), (ax+18, ay)], fill=(*BLUE_GLOW, 255), width=3)
    # Arrowhead
    ad.polygon([(ax+14, ay-5), (ax+22, ay), (ax+14, ay+5)], fill=(*BLUE_GLOW, 255))
    img = Image.alpha_composite(img, arrow_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    draw.text((84, y_item), item, font=f_item, fill=(*WHITE, 210))
    y_item += 42

# ── BOTTOM DIVIDER ────────────────────────────────────────────────────────────
DIV_Y = 666
div_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
dd = ImageDraw.Draw(div_layer, "RGBA")
for gi in range(5, 0, -1):
    alpha_d = int(30 * (gi/5)**2)
    dd.line([(0, DIV_Y), (W, DIV_Y)], fill=(*BLUE_MID, alpha_d), width=gi*2)
dd.line([(0, DIV_Y), (W, DIV_Y)], fill=(*BLUE_MID, 100), width=1)
img = Image.alpha_composite(img, div_layer)
draw = ImageDraw.Draw(img, "RGBA")

# ── BOTTOM BADGES ─────────────────────────────────────────────────────────────
badges = [
    ("ОТ 3500 ₽", "стоимость"),
    ("ЗА 3 ДНЯ",   "быстро и точно"),
    ("PDF-ОТЧЁТ",  "готовый документ"),
]
bw, bh = 220, 76
total_bw = len(badges) * bw + (len(badges) - 1) * 24
bx_start = (W - total_bw) // 2
by = DIV_Y + 18

for i, (main, sub) in enumerate(badges):
    bx = bx_start + i * (bw + 24)
    # Badge glow bg
    badge_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge_layer, "RGBA")
    glow_rect(bd, bx, by, bx+bw, by+bh, BLUE_GLOW, layers=8, max_expand=12)
    img = Image.alpha_composite(img, badge_layer)
    draw = ImageDraw.Draw(img, "RGBA")
    # Badge background
    draw.rounded_rectangle([bx, by, bx+bw, by+bh], radius=8, fill=(*BADGE_BG, 240))
    draw.rounded_rectangle([bx, by, bx+bw, by+bh], radius=8, outline=(*BADGE_BD, 200), width=1)
    # Main text
    mw = draw.textlength(main, font=f_badge)
    draw.text((bx + (bw - mw)//2, by + 12), main, font=f_badge, fill=WHITE)
    # Sub text
    sw = draw.textlength(sub, font=f_badge2)
    draw.text((bx + (bw - sw)//2, by + 44), sub.upper(), font=f_badge2, fill=(*BLUE_LT, 170))

# ── RIGHT: GROWTH CHART ───────────────────────────────────────────────────────
# Chart area: x 650–1150, y 80–640
cx0, cx1 = 660, 1150
cy0, cy1 = 90, 638
chart_w = cx1 - cx0
chart_h = cy1 - cy0

# Data points (normalised 0..1 from left to right, bottom to top)
pts_norm = [
    (0.00, 0.12),
    (0.15, 0.20),
    (0.28, 0.18),
    (0.40, 0.35),
    (0.52, 0.42),
    (0.63, 0.55),
    (0.74, 0.65),
    (0.84, 0.72),
    (0.92, 0.82),
    (1.00, 0.96),
]

def pt(nx, ny):
    return (int(cx0 + nx * chart_w), int(cy1 - ny * chart_h))

pts = [pt(nx, ny) for nx, ny in pts_norm]

# ── Horizontal grid lines ──────────────────────────────────────────────────────
for gi in range(1, 6):
    gy = cy1 - gi * chart_h // 5
    draw.line([(cx0, gy), (cx1, gy)], fill=(*BLUE_MID, 22), width=1)

# ── Filled area under curve ───────────────────────────────────────────────────
# Build polygon: curve points + bottom-right + bottom-left
poly = pts + [(pts[-1][0], cy1), (pts[0][0], cy1)]
fill_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
fd = ImageDraw.Draw(fill_layer, "RGBA")
# Gradient fill: multiple horizontal slices
for slice_y in range(cy0, cy1):
    t = 1 - (slice_y - cy0) / chart_h
    alpha = int(70 * t ** 1.8)
    fd.line([(cx0, slice_y), (cx1, slice_y)], fill=(*BLUE_GLOW, alpha))

# Mask the fill to be only under the curve
mask = Image.new("L", (W, H), 0)
mask_d = ImageDraw.Draw(mask)
mask_d.polygon(poly, fill=255)
fill_layer.putalpha(Image.composite(fill_layer.split()[3], Image.new("L", (W, H), 0), mask))
img = Image.alpha_composite(img, fill_layer)
draw = ImageDraw.Draw(img, "RGBA")

# ── Glow curve lines (multiple passes) ───────────────────────────────────────
for gpass in range(6, 0, -1):
    curve_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(curve_layer, "RGBA")
    alpha_c = int(35 * (gpass/6)**1.5)
    lw = 2 + gpass * 3
    for i in range(len(pts) - 1):
        cd.line([pts[i], pts[i+1]], fill=(*BLUE_GLOW, alpha_c), width=lw)
    img = Image.alpha_composite(img, curve_layer)

# Core solid line
draw = ImageDraw.Draw(img, "RGBA")
for i in range(len(pts) - 1):
    draw.line([pts[i], pts[i+1]], fill=(*BLUE_LT, 255), width=3)

# ── Data point dots ───────────────────────────────────────────────────────────
for i, (px, py) in enumerate(pts):
    if i == len(pts) - 1:  # last point — big glow
        dot_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        glow_circle(dot_layer, px, py, 10, BLUE_GLOW, layers=14, spread=32)
        ImageDraw.Draw(dot_layer, "RGBA").ellipse([px-10, py-10, px+10, py+10], fill=(*ACCENT, 255))
        ImageDraw.Draw(dot_layer, "RGBA").ellipse([px-5,  py-5,  px+5,  py+5],  fill=WHITE)
        img = Image.alpha_composite(img, dot_layer)
        draw = ImageDraw.Draw(img, "RGBA")
    elif i % 2 == 0:
        dot_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        glow_circle(dot_layer, px, py, 5, BLUE_GLOW, layers=8, spread=14)
        ImageDraw.Draw(dot_layer, "RGBA").ellipse([px-5, py-5, px+5, py+5], fill=(*BLUE_LT, 255))
        img = Image.alpha_composite(img, dot_layer)
        draw = ImageDraw.Draw(img, "RGBA")

# ── Upward arrow at end of curve ──────────────────────────────────────────────
lx, ly = pts[-1]
arrow_tip_x, arrow_tip_y = lx + 38, ly - 60

arrow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ad = ImageDraw.Draw(arrow_layer, "RGBA")
# Glow shaft
for gi in range(8, 0, -1):
    alpha_a = int(40 * (gi/8)**2)
    ad.line([(lx, ly), (arrow_tip_x, arrow_tip_y)], fill=(*ACCENT, alpha_a), width=gi*4)
# Solid shaft
ad.line([(lx, ly), (arrow_tip_x, arrow_tip_y)], fill=(*ACCENT, 255), width=4)
# Arrowhead
dx = arrow_tip_x - lx
dy = arrow_tip_y - ly
length = math.hypot(dx, dy)
ux, uy = dx/length, dy/length
nx, ny = -uy, ux
head_len = 28
head_w   = 14
tip  = (arrow_tip_x, arrow_tip_y)
base = (arrow_tip_x - ux*head_len, arrow_tip_y - uy*head_len)
left_p  = (base[0] + nx*head_w, base[1] + ny*head_w)
right_p = (base[0] - nx*head_w, base[1] - ny*head_w)
# Glow head
for gi in range(8, 0, -1):
    alpha_h = int(45 * (gi/8)**2)
    expand = gi * 3
    ad.polygon([
        (tip[0], tip[1]),
        (left_p[0]  - nx*expand, left_p[1]  - ny*expand),
        (right_p[0] + nx*expand, right_p[1] + ny*expand),
    ], fill=(*ACCENT, alpha_h))
ad.polygon([tip, left_p, right_p], fill=(*ACCENT, 255))
img = Image.alpha_composite(img, arrow_layer)
draw = ImageDraw.Draw(img, "RGBA")

# ── Y-axis labels ─────────────────────────────────────────────────────────────
f_axis = font("GeistMono-Regular.ttf", 15)
y_labels = ["0", "25%", "50%", "75%", "100%"]
for gi, lbl in enumerate(y_labels):
    gy = cy1 - gi * chart_h // 4
    draw.text((cx0 - 54, gy - 8), lbl, font=f_axis, fill=(*BLUE_LT, 110))

# X-axis ticks: month labels
f_axis_x = font("GeistMono-Regular.ttf", 14)
months = ["Q1", "Q2", "Q3", "Q4"]
for qi, q in enumerate(months):
    qx = cx0 + qi * chart_w // 3
    draw.text((qx - 10, cy1 + 8), q, font=f_axis_x, fill=(*BLUE_LT, 90))

# ── Chart title label ─────────────────────────────────────────────────────────
f_ct = font("GeistMono-Regular.ttf", 16)
draw.text((cx0, cy0 - 8), "ДИНАМИКА РОСТА КЛИЕНТОВ  ↑", font=f_ct, fill=(*BLUE_LT, 160))

# ── Annotation bubble at top-right ────────────────────────────────────────────
ann_x, ann_y = lx + 46, arrow_tip_y - 54
ann_w, ann_h = 120, 44
draw.rounded_rectangle([ann_x, ann_y, ann_x+ann_w, ann_y+ann_h],
                        radius=8, fill=(*BLUE_GLOW, 220), outline=(*BLUE_LT, 120), width=1)
f_ann = font("WorkSans-Bold.ttf", 22)
f_ann2 = font("GeistMono-Regular.ttf", 13)
draw.text((ann_x + 14, ann_y + 4),  "+240%", font=f_ann,  fill=WHITE)
draw.text((ann_x + 14, ann_y + 28), "за год",  font=f_ann2, fill=(*WHITE, 170))

# ── Branding mark bottom-right ────────────────────────────────────────────────
f_brand = font("GeistMono-Regular.ttf", 13)
btext = "KWORK.MARKETING"
bw_px = draw.textlength(btext, font=f_brand)
draw.text((W - bw_px - 28, H - 28), btext, font=f_brand, fill=(*BLUE_LT, 90))

# ── Final: flatten and save ───────────────────────────────────────────────────
out = Image.new("RGB", (W, H), (0, 0, 0))
out.paste(img, mask=img.split()[3])
out.save(OUT, "PNG", dpi=(96, 96))
print(f"Saved: {OUT}  ({os.path.getsize(OUT)//1024} KB)")
