# I Am Content: website redesign

A static, multi-page site for Ruchi Widge Bagga / I Am Content, designed and built by Code Bunny.
Live preview: https://iamcontent.codebunny.net · Pitch page: `/preview-pack.html` · Explanations on the live site: add `?notes=1` to any URL.

No framework, no runtime dependencies. Fonts and Lenis are self-hosted, so nothing loads from a CDN.

## Pages

| File | Page |
|---|---|
| `index.html` | Home |
| `coaching.html` | 1:1 Coaching & Counselling (incl. "Tick what feels true") |
| `loop-check.html` | **The Loop Check**: 60-second self-check with a personal report |
| `book.html` | **Book a call**: Calendly embedded, optional note, context from the tools |
| `motherhood.html` | Motherhood (incl. audio-companion waitlist) |
| `programs.html` | Companions & Programs, Group programs & talks (`#talks`), **Plan a talk** (`#plan`) |
| `reflections.html` | Reflections: guided breath, The Wall, The Watering Hole |
| `unsent-letters.html` | The Unsent Letters Movement |
| `from-the-coaching-room.html` | Story: Purpose After Despair |
| `echoes-at-the-nest.html` | The book |
| `about.html` | The person behind I Am Content |
| `what-guides-our-work.html` | Philosophy & FAQ (incl. the crossed-out "shoulds") |
| `contact.html` | Contact |
| `preview-pack.html` | Pitch page for Ruchi (noindex, not in the nav) |
| `404.html` | Not found |

## Editing

Pages are generated from `_build/pages/*.html` (shared header, menu, footer and closing CTA live in
`_build/build.py`). The first line of each page is JSON front matter (`title`, `desc`, `hero`, `nav`, `og`, `curtain`).

```bash
python3 _build/build.py     # builds every page, sitemap.xml and robots.txt into the repo root
node _build/og.js           # redraws the social images in assets/og/ (only when titles or hero art change)
```

`build.py` needs Python 3 and Pillow; `og.js` needs Node and Playwright.
`assets/css/style.css` holds the design system; colour, type and spacing tokens are at the top.
Settings at the top of `build.py`: `CALENDLY` (booking link), `SITE` (go-live domain for canonicals and the
sitemap) and `ASSET_HOST` (where social images are served from; set it to `SITE` once the site moves).

## How the site behaves

- **In-place page changes.** A forest curtain carrying the next page's name covers the screen, the next page is
  fetched and swapped in underneath, then the curtain lifts. The browser never reloads the document, which avoids
  the iPhone Chrome resize jump. Address bar, back/forward, deep links and `#section` links all work. Any failure,
  a new deploy (build id changes) or reduced motion falls back to a normal page load.
- **Context travels with the enquiry.** The Loop Check result, the starting-point quiz answer, the self-check
  ticks and the talk brief are saved in the visitor's browser. The booking page puts them (plus the visitor's
  optional note) into Calendly's first question via the `a1` parameter, and the contact form sends them along.
  Visitors can remove any item before sending.
- Motion: word-by-word headline reveals that start just before content enters the screen, scroll-lit text,
  a pinned sideways method section, magnetic buttons and a labelled cursor (mouse only), hover effects only on
  devices that hover, and a footer wordmark that rises letter by letter every time it comes into view.
  Everything shows with JavaScript off and with reduced motion on.
- SEO: per-page titles, descriptions, canonicals and 1200×630 social images; `ProfessionalService` and `FAQPage`
  schema; `sitemap.xml`; `robots.txt`.

## Before going live, connect these to her real systems

1. **Calendly note field.** The booking page sends the visitor's note to Calendly's first custom question (`a1`).
   Make sure the first question on the "book-a-discovery-call" event is a free-text one (e.g. "Anything you'd like
   Ruchi to know?").
2. **Forms** (audio waitlist, contact, "lost your code", The Wall, Unsent Letters) post to the URL in each form's
   `data-endpoint="…"` attribute. It's empty for now. Point it at her form service (WPForms webhook, Formspree,
   Netlify Forms, etc.). Until then the contact form opens a pre-filled email.
3. **Unsent Letters** codes and **The Wall** notes are saved only in the visitor's own browser. Wire them to the
   existing letters/wall back end on iamcontent.care so the team can read them.
4. If old WordPress URLs change (e.g. `/coaching/` → `/coaching.html`), add redirects, or host each page as
   `/<name>/index.html` to keep the existing URLs. Canonicals and the sitemap already use the `/<name>/` form.

## Content for the client to confirm

- **The Loop Check statements** (six lines) are drafted by Code Bunny. The report text for each door is Ruchi's
  own three-step copy from the coaching page.
- **The rewritten "shoulds"** ("who I am", "how I love", "how my life unfolds", "and slowly, I am content") are
  drafted from her line about expectations of who we should be, how we should love and how life should unfold.
- **The Wall's six starter notes** are examples, labelled as such. Replace them with real, moderated notes or remove them.
- The **"43 letters held"** counter was copied from the live site on 24 Nov 2026. Feed it from the back end.
- Confirm the **"Taking new clients"** badge on the home hero is accurate.
- Booking-page FAQ: the line for visitors outside India ("please contact your local emergency number or a
  helpline near you") is drafted; the Tele-MANAS details come from her site.
- Talk planner options (formats, audiences, group sizes, online or in person) are drafted around her listed
  topics. No prices or availability are promised.
- Client quotes and the 5 / 4.75 / 5 ratings come from her coaching page (punctuation lightly tidied, e.g. an em dash
  became a full stop). The short captions under the ratings on the home page ("Clients don't get handed answers…") are drafted.
- "800+ coaching and counselling hours" is from her About page.

Credits: "Site by Code Bunny" in the footer links to https://web.codebunny.net/
