"""
Build vector logo files for Stuart Gilbert Landrovers.

The site's logo is CSS-composed text (src/_includes/partials/header.njk +
.logo rules in src/_includes/css/site.css). This reproduces that exact
geometry as outlined vector paths so the artwork carries no font dependency.

Geometry is derived from the CSS, not eyeballed:
  .logo   line-height .95
  .row1   font-size 30px, border-bottom 2px accent, padding-bottom 2px
  .gap    width .35em
  .row2   font-size 21px, margin-top 5px, flex justify-content:space-between
"""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

FONT = '/Users/james/Projects/Stuart_Gilbert_Land_Rovers/src/fonts/bebas-neue-latin-400.woff2'
UPM, ASC, DESC, CAP = 1000.0, 900.0, 300.0, 700.0

F1, F2 = 30.0, 21.0        # row font sizes, px
LH = 0.95                  # .logo line-height
GAP_EM = 0.35              # .gap width
PAD_B, RULE, GAP_ROWS = 2.0, 2.0, 5.0
S = 10.0                   # output scale (px -> viewBox units)

ROW1, ROW2 = 'STUART GILBERT', 'LANDROVERS'

font = TTFont(FONT)
cmap = font.getBestCmap()
glyphs = font.getGlyphSet()
hmtx = font['hmtx']


def adv(ch, size):
    return hmtx[cmap[ord(ch)]][0] * size / UPM


def draw(chars, size, xs, baseline):
    """Outline `chars` at x positions `xs`, on `baseline`. Returns SVG path data."""
    pen = SVGPathPen(glyphs, ntos=lambda v: f'{v:.2f}'.rstrip('0').rstrip('.'))
    for ch, x in zip(chars, xs):
        k = size / UPM * S
        glyphs[cmap[ord(ch)]].draw(TransformPen(pen, Transform(k, 0, 0, -k, x * S, baseline * S)))
    return pen.getCommands()


# --- vertical: CSS line-box maths -------------------------------------------
# content area = (asc+desc)/upm * size; half-leading = (line-height - content)/2
def baseline_in_box(size):
    return ASC / UPM * size + (LH * size - (ASC + DESC) / UPM * size) / 2


row1_box = LH * F1                        # 28.5
b1 = baseline_in_box(F1)                  # 23.25
cap_top = b1 - CAP / UPM * F1             # 2.25  -> trimmed to y=0
rule_top = row1_box + PAD_B               # 30.5
row2_top = rule_top + RULE + GAP_ROWS     # 37.5
b2 = row2_top + baseline_in_box(F2)       # 53.775

TRIM = cap_top
B1, RULE_Y, B2 = b1 - TRIM, rule_top - TRIM, b2 - TRIM
H = B2 - TRIM * 0                         # bottom edge = row2 baseline
H = B2

# --- horizontal --------------------------------------------------------------
row1_chars = [c for c in ROW1 if c != ' ']
xs1, x = [], 0.0
for c in ROW1:
    if c == ' ':
        x += GAP_EM * F1
    else:
        xs1.append(x)
        x += adv(c, F1)
W = x                                     # 153.51

glyph_w = sum(adv(c, F2) for c in ROW2)
spacing = (W - glyph_w) / (len(ROW2) - 1)   # flex space-between
xs2, x = [], 0.0
for c in ROW2:
    xs2.append(x)
    x += adv(c, F2) + spacing

d_row1 = draw(row1_chars, F1, xs1, B1)
d_row2 = draw(ROW2, F2, xs2, B2)

VB_W, VB_H = W * S, H * S
print(f'logo box {W:.3f} x {H:.3f} px   ratio {W/H:.4f}')
print(f'row1 baseline {B1:.3f}  rule {RULE_Y:.3f}..{RULE_Y+RULE:.3f}  row2 baseline {B2:.3f}')
print(f'row2 letter spacing {spacing:.4f}px')

TPL = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw:.1f} {vh:.1f}" width="{vw:.1f}" height="{vh:.1f}" role="img" aria-label="Stuart Gilbert Landrovers">
  <title>Stuart Gilbert Landrovers</title>
{bg}  <g id="wordmark">
    <path id="stuart-gilbert" fill="{c1}" d="{d1}"/>
    <rect id="rule" x="0" y="{ry:.1f}" width="{vw:.1f}" height="{rh:.1f}" fill="{c2}"/>
    <path id="landrovers" fill="{c3}" d="{d2}"/>
  </g>
</svg>
'''


def build(path, c1, c2, c3, bg=None):
    bg_el = f'  <rect width="{VB_W:.1f}" height="{VB_H:.1f}" fill="{bg}"/>\n' if bg else ''
    svg = TPL.format(vw=VB_W, vh=VB_H, c1=c1, c2=c2, c3=c3, d1=d_row1, d2=d_row2,
                     ry=RULE_Y * S, rh=RULE * S, bg=bg_el)
    with open(path, 'w') as fh:
        fh.write(svg)
    print(f'  {path}  ({len(svg)/1024:.1f} KB)')


import sys
out = sys.argv[1].rstrip('/')
INK, BRAND, GOLD, CREAM = '#1b2a22', '#1f3822', '#b8903b', '#fbf8f1'
build(f'{out}/sgl-logo-colour.svg', INK, GOLD, BRAND)
build(f'{out}/sgl-logo-reversed.svg', CREAM, GOLD, CREAM)
build(f'{out}/sgl-logo-black.svg', '#000000', '#000000', '#000000')
build(f'{out}/sgl-logo-white.svg', '#ffffff', '#ffffff', '#ffffff')

# --- Raster and PDF exports --------------------------------------------------
# Produced from the SVGs above with headless Chrome (keeps PDFs true vector):
#
#   CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
#   # PNG (transparent), width W, height = round(W / 2.97934):
#   "$CHROME" --headless --disable-gpu --allow-file-access-from-files \
#     --default-background-color=00000000 --hide-scrollbars \
#     --screenshot=out.png --window-size=$W,$H page.html
#   # PDF, @page size 120mm x 40.28mm, margin 0:
#   "$CHROME" --headless --disable-gpu --allow-file-access-from-files \
#     --no-pdf-header-footer --print-to-pdf=out.pdf page.html
