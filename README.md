# I Am Content: website redesign

A static, multi-page site for Ruchi Widge Bagga / I Am Content, designed and built by Code Bunny.
No framework and no build step is needed to host it: upload the folder to any static host
(Netlify, Vercel, Cloudflare Pages, or the existing hosting).

## Pages

| File | Page |
|---|---|
| `index.html` | Home |
| `coaching.html` | 1:1 Coaching & Counselling |
| `motherhood.html` | Motherhood (incl. audio-companion waitlist) |
| `programs.html` | Companions & Programs, Group programs & talks (`#talks`) |
| `reflections.html` | Reflections: guided breath, The Wall, The Watering Hole |
| `unsent-letters.html` | The Unsent Letters Movement |
| `from-the-coaching-room.html` | Story: Purpose After Despair |
| `echoes-at-the-nest.html` | The book |
| `about.html` | The person behind I Am Content |
| `what-guides-our-work.html` | Philosophy & FAQ |
| `contact.html` | Contact |

## Editing

Pages are generated from `_build/pages/*.html` (shared header, menu, footer and closing CTA live
in `_build/build.py`). Edit a page there, then run:

```bash
python3 _build/build.py
```

Requires Python 3 and Pillow (used to add image dimensions automatically).
`assets/css/style.css` holds the whole design system; colour and type tokens are at the top.

## Conversion features added

- **Find your starting point** quiz (home): two questions that route visitors to coaching, motherhood,
  the audio waitlist, letters, reflections or group talks.
- **"Tick what feels true"** self-check (coaching) that turns recognition into a booking prompt.
- **"What happens when you book"** three-step explainer that lowers the barrier to the discovery call.
- Booking call-to-action on every page, plus a sticky **mobile booking bar** after the first screen.
- Client quotes and ratings surfaced as a slider and animated rating rings.
- FAQ sections with `FAQPage` structured data; `ProfessionalService` schema, Open Graph tags,
  canonical URLs and descriptive meta on every page.
- Images re-encoded to WebP: about 31 MB down to 1.9 MB.
- Accessibility: skip link, keyboard-friendly menu (Esc closes), visible focus, alt text,
  and full `prefers-reduced-motion` support.

## Before going live, connect these to her real systems

These parts work in the browser today, but they are not yet connected to Ruchi's back end:

1. **Forms** (audio waitlist, contact, "lost your code", The Wall, Unsent Letters) post to the URL
   in each form's `data-endpoint="…"` attribute. That attribute is empty right now. Point it at her
   form service (WPForms webhook, Formspree, Netlify Forms, etc.). The contact form also offers a
   pre-filled email as a fallback.
2. **Unsent Letters** codes and **The Wall** notes are currently saved only in the visitor's own
   browser. Wire them to the existing letters/wall back end on iamcontent.care so the team can read them.
3. **The Wall's six starter notes** are placeholder examples. Replace them with real, moderated notes
   from the live wall, or remove them.
4. The **"43 letters held"** counter is copied from the live site on 24 Nov 2026. Feed it from the back end.
5. Confirm the **"Taking new clients"** badge on the home hero is accurate.
6. If old WordPress URLs change (e.g. `/coaching/` → `/coaching.html`), add redirects, or host each
   page as `/<name>/index.html` to keep the existing URLs.

Credits: "Site by Code Bunny" in the footer links to https://web.codebunny.net/
