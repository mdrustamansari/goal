/* The short first-launch wizard, the optional tour, and "ask later" cards. Shared by every app.
   GWizard.config({ app, brand, prefs(), set(k, v), apply(), hasData(), pin(), tour: [[title, text]...], later: [question...] })
   Wizard: name, look, Companion, privacy and comfort, backup time. Everything else is asked later, one small card at a time. */
(function (root) {
    let C = null; const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const DAY = 864e5;
    const GCp = () => (root.GCompanion && root.GCompanion.prefs) || null;
    const store = () => { try { return JSON.parse(localStorage.getItem('gw_' + C.app)) || {}; } catch (e) { return {}; } };
    const save = s => { try { localStorage.setItem('gw_' + C.app, JSON.stringify(s)); } catch (e) {} };
    const chip = (k, v, t, on) => `<button type="button" class="wz-chip${on ? ' on' : ''}" data-wk="${k}" data-wv="${v}" aria-pressed="${!!on}">${t}</button>`;
    const row = (label, chips) => `<div class="wz-q">${label}</div><div class="wz-chips">${chips}</div>`;
    function cur() {
        const P = C.prefs(), g = GCp() ? GCp().get() : {};
        return { P, g, mode: P.follow ? 'follow' : (/d$|^royal|^midnight|^deepocean|^ember|^graphite/.test(P.look || '') ? 'dark' : 'light') };
    }
    const STEPS = [
        () => ({ t: `Welcome to ${esc(C.brand)}`, d: 'Five quick questions. You can change every answer later in Settings.', body: `<label class="wz-field"><span>What should I call you?</span><input id="wz-name" type="text" autocomplete="given-name" maxlength="24" value="${esc(C.prefs().name || '')}" placeholder="Your first name"></label>` }),
        () => { const { P, mode } = cur(); return { t: 'How should it look?', d: 'The frosted glass stays the same on every choice.', body: row('Light or dark', chip('mode', 'light', 'Light', mode === 'light') + chip('mode', 'dark', 'Dark', mode === 'dark') + chip('mode', 'follow', 'Follow my phone', mode === 'follow')) + row('Accent colour', chip('accent', 'sapphire', 'Sapphire', P.accent !== 'gold') + chip('accent', 'gold', 'Champagne gold', P.accent === 'gold')) }; },
        () => { const { g } = cur(); const talk = g.talk >= 26 ? 'chatty' : g.talk <= 10 ? 'quiet' : 'normal'; return { t: 'Your Companion', d: 'A small friendly character that explains things when you tap them.', body: row('Where it lives', chip('place', 'header', 'Header corner', (g.place || 'header') === 'header') + chip('place', 'snap', 'Floating', g.place === 'snap' || g.place === 'free') + chip('place', 'off', 'Hidden', g.place === 'off')) + row('How much it talks', chip('talk', 'quiet', 'Quiet', talk === 'quiet') + chip('talk', 'normal', 'Normal', talk === 'normal') + chip('talk', 'chatty', 'Chatty', talk === 'chatty')) + row('Move away from text', chip('avoid', 'off', 'No', (g.avoid || 'off') === 'off') + chip('avoid', 'gentle', 'Yes, gently', g.avoid === 'gentle' || g.avoid === 'eager')) }; },
        () => { const { P } = cur(); return { t: 'Privacy and comfort', d: 'A PIN can come later. I will ask on day two.', body: row('Hide amounts and names on screen', chip('privacy', '1', 'Hide', !!P.privacy) + chip('privacy', '0', 'Show', !P.privacy)) + row('Lite mode: a cooler phone and less battery', chip('lite', '1', 'Lite', !!P.lite) + chip('lite', '0', 'Full', !P.lite)) }; },
        () => { const { P } = cur(); const h = P.remindHour == null ? 21 : P.remindHour; return { t: 'Backup reminder', d: 'Your data stays on this phone. A nightly nudge keeps a safe copy.', body: row('Remind me', chip('remindOn', '1', 'Yes', P.remindOn !== false) + chip('remindOn', '0', 'No', P.remindOn === false)) + row('At about', [20, 21, 22, 23].map(x => chip('remindHour', x, (x - 12) + ' pm', h === x)).join('')) }; }
    ];
    let step = 0, phase = 'wiz', tourI = 0, replay = false;
    function ensure() { let el = $('wiz'); if (!el) { el = document.createElement('div'); el.id = 'wiz'; el.className = 'wiz'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); } return el; }
    function paint(dir) {
        const el = ensure(); let t, d, body, last = false, n, i;
        if (phase === 'wiz') { const s = STEPS[step](); t = s.t; d = s.d; body = s.body; n = STEPS.length; i = step; last = step === n - 1; }
        else if (phase === 'ask') { t = 'Want a 30-second tour?'; d = 'It shows the small tricks that save time. You can replay it any time from Settings.'; body = ''; n = 0; }
        else { const c = C.tour[tourI]; t = c[0]; d = c[1]; body = ''; n = C.tour.length; i = tourI; last = tourI === n - 1; }
        const dots = n ? `<div class="wz-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>` : '';
        let btns;
        if (phase === 'ask') btns = `<button type="button" class="wz-btn" data-wa="skiptour">Not now</button><button type="button" class="wz-btn wz-go" data-wa="starttour">Show me</button>`;
        else btns = `${(phase === 'wiz' ? step > 0 : tourI > 0) ? '<button type="button" class="wz-btn" data-wa="back">Back</button>' : '<span></span>'}<button type="button" class="wz-btn wz-go" data-wa="next">${last ? (phase === 'wiz' ? (replay ? 'Save' : 'Done') : 'Finish') : 'Next'}</button>`;
        el.innerHTML = `<div class="wz-card ${dir || ''}"><div class="wz-top">${dots}<button type="button" class="wz-skip" data-wa="close">${phase === 'wiz' && !replay ? 'Skip setup' : 'Close'}</button></div><h2>${t}</h2><p class="wz-d">${d}</p>${body}<div class="wz-btns">${btns}</div></div>`;
        const inp = el.querySelector('#wz-name'); if (inp && !replay) setTimeout(() => inp.focus(), 250);
    }
    function pick(k, v) {
        const P = C.prefs();
        if (k === 'mode') { if (v === 'follow') C.set('follow', true); else { C.set('follow', false); C.set('look', v === 'dark' ? 'flagshipd' : 'flagship'); } C.apply(); }
        else if (k === 'accent') { C.set('accent', v); C.apply(); }
        else if (k === 'place' || k === 'avoid') { if (GCp()) GCp().set({ [k]: v }); }
        else if (k === 'talk') { if (GCp()) GCp().set({ talk: v === 'quiet' ? 8 : v === 'chatty' ? 30 : 19 }); }
        else if (k === 'privacy' || k === 'lite' || k === 'remindOn') { C.set(k, v === '1'); C.apply(); }
        else if (k === 'remindHour') C.set('remindHour', +v);
    }
    function finish(done) {
        const el = $('wiz'); if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 350); }
        const s = store(); if (!s.t0) s.t0 = Date.now(); s.wiz = true; save(s); if (done !== false) C.set('wizDone', true);
        C.apply(); if (C.render) C.render();
    }
    function start(o) { replay = !!(o && o.replay); step = 0; phase = 'wiz'; tourI = 0; paint(); }
    function tour() { replay = true; phase = 'tour'; tourI = 0; paint(); }
    document.addEventListener('click', ev => {
        const t = ev.target; if (!C || !t.closest) return;
        const ch = t.closest('.wz-chip[data-wk]'); if (ch) { const k = ch.dataset.wk; pick(k, ch.dataset.wv); ch.parentElement.querySelectorAll('.wz-chip').forEach(x => { x.classList.toggle('on', x === ch); x.setAttribute('aria-pressed', x === ch); }); return; }
        const b = t.closest('[data-wa]'); if (b) {
            const a = b.dataset.wa, nm = $('wz-name');
            if (nm && phase === 'wiz') { const v = nm.value.trim(); if (v) C.set('name', v); }
            if (a === 'close') { finish(); return; }
            if (a === 'back') { if (phase === 'wiz') step--; else tourI--; paint('back'); return; }
            if (a === 'next') {
                if (phase === 'wiz') { if (step < STEPS.length - 1) { step++; paint(); } else if (replay) finish(); else { phase = 'ask'; C.apply(); paint(); } }
                else { if (tourI < C.tour.length - 1) { tourI++; paint(); } else finish(); }
                return;
            }
            if (a === 'starttour') { phase = 'tour'; tourI = 0; paint(); return; }
            if (a === 'skiptour') { finish(); return; }
        }
        const ac = t.closest('[data-wrun]'); if (ac) { if (ac.dataset.wrun === 'setup') start({ replay: true }); else tour(); return; }
        const q = t.closest('[data-qid]'); if (q) answer(q.dataset.qid, q.dataset.qv);
    });
    /* ---- ask-later cards ---- */
    function due() {
        if (!C || !C.later) return null; const s = store(); if (!s.t0) return null;
        const now = Date.now(), days = (now - s.t0) / DAY;
        return C.later.find(q => !(s.done || {})[q.id] && days >= q.after && !((s.snooze || {})[q.id] > now) && (!q.when || q.when())) || null;
    }
    function laterHTML() {
        const q = due(); if (!q) return '';
        return `<div class="card ask-card" data-sec="none"><div class="wz-q">Quick question</div><p>${esc(q.text)}</p><div class="wz-chips">${q.opts.map(o => `<button type="button" class="wz-chip" data-qid="${q.id}" data-qv="${esc(o[0])}">${esc(o[1])}</button>`).join('')}<button type="button" class="wz-chip wz-later" data-qid="${q.id}" data-qv="__later">Later</button></div></div>`;
    }
    function answer(id, v) {
        const q = (C.later || []).find(x => x.id === id); if (!q) return; const s = store(); s.done = s.done || {}; s.snooze = s.snooze || {};
        if (v === '__later') s.snooze[id] = Date.now() + 3 * DAY; else { s.done[id] = 1; }
        save(s); if (v !== '__later') q.apply(v); C.apply(); if (C.render) C.render();
    }
    function config(c) {
        C = c; const s = store();
        if (!s.t0) { s.t0 = Date.now(); save(s); }
        if (!c.prefs().wizDone) {
            if (c.hasData()) { c.set('wizDone', true); s.wiz = true; save(s); }   // existing users never see the wizard
            else setTimeout(() => { if (!c.prefs().wizDone) start({}); }, c.prefs().introOn === false ? 400 : 3800);
        }
    }
    root.GWizard = { config, laterHTML, tour, start };
})(typeof window !== 'undefined' ? window : this);
