/* GSwipe: swipe or long-press a row that has icon buttons. Shared by all apps.
   Swipe left = the row's red (delete) button. Swipe right = its other (edit) button.
   Long-press = edit. Delete still asks for confirmation, so nothing is lost by accident. */
(function (root) {
    'use strict';
    const ROW = '.ledger-row, .hl-row, .ol-row';
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    let row = null, x0 = 0, y0 = 0, dx = 0, mode = '', lp = 0, fired = false;
    const btns = r => ({ del: r.querySelector('.ico-btn.ico-del'), ed: r.querySelector('.ico-btn:not(.ico-del)') });
    const buzz = n => { try { root.GFeel && GFeel.buzz(n); } catch (e) {} };
    function reset(animate) {
        if (!row) return; const r = row; row = null;
        r.style.transition = animate && !reduced() ? 'transform .2s cubic-bezier(.2,.8,.25,1)' : 'none';
        r.style.transform = ''; r.style.boxShadow = '';
    }
    document.addEventListener('touchstart', e => {
        const r = e.target.closest && e.target.closest(ROW);
        if (!r || r.classList.contains('led-edit') || e.touches.length !== 1) return;
        if (e.target.closest('input,select,textarea,button,.grip')) return;
        const b = btns(r); if (!b.del && !b.ed) return;
        row = r; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; mode = ''; fired = false;
        r.style.transition = 'none';
        clearTimeout(lp);
        if (b.ed) lp = setTimeout(() => { if (row === r && mode === '') { fired = true; buzz('tick'); const c = r; reset(true); b.ed.click(); } }, 520);
    }, { passive: true });
    document.addEventListener('touchmove', e => {
        if (!row || fired) return;
        const t = e.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
        if (mode === '') {
            if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
            clearTimeout(lp);
            mode = Math.abs(mx) > Math.abs(my) * 1.4 ? 'h' : 'v';
        }
        if (mode !== 'h') return;
        const b = btns(row); dx = Math.max(b.ed ? -0 : 0, 0) || mx;
        dx = mx; if (dx < 0 && !b.del) dx = 0; if (dx > 0 && !b.ed) dx = 0;
        const lim = 110, d = Math.max(-lim, Math.min(lim, dx));
        row.style.transform = 'translateX(' + d * 0.8 + 'px)';
        const hot = Math.abs(d) > 70;
        row.style.boxShadow = d < 0 ? 'inset -4px 0 0 rgba(210,59,52,' + (hot ? .8 : .35) + ')' : d > 0 ? 'inset 4px 0 0 rgba(47,111,237,' + (hot ? .8 : .35) + ')' : '';
    }, { passive: true });
    function end() {
        clearTimeout(lp); if (!row) return;
        const r = row, d = dx, b = btns(r), was = mode, f = fired; reset(true);
        if (f || was !== 'h') return;
        if (d < -70 && b.del) { buzz('tick'); b.del.click(); }
        else if (d > 70 && b.ed) { buzz('tick'); b.ed.click(); }
    }
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', () => { clearTimeout(lp); reset(true); }, { passive: true });

    /* ---- Swipe left or right anywhere (except on rows, sliders, inputs and sideways-scrolling strips) to change tab ---- */
    let tx = 0, ty = 0, tt = 0, tOK = false, tsT = 0;
    const noTab = t => {
        if (!t || !t.closest) return true;
        if (t.closest('input,select,textarea,[type=range],#sheet,.lock.show,.wiz,[data-no-tabswipe]')) return true;
        if (document.getElementById('sheet-bg') && document.getElementById('sheet-bg').classList.contains('show')) return true;
        const r = t.closest(ROW); if (r && r.querySelector('.ico-btn')) return true;
        for (let e = t; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 4) return true; }
        return false;
    };
    document.addEventListener('touchstart', e => {
        tOK = false; if (e.touches.length !== 1) return;
        const t = e.touches[0]; const w = root.innerWidth || 400;
        if (t.clientX < 24 || t.clientX > w - 24) return;           // leave the phone's own back-swipe edge alone
        if (noTab(e.target)) return;
        tx = t.clientX; ty = t.clientY; tt = Date.now(); tOK = true;
    }, { passive: true });
    document.addEventListener('touchend', e => {
        if (!tOK) return; tOK = false;
        const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
        if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2 || Date.now() - tt > 700) return;
        if (row) return;                                              // a row swipe was in progress
        const tabs = [].slice.call(document.querySelectorAll('.nav-item'));
        const i = tabs.findIndex(n => n.classList.contains('active')), j = i + (dx < 0 ? 1 : -1);
        if (i < 0 || j < 0 || j >= tabs.length) return;
        buzz('turn');
        // Slide the new screen in with a transform only. An opacity animation (or a second animation on top of the
        // screen's own fade) switches the frosted glass off for a moment, which looked like jitter.
        const H = document.documentElement;
        if (!reduced()) { H.dataset.tsw = dx < 0 ? 'l' : 'r'; }   // stays on until the next tap on a tab: taking it away at once would start the screen's fade again, which was the blink
        tabs[j].click();
    }, { passive: true });
    // a tap on a tab brings the soft fade back (it is cleared before the screen changes, so nothing restarts)
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.nav-item') && e.isTrusted) delete document.documentElement.dataset.tsw; }, true);
    // Stop the phone's long-press text menu on these rows.
    const st = document.createElement('style'); st.textContent = '.ledger-row:has(.ico-btn), .hl-row { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; touch-action: pan-y; } .ledger-row:has(.ico-btn) input, .hl-row input { -webkit-user-select: text; user-select: text; }';
    document.head.appendChild(st);
    root.GSwipe = { version: 1 };
})(window);
