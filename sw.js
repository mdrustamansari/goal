// Rustam's Goal Manager: offline service worker.
// Bump CACHE_VERSION whenever you replace any file so phones pick up the update.
const CACHE_VERSION = 'rustams-goal-manager-v5-39';
const ASSETS = ['./', './index.html', './style.css', './engine.js', './speed.js', './report.js', './look.js', './flagship.css', './buttons.css', './fonts/inter-latin-200-normal.woff2', './fonts/inter-latin-300-normal.woff2', './fonts/inter-latin-400-normal.woff2', './fonts/manrope-latin-200-normal.woff2', './fonts/manrope-latin-300-normal.woff2', './fonts/manrope-latin-400-normal.woff2', './insight.js', './companion-art.js', './companion-lines.js', './companion-flare.js', './companion.js', './DESIGN-LANGUAGE.md', './HUMANE-TRACKER.md', './banner.js', './sections.js', './wizard.js', './resume.js', './fresh.js', './swipe.js', './a11y.js', './liquid.js', './feel.js', './app.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(cached => {
    const refresh = fetch(req).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => cached);
    return cached || refresh;
  }));
});
