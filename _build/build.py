#!/usr/bin/env python3
"""Static site builder for I Am Content.

Each page lives in _build/pages/<name>.html. The first line is JSON front matter:
  {"title": "...", "desc": "...", "hero": "dark|light", "nav": "coaching"}
The rest is the page body. Shortcodes like {{ARROW}} or {{CTA:Heading|Sub}} are expanded.
Run:  python3 _build/build.py
"""
import json, math, re, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = Path(__file__).resolve().parent / "pages"
BOOK = "https://calendly.com/ruchiwidgebagga/book-a-discovery-call"
SITE = "https://iamcontent.care"

NAV = [  # (slug, label, file, art)
    ("home", "Home", "index.html", "ruchi-portrait-art.webp"),
    ("coaching", "Coaching", "coaching.html", "see-the-person.webp"),
    ("motherhood", "Motherhood", "motherhood.html", "motherhood-art.webp"),
    ("programs", "Companions &amp; Programs", "programs.html", "mother-behind-baby.webp"),
    ("reflections", "Reflections", "reflections.html", "kettle.webp"),
    ("letters", "Unsent Letters", "unsent-letters.html", "postcard.webp"),
    ("about", "About Ruchi", "about.html", "ruchi-photo.webp"),
    ("contact", "Contact", "contact.html", "roses.webp"),
]
TOPNAV = [("coaching", "Coaching", "coaching.html"), ("motherhood", "Motherhood", "motherhood.html"),
          ("programs", "Programs", "programs.html"), ("reflections", "Reflections", "reflections.html"),
          ("about", "About", "about.html")]

