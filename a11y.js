/* GA11y: screen-reader and keyboard help for custom controls. Shared by all apps.
   It only adds attributes; it never changes how anything looks. */
(function (root) {
    'use strict';
    const doc = document;
    let t = 0;
    function pass() {
        doc.querySelectorAll('[data-act]:not(button):not(a):not(input):not(select):not(textarea):not([role]),.fchip:not([role]),.tap:not(button):not([role])').forEach(el => { el.setAttribute('role', 'button'); if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
        doc.querySelectorAll('.seg button, .days-chips button, .wz-chip[data-wk]').forEach(b => b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false'));
        doc.querySelectorAll('.nav-item').forEach(n => { if (n.classList.contains('active')) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current'); });
        doc.querySelectorAll('input:not([aria-label]):not([type=hidden]), textarea:not([aria-label]), select:not([aria-label])').forEach(i => { if (i.id && doc.querySelector('label[for="' + i.id + '"]')) return; if (i.closest('label')) return; const l = i.placeholder || i.title || (i.dataset && i.dataset.pref) || ''; if (l) i.setAttribute('aria-label', l); });
        doc.querySelectorAll('button:not([aria-label])').forEach(b => { if (!b.textContent.trim() && b.title) b.setAttribute('aria-label', b.title); });
        const sh = doc.getElementById('sheet'); if (sh) { sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); const h = sh.querySelector('h2'); if (h) sh.setAttribute('aria-label', h.textContent); }
        const to = doc.getElementById('toast'); if (to) { to.setAttribute('role', 'status'); to.setAttribute('aria-live', 'polite'); }
        doc.querySelectorAll('.gc-bubble').forEach(b => { b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite'); });
        doc.querySelectorAll('svg:not([aria-hidden]):not([role])').forEach(s => { if (!s.querySelector('title')) s.setAttribute('aria-hidden', 'true'); });
    }
    const later = () => { clearTimeout(t); t = setTimeout(pass, 180); };
    new MutationObserver(later).observe(doc.body || doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    doc.addEventListener('keydown', e => {
        const el = e.target;
        if ((e.key === 'Enter' || e.key === ' ') && el && el.getAttribute && el.getAttribute('role') === 'button' && el.tagName !== 'BUTTON') { e.preventDefault(); el.click(); }
        if (e.key === 'Escape') { const bg = doc.getElementById('sheet-bg'); if (bg && bg.classList.contains('show')) { const c = doc.querySelector('#sheet [data-act="close"], #sheet [data-r="0"]'); if (c) c.click(); } }
    });
    later();
    root.GA11y = { pass };
})(window);
