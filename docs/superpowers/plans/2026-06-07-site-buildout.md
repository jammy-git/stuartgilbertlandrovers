# Stuart Gilbert Land Rovers Site Build-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full 10-URL site from the approved home page design, migrate hosting to Cloudflare Pages with an in-repo contact-form function, and launch with Lighthouse 100s and SEO/GEO infrastructure in place.

**Architecture:** Eleventy v3 (Nunjucks) generates fully static pages with all CSS inlined per page and self-hosted subset fonts; a Cloudflare Pages Function handles `/api/contact` (Turnstile + Email Routing `send_email`). Content that repeats (NAP, nav, services, reviews, locations, FAQ) lives in `src/_data/` so pages stay thin.

**Tech Stack:** Eleventy 3, Nunjucks, clean-css, html-minifier-terser, fontpie (fallback metrics), sharp (one-off image conversion), Cloudflare Pages + Functions, Turnstile, Email Routing, mimetext, linkinator, html-validate, node:test.

**Spec:** `docs/superpowers/specs/2026-06-07-site-buildout-design.md` — re-read it before starting. The spec's "Client inputs needed" table governs what ships with `confirmed: false` flags.

**Conventions for every task:** work on branch `site-buildout`; commit at the end of every task (smaller commits within tasks where steps say so); never edit `proposal/` (client-facing artifact) or the old root site files until Task 15.

---

### Task 0: Branch + scaffold guardrails

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create branch**

```bash
git checkout -b site-buildout
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
_site/
.wrangler/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore && git commit -m "chore: branch scaffold for site build-out"
```

---

### Task 1: Email delivery spike (spec acceptance gate — do FIRST)

Proves an email can reach a real inbox from Cloudflare before anything is built on top. Outcome is a recorded decision: **(A)** `send_email` binding directly in a Pages Function, **(B)** dedicated Worker with `send_email` called via service binding, or **(C)** Resend (last resort).

**Files:**
- Create: `spike/email/functions/api/spike.js`, `spike/email/index.html` (throwaway, deleted at end of task)

- [ ] **Step 1: Manual dashboard prerequisites (James or agent-with-access)**

In the Cloudflare dashboard for zone `stuartgilbertlandrovers.co.uk`:
1. Email Routing → enable on the zone (adds MX/TXT records; confirm no existing mail service on this domain first — check `dig MX stuartgilbertlandrovers.co.uk +short`; if MX records already exist for real mail, STOP and ask James).
2. Add destination address = James's email (`helloworld@jamesludlow.com`) for the spike; Stuart's address is swapped in at Task 16. James clicks the verification link.

- [ ] **Step 2: Create throwaway Pages project with a send-email function**

`spike/email/index.html`: `<!doctype html><title>spike</title>ok`

`spike/email/functions/api/spike.js`:

```js
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

export async function onRequestGet(context) {
  const msg = createMimeMessage();
  msg.setSender({ name: "SGLR Website", addr: "form@stuartgilbertlandrovers.co.uk" });
  msg.setRecipient(context.env.CONTACT_DEST);
  msg.setSubject("SGLR email spike");
  msg.addMessage({ contentType: "text/plain", data: "If you can read this, send_email works from Pages Functions." });
  const message = new EmailMessage("form@stuartgilbertlandrovers.co.uk", context.env.CONTACT_DEST, msg.asRaw());
  await context.env.CONTACT_EMAIL.send(message);
  return new Response("sent");
}
```

```bash
cd spike/email && npm init -y && npm i mimetext
npx wrangler pages project create sglr-email-spike --production-branch main
npx wrangler pages deploy . --project-name sglr-email-spike
```

- [ ] **Step 3: Configure the binding and test**

Dashboard → Pages project `sglr-email-spike` → Settings → Functions → Email bindings (if the option exists): add binding `CONTACT_EMAIL`, destination `helloworld@jamesludlow.com`. Add plaintext env var `CONTACT_DEST=helloworld@jamesludlow.com`. Redeploy, then:

```bash
curl https://sglr-email-spike.pages.dev/api/spike
```

Expected: `sent`, and the email arrives in James's inbox. **If the Email-binding option does not exist in Pages settings → option A fails; go to Step 4. If it exists and the mail arrives → record decision A, skip to Step 5.**

- [ ] **Step 4 (only if A failed): Worker + service binding fallback**

Create a minimal Worker `sglr-mailer` (same `EmailMessage` code behind a `fetch` handler that accepts `{subject, text}` JSON POST), with `send_email` binding in its `wrangler.toml`:

```toml
name = "sglr-mailer"
main = "src/index.js"
compatibility_date = "2026-06-01"
send_email = [{ name = "CONTACT_EMAIL", destination_address = "helloworld@jamesludlow.com" }]
```

Deploy with `npx wrangler deploy`, then bind it to the Pages project as a service binding `MAILER` and call `context.env.MAILER.fetch(...)` from the spike function. If mail arrives → record decision B. If that also fails → record decision C (Resend) and STOP: surface to James before proceeding (new vendor sign-off).

- [ ] **Step 5: Record decision + clean up**

Append the decision (A/B/C, date, evidence) to the spec's Contact form section. Delete `spike/` and the throwaway Pages project (`npx wrangler pages project delete sglr-email-spike`). Keep the `sglr-mailer` Worker if decision B.