# ---------------------------------------------------------------- icons
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
ARROW_UR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>'
SPIRAL = '<svg class="marquee__sep" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M24 44c0-10 2-15 2-22a8 8 0 1 0-8 8c3.4 0 5-2.8 3.6-5.2"/><path d="M25 34c4-1 7-3 9-6M23 28c-4 0-7-1-9-3"/></svg>'
SOCIAL = {
    "YouTube": ("https://www.youtube.com/@ruchiwidgebagga", '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-3.2.5-4.8s-.1-3.2-.5-4.8zM9.7 15V9l5.8 3-5.8 3z"/></svg>'),
    "Instagram": ("https://www.instagram.com/ruchiwidgebagga/", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>'),
    "LinkedIn": ("https://www.linkedin.com/in/ruchiwidgebagga/", '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z"/></svg>'),
    "Substack": ("https://substack.com/@ruchiwidgebagga", '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 3h16v2.4H4zM4 7.6h16V10H4zM4 12.2h16V22l-8-4.4L4 22z"/></svg>'),
}
ICONS = {
    "calendar": '<path d="M4 6h16v14H4zM4 10h16M9 3v5M15 3v5"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "pen": '<path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"/>',
    "wind": '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
    "compass": '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    "lifebuoy": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
    "leaf": '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7"/>',
    "heart": '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    "eye": '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "hands": '<path d="M7 11V6a2 2 0 0 1 4 0v5M11 10V4a2 2 0 0 1 4 0v6M15 9a2 2 0 0 1 4 0v4c0 4-3 8-7 8s-6-2-8-6l-1-3a2 2 0 0 1 3.5-1.5L7 13"/>',
    "book": '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7"/>',
    "mic": '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    "users": '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.6 4 2.8 4 6"/>',
    "moon": '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    "spark": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    "cup": '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3c0 1.5 1.5 1.5 1.5 3M12 3c0 1.5 1.5 1.5 1.5 3"/>',
    "copy": '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
}

def icon(name, cls=""):
    return f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>'

# ---------------------------------------------------------------- fern generator
def fern_svg(cls="fern-line", seed=0):
    """Line-art fiddlehead: a log spiral that becomes a curving stem with leaf outlines."""
    cx, cy = 300, 205
    pts = []
    for k in range(0, 181):
        th = k / 180 * 4.1 * math.pi
        r = 5 * math.exp(0.2 * th)
        pts.append((cx + r * math.cos(th + 2.2), cy + r * math.sin(th + 2.2)))
    spiral = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    x0, y0 = pts[-1]
    tx, ty = pts[-1][0] - pts[-3][0], pts[-1][1] - pts[-3][1]
    tl = math.hypot(tx, ty); tx, ty = tx / tl, ty / tl
    P0 = (x0, y0); P1 = (x0 + tx * 170, y0 + ty * 170); P2 = (150, 640); P3 = (240, 990)

    def bez(t):
        a = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3]
        return (sum(a[i] * p[0] for i, p in enumerate((P0, P1, P2, P3))), sum(a[i] * p[1] for i, p in enumerate((P0, P1, P2, P3))))

    def tan(t):
        x1, y1 = bez(max(0, t - .002)); x2, y2 = bez(min(1, t + .002))
        l = math.hypot(x2 - x1, y2 - y1) or 1
        return ((x2 - x1) / l, (y2 - y1) / l)

    stem = f"M{x0:.1f},{y0:.1f} C{P1[0]:.1f},{P1[1]:.1f} {P2[0]:.1f},{P2[1]:.1f} {P3[0]:.1f},{P3[1]:.1f}"
    paths = [(spiral, 0.0), (stem, 0.55)]
    n = 15
    for i in range(n):
        t = 0.1 + i * (0.8 / (n - 1))
        px, py = bez(t); ux, uy = tan(t)
        nx, ny = -uy, ux
        L = 22 + 120 * math.sin(math.pi * min(1, t * 1.05)) ** 1.3
        for side in (1, -1):
            # leaf points outward and slightly back toward the tip (up the stem)
            ex = px + side * nx * L - ux * L * 0.42
            ey = py + side * ny * L - uy * L * 0.42
            w = L * 0.2
            mx, my = (px + ex) / 2, (py + ey) / 2
            lx, ly = ex - px, ey - py; ll = math.hypot(lx, ly) or 1
            qx, qy = -ly / ll, lx / ll
            c1 = (mx + qx * w, my + qy * w); c2 = (mx - qx * w, my - qy * w)
            leaf = f"M{px:.1f},{py:.1f} Q{c1[0]:.1f},{c1[1]:.1f} {ex:.1f},{ey:.1f} Q{c2[0]:.1f},{c2[1]:.1f} {px:.1f},{py:.1f}"
            vein = f"M{px:.1f},{py:.1f} L{px + (ex - px) * .8:.1f},{py + (ey - py) * .8:.1f}"
            delay = 0.7 + (1 - t) * 1.3
            paths.append((leaf, round(delay, 2)))
            paths.append((vein, round(delay + 0.15, 2)))
    body = "".join(f'<path pathLength="1" style="--d:{dl}" d="{p}"/>' for p, dl in paths)
    return f'<svg class="{cls}" viewBox="0 0 600 1000" aria-hidden="true" focusable="false">{body}</svg>'

FERN = fern_svg()
GLYPH = '<svg viewBox="0 0 48 48" aria-hidden="true"><path pathLength="1" d="M24 44c0-10 2-15 2-22a8 8 0 1 0-8 8c3.4 0 5-2.8 3.6-5.2"/></svg>'

_badge_n = [0]
def badge(text="Book a discovery call · 15 minutes · no pressure · ", href=BOOK, extra_cls=""):
    _badge_n[0] += 1
    pid = f"bp{_badge_n[0]}"
    ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
    return (f'<a class="badge {extra_cls}" href="{href}"{ext} aria-label="Book a 15-minute discovery call">'
            f'<svg class="badge__ring" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="{pid}" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs>'
            f'<text><textPath href="#{pid}" textLength="286">{text}</textPath></text></svg>'
            f'<svg class="badge__core" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M24 44c0-10 2-15 2-22a8 8 0 1 0-8 8c3.4 0 5-2.8 3.6-5.2"/></svg></a>')

def btn(label, href=BOOK, cls="btn--fern", ico=True):
    ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
    i = f'<span class="btn__ico">{ARROW}</span>' if ico else ""
    return f'<a class="btn {cls}" href="{href}"{ext}><span>{label}</span>{i}</a>'

