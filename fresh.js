/* GFresh: screens refresh only when you look at them, never on a clock tick.
   - When you come back to the app (or it comes back to the front) it refreshes only if the hour or day has changed,
     or you have been away more than 10 minutes.
   - While you are looking at it, ONE timer waits for the next full hour (greetings, "today" figures) and nothing else.
   - While the app is hidden or the phone is locked there is no timer at all.
   - If a sheet or the lock screen is open at that moment, the refresh waits until you close it.
   Shared by every app. */
(function (root) {
    'use strict';
    let cfg = null, lastKey = '', lastAt = 0, timer = 0, stale = false;
    const key = () => { const d = new Date(); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate() + '-' + d.getHours(); };
    const busy = () => !!(cfg && cfg.busy && cfg.busy());
    function arm() {
        clearTimeout(timer); timer = 0; if (document.hidden || !cfg) return;
        const n = new Date(), next = new Date(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours() + 1, 0, 2).getTime();
        timer = setTimeout(() => { timer = 0; check(); }, Math.max(1000, next - Date.now()));
    }
    function check() {
        if (!cfg || document.hidden) return;
        if (busy()) { stale = true; arm(); return; }
        if (stale || key() !== lastKey || Date.now() - lastAt > 10 * 60000) { stale = false; touch(); try { cfg.render(); } catch (e) {} }
        arm();
    }
    function touch() { lastKey = key(); lastAt = Date.now(); }
    function afterBusy() { if (stale && !busy()) check(); }
    function init(c) {
        cfg = c; touch();
        document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(timer); timer = 0; } else check(); });
        root.addEventListener('pageshow', check); root.addEventListener('focus', check);
        arm();
    }
    root.GFresh = { init, touch, afterBusy, check };
})(window);
