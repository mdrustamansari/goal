/* Button glass tint (Goal v5.41): two sliders for the glass buttons that belong to the task at hand.
   Accent tint = how much of the accent colour tints the glass; Black tint = how much it is dimmed. Settings live in prefs: btnAccent, btnBlack. */
(function (root) {
    'use strict';
    const D = { btnAccent: 9, btnBlack: 0 };
    let cfg = null;
    const P = () => { const p = (cfg && cfg.prefs()) || {}; const o = {}; Object.keys(D).forEach(k => { o[k] = p[k] === undefined ? D[k] : p[k]; }); return o; };
    const hex = h => { h = String(h || '').trim().replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); if (!/^[0-9a-f]{6}$/i.test(h)) return null; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    function apply() {
        const h = document.documentElement, p = P(), dark = h.getAttribute('data-scheme') === 'dark';
        const cs = getComputedStyle(h), a = hex(cs.getPropertyValue('--blue-a')) || [92, 159, 230], b = hex(cs.getPropertyValue('--blue-b')) || [53, 96, 189];
        // light themes tint with the darker accent; dark themes with the lighter one
        const c = dark ? a.map(v => Math.round(v + (255 - v) * 0.25)) : b.map(v => Math.round(v * 0.9));
        h.style.setProperty('--b-accrgb', c.join(','));
        h.style.setProperty('--b-acc', (p.btnAccent / 100 * (dark ? 1.3 : 1)).toFixed(3));
        h.style.setProperty('--b-blk', (p.btnBlack / 100).toFixed(3));
    }
    const row = (k, label, v) => `<div class="bg-row"><span>${label}</span><input type="range" data-bk="${k}" min="0" max="${k === 'btnBlack' ? 10 : 20}" value="${v}" aria-label="${label}"><b class="bg-val" id="bk-${k}-v">${v}%</b></div>`;
    function settingsHTML() {
        const p = P();
        return `<div class="card" data-sec="set:glass-tint"><h3>Glass tint</h3><p class="hint">The tint of the glass buttons. The accent tint colours the glass gently; the black tint dims it. In Liquid style the accent also tints the cards.</p>${row('btnAccent', 'Accent tint', p.btnAccent)}${row('btnBlack', 'Black tint', p.btnBlack)}<button type="button" class="btn-line" data-bkreset="1">Reset glass tint</button></div>`;
    }
    const set = (k, v) => { if (cfg) cfg.set(k, v); apply(); };
    document.addEventListener('input', e => { const t = e.target; if (!t || !t.dataset || !t.dataset.bk || t.type !== 'range') return; const v = +t.value; set(t.dataset.bk, v); const o = document.getElementById('bk-' + t.dataset.bk + '-v'); if (o) o.textContent = v + '%'; });
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-bkreset]'); if (!b || !cfg) return; Object.keys(D).forEach(k => cfg.set(k, D[k])); apply(); cfg.render(); });

    root.GBtnLook = { config: c => { cfg = c; apply(); }, apply, settingsHTML, defaults: D };
})(window);