def marquee(words, cls="", dur=38):
    items = []
    for k, w in enumerate(words.split("|")):
        c = "marquee__item serif" if k % 2 else "marquee__item"
        items.append(f'<span class="{c}">{w.strip()}</span>{SPIRAL}')
    track = "".join(items)
    return (f'<div class="marquee {cls}" style="--dur:{dur}s" aria-hidden="true">'
            f'<div class="marquee__track">{track}</div><div class="marquee__track">{track}</div></div>')

def cta(title="Ready when <em>you are.</em>", sub="A 15-minute discovery call. No pressure, no commitment. Just a conversation to see if this feels right."):
    return f'''
<section class="sec sec--tight t-paper" aria-labelledby="cta-title">
  <div class="wrap">
    <div class="cta" data-reveal="scale">
      {FERN}
      <div class="stack" style="--s:22px">
        <p class="eyebrow" style="color:var(--forest)">Your next step</p>
        <h2 class="display" id="cta-title" data-split>{title}</h2>
        <p class="lead">{sub}</p>
      </div>
      <div class="cta__side">
        {badge(extra_cls="cta__badge")}
        <div class="btns">{btn("Book a discovery call", cls="btn--ink")}</div>
        <p class="micro" style="color:rgba(20,32,26,.7)">Prefer writing? <a class="cta__mail" href="mailto:ruchi@iamcontent.care">ruchi@iamcontent.care</a></p>
      </div>
    </div>
  </div>
</section>'''

def faq(items):
    out = []
    for q, a in items:
        out.append(f'<details><summary>{q}<i aria-hidden="true"></i></summary><div class="faq__a"><div>{a}</div></div></details>')
    return '<div class="faq" data-reveal>' + "".join(out) + "</div>"

def faq_schema(items):
    data = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": html.unescape(re.sub("<[^>]+>", "", q)), "acceptedAnswer": {"@type": "Answer", "text": html.unescape(re.sub("<[^>]+>", "", a))}} for q, a in items]}
    return f'<script type="application/ld+json">{json.dumps(data)}</script>'

# ---------------------------------------------------------------- layout
def header(active):
    links = "".join(f'<a href="{f}"{" aria-current=\"page\"" if s == active else ""}>{l}</a>' for s, l, f in TOPNAV)
    menu_links = "".join(
        f'<a href="{f}" data-art="{s}" style="--i:{i}"{" aria-current=\"page\"" if s == active else ""}><small>{i+1:02d}</small><span>{l}</span></a>'
        for i, (s, l, f, a) in enumerate(NAV))
    arts = "".join(f'<img src="assets/img/{a}" alt="" data-art="{s}" class="{"is-on" if s == (active if active in [n[0] for n in NAV] else "home") else ""}" loading="lazy">' for s, l, f, a in NAV)
    socials = "".join(f'<a href="{u}" target="_blank" rel="noopener" aria-label="{n}">{svg}</a>' for n, (u, svg) in SOCIAL.items())
    return f'''
<a class="skip" href="#main">Skip to content</a>
<header class="hdr" data-hdr>
  <div class="hdr__in">
    <a class="hdr__logo" href="index.html" aria-label="I Am Content, home">
      <img class="logo-d" src="assets/img/logo-dark.png" alt="I Am Content" width="900" height="144">
      <img class="logo-l" src="assets/img/logo-light.png" alt="" width="900" height="144">
    </a>
    <nav class="hdr__nav" aria-label="Primary">{links}</nav>
    <div class="hdr__cta">
      {btn("Book a call", cls="btn--fern btn--sm", ico=False)}
      <button class="menu-btn" aria-expanded="false" aria-controls="menu"><span class="menu-btn__label">Menu</span><span class="menu-btn__lines" aria-hidden="true"></span></button>
    </div>
  </div>
</header>
<div class="menu" id="menu" aria-hidden="true">
  <div class="wrap menu__in">
    <nav class="menu__list" aria-label="All pages">{menu_links}</nav>
    <div class="menu__side">
      <div class="menu__art">{arts}</div>
      <div class="menu__meta">
        <p class="hand" style="color:var(--fern)">Helping you uncover the wisdom within.</p>
        <a href="mailto:ruchi@iamcontent.care" class="h4">ruchi@iamcontent.care</a>
        <p class="micro">1:1 sessions online worldwide · in person in Goa, India</p>
        <div class="socials">{socials}</div>
        {btn("Book a discovery call")}
      </div>
    </div>
  </div>
</div>'''

