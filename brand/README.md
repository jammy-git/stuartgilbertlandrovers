# Stuart Gilbert Landrovers — logo files

Vector artwork for the wordmark used in the site header. The letters are
**converted to outlines**, so nothing here depends on the Bebas Neue font being
installed — send any of these to a printer, signwriter or third party and it
will render identically.

## Which file to send

| Use | File |
|---|---|
| Printers, signwriters, embroidery, vinyl, anything scaled | `sgl-logo-colour.svg` |
| Printers who ask for PDF | `sgl-logo-colour.pdf` |
| Dark backgrounds (green panels, photos) | `sgl-logo-reversed.svg` |
| One-colour print, stamps, faxes, engraving | `sgl-logo-black.svg` |
| One-colour on a dark background | `sgl-logo-white.svg` |
| Email signature, web, social | `png/sgl-logo-colour-600.png` |
| Letterheads, invoices, documents | `png/sgl-logo-colour-1200.png` |
| Large print, banners, roll-ups | `png/sgl-logo-colour-2400.png` or the SVG |

All PNGs have a transparent background. SVG and PDF are resolution-independent —
they stay sharp at any size, so prefer them whenever the recipient accepts them.

## Colours

| Role | Hex | Notes |
|---|---|---|
| "STUART GILBERT" | `#1b2a22` | near-black green (Ink) |
| Rule | `#b8903b` | gold (Accent) |
| "LANDROVERS" | `#1f3822` | Coniston Green (Brand) |
| Reversed text | `#fbf8f1` | cream (Paper) |

## Proportions and clear space

Artwork is 153.51 × 51.525 units, a **2.979 : 1** ratio. Always scale
proportionally. Keep clear space around the logo of at least the cap height of
"LANDROVERS" (28.5% of the logo height) on all sides.

Minimum legible width is roughly 120px on screen or 35mm in print. Below that,
use `sgl-logo-black.svg`.

## Regenerating

`tools/make-logo.py` rebuilds every file from `src/fonts/bebas-neue-latin-400.woff2`
and the geometry in `src/_includes/css/site.css`. It needs `fonttools` and `brotli`:

```
python3 -m venv .venv && .venv/bin/pip install fonttools brotli
.venv/bin/python tools/make-logo.py brand
```

Raster and PDF exports are produced from the SVGs with headless Chrome — see the
comments at the foot of that script.

## Not published to the live site

This folder is kept in the repo for reference only. Eleventy's input directory is
`src/` and Cloudflare Pages publishes `_site/`, so nothing in `brand/` is ever
uploaded to stuartgilbertlandrovers.co.uk. If a logo file ever needs to be served
from the site, copy it into `src/images/` — don't move this folder.
