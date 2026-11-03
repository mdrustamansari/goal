/* GOrb: the one floating button. A soft, shape-shifting glass blob at the bottom right that always offers the best next step.
   It hides while you do anything else (a sheet, the keyboard, the lock, Settings, scrolling down) and returns when you scroll up.
   The app gives it a pick() that returns { icon, label, act, id } or null. The orb is a real button with data-act, so the app's own click handler does the work.
   API: GOrb.init({ pick, hide })   GOrb.refresh() */
(function (root) {
    'use strict';
    const IC = {
        plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', check: '<path d="M20 6 9 17l-5-5"/>', play: '<path d="M6 4l14 8-14 8z"/>',
        moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
        wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v3"/><path d="M3 5v14a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M21 12v4h-4a2 2 0 0 1 0-4Z"/>'
    };
    let cfg = null, orb = null, tag = null, cur = '', tagT = null, scrolledAway = false, lastY = 0, timer = null;
    const svg = k => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || IC.plus}</svg>`;
    function showTag(ms) { if (!tag) return; tag.classList.add('on'); clearTimeout(tagT); tagT = setTimeout(() => tag.classList.remove('on'), ms || 2200); }
    function busy() {
        const bg = document.getElementById('sheet-bg'), lk = document.getElementById('lock'), a = document.activeElement;
        if (bg && bg.classList.contains('show')) return true;
        if (document.querySelector('.wz-bg')) return true;
        const sp = document.getElementById('splash'); if (sp && sp.classList.contains('show')) return true;
        if (lk && lk.classList.contains('show')) return true;
        if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox' && a.type !== 'range') return true;
        const vv = root.visualViewport; if (vv && vv.height < root.innerHeight - 140) return true;
        return !!(cfg.hide && cfg.hide());
    }
    function refresh() {
        if (!cfg || !orb) return;
        let p = null; try { p = cfg.pick(); } catch (e) {}
        if (!p) { orb.classList.add('off'); return; }
        const key = p.icon + '|' + p.label + '|' + p.act + '|' + (p.id || '');
        orb.dataset.act = p.act; if (p.id !== undefined && p.id !== null) orb.dataset.id = p.id; else delete orb.dataset.id;
        orb.setAttribute('aria-label', p.label);
        if (key !== cur) {
            const first = !cur; cur = key;
            orb.innerHTML = svg(p.icon); tag.textContent = p.label;
            if (!first) { orb.classList.remove('squash'); void orb.offsetWidth; orb.classList.add('squash'); }
            showTag(first ? 3000 : 2200);
        }
        orb.classList.toggle('off', busy() || scrolledAway);
        if (orb.classList.contains('off')) tag.classList.remove('on');
    }
    function init(c) {
        cfg = c; if (orb) return;
        orb = document.createElement('button'); orb.type = 'button'; orb.id = 'gorb'; orb.className = 'gorb off';
        tag = document.createElement('div'); tag.id = 'gorb-tag'; tag.className = 'gorb-tag'; tag.setAttribute('aria-hidden', 'true');
        document.body.appendChild(tag); document.body.appendChild(orb);
        let lp = null;   // a long press shows the word again
        orb.addEventListener('pointerdown', () => { lp = setTimeout(() => showTag(2200), 450); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => orb.addEventListener(e, () => clearTimeout(lp)));
        addEventListener('scroll', () => {
            const y = root.scrollY || 0, d = y - lastY; lastY = y;
            const away = Math.abs(d) > 250 ? false : y > 90 && d > 6 ? true : d < -6 || y <= 90 ? false : scrolledAway;
            if (away !== scrolledAway) { scrolledAway = away; refresh(); }
        }, { passive: true });
        ['focusin', 'focusout', 'resize'].forEach(e => addEventListener(e, () => setTimeout(refresh, 80)));
        if (root.visualViewport) root.visualViewport.addEventListener('resize', () => setTimeout(refresh, 40));
        timer = setInterval(refresh, 1200);   // catches sheets opening and closing
        refresh();
    }
    root.GOrb = { init, refresh };
})(window);
