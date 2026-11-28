/* I Am Content — interactions
   Vanilla JS. Lenis (vendored) for smooth scrolling; everything degrades gracefully.
   Structure:
   - Global set-up runs once (header, menu, cursor, footer, page transitions).
   - initPage(main) wires everything inside <main>. It runs on load and again after every
     in-place page swap: the curtain covers the screen, the next page's <main> is fetched and
     swapped in underneath, then the curtain lifts. No document reload, so no iPhone Chrome jump. */
(() => {
  const d = document, root = d.documentElement, body = d.body;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine) and (hover: hover)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  root.classList.remove('no-js');
  root.classList.add('js');
  if (reduced) root.classList.add('reduced');
  const BUILD = ($('meta[name="build"]') || {}).content || '';
  let TITLES = {};
  try { TITLES = JSON.parse(($('#page-titles') || {}).textContent || '{}'); } catch (e) {}
  const XICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* Per-page state; reset by initPage */
  let P = { cleanups: [], fills: [], pars: [], hss: [], shoulds: [], shouldsEnd: null, read: null, readBar: null };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); P.cleanups.push(() => clearTimeout(t)); return t; };

  /* ---------- Context that travels with an enquiry ----------
     Tools (quiz, self-check, Loop Check, talk planner) save a short line here.
     The booking page puts it into Calendly's first question; the contact form sends it along. */
  const CTX = 'iac-ctx';
  const ctx = {
    all() { try { return JSON.parse(store.get(CTX) || '{}') || {}; } catch (e) { return {}; } },
    set(k, label, text) { const a = ctx.all(); a[k] = { label, text }; store.set(CTX, JSON.stringify(a)); },
    del(k) { const a = ctx.all(); delete a[k]; store.set(CTX, JSON.stringify(a)); },
    clear() { store.set(CTX, '{}'); },
    list() { return Object.entries(ctx.all()).map(([k, v]) => Object.assign({ k }, v)); },
    text() { return ctx.list().map(i => `${i.label}: ${i.text}`).join('\n'); }
  };
  const renderCtx = (scope, onChange) => {
    const box = $('[data-ctx-box]', scope); if (!box) return;
    const ul = $('[data-ctx-list]', box), field = $('[data-ctx-field]', scope);
    const draw = () => {
      const items = ctx.list();
      box.hidden = !items.length; ul.innerHTML = '';
      items.forEach(i => {
        const li = d.createElement('li'), t = d.createElement('div'), b = d.createElement('b');
        b.textContent = i.label; t.append(b, d.createTextNode(i.text));
        const x = d.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + i.label); x.innerHTML = XICON;
        x.addEventListener('click', () => { ctx.del(i.k); draw(); if (onChange) onChange(); });
        li.append(t, x); ul.append(li);
      });
      if (field) field.value = ctx.text();
    };
    draw();
  };

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { lenis = null; }
  }
  const hdr = $('.hdr');
  const scrollToEl = (el, instant) => {
    if (!el || el === body || el.id === 'top') {
      if (lenis) lenis.scrollTo(0, { duration: 1.4, immediate: !!instant, force: true });
      else window.scrollTo({ top: 0, behavior: reduced || instant ? 'auto' : 'smooth' });
      return;
    }
    const off = (hdr ? hdr.offsetHeight : 80) + 12;
    if (lenis) lenis.scrollTo(el, { offset: -off, duration: 1.3, immediate: !!instant, force: true });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: reduced || instant ? 'auto' : 'smooth' });
  };

  /* ---------- Split text into words (each word animates itself: no overflow masks) ---------- */
  const split = (el) => {
    if (el.dataset.splitDone) return; el.dataset.splitDone = '1';
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/);
          const frag = d.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; }
            const w = d.createElement('span'); w.className = 'w';
            const inner = d.createElement('span'); inner.textContent = p; inner.style.setProperty('--i', i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          if (n.matches('.keep, svg, img, br, .pill-img')) {
            if (n.matches('br')) return;
            const w = d.createElement('span'); w.className = 'w';
            const inner = d.createElement('span'); inner.style.setProperty('--i', i++);
            n.replaceWith(w); inner.appendChild(n); w.appendChild(inner);
          } else walk(n);
        }
      });
    };
    walk(el);
  };
  /* Fill text: wrap words for scroll-linked colour fill */
  const fillWrap = (el) => {
    if (el.dataset.fillDone) return; el.dataset.fillDone = '1';
    const walk = (node) => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; }
            const s = d.createElement('span'); s.className = 'fw'; s.textContent = p; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.matches('.pill-img')) walk(n);
      });
    };
    walk(el);
  };

  /* ---------- Reveal on view: fires just before an element enters the screen ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px 12% 0px', threshold: 0 });

  /* ---------- Counters ---------- */
  const countIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; countIO.unobserve(el);
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length, suf = el.dataset.suffix || '';
    if (reduced) { el.textContent = end.toFixed(dec) + suf; return; }
    const t0 = performance.now(), dur = 1500;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur), v = end * (1 - Math.pow(1 - p, 4));
      el.textContent = v.toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.4 });

  /* ---------- Header + mobile booking bar ---------- */
  let lastY = 0;
  const dock = $('.dock'), ftr = $('.ftr');
  const onScrollHeader = (y) => {
    if (!hdr) return;
    hdr.classList.toggle('is-solid', y > 40);
    if (!root.classList.contains('menu-open')) hdr.classList.toggle('is-hidden', y > 400 && y > lastY + 2);
    if (y < lastY - 2) hdr.classList.remove('is-hidden');
    if (dock) dock.classList.toggle('is-on', y > window.innerHeight * 0.7 && !(ftr && ftr.getBoundingClientRect().top < window.innerHeight));
    lastY = y;
  };

  /* ---------- Menu ---------- */
  const menuBtn = $('.menu-btn'), menu = $('.menu');
  const setMenu = (open, focusFirst) => {
    if (open === root.classList.contains('menu-open')) return;
    root.classList.toggle('menu-open', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
    if (menu) { menu.setAttribute('aria-hidden', String(!open)); menu.inert = !open; }
    const lab = $('.menu-btn__label'); if (lab) lab.textContent = open ? 'Close' : 'Menu';
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    else body.style.overflow = open ? 'hidden' : '';
    if (open && hdr) hdr.classList.remove('is-hidden');
    if (open && focusFirst) setTimeout(() => { const a = $('.menu__list a', menu); if (a) a.focus(); }, 350);
  };
  if (menu) menu.inert = true;
  if (menuBtn) menuBtn.addEventListener('click', (e) => setMenu(!root.classList.contains('menu-open'), e.detail === 0));
  d.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); if (menuBtn) menuBtn.focus(); } });
  const artImgs = $$('.menu__art img');
  const showArt = (k) => artImgs.forEach(img => img.classList.toggle('is-on', img.dataset.art === k));
  $$('.menu__list a').forEach(a => a.addEventListener('mouseenter', () => showArt(a.dataset.art)));

  /* Mark the current page in the nav (and only the current page) */
  const pageKey = (path) => { const f = (path.split('/').pop() || '').replace(/\.html$/, ''); return f || 'index'; };
  const markCurrent = () => {
    const key = pageKey(location.pathname);
    let art = 'home';
    $$('.hdr__nav a, .menu__list a').forEach(a => {
      const on = pageKey(new URL(a.href, location.href).pathname) === key;
      if (on) { a.setAttribute('aria-current', 'page'); if (a.dataset.art) art = a.dataset.art; } else a.removeAttribute('aria-current');
    });
    showArt(art);
  };

  /* ---------- Scroll-driven effects ---------- */
  const setupHS = () => P.hss.forEach(h => {
    const track = $('.hs__track', h);
    if (window.innerWidth <= 960 || reduced) { h.style.height = ''; track.style.transform = ''; h._dist = 0; return; }
    const dist = Math.max(0, track.scrollWidth - window.innerWidth);
    h._dist = dist; h.style.height = (dist + window.innerHeight) + 'px';
  });
  const onScroll = () => {
    const y = window.scrollY, vh = window.innerHeight;
    onScrollHeader(y);
    P.fills.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const ws = el._ws || (el._ws = $$('.fw', el));
      const n = Math.round(p * ws.length);
      ws.forEach((w, i) => w.classList.toggle('on', i < n));
    });
    if (!reduced) P.pars.forEach(el => {
      const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
      const s = parseFloat(el.dataset.parallax) || 0.1;
      const c = (r.top + r.height / 2 - vh / 2);
      el.style.transform = `translate3d(0, ${(-c * s).toFixed(1)}px, 0)`;
    });
    P.hss.forEach(h => {
      if (!h._dist) return;
      const r = h.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (h.offsetHeight - vh)));
      $('.hs__track', h).style.transform = `translate3d(${(-p * h._dist).toFixed(1)}px,0,0)`;
      const bar = $('.hs__bar i', h); if (bar) bar.style.transform = `scaleX(${p})`;
    });
    if (P.shoulds.length && !reduced) {
      P.shoulds.forEach(s => s.classList.toggle('is-struck', s.getBoundingClientRect().top < vh * 0.62));
      if (P.shouldsEnd) P.shouldsEnd.classList.toggle('is-in', P.shouldsEnd.getBoundingClientRect().top < vh * 0.85 && P.shoulds[P.shoulds.length - 1].classList.contains('is-struck'));
    }
    if (P.read && P.readBar) {
      const r = P.read.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
      P.readBar.style.transform = `scaleX(${p.toFixed(3)})`;
    }
  };
  if (lenis) lenis.on('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { setupHS(); onScroll(); });
  window.addEventListener('load', () => { setupHS(); onScroll(); if (lenis) lenis.resize(); });

  /* ---------- Hover image on rows (mouse only) ---------- */
  const hov = $('.hover-img');
  let hovOn = false, hx = 0, hy = 0, hcx = 0, hcy = 0;
  if (hov && fine) {
    window.addEventListener('mousemove', e => { hx = e.clientX + 150; hy = e.clientY; }, { passive: true });
    const loop = () => { hcx += (hx - hcx) * 0.14; hcy += (hy - hcy) * 0.14; if (hovOn) { hov.style.left = hcx + 'px'; hov.style.top = hcy + 'px'; } requestAnimationFrame(loop); };
    loop();
  }
  const hoverOff = () => { if (hov) hov.classList.remove('is-on'); hovOn = false; };

  /* ---------- Cursor ---------- */
  const cur = $('.cursor');
  if (cur && fine && !reduced) {
    body.classList.add('has-cursor');
    const dot = $('.cursor__dot', cur), ring = $('.cursor__ring', cur), label = $('.cursor__ring span', cur);
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`; }, { passive: true });
    const tick = () => { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(tick); };
    tick();
    d.addEventListener('mouseover', e => {
      const l = e.target.closest('[data-cursor]');
      const a = e.target.closest('a, button, summary, label, input, textarea');
      cur.classList.toggle('is-label', !!l);
      cur.classList.toggle('is-link', !l && !!a);
      label.textContent = l ? l.dataset.cursor : '';
    });
    d.addEventListener('mouseleave', () => { mx = my = -100; });
  }

  /* ---------- Magnetic buttons ---------- */
  const magnet = (scope) => {
    if (!fine || reduced) return;
    $$('.btn, .badge, .tile__go', scope).forEach(b => {
      if (b.dataset.mag) return; b.dataset.mag = '1';
      const strength = b.classList.contains('badge') ? 0.25 : 0.3;
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * strength}px, ${(e.clientY - r.top - r.height / 2) * strength}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  };
  [hdr, menu, dock].forEach(el => el && magnet(el));

  /* ---------- Footer wordmark: letters rise each time it comes into view ---------- */
  const wm = $('[data-wordmark]');
  let wmIO = null;
  if (wm) {
    if (reduced) wm.classList.add('is-in');
    else {
      wmIO = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) wm.classList.add('is-in');
        else if (e.boundingClientRect.top > 0) wm.classList.remove('is-in');   /* left below: replay next time */
      }), { threshold: 0.35 });
      wmIO.observe(wm);
      if (fine) {
        const chs = $$('.ch', wm);
        wm.addEventListener('mousemove', e => chs.forEach(c => {
          const r = c.getBoundingClientRect(), dx = Math.abs(e.clientX - (r.left + r.width / 2));
          const lift = Math.max(0, 1 - dx / 160);
          c.style.transform = lift ? `translateY(${(-lift * 0.12).toFixed(3)}em)` : '';
        }));
        wm.addEventListener('mouseleave', () => chs.forEach(c => { c.style.transform = ''; }));
      }
    }
  }
  const rearmWordmark = () => { if (!wmIO) return; wmIO.unobserve(wm); wm.classList.remove('is-in'); wmIO.observe(wm); };

  /* ---------- Notes mode (?notes=1) ---------- */
  const notesOn = (() => {
    const q = new URLSearchParams(location.search).get('notes');
    if (q === '1') store.sset('iac-notes', '1');
    if (q === '0') store.sset('iac-notes', '');
    return store.sget('iac-notes') === '1';
  })();
  if (notesOn) {
    const bar = d.createElement('div'); bar.className = 'cb-notes-bar';
    bar.innerHTML = '<span>Notes are on</span><button type="button">Hide notes</button>';
    $('button', bar).addEventListener('click', () => { store.sset('iac-notes', ''); $$('.cb-note').forEach(n => n.remove()); bar.remove(); });
    body.appendChild(bar);
  }
  const notes = (main) => {
    if (!notesOn || store.sget('iac-notes') !== '1') return;
    $$('[data-note]', main).forEach(el => {
      const n = d.createElement('aside'); n.className = 'cb-note';
      const b = d.createElement('b'); b.textContent = 'Code Bunny note';
      n.append(b, d.createTextNode(el.dataset.note));
      if (el.tagName === 'SECTION') el.prepend(n); else el.before(n);
    });
  };

  /* ==========================================================================
     IN-PLACE PAGE TRANSITIONS
     ========================================================================== */
  const curtain = $('.curtain'), ctTitle = curtain ? $('.curtain__title', curtain) : null;
  const pageCache = {};
  const fetchPage = (path) => {
    if (!pageCache[path]) {
      pageCache[path] = fetch(path, { credentials: 'same-origin' }).then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }).catch(err => { delete pageCache[path]; throw err; });
    }
    return pageCache[path];
  };
  const isPage = (u) => u.origin === location.origin && (/\.html$/.test(u.pathname) || /\/$/.test(u.pathname));
  let currentPath = location.pathname;

  const resetCurtain = () => {
    if (!curtain) return;
    curtain.classList.add('no-anim');
    curtain.classList.remove('is-leaving', 'is-entering', 'go');
    void curtain.offsetHeight;
    curtain.classList.remove('no-anim');
    root.classList.remove('pt-busy');
  };
  const cover = (key) => new Promise(res => {
    if (ctTitle) ctTitle.innerHTML = TITLES[key] || 'I am <em>content</em>';
    root.classList.add('pt-busy');
    curtain.classList.remove('is-entering', 'go', 'no-anim');
    curtain.classList.add('is-leaving');
    setTimeout(res, 860);
  });
  const lift = () => {
    curtain.classList.add('no-anim', 'is-entering');
    curtain.classList.remove('is-leaving');
    void curtain.offsetHeight;
    curtain.classList.remove('no-anim');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      curtain.classList.add('go');
      setTimeout(() => { resetCurtain(); onScroll(); }, 900);
    }));
  };

  let navigating = false;
  const navigate = (url, push) => {
    if (navigating) return;
    navigating = true;
    setMenu(false);
    hoverOff();
    Promise.all([fetchPage(url.pathname), cover(pageKey(url.pathname))]).then(([html]) => {
      swap(html, url, push);
      navigating = false;
    }).catch(() => { location.href = url.href; });
  };

  const swap = (html, url, push) => {
    const next = new DOMParser().parseFromString(html, 'text/html');
    const nm = next.querySelector('main');
    const nb = (next.querySelector('meta[name="build"]') || {}).content;
    if (!nm || (BUILD && nb && nb !== BUILD)) { location.href = url.href; return; }   /* failure or new deploy: normal load */

    runCleanups();
    $('main').replaceWith(d.importNode(nm, true));
    d.title = next.title;
    const copyMeta = (sel, attr) => { const a = $(sel), b = next.querySelector(sel); if (a && b) a.setAttribute(attr, b.getAttribute(attr)); };
    ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]', 'meta[property="og:image"]', 'meta[name="twitter:image"]'].forEach(s => copyMeta(s, 'content'));
    copyMeta('link[rel="canonical"]', 'href');
    body.dataset.hero = next.body.dataset.hero || 'dark';
    body.dataset.page = next.body.dataset.page || '';
    if (push) history.pushState({ iac: 1 }, '', url.href);
    currentPath = location.pathname;
    markCurrent();
    scrollToEl(null, true);
    window.scrollTo(0, 0);
    lastY = 0; if (hdr) hdr.classList.remove('is-hidden');
    initPage($('main'), 420);
    rearmWordmark();
    onScroll();
    lift();
    if (url.hash) {
      const t = d.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (t) setTimeout(() => scrollToEl(t), 950);
    }
  };

  /* One delegated click handler for every link on the site */
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    if (href.charAt(0) === '#') {
      if (href.length < 2) return;
      const t = d.getElementById(decodeURIComponent(href.slice(1)));
      if (!t) return;
      e.preventDefault(); setMenu(false); scrollToEl(t);
      return;
    }
    const url = new URL(a.href, location.href);
    if (!isPage(url)) return;
    if (url.pathname === location.pathname && url.search === location.search) {
      e.preventDefault(); setMenu(false);
      scrollToEl(url.hash ? d.getElementById(decodeURIComponent(url.hash.slice(1))) : null);
      return;
    }
    if (!curtain || reduced) return;            /* plain navigation */
    e.preventDefault();
    navigate(url, true);
  });

  if (curtain && !reduced) {
    history.replaceState({ iac: 1 }, '', location.href);
    window.addEventListener('popstate', () => {
      const url = new URL(location.href);
      if (!isPage(url)) return;
      if (url.pathname === currentPath) { if (url.hash) scrollToEl(d.getElementById(decodeURIComponent(url.hash.slice(1)))); return; }
      navigate(url, false);
    });
  }
  window.addEventListener('pageshow', e => { if (e.persisted) { setMenu(false); resetCurtain(); } });

  /* Warm up pages as soon as a finger or cursor reaches a link */
  const warm = (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:)/i.test(href)) return;
    const u = new URL(a.href, location.href);
    if (isPage(u) && u.pathname !== location.pathname) fetchPage(u.pathname).catch(() => {});
  };
  d.addEventListener('touchstart', warm, { passive: true });
  d.addEventListener('mouseover', warm, { passive: true });

  function runCleanups() {
    P.cleanups.forEach(fn => { try { fn(); } catch (e) {} });
    P.cleanups = [];
    io.disconnect(); countIO.disconnect();
  }

  /* Generic form post (used once a form service is connected via data-endpoint) */
  function postForm(form, extra) {
    const ep = form.dataset.endpoint; if (!ep) return Promise.resolve();
    const fd = new FormData(form); Object.entries(extra || {}).forEach(([k, v]) => fd.append(k, v));
    return fetch(ep, { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).catch(() => {});
  }

  /* ==========================================================================
     PER-PAGE INITIALISATION (everything inside <main>)
     ========================================================================== */
  function initPage(main, armDelay) {
    P = { cleanups: [], fills: [], pars: [], hss: [], shoulds: [], shouldsEnd: null, read: null, readBar: null };
    $$('[data-split]', main).forEach(split);
    $$('[data-fill]', main).forEach(fillWrap);
    const arm = () => $$('[data-reveal], [data-split], [data-clip], .fern-line, .ring, .loop', main).forEach(el => io.observe(el));
    if (armDelay) later(arm, armDelay); else arm();
    $$('[data-count]', main).forEach(el => countIO.observe(el));
    P.fills = $$('[data-fill]', main);
    P.pars = $$('[data-parallax]', main);
    P.hss = $$('.hs', main); setupHS();
    P.shoulds = $$('.should', main); P.shouldsEnd = $('[data-shoulds-end]', main);
    P.read = $('[data-read]', main); P.readBar = $('[data-read-bar]', main);

    notes(main);
    magnet(main);
    initRows(main); initTilt(main); initFaq(main); initQuotes(main); initChecks(main); initQuiz(main);
    initBreathe(main); initWall(main); initLetters(main); initForms(main); initCopy(main); initStars(main);
    initClock(main); initLoop(main); initTalk(main); initBook(main);
  }

  function initRows(main) {
    if (!hov || !fine) return;
    const himg = $('img', hov);
    $$('[data-hover-img]', main).forEach(r => {
      r.addEventListener('mouseenter', () => { himg.src = r.dataset.hoverImg; hov.classList.add('is-on'); hovOn = true; });
      r.addEventListener('mouseleave', hoverOff);
    });
  }

  function initTilt(main) {
    if (!fine || reduced) return;
    $$('[data-tilt]', main).forEach(el => {
      el.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)';
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  function initFaq(main) {
    $$('.faq details', main).forEach(det => {
      const sum = $('summary', det), ans = $('.faq__a', det);
      sum.addEventListener('click', e => {
        if (reduced) return;
        e.preventDefault();
        if (det.open) {
          ans.animate([{ height: ans.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 400, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => { det.open = false; };
        } else {
          det.open = true; const h = ans.offsetHeight;
          ans.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' });
        }
      });
    });
  }

  function initQuotes(main) {
    $$('[data-quotes]', main).forEach(q => {
      const sec = q.closest('section') || main;
      const items = $$('.quote', sec), cnt = $('.quote-count', sec);
      let i = 0, timer;
      const show = (n) => {
        i = (n + items.length) % items.length;
        items.forEach((it, k) => {
          const on = k === i; it.classList.toggle('is-on', on);
          const bq = $('[data-split]', it);
          if (bq) { bq.classList.remove('is-in'); if (on) requestAnimationFrame(() => requestAnimationFrame(() => bq.classList.add('is-in'))); }
        });
        if (cnt) cnt.textContent = `${String(i + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      };
      const auto = () => { clearInterval(timer); if (!reduced) timer = setInterval(() => show(i + 1), 6500); };
      P.cleanups.push(() => clearInterval(timer));
      $('[data-prev]', sec).addEventListener('click', () => { show(i - 1); auto(); });
      $('[data-next]', sec).addEventListener('click', () => { show(i + 1); auto(); });
      show(0); auto();
    });
  }

  /* Self-check (coaching): ticks travel with the booking */
  function initChecks(main) {
    $$('[data-checks]', main).forEach(wrap => {
      const btns = $$('.check', wrap), res = $('.check-result', wrap.parentElement), msg = $('[data-check-msg]', wrap.parentElement);
      btns.forEach(b => b.addEventListener('click', () => {
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        const on = btns.filter(x => x.getAttribute('aria-pressed') === 'true');
        const n = on.length;
        if (n) ctx.set('check', 'Felt true', on.map(x => x.textContent.trim()).join(' · ')); else ctx.del('check');
        if (!res) return;
        res.hidden = n === 0;
        if (msg) msg.textContent = n === 1 ? '1 of these feels true. That is reason enough to talk it through.' : `${n} of these feel true. A 15-minute discovery call is a good next step.`;
      }));
    });
  }

  /* Starting-point quiz (home) */
  function initQuiz(main) {
    const quiz = $('[data-quiz]', main); if (!quiz) return;
    const steps = $$('.quiz__step', quiz), dots = $$('.quiz__dots i', quiz), ans = {}, said = {};
    const results = JSON.parse($('script[type="application/json"]', quiz).textContent);
    const go = (n) => { steps.forEach((s, k) => s.classList.toggle('is-on', k === n)); dots.forEach((dt, k) => dt.classList.toggle('on', k <= n)); };
    const pick = () => {
      const a = ans.q1, b = ans.q2;
      if (b === 'group') return 'group';
      if (b === 'self') return ({ mother: 'audio', letter: 'letters', quiet: 'reflect', shift: 'story' })[a];
      return a === 'mother' ? 'mother' : 'coach';
    };
    $$('.quiz__opt', quiz).forEach(o => o.addEventListener('click', () => {
      const step = o.closest('.quiz__step'); $$('.quiz__opt', step).forEach(x => x.classList.remove('is-picked')); o.classList.add('is-picked');
      ans[o.dataset.q] = o.dataset.v; said[o.dataset.q] = (o.childNodes[0].textContent || '').trim();
      later(() => {
        if (o.dataset.q === 'q1') go(1);
        else {
          const r = results[pick()], box = steps[2];
          $('[data-r-title]', box).textContent = r.title; $('[data-r-text]', box).textContent = r.text;
          const cta = $('[data-r-cta]', box); cta.href = r.href; $('[data-r-label]', box).textContent = r.cta;
          if (/^https?:/.test(r.href)) { cta.target = '_blank'; cta.rel = 'noopener'; } else { cta.removeAttribute('target'); }
          const img = $('[data-r-img]', box); img.src = r.img; img.alt = r.alt;
          ctx.set('quiz', 'Starting point', `${said.q1} · ${said.q2} → suggested ${r.title}`);
          go(2);
        }
      }, 260);
    }));
    $$('[data-quiz-back]', quiz).forEach(b => b.addEventListener('click', () => go(Math.max(0, steps.findIndex(s => s.classList.contains('is-on')) - 1))));
    $$('[data-quiz-reset]', quiz).forEach(b => b.addEventListener('click', () => { $$('.quiz__opt', quiz).forEach(x => x.classList.remove('is-picked')); go(0); }));
    go(0);
  }

  function initBreathe(main) {
    $$('[data-breathe]', main).forEach(b => {
      const word = $('.breathe__orb b', b), btn = $('[data-breathe-btn]', b), cnt = $('.breathe__count', b);
      let timer = null, round = 0;
      const phases = [['Breathe in', 4000, true], ['Hold', 2000, true], ['Breathe out', 5000, false], ['Rest', 1500, false]];
      const run = (k = 0) => {
        const [label, ms, inb] = phases[k];
        word.textContent = label; b.classList.toggle('is-in-breath', inb);
        if (k === 0) { round++; cnt.textContent = `Breath ${round} of 5`; }
        timer = setTimeout(() => {
          if (k === 3 && round >= 5) { stop(true); return; }
          run((k + 1) % 4);
        }, ms);
      };
      const stop = (done) => { clearTimeout(timer); timer = null; b.classList.remove('is-in-breath'); word.textContent = done ? 'Welcome back' : 'Pause'; btn.querySelector('span').textContent = done ? 'Breathe again' : 'Start breathing'; cnt.textContent = done ? 'Five slow breaths. Well done.' : 'Five slow breaths · about a minute'; round = 0; };
      btn.addEventListener('click', () => { if (timer) stop(false); else { btn.querySelector('span').textContent = 'Stop'; run(0); } });
      P.cleanups.push(() => clearTimeout(timer));
    });
  }

  function initWall(main) {
    const wall = $('[data-wall]', main); if (!wall) return;
    const list = $('.notes', wall), form = $('form', wall), ta = $('textarea', form), ok = $('.form__ok', wall);
    let mine = []; try { mine = JSON.parse(store.get('iac-wall') || '[]'); } catch (e) {}
    const add = (t, isNew) => {
      const n = d.createElement('div'); n.className = 'note' + (isNew ? ' is-new' : '');
      n.textContent = t; const s = d.createElement('small'); s.textContent = isNew ? 'Left just now' : 'Left here'; n.appendChild(s);
      list.prepend(n);
    };
    mine.forEach(t => add(t, false));
    form.addEventListener('submit', e => {
      e.preventDefault(); const t = ta.value.trim(); if (!t) { ta.focus(); return; }
      add(t.slice(0, 220), true); mine.push(t.slice(0, 220)); store.set('iac-wall', JSON.stringify(mine.slice(-12)));
      postForm(form, { note: t }); ta.value = ''; ok.hidden = false; later(() => { ok.hidden = true; }, 6000);
    });
  }

  function initLetters(main) {
    const lf = $('[data-letter-form]', main); if (!lf) return;
    const ta = $('#letter-body', main), done = $('[data-letter-done]', main), code = $('[data-letter-code]', main);
    $$('.prompt', main).forEach(p => p.addEventListener('click', () => {
      const t = p.textContent.replace(/[“”"]/g, '').trim();
      ta.value = (ta.value ? ta.value.trimEnd() + '\n\n' : '') + t + ' ';
      ta.focus({ preventScroll: true }); scrollToEl(lf);
    }));
    const mk = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s.slice(0, 4) + '-' + s.slice(4); };
    lf.addEventListener('submit', e => {
      e.preventDefault();
      if (!lf.reportValidity()) return;
      const c = mk(); code.textContent = c;
      const letters = (() => { try { return JSON.parse(store.get('iac-letters') || '{}'); } catch (err) { return {}; } })();
      letters[c] = { to: $('#letter-to', main).value, body: ta.value, at: Date.now() }; store.set('iac-letters', JSON.stringify(letters));
      postForm(lf, { code: c });
      lf.hidden = true; done.hidden = false; scrollToEl(done);
      const n = $('[data-letter-total]', main); if (n) n.textContent = String(parseInt(n.textContent, 10) + 1);
    });
    const again = $('[data-letter-again]', main);
    if (again) again.addEventListener('click', () => { lf.reset(); lf.hidden = false; done.hidden = true; });
    const rf = $('[data-retrieve]', main);
    if (rf) rf.addEventListener('submit', e => {
      e.preventDefault(); const c = $('#retrieve-code', main).value.trim().toUpperCase(); const out = $('[data-retrieve-out]', main);
      let letters = {}; try { letters = JSON.parse(store.get('iac-letters') || '{}'); } catch (err) {}
      out.hidden = false;
      if (letters[c]) { out.innerHTML = ''; const h = d.createElement('p'); h.className = 'hand'; h.textContent = (letters[c].to ? 'To ' + letters[c].to : 'Your letter'); const p = d.createElement('p'); p.style.whiteSpace = 'pre-wrap'; p.textContent = letters[c].body; out.append(h, p); }
      else out.textContent = 'We couldn’t find a letter with that code on this device. Check the code, or ask us to email it to you below.';
    });
  }

  /* Waitlist, contact, lost-code forms. Contact carries the site context. */
  function initForms(main) {
    const cf = $('form[data-form="contact"]', main);
    if (cf) {
      const params = new URLSearchParams(location.search);
      const brief = ctx.all().talk;
      if (params.get('topic') === 'talk') {
        const r = $('#t2', cf); if (r) r.checked = true;
        const msg = $('#c-msg', cf);
        if (brief && msg && !msg.value) { msg.value = `Hello Ruchi,\n\nWe’d love to plan something together: ${brief.text}\n\n`; ctx.del('talk'); }
      }
      renderCtx(cf);
    }
    $$('form[data-form]', main).forEach(f => f.addEventListener('submit', e => {
      e.preventDefault(); if (!f.reportValidity()) return;
      postForm(f);
      const ok = $('.form__ok', f.parentElement); f.hidden = true; if (ok) { ok.hidden = false; }
      if (f.dataset.form === 'contact') {
        const fd = new FormData(f);
        const extra = fd.get('context') ? `\n\n— Shared from the site —\n${fd.get('context')}` : '';
        const subj = encodeURIComponent(`${fd.get('topic') || 'Hello'} — from ${fd.get('name') || 'the website'}`);
        const bodyTxt = encodeURIComponent(`${fd.get('message') || ''}${extra}\n\n${fd.get('name') || ''}\n${fd.get('email') || ''}`);
        const m = $('[data-mailto]', ok); if (m) m.href = `mailto:ruchi@iamcontent.care?subject=${subj}&body=${bodyTxt}`;
      }
    }));
  }

  function initCopy(main) {
    $$('[data-copy], [data-copy-from]', main).forEach(b => b.addEventListener('click', () => {
      const src = b.dataset.copyFrom ? $(b.dataset.copyFrom, main) : null;
      const txt = b.dataset.copy || (src ? src.textContent : '');
      const lab = $('span', b) || b; const old = lab.textContent;
      const ok = () => { lab.textContent = 'Copied'; later(() => { lab.textContent = old; }, 1800); };
      const sel = () => { if (src) { const r = d.createRange(); r.selectNodeContents(src); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } lab.textContent = 'Press Ctrl/⌘ + C'; later(() => { lab.textContent = old; }, 2400); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok).catch(sel); else sel();
    }));
  }

  function initStars(main) {
    $$('.night__stars', main).forEach(s => { for (let i = 0; i < 60; i++) { const st = d.createElement('i'); st.style.left = Math.random() * 100 + '%'; st.style.top = Math.random() * 100 + '%'; st.style.animationDelay = (Math.random() * 3) + 's'; st.style.opacity = (.2 + Math.random() * .6).toFixed(2); s.appendChild(st); } });
  }

  function initClock(main) {
    $$('[data-clock]', main).forEach(c => {
      const set = () => { const t = new Date(); const h = t.getHours() % 12 || 12, m = String(t.getMinutes()).padStart(2, '0'); c.querySelector('[data-now]').textContent = `${h}:${m}`; };
      set(); const iv = setInterval(set, 30000); P.cleanups.push(() => clearInterval(iv));
    });
  }

  /* ---------- The Loop Check ---------- */
  function initLoop(main) {
    const lc = $('[data-loop]', main); if (!lc) return;
    const data = JSON.parse($('[data-lc-data]', lc).textContent);
    const S = data.statements, N = S.length, LABELS = ['Not really', 'Sometimes', 'Often'], COLORS = ['#8fd15f', '#f4b9c6', '#f6cd5a'];
    const stage = $('[data-lc-stage]', lc), report = $('[data-lc-report]', lc), dots = $$('.lc__dots i', lc);
    const doorEl = $('[data-lc-door]', lc), text = $('[data-lc-text]', lc), back = $('[data-lc-back]', lc), opts = $$('.lc__opt', lc);
    const topLabel = $('.lc__top .micro', lc), topHTML = topLabel.innerHTML;
    let ans = [], i = 0, result = null;
    const show = (k) => {
      i = k;
      doorEl.textContent = 'Door ' + (S[k].door + 1) + ' · ' + data.doors[S[k].door].name;
      text.textContent = S[k].text;
      const nEl = $('[data-lc-n]', lc); if (nEl) nEl.textContent = k + 1;
      dots.forEach((dt, j) => dt.classList.toggle('on', j <= k));
      opts.forEach(o => o.classList.toggle('is-picked', ans[k] !== undefined && +o.dataset.v === ans[k]));
      back.hidden = k === 0;
      stage.classList.remove('is-swap'); void stage.offsetWidth; stage.classList.add('is-swap');
    };
    opts.forEach(o => o.addEventListener('click', () => {
      ans[i] = +o.dataset.v;
      opts.forEach(x => x.classList.toggle('is-picked', x === o));
      later(() => { if (i < N - 1) show(i + 1); else finish(); }, 260);
    }));
    back.addEventListener('click', () => show(Math.max(0, i - 1)));
    const finish = () => {
      const sc = [0, 0, 0]; S.forEach((s, k) => { sc[s.door] += ans[k] || 0; });
      const max = Math.max(...sc), di = max === 0 ? -1 : sc.indexOf(max);
      const door = di < 0 ? null : data.doors[di];
      result = { sc, di };
      stage.hidden = true; report.hidden = false;
      topLabel.textContent = 'Your result';
      dots.forEach(dt => dt.classList.add('on'));
      $('[data-lc-title]', report).innerHTML = door ? `You’re standing at <em>${door.name}.</em>` : data.steady.title;
      $('[data-lc-lead]', report).textContent = door ? `${door.step} · ${door.lead}` : data.steady.lead;
      $('[data-lc-copy]', report).textContent = door ? door.copy : data.steady.copy;
      const bars = $('[data-lc-bars]', report); bars.innerHTML = '';
      data.doors.forEach((dr, j) => {
        const li = d.createElement('li');
        li.innerHTML = `<span>${dr.name}</span><i style="--v:0;--c:${COLORS[j]}"></i><span>${sc[j]}/4</span>`;
        bars.append(li);
        requestAnimationFrame(() => requestAnimationFrame(() => { $('i', li).style.setProperty('--v', String(sc[j] / 4)); }));
      });
      $$('[data-arc]', report).forEach((a, j) => {
        a.style.transition = 'none'; a.style.strokeDashoffset = '1'; void a.getBoundingClientRect();
        a.style.transition = '';
        requestAnimationFrame(() => requestAnimationFrame(() => { a.style.strokeDashoffset = String(sc[j] ? 1 - (sc[j] / 4) * 0.97 : 1); }));
      });
      const ol = $('[data-lc-answers]', report); ol.innerHTML = '';
      S.forEach((s, k) => { const li = d.createElement('li'); li.textContent = s.text + ' '; const b = d.createElement('b'); b.textContent = LABELS[ans[k] || 0]; li.append(b); ol.append(li); });
      const bookA = $('[data-lc-book]', report);
      if (door) { bookA.href = 'book.html'; $('span', bookA).textContent = 'Bring this to a free call'; }
      else { bookA.href = 'reflections.html'; $('span', bookA).textContent = 'Come sit with us'; }
      const tEl = $('[data-lc-title]', report); tEl.tabIndex = -1; try { tEl.focus({ preventScroll: true }); } catch (e) {}
      ctx.set('loop', 'Loop Check', door ? `Standing at ${door.name} (Awareness ${sc[0]}/4 · Acceptance ${sc[1]}/4 · Action ${sc[2]}/4)` : 'Steady ground, nothing pulling hard right now');
      scrollToEl(lc);
    };
    $('[data-lc-again]', report).addEventListener('click', () => {
      ans = []; result = null; report.hidden = true; stage.hidden = false; topLabel.innerHTML = topHTML; show(0); scrollToEl(lc);
    });
    $('[data-lc-save]', report).addEventListener('click', () => { if (result) saveCard(result, data, COLORS); });
    show(0);
  }

  /* Draw the Loop Check result as a shareable image card */
  async function saveCard(res, data, COLORS) {
    try { await Promise.all(['700 80px "Bricolage Grotesque"', 'italic 400 80px "Instrument Serif"', '600 40px "Caveat"', '500 30px "Hanken Grotesk"'].map(f => d.fonts.load(f))); } catch (e) {}
    const W = 1080, H = 1350, c = d.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#13291b'; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W * .85, 120, 0, W * .85, 120, 700); rg.addColorStop(0, 'rgba(143,209,95,.28)'); rg.addColorStop(1, 'rgba(143,209,95,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#8fd15f'; g.font = '600 26px "Hanken Grotesk", sans-serif';
    g.fillText('I AM CONTENT  ·  THE LOOP CHECK', 90, 120);
    const cx = W / 2, cy = 470, r = 230;
    g.lineWidth = 44; g.lineCap = 'round';
    g.strokeStyle = 'rgba(244,239,227,.12)'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    [-90, 30, 150].forEach((start, j) => {
      const frac = res.sc[j] / 4; if (!frac) return;
      const a0 = (start + 6) * Math.PI / 180, a1 = (start + 6 + (108 * frac)) * Math.PI / 180;
      g.strokeStyle = COLORS[j]; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
    });
    const door = res.di < 0 ? null : data.doors[res.di];
    g.textAlign = 'center'; g.fillStyle = '#8fd15f'; g.font = '600 48px "Caveat", cursive';
    g.fillText(door ? 'standing at' : 'on', cx, cy - 30);
    g.fillStyle = '#f4efe3'; g.font = 'italic 400 104px "Instrument Serif", serif';
    g.fillText(door ? door.name : 'steady ground', cx, cy + 60, 380);
    g.textAlign = 'left';
    const wrap = (txt, x, y, maxW, lh) => { const words = txt.split(' '); let line = ''; words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t; }); if (line) g.fillText(line, x, y); return y + lh; };
    g.fillStyle = '#8fd15f'; g.font = 'italic 400 58px "Instrument Serif", serif';
    let y = wrap(door ? door.lead : data.steady.lead, 90, 830, 900, 64);
    g.fillStyle = 'rgba(244,239,227,.82)'; g.font = '500 31px "Hanken Grotesk", sans-serif';
    y = wrap(door ? door.copy : data.steady.copy, 90, y + 12, 900, 46);
    y = Math.max(y + 20, 1120);
    data.doors.forEach((dr, j) => {
      const yy = y + j * 52;
      g.fillStyle = '#f4efe3'; g.font = '600 26px "Hanken Grotesk", sans-serif'; g.fillText(dr.name, 90, yy);
      g.fillStyle = 'rgba(244,239,227,.12)'; g.fillRect(300, yy - 16, 600, 12);
      g.fillStyle = COLORS[j]; g.fillRect(300, yy - 16, 600 * res.sc[j] / 4, 12);
      g.fillStyle = 'rgba(244,239,227,.6)'; g.fillText(res.sc[j] + '/4', 930, yy);
    });
    g.fillStyle = 'rgba(244,239,227,.5)'; g.font = '500 22px "Hanken Grotesk", sans-serif';
    g.fillText('A reflection, not a diagnosis  ·  iamcontent.care', 90, H - 60);
    c.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob), a = d.createElement('a');
      a.href = url; a.download = 'my-loop-check.png'; d.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  }

  /* ---------- Plan a talk ---------- */
  function initTalk(main) {
    const t = $('[data-talk]', main); if (!t) return;
    const out = $('[data-tb-text]', t), send = $('[data-tb-send]', t);
    const val = (n) => $(`input[name="${n}"]:checked`, t);
    const compose = () => {
      const f = val('format'), aud = val('aud'), size = val('size'), where = val('where');
      const topics = $$('input[name="topic"]:checked', t).map(x => x.value.toLowerCase());
      const tp = !topics.length ? 'a theme we agree together' : topics.length === 1 ? topics[0] : topics.slice(0, -1).join(', ') + ' and ' + topics[topics.length - 1];
      return `${f ? f.dataset.label : 'A talk'} on ${tp} for ${aud ? aud.value : 'a group'} of ${size ? size.value : 'some'} people, ${where ? where.value : 'online'}.`;
    };
    const update = () => { out.textContent = compose(); };
    t.addEventListener('change', update); update();
    send.addEventListener('click', () => ctx.set('talk', 'Talk brief', compose()));
  }

  /* ---------- Booking page: Calendly inside the site, with the visitor's note ---------- */
  function initBook(main) {
    const bk = $('[data-book]', main); if (!bk) return;
    const form = $('[data-book-form]', bk), frame = $('[data-cal-frame]', bk), done = $('[data-cal-done]', bk), direct = $('[data-cal-direct]', bk);
    const submitLabel = $('button[type="submit"] span', form);
    const base = bk.dataset.calendly;
    const note = () => {
      const fd = new FormData(form), parts = [];
      const topics = fd.getAll('topics'); if (topics.length) parts.push('Would like to talk about: ' + topics.join(', '));
      const n = String(fd.get('note') || '').trim(); if (n) parts.push(n);
      const c = ctx.text(); if (c) parts.push(c);
      return parts.join('\n');
    };
    const calUrl = (embed) => {
      const fd = new FormData(form), q = new URLSearchParams();
      if (embed) { q.set('embed_domain', location.hostname || 'iamcontent.care'); q.set('embed_type', 'Inline'); }
      q.set('hide_gdpr_banner', '1'); q.set('background_color', 'fbf8f1'); q.set('text_color', '14201a'); q.set('primary_color', '3b583e');
      const nm = String(fd.get('name') || '').trim(), em = String(fd.get('email') || '').trim();
      if (nm) q.set('name', nm); if (em) q.set('email', em);
      const a1 = note(); if (a1) q.set('a1', a1.slice(0, 1200));
      return base + '?' + q.toString();
    };
    let iframe = null;
    const load = () => {
      if (!iframe) {
        const w = $('[data-cal-wait]', frame); if (w) w.remove();
        iframe = d.createElement('iframe');
        iframe.title = 'Choose a time with Ruchi (Calendly)';
        frame.classList.add('is-loading');
        iframe.addEventListener('load', () => frame.classList.remove('is-loading'));
        frame.append(iframe);
      }
      iframe.src = calUrl(true);
      direct.href = calUrl(false);
      if (submitLabel) submitLabel.textContent = 'Update the note in the calendar';
      scrollToEl($('.bk__cal', bk));
    };
    renderCtx(form, () => { direct.href = calUrl(false); });
    direct.href = calUrl(false);
    form.addEventListener('submit', e => { e.preventDefault(); load(); });
    form.addEventListener('input', () => { direct.href = calUrl(false); });
    const go = $('[data-cal-load]', bk); if (go) go.addEventListener('click', load);
    const onMsg = (e) => {
      let host = ''; try { host = new URL(e.origin).hostname; } catch (err) { return; }
      if (!/(^|\.)calendly\.com$/.test(host) || !e.data || typeof e.data !== 'object') return;
      if (e.data.event === 'calendly.page_height' && iframe && e.data.payload && e.data.payload.height) {
        const h = parseInt(e.data.payload.height, 10); if (h > 400) iframe.style.height = h + 'px';
      }
      if (e.data.event === 'calendly.event_scheduled') {
        ctx.clear(); frame.hidden = true; done.hidden = false; scrollToEl(done);
      }
    };
    window.addEventListener('message', onMsg);
    P.cleanups.push(() => window.removeEventListener('message', onMsg));
  }

  /* ==========================================================================
     START
     ========================================================================== */
  $$('[data-year]').forEach(y => { y.textContent = new Date().getFullYear(); });
  markCurrent();
  const loader = $('.loader');
  if (loader && !store.sget('iac-seen') && !reduced) {
    store.sset('iac-seen', '1');
    root.classList.add('pt-busy');
    const c = $('.loader__count', loader); let n = 0;
    const iv = setInterval(() => { n = Math.min(100, n + Math.ceil(Math.random() * 9)); if (c) c.textContent = String(n).padStart(3, '0'); if (n >= 100) clearInterval(iv); }, 38);
    if (lenis) lenis.stop();
    initPage($('main'), 1950);
    setTimeout(() => { loader.classList.add('is-done'); if (lenis) lenis.start(); setTimeout(() => { loader.remove(); root.classList.remove('pt-busy'); }, 1150); }, 1700);
  } else {
    if (loader) loader.remove();
    initPage($('main'));
  }
  onScroll();
})();
