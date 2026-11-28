// Draws one 1200x630 social image per page into assets/og/, plus the icon set.
// Run after build.py whenever a page title or hero art changes:  node _build/og.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const pages = fs.readdirSync(path.join(__dirname, 'pages')).filter(f => f.endsWith('.html'));
const fontCss = fs.readFileSync(path.join(ROOT, 'assets/css/fonts.css'), 'utf8').replace(/\.\.\/fonts\//g, 'file://' + ROOT + '/assets/fonts/');
const img = (f) => 'file://' + ROOT + '/assets/img/' + f;
const tpl = (title, art) => `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
*{margin:0;box-sizing:border-box} body{width:1200px;height:630px;overflow:hidden;background:#13291b;color:#f4efe3;font-family:'Hanken Grotesk';position:relative}
.glow{position:absolute;width:760px;height:760px;left:-260px;top:-320px;border-radius:50%;background:radial-gradient(circle,#2f6b3c,transparent 70%);opacity:.8}
.glow2{position:absolute;width:520px;height:520px;right:180px;bottom:-300px;border-radius:50%;background:radial-gradient(circle,rgba(122,92,224,.5),transparent 70%)}
.logo{position:absolute;left:72px;top:64px;width:210px}
.t{position:absolute;left:72px;bottom:120px;width:640px;font:700 96px/.92 'Bricolage Grotesque';font-variation-settings:"wdth" 80,"opsz" 96;letter-spacing:-.045em;word-spacing:.07em}
.t em{font-family:'Instrument Serif';font-weight:400;font-style:italic;color:#8fd15f;letter-spacing:-.02em}
.u{position:absolute;left:72px;bottom:62px;font:600 18px 'Hanken Grotesk';letter-spacing:.16em;text-transform:uppercase;color:rgba(244,239,227,.6)}
.arch{position:absolute;right:72px;top:64px;width:360px;height:502px;border-radius:999px 999px 28px 28px;overflow:hidden;box-shadow:0 40px 80px -30px rgba(0,0,0,.7)}
.arch img{width:100%;height:100%;object-fit:cover}
.ring{position:absolute;right:376px;top:430px;width:120px;height:120px;border-radius:50%;background:#8fd15f;display:grid;place-items:center}
.ring svg{width:46px;height:46px}
</style></head><body><i class="glow"></i><i class="glow2"></i>
<img class="logo" src="${img('logo-light.png')}"><p class="t">${title}</p><p class="u">iamcontent.care · Ruchi Widge Bagga</p>
<figure class="arch"><img src="${img(art)}"></figure>
<span class="ring"><svg viewBox="0 0 48 48" fill="none" stroke="#13291b" stroke-width="3" stroke-linecap="round"><path d="M24 44c0-10 2-15 2-22a8 8 0 1 0-8 8c3.4 0 5-2.8 3.6-5.2"/></svg></span>
</body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  fs.mkdirSync(path.join(ROOT, 'assets/og'), { recursive: true });
  for (const f of pages) {
    const meta = JSON.parse(fs.readFileSync(path.join(__dirname, 'pages', f), 'utf8').split('\n')[0]);
    const name = f.replace('.html', '');
    const title = name === 'index' ? 'Why does it still feel like a <em>loop?</em>' : (meta.curtain || 'I am <em>content</em>');
    const tmp = path.join(require('os').tmpdir(), 'iac-og.html');
    fs.writeFileSync(tmp, tpl(title, meta.og || 'ruchi-portrait-art.webp'));
    await p.goto('file://' + tmp, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(ROOT, 'assets/og', name + '.jpg'), type: 'jpeg', quality: 82 });
  }
  const svg = fs.readFileSync(path.join(ROOT, 'assets/img/favicon.svg'), 'utf8');
  for (const [n, s] of [['apple-touch-icon', 180], ['icon-192', 192], ['icon-512', 512], ['icon-32', 32]]) {
    await p.setViewportSize({ width: s, height: s });
    await p.setContent(`<html><body style="margin:0;background:#13291b">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `).replace('rx="12"', n === 'apple-touch-icon' ? 'rx="0"' : 'rx="12"')}</body></html>`);
    await p.screenshot({ path: path.join(ROOT, 'assets/img', n + '.png'), omitBackground: n !== 'apple-touch-icon' });
  }
  await b.close();
  console.log('og images:', pages.length);
})();