def footer():
    socials = "".join(f'<a href="{u}" target="_blank" rel="noopener" aria-label="{n}">{svg}</a>' for n, (u, svg) in SOCIAL.items())
    return f'''
<footer class="ftr">
  <div class="wrap">
    <div class="ftr__top">
      <div class="ftr__brand">
        <img src="assets/img/logo-light.png" alt="I Am Content" width="900" height="144" loading="lazy">
        <p>Life coaching and counselling with Ruchi Widge Bagga. Online sessions worldwide and in person in Goa, India.</p>
        <div class="socials">{socials}</div>
      </div>
      <div><h3>Work together</h3><ul>
        <li><a href="coaching.html">1:1 Coaching</a></li><li><a href="motherhood.html">Motherhood</a></li>
        <li><a href="programs.html">Companions &amp; Programs</a></li><li><a href="programs.html#talks">Group programs &amp; talks</a></li>
        <li><a href="{BOOK}" target="_blank" rel="noopener">Book a discovery call</a></li></ul></div>
      <div><h3>Free spaces</h3><ul>
        <li><a href="reflections.html">Reflections</a></li><li><a href="unsent-letters.html">Unsent Letters Movement</a></li>
        <li><a href="from-the-coaching-room.html">From the Coaching Room</a></li><li><a href="echoes-at-the-nest.html">Echoes at the Nest</a></li></ul></div>
      <div><h3>About</h3><ul>
        <li><a href="about.html">The person behind I Am Content</a></li><li><a href="what-guides-our-work.html">What guides our work</a></li>
        <li><a href="contact.html">Contact</a></li><li><a href="mailto:ruchi@iamcontent.care">ruchi@iamcontent.care</a></li></ul></div>
    </div>
    <p class="ftr__big" aria-label="Life is to live."><span>Life is</span> <em>to live.</em></p>
    <div class="ftr__bottom">
      <span>© <span data-year>2026</span> I Am Content · Ruchi Widge Bagga</span>
      <span class="ftr__note">Coaching and counselling are not a crisis service. In India, Tele-MANAS is free and open 24/7 on 14416.</span>
      <span>Site by <a href="https://web.codebunny.net/" target="_blank" rel="noopener">Code Bunny</a></span>
      <a href="#top" class="to-top" data-top>Back to top {ARROW}</a>
    </div>
  </div>
</footer>
<div class="dock" role="complementary" aria-label="Quick booking">
  <span>Free 15-minute call<small>No pressure, no commitment</small></span>
  {btn("Book now", cls="btn--fern btn--sm")}
</div>
<div class="hover-img" aria-hidden="true"><img src="" alt=""></div>
<div class="cursor" aria-hidden="true"><div class="cursor__dot"></div><div class="cursor__ring"><span></span></div></div>
<div class="grain" aria-hidden="true"></div>
<div class="curtain" aria-hidden="true">{GLYPH.replace('<svg ', '<svg fill="none" stroke="currentColor" stroke-width="2" ')}</div>'''

LOADER = f'''<div class="loader" aria-hidden="true"><div class="loader__in">{GLYPH}<p class="loader__word"><span>I am content</span></p><p class="loader__count">000</p></div></div>'''

FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700&family=Caveat:wght@500;600&display=swap"

