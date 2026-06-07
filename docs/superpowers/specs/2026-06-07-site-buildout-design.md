# Stuart Gilbert Land Rovers — Site Build-Out Design

**Date:** 2026-06-07
**Status:** Approved by James
**Context:** Client (Stuart Gilbert) approved the home page design (`proposal/index.html`, Coniston Green scheme) and purchased the **Professional package (£875)** from the proposal PDF. This spec covers building the rest of the site, the hosting move, and launch.

## Goals

1. Deliver the Professional package promises: up to 6 pages (we exceed deliberately), contact form with email alerts, click-to-call on every page, Google Maps, basic SEO/schema, SSL, mobile-responsive.
2. **Primary success criterion (James, 2026-06-07): the end result must be highly optimised — Lighthouse/Core Web Vitals scores and SEO/GEO performance outrank all effort/maintenance considerations.**
3. Targets: Lighthouse 100/100/100/100 on every page; LCP < 1.5s on throttled mobile.

## Explicitly out of scope

- Photo gallery (package item dropped — client cannot supply content)
- Social media links (Stuart has no profiles)
- Google Analytics (replaced by Cloudflare Web Analytics — cookieless, no consent banner)
- Blog, online booking (excluded from Professional package)
- Content Expansion Package items beyond what this spec lists (not purchased; the local pages below are a deliberate over-delivery, approved by James)

## Site map & URLs

| URL | Page | Primary search target |
|---|---|---|
| `/` | Home (port of approved `proposal/index.html`) | independent land rover specialist kent |
| `/services/` | Full services + pricing | land rover servicing/repairs kent |
| `/about/` | Expanded father & son story | brand/trust |
| `/contact/` | Form, phone, map, hours, directions | navigational |
| `/land-rover-specialist-sittingbourne/` | Local page | land rover specialist sittingbourne |
| `/land-rover-specialist-maidstone/` | Local page | land rover garage maidstone |
| `/land-rover-specialist-faversham/` | Local page | land rover garage faversham |
| `/land-rover-specialist-medway/` | Local page | land rover specialist medway |
| `/faq/` | 10–15 real Q&As | long-tail question queries + AI/GEO answers |
| `/contact/sent/` | Form thank-you page (`noindex`, excluded from sitemap) | — |
| `/404.html` | Not-found page | — |

Decisions baked into this map:

- **No standalone Kent page** — the home page owns the "Kent" head term; a separate page would cannibalise it.
- **Town pages must be genuinely differentiated** (drive time and route from that town, town-specific copy, which services people travel for). Thin near-duplicates read as doorway pages and hurt rankings.
- **Keyword-rich root slugs** (`/land-rover-specialist-maidstone/`) over `/areas/maidstone/`.
- **FAQ page is a GEO/user lever, not a Google rich-result lever.** Google restricts FAQ rich results to well-known government/health sites (per its FAQPage docs), so expect no SERP rich-result treatment. The page earns its place by answering long-tail question queries and being quotable by AI search engines. `FAQPage` JSON-LD stays (harmless, machine-readable for AI), but no launch gate depends on FAQ rich-result eligibility.

**301 redirects** via Cloudflare Pages `_redirects`: `/index.html → /`, `/services.html → /services/`, `/contact-us.html → /contact/`, `/links.html → /`. (Cloudflare Pages normalises trailing-slash variants itself; verify during launch checks.)

## Architecture

- **Eleventy v3 + Nunjucks.** One base layout (header/nav/footer); a shared `location` template for the four town pages; content as data where it repeats (nav, services list, NAP, reviews).
- **CSS fully inlined per page at build.** Single source stylesheet (~15KB) derived from the approved proposal page (Coniston Green variables only). No external stylesheet request → zero render-blocking CSS.
- **Fonts self-hosted**: Bebas Neue, Fraunces, Manrope — latin subset, WOFF2 only, preloaded, `font-display: swap` with metric-matched fallbacks (CLS ≈ 0). Removes the two Google Fonts origins from the critical path.
- **JS**: only the existing open/closed-status and seasonal-note logic, inlined; Turnstile script on `/contact/` only. No frameworks, no bundler.
- **Map**: keep the embedded Google Maps iframe (James's decision, 2026-06-07 — also satisfies the package's "Google Maps" promise literally). It sits below the fold with `loading="lazy"`, which keeps it out of the initial trace. If it nonetheless costs the Lighthouse 100 gate on any page, escalate to a click-to-load facade around the same iframe — the gate wins over the always-live embed.
- **Images**: AVIF/WebP with explicit width/height; workshop photo responsively sized.

