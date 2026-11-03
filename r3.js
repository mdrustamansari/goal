/* R3: release-3 helpers shared by Goal and Budget.
   1. Enter moves to the next box in a sheet, and on the last box it presses the main button.
   2. Number boxes select their text when tapped, so typing replaces the old number.
   3. A safety copy of your data is kept on the phone each week (the last two are kept).
   API: R3.init({ name, evKey, app, v })  R3.autoInfo()  R3.autoGet() */
(function (root) {
    'use strict';
    const R3 = root.R3 = { cfg: null };
    const BOX = 'input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([disabled]), select:not([disabled]), textarea:not([disabled])';
    const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

    // keyboard hints: "next" on every box but the last, "done" on the last one
    function hints(box) {
        const list = [...box.querySelectorAll(BOX)].filter(vis).filter(e => e.tagName === 'INPUT');
        list.forEach((e, i) => { if (!e.hasAttribute('enterkeyhint')) e.setAttribute('enterkeyhint', i < list.length - 1 ? 'next' : 'done'); });
    }
    const sheetEl = () => document.getElementById('sheet');
    function watch() {
        const s = sheetEl(); if (!s) return;
        new MutationObserver(() => hints(s)).observe(s, { childList: true, subtree: true });
        hints(s);
    }
    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
        const t = e.target, s = sheetEl();
        if (!t || t.tagName !== 'INPUT' || !s || !s.contains(t) || t.type === 'checkbox' || t.dataset.enter === 'own') return;
        const list = [...s.querySelectorAll(BOX)].filter(vis), i = list.indexOf(t);
        if (i < 0) return;
        e.preventDefault();
        if (i < list.length - 1) { const n = list[i + 1]; try { n.focus(); if (n.select && n.type !== 'password') n.select(); } catch (x) {} return; }
        const go = s.querySelector('.modal-actions .btn-primary:not([disabled]), .modal-actions .btn-danger:not([disabled])');
        if (go) { try { t.blur(); } catch (x) {} go.click(); }
    });
    // tapping a number box selects its text
    document.addEventListener('focusin', e => {
        const t = e.target;
        if (t && t.tagName === 'INPUT' && (t.type === 'number' || t.inputMode === 'decimal' || t.inputMode === 'numeric') && t.value) setTimeout(() => { try { t.select(); } catch (x) {} }, 0);
    });

    // ---------- the weekly safety copy
    const WEEK = 7 * 864e5;
    const k1 = () => R3.cfg.name + '_auto1', k2 = () => R3.cfg.name + '_auto2';
    const read = k => { try { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o && Array.isArray(o.events) ? o : null; } catch (e) { return null; } };
    R3.autoInfo = () => { if (!R3.cfg) return null; const a = read(k1()); return a ? { at: a.at, n: a.events.length, older: (read(k2()) || {}).at || null } : null; };
    R3.autoGet = which => R3.cfg && read(which === 2 ? k2() : k1());
    R3.autoNow = () => {
        if (!R3.cfg) return false;
        let evs; try { evs = JSON.parse(localStorage.getItem(R3.cfg.evKey) || '[]'); } catch (e) { return false; }
        if (!Array.isArray(evs) || !evs.length) return false;
        const cur = localStorage.getItem(k1());
        try {
            if (cur) localStorage.setItem(k2(), cur);
            localStorage.setItem(k1(), JSON.stringify({ app: R3.cfg.app, v: R3.cfg.v, at: Date.now(), events: evs }));
            return true;
        } catch (e) { try { localStorage.removeItem(k2()); } catch (x) {} return false; }   // no room: keep the data, skip the copy
    };
    function maybe() {
        if (!R3.cfg) return;
        const a = read(k1()); if (a && Date.now() - a.at < WEEK) return;
        R3.autoNow();
    }
    R3.init = cfg => { R3.cfg = cfg; setTimeout(maybe, 4000); document.addEventListener('visibilitychange', () => { if (!document.hidden) maybe(); }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})(window);