def page(meta, body, name):
    title = meta["title"]; desc = meta["desc"]; hero = meta.get("hero", "dark"); active = meta.get("nav", "")
    fname = "index.html" if name == "index" else f"{name}.html"
    canonical = SITE + "/" + ("" if name == "index" else name + "/")
    og_img = meta.get("og", "ruchi-portrait-art.webp")
    extra_head = meta.get("head", "")
    schema = ""
    if name == "index":
        schema = '<script type="application/ld+json">' + json.dumps({
            "@context": "https://schema.org", "@type": "ProfessionalService", "name": "I Am Content",
            "description": desc, "url": SITE, "email": "ruchi@iamcontent.care",
            "areaServed": ["Goa, India", "Worldwide (online)"], "founder": {"@type": "Person", "name": "Ruchi Widge Bagga",
            "jobTitle": "Life Coach and Counsellor", "sameAs": [u for u, _ in SOCIAL.values()]}}) + "</script>"
    return f'''<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="{desc}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#13291b">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}/assets/img/{og_img}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="assets/css/style.css">
{schema}{extra_head}
</head>
<body data-hero="{hero}" data-page="{name}" id="top">
{LOADER if name == "index" else ""}
{header(active)}
<main id="main">
{body}
</main>
{footer()}
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
<script src="assets/js/main.js" defer></script>
</body>
</html>
'''

# ---------------------------------------------------------------- shortcodes
def expand(body):
    body = body.replace("{{BOOK}}", BOOK).replace("{{ARROW}}", ARROW).replace("{{ARROW_UR}}", ARROW_UR)
    body = body.replace("{{FERN}}", FERN).replace("{{SPIRAL}}", SPIRAL)
    body = body.replace("{{FERN_DARK}}", FERN.replace('class="fern-line"', 'class="fern-line"'))
    body = re.sub(r"\{\{ICON:(\w+)\}\}", lambda m: icon(m.group(1)), body)
    body = re.sub(r"\{\{BADGE(?::([^}]*))?\}\}", lambda m: badge(m.group(1)) if m.group(1) else badge(), body)
    body = re.sub(r"\{\{MARQUEE:([^}|]*?)::([^}]*)\}\}", lambda m: marquee(m.group(2), m.group(1)), body)
    body = re.sub(r"\{\{BTN:([^|}]*)\|([^|}]*)\|([^}]*)\}\}", lambda m: btn(m.group(1), m.group(2) or BOOK, m.group(3) or "btn--fern"), body)
    def _cta(m):
        if not m.group(1): return cta()
        parts = m.group(1).split("|")
        return cta(parts[0], parts[1] if len(parts) > 1 else cta.__defaults__[1])
    body = re.sub(r"\{\{CTA(?::([^}]*))?\}\}", _cta, body)
    return body

def faqs_expand(body):
    def rep(m):
        items = json.loads(m.group(1))
        return faq(items) + faq_schema(items)
    return re.sub(r"\{\{FAQ\s*(\[.*?\])\s*FAQ\}\}", rep, body, flags=re.S)

# ---------------------------------------------------------------- images: add dimensions + lazy
from PIL import Image
_dims = {}
def img_attrs(html_text):
    def rep(m):
        tag = m.group(0)
        src = re.search(r'src="assets/img/([^"]+)"', tag)
        if not src: return tag
        f = ROOT / "assets/img" / src.group(1)
        if f.suffix in (".webp", ".png", ".jpg") and f.exists() and "width=" not in tag:
            if f not in _dims: _dims[f] = Image.open(f).size
            w, h = _dims[f]
            tag = tag.replace("<img ", f'<img width="{w}" height="{h}" ', 1)
        if "loading=" not in tag and "fetchpriority" not in tag:
            tag = tag.replace("<img ", '<img loading="lazy" decoding="async" ', 1)
        return tag
    return re.sub(r"<img\b[^>]*>", rep, html_text)

def main():
    built = []
    for p in sorted(PAGES.glob("*.html")):
        raw = p.read_text(encoding="utf-8")
        first, rest = raw.split("\n", 1)
        meta = json.loads(first)
        body = expand(faqs_expand(rest))
        out = img_attrs(page(meta, body, p.stem))
        target = ROOT / ("index.html" if p.stem == "index" else f"{p.stem}.html")
        target.write_text(out, encoding="utf-8")
        built.append(target.name)
    (ROOT / "assets/img/favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#13291b"/>'
        '<path d="M24 42c0-10 2-15 2-22a8 8 0 1 0-8 8c3.4 0 5-2.8 3.6-5.2" fill="none" stroke="#8fd15f" stroke-width="3.2" stroke-linecap="round"/></svg>')
    print("built:", ", ".join(built))

if __name__ == "__main__":
    main()