```bash
git add -A && git commit -m "docs: record email spike decision in spec"
```

---

### Task 2: Eleventy scaffold

**Files:**
- Create: `package.json`, `eleventy.config.js`, `src/index.njk` (placeholder), `src/_includes/base.njk` (skeleton)

- [ ] **Step 1: package.json**

```json
{
  "name": "stuartgilbertlandrovers",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "eleventy",
    "serve": "eleventy --serve",
    "test": "node --test functions/lib/",
    "check:links": "linkinator _site --recurse --silent",
    "check:html": "html-validate \"_site/**/*.html\""
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0",
    "clean-css": "^5.3.3",
    "html-minifier-terser": "^7.2.0",
    "html-validate": "^8.24.0",
    "linkinator": "^6.1.2"
  },
  "dependencies": {
    "mimetext": "^3.0.24"
  }
}
```

- [ ] **Step 2: eleventy.config.js**

```js
import CleanCSS from "clean-css";
import { minify } from "html-minifier-terser";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts", "src/images": "images", "src/static": "/" });
  eleventyConfig.addFilter("cssmin", (code) => new CleanCSS({}).minify(code).styles);
  eleventyConfig.addTransform("htmlmin", async function (content) {
    if ((this.page.outputPath || "").endsWith(".html")) {
      return minify(content, { collapseWhitespace: true, removeComments: true, minifyJS: true });
    }
    return content;
  });
  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
```

- [ ] **Step 3: Skeleton layout + placeholder page; build must succeed**

`src/_includes/base.njk`: minimal `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>{{ title }}</title></head><body>{{ content | safe }}</body></html>` (replaced in Task 5).
`src/index.njk`: frontmatter `layout: base.njk`, `title: placeholder`, body `<h1>placeholder</h1>`.

```bash
npm install && npm run build
```

