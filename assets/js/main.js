/* I Am Content — interactions
   Vanilla JS. Lenis (optional, CDN) for smooth scrolling; everything degrades gracefully. */
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

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { lenis = null; }
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.4 });
    else (typeof target === 'number' ? window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' }) : target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
  };

  /* ---------- Split text into words ---------- */
  const split = (el) => {
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
  $$('[data-split]').forEach(split);

  /* Fill text: wrap words for scroll-linked colour fill */
  $$('[data-fill]').forEach(el => {
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
  });

  /* ---------- Reveal on view ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  const armReveals = () => $$('[data-reveal], [data-split], [data-clip], .fern-line, .ring, .loop, [data-count]').forEach(el => io.observe(el));

  /* ---------- Counters ---------- */
  const countIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; countIO.unobserve(el);
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length, suf = el.dataset.suffix || '';
    if (reduced) { el.textContent = end.toFixed(dec) + suf; return; }
    const t0 = performance.now(), dur = 1800;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur), v = end * (1 - Math.pow(1 - p, 4));
      el.textContent = v.toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.5 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Preloader + page curtain ---------- */
  const loader = $('.loader'), curtain = $('.curtain');
  const start = () => { armReveals(); };
  if (loader && !store.sget('iac-seen') && !reduced) {
    store.sset('iac-seen', '1');
    const c = $('.loader__count', loader); let n = 0;
    const iv = setInterval(() => { n = Math.min(100, n + Math.ceil(Math.random() * 9)); if (c) c.textContent = String(n).padStart(3, '0'); if (n >= 100) clearInterval(iv); }, 38);
    if (lenis) lenis.stop();
    setTimeout(() => { loader.classList.add('is-done'); if (lenis) lenis.start(); setTimeout(start, 250); setTimeout(() => loader.remove(), 1200); }, 1700);
  } else {
    if (loader) loader.remove();
    if (curtain && store.sget('iac-nav') && !reduced) {
      curtain.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => curtain.classList.add('go')));
      setTimeout(() => curtain.classList.remove('is-entering', 'go'), 900);
    }
    start();
  }
  store.sset('iac-nav', '');
  window.addEventListener('pageshow', e => { if (e.persisted && curtain) curtain.classList.remove('is-leaving', 'is-entering', 'go'); });
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || !curtain || reduced) return;
    const href = a.getAttribute('href');
    if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || href.startsWith('#') || /^(mailto|tel|https?):/i.test(href) || a.hasAttribute('download')) return;
    const url = new URL(href, location.href);
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    store.sset('iac-nav', '1');
    curtain.classList.add('is-leaving');
    setTimeout(() => { location.href = url.href; }, 620);
  });

  /* ---------- Anchor links ---------- */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const t = $(id); if (!t) return; e.preventDefault(); scrollTo(t);
  }));
  $$('[data-top]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); scrollTo(0); }));

  /* ---------- Header ---------- */
  const hdr = $('.hdr'); let lastY = 0;
  const dock = $('.dock');
  const onScrollHeader = (y) => {
    if (!hdr) return;
    hdr.classList.toggle('is-solid', y > 40);
    if (!root.classList.contains('menu-open')) hdr.classList.toggle('is-hidden', y > 400 && y > lastY + 2);
    if (y < lastY - 2) hdr.classList.remove('is-hidden');
    if (dock) dock.classList.toggle('is-on', y > window.innerHeight * 0.7);
    lastY = y;
  };

  /* ---------- Menu ---------- */
  const menuBtn = $('.menu-btn'), menu = $('.menu');
  const setMenu = (open) => {
    root.classList.toggle('menu-open', open);
    menuBtn && menuBtn.setAttribute('aria-expanded', String(open));
    menu && menu.setAttribute('aria-hidden', String(!open));
    if (menu) menu.inert = !open;
    $('.menu-btn__label') && ($('.menu-btn__label').textContent = open ? 'Close' : 'Menu');
    if (lenis) open ? lenis.stop() : lenis.start();
    else body.style.overflow = open ? 'hidden' : '';
    if (open) hdr && hdr.classList.remove('is-hidden');
  };
  if (menu) menu.inert = true;
  menuBtn && menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  d.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); menuBtn && menuBtn.focus(); } });
  const artImgs = $$('.menu__art img');
  $$('.menu__list a').forEach(a => a.addEventListener('mouseenter', () => {
    const k = a.dataset.art; artImgs.forEach(img => img.classList.toggle('is-on', img.dataset.art === k));
  }));

  /* ---------- Scroll-driven effects ---------- */
  const fills = $$('[data-fill]');
  const pars = $$('[data-parallax]');
  const hss = $$('.hs');
  const setupHS = () => hss.forEach(h => {
    const track = $('.hs__track', h);
    if (window.innerWidth <= 960 || reduced) { h.style.height = ''; track.style.transform = ''; h._dist = 0; return; }
    const dist = Math.max(0, track.scrollWidth - window.innerWidth);
    h._dist = dist; h.style.height = (dist + window.innerHeight) + 'px';
  });
  setupHS();
  const onScroll = () => {
    const y = window.scrollY, vh = window.innerHeight;
    onScrollHeader(y);
    fills.forEach(el => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const ws = el._ws || (el._ws = $$('.fw', el));
      const n = Math.round(p * ws.length);
      ws.forEach((w, i) => w.classList.toggle('on', i < n));
    });
    if (!reduced) pars.forEach(el => {
      const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
      const s = parseFloat(el.dataset.parallax) || 0.1;
      const c = (r.top + r.height / 2 - vh / 2);
      el.style.transform = `translate3d(0, ${(-c * s).toFixed(1)}px, 0)`;
    });
    hss.forEach(h => {
      if (!h._dist) return;
      const r = h.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (h.offsetHeight - vh)));
      $('.hs__track', h).style.transform = `translate3d(${(-p * h._dist).toFixed(1)}px,0,0)`;
      const bar = $('.hs__bar i', h); if (bar) bar.style.transform = `scaleX(${p})`;
    });
  };
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { setupHS(); onScroll(); });
  window.addEventListener('load', () => { setupHS(); onScroll(); });
  onScroll();

  /* ---------- Hover image on rows ---------- */
  const hov = $('.hover-img');
  if (hov && fine) {
    const himg = $('img', hov); let hx = 0, hy = 0, cx = 0, cy = 0, on = false;
    $$('[data-hover-img]').forEach(r => {
      r.addEventListener('mouseenter', () => { himg.src = r.dataset.hoverImg; hov.classList.add('is-on'); on = true; });
      r.addEventListener('mouseleave', () => { hov.classList.remove('is-on'); on = false; });
    });
    window.addEventListener('mousemove', e => { hx = e.clientX + 150; hy = e.clientY; }, { passive: true });
    const loop = () => { cx += (hx - cx) * 0.14; cy += (hy - cy) * 0.14; if (on) hov.style.left = cx + 'px', hov.style.top = cy + 'px'; requestAnimationFrame(loop); };
    loop();
  }

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
  if (fine && !reduced) $$('.btn, .badge, .tile__go').forEach(b => {
    const strength = b.classList.contains('badge') ? 0.25 : 0.3;
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * strength}px, ${(e.clientY - r.top - r.height / 2) * strength}px)`;
    });
    b.addEventListener('mouseleave', () => { b.style.transform = ''; });
  });

  /* ---------- Tilt ---------- */
  if (fine && !reduced) $$('[data-tilt]').forEach(el => {
    el.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)';
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });

  /* ---------- FAQ smooth open ---------- */
  $$('.faq details').forEach(det => {
    const sum = $('summary', det), body = $('.faq__a', det);
    sum.addEventListener('click', e => {
      if (reduced) return;
      e.preventDefault();
      if (det.open) {
        body.animate([{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => { det.open = false; };
      } else {
        det.open = true; const h = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  });

  /* ---------- Quotes slider ---------- */
  $$('[data-quotes]').forEach(q => {
    const items = $$('.quote', q.closest('section') || d), cnt = $('.quote-count', q.closest('section'));
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
    $('[data-prev]', q.closest('section')).addEventListener('click', () => { show(i - 1); auto(); });
    $('[data-next]', q.closest('section')).addEventListener('click', () => { show(i + 1); auto(); });
    show(0); auto();
  });

  /* ---------- Self-check (coaching) ---------- */
  $$('[data-checks]').forEach(wrap => {
    const btns = $$('.check', wrap), res = $('.check-result', wrap.parentElement), msg = $('[data-check-msg]', wrap.parentElement);
    btns.forEach(b => b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      const n = btns.filter(x => x.getAttribute('aria-pressed') === 'true').length;
      if (!res) return;
      res.hidden = n === 0;
      if (msg) msg.textContent = n === 1 ? '1 of these feels true. That is reason enough to talk it through.' : `${n} of these feel true. A 15-minute discovery call is a good next step.`;
    }));
  });

  /* ---------- Starting-point quiz ---------- */
  const quiz = $('[data-quiz]');
  if (quiz) {
    const steps = $$('.quiz__step', quiz), dots = $$('.quiz__dots i', quiz), ans = {};
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
      ans[o.dataset.q] = o.dataset.v;
      setTimeout(() => {
        if (o.dataset.q === 'q1') go(1);
        else {
          const r = results[pick()], box = steps[2];
          $('[data-r-title]', box).textContent = r.title; $('[data-r-text]', box).textContent = r.text;
          const cta = $('[data-r-cta]', box); cta.href = r.href; $('[data-r-label]', box).textContent = r.cta;
          if (/^https?:/.test(r.href)) { cta.target = '_blank'; cta.rel = 'noopener'; } else { cta.removeAttribute('target'); }
          const img = $('[data-r-img]', box); img.src = r.img; img.alt = r.alt;
          go(2);
        }
      }, 280);
    }));
    $$('[data-quiz-back]', quiz).forEach(b => b.addEventListener('click', () => go(Math.max(0, steps.findIndex(s => s.classList.contains('is-on')) - 1))));
    $$('[data-quiz-reset]', quiz).forEach(b => b.addEventListener('click', () => { $$('.quiz__opt', quiz).forEach(x => x.classList.remove('is-picked')); go(0); }));
    go(0);
  }

  /* ---------- Breathe ---------- */
  $$('[data-breathe]').forEach(b => {
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
  });

  /* ---------- Reflection wall ---------- */
  const wall = $('[data-wall]');
  if (wall) {
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
      postForm(form, { note: t }); ta.value = ''; ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 6000);
    });
  }

  /* ---------- Unsent letters ---------- */
  const lf = $('[data-letter-form]');
  if (lf) {
    const ta = $('#letter-body'), done = $('[data-letter-done]'), code = $('[data-letter-code]');
    $$('.prompt').forEach(p => p.addEventListener('click', () => {
      const t = p.textContent.replace(/[“”"]/g, '').trim();
      ta.value = (ta.value ? ta.value.trimEnd() + '\n\n' : '') + t + ' ';
      ta.focus(); scrollTo(lf);
    }));
    const mk = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s.slice(0, 4) + '-' + s.slice(4); };
    lf.addEventListener('submit', e => {
      e.preventDefault();
      if (!lf.reportValidity()) return;
      const c = mk(); code.textContent = c;
      const letters = (() => { try { return JSON.parse(store.get('iac-letters') || '{}'); } catch (e) { return {}; } })();
      letters[c] = { to: $('#letter-to').value, body: ta.value, at: Date.now() }; store.set('iac-letters', JSON.stringify(letters));
      postForm(lf, { code: c });
      lf.hidden = true; done.hidden = false; scrollTo(done);
      const n = $('[data-letter-total]'); if (n) n.textContent = String(parseInt(n.textContent, 10) + 1);
    });
    $('[data-letter-again]') && $('[data-letter-again]').addEventListener('click', () => { lf.reset(); lf.hidden = false; done.hidden = true; });
    const rf = $('[data-retrieve]');
    rf && rf.addEventListener('submit', e => {
      e.preventDefault(); const c = $('#retrieve-code').value.trim().toUpperCase(); const out = $('[data-retrieve-out]');
      let letters = {}; try { letters = JSON.parse(store.get('iac-letters') || '{}'); } catch (e) {}
      out.hidden = false;
      if (letters[c]) { out.innerHTML = ''; const h = d.createElement('p'); h.className = 'hand'; h.textContent = (letters[c].to ? 'To ' + letters[c].to : 'Your letter'); const p = d.createElement('p'); p.style.whiteSpace = 'pre-wrap'; p.textContent = letters[c].body; out.append(h, p); }
      else out.textContent = 'We couldn’t find a letter with that code on this device. Check the code, or ask us to email it to you below.';
    });
  }

  /* ---------- Generic forms (waitlist, contact) ---------- */
  function postForm(form, extra) {
    const ep = form.dataset.endpoint; if (!ep) return Promise.resolve();
    const fd = new FormData(form); Object.entries(extra || {}).forEach(([k, v]) => fd.append(k, v));
    return fetch(ep, { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).catch(() => {});
  }
  $$('form[data-form]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault(); if (!f.reportValidity()) return;
    postForm(f);
    const ok = $('.form__ok', f.parentElement); f.hidden = true; if (ok) { ok.hidden = false; }
    if (f.dataset.form === 'contact') {
      const fd = new FormData(f);
      const subj = encodeURIComponent(`${fd.get('topic') || 'Hello'} — from ${fd.get('name') || 'the website'}`);
      const bodyTxt = encodeURIComponent(`${fd.get('message') || ''}\n\n${fd.get('name') || ''}\n${fd.get('email') || ''}`);
      const m = $('[data-mailto]', ok); if (m) m.href = `mailto:ruchi@iamcontent.care?subject=${subj}&body=${bodyTxt}`;
    }
  }));

  /* ---------- Copy buttons ---------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const txt = b.dataset.copy || ($(b.dataset.copyFrom) || {}).textContent || '';
    const lab = $('span', b) || b; const old = lab.textContent;
    const ok = () => { lab.textContent = 'Copied'; setTimeout(() => { lab.textContent = old; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok).catch(() => sel(txt)); else sel(txt);
    function sel(t) { const r = d.createRange(); const n = $(b.dataset.copyFrom); if (n) { r.selectNodeContents(n); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } lab.textContent = 'Press Ctrl/⌘ + C'; setTimeout(() => { lab.textContent = old; }, 2400); }
  }));

  /* ---------- Night sky stars ---------- */
  $$('.night__stars').forEach(s => { for (let i = 0; i < 60; i++) { const st = d.createElement('i'); st.style.left = Math.random() * 100 + '%'; st.style.top = Math.random() * 100 + '%'; st.style.animationDelay = (Math.random() * 3) + 's'; st.style.opacity = (.2 + Math.random() * .6).toFixed(2); s.appendChild(st); } });

  /* ---------- Live 3 am clock ---------- */
  $$('[data-clock]').forEach(c => {
    const set = () => { const t = new Date(); const h = t.getHours() % 12 || 12, m = String(t.getMinutes()).padStart(2, '0'); c.querySelector('[data-now]').textContent = `${h}:${m}`; };
    set(); setInterval(set, 30000);
  });

  /* Year */
  $$('[data-year]').forEach(y => { y.textContent = new Date().getFullYear(); });
})();
