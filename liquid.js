/* GLiquid: the "Liquid" glass style (clear glass, light top-left rim, dark bottom rim, inner glow, tinted shadow).
   Frosted (the original glass) stays the default and is never changed. Shared by all apps.
   Settings live in the app's own prefs: glassStyle, lqFrost, lqTint, lqLight, lqLightBlur, lqDark, lqDarkBlur, lqShadow, lqShine, lqStreak. */
(function (root) {
    'use strict';
    const D = { glassStyle: 'frosted', lqFrost: 7, lqTint: 22, lqLight: 100, lqLightBlur: 1, lqDark: 60, lqDarkBlur: 3, lqShadow: 60, lqShine: 60, lqStreak: false };
    let cfg = null;
    const P = () => { const p = (cfg && cfg.prefs()) || {}; const o = {}; Object.keys(D).forEach(k => { o[k] = p[k] === undefined ? D[k] : p[k]; }); return o; };
    function apply() {
        const h = document.documentElement, p = P();
        const on = p.glassStyle === 'liquid';
        if (on) h.setAttribute('data-glass', 'liquid'); else h.removeAttribute('data-glass');
        if (on && p.lqStreak) h.setAttribute('data-streak', '1'); else h.removeAttribute('data-streak');
        // Paper pages are plain, so they get a little more tint to keep text clear.
        const paper = h.getAttribute('data-look') === 'paper';
        const tint = Math.min(0.75, p.lqTint / 100 + (paper ? 0.16 : 0));
        h.style.setProperty('--lq-frost', p.lqFrost + 'px');
        h.style.setProperty('--lq-tint', tint.toFixed(3));
        h.style.setProperty('--lq-lt', (p.lqLight / 100).toFixed(2));
        h.style.setProperty('--lq-ltb', p.lqLightBlur + 'px');
        h.style.setProperty('--lq-dk', (p.lqDark / 100).toFixed(2));
        h.style.setProperty('--lq-dkb', p.lqDarkBlur + 'px');
        h.style.setProperty('--lq-shadow', (p.lqShadow / 100).toFixed(2));
        h.style.setProperty('--lq-shine', (p.lqShine / 100).toFixed(2));
        // Adaptive hairline: the clearer the glass, the stronger the outline.
        h.style.setProperty('--lq-hair', Math.max(0.14, Math.min(0.42, 0.14 + (0.5 - tint) * 0.42)).toFixed(2));
    }
    const row = (k, label, max, unit, v) => `<div class="bg-row"><span>${label}</span><input type="range" data-lq="${k}" min="0" max="${max}" value="${v}" aria-label="${label}"><b class="bg-val" id="lq-${k}-v">${v}${unit}</b></div>`;
    function settingsHTML() {
        const p = P(), lq = p.glassStyle === 'liquid';
        return `<div class="card"><h3>Glass style</h3>
          <div class="seg" id="lq-style"><button type="button" data-lqstyle="frosted" class="${lq ? '' : 'on'}">Frosted</button><button type="button" data-lqstyle="liquid" class="${lq ? 'on' : ''}">Liquid</button></div>
          <p class="hint mt">${lq ? 'Clear glass with a bright rim just inside the top-left edge, a dark rim just outside it, a soft shine on top, a thin outline and a soft shadow.' : 'The frosted glass you know. Switch to Liquid for clear, thicker-looking glass.'}</p>
          ${lq ? row('lqFrost', 'Frost', 30, ' px', p.lqFrost) + row('lqTint', 'Tint', 60, '%', p.lqTint) + row('lqLight', 'Light rim: brightness', 100, '%', p.lqLight) + row('lqLightBlur', 'Light rim: blur', 12, ' px', p.lqLightBlur) + row('lqDark', 'Dark rim: darkness', 100, '%', p.lqDark) + row('lqDarkBlur', 'Dark rim: blur', 12, ' px', p.lqDarkBlur) + row('lqShadow', 'Shadow', 100, '%', p.lqShadow) + row('lqShine', 'Top shine', 100, '%', p.lqShine) +
            `<div class="sw-row"><div><div>Diagonal highlight</div><div class="set-meta">A soft shiny streak across each card.</div></div><label class="switch"><input type="checkbox" data-lq="lqStreak" ${p.lqStreak ? 'checked' : ''}><i></i></label></div>
             <button type="button" class="btn-line" data-lqreset="1">Reset Liquid settings</button>` : ''}</div>`;
    }
    function set(k, v) { if (cfg) cfg.set(k, v); apply(); }
    document.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-lqstyle],[data-lqreset]'); if (!b || !cfg) return;
        if (b.dataset.lqreset) { Object.keys(D).forEach(k => { if (k !== 'glassStyle') cfg.set(k, D[k]); }); apply(); cfg.render(); return; }
        set('glassStyle', b.dataset.lqstyle); cfg.render();
    });
    document.addEventListener('input', e => {
        const t = e.target; if (!t || !t.dataset || !t.dataset.lq || t.type !== 'range') return;
        const v = +t.value; set(t.dataset.lq, v);
        const o = document.getElementById('lq-' + t.dataset.lq + '-v'); if (o) o.textContent = v + (/Frost$|Blur$/.test(t.dataset.lq) ? ' px' : '%');
    });
    document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.lq === 'lqStreak' && t.type === 'checkbox') set('lqStreak', t.checked); });
    root.GLiquid = { config: c => { cfg = c; apply(); }, apply, settingsHTML, defaults: D };
})(window);