## SEO/GEO infrastructure

- Unique `<title>` + meta description per page; canonical URLs; Open Graph tags.
- JSON-LD: `AutoRepair` sitewide (geo coordinates, `openingHoursSpecification`, `areaServed`); `FAQPage` on `/faq/`; `BreadcrumbList` on subpages.
- **No review/AggregateRating schema** — self-serving review markup for LocalBusiness violates Google guidelines (manual-action risk). Visible reviews section stays, unmarked.
- `sitemap.xml`, `robots.txt`, `llms.txt`.
- Consistent NAP everywhere, matching the Google Business Profile.
- Internal links: every page links contextually to `/services/` and `/contact/`; town pages cross-link.

## Contact form

- `/contact/` form POSTs to `/api/contact`, a Pages Function in-repo (`functions/api/contact.js`).
- Function: validate fields → verify Turnstile token server-side → send email to Stuart's personal address via the Email Routing `send_email` binding.
- **Day-1 spike (acceptance criterion before any page is built on top of it):** prove an email arrives in a real inbox from the chosen mechanism. Preference order: (1) `send_email` binding directly in the Pages Function; (2) a tiny dedicated Worker holding the `send_email` binding, called from the Pages Function via service binding — still Cloudflare-native, no new vendor; (3) Resend free API as last resort, acknowledged as a real operational cost (new vendor account, API key secret, sender-domain DNS records).
- Progressive enhancement, honestly stated: the form renders and POSTs without JS, but Turnstile requires client-side JS to mint a token, so no-JS submissions fail verification with a clear error message that gives the phone number as the fallback (phone is the garage's primary channel anyway). Honeypot field as a second spam layer. We do not claim a fully working no-JS submission path.
- Turnstile script loads lazily on first form interaction (focus/touch), so `/contact/` holds its Lighthouse 100 — the gate must not be silently softened to accommodate the third-party script.
- Setup dependencies: Email Routing enabled on the zone; Stuart's address added as a verified destination (he must click one verification link).

## Hosting & launch

1. Build on a feature branch; create the Cloudflare Pages project connected to `jammy-git/stuartgilbertlandrovers`; preview URL for James/Stuart review.
2. Merge to `master` = live. DNS record flips from GitHub Pages to the Pages project (same Cloudflare dashboard).
3. **Pre-delete audit:** crawl the built site (e.g. a link checker over the build output) and confirm every internal link and asset resolves, before removing anything old. Then delete old site files (`templates/`, `plugins/`, `js/`, `css/`, `inc/`, `media/`, old root HTML) and `CNAME`; exclude `proposal/` (contains the client PDF) from build output. (Note: `images/` holds both `stuart_david_gilbert.png` and `Stuart-David-Gilbert.JPG` — both currently valid; pick one for the new build and let the audit confirm nothing references the other.)
4. Disable GitHub Pages on the repo.
5. Enable Cloudflare Web Analytics on the Pages project.

Cost: £0/month (Pages free tier, Workers free tier for the function, Email Routing and Turnstile free).

## Client inputs needed (track during build; do not block scaffolding)

| Input | Why | Current state |
|---|---|---|
| Opening hours | Old site says 8:15–5; approved new page says 8:30–5:30 | Conflict — ask Stuart |
| Labour rate | Old site says £59/hr + VAT (2015-era) | Confirm before publishing on `/services/` |
| Diesel/V8 tuning | On old services page, absent from new design | Confirm still offered |
| Stuart's email + verification click | Form delivery destination | Needed at Email Routing setup |

## Verification before launch

- Lighthouse run on every page (mobile + desktop) — gate: 100/100/100/100
- Schema validation, two tools: Google Rich Results Test for types with rich-result eligibility (`AutoRepair`/LocalBusiness, `BreadcrumbList`); Schema Markup Validator for general JSON-LD validity of everything (incl. `FAQPage`, which has no rich-result eligibility here)
- All four 301 redirects checked (incl. `/index.html → /`), plus trailing-slash normalisation spot-checks
- One real end-to-end form submission arriving in an inbox
- axe accessibility pass on every template