Expected: `_site/index.html` exists containing `placeholder`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: eleventy scaffold builds a placeholder page"
```

---

### Task 3: Design system — CSS, fonts, images

**Files:**
- Create: `src/_includes/css/site.css`, `src/fonts/*.woff2`, `src/images/*` (copied/converted), `src/_includes/css/fonts.css`

- [ ] **Step 1: Extract the stylesheet**

Copy the entire contents of the `<style>` block in `proposal/index.html` (everything between `<style>` and `</style>`; it is already Coniston-only with the switcher rules removed) into `src/_includes/css/site.css`. Then delete the three `@media`-block references to `.switcher` if any remain (grep for `switcher` — expect zero matches).

- [ ] **Step 2: Self-host fonts**

```bash
mkdir -p src/fonts
curl -s -A "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/125 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..600&family=Manrope:wght@400..700&display=swap" -o /tmp/gf.css
```

From `/tmp/gf.css`, take the **latin** subset `url(...woff2)` for each family/style (Bebas Neue regular; Fraunces variable roman + variable italic; Manrope variable). `curl -o src/fonts/<name>.woff2 <url>` each — expected 4 files. Write `src/_includes/css/fonts.css` with matching `@font-face` rules: `font-display: swap`, correct `font-weight` ranges (`400 600` for Fraunces, `400 700` for Manrope), `font-style`, and `src: url('/fonts/<name>.woff2') format('woff2')`.

- [ ] **Step 3: Metric-matched fallbacks**

```bash
npx fontpie src/fonts/bebas-neue-latin-400.woff2 --name "Bebas Neue"
npx fontpie src/fonts/fraunces-latin-var.woff2 --name "Fraunces"
npx fontpie src/fonts/manrope-latin-var.woff2 --name "Manrope"
```

Paste each generated `@font-face { font-family: '<X> Fallback'; src: local(...); ascent-override... }` block into `fonts.css`, and append the fallback names into the font stacks in `site.css` (e.g. `font-family:'Manrope','Manrope Fallback',system-ui,sans-serif`). Remove the Google Fonts `<link>`s from the (upcoming) layout — nothing may reference `fonts.googleapis.com` from here on.

- [ ] **Step 4: Images**

```bash
mkdir -p src/images/logos src/static
cp proposal/logos/*.png src/images/logos/
cp proposal/land_rover_hillside.svg src/images/
npx sharp-cli -i proposal/stuart_david_gilbert.png -o src/images/stuart_david_gilbert.avif --format avif
npx sharp-cli -i proposal/stuart_david_gilbert.png -o src/images/stuart_david_gilbert.webp --format webp
cp proposal/stuart_david_gilbert.png src/images/
cp favicon.ico src/static/
```

In `site.css`, change the `.about .photo` background to `background-image: image-set(url('/images/stuart_david_gilbert.avif') type('image/avif'), url('/images/stuart_david_gilbert.webp') type('image/webp'), url('/images/stuart_david_gilbert.png') type('image/png'));`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: design system - extracted CSS, self-hosted fonts with metric fallbacks, converted images"
```

---

### Task 4: Shared data files

**Files:**
- Create: `src/_data/site.js`, `src/_data/nav.js`, `src/_data/services.js`, `src/_data/reviews.js`, `src/_data/locations.js`

- [ ] **Step 1: `src/_data/site.js`** — single source of truth for NAP/hours/URLs

```js
export default {
  name: "Stuart Gilbert Landrovers",
  url: "https://www.stuartgilbertlandrovers.co.uk",
  phoneDisplay: "01795 843116",
  phoneTel: "+441795843116",
  address: { street: "Orchards", locality: "Sittingbourne", region: "Kent", postcode: "ME9 8JX", country: "GB" },
  geo: { lat: 51.32867424149599, lng: 0.6743717193603516 },
  // PENDING CLIENT: old site said 8:15-17:00; approved new page says 8:30-17:30. Using the approved page until Stuart confirms.
  hours: { days: "Mon to Fri", open: "08:30", close: "17:30", display: "Mon to Fri, 8:30 to 5:30, by appointment only" },
  mapEmbed: "https://www.google.com/maps/embed/v1/place?key=AIzaSyDivMr6nRAcAriE3axubWrGB-Nn1Gcaf_A&q=Stuart+Gilbert+Land+Rovers%2CSittingbourne%2CKent%2CME9+8JX",
  description: "Independent Land Rover, Range Rover, Discovery and Defender specialist in Sittingbourne, Kent."
};
```

- [ ] **Step 2: `src/_data/nav.js`**

```js
export default [
  { label: "Home", url: "/" },
  { label: "About us", url: "/about/" },
  { label: "Services", url: "/services/" },
  { label: "FAQ", url: "/faq/" },
  { label: "Contact", url: "/contact/" }
];
```

- [ ] **Step 3: `src/_data/services.js`** — the six cards from the approved home page, plus the two tuning services and the labour rate carried from the old site behind `confirmed: false` (spec: confirm with Stuart before publishing)

```js
export default {
  labourRate: { text: "Labour is charged at £59 per hour + VAT", confirmed: false },
  items: [
    { num: "No. 01", title: "Servicing", text: "Land Rover servicing. Parts and labour from around £290 + VAT. Stamp in the book.", confirmed: true },
    { num: "No. 02", title: "Maintenance & repairs", text: "General mechanical repairs and ongoing maintenance. Whatever's needed to keep it going.", confirmed: true },
    { num: "No. 03", title: "Brakes, steering & suspension", text: "Brakes, steering and suspension. Standard parts or upgrades, whichever you're after.", confirmed: true },
    { num: "No. 04", title: "Welding", text: "Welding. Chassis, as needed.", confirmed: true },
    { num: "No. 05", title: "Land Rover improvements", text: "Improvements and modifications to most models. Happy to talk it through if you give us a call.", confirmed: true },
    { num: "No. 06", title: "Diesel tuning", text: "Diesel tuning for performance and economy.", confirmed: false },
    { num: "No. 07", title: "Rover V8 tuning", text: "Rover V8 performance tuning.", confirmed: false }
  ]
};
```

Templates render only `confirmed: true` entries (and the home grid keeps its fixed six cards incl. the "Something else?" CTA card). Flipping a flag after Stuart confirms is the entire publish step.

- [ ] **Step 4: `src/_data/reviews.js`** — rating 4.5, the three reviews verbatim from `proposal/index.html` (Andrew Walker, Jamie Powell, Lauren Scoines) plus the Google reviews link.

- [ ] **Step 5: `src/_data/locations.js`** — the four town pages. Each entry: `slug`, `town`, `title`, `metaDescription`, `driveTime`, `route`, `intro` (≥120 words, town-specific), `emphasis` (which services that town's owners typically travel for). Full copy is in **Appendix A** of this plan — paste it verbatim. DRIVE TIMES in Appendix A are estimates; James sanity-checks them at review.

- [ ] **Step 6: Commit**

```bash
git add src/_data && git commit -m "feat: shared site data (NAP, nav, services with confirmation flags, reviews, locations)"
```

---

### Task 5: Real base layout + partials

**Files:**
- Create: `src/_includes/base.njk` (replace skeleton), `src/_includes/partials/header.njk`, `src/_includes/partials/footer.njk`, `src/_includes/partials/map.njk`, `src/_includes/partials/callout.njk`, `src/_includes/partials/schema.njk`, `src/_includes/js/status.js`

- [ ] **Step 1: `base.njk`** — structure (adapt head/header/footer markup from `proposal/index.html`, replacing anchors with page URLs):

```njk
<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ title }}</title>
<meta name="description" content="{{ metaDescription or site.description }}">
<link rel="canonical" href="{{ site.url }}{{ page.url }}">
{% if noindex %}<meta name="robots" content="noindex">{% endif %}
<meta property="og:title" content="{{ title }}">
<meta property="og:description" content="{{ metaDescription or site.description }}">
<meta property="og:url" content="{{ site.url }}{{ page.url }}">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.ico">
{%- for f in preloadFonts %}<link rel="preload" href="{{ f }}" as="font" type="font/woff2" crossorigin>{% endfor %}
{% set css %}{% include "css/fonts.css" %}{% include "css/site.css" %}{% endset %}
<style>{{ css | cssmin | safe }}</style>
{% include "partials/schema.njk" %}
</head>
<body>
{% include "partials/header.njk" %}
{{ content | safe }}
{% include "partials/callout.njk" %}
{% include "partials/footer.njk" %}
<script>{% include "js/status.js" %}</script>
</body>
</html>
```

Per-page frontmatter supplies `title`, `metaDescription`, `preloadFonts` (array of `/fonts/...` paths actually used above that page's fold — home: Bebas + Fraunces roman; others decided per page), optional `noindex`.

- [ ] **Step 2: `partials/header.njk`** — port the proposal header (logo + nav + phone-top with open-status), nav driven by the `nav` data with `aria-current` when `item.url == page.url`. `partials/footer.njk` — port the proposal footer; four columns become: brand blurb, Workshop (address from `site`), Hours (`site.hours.display`), Call us; plus an "Areas we cover" list linking the four location pages (from `locations` data); legal row keeps the credit link. No social icons (spec: skipped). `partials/map.njk` — the Google Maps iframe with `loading="lazy"` + `title`, src from `site.mapEmbed`. `partials/callout.njk` — the phone callout section verbatim.

- [ ] **Step 3: `partials/schema.njk`** — AutoRepair JSON-LD on every page (name, description, telephone, address, geo, `openingHoursSpecification` from `site.hours`, areaServed Sittingbourne/Maidstone/Faversham/Medway/Kent, url). On non-home pages append a `BreadcrumbList` (Home → current page).

- [ ] **Step 4: `js/status.js`** — move the open/closed-status logic + BANK_HOLIDAYS table + seasonal-note logic verbatim from the bottom `<script>` of `proposal/index.html` (drop the logo letter-spans code only if the ported header reproduces spacing in CSS; otherwise keep it). Seasonal-note code must no-op gracefully on pages without `#seasonal-note`.

- [ ] **Step 5: Build; commit**

```bash
npm run build
```

Expected: placeholder index now renders with full chrome (header/nav/footer/callout), inline CSS, schema block present (`grep -c 'AutoRepair' _site/index.html` → 1).

```bash
git add -A && git commit -m "feat: base layout, header/footer/map/callout partials, sitewide schema"
```

---

### Task 6: Port the home page

**Files:**
- Modify: `src/index.njk`

- [ ] **Step 1:** Replace placeholder body with the approved page's sections in order — hero, seasonal aside, about, services grid, marques, recognised, reviews, quote, area — copied from `proposal/index.html` `<body>` (everything between the header and the callout section, which the layout now provides). Services grid renders from `services.items` (`confirmed` only, first five) + the fixed CTA card; reviews section renders from `reviews` data; area section uses `partials/map.njk`. Image srcs change from relative (`land_rover_hillside.svg`) to absolute (`/images/land_rover_hillside.svg`). Frontmatter: title `Independent Land Rover Specialist in Kent | Stuart Gilbert Landrovers`, metaDescription (reuse proposal's meta), `preloadFonts` for Bebas + Fraunces roman.

- [ ] **Step 2: Visual parity check**

```bash
npm run serve
```

Open `http://localhost:8080/` beside `proposal/index.html` in a browser. Expected: visually identical at 1280px and 390px widths (allow font-rendering differences from self-hosting). Nav differences are intentional (page links, not anchors).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: home page ported to eleventy from approved proposal"
```

---

### Task 7: Services page

**Files:**
- Create: `src/services.njk` (permalink `/services/`)

- [ ] **Step 1:** Build the page: section-head ("What we do" / "Everything a Land Rover needs, under one roof."), then one block per `confirmed` service with expanded copy (Appendix B — paste verbatim), labour-rate line rendered only when `services.labourRate.confirmed`, models strip reused from home's marques data, closing phone CTA. Frontmatter title: `Land Rover Servicing & Repairs in Kent | Stuart Gilbert Landrovers`.

- [ ] **Step 2:** Build; check `/services/` renders, no unconfirmed items visible (`grep -ci 'tuning' _site/services/index.html` → 0 until flags flip).

- [ ] **Step 3: Commit** — `git commit -m "feat: services page"`

---

### Task 8: About page

**Files:**
- Create: `src/about.njk` (permalink `/about/`)

- [ ] **Step 1:** Port the home about section as the opening, then the expanded story (Appendix B): the father-and-son history, the 75-years line, how the workshop runs (speak to Stuart or David, same hands every visit), the workshop quote ("green oval… had one in") as the pull-quote. Photo uses the converted image with explicit `width`/`height`.

- [ ] **Step 2:** Build + check; **Step 3: Commit** — `git commit -m "feat: about page"`

---

### Task 9: FAQ page

**Files:**
- Create: `src/_data/faq.js`, `src/faq.njk` (permalink `/faq/`)

- [ ] **Step 1:** `faq.js` — 14 Q&As from Appendix C (verbatim). Three are marked `confirmed: false` (MOT, collection, turnaround) pending Stuart; render only confirmed ones (11 at launch, meeting the spec's 10–15 range).

- [ ] **Step 2:** `faq.njk` — semantic `<details>`-free markup (plain `h2`/`p` per Q&A — AI-quotable, no JS), plus `FAQPage` JSON-LD generated from the same data. Spec note: no rich-result expectation; schema is for machines/GEO.

- [ ] **Step 3:** Build; validate the JSON-LD parses (`node -e "JSON.parse(...)"` on the extracted block or paste into Schema Markup Validator later). **Commit** — `git commit -m "feat: faq page with FAQPage JSON-LD"`

---

### Task 10: Location pages

**Files:**
- Create: `src/locations.njk` (pagination template)

- [ ] **Step 1:** One paginated template generating all four pages from `locations` data:

```njk
---
pagination:
  data: locations
  size: 1
  alias: loc
permalink: "/{{ loc.slug }}/"
layout: base.njk
eleventyComputed:
  title: "{{ loc.title }}"
  metaDescription: "{{ loc.metaDescription }}"
---
```

Body: town-specific hero (h1 = `Land Rover specialist serving {{ loc.town }}`), `loc.intro`, drive-time/route block, `loc.emphasis` services with links to `/services/`, reviews strip, map partial, phone CTA. Cross-link the other three towns at the foot.

- [ ] **Step 2:** Build. Expected: `_site/land-rover-specialist-sittingbourne/index.html` (+ maidstone, faversham, medway). Verify each page's intro text is unique: `for f in _site/land-rover-specialist-*/index.html; do grep -o '<h1>[^<]*' $f; done` shows four different towns.

- [ ] **Step 3: Commit** — `git commit -m "feat: four differentiated local landing pages"`

---

### Task 11: Contact pages (UI only; function is Task 12)

**Files:**
- Create: `src/contact.njk` (permalink `/contact/`), `src/contact-sent.njk` (permalink `/contact/sent/`, frontmatter `noindex: true`), `src/_includes/js/turnstile.js`
- Modify: `src/_includes/base.njk` — add a conditional include after the status script: `{% if turnstile %}<script>{% include "js/turnstile.js" %}</script>{% endif %}`; `contact.njk` sets `turnstile: true` in frontmatter

- [ ] **Step 1: `contact.njk`** — order per spec (map BELOW contact details + form): phone-first block ("a call gets the fastest reply"), hours, form (`method="POST" action="/api/contact"`: `name="name"`, `name="contact"` (single "Phone number or email" field — MUST be named `contact`, Task 12's function reads it), `name="message"`, hidden honeypot input `name="company"` with `autocomplete="off" tabindex="-1"` hidden via CSS class, `<div class="cf-turnstile" data-sitekey="TURNSTILE_SITE_KEY_PLACEHOLDER">`, submit button), then address + directions, then the map partial last.

- [ ] **Step 2: `turnstile.js`** (inlined only on this page via a frontmatter flag the layout checks):

```js
(function () {
  var form = document.querySelector('form[action="/api/contact"]');
  if (!form) return;
  var submit = form.querySelector('button[type="submit"]');
  var loaded = false, queued = false, failed = false;
  function fail() {
    failed = true;
    submit.disabled = false;
    var n = document.getElementById('ts-status');
    n.textContent = "The spam check couldn't load. Please call us on 01795 843116 instead, or try again later.";
  }
  function load() {
    if (loaded) return; loaded = true;
    submit.disabled = true;
    document.getElementById('ts-status').textContent = "Checking you're human…";
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__tsReady';
    s.async = true; s.onerror = fail;
    var t = setTimeout(fail, 8000);
    window.__tsReady = function () {
      clearTimeout(t);
      turnstile.render('.cf-turnstile', {
        sitekey: form.querySelector('.cf-turnstile').dataset.sitekey,
        callback: function () {
          submit.disabled = false;
          document.getElementById('ts-status').textContent = '';
          if (queued) form.submit();
        }
      });
    };
    document.head.appendChild(s);
  }
  form.addEventListener('focusin', load, { once: false });
  form.addEventListener('touchstart', load, { passive: true });
  form.addEventListener('submit', function (e) {
    if (failed) return; // let it POST; server returns the clear-error page
    if (submit.disabled || !form.querySelector('[name="cf-turnstile-response"]')) { e.preventDefault(); queued = true; load(); }
  });
})();
```

Include `<p id="ts-status" role="status"></p>` near the submit button.

- [ ] **Step 3: `contact-sent.njk`** — "Thanks, your message is on its way to the workshop" + phone fallback + link home. Confirm built page contains `noindex` meta.

- [ ] **Step 4: Commit** — `git commit -m "feat: contact page with lazy turnstile and sent page"`

---

### Task 12: Contact form Pages Function (TDD on the pure logic)

**Files:**
- Create: `functions/lib/validate.js`, `functions/lib/validate.test.js`, `functions/api/contact.js`

- [ ] **Step 1: Write failing tests** `functions/lib/validate.test.js` (node:test):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateSubmission } from "./validate.js";

test("rejects missing name", () => {
  assert.equal(validateSubmission({ name: "", contact: "07700 900000", message: "hi" }).ok, false);
});
test("rejects missing contact", () => {
  assert.equal(validateSubmission({ name: "A", contact: "", message: "hi" }).ok, false);
});
test("rejects missing message", () => {
  assert.equal(validateSubmission({ name: "A", contact: "a@b.c", message: "" }).ok, false);
});
test("accepts a valid submission and trims fields", () => {
  const r = validateSubmission({ name: " A ", contact: " a@b.c ", message: " hello " });
  assert.equal(r.ok, true);
  assert.equal(r.data.name, "A");
});
test("flags honeypot", () => {
  const r = validateSubmission({ name: "A", contact: "a@b.c", message: "hi", company: "x" });
  assert.equal(r.spam, true);
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (module not found).

- [ ] **Step 3: Implement `validate.js`** — `validateSubmission({name, contact, message, company})`: trims, requires all three ≤ 2000 chars, `spam: true` when `company` non-empty, returns `{ok, spam, data, errors}`.

- [ ] **Step 4: Run tests** — `npm test` → PASS (5 tests).

- [ ] **Step 5: `functions/api/contact.js`** (decision-A shape; adapt send call per Task 1's recorded decision):

```js
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
import { validateSubmission } from "../lib/validate.js";

