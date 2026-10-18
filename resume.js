/* GResume: reopen where you left off, and detect a weak phone. Shared by all apps. */
(function (root) {
    'use strict';
    const safe = f => { try { return f(); } catch (e) { return undefined; } };
    let key = 'g_resume', screens = [], getS = null, setS = null, timer = 0;
    function save() {
        if (!getS) return;
        safe(() => localStorage.setItem(key, JSON.stringify({ s: getS(), y: Math.round(root.scrollY || 0), t: Date.now() })));
    }
    function init(o) {
        key = o.key; screens = o.screens; getS = o.get; setS = o.set;
        const r = safe(() => JSON.parse(localStorage.getItem(key) || 'null'));
        // Reopen within 6 hours only; after that start fresh on Today.
        if (r && screens.indexOf(r.s) >= 0 && Date.now() - r.t < 6 * 3600e3) { setS(r.s); return r.y || 0; }
        return 0;
    }
    function restoreScroll(y) { if (y > 0) requestAnimationFrame(() => requestAnimationFrame(() => root.scrollTo(0, y))); }
    root.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(save, 400); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    root.addEventListener('pagehide', save);
    // A phone that is probably weak: little memory, few cores or Battery Saver (reduced motion hint).
    function weakPhone() {
        const n = root.navigator || {};
        return (n.deviceMemory && n.deviceMemory <= 3) || (n.hardwareConcurrency && n.hardwareConcurrency <= 4);
    }
    root.GResume = { init, save, restoreScroll, weakPhone };
})(window);