const errorPage = (msg) => new Response(
  `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Message not sent</title></head>
   <body style="font-family:system-ui;max-width:38rem;margin:4rem auto;padding:0 1rem">
   <h1>Sorry — that didn't send</h1><p>${msg}</p>
   <p>Please call us on <a href="tel:+441795843116">01795 843116</a> — you'll speak to Stuart or David — or <a href="/contact/">go back and try again</a>.</p>
   </body></html>`,
  { status: 400, headers: { "content-type": "text/html;charset=utf-8" } });

export async function onRequestPost(context) {
  const form = await context.request.formData();
  const fields = Object.fromEntries(["name", "contact", "message", "company"].map(k => [k, form.get(k) || ""]));
  const v = validateSubmission(fields);
  if (v.spam) return Response.redirect(new URL("/contact/sent/", context.request.url), 303); // don't tip off bots
  if (!v.ok) return errorPage("Please fill in your name, a phone number or email, and a short message.");

  const token = form.get("cf-turnstile-response");
  if (!token) return errorPage("The spam check needs JavaScript. If you'd rather not enable it, just give us a ring.");
  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: context.env.TURNSTILE_SECRET, response: token, remoteip: context.request.headers.get("cf-connecting-ip") || "" })
  }).then(r => r.json());
  if (!verify.success) return errorPage("The spam check didn't pass. Sorry about that.");

  const msg = createMimeMessage();
  msg.setSender({ name: "SGLR Website", addr: "form@stuartgilbertlandrovers.co.uk" });
  msg.setRecipient(context.env.CONTACT_DEST);
  msg.setSubject(`Website enquiry from ${v.data.name}`);
  msg.addMessage({ contentType: "text/plain", data: `Name: ${v.data.name}\nContact: ${v.data.contact}\n\n${v.data.message}` });
  await context.env.CONTACT_EMAIL.send(new EmailMessage("form@stuartgilbertlandrovers.co.uk", context.env.CONTACT_DEST, msg.asRaw()));
  return Response.redirect(new URL("/contact/sent/", context.request.url), 303);
}
```

- [ ] **Step 6: Local smoke test** — `npx wrangler pages dev _site` and POST with curl (expect the validation/honeypot/no-token paths to behave; the actual send is proven on the deployed preview in Task 14 — wrangler does not emulate email delivery).

- [ ] **Step 7: Commit** — `git commit -m "feat: contact api function with tested validation, turnstile verify, email send"`

---

### Task 13: SEO infrastructure + 404

**Files:**
- Create: `src/sitemap.njk`, `src/static/robots.txt`, `src/static/llms.txt`, `src/static/_redirects`, `src/static/_headers`, `src/404.njk`

- [ ] **Step 1: `src/sitemap.njk`**

```njk
---
permalink: /sitemap.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- for p in collections.all %}{% if not p.data.noindex and p.url != "/404.html" %}
<url><loc>{{ site.url }}{{ p.url }}</loc></url>
{%- endif %}{% endfor %}
</urlset>
```

- [ ] **Step 2: static files**

`_redirects`:
```
/index.html / 301
/services.html /services/ 301
/contact-us.html /contact/ 301
/links.html / 301
```

`_headers`:
```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/images/*
  Cache-Control: public, max-age=31536000, immutable
```

`robots.txt`: allow all + `Sitemap: https://www.stuartgilbertlandrovers.co.uk/sitemap.xml`. `llms.txt`: one-paragraph factual summary of the business (name, what it does, NAP, phone, hours, URL list).

- [ ] **Step 3: `404.njk`** — frontmatter `permalink: /404.html`, `noindex: true`; short page with nav links + phone.

- [ ] **Step 4: Assertions**

```bash
npm run build
grep -c "contact/sent" _site/sitemap.xml   # expect 0
grep -c "404" _site/sitemap.xml            # expect 0
grep -c "<url>" _site/sitemap.xml          # expect 9 (/, services, about, contact, faq, 4 towns)
```

- [ ] **Step 5: Commit** — `git commit -m "feat: sitemap, robots, llms.txt, redirects, headers, 404"`

---

### Task 14: Pre-launch verification battery + Cloudflare Pages preview

- [ ] **Step 1: Automated checks**

```bash
npm run build && npm test && npm run check:html && npm run check:links
```

Expected: all pass, zero broken links. Fix anything found before proceeding.

- [ ] **Step 2: Create the real Pages project + first preview deploy**

Dashboard (or wrangler): Pages project `stuartgilbertlandrovers`, connect GitHub repo, production branch `master`, build command `npm run build`, output `_site`. Configure: env var `CONTACT_DEST`, secret `TURNSTILE_SECRET`, email binding `CONTACT_EMAIL` (or `MAILER` service binding per Task 1 decision). Create a Turnstile widget for the domain in the dashboard; put the real sitekey into `contact.njk` (replace `TURNSTILE_SITE_KEY_PLACEHOLDER`). Push the branch → preview URL builds.

- [ ] **Step 3: On the preview URL**
  - Lighthouse (DevTools, mobile + desktop) on ALL 11 URLs: `/`, `/services/`, `/about/`, `/contact/`, `/faq/`, all four town pages, `/contact/sent/`, `/404.html`. Gate: 100/100/100/100 (spec says every page — no sampling). Investigate any miss; the spec names the two pre-approved mitigations (map facade, per-page font preloads).
  - Map below-fold check: throttled mobile viewport, Network panel — zero `google.com/maps` requests in the initial trace on `/`, `/contact/`, town pages. Early fetch ⇒ switch to facade per spec.
  - One REAL form submission end-to-end → arrives at `CONTACT_DEST` inbox; verify honeypot path (fill `company` via DevTools) silently "succeeds"; verify no-JS path returns the HTML error page with phone number (disable JS).
  - Schema: Rich Results Test on `/` (AutoRepair, BreadcrumbList on a subpage); Schema Markup Validator on `/faq/`.
  - axe DevTools pass on every template type (home, services, about, contact, faq, town, 404, sent).
  - Redirect spot-check on preview: `curl -sI <preview>/services.html | grep -i location` → `/services/`.

- [ ] **Step 4: Send the preview URL to James (and Stuart)** for sign-off. Record results in the PR/commit message. Commit any fixes.

---

### Task 15: Launch

**Pre-condition:** Task 14 green + James's go.

- [ ] **Step 1: Pre-delete audit** — re-run `npm run check:links` on the final build; confirm nothing in `_site/` references old root assets (`grep -r "templates/yoo_streamline\|widgetkit\|mosaic" _site/` → empty).

- [ ] **Step 2: Delete the old site** in the same branch: root `index.html`, `services.html`, `contact-us.html`, `links.html`, `CNAME`, and dirs `templates/`, `plugins/`, `js/`, `css/`, `inc/`, `media/`, `images/` (after confirming `src/images/` carries everything the new site uses). Add `proposal/` to `.eleventyignore` if not already outside `src/` (it is outside `src/`, so it never enters the build — verify `_site/` contains no `proposal/`).

- [ ] **Step 3: Merge `site-buildout` → `master`, push.** Pages builds production. **Execute Steps 3 and 4 back-to-back:** deleting `CNAME` drops the GitHub Pages custom domain, so the old origin 404s until the DNS flip — keep the window to minutes.

- [ ] **Step 4: DNS cutover** — in Cloudflare DNS, point `www` + apex at the Pages project (CNAME flattening for apex), remove the GitHub Pages records; disable GitHub Pages in repo settings. Verify `curl -sI https://www.stuartgilbertlandrovers.co.uk | head -3` serves the new site.

- [ ] **Step 5: Enable Cloudflare Web Analytics** on the Pages project (auto-injection).

- [ ] **Step 6: Production redirect checks** — all four 301s + trailing-slash spot-checks against the live domain.

---

### Task 16: Post-launch (first week)

- [ ] Swap `CONTACT_DEST` (and the email binding destination) to Stuart's personal address once he's clicked the Email Routing verification link; send one more end-to-end test.
- [ ] Google Search Console: domain property verified via Cloudflare DNS TXT; submit `sitemap.xml`.
- [ ] Bing Webmaster Tools: import from GSC.
- [ ] URL-Inspect the four old URLs → confirm redirects followed.
- [ ] After a few days: indexing sweep (all 9 sitemap URLs discovered/indexable; `/contact/sent/` not indexed).
- [ ] Confirm Google Business Profile website fields point at the new URLs.
- [ ] Chase the outstanding client confirmations (hours, labour rate, tuning, FAQ items) and flip `confirmed` flags as answers arrive.

---

## Appendix A: Location page copy

*(Drive times are estimates for James to sanity-check.)*

**sittingbourne** — slug `land-rover-specialist-sittingbourne`, title `Land Rover Specialist in Sittingbourne | Stuart Gilbert Landrovers`, driveTime "We're right here", route "Orchards, just outside town — ME9 8JX". Intro: "If you run a Land Rover in Sittingbourne, the workshop is on your doorstep. Stuart Gilbert Landrovers is a small, father and son garage at Orchards, a few minutes from the town centre, and we've spent our working lives keeping Land Rovers, Range Rovers, Discoverys and Defenders on the road for owners across Swale. No service managers, no call centres — when you phone the workshop you'll speak to Stuart or David, and the same pair of hands looks after your vehicle every visit. Servicing starts from around £290 + VAT including parts and labour, with a stamp in the book. Please telephone for an appointment first." Emphasis: servicing, maintenance & repairs, welding.

**maidstone** — slug `land-rover-specialist-maidstone`, title `Land Rover Garage near Maidstone | Stuart Gilbert Landrovers`, driveTime "about 25 minutes from Maidstone", route "straight up the A249 from junction 7 of the M20". Intro: "Plenty of our regulars make the trip from Maidstone, and have done for years. From the centre of Maidstone we're about 25 minutes — up the A249 past Detling and off at Bobbing — and owners tell us the drive is worth it for main-dealer-quality Land Rover knowledge at independent-garage rates. As a father and son team with over 75 years between us, we look after everything from Series trucks to the newest Defender, and you'll always deal with Stuart or David directly. Book your Land Rover in for a service on the way to work and collect it on the way home." Emphasis: servicing, brakes/steering/suspension, improvements.

**faversham** — slug `land-rover-specialist-faversham`, title `Land Rover Garage near Faversham | Stuart Gilbert Landrovers`, driveTime "about 15 minutes from Faversham", route "along the A2 through Teynham, or one junction down the M2". Intro: "Faversham owners are some of our nearest neighbours — we're around 15 minutes along the A2 through Teynham, or one junction along the M2 if you'd rather. Stuart Gilbert Landrovers is a small father and son workshop at Orchards, near Sittingbourne, trusted by Land Rover, Range Rover, Discovery and Defender owners across this corner of Kent. Farm trucks, tow vehicles or weekend green-laners — if it's got a green oval on the bonnet, we've probably had one in. Please telephone the workshop for an appointment first." Emphasis: welding, maintenance & repairs, servicing.

**medway** — slug `land-rover-specialist-medway`, title `Land Rover Specialist near Medway | Stuart Gilbert Landrovers`, driveTime "20–25 minutes from the Medway towns", route "A2 or M2 towards Sittingbourne, junction 5". Intro: "From Chatham, Gillingham or Rainham, the workshop is a straightforward 20–25 minute run along the A2 or M2 towards Sittingbourne. Owners from across the Medway towns have used us for years because a proper independent Land Rover specialist is getting hard to find — a father and son team who know these vehicles from the chassis up and charge honest rates. Whether it's a Range Rover that needs a service, a Discovery with suspension trouble or a Defender project, give Stuart or David a ring and we'll talk it through before you set off." Emphasis: servicing, brakes/steering/suspension, welding.

## Appendix B: Services & About expanded copy

**Services page blocks** (one per confirmed service; keep the home-card text as the lead sentence and expand): Servicing — what's included (oil/filters/checks per schedule), from £290 + VAT parts and labour, stamp in the book, all models from Series I to the L663. Maintenance & repairs — diagnostics through to fixes, no upsell, phone first. Brakes, steering & suspension — standard replacements or upgrades, talked through honestly. Welding — chassis work as needed, assessed honestly before any cutting. Land Rover improvements — modifications and improvements to most models, talk it through on the phone. *(Tuning blocks exist in data but stay hidden until `confirmed: true`.)*

**About page** — opening = home about section; then: the garage's history as a father-and-son operation; "more than seventy-five years between us"; how a visit works (phone first, speak to Stuart or David, same hands every visit); the workshop at Orchards; the pull quote "If it's got a green oval on the bonnet, we've probably had one in. — Stuart Gilbert"; closing phone CTA.

## Appendix C: FAQ copy (14 items, 11 confirmed at launch)

1. **How much does a Land Rover service cost?** A service including parts and labour starts from around £290 + VAT, and you get a stamp in the book. (confirmed)
2. **Do I need to book?** Yes — the workshop runs by appointment only. Please telephone 01795 843116 first; you'll speak to Stuart or David. (confirmed)
3. **What are your opening hours?** Mon to Fri, 8:30 to 5:30, by appointment only. (confirmed — pending the hours discrepancy resolution; update if Stuart corrects)
4. **Where are you based?** Orchards, Sittingbourne, Kent ME9 8JX — a short drive from most of mid Kent. (confirmed)
5. **Which Land Rover models do you work on?** All of them: Defender 90/110/130 and the new L663, Range Rover Classic through L460, Discovery 1–5 and Sport, Velar, Evoque, Series I–III, Freelander 1 and 2. (confirmed)
6. **Are you a main dealer?** No — we're an independent specialist. Father and son, over 75 years of Land Rover experience between us, at independent-garage rates. (confirmed)
7. **Do you do modifications and improvements?** Yes, improvements and modifications to most models. Give us a ring and we'll talk it through. (confirmed)
8. **Do you do chassis welding?** Yes — welding, chassis, as needed, assessed honestly first. (confirmed)
9. **Do you work on new Land Rovers as well as classics?** Yes — from Series I right through to the current L663 Defender. (confirmed)
9a. **Do you work on Range Rovers and Discoverys, or just Defenders?** All of them — Range Rover Classic through to the L460, every Discovery including the Sport, Velar, Evoque and Freelander too. (confirmed)
9b. **Why choose an independent specialist over a main dealer?** You deal with the people doing the work — Stuart or David, every time — at independent-garage rates, with over 75 years of Land Rover experience between them. (confirmed)
10. **Do you do MOTs?** *(confirmed: false — ask Stuart)*
11. **Can you collect my vehicle?** *(confirmed: false — ask Stuart)*
12. **How long does a service take?** *(confirmed: false — ask Stuart)*
