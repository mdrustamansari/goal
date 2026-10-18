/* Rustam's Goal Manager: screens, storage, security. The commitment rules live in engine.js. */
(function () {
    'use strict';
    const E = window.GEngine;
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAY = E.DAY;
    const $ = id => document.getElementById(id);
    // a screen is only rebuilt when what it shows has really changed: no needless repaint (and no re-blur of the glass) on the quiet minute refresh
    function put(el, h) { if (el.__h === h && el.firstChild) return false; el.__h = h; el.innerHTML = h; if (window.GSections) GSections.apply(el); return true; }
    const fmt = n => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    const fmt2 = n => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const money = n => (n < 0 ? '-' : '') + '₹' + fmt(Math.abs(Math.round(n)));
    const mh = n => `<span class="priv">${money(n)}</span>`;
    const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    const fmtDay = ts => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const fmtDT = ts => new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const fx = n => { try { if (window.GFeel) GFeel.moment(n); } catch (e) {} };
    const vibrate = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
    const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
    const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

    /* ---------- Storage: one event log + preferences ---------- */
    const K_EV = 'gl_events', K_PREF = 'gl_prefs', K_PIN = 'gl_pin', K_BG = 'gl_bg';
    const PREF_DEFAULT = () => ({
        theme: 'auto', bgBlur: 0, glassBlur: 20,
        introOn: true, greetOn: true, lineOn: true, smartOn: true, animOn: true, lossOn: true, gainOn: true,
        remindOn: true, remindHour: 21, remindSnooze: null, lastBackup: null,
        lite: false, privacy: false, ageOn: false, autoLock: true, rememberPass: false, pass: '',
        look: 'flagship', accent: 'sapphire', glow: false, flFont: 'system', follow: true, lastLight: null, lastDark: null, p: {}, acc: [], defDays: {}, open: [], orbMode: 'header', learnOn: true
    });
    let events = [], prefs = PREF_DEFAULT(), nextId = 1, D = null, screen = 'today', storageOK = true;

    function persist() {
        storageOK = save(K_EV, events) && save(K_PREF, prefs);
        if (!storageOK) toast('Could not save: the phone storage may be full');
    }
    function add(e, ts) {
        e.id = nextId++; e.ts = ts || Date.now();
        events.push(e); persist(); return e;
    }
    function setEvents(list) {
        events = list.map(e => Object.assign({}, e));
        nextId = events.reduce((m, e) => Math.max(m, e.id || 0), 0) + 1;
        events.forEach(e => { if (!e.id) e.id = nextId++; });
    }

    function initStore() {
        const ev = load(K_EV), pf = load(K_PREF);
        if (pf && typeof pf === 'object') prefs = Object.assign(PREF_DEFAULT(), pf);
        // v5.16: the Flagship theme becomes the default once. An untouched Paper look moves to it; a customised Paper page stays.
        if (!prefs.flagshipV) { prefs.flagshipV = 1; if (pf && (pf.look === 'paper' || !pf.look) && !(pf.p && Object.keys(pf.p).length)) prefs.look = 'flagship'; try { localStorage.setItem(K_PREF, JSON.stringify(prefs)); } catch (e) {} }
        if (Array.isArray(ev)) setEvents(ev);
    }

    /* ---------- Themes ---------- */
    const THEMES = {
        sky: { label: 'Sky', part: 'Morning', mL: '#e3f5ff', mD: '#0a1322' },
        marigold: { label: 'Marigold', part: 'Afternoon', mL: '#fff6d6', mD: '#1a1305' },
        sunflower: { label: 'Sunflower', part: '', mL: '#fffbd0', mD: '#161305' },
        dusk: { label: 'Dusk', part: 'Evening', mL: '#efeafd', mD: '#0f0b22' },
        forest: { label: 'Parrot', part: '', mL: '#f1f8d8', mD: '#0c1405' }
    };
    function themeId() {
        if (THEMES[prefs.theme]) return prefs.theme;
        const h = new Date().getHours();
        return h >= 5 && h < 12 ? 'sky' : (h >= 12 && h < 17 ? 'marigold' : 'dusk');
    }
    function applyTheme() {
        const id = themeId(), root = document.documentElement;
        root.setAttribute('data-theme', id);
        const fx = GLook.FIXED[prefs.look], base = !fx ? null : ({ flagship: prefs.accent === 'gold' ? '#f7f6f2' : '#f6f7fa', flagshipd: prefs.accent === 'gold' ? '#18181a' : '#17191d', royal: '#0e0b17', midnight: '#07130e', deepocean: '#04121f', ember: '#170c0b', graphite: '#131415' })[prefs.look];
        document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', base || THEMES[id].mL));
                root.classList.toggle('lite', !!prefs.lite);
        root.classList.toggle('pm', !!prefs.privacy);
        root.style.setProperty('--glass-blur', prefs.glassBlur + 'px');
        applyBackground();
        try { GLook.apply(prefs, { hasBg: root.classList.contains('has-bg'), lite: !!prefs.lite }); } catch (e) {} if (window.GLiquid) GLiquid.apply();
    }
    // "Follow my phone": only when the phone changes (or on switching it on, or at start) do we go to the last light or last dark theme used
    function phoneDark() { try { return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { return false; } }
    function followNow() {
        if (!prefs.follow) return; GLook.remember(prefs);
        const t = GLook.followTarget(prefs, phoneDark()); if (t !== prefs.look) { prefs.look = t; persist(); applyTheme(); if (typeof render === 'function' && D) render(); }
    }
    const hex2rgb = h => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const mixRGB = (x, y, t) => x.map((v, i) => Math.round(v + (y[i] - v) * t));
    const rgb = (c, a) => a === undefined ? `rgb(${c.join(',')})` : `rgba(${c.join(',')},${a})`;
    function statusGrad(ratio) {
        let a = [31, 184, 245], b = [26, 100, 255], w = [224, 69, 63];
        try {
            const cs = getComputedStyle(document.documentElement), g = n => String(cs.getPropertyValue(n) || '').trim();
            if (/^#/.test(g('--blue-a'))) a = hex2rgb(g('--blue-a'));
            if (/^#/.test(g('--blue-b'))) b = hex2rgb(g('--blue-b'));
            if (/^#/.test(g('--warning'))) w = hex2rgb(g('--warning'));
        } catch (e) {}
        const t = Math.max(0, Math.min(1, (ratio - 0.5) / 0.5));
        const g1 = mixRGB(a, w, t), g2 = mixRGB(b, w, t);
        return { g1, g2, mid: mixRGB(g1, g2, 0.5) };
    }
    function applyBackground() {
        let data = null; try { data = localStorage.getItem(K_BG); } catch (e) {}
        const el = $('bg-layer'), root = document.documentElement;
        if (data) { el.style.backgroundImage = `url("${data}")`; root.classList.add('has-bg'); }
        else { el.style.backgroundImage = ''; root.classList.remove('has-bg'); }
    }
    function processWallpaper(file) {
        const url = URL.createObjectURL(file), img = new Image();
        img.onload = () => {
            let ok = false;
            for (const [max, q] of [[720, 0.75], [480, 0.65]]) {
                const sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                try { localStorage.setItem(K_BG, c.toDataURL('image/jpeg', q)); ok = true; break; } catch (e) {}
            }
            URL.revokeObjectURL(url);
            if (ok) { applyBackground(); render(); toast('Background set'); } else toast('Could not save that photo');
        };
        img.onerror = () => { URL.revokeObjectURL(url); toast('Could not read that image'); };
        img.src = url;
    }

    /* ---------- Toast and sheets ---------- */
    function toast(msg, undo) {
        if (window.GCompanion && typeof GC !== 'undefined' && GC && GC.respond && GCompanion.prefs.get().place !== 'off') { GC.respond(msg, { undo, tone: /^(Locked|Wrong|Enter|Could not|Too many|That is|That date)/i.test(msg) ? 'bad' : '' }); return; }
        const t = $('toast');
        t.innerHTML = `<span>${esc(msg)}</span>` + (undo ? '<button class="mini-btn" data-act="toast-undo">Undo</button>' : '');
        t.classList.toggle('act', !!undo);
        t._undo = undo || null;
        t.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.classList.remove('show'), undo ? 6000 : 2600);
    }
    let sheetCloser = null;
    function sheet(html, onMount, opts) {
        const bg = $('sheet-bg'), box = $('sheet');
        box.innerHTML = html;
        bg.classList.add('show');
        box.scrollTop = 0;
        sheetCloser = (opts && opts.onClose) || null;
        if (onMount) onMount(box);
        const first = box.querySelector('[autofocus]'); if (first && !(opts && opts.noFocus)) setTimeout(() => { try { first.focus(); } catch (e) {} }, 60);
    }
    function closeSheet() { $('sheet-bg').classList.remove('show'); const f = sheetCloser; sheetCloser = null; if (f) f(); }
    // Icon-only Edit (Lucide square-pen) and Delete (Lucide trash-2): same size, tooltip and spoken label
    const ICO = { edit: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>', del: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>' };
    const icoBtn = (kind, attrs, what) => `<button type="button" class="ico-btn ico-${kind}" ${attrs} title="${kind === 'edit' ? 'Edit' : 'Delete'}" aria-label="${kind === 'edit' ? 'Edit' : 'Delete'} ${what}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[kind]}</svg></button>`;
    function confirmSheet(o) {
        if (o.danger && window.GFeel) GFeel.buzz('stop');
        return new Promise(res => {
            sheet(`<h2>${esc(o.title)}</h2><p>${esc(o.sub || '')}</p><div class="modal-actions"><button class="btn-secondary" data-r="0">${esc(o.cancel || 'Cancel')}</button><button class="${o.danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${esc(o.ok || 'OK')}</button></div>`, box => {
                box.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { sheetCloser = null; closeSheet(); res(b.dataset.r === '1'); });
            }, { onClose: () => res(false) });
        });
    }
    const val = (box, sel) => { const el = box.querySelector(sel); return el ? el.value : ''; };
    const numv = (box, sel) => { const v = parseFloat(val(box, sel)); return isFinite(v) ? v : NaN; };

    /* ---------- Daily lines: time, commitment, recovery ---------- */
    const LINES = {
        general: [
            ['Haba na haba hujaza kibaba: little by little fills the measure.', 'Swahili proverb'],
            ['Well begun is half done.', 'Proverb'],
            ['A journey of a thousand miles begins with a single step.', 'Proverb'],
            ['Little strokes fell great oaks.', 'Proverb'],
            ['Drop by drop the pot is filled.', 'Proverb'],
            ['Do the hard thing first; the rest of the day is lighter.', 'Tip'],
            ['A page a day is a book in a season.', 'Tip'],
            ['Small, steady pages beat rare, heroic weekends.', 'Tip'],
            ['Protect the first hour. Everything else can bend around it.', 'Tip'],
            ['What you finish early becomes time you own.', 'Tip']
        ],
        behind: [
            ['Kal kare so aaj kar, aaj kare so ab: what you plan for tomorrow, do today; what you plan for today, do now.', 'After Kabir'],
            ['Procrastination is the thief of time.', 'Proverb'],
            ['Time and tide wait for no one.', 'Proverb'],
            ['Do not put off till tomorrow what can be done today.', 'Proverb'],
            ['The debt grows quietly. Pay a little of it now.', 'Tip'],
            ['You are not behind forever. You are behind until the next page.', 'Tip'],
            ['One focused hour today lowers the pile tomorrow.', 'Tip']
        ],
        ahead: [
            ['Early work buys quiet years.', 'Tip'],
            ['Every page banked is a day you will not have to borrow.', 'Tip'],
            ['This is how a peaceful final year is built.', 'Tip'],
            ['Steady and early: the best kind of ahead.', 'Tip']
        ]
    };
    let lineBump = 0;
    function lineContext() {
        if (!D.cfg) return 'general';
        if ((D.thesis && D.thesis.lost > 0) || D.tasks.some(t => t.status === 'behind') || (D.pieces && D.pieces.open.some(p => p.status === 'late'))) return 'behind';
        if ((D.thesis && D.thesis.gained > 0) || D.tasks.some(t => t.status === 'ahead')) return 'ahead';
        return 'general';
    }
    function pickLine() {
        const now = new Date(), doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000), n = doy + lineBump;
        const pool = LINES[lineContext()];
        return pool[((n % pool.length) + pool.length) % pool.length];
    }
    const greeting = () => { const h = new Date().getHours(); return (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', ' + (prefs.name || 'Rustam'); };
    /* ---------- Security: PIN and encrypted backups (WebCrypto) ---------- */
    const enc = new TextEncoder(), dec = new TextDecoder();
    const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const hasCrypto = () => !!(window.crypto && crypto.subtle);
    async function deriveKey(pass, salt, usage, iters) {
        const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey', 'deriveBits']);
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iters, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, usage);
    }
    async function encryptText(text, pass) {
        const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(pass, salt, ['encrypt'], 200000);
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
        return { app: 'rustams-goals', v: 1, enc: true, kdf: 'PBKDF2-SHA256-200000', salt: b64(salt), iv: b64(iv), data: b64(ct) };
    }
    async function decryptText(obj, pass) {
        const key = await deriveKey(pass, unb64(obj.salt), ['decrypt'], 200000);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(obj.iv) }, key, unb64(obj.data));
        return dec.decode(pt);
    }
    async function pinHash(pin, salt) {
        const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
        return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, base, 256));
    }
    async function setPin(pin) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        save(K_PIN, { salt: b64(salt), hash: await pinHash(pin, salt), len: pin.length });
    }
    async function checkPin(pin) {
        const p = load(K_PIN); if (!p) return true;
        return (await pinHash(pin, unb64(p.salt))) === p.hash;
    }
    const pinOn = () => !!load(K_PIN);

    let lockEntry = '', lockBusy = false, lockFails = 0, lockUntil = 0, lockResolve = null;
    function buildPad(el, onKey, dec) {
        el.innerHTML = ['1','2','3','4','5','6','7','8','9',dec ? '.' : '','0','⌫'].map(k => k === '' ? '<span></span>' : `<button type="button" data-k="${k}">${k}</button>`).join('');
        el.onclick = ev => { const b = ev.target.closest('[data-k]'); if (b) onKey(b.dataset.k); };
    }
    function drawDots() {
        const len = (load(K_PIN) || {}).len || 4;
        $('lock-dots').innerHTML = Array.from({ length: len }, (_, i) => `<i class="${i < lockEntry.length ? 'f' : ''}"></i>`).join('');
    }
    function showLock() {
        if (!pinOn() || !hasCrypto()) return Promise.resolve();
        if ($('lock').classList.contains('show')) return new Promise(r => { const f = lockResolve; lockResolve = () => { if (f) f(); r(); }; });
        lockEntry = ''; $('lock-msg').textContent = ''; drawDots();
        $('lock').classList.add('show');
        buildPad($('lock-pad'), async k => {
            if (lockBusy) return;
            if (Date.now() < lockUntil) { $('lock-msg').textContent = `Wait ${Math.ceil((lockUntil - Date.now()) / 1000)}s`; return; }
            if (k === '⌫') lockEntry = lockEntry.slice(0, -1); else if (lockEntry.length < 8) lockEntry += k;
            drawDots();
            const len = (load(K_PIN) || {}).len || 4;
            if (lockEntry.length >= len) {
                lockBusy = true;
                const ok = await checkPin(lockEntry);
                lockBusy = false;
                if (ok) { lockFails = 0; $('lock').classList.remove('show'); lockEntry = ''; const f = lockResolve; lockResolve = null; if (f) f(); render(); }
                else { lockFails++; lockEntry = ''; drawDots(); vibrate(80); $('lock-msg').textContent = 'Wrong PIN'; if (lockFails >= 5) { lockUntil = Date.now() + 30000; lockFails = 0; $('lock-msg').textContent = 'Too many tries. Wait 30 seconds.'; } }
            }
        });
        return new Promise(r => { lockResolve = r; });
    }

    /* ---------- Backups ---------- */
    function backupObject() {
        const p = Object.assign({}, prefs); delete p.pass;
        return { app: 'rustams-goals', v: 1, exportedAt: new Date().toISOString(), events, prefs: p };
    }
    const backupBase = () => { const d = new Date(); return `goals-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    function markBackedUp() { prefs.lastBackup = Date.now(); prefs.remindSnooze = null; persist(); renderBanner(); if (screen === 'set') render(); }
    async function buildBackupText(pass) {
        const json = JSON.stringify(backupObject());
        if (!pass) return JSON.stringify(JSON.parse(json), null, 1);
        return JSON.stringify(await encryptText(json, pass));
    }
    function downloadText(text, name) {
        const blob = new Blob([text], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
    async function shareText(text, base) {
        let why = 'this browser cannot share files';
        if (navigator.share && typeof File === 'function') {
            for (const [name, type] of [[base + '.txt', 'text/plain'], [base + '.json', 'application/json']]) {
                let file; try { file = new File([text], name, { type }); } catch (e) { continue; }
                try { if (navigator.canShare && !navigator.canShare({ files: [file] })) { why = 'the phone would not accept the file'; continue; } } catch (e) {}
                try { await navigator.share({ files: [file], title: "Rustam's Goal Manager backup" }); return { ok: true }; }
                catch (e) { if (e && e.name === 'AbortError') return { cancelled: true }; why = (e && e.name) || 'an error'; }
            }
        }
        return { ok: false, why };
    }
    async function runBackup(mode, pass) {
        if (mode !== 'plain' && !hasCrypto()) { toast('Encryption needs the https page'); return; }
        const text = await buildBackupText(mode === 'plain' ? '' : pass);
        if (mode === 'download') { downloadText(text, backupBase() + '.json'); markBackedUp(); toast('Saved to your downloads'); return; }
        const r = await shareText(text, backupBase());
        if (r.cancelled) return;
        if (r.ok) { markBackedUp(); toast('Backup shared'); return; }
        downloadText(text, backupBase() + '.json'); markBackedUp();
        toast(`Share sheet could not open (${r.why}). Saved to Downloads; upload it from your Files app.`);
    }
    function backupSheet(mode) {
        const remembered = prefs.rememberPass && prefs.pass;
        if (mode === 'plain') { runBackup('plain'); return; }
        if (remembered && mode !== 'ask') { runBackup(mode || 'share', prefs.pass); return; }
        sheet(`<h2>Encrypted backup</h2><p>Choose a backup password. The file is locked with it, so Google Drive or Proton Drive only ever see scrambled data. Keep it safe: without it nobody can open the file, including you.</p>
            <label class="field"><span>Backup password</span><input type="password" id="bp" autocomplete="new-password" autofocus></label>
            <label class="field check"><input type="checkbox" id="bpr" ${prefs.rememberPass ? 'checked' : ''}><span>Remember it on this phone (faster daily backups)</span></label>
            <div class="error" id="bpe"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="bpgo">Back up</button></div>`, box => {
            box.querySelector('#bpgo').onclick = async () => {
                const p = val(box, '#bp');
                if (p.length < 6) { box.querySelector('#bpe').textContent = 'Use at least 6 characters'; return; }
                prefs.rememberPass = box.querySelector('#bpr').checked; prefs.pass = prefs.rememberPass ? p : ''; persist();
                closeSheet(); await runBackup(mode === 'ask' ? 'share' : (mode || 'share'), p);
            };
        });
    }
    async function restoreFile(file) {
        let text; try { text = await file.text(); } catch (e) { toast('Could not read that file'); return; }
        let obj; try { obj = JSON.parse(text); } catch (e) { toast('That file is not a valid backup'); return; }
        let payload = null;
        if (obj && obj.enc && obj.app === 'rustams-goals') {
            if (!hasCrypto()) { toast('Open this on the https page to decrypt'); return; }
            sheet(`<h2>Backup password</h2><p>This backup is encrypted.</p><label class="field"><span>Password</span><input type="password" id="rp" autofocus></label><div class="error" id="rpe"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="rpgo">Unlock</button></div>`, box => {
                box.querySelector('#rpgo').onclick = async () => {
                    try { payload = JSON.parse(await decryptText(obj, val(box, '#rp'))); } catch (e) { box.querySelector('#rpe').textContent = 'Wrong password, or the file is damaged'; return; }
                    closeSheet(); applyRestore(payload);
                };
            });
        } else if (obj && obj.app === 'rustams-goals' && Array.isArray(obj.events)) applyRestore(obj);
        else toast('That file is not a valid backup');
    }
    async function applyRestore(p) {
        const when = p.exportedAt ? fmtDay(new Date(p.exportedAt).getTime()) : 'an unknown date';
        if (!await confirmSheet({ title: 'Restore backup?', sub: `This replaces everything in the app now with the backup from ${when}.`, ok: 'Restore', danger: true })) return;
        let evs = p.events.slice();
        setEvents(evs);
        if (p.prefs) { const keep = { pass: prefs.pass, rememberPass: prefs.rememberPass }; prefs = Object.assign(PREF_DEFAULT(), p.prefs, keep); }
        persist(); applyTheme(); render(); toast('Backup restored');
    }


    /* ---------- Helpers for this app ---------- */
    const N = n => { const r = Math.round(n * 10) / 10; return r.toLocaleString('en-IN', { maximumFractionDigits: 1 }); };
    const dN = n => plural(Math.round(Math.abs(n)), 'day');
    const keyDate = k => { const p = String(k).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
    const fmtK = k => keyDate(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const fmtDNum = n => fmtK(E.keyOf(n));
    const fmtDNshort = n => keyDate(E.keyOf(n)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const unitIcon = u => ({ pages: '📖', words: '✍️', hours: '⏱️', sessions: '🎯', items: '✔️' })[u] || '✔️';
    const unitWord = (u, n) => (Math.abs(n - 1) < 1e-9 && /s$/.test(u)) ? u.slice(0, -1) : u;
    const todayKey = () => E.localKey(Date.now());
    const slipText = s => s > 0.5 ? `${dN(s)} late` : s < -0.5 ? `${dN(s)} early` : 'on time';
    function statusChip(t) {
        if (t.status === 'done') return '<span class="chip good">Finished</span>';
        if (t.status === 'later') return `<span class="chip">Starts ${fmtDNshort(t.startN)}</span>`;
        if (t.status === 'behind') return `<span class="chip bad">${N(t.behindQty)} ${unitWord(t.unit, t.behindQty)} behind · ${dN(Math.max(1, t.behindDays))}</span>`;
        if (t.status === 'ahead') return `<span class="chip good">${N(t.aheadQty)} ${unitWord(t.unit, t.aheadQty)} ahead · ${dN(Math.max(0.1, t.aheadDays))}</span>`;
        return '<span class="chip">On schedule</span>';
    }
    const projTitle = t => { const p = D.goals.get(t.g.parent); return p ? p.title : 'Standalone'; };

    function renderBanner() {
        const el = $('banner'), h = new Date().getHours(), out = [];
        if (!D.cfg) out.push(`<div class="banner"><span>Set your JRF dates to begin.</span><span class="b-act"><button class="on" data-act="cfg">Set up</button></span></div>`);
        else if (prefs.remindOn && h >= prefs.remindHour && D.tasks.some(t => t.left > 0.05 && t.started && !t.finished)) {
            const n = D.tasks.filter(t => t.left > 0.05 && t.started && !t.finished).length;
            out.push(`<div class="banner"><span>🌙 Evening check: ${plural(n, 'task')} still ${n === 1 ? 'has' : 'have'} work left today.</span><span class="b-act"><button class="on" data-act="to-today">See</button></span></div>`);
        }
        const due = prefs.remindOn && (h >= 22 || h < 4) && !(prefs.lastBackup && Date.now() - prefs.lastBackup < 18 * 3600e3) && !(prefs.remindSnooze && Date.now() < prefs.remindSnooze);
        if (due) out.push(`<div class="banner"><span>🌙 Back up today's progress?</span><span class="b-act"><button data-act="b-later">Later</button><button class="on" data-act="b-now">Back up</button></span></div>`);
        el.innerHTML = out.join('');
    }
    function ringSvg(frac, label) {
        const r = Math.max(0, Math.min(1, frac)), g = statusGrad(0);
        return `<div class="ring"><svg viewBox="0 0 80 80"><circle class="ring-track" cx="40" cy="40" r="36" fill="none" stroke-width="7"/><circle class="ring-arc" cx="40" cy="40" r="36" fill="none" stroke-width="7" stroke-linecap="round" stroke="${rgb(g.mid)}" stroke-dasharray="${(r * 226.2).toFixed(1)} 226.2"/></svg><div class="ring-center"><div class="ring-pct">${Math.round(r * 100)}%</div><div class="ring-cap">${label}</div></div></div>`;
    }

    function taskRow(t, i) {
        const behind = t.status === 'behind', over = behind ? statusGrad(1) : statusGrad(0);
        const doneAll = t.target > 0 && t.left < 0.05, nothing = t.target < 0.05;
        const frac = nothing ? 1 : Math.min(1, t.doneToday / t.target);
        let line = '';
        if (nothing) line = t.aheadQty > 0 ? `Nothing due: you are ${N(t.aheadQty)} ${unitWord(t.unit, t.aheadQty)} ahead` : (t.started ? 'Rest or leave day. Nothing due.' : '');
        else if (doneAll) line = `Done for today · ${N(t.doneToday)} ${t.unit}`;
        else line = t.carried > 0.05 ? `${N(t.fresh)} new + ${N(t.carried)} carried from before` : `${N(t.fresh)} new`;
        if (t.derived && t.next && !nothing && !doneAll) line += ' · Next: ' + itemLabel(t.next);
        const big = nothing ? '0' : N(t.left > 0.05 ? t.left : t.target);
        return `<div class="cat-item2 trow" data-id="${t.id}" data-act="task" style="--i:${i};--g1:${rgb(over.g1)};--g2:${rgb(over.g2)};--glow:${rgb(over.mid, 0.35)}">
            <div class="cat-meta" style="min-width:0"><div class="cat-name"><span class="cat-ico">${unitIcon(t.unit)}</span>${esc(t.g.title)}</div>
            <div class="cat-bar"><div style="width:${frac * 100}%"></div></div></div>
            <div class="cat-spent">${doneAll ? '✓' : big}<span class="hint" style="font-family:var(--font-sans);font-weight:400;font-size:0.8rem"> ${doneAll || nothing ? '' : esc(t.unit)}</span></div>
            <div class="cat-nums" style="opacity:1">${esc(line)}<div style="margin-top:4px">${statusChip(t)} <span class="chip">${esc(projTitle(t))}</span></div></div>
            <button class="add-btn sm" data-act="log" data-id="${t.id}" aria-label="Log progress">+</button></div>`;
    }

    const pathOf = id => { const out = []; let g = D.goals.get(id); while (g) { if (!g.isPhase) out.unshift(g.title); g = g.parent ? D.goals.get(g.parent) : null; } return out.join(' › '); };
    const pctTxt = p => Math.round(p * 100) + '%';
    function timelineHtml() {
        const J = D.jrf, T = D.thesis, tot = J.total;
        const pos = n => Math.max(0, Math.min(100, (n - J.startN) / tot * 100));
        const tgt = pos(J.targetN), today = pos(D.todayN), proj = pos(T.projN);
        const late = T.slip > 0.5;
        return `<div class="tl"><div class="tl-track"><div class="tl-fill" style="width:${today}%"></div><div class="tl-buf" style="left:${tgt}%"></div></div>
            <div class="tl-mark up ${today > 70 ? 'l' : 'r'}" style="left:${today}%"><b>Today</b></div>
            <div class="tl-mark dn ${tgt > 70 ? 'l' : 'c'}" style="left:${tgt}%"><b>Year ${J.target} target</b></div>
            ${(D.tasks.length || P().list.length) && Math.abs(proj - tgt) > 0.4 ? `<div class="tl-mark up ${late ? 'red' : 'green'} ${proj > 70 ? 'l' : 'r'}" style="left:${proj}%;top:18px"><b>At this pace</b></div>` : ''}</div>
            <div class="tl-years">${Array.from({ length: J.years }, (_, i) => `<span>Y${i + 1}</span>`).join('')}</div>`;
    }

    const CATS = ['Marriage', 'Family & children', 'Health', 'Home', 'Learning', 'Other'];
    function ageOn(n) { return D.cfg && D.cfg.birth ? Math.floor((n * 86400000 - Date.UTC(+D.cfg.birth.slice(0, 4), +D.cfg.birth.slice(5, 7) - 1, +D.cfg.birth.slice(8, 10))) / (365.2425 * 86400000)) : null; }
    function renderLife() {
        if (!D.cfg) { $('s-life').innerHTML = '<div class="card"><p class="hint">Set your timeline first (Settings).</p></div>'; return; }
        const J = D.jrf, T = D.thesis; let h = '';
        const purpose = D.cfg.purpose ? esc(D.cfg.purpose) : 'the life beyond the thesis';
        h += `<div class="card" data-sec="life:time"><h3>Time</h3>
            <div class="row"><span class="muted">Since the JRF began</span><b class="num">${dN(J.elapsed)}</b></div>
            <div class="row"><span class="muted">To the year-${J.target} target</span><b class="num">${dN(J.daysToTarget)}</b></div>
            <div class="row"><span class="muted">To the end of the JRF</span><b class="num">${dN(J.daysToEnd)}</b></div>
            ${prefs.ageOn && D.cfg.birth ? `<div class="row"><span class="muted">Your age now · at target · at JRF end</span><b class="num">${ageOn(D.todayN)} · ${ageOn(J.targetN)} · ${ageOn(J.endN)}</b></div>` : ''}</div>`;
        let oc;
        if (T.projects.length && D.tasks.length) {
            if (T.slip > 0.5) oc = `Delay so far has already taken ${dN(T.slip)} from the buffer you set aside for ${purpose}. That is time, not a prediction about any single goal. Marriage and family do not move by the same number of days, but they do share the same limited years.`;
            else if (T.slip < -0.5) oc = `You have banked ${dN(-T.slip)}. That is time that can go to ${purpose}.`;
            else oc = `Your buffer is intact: ${Math.round(T.planned)} days set aside for ${purpose}.`;
        } else oc = `Your plan sets aside ${Math.round(T.planned)} days of the fifth year for ${purpose}.`;
        h += `<div class="card" data-sec="life:what-the-buffer-is-for"><h3>What the buffer is for</h3><p style="font-family:var(--font-serif);font-size:1.15rem;line-height:1.4">${oc}</p><button class="btn-line" data-act="cfg">Edit what my fifth year is for</button></div>`;
        h += `<div class="list-header"><span>Life goals</span><button class="mini-btn" data-act="life-add">Add</button></div>`;
        D.life.forEach(l => {
            h += `<div class="card"><div class="row"><h3 style="margin:0">${esc(l.title)}</h3><span class="chip">${esc(l.cat)}</span></div>
                ${l.notes ? `<p class="tight" style="margin-top:6px">${esc(l.notes)}</p>` : ''}
                ${l.due ? `<div class="hint">Aim: ${fmtK(l.due)} · ${l.daysLeft < 0 ? dN(l.daysLeft) + ' past' : dN(l.daysLeft) + ' to go'}</div>` : ''}
                ${l.ms.map(m => `<label class="ms ${m.done ? 'done' : ''}"><input type="checkbox" data-ms="${m.id}" ${m.done ? 'checked' : ''}><span style="flex:1">${esc(m.title)}</span>${m.due && !m.done ? `<span class="chip ${m.daysLeft < 0 ? 'bad' : ''}">${m.daysLeft < 0 ? dN(m.daysLeft) + ' overdue' : dN(m.daysLeft)}</span>` : ''}</label>`).join('')}
                <div class="grid2 mt"><button class="btn-line" data-act="ms-add" data-id="${l.id}">Add a step</button><button class="btn-line" data-act="life-edit" data-id="${l.id}">Edit</button></div></div>`;
        });
        if (!D.life.length) h += `<div class="card"><p class="hint">Add a goal such as "Family", then small, concrete steps with dates: talk to relatives and friends about meeting someone, a health check-up, visiting a place you want to live. These steps do not wait for the thesis.</p></div>`;
        put($('s-life'), h);
    }

    const sw = (k, t, d) => `<div class="sw-row"><div><div>${t}</div>${d ? `<div class="set-meta">${d}</div>` : ''}</div><label class="switch"><input type="checkbox" data-pref="${k}" ${prefs[k] ? 'checked' : ''}><i></i></label></div>`;
    const slider = (id, l, max, v) => `<div class="bg-row"><span>${l}</span><input type="range" id="${id}" min="0" max="${max}" value="${v}"><b class="bg-val" id="${id}-v">${v}</b></div>`;
    /* ================= Version 3: chapters, pieces and the chain clock ================= */
    const DEFD0 = { skim: 3, scan: 5, intro: 14, review: 40, concl: 14, orient: 5, def: 2, inst: 5, ta: 5, trans: 1, synth: 5, struct: 1, lang: 1, cite: 3, proof: 3 };
    const DEFD_LABEL = [['skim', 'Skim Reading'], ['scan', 'Scan Reading'], ['orient', 'Orientation'], ['def', 'Definition'], ['inst', 'Instances and Ramifications'], ['ta', 'Theoretical Application'], ['trans', 'Concluding lines (transition)'], ['synth', 'Synthesis'], ['intro', 'Introduction chapter, drafting'], ['review', 'Theory and Review chapter, drafting'], ['concl', 'Conclusion chapter, drafting'], ['struct', 'Structural edit, per theme or part'], ['lang', 'Language edit, per theme or part'], ['cite', 'Citations and MLA check'], ['proof', 'Final proofread']];
    const defDays = k => { const v = Number((prefs.defDays || {})[k]); return v > 0 ? v : DEFD0[k]; };
    const nd = (title, children, f) => ({ kind: 'project', title, children: children || [], f: f || {} });
    const pc = (title, days, f) => ({ kind: 'piece', title, f: Object.assign({ pdays: days }, f || {}) });
    function commit(parentId, specs) {
        refresh();
        let n = D.nextGoalId; const out = [];
        const walk = (pid, sp) => { const id = n++; sp.id = id; const g = Object.assign({ id, kind: sp.kind, title: sp.title, parent: pid || null }, sp.f); if (sp.mirrorOf) g.mirror = sp.mirrorOf.id; out.push(g); (sp.children || []).forEach(c => walk(id, c)); };
        specs.forEach(sp => walk(parentId, sp));
        if (out.length) add({ t: 'goal', op: 'addmany', gs: out });
        refresh();
        return out.length;
    }
    const themeSpec = name => nd(name, [pc('Definition', defDays('def')), pc('Instances and Ramifications', defDays('inst')), pc('Theoretical Application', defDays('ta')), pc('Concluding lines: transition to the next theme', defDays('trans'))], { role: 'theme' });
    const mirrors = units => units.map(u => { const m = pc(u.title, 0); m.mirrorOf = u; return m; });
    function chapterSpec(title, type, themes) {
        const reading = nd('Reading', [pc('Skim Reading', defDays('skim')), pc('Scan Reading', defDays('scan'))], { grp: 'reading' });
        let draftKids = [], units = [];
        if (type === 'novel') {
            const o = nd('Part 1: Orientation', [pc('Orientation', defDays('orient'))], { role: 'part' });
            const a = nd('Part 2: Analysis', (themes || []).map(themeSpec), { role: 'analysis' });
            const s = nd('Part 3: Synthesis', [pc('Synthesis', defDays('synth'))], { role: 'part' });
            draftKids = [o, a, s]; units = [o].concat(a.children, [s]);
        } else if (type === 'review') {
            const a = nd('Part 1: Theoretical Framework', [pc('Draft the theoretical framework', Math.ceil(defDays('review') / 2))], { role: 'part' });
            const b = nd('Part 2: Review of Literature', [pc('Draft the review of literature', Math.floor(defDays('review') / 2))], { role: 'part' });
            draftKids = [a, b]; units = [a, b];
        } else if (type === 'intro') draftKids = [pc('Draft the chapter', defDays('intro'))];
        else if (type === 'concl') draftKids = [pc('Draft the chapter', defDays('concl'))];
        const draft = nd('Drafting', draftKids, { grp: 'drafting' });
        const mk = (name, key, role) => { const k = units.length ? mirrors(units).map(m => { m.f.pdays = defDays(key); return m; }) : [pc(name + ' pass', defDays(key))]; return nd(name, k, { role }); };
        const edit = nd('Editing and proofreading', [mk('Structural edit', 'struct', 'structural'), mk('Language edit', 'lang', 'language'), pc('Citations and MLA check', defDays('cite')), pc('Final proofread', defDays('proof'))], { grp: 'editing' });
        return nd(title, [reading, draft, edit], { chap: true });
    }
    function descendants(id, pred) { const out = []; const go = x => (D.kidsOf.get(x) || []).forEach(c => { if (pred(c)) out.push(c); go(c.id); }); go(id); return out; }
    function addThemes(chapterId, names) {
        refresh();
        const an = descendants(chapterId, g => g.role === 'analysis')[0]; if (!an) return 0;
        const st = descendants(chapterId, g => g.role === 'structural')[0], lg = descendants(chapterId, g => g.role === 'language')[0];
        const specs = names.map(themeSpec); commit(an.id, specs);
        if (st) commit(st.id, mirrors(specs).map(m => { m.f.pdays = defDays('struct'); return m; }));
        if (lg) commit(lg.id, mirrors(specs).map(m => { m.f.pdays = defDays('lang'); return m; }));
        return names.length;
    }
    function lockPass() {
        refresh();
        const nl = D.pieces.needLock; if (!nl.length) return;
        const groups = new Map();
        nl.forEach(p => { const T = (p.g.createdAt || 0) + 86400000; if (!groups.has(T)) groups.set(T, []); groups.get(T).push(p); });
        groups.forEach((ps, T) => {
            const d2 = E.derive(events.filter(e => e.ts <= T), T), map = {};
            ps.forEach(p => { const q = d2.pieces.byId.get(p.id); if (q && q.projN !== null) map[p.id] = E.keyOf(q.projN); });
            if (Object.keys(map).length) add({ t: 'lock', map }, T);
        });
        refresh();
    }
    const P = () => D.pieces;
    const chapOf = pid => { let g = D.goals.get(pid); while (g) { if (g.chap) return g; g = g.parent ? D.goals.get(g.parent) : null; } return null; };
    const pTitle = p => p.g.mirror && D.goals.get(p.g.mirror) ? D.goals.get(p.g.mirror).title : p.title;
    const dShort = n => fmtDNshort(n);
    function pieceRight(p) {
        if (p.done) return p.doneUndated ? '<span class="muted">done earlier</span>' : `<span class="muted">done ${dShort(p.finN)}${p.over > 0 ? ` · <b class="bad">${p.over} over</b>` : p.over < 0 ? ` · <b class="good">${-p.over} early</b>` : ''}</span>`;
        if (p.status === 'late') return `<b class="bad">${p.lateDays} d late</b>`;
        if (p.status === 'due') return '<b>due today</b>';
        if (p.status === 'on') return `<span class="muted">due ${dShort(p.due)}</span>`;
        if (p.status === 'ready') return '<span class="muted">ready to start</span>';
        return `<span class="muted">starts ${dShort(p.start)}</span>`;
    }
    const dayF = n => { const r = Math.round(Math.abs(n) * 10) / 10; return N(r) + (r === 1 ? ' day' : ' days'); };
    // work done on a piece against where the clock says it should be
    function pieceWorkBar(p, cls) {
        if (p.done || !p.hasWork) return '';
        return `<span class="${cls}"><i style="width:${Math.round(p.work * 100)}%"></i>${p.workExp !== null ? `<b style="left:${Math.round(p.workExp * 100)}%"></b>` : ''}</span>`;
    }
    function pieceWorkRows(p) {
        if (p.done || !p.hasWork) return '';
        const ah = p.workAhead, tone = ah === null || Math.abs(ah) < 0.25 ? '' : ah > 0 ? 'good' : 'bad';
        const vs = ah === null ? 'Starts later' : Math.abs(ah) < 0.25 ? 'On the clock' : ah > 0 ? dayF(ah) + ' ahead' : dayF(ah) + ' behind';
        return `<div class="row mt"><span class="muted">Work done</span><b class="num">${p.workQty !== null ? N(p.workQty) + ' of ' + N(p.workTotal) + ' ' + esc(p.workUnit) + ' · ' : ''}${pctTxt(p.work)}</b></div>
            ${pieceWorkBar(p, 'pw big')}
            <div class="row"><span class="muted">Against the clock</span><b class="num ${tone}">${vs}</b></div>
            ${p.workExp !== null ? `<div class="hint">The clock expects ${pctTxt(p.workExp)} by today (the small mark on the bar).</div>` : ''}`;
    }
    function pieceRow(p, depth) {
        return `<div class="ol-row ol-item pr ${p.done ? 'is-done' : ''}" data-act="pc" data-id="${p.id}" style="padding-left:${depth * 14}px"><button class="tick ${p.done ? 'on' : ''}" data-act="tick" data-id="${p.id}" aria-label="${p.done ? 'Done' : 'Mark done'}">${p.done ? '✓' : p.locked ? '🔒' : ''}</button><span class="ol-title">${esc(pTitle(p))}</span>${pieceWorkBar(p, 'pw')}<span class="ol-sub">${p.days} d</span><span class="ol-sub">${pieceRight(p)}</span></div>`;
    }
    function nodeRow(g, depth) {
        const a = P().agg.get(g.id), open = (prefs.open || []).indexOf(g.id) >= 0, has = (D.kidsOf.get(g.id) || []).length > 0;
        const late = a && a.slip > 0.5 ? `<span class="chip bad">${dN(a.slip)} late</span>` : '';
        return `<div class="ol-row nr" data-act="nodeS" data-id="${g.id}" style="padding-left:${depth * 14}px"><button class="ol-chev" data-act="toggle" data-id="${g.id}" aria-label="Open or close">${has ? (open ? '▾' : '▸') : ''}</button><span class="ol-title">${esc(g.title)}</span>${late}<span class="ol-sub">${a ? a.doneCount + '/' + a.count : ''}</span><div class="ol-bar"><i style="width:${(a ? a.pct : 0) * 100}%"></i></div></div>` + (open ? treeHtml(g.id, depth + 1) : '');
    }
    function treeHtml(parentId, depth) {
        return (D.kidsOf.get(parentId) || []).map(c => {
            if (c.kind === 'project') return nodeRow(c, depth);
            if (c.kind === 'piece') { const p = P().byId.get(c.id); return p ? pieceRow(p, depth) : ''; }
            return '';
        }).join('');
    }
    function renderPlan() {
        const T = D.thesis, J = D.jrf, PP = P();
        let h = '';
        if (!D.cfg) { $('s-plan').innerHTML = '<div class="card"><p class="hint">Set your timeline first (Settings).</p><button class="btn-line btn-accent" data-act="cfg">Set up my timeline</button></div>'; return; }
        if (PP.list.length && T) {
            const open = PP.open.length, need = PP.list.filter(p => !p.done).reduce((s, p) => s + p.days, 0);
            const fit = T.baseN - J.targetN;
            h += `<div class="card"><h3>The plan as you set it</h3>
                <div class="row"><span class="muted">Open pieces</span><b class="num">${open} · ${dN(need)} of work</b></div>
                <div class="row"><span class="muted">Days left to the year-${J.target} target</span><b class="num">${dN(Math.max(0, J.daysToTarget))}</b></div>
                <div class="row"><span class="muted">Finishes (if every piece takes its allotted days)</span><b class="num ${fit > 0 ? 'bad' : 'good'}">${fmtDNum(T.baseN)}</b></div>
                <div class="hint mt">${fit > 0 ? `That is ${dN(fit)} after your target. Shorten, drop or merge pieces, or accept using ${dN(fit)} of the fifth year.` : `That is ${dN(-fit)} before your target.`}</div></div>`;
        }
        h += chainStrip() + chapterBars();
        h += `<div class="grid2" style="margin-bottom:14px"><button class="btn-line btn-accent" data-act="chap-add">Add a chapter</button><button class="btn-line" data-act="custom-add">Add a custom task</button></div>`;
        const chapters = D.pieces.chapters.concat([...D.goals.values()].filter(g => g.chap && D.pieces.chapters.indexOf(g.id) < 0).map(g => g.id));
        const chs = [...D.goals.values()].filter(g => g.chap).sort((a, b) => a.id - b.id);
        if (!chs.length) h += `<div class="card"><h3>Start with your whole thesis</h3><p class="hint">Type your five primary novels and the app builds eight chapters: Introduction, Theoretical Framework and Review of Literature, five novel-analysis chapters and the Conclusion. Each has Reading, Drafting and Editing with allotted days you can change. Then tick off everything you have already finished.</p><button class="btn-line btn-accent" data-act="outline">Build my thesis outline</button></div>`;
        chs.forEach(c => {
            const a = PP.agg.get(c.id) || { pct: 0, count: 0, doneCount: 0, slip: 0, late: 0 };
            const open = (prefs.open || []).indexOf(c.id) >= 0;
            const kids = (D.kidsOf.get(c.id) || []).filter(k => k.kind === 'project');
            h += `<div class="card"><div class="phase-h" data-act="chap" data-id="${c.id}" style="cursor:pointer"><h3>${esc(c.title)}</h3><span class="chip ${a.slip > 0.5 ? 'bad' : ''}">${a.slip > 0.5 ? dN(a.slip) + ' late' : pctTxt(a.pct)}</span></div>
                <div class="slipbar"><i style="width:${a.pct * 100}%;background:linear-gradient(90deg,var(--blue-a),var(--blue-b))"></i></div><div style="margin-top:6px">`;
            kids.forEach(k => {
                const ga = PP.agg.get(k.id), ico = k.grp === 'reading' ? '📖' : k.grp === 'drafting' ? '✍️' : k.grp === 'editing' ? '🔍' : '•', isOpen = (prefs.open || []).indexOf(k.id) >= 0;
                const nx = ga && ga.next ? ga.next : null;
                h += `<div class="ol-row gr" data-act="grp" data-id="${k.id}"><button class="ol-chev" data-act="toggle" data-id="${k.id}" aria-label="Open or close">${isOpen ? '▾' : '▸'}</button><span class="ol-title">${ico} ${esc(k.title)}</span>${ga && ga.slip > 0.5 ? `<span class="chip bad">${dN(ga.slip)} late</span>` : ''}<span class="ol-sub">${(() => { const tk = PP.tracks.find(x => x.id === k.id); if (tk) return tk.finished ? 'done' : N(tk.done) + '/' + N(tk.total) + ' ' + esc(tk.unit); return ga ? (ga.count && ga.doneCount === ga.count ? 'done' : ga.doneCount + '/' + ga.count) : ''; })()}</span><div class="ol-bar"><i style="width:${(ga ? ga.pct : 0) * 100}%"></i></div></div>`;
                if (isOpen) h += treeHtml(k.id, 1);
            });
            h += `</div></div>`;
        });
        const customs = PP.list.filter(p => p.g.custom);
        if (customs.length) h += `<div class="card" data-sec="plan:custom-tasks"><h3>Custom tasks</h3>${customs.map(p => pieceRow(p, 0)).join('')}</div>`;
        if (D.tasks.length) h += `<div class="card" data-sec="plan:earlier-daily-tasks"><h3>Earlier daily tasks</h3><p class="tight">Quantity-based tasks from before. They still count in their own pace.</p>${D.tasks.map(t => `<div class="ol-row ol-plan" data-act="task" data-id="${t.id}"><span class="ol-chev">📅</span><span class="ol-title">${esc(t.g.title)} · ${N(t.done)}/${N(t.total)} ${esc(t.unit)}</span>${statusChip(t)}</div>`).join('')}</div>`;
        h += `<button class="btn-line" data-act="defaults">Default days for each kind of piece</button>`;
        put($('s-plan'), h);
    }

    /* ---------- finishing, undoing, bulk ticks ---------- */
    function consequence(p, finKey) {
        const f = E.dn(finKey), took = f - p.start + 1, over = took - p.days;
        if (over > 0) return `<div class="pwarn">Allotted ${dN(p.days)}, taking ${dN(took)}: ${dN(over)} over. Everything after it moves ${dN(over)} later.</div>`;
        if (over < 0) return `<div class="pinfo">Allotted ${dN(p.days)}, taking ${dN(took)}: ${dN(-over)} early. The next piece can start ${dN(-over)} sooner.</div>`;
        return `<div class="pinfo">Exactly on time: ${dN(p.days)} allotted, ${dN(took)} taken.</div>`;
    }
    function finishSheet(id) {
        const p = P().byId.get(id); if (!p || p.done) return;
        const today = todayKey();
        sheet(`<h2>${esc(pTitle(p))}</h2><div class="hint">${esc(pathOf(p.parent))}</div>
            <div class="row mt"><span class="muted">Clock started</span><b class="num">${fmtDNum(p.start)}</b></div><div class="row"><span class="muted">Allotted</span><b class="num">${dN(p.days)} · due ${fmtDNum(p.due)}</b></div>
            <label class="field"><span>I finished it on</span><input type="date" id="f-d" value="${today}" max="${today}"></label><div id="f-pv"></div><div class="error" id="f-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="f-go">Mark done</button></div>
            <button class="btn-line" id="f-un" style="margin-top:8px">Done earlier, date not known</button>`, box => {
            const upd = () => { const d = val(box, '#f-d'); box.querySelector('#f-pv').innerHTML = d ? consequence(p, d) : ''; };
            box.querySelector('#f-d').oninput = upd; upd();
            const commitFin = day => {
                const ev = add({ t: 'fin', goal: id, day }); closeSheet(); render(); vibrate(20);
                const q = P().byId.get(id); let m = 'Done. ';
                if (day && q.over > 0) m += `${dN(q.over)} over: later work moves ${dN(q.over)}.`; else if (day && q.over < 0) m += `${dN(-q.over)} early, banked.`; else m += 'On time.';
                toast(m, () => { add({ t: 'void', target: ev.id }); render(); fx('down'); });
            };
            box.querySelector('#f-go').onclick = () => { const d = val(box, '#f-d'); if (!d) { box.querySelector('#f-e').textContent = 'Choose the day you finished'; return; } if (d > today) { box.querySelector('#f-e').textContent = 'That day has not come yet'; return; } commitFin(d); };
            box.querySelector('#f-un').onclick = () => commitFin(null);
        });
    }
    function bulkSheet(ids, label) {
        const open = ids.map(i => P().byId.get(i)).filter(p => p && !p.done).sort((a, b) => a.i - b.i);
        if (!open.length) { toast('Everything here is already done'); return; }
        const today = todayKey();
        const needRead = new Set();
        open.forEach(p => { if (p.locked && p.lockWhy === 'reading' && p.chapter != null) P().list.filter(r => r.grp === 'reading' && r.chapter === p.chapter && !r.done).forEach(r => needRead.add(r.id)); });
        const all = open.concat([...needRead].filter(i => !open.find(o => o.id === i)).map(i => P().byId.get(i))).sort((a, b) => a.i - b.i);
        sheet(`<h2>Mark as done</h2><p>${esc(label)}: ${plural(all.length, 'piece')} will be ticked as finished${needRead.size ? ', including the chapter reading that unlocks it' : ''}.</p>
            <label class="field"><span>Finished around (optional)</span><input type="date" id="b-d" max="${today}"></label>
            <p class="hint">Leave it blank if you do not remember. Dates are only used to learn your real speed and to place later work after them. Work finished before today never counts as late.</p>
            <div class="error" id="b-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="b-go">Mark ${all.length} done</button></div>`, box => {
            box.querySelector('#b-go').onclick = () => {
                const d = val(box, '#b-d') || null; if (d && d > today) { box.querySelector('#b-e').textContent = 'That day has not come yet'; return; }
                const made = all.map(p => add({ t: 'fin', goal: p.id, day: d }));
                closeSheet(); render(); toast(plural(all.length, 'piece') + ' marked done', () => { made.forEach(e => add({ t: 'void', target: e.id })); render(); fx('down'); });
            };
        });
    }
    function lockedSheet(p) {
        if (p.lockWhy === 'edit') {
            const n = P().rdOpen;
            sheet(`<h2>Editing comes last</h2><p>Editing and proofreading begin only after all reading and drafting for the whole thesis is done. ${plural(n, 'reading or drafting piece')} still ${n === 1 ? 'remains' : 'remain'}.</p>
                <div class="modal-actions"><button class="btn-secondary" data-act="close">Close</button><button class="btn-primary" id="l-rd">I have already done this</button></div>`, box => {
                box.querySelector('#l-rd').onclick = () => { closeSheet(); bulkSheet([p.id], pTitle(p)); };
            });
            return;
        }
        const rd = P().list.filter(r => r.grp === 'reading' && r.chapter === p.chapter && !r.done);
        sheet(`<h2>Reading comes first</h2><p>Drafting of <b>${esc((chapOf(p.id) || {}).title || 'this chapter')}</b> stays locked until its reading is finished: ${rd.map(r => esc(r.title)).join(', ')}.</p>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Close</button><button class="btn-primary" id="l-rd">I have already done the reading</button></div>`, box => {
            box.querySelector('#l-rd').onclick = () => { closeSheet(); bulkSheet(rd.map(r => r.id), 'Reading for ' + ((chapOf(p.id) || {}).title || 'this chapter')); };
        });
    }
    function tick(id) {
        const p = P().byId.get(id); if (!p) return;
        if (p.done) { confirmSheet({ title: 'Mark as not done?', sub: 'The finish date is removed and the clock runs again.', ok: 'Not done' }).then(ok => { if (ok) { add({ t: 'void', target: p.finId }); render(); toast('Reopened'); } }); return; }
        if (p.locked) { lockedSheet(p); return; }
        finishSheet(id);
    }

    /* ---------- sheets: piece, section, group, chapter ---------- */
    function pieceSheet(id) {
        const p = P().byId.get(id); if (!p) return;
        const g = p.g, young = Date.now() - (g.createdAt || 0) <= 86400000, canStartEarlier = P().pickMode ? (!p.done && !p.picked && !p.locked) : (!p.done && p.start > D.todayN);
        sheet(`<h2>${esc(pTitle(p))}</h2><div class="hint">${esc(pathOf(p.parent))}</div>
            <div class="row mt"><span class="muted">Status</span>${p.done ? '<span class="chip good">Done</span>' : p.status === 'late' ? `<span class="chip bad">${dN(p.lateDays)} late</span>` : p.status === 'later' ? `<span class="chip">Starts ${dShort(p.start)}</span>` : p.status === 'ready' ? '<span class="chip">Ready to start</span>' : '<span class="chip">In progress</span>'}</div>
            <div class="row"><span class="muted">Clock</span><b class="num">${fmtDNum(p.start)} to ${fmtDNum(p.due)}</b></div>
            ${pieceWorkRows(p)}
            ${p.dl0 !== null ? `<div class="row"><span class="muted">Original deadline (fixed)</span><b class="num">${fmtDNum(p.dl0)}</b></div>` : '<div class="hint">The deadline is fixed 24 hours after you create the piece.</div>'}
            ${p.done && !p.doneUndated ? `<div class="row"><span class="muted">Finished</span><b class="num">${fmtDNum(p.finN)}${p.over !== null ? ` · ${p.over > 0 ? dN(p.over) + ' over' : p.over < 0 ? dN(-p.over) + ' early' : 'on time'}` : ''}</b></div>` : ''}
            ${p.locked ? `<div class="pwarn">${p.lockWhy === 'edit' ? 'Locked until all reading and drafting is done.' : 'Locked until the chapter reading is done.'}</div>` : ''}
            <div class="grid2 mt"><label class="field"><span>Allotted days</span><input type="number" inputmode="numeric" id="pc-d" value="${p.days}"></label>
            <label class="field"><span>Hard finish date ${p.fixed && !young ? '(locked)' : '(optional)'}</span><input type="date" id="pc-f" value="${g.fixedEnd || ''}" ${p.fixed && !young ? 'disabled' : ''}></label></div>
            ${g.mirror ? '' : `<label class="field"><span>Name</span><input type="text" id="pc-t" value="${esc(g.title)}"></label>`}
            <div class="error" id="pc-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Close</button><button class="btn-primary" id="pc-go">Save</button></div>
            ${trackBlock(trackOf(id))}
            ${p.done ? '' : `<div class="grid2" style="margin-top:8px">${trackOf(id) ? `<button class="btn-line" data-act="tset" data-id="${trackOf(id).id}">Change daily pace</button>` : `<button class="btn-line" data-act="tset" data-id="${id}">Set a daily pace</button>`}<button class="btn-line" data-act="split" data-id="${id}">Split into sub-sections</button></div>${(D.cfg && D.cfg.order === 'custom') ? `<button class="btn-line" data-act="next" data-id="${id}" style="margin-top:8px">Do this next</button>` : ''}`}
            <div class="grid2" style="margin-top:8px">${p.done ? `<button class="btn-line" data-act="tick" data-id="${id}">Mark not done</button>` : `<button class="btn-line btn-accent" data-act="tick" data-id="${id}">${p.locked ? 'Why locked?' : 'Mark done'}</button>`}${p.began && !p.hasWork && !p.done && P().pickMode ? '<button class="btn-line" id="pc-stop">Stop working on this</button>' : ''}${canStartEarlier ? `<button class="btn-line btn-accent" id="pc-st">${P().pickMode ? 'Start this piece' : 'Start now'}</button>` : '<span></span>'}</div>
            <button class="btn-extra" id="pc-del" style="margin-top:8px">Delete piece</button>`, box => {
            box.querySelector('#pc-go').onclick = () => {
                const days = Math.round(numv(box, '#pc-d')); if (!(days >= 1)) { box.querySelector('#pc-e').textContent = 'Allot at least one day'; return; }
                const f = { pdays: days }; const t = box.querySelector('#pc-t'); if (t && t.value.trim()) f.title = t.value.trim();
                const fe = box.querySelector('#pc-f'); if (fe && !fe.disabled) f.fixedEnd = fe.value || null;
                add({ t: 'goal', op: 'edit', gid: id, f }); closeSheet(); render();
            };
            const st = box.querySelector('#pc-st'); if (st) st.onclick = () => { if (P().pickMode) { closeSheet(); beginPiece(id); return; } add({ t: 'pstart', goal: id, day: todayKey() }); closeSheet(); render(); toast('Clock started today'); };
            const sp = box.querySelector('#pc-stop'); if (sp) sp.onclick = () => { add({ t: 'unbegin', goal: id }); closeSheet(); render(); toast('Moved back to the recommended list'); };
            box.querySelector('#pc-del').onclick = async () => { if (await confirmSheet({ title: 'Delete this piece?', sub: 'It leaves the plan. Later pieces move up.', ok: 'Delete', danger: true })) { add({ t: 'goal', op: 'del', gid: id }); render(); } };
        });
    }
    function nodeSheet2(id) {
        const g = D.goals.get(id); if (!g) return;
        const a = P().agg.get(id), isGrp = !!g.grp, isChap = g.chap;
        const ids = a ? a.pieces.map(p => p.id) : [];
        sheet(`<h2>${esc(g.title)}</h2><div class="hint">${esc(pathOf(id))}</div>
            ${a && a.count ? `<div class="row mt"><span class="muted">Done</span><b class="num">${a.doneCount} of ${a.count} · ${pctTxt(a.pct)}</b></div><div class="row"><span class="muted">Days still to do</span><b class="num">${dN(a.openDays)}</b></div>${a.dl0 !== null && a.projN !== null ? `<div class="row"><span class="muted">Finishes</span><b class="num ${a.slip > 0.5 ? 'bad' : a.slip < -0.5 ? 'good' : ''}">${fmtDNum(a.projN)} · ${slipText(a.slip)}</b></div>` : ''}` : '<p class="hint mt">Nothing inside yet.</p>'}
            ${isGrp ? `<div class="grid2"><label class="field"><span>Days budget (optional)</span><input type="number" inputmode="numeric" id="n-b" value="${g.budget || ''}" placeholder="e.g. 60"></label><div class="field"><span>Pieces add up to</span><b class="num" style="font-size:1.1rem">${a ? a.totalDays : 0} d</b></div></div>
                ${g.budget && a ? (a.totalDays === g.budget ? '<div class="pinfo">The pieces match the budget.</div>' : `<div class="pwarn">The pieces add up to ${dN(a.totalDays)}, ${dN(Math.abs(a.totalDays - g.budget))} ${a.totalDays > g.budget ? 'over' : 'under'} the budget.</div>`) : ''}
                ${g.budget ? '<button class="btn-line" id="n-share">Share the budget across the pieces</button>' : ''}` : ''}
            <div class="grid2 mt"><button class="btn-line btn-accent" data-act="piece-add" data-id="${id}">Add a piece</button><button class="btn-line" data-act="sec-add2" data-id="${id}">Add a section</button></div>
            <button class="btn-line" data-act="tset" data-id="${id}">${P().tracks.find(x => x.id === id) ? 'Change the daily pace' : 'Set a daily pace (pages or steps)'}</button>
            ${P().tracks.find(x => x.id === id) ? trackBlock(P().tracks.find(x => x.id === id)) : ''}
            ${g.role === 'analysis' ? `<button class="btn-line" data-act="themes-add" data-id="${chapOf(id).id}">Add themes</button>` : ''}
            ${ids.length ? `<button class="btn-line" id="n-bulk">Mark everything here as done</button>` : ''}
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Close</button><button class="btn-secondary" id="n-ren">Rename</button>${isGrp ? '' : '<button class="btn-extra" id="n-del">Delete</button>'}</div>`, box => {
            const bd = box.querySelector('#n-b'); if (bd) bd.onchange = () => { add({ t: 'goal', op: 'edit', gid: id, f: { budget: Math.max(0, Math.round(+bd.value || 0)) } }); render(); nodeSheet2(id); };
            const sh = box.querySelector('#n-share'); if (sh) sh.onclick = () => { shareBudget(id); closeSheet(); render(); toast('Budget shared across the pieces'); };
            const bk = box.querySelector('#n-bulk'); if (bk) bk.onclick = () => { closeSheet(); bulkSheet(ids, g.title); };
            box.querySelector('#n-ren').onclick = async () => { const v = await promptSheet('Rename', g.title); if (v) { add({ t: 'goal', op: 'edit', gid: id, f: { title: v } }); closeSheet(); render(); } };
            const dl = box.querySelector('#n-del'); if (dl) dl.onclick = async () => { if (await confirmSheet({ title: 'Delete "' + g.title + '"?', sub: 'Everything inside it is removed.', ok: 'Delete', danger: true })) { add({ t: 'goal', op: 'del', gid: id }); closeSheet(); render(); } };
        });
    }
    function shareBudget(id) {
        const g = D.goals.get(id), a = P().agg.get(id); if (!g || !g.budget || !a) return;
        const ps = a.pieces.filter(p => !p.done); if (!ps.length) return;
        const done = a.pieces.filter(p => p.done).reduce((s, p) => s + p.days, 0), avail = Math.max(ps.length, g.budget - done);
        const w = ps.map(p => Math.max(0.25, p.g.wt || p.days)), W = w.reduce((s, x) => s + x, 0);
        const raw = w.map(x => x / W * avail), fl = raw.map(x => Math.max(1, Math.floor(x)));
        let left = avail - fl.reduce((s, x) => s + x, 0);
        raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { fl[i]++; left--; } });
        ps.forEach((p, i) => { if (fl[i] !== p.days) add({ t: 'goal', op: 'edit', gid: p.id, f: { pdays: fl[i] } }); });
    }
    function promptSheet(title, value) {
        return new Promise(res => sheet(`<h2>${esc(title)}</h2><label class="field"><input type="text" id="pr-v" value="${esc(value || '')}" autofocus></label><div class="modal-actions"><button class="btn-secondary" id="pr-c">Cancel</button><button class="btn-primary" id="pr-ok">Save</button></div>`, box => {
            box.querySelector('#pr-c').onclick = () => { closeSheet(); res(null); }; box.querySelector('#pr-ok').onclick = () => { const v = val(box, '#pr-v').trim(); closeSheet(); res(v || null); };
        }));
    }
    function chapterSheet(id) {
        const c = D.goals.get(id); if (!c) return;
        const a = P().agg.get(id) || { count: 0, doneCount: 0, pct: 0, openDays: 0 };
        const kids = (D.kidsOf.get(id) || []).filter(k => k.kind === 'project');
        sheet(`<h2>${esc(c.title)}</h2>
            <div class="row mt"><span class="muted">Done</span><b class="num">${a.doneCount} of ${a.count} · ${pctTxt(a.pct)}</b></div><div class="row"><span class="muted">Days still to do</span><b class="num">${dN(a.openDays)}</b></div>
            ${kids.map(k => { const ga = P().agg.get(k.id); return `<div class="row"><span>${esc(k.title)}</span><span class="muted">${ga ? ga.doneCount + '/' + ga.count : ''} · ${ga ? ga.totalDays : 0} d${k.budget ? ' of ' + k.budget : ''}</span></div>`; }).join('')}
            <div class="set-title" style="margin-top:12px">Already finished some of it?</div>
            ${kids.map(k => `<button class="btn-line" data-act="bulk-grp" data-id="${k.id}">Mark ${esc(k.title)} as done</button>`).join('')}
            ${descendants(id, g => g.role === 'analysis').length ? `<button class="btn-line btn-accent" data-act="themes-add" data-id="${id}">Add themes to the analysis</button>` : ''}
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Close</button><button class="btn-secondary" id="c-ren">Rename</button><button class="btn-extra" id="c-del">Delete chapter</button></div>`, box => {
            box.querySelector('#c-ren').onclick = async () => { const v = await promptSheet('Rename chapter', c.title); if (v) { add({ t: 'goal', op: 'edit', gid: id, f: { title: v } }); closeSheet(); render(); } };
            box.querySelector('#c-del').onclick = async () => { if (await confirmSheet({ title: 'Delete "' + c.title + '"?', sub: 'All its reading, drafting and editing pieces are removed.', ok: 'Delete', danger: true })) { add({ t: 'goal', op: 'del', gid: id }); closeSheet(); render(); } };
        });
    }
    function pieceAddSheet(parentId) {
        const g = D.goals.get(parentId);
        sheet(`<h2>Add pieces</h2><p>One per line. Add allotted days after a bar, for example <i>Definition | 2</i>. Lines without days use the default below.</p>
            <label class="field"><span>Pieces</span><textarea id="a-l" style="min-height:90px" autofocus></textarea></label>
            <label class="field"><span>Default days</span><input type="number" inputmode="numeric" id="a-d" value="3"></label><div class="error" id="a-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="a-go">Add</button></div>`, box => {
            box.querySelector('#a-go').onclick = () => {
                const def = Math.round(numv(box, '#a-d')), lines = parseLines(val(box, '#a-l')); if (!lines.length) { box.querySelector('#a-e').textContent = 'Type at least one piece'; return; } if (!(def >= 1)) { box.querySelector('#a-e').textContent = 'Default days must be 1 or more'; return; }
                commit(parentId, lines.map(l => { const [a, b] = l.split('|'); const d = parseInt(b, 10); return pc(a.trim(), d >= 1 ? d : def); }));
                if ((prefs.open || []).indexOf(parentId) < 0) { prefs.open = (prefs.open || []).concat([parentId]); persist(); }
                closeSheet(); render(); toast('Added');
            };
        });
    }
    const parseLines = txt => String(txt || '').split('\n').map(x => x.trim()).filter(Boolean);
    function sectionAddSheet(parentId) {
        sheet(`<h2>Add a section</h2><label class="field"><span>Name</span><input type="text" id="s-t" autofocus></label><div class="error" id="s-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="s-go">Add</button></div>`, box => {
            box.querySelector('#s-go').onclick = () => { const t = val(box, '#s-t').trim(); if (!t) { box.querySelector('#s-e').textContent = 'Give it a name'; return; } commit(parentId, [nd(t, [])]); prefs.open = (prefs.open || []).concat([parentId]); persist(); closeSheet(); render(); };
        });
    }
    function themesSheet(chapterId) {
        const c = D.goals.get(chapterId), have = descendants(chapterId, g => g.role === 'theme').length;
        sheet(`<h2>Add themes</h2><p><b>${esc(c.title)}</b> has ${plural(have, 'theme')}. One theme per line. Each gets Definition (${defDays('def')} d), Instances and Ramifications (${defDays('inst')} d), Theoretical Application (${defDays('ta')} d) and concluding lines for the transition (${defDays('trans')} d), plus a matching piece in the structural and language edits. Change the defaults in Plan.</p>
            <label class="field"><span>Themes</span><textarea id="h-l" style="min-height:110px" placeholder="Memory and Loss&#10;Belonging" autofocus></textarea></label><div class="error" id="h-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="h-go">Add</button></div>`, box => {
            box.querySelector('#h-go').onclick = () => { const names = parseLines(val(box, '#h-l')); if (!names.length) { box.querySelector('#h-e').textContent = 'Type at least one theme'; return; } addThemes(chapterId, names); closeSheet(); render(); toast(plural(names.length, 'theme') + ' added'); };
        });
    }
    function chapAddSheet() {
        sheet(`<h2>Add a chapter</h2><div class="seg" id="k-t"><button data-k="novel" class="on">Novel analysis</button><button data-k="review">Theory and Review</button><button data-k="intro">Introduction</button><button data-k="concl">Conclusion</button></div>
            <label class="field"><span>Chapter name</span><input type="text" id="k-n" placeholder="Chapter 3: Afterlives" autofocus></label>
            <label class="field" id="k-w"><span>Themes for the analysis (optional, one per line)</span><textarea id="k-l" style="min-height:80px"></textarea></label><div class="error" id="k-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="k-go">Create</button></div>`, box => {
            let kind = 'novel';
            box.querySelectorAll('#k-t button').forEach(b => b.onclick = () => { kind = b.dataset.k; box.querySelectorAll('#k-t button').forEach(x => x.classList.toggle('on', x === b)); box.querySelector('#k-w').style.display = kind === 'novel' ? '' : 'none'; const n = box.querySelector('#k-n'); if (!n.value) n.placeholder = { novel: 'Chapter 3: Afterlives', review: 'Theoretical Framework and Review of Literature', intro: 'Introduction', concl: 'Conclusion' }[kind]; });
            box.querySelector('#k-go').onclick = () => { const t = val(box, '#k-n').trim(); if (!t) { box.querySelector('#k-e').textContent = 'Name the chapter'; return; } commit(0, [chapterSpec(t, kind, kind === 'novel' ? parseLines(val(box, '#k-l')) : [])]); closeSheet(); render(); toast('Chapter created. Adjust the days.'); };
        });
    }
    function outlineSheet() {
        sheet(`<h2>Build my thesis outline</h2><p>Type your primary novels, one per line. The app creates eight chapters, each with Reading (Skim, Scan), Drafting and Editing. The days are starting guesses; change any of them. Then mark everything you have already finished.</p>
            <label class="field"><span>Novels</span><textarea id="o-l" style="min-height:110px" placeholder="Afterlives&#10;Gravel Heart&#10;By the Sea" autofocus></textarea></label><div class="error" id="o-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="o-go">Build</button></div>`, box => {
            box.querySelector('#o-go').onclick = () => {
                const novels = parseLines(val(box, '#o-l')); if (!novels.length) { box.querySelector('#o-e').textContent = 'Type at least one novel'; return; }
                const specs = [chapterSpec('Introduction', 'intro'), chapterSpec('Theoretical Framework and Review of Literature', 'review')].concat(novels.map((n, i) => chapterSpec('Chapter ' + (i + 3) + ': ' + n, 'novel')), [chapterSpec('Conclusion', 'concl')]);
                commit(0, specs); closeSheet(); render(); toast('Outline built. Tick what is already done.');
            };
        });
    }
    function customSheet() {
        sheet(`<h2>Add a custom task</h2><p>For anything outside the chapters, such as a conference paper or a supervisor request. It joins the same clock.</p>
            <label class="field"><span>What will you do?</span><input type="text" id="u-t" autofocus></label>
            <div class="grid2"><label class="field"><span>Allotted days</span><input type="number" inputmode="numeric" id="u-d" value="3"></label><label class="field"><span>Hard finish date (optional)</span><input type="date" id="u-f"></label></div><div class="error" id="u-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="u-go">Add</button></div>`, box => {
            box.querySelector('#u-go').onclick = () => { const t = val(box, '#u-t').trim(), d = Math.round(numv(box, '#u-d')); if (!t) { box.querySelector('#u-e').textContent = 'Name the task'; return; } if (!(d >= 1)) { box.querySelector('#u-e').textContent = 'Allot at least one day'; return; }
                commit(0, [pc(t, d, { custom: true, fixedEnd: val(box, '#u-f') || null })]); closeSheet(); render(); };
        });
    }
    function defaultsSheet() {
        sheet(`<h2>Default days</h2><p>Used whenever the app creates new pieces. Existing pieces are not changed.</p>${DEFD_LABEL.map(([k, l]) => `<div class="sw-row"><span>${l}</span><input type="number" inputmode="numeric" data-dd="${k}" value="${defDays(k)}" style="width:72px;text-align:right" class="set-select"></div>`).join('')}
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="d-go">Save</button></div>`, box => {
            box.querySelector('#d-go').onclick = () => { const o = {}; box.querySelectorAll('[data-dd]').forEach(i => { const v = Math.round(+i.value); if (v >= 1) o[i.dataset.dd] = v; }); prefs.defDays = o; persist(); closeSheet(); toast('Defaults saved'); };
        });
    }
    function rebaseSheet() {
        const T = D.thesis;
        sheet(`<h2>Re-baseline the plan</h2><p>This resets every open piece's deadline to where it stands now, so the delay so far stops showing as lateness. Use it only after a real change of plan, such as adding chapters. The days it forgives (${dN(Math.max(0, T.slip))}) stay on record in the Outlook ledger for good.</p>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="rb-go">Re-baseline</button></div>`, box => {
            box.querySelector('#rb-go').onclick = () => { const map = {}; P().open.forEach(p => { map[p.id] = E.keyOf(p.projN); }); add({ t: 'lock', map, rebase: true, forgiven: Math.max(0, T.slip) }); closeSheet(); render(); toast('Plan re-baselined. It is on record.'); };
        });
    }

    function nowCard(p) {
        const late = p.status === 'late', dayNo = Math.max(1, Math.min(p.days, D.todayN - p.start + 1));
        const cost = late ? `<div class="pwarn" style="margin-top:8px">${dN(p.lateDays)} over. Each extra day moves everything after this piece one day later${prefs.lossOn ? ` (the thesis now finishes ${fmtDNum(D.thesis.projN)})` : ''}.</div>` : '';
        const chap = chapOf(p.id);
        return `<div class="card pnow ${late ? 'late' : ''}" data-act="pc" data-id="${p.id}">
            <div class="row"><div style="min-width:0"><div class="safe-lbl">${esc(chap ? chap.title : 'Custom task')}</div><div class="pt">${esc(pTitle(p))}</div><div class="hint">${esc(pathOf(p.parent).split(' › ').slice(chap ? 1 : 0).join(' › '))}</div></div>
            <button class="btn-line btn-accent pdone" data-act="tick" data-id="${p.id}">Done</button></div>
            <div class="row mt"><span class="chip ${late ? 'bad' : ''}">${late ? 'Late' : p.status === 'due' ? 'Due today' : 'Day ' + dayNo + ' of ' + p.days}</span><span class="muted">due ${fmtDNum(p.due)}</span></div>${cost}${focusBlock(p)}${trackBlock(trackOf(p.id), true)}</div>`;
    }
    /* ---------- pick, then start: the Today screen recommends, you choose ---------- */
    async function beginPiece(id) {
        const p = P().byId.get(id); if (!p || p.done) return;
        if (p.locked) { fx('stop'); toast(p.lockWhy === 'edit' ? 'Locked until all reading and drafting is done.' : 'Locked until the chapter reading is done.'); return; }
        if (P().pickMode && !p.picked) {
            if (P().active.length >= 2) fx('stop');
            if (P().active.length >= 2 && !(await confirmSheet({ title: 'Two pieces are already under way', sub: 'Two at a time is easier to keep up, and the thesis forecast assumes one steady chain. You can still start a third.', ok: 'Start anyway', cancel: 'Not now' }))) return;
            add({ t: 'begin', goal: id, day: todayKey() });
        }
        render(); howSheet(id);
    }
    function howSheet(id) {
        const p = P().byId.get(id); if (!p) return;
        sheet(`<h2>${esc(pTitle(p))}</h2><p>This piece is now under way and its clock has started. How do you want to work on it?</p>
            <button class="btn-line btn-accent" data-h="pace">Set a daily pace (pages or steps)</button>
            <button class="btn-line" data-h="split">Split into sub-sections</button>
            <button class="btn-line" data-h="clock">Just follow the clock</button>`, box => {
            box.querySelectorAll('[data-h]').forEach(b => b.onclick = () => {
                const h = b.dataset.h; closeSheet();
                if (h === 'pace') setTimeout(() => trackSheet(trackOf(id) ? trackOf(id).id : id), 60);
                else if (h === 'split') setTimeout(() => splitSheet(id), 60);
                else toast('Under way. The clock is running.');
            });
        });
    }
    function newDailySheet() {
        const PP = P(), rec = PP.active.filter(p => !trackOf(p.id)).concat(PP.upcoming).slice(0, 4);
        sheet(`<h2>New daily task</h2><p class="hint">Daily tasks are the small steps of a Plan piece. Start from the Plan, so the progress counts towards your thesis.</p>
            <div class="set-title">From the Plan</div>
            ${rec.length ? rec.map((p, i) => `<div class="ledger-row" data-act="begin" data-id="${p.id}" style="cursor:pointer"><span>${esc(pTitle(p))}<span class="muted"> · ${p.days} d${i === 0 ? ' · recommended' : ''}</span></span><span class="muted">Pick</span></div>`).join('') : '<p class="hint">Nothing is waiting in the Plan.</p>'}
            <button class="btn-line" data-act="pick">Choose another piece from the Plan</button>
            <div class="set-title" style="margin-top:12px">Outside the Plan</div>
            <p class="hint">For something that is not in the thesis outline. It does not move the thesis clock.</p>
            <button class="btn-line" data-act="task-add">New task outside the Plan</button>`);
    }
    function pickToday(PP) {
        let h = `<div class="list-header"><span>Working on</span><span class="hint">tap Done on the day you finish</span></div>`;
        h += PP.active.length ? PP.active.map(nowCard).join('') : `<div class="card"><p class="hint">${PP.upcoming[0] ? 'Nothing is under way yet. Pick a piece below to start its clock.' : 'Everything is done. Well earned.'}</p></div>`;
        if (PP.upcoming.length) {
            const f = PP.upcoming[0];
            h += `<div class="card"><h3>${PP.active.length ? 'Recommended next' : 'Recommended to start'}</h3>
                <div class="ledger-row" style="cursor:default"><span><b>${esc(pTitle(f))}</b><span class="muted"> · ${f.days} d</span><span class="hint" style="display:block">${esc(pathOf(f.parent))}</span></span></div>
                <button class="btn-line btn-accent" data-act="begin" data-id="${f.id}">Start this</button>
                ${PP.upcoming.slice(1).map(p => `<div class="ledger-row" data-act="begin" data-id="${p.id}" style="cursor:pointer"><span>${esc(pTitle(p))}<span class="muted"> · ${p.days} d</span></span><span class="muted">Start</span></div>`).join('')}
                ${PP.active.length ? '' : '<button class="btn-line" data-act="pick">Choose another piece</button>'}</div>`;
        }
        return h + (PP.active.length ? `<div class="soft-row"><button class="btn-soft" data-act="newdaily">New daily task</button>${PP.upcoming.length ? '<button class="btn-soft" data-act="pick">Choose another piece</button>' : ''}</div>` : `<button class="btn-line" data-act="newdaily" style="margin-bottom:14px">New daily task</button>`);
    }
    /* ---------- the top panel of Today: today's work, pace, week and month, and where you are heading ---------- */
    function todayPanel(PP, T, J) {
        const R = PP.rhythm, items = [], tt = (txt, tone) => `data-tell="${esc(txt)}" data-tone="${tone || ''}"`;
        PP.active.forEach(p => { const t = trackOf(p.id); if (!t || t.finished) return; const goal = Math.max(t.pace || 0, t.need || 0); items.push({ name: pTitle(p), unit: t.unit, done: IN ? IN.qtyOn(t.id, D.todayN) : 0, goal, t, p }); });
        D.tasks.filter(t => t.started && !t.finished && t.target > 0.05).forEach(t => items.push({ name: t.title || (t.g && t.g.title) || 'Task', unit: t.unit, done: t.doneToday, goal: t.target, t: null, p: null }));
        const goalItems = items.filter(x => x.goal > 0), hit = goalItems.filter(x => x.done >= x.goal - 0.05).length, one = goalItems.length === 1 ? goalItems[0] : null;
        const frac = goalItems.length ? goalItems.reduce((a, x) => a + Math.min(1, x.done / x.goal), 0) / goalItems.length : 0;
        const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], mon = n => { const d = new Date(n * 864e5); return MON[d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2); };
        // ---- the ring: the number sits inside; several tasks make a segmented ring
        const L = 226.2; let ringSvg = '', ringTell = '', ringTone = '';
        if (goalItems.length) {
            const n = goalItems.length, gap = n > 1 ? 9 : 0, seg = (L - gap * n) / n;
            const arcs = goalItems.map((x, i) => { const f = Math.min(1, x.done / x.goal), st = i * (seg + gap), ok = x.done >= x.goal - 0.05; return `<circle cx="40" cy="40" r="36" fill="none" stroke-width="7" class="ring-track" stroke-dasharray="${seg.toFixed(1)} ${(L - seg).toFixed(1)}" stroke-dashoffset="${(-st).toFixed(1)}" stroke-linecap="${n > 1 ? 'butt' : 'round'}"/>${f > 0.005 ? `<circle class="tp-arc" cx="40" cy="40" r="36" fill="none" stroke-width="7" stroke-linecap="${n > 1 ? 'butt' : 'round'}" stroke="${ok ? 'var(--good,#2da872)' : 'url(#mrG)'}" stroke-dasharray="${(seg * f).toFixed(1)} ${(L - seg * f).toFixed(1)}" stroke-dashoffset="${(-st).toFixed(1)}" style="--d:${i * 120}ms"/>` : ''}`; }).join('');
            const centre = one ? N(one.done) : `${hit}/${n}`, cap = one ? `of ${N(one.goal)} ${esc(one.unit)}` : 'goals';
            ringSvg = `<div class="ring mring tp-ringbox"><svg viewBox="0 0 80 80" style="transform:rotate(-90deg)">${arcs}<defs><linearGradient id="mrG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--blue-a)"/><stop offset="1" stop-color="var(--blue-b)"/></linearGradient></defs></svg><div class="ring-center"><div class="ring-pct tp-num">${centre}</div><div class="ring-cap">${cap}</div></div></div>`;
            ringTell = one ? (one.done >= one.goal - 0.05 ? `You did ${N(one.done)} of ${N(one.goal)} ${one.unit} today. The goal is done.` : `You did ${N(one.done)} of ${N(one.goal)} ${one.unit} today. ${N(one.goal - one.done)} more to go.`) : `${hit} of ${n} daily goals are done. ${hit === n ? 'All finished for today.' : n - hit + ' still to do.'}`; ringTone = hit === n ? 'good' : '';
        } else if (PP.active.length) {
            const p = PP.active[0], dayNo = Math.max(1, Math.min(p.days, D.todayN - p.start + 1));
            ringSvg = mring(Math.max(0, Math.min(1, dayNo / p.days)), 'Day ' + dayNo, 'of ' + p.days).replace('class="ring mring"', 'class="ring mring tp-ringbox"');
            ringTell = `This is day ${dayNo} of ${p.days} for ${pTitle(p)}. Set a daily pace to see today's goal.`;
        } else { ringSvg = mring(0, '–', '').replace('class="ring mring"', 'class="ring mring tp-ringbox"'); ringTell = 'Nothing is under way. Pick a piece below to start it.'; }
        // ---- chips: flame (chain), clock (pace), arrow (week against week)
        const ico = { flame: '<path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/>', clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>', up: '<path d="M12 19V6M6 12l6-6 6 6"/>', down: '<path d="M12 5v13M6 12l6 6 6-6"/>' };
        const chip = (k, txt, tell, tone) => `<button type="button" class="tp-chip ${tone || ''}" ${tt(tell, tone)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ico[k]}</svg><b>${txt}</b></button>`;
        const chips = [];
        if (IN && (IN.streak > 0 || IN.atRisk)) chips.push(chip('flame', IN.streak, `Your chain is ${plural(IN.streak, 'day')} long. ${IN.atRisk ? 'Log something today to keep it.' : IN.workedToday ? 'Today is already counted.' : 'Keep it going.'}`, IN.atRisk ? 'bad' : IN.workedToday ? 'good' : ''));
        const lead = (goalItems.find(x => x.t) || {}).t || null, wp = PP.active.find(p => p.hasWork && p.workAhead !== null && Math.abs(p.workAhead) >= 1);
        if (lead && lead.avg7 > 0) chips.push(chip('clock', N(lead.avg7) + '/d', `Your pace is ${N(lead.avg7)} ${lead.unit} a day over 7 days. ${lead.need !== null && !lead.finished ? 'You need ' + N(lead.need) + ' a day to make the deadline.' : 'That is steady work.'}`, lead.behind ? 'bad' : ''));
        else if (wp) chips.push(chip(wp.workAhead > 0 ? 'up' : 'down', dayF(Math.abs(wp.workAhead)), `${pTitle(wp)} is ${dayF(Math.abs(wp.workAhead))} ${wp.workAhead > 0 ? 'ahead of' : 'behind'} the clock.`, wp.workAhead > 0 ? 'good' : 'bad'));
        if (R.hasP7 && R.p7.days > 0.3) { const d = (R.w7.days - R.p7.days) / R.p7.days, up = d >= 0; chips.push(chip(up ? 'up' : 'down', Math.round(Math.abs(d) * 100) + '%', `Last 7 days: ${N(R.w7.days)} plan days, against ${N(R.p7.days)} the week before. You are ${up ? 'faster' : 'slower'} by ${Math.round(Math.abs(d) * 100)}%.`, Math.abs(d) < 0.05 ? '' : up ? 'good' : 'bad')); }
        // ---- the last 14 days as bars: one plan day is the goal line
        const days = R.days14, mx = Math.max(1.25, ...days.map(d => d.v)), H = 46, base = 54, wk = n => WDN[new Date(n * 864e5).getUTCDay()];
        const bars = days.map((d, i) => { const h = d.v > 0 ? Math.max(3, d.v / mx * H) : 0, x = i * 20 + 3, strong = i >= 7, met = d.v >= 0.95, cls = met ? 'met' : 'part', tell = d.leave ? `${wk(d.n)} ${fmtDNshort(d.n)} was a rest day.` : d.v > 0 ? `${wk(d.n)} ${fmtDNshort(d.n)}: ${N(d.v)} plan days. ${met ? 'That meets the plan.' : 'Below one plan day.'}` : `${wk(d.n)} ${fmtDNshort(d.n)}: no work logged.`; return `<rect class="tp-bar ${cls} ${strong ? 's' : 'w'} ${i === 13 ? 'now' : ''}" x="${x}" y="${(base - Math.max(h, 8)).toFixed(1)}" width="14" height="${Math.max(h, 8).toFixed(1)}" rx="4" style="--d:${i * 35}ms;${h ? '' : 'fill:transparent'}"/><rect class="tp-hit" x="${x - 3}" y="2" width="20" height="${base}" fill="transparent" ${tt(tell, '')}/>${d.leave ? `<circle cx="${x + 7}" cy="${base - 4}" r="2.5" class="tp-rest"/>` : ''}${!h && !d.leave ? `<rect x="${x}" y="${base - 2}" width="14" height="2" rx="1" class="tp-zero"/>` : ''}`; }).join('');
        const gy = base - 1 / mx * H, strip = `<div class="tp-bars"><svg viewBox="0 0 280 ${base + 4}" preserveAspectRatio="none" role="img" aria-label="Last 14 days">${bars}<line x1="0" x2="280" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}" class="tp-goal"/></svg></div>`;
        // ---- the road to the target and the end of the JRF
        let road = '';
        if (R.endN) {
            const a = D.todayN, end = R.endN, tg = R.targetN, fin = R.atSpeedN, far = Math.max(end, fin || 0), span = Math.max(30, (far - a) * 1.1), X = n => 14 + Math.max(0, Math.min(1, (n - a) / span)) * 272, y = 38;
            const tone = fin === null ? '' : fin <= tg ? 'good' : fin <= end ? 'warn' : 'bad';
            const flag = (n, lbl, cls) => `<g class="tp-flag ${cls}"><line x1="${X(n)}" x2="${X(n)}" y1="${y - 22}" y2="${y}"/><path d="M${X(n)} ${y - 22}l12 5-12 5z"/></g><text x="${X(n)}" y="${y + 18}" class="tp-lbl" text-anchor="middle">${lbl}</text>`;
            const dotClose = fin !== null && (Math.abs(X(fin) - X(end)) < 40 || Math.abs(X(fin) - X(tg)) < 40);
            const tell = fin === null ? `Log some work for a week and the road will show where your speed leads.` : `At your speed you finish about ${fmtDNum(fin)}. The target is ${fmtDNum(tg)}, and the JRF ends ${fmtDNum(end)}.`;
            road = `<div class="tp-road" ${tt(tell, tone === 'bad' ? 'bad' : tone === 'good' ? 'good' : '')}><svg viewBox="0 0 300 76" role="img" aria-label="Road to the end of the JRF"><line x1="${X(a)}" x2="${X(end)}" y1="${y}" y2="${y}" class="tp-track"/>${fin !== null && fin > end ? `<line x1="${X(end)}" x2="${X(fin)}" y1="${y}" y2="${y}" class="tp-over"/>` : ''}${fin !== null ? `<line x1="${X(a)}" x2="${X(Math.min(fin, far))}" y1="${y}" y2="${y}" class="tp-way ${tone}"/>` : ''}${tg > a ? flag(tg, mon(tg), 'tg') : ''}${flag(end, mon(end), 'en')}<circle cx="${X(a)}" cy="${y}" r="5" class="tp-now"/>${fin !== null ? `<circle cx="${X(fin)}" cy="${y}" r="7" class="tp-fin ${tone}"/><text x="${X(fin)}" y="${dotClose ? y + 32 : y - 12}" class="tp-lbl b" text-anchor="middle">${mon(fin)}</text>` : `<circle cx="${X(a) + 40}" cy="${y}" r="5" class="tp-ghost"/>`}</svg></div>`;
        }
        // ---- the buffer gauge
        const delta = T.buffer - T.planned, bt = T.buffer < 0 || delta < -0.5 ? 'bad' : delta > 0.5 ? 'good' : '', pl = Math.max(1, T.planned), bf = Math.max(0, Math.min(1, T.buffer / (pl * 1.5))), mk = Math.min(1, pl / (pl * 1.5));
        const gauge = `<div class="tp-gauge ${bt}" ${tt(`Your buffer is ${Math.round(T.buffer)} days. ${delta < -0.5 ? dN(delta) + ' lost since the start.' : delta > 0.5 ? dN(delta) + ' gained.' : 'It is all yours.'}`, bt)}><span class="muted">Buffer</span><div class="tp-gtrack"><i style="width:${(bf * 100).toFixed(1)}%"></i><u style="left:${(mk * 100).toFixed(1)}%"></u></div><b class="num">${Math.round(T.buffer)} d</b><span class="tp-sh">${bt === 'bad' ? '▼' : bt === 'good' ? '▲' : '●'}</span></div>`;
        const sub = one ? (one.done >= one.goal - 0.05 ? 'Goal done' : N(one.goal - one.done) + ' to go') : goalItems.length ? (hit === goalItems.length ? 'All done' : goalItems.length - hit + ' to do') : PP.active.length ? 'No pace set' : 'Not started';
        return `<div class="card tp"><div class="tp-top"><div class="tp-ringwrap" ${tt(ringTell, ringTone)}>${ringSvg}</div><div class="tp-side"><div class="safe-lbl">Today</div><div class="tp-sub">${sub}</div><div class="tp-chips">${chips.slice(0, 3).join('')}</div></div></div>${strip}${tideLine()}${road}${gauge}</div>`;
    }
    // ---- today against yesterday, and where the last sitting ended
    function dayQty(n) { let q = 0, u = ''; D.logs.forEach(l => { if ((l.day ? E.dn(l.day) : E.dn(E.localKey(l.ts))) === n) { q += l.qty; const t = trackOf(l.goal); if (t && t.unit) u = t.unit; } }); return { q, u }; }
    function lastSitting() {
        const ls = D.logs.slice().sort((a, b) => b.ts - a.ts)[0]; if (!ls) return null;
        let at = 0; const evs = [];
        D.logs.filter(l => l.goal === ls.goal).forEach(l => evs.push({ ts: l.ts, q: l.qty }));
        (D.poses || []).filter(p => p.goal === ls.goal).forEach(p => evs.push({ ts: p.ts, pg: p.page }));
        evs.sort((a, b) => a.ts - b.ts).forEach(x => { if (x.pg !== undefined) at = x.pg; else at += x.q; });
        const t = trackOf(ls.goal);
        return { page: at, qty: ls.qty, unit: (t && t.unit) || 'pages', ts: ls.ts, goal: ls.goal };
    }
    function tideLine() {
        const a = dayQty(D.todayN), b = dayQty(D.todayN - 1), u = a.u || b.u || 'pages', mx = Math.max(a.q, b.q, 1) * 1.12;
        const ahead = a.q > b.q, diff = N(Math.abs(b.q - a.q));
        const note = a.q === 0 && b.q === 0 ? 'Start today' : ahead ? `▲ ${diff} more than yesterday` : a.q === b.q ? 'Same as yesterday' : `${diff} to match yesterday`;
        const say = `Today you did ${N(a.q)} ${u}. Yesterday you did ${N(b.q)}. ${a.q === 0 && b.q === 0 ? 'Nothing logged yet.' : ahead ? 'You are ahead of yesterday. The gold part is your extra.' : a.q === b.q ? 'The same as yesterday.' : diff + ' more ' + u + ' will match yesterday.'}`;
        const bp = b.q / mx * 100;
        return `<div class="tide" data-tell="${esc(say)}"><div class="tide-top"><span class="tide-n">${N(a.q)}</span><span class="tide-u">${esc(u)} today</span><span class="tide-d ${ahead ? 'good' : ''}">${note}</span></div><div class="tide-track"><i class="tide-fill" style="width:${Math.min(a.q, b.q) === a.q ? a.q / mx * 100 : a.q / mx * 100}%"></i>${ahead ? `<i class="tide-beat" style="left:${bp}%;width:${(a.q - b.q) / mx * 100}%"></i>` : ''}<b class="tide-mark" style="left:${bp}%;--sh:${bp < 14 ? '-10%' : bp > 86 ? '-90%' : '-50%'}"><em>yesterday ${N(b.q)}</em></b></div></div>`;
    }
    const whenWords = ts => {
        const d = new Date(ts), t0 = new Date().setHours(0, 0, 0, 0), days = Math.round((t0 - new Date(ts).setHours(0, 0, 0, 0)) / 864e5);
        const tm = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
        const day = days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 7 ? 'on ' + d.toLocaleDateString('en-GB', { weekday: 'long' }) : 'on ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
        return `${day} at ${tm}`;
    };
    function tornStrip() {
        const L = lastSitting(), next = () => { lineBump++; return pickLine(); };
        if (!L) return GBanner.html({ last: null, tips: prefs.lineOn, next });
                const txt = L.unit === 'pages' ? `You last stopped at page <b>${N(L.page)}</b>, ${whenWords(L.ts)}.` : `You last stopped at <b>${N(L.page)}</b> ${esc(L.unit)}, ${whenWords(L.ts)}.`;
        return GBanner.html({ last: { html: txt, tell: `Your last entry was ${N(L.qty)} ${L.unit}. Tap Log history to see all of them.`, act: 'hist' }, tips: prefs.lineOn, next });
    }
    function renderToday() {
        const el = $('s-today'); let h = '';
        const PP = P();
        if (!D.cfg) {
            h += `<div class="card"><h3>Welcome</h3><p class="hint">Tell the app when your JRF began and when you want the main work finished. Then build your thesis outline and tick off what you have already done. Everything else follows from that.</p><button class="btn-line btn-accent" data-act="cfg">Set up my timeline</button></div>`;
        } else {
            const T = D.thesis, J = D.jrf, hasPlan = PP.list.length > 0;
            if (!hasPlan) {
                h += `<div class="card"><h3>Next step</h3><p class="hint">Your timeline is set: ${dN(J.daysToTarget)} to the year-${J.target} target. Build your thesis outline in Plan and tick what you have already finished.</p><button class="btn-line btn-accent" data-act="goto" data-s="plan">Open Plan</button></div>`;
            } else {
                h += tornStrip() + todayPanel(PP, T, J);
            }
        }
        if (window.GWizard) h += GWizard.laterHTML();
        h += histCard();
        h += chainCard();
        if (PP.onTimeRun >= 3) h += `<div class="streak" data-sec="today:streak" style="margin:0 0 10px 4px">🔥 ${plural(PP.onTimeRun, 'piece')} in a row finished on time</div>`;
        if (PP.list.length && PP.pickMode) h += pickToday(PP);
        else if (PP.list.length) {
            h += `<div class="list-header"><span>Working on</span><span class="hint">tap Done on the day you finish</span></div>`;
            h += PP.active.length ? PP.active.map(nowCard).join('') : `<div class="card"><p class="hint">${PP.upcoming[0] ? `Done for today. Next is <b>${esc(pTitle(PP.upcoming[0]))}</b>, starting ${fmtDNum(PP.upcoming[0].start)}. You can press Start on it if you want to begin sooner.` : 'Everything is done. Well earned.'}</p>${PP.upcoming[0] ? `<button class="btn-line" data-act="pc" data-id="${PP.upcoming[0].id}">Open it</button>` : ''}</div>`;
            if (PP.upcoming.length) h += foldCard(`<div class="card"><h3>Coming up</h3>${PP.upcoming.map(p => `<div class="ledger-row" data-act="pc" data-id="${p.id}" style="cursor:pointer"><span>${esc(pTitle(p))}${p.locked ? ' 🔒' : ''}<span class="muted"> · ${p.days} d</span></span><span class="muted">${fmtDNshort(p.start)}</span></div>`).join('')}</div>`, 'tdy-up', PP.upcoming.length <= 2, plural(PP.upcoming.length, 'piece'));
        }
        if (PP.list.length && D.cfg && D.cfg.order === 'custom') h += `<button class="btn-line btn-accent" data-act="pick" style="margin-bottom:14px">Choose my next piece</button>`;
        const active = D.tasks.filter(t => t.started && !t.finished).sort((a, b) => (b.status === 'behind') - (a.status === 'behind'));
        if (active.length) h += `<div class="list-header"><span>Daily tasks</span><span class="hint">tap + to log</span></div><div id="cats">${active.map(taskRow).join('')}</div>`;
        const nx = D.life.flatMap(l => l.ms.filter(m => !m.done && m.due).map(m => ({ l, m }))).sort((a, b) => a.m.daysLeft - b.m.daysLeft)[0];
        if (nx) h += `<div class="card tap" data-sec="today:beyond-the-thesis" data-act="goto" data-s="life"><h3>Beyond the thesis</h3><div class="row"><span>${esc(nx.m.title)}</span><b class="num ${nx.m.daysLeft < 0 ? 'bad' : ''}">${nx.m.daysLeft < 0 ? dN(nx.m.daysLeft) + ' overdue' : nx.m.daysLeft === 0 ? 'today' : dN(nx.m.daysLeft)}</b></div><div class="hint">${esc(nx.l.title)}</div></div>`;
        put(el, h);
    }

    function recsList() {
        const r = [], PP = P(), T = D.thesis, J = D.jrf; if (!T) return r;
        PP.open.filter(p => p.status === 'late').sort((a, b) => b.lateDays - a.lateDays).slice(0, 3).forEach(p => r.push({ c: 'bad', h: `<b>${esc(pTitle(p))}</b> is ${dN(p.lateDays)} over its allotted time. Finish it, or decide honestly what is blocking it.` }));
        PP.tracks.filter(t => !t.finished && t.behind).slice(0, 2).forEach(t => r.push({ c: 'bad', h: `<b>${esc(D.goals.get(t.id).title)}</b>: ${N(t.done)} of ${N(t.total)} ${esc(t.unit)} done. At ${N(t.pace)} a day you finish ${fmtDNum(t.projN)}, ${dN(t.projN - t.deadline)} after ${fmtDNum(t.deadline)}. You need ${N(t.need)} a day.` }));
        if (T.toTarget > 0.5) {
            const need = PP.open.reduce((s, p) => s + p.days, 0), per = PP.open.length ? Math.max(0, J.daysToTarget) / PP.open.length : 0;
            r.push({ c: 'bad', h: `The plan as set runs ${dN(T.toTarget)} past your year-${J.target} target. To fit, the ${PP.open.length} open pieces would have to average ${N(per)} days each (they now average ${N(need / Math.max(1, PP.open.length))}). Shorten, merge or drop work worth about ${dN(T.toTarget)}, or accept using that much of the fifth year.` });
        }
        if (PP.paced >= 3 && PP.ratio > 1.1) r.push({ c: 'bad', h: `Over your last ${PP.paced} timed pieces you took ${N(PP.ratio)} times the days you allotted. At that real pace the thesis finishes ${fmtDNum(T.forecastN)}${T.forecastToTarget > 0 ? `, ${dN(T.forecastToTarget)} after the target` : ''}. Allot days you can really keep, or protect more time each day.` });
        else if (PP.paced >= 3 && PP.ratio < 0.9) r.push({ c: 'good', h: `You are finishing pieces in ${N(PP.ratio)} times your allotted days. Your estimates are generous; you could tighten them and bank more time.` });
        const lockedCh = [...new Set(PP.list.filter(p => p.lockWhy === 'reading' && !p.done).map(p => (chapOf(p.id) || {}).title).filter(Boolean))];
        if (PP.rdOpen > 0 && PP.list.some(p => p.lockWhy === 'edit' && !p.done)) r.push({ c: '', h: `Editing and proofreading are locked until all ${PP.rdOpen} remaining reading and drafting pieces are done.` });
        if (lockedCh.length) r.push({ c: '', h: `Drafting is locked until reading is done: ${lockedCh.slice(0, 3).map(esc).join(', ')}${lockedCh.length > 3 ? ' and more' : ''}.` });
        const worst = [...D.goals.values()].filter(g => g.chap).map(g => PP.agg.get(g.id)).filter(a => a && a.slip > 0.5).sort((a, b) => b.slip - a.slip)[0];
        if (worst) r.push({ c: 'bad', h: `The chapter dragging most is <b>${esc(D.goals.get(worst.id).title)}</b>, ${dN(worst.slip)} behind its plan.` });
        if (PP.earlyDays > 0 && prefs.gainOn) r.push({ c: 'good', h: `You have banked ${dN(PP.earlyDays)} by finishing pieces early.` });
        if (PP.onTimeRun >= 3) r.push({ c: 'good', h: `${PP.onTimeRun} pieces in a row on time. Keep the chain unbroken.` });
        const nx = PP.active[0] || PP.upcoming[0]; if (nx && !r.some(x => x.c === 'bad' && /over its allotted/.test(x.h))) r.push({ c: '', h: `Next: <b>${esc(pTitle(nx))}</b>, ${dN(nx.days)} allotted${nx.status === 'later' ? ', starting ' + fmtDNum(nx.start) : nx.status === 'ready' ? ', ready to start' : ''}.` });
        return r;
    }
    function renderOutlook() {
        if (!D.cfg) { $('s-out').innerHTML = '<div class="card"><p class="hint">Set your timeline first (Settings).</p></div>'; return; }
        const J = D.jrf, T = D.thesis, PP = P(); let h = '';
        const has = PP.list.length > 0;
        h += `<div class="card" data-sec="out:your-five-years"><h3>Your five years</h3>${timelineHtml()}
            <div class="row mt"><span class="muted">Year ${J.target} target</span><b class="num">${fmtDNum(J.targetN)}</b></div>
            <div class="row"><span class="muted">JRF ends</span><b class="num">${fmtDNum(J.endN)}</b></div>
            ${has ? `<div class="row"><span class="muted">Plan as set finishes</span><b class="num ${T.baseN > J.targetN ? 'bad' : 'good'}">${fmtDNum(T.baseN)}</b></div>
            <div class="row"><span class="muted">Finishes now, on allotted days</span><b class="num ${T.projN > T.baseN ? 'bad' : T.projN < T.baseN ? 'good' : ''}">${fmtDNum(T.projN)}</b></div>
            ${PP.paced >= 3 ? `<div class="row"><span class="muted">At your real pace (${N(PP.ratio)}×)</span><b class="num ${T.forecastN > T.projN ? 'bad' : ''}">${fmtDNum(T.forecastN)}</b></div>` : ''}` : ''}</div>`;
        h += learnedCard() + habitCard();
        if (has) {
            const net = T.slip;
            h += `<div class="card" data-sec="out:if-you-continue-like-this"><h3>If you continue like this</h3>
                <p class="${net > 0.5 || T.toTarget > 0.5 ? 'bad' : 'good'}" style="font-size:1.15rem;font-family:var(--font-serif)">${net > 0.5 ? `Delays have already cost ${dN(net)}. The fifth-year buffer is ${Math.round(T.buffer)} days, down from ${Math.round(T.planned)}.` : net < -0.5 ? `You are ${dN(-net)} ahead of the plan. The fifth-year buffer is ${Math.round(T.buffer)} days, up from ${Math.round(T.planned)}.` : `You are on the plan. The fifth-year buffer is ${Math.round(T.buffer)} days.`}${T.toTarget > 0.5 ? ` The work ends ${dN(T.toTarget)} after the year-${J.target} target.` : ''}</p>
                <p class="tight">Pieces follow one another on a single clock, so every day a piece runs over moves all later pieces. Each day a piece finishes early comes back as time.</p>`;
            [...D.goals.values()].filter(g => g.chap).sort((a, b) => a.id - b.id).forEach(c => { const a = PP.agg.get(c.id); if (!a || !a.count) return; const w = Math.min(100, Math.abs(a.slip) / 60 * 100); h += `<div class="env"><div class="top"><span>${esc(c.title)}</span><b class="${a.slip > 0.5 ? 'bad' : a.slip < -0.5 ? 'good' : ''}">${a.doneCount === a.count ? 'done' : slipText(a.slip)}</b></div><div class="slipbar"><i style="width:${a.doneCount === a.count ? 100 : w}%;background:${a.slip > 0.5 ? 'var(--warning)' : '#2da872'}"></i></div></div>`; });
            h += `</div>`;
            const ph = [['reading', 'Reading', '📖'], ['drafting', 'Drafting', '✍️'], ['editing', 'Editing and proofreading', '🔍']].map(([k, l, ico]) => { const ps = PP.list.filter(p => p.grp === k); if (!ps.length) return ''; const td = ps.reduce((s, p) => s + p.days, 0), dd = ps.filter(p => p.done).reduce((s, p) => s + p.days, 0); return `<div class="env"><div class="top"><span>${ico} ${l}</span><b>${pctTxt(dd / td)}</b></div><div class="slipbar"><i style="width:${dd / td * 100}%;background:linear-gradient(90deg,var(--blue-a),var(--blue-b))"></i></div><div class="meta muted" style="font-size:0.85rem">${ps.filter(p => p.done).length} of ${ps.length} pieces</div></div>`; }).join('');
            h += `<div class="card"><h3>Thesis progress</h3>${ph}<div class="hint mt">Progress is counted in allotted days, so a long piece weighs more than a short one.</div></div>`;
            const recs = recsList();
            if (recs.length) h += `<div class="card"><h3>What to do next</h3>${recs.map(x => `<div class="rec ${x.c}">${x.h}</div>`).join('')}</div>`;
            const late = PP.open.filter(p => p.status === 'late').sort((a, b) => b.lateDays - a.lateDays);
            if (late.length) h += `<div class="card"><h3>Overdue</h3>${late.map(p => `<div class="want tap" data-act="pc" data-id="${p.id}"><div class="row"><span>${esc(pTitle(p))}</span><b class="bad">${dN(p.lateDays)}</b></div><div class="meta muted" style="font-size:0.9rem">${esc((chapOf(p.id) || {}).title || 'Custom')} · due ${fmtDNum(p.due)}</div></div>`).join('')}</div>`;
        }
        const ledger = D.tasks.flatMap(t => t.ledger.map(l => ({ t, l })));
        if (ledger.length || D.leave.size || PP.rebases.length) {
            h += `<div class="card" data-sec="out:slip-ledger"><h3>Slip ledger</h3><p class="tight">Re-plans, re-baselines and leave days stay on record. The buffer only recovers by finishing work early.</p>
                ${PP.rebases.map(r => `<div class="ledger-row"><span>Plan re-baselined ${fmtK(E.localKey(r.ts))}</span><span>${dN(r.forgiven)} forgiven</span></div>`).join('')}
                ${ledger.map(({ t, l }) => `<div class="ledger-row"><span>${esc(t.g.title)} · re-planned ${fmtDNshort(l.dayN)}</span><span>${N(l.backlog)} ${esc(t.unit)} (${dN(l.slipDays)})</span></div>`).join('')}
                ${D.leaves.map(l => `<div class="ledger-row"><span>Leave ${fmtDNshort(E.dn(l.from))}${l.to !== l.from ? ' to ' + fmtDNshort(E.dn(l.to)) : ''}${l.reason ? ' · ' + esc(l.reason) : ''}</span><span class="muted">${dN(E.dn(l.to) - E.dn(l.from) + 1)}</span></div>`).join('')}</div>`;
        }
        if (has) h += `<button class="btn-line" data-act="rebase">Re-baseline the plan</button>`;
        put($('s-out'), h);
    }

    /* ---------- Settings: look ---------- */
    const LIGHT_LOOKS = () => [['flagship', GLook.FIXED.flagship.label, GLook.FIXED.flagship.sw], ['paper', 'Paper', '#f4efe0'], ['aurora', 'Aurora', 'linear-gradient(135deg,#7fd6ff,#b9a6ff 60%,#ffd9a8)']].concat(Object.keys(GLook.NATURE).map(k => { const n = GLook.NATURE[k]; return [k, n.label, `linear-gradient(160deg,${n.L[0]},${n.L[1]})`]; }));
    const DARK_LOOKS = () => Object.keys(GLook.FIXED).filter(k => GLook.FIXED[k].dark).map(k => [k, GLook.FIXED[k].label, GLook.FIXED[k].sw]);
    const lookGrid = list => `<div class="look-grid">${list.map(([k, l, c]) => `<button class="lk ${(prefs.look || 'flagship') === k ? 'on' : ''}" data-act="look" data-v="${k}" style="--sw:${c}">${l}</button>`).join('')}</div>`;
    const accOpen = k => (prefs.acc || []).indexOf(k) >= 0 ? 'open' : '';
    const pv = k => (prefs.p && prefs.p[k] !== undefined) ? prefs.p[k] : GLook.PAPER_DEFAULTS[k];
    const prSlider = (k, l, min, max, step, unit) => `<div class="bg-row"><span>${l}</span><input type="range" data-pr="${k}" min="${min}" max="${max}" step="${step}" value="${pv(k)}"><b class="bg-val" id="pr-${k}">${pv(k)}${unit || ''}</b></div>`;
    const prSelect = (k, l, opts) => `<div class="sw-row"><span>${l}</span><select class="set-select" data-prs="${k}">${opts.map(([v, t]) => `<option value="${v}" ${pv(k) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
    const prSwitch = (k, t) => `<div class="sw-row"><span>${t}</span><label class="switch"><input type="checkbox" data-prc="${k}" ${pv(k) ? 'checked' : ''}><i></i></label></div>`;
    function lookCard() {
        const look = prefs.look || 'flagship', dark = GLook.isDarkLook(look), isFl = look === 'flagship' || look === 'flagshipd';
        let hasBg = false; try { hasBg = !!localStorage.getItem(K_BG); } catch (e) {}
        let h = `<div class="card"><h3>Look</h3>` + GAcc.sec('look-l', 'Light themes', lookGrid(LIGHT_LOOKS()), !dark) + GAcc.sec('look-d', 'Dark themes', lookGrid(DARK_LOOKS()), dark);
        h += sw('follow', 'Follow my phone', 'Light or dark follows your phone. It goes to the last light or dark theme you used. Each theme stays exactly as designed.');
        if (isFl) {
            const acc = prefs.accent === 'gold' ? 'gold' : 'sapphire';
            h += GAcc.sec('look-fl', 'Flagship options', `<div class="sw-row"><span>Accent colour</span><div class="acc-sw"><button type="button" class="swatch ${acc === 'sapphire' ? 'on' : ''}" data-act="accent" data-v="sapphire" style="--sw:linear-gradient(135deg,#5c9fe6,#3560bd)">Sapphire</button><button type="button" class="swatch ${acc === 'gold' ? 'on' : ''}" data-act="accent" data-v="gold" style="--sw:linear-gradient(135deg,#f3d36e,#c9a43a)">Gold</button></div></div>
                ${sw('glow', 'Soft glow', 'A faint blue (or gold) glow on the lower edge of cards, and on buttons and progress bars.')}
                <div class="sw-row"><span>Letters</span><select class="set-select" data-pref="flFont">${GLook.FONTS.map(([v, t]) => `<option value="${v}" ${(prefs.flFont || 'system') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`, true);
        }
        if (look === 'aurora' || look === 'paper') h += `<details class="acc" data-acc="aur" ${accOpen('aur')}><summary>Aurora colours</summary><div class="acc-body"><div class="sw-row"><span>Palette</span><select class="set-select" data-pref="theme">${[['auto', 'Automatic (by time of day)']].concat(Object.keys(THEMES).map(k => [k, THEMES[k].label + (THEMES[k].part ? ' · ' + THEMES[k].part : '')])).map(([k, l]) => `<option value="${k}" ${prefs.theme === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><p class="hint">Sets the accent colours for Aurora and Paper.</p></div></details>`;
        if (look === 'paper') {
            const cur = pv('paperColor'), custom = pv('paperCustom');
            h += `<details class="acc" data-acc="pcol" ${accOpen('pcol')}><summary>Page colour</summary><div class="acc-body"><div class="sw-grid">${GLook.PAPERS.map(([k, l, lc, dc]) => `<button class="swatch ${cur === k ? 'on' : ''}" data-act="pr-set" data-k="paperColor" data-v="${k}" style="--sw:${dark ? dc : lc}">${l}</button>`).join('')}<button class="swatch ${cur === 'custom' ? 'on' : ''}" data-act="pr-set" data-k="paperColor" data-v="custom" style="--sw:${custom}">Custom</button></div>
                <label class="field"><span>Your own colour${dark ? ' (darkened automatically at night)' : ''}</span><input type="color" class="cpick" data-prcol="paperCustom" value="${custom}"></label>${prSwitch('texture', 'Paper texture (grain; fibres on Parched paper)')}</div></details>`;
            h += `<details class="acc" data-acc="ppat" ${accOpen('ppat')}><summary>Pattern: dots, graph or ruled</summary><div class="acc-body">${prSelect('pattern', 'Pattern', [['dots', 'Dot grid'], ['graph', 'Graph boxes'], ['ruled', 'Ruled lines (single rule)'], ['plain', 'Plain']])}
                ${pv('pattern') === 'plain' ? '' : prSlider('dotGap', 'Spacing', 10, 44, 1, ' px') + (pv('pattern') === 'dots' ? prSlider('dotSize', 'Dot size', 0.4, 3, 0.1, ' px') : '') + prSlider('dotAlpha', 'Opacity', 3, 70, 1, '%') + prSelect('ink', 'Ink', GLook.INKS.map(([k, l]) => [k, l]))}</div></details>`;
            h += `<details class="acc" data-acc="pmar" ${accOpen('pmar')}><summary>Margins</summary><div class="acc-body">${prSelect('mStyle', 'Margin lines', [['none', 'None'], ['single', 'Single line'], ['double', 'Double line']])}
                ${pv('mStyle') === 'none' ? '' : `<div class="sw-grid">${GLook.MARGINS.map(([k, l, c]) => `<button class="swatch dotm ${pv('mColor') === k ? 'on' : ''}" title="${l}" data-act="pr-set" data-k="mColor" data-v="${k}" style="--sw:rgb(${c.join(',')})"></button>`).join('')}</div>${prSwitch('mTop', 'Top margin')}${prSlider('mTopIn', 'Top margin depth', 0.6, 2, 0.1, ' in')}${prSwitch('mSide', 'Side margin')}`}</div></details>`;
        } else if (GLook.NATURE[look] || look === 'aurora') h += `<p class="hint">Choose Paper above to customise the page colour, dots, margins and texture.</p>`;
        h += `<details class="acc" data-acc="blur" ${accOpen('blur')}><summary>Blur and glass</summary><div class="acc-body">${slider('bg-blur', 'Background blur', 40, Math.min(40, prefs.bgBlur))}${slider('glass-blur', 'Glass frosting (cards and panels)', 30, Math.min(30, prefs.glassBlur))}<p class="hint">Background blur affects only the page behind everything. Glass frosting affects the cards, sheets and menu bar.</p></div></details>`;
        h += `<details class="acc" data-acc="bgp" ${accOpen('bgp')}><summary>Wallpaper photo and speed</summary><div class="acc-body"><button class="btn-line btn-accent" data-act="pick-bg">${hasBg ? 'Change' : 'Choose'} wallpaper photo</button>${hasBg ? '<button class="btn-line" data-act="clear-bg">Remove wallpaper</button>' : ''}${sw('lite', 'Lite mode', 'No blur or motion. Faster on older phones.')}</div></details></div>`;
        return h;
    }
    // a card whose body folds under its title with a triangle (state remembered); falls back to the plain card
    function foldCard(html, key, open, note) {
        const m = html.match(/^<div class="card([^"]*)">\s*<h3>([\s\S]*?)<\/h3>([\s\S]*)<\/div>\s*$/); if (!m || !window.GAcc) return html;
        return `<div class="card${m[1]}"><details class="gacc fc" data-gacc="${key}" ${GAcc.open(key, open) ? 'open' : ''}><summary><h3>${m[2]}</h3>${note ? `<span class="gacc-n">${note}</span>` : ''}</summary><div class="gacc-body">${m[3]}</div></details></div>`;
    }
    function renderSet() {
        const pin = pinOn();
        let h = `<div class="card"><h3>Timeline</h3>${D.cfg ? `<div class="row"><span class="muted">JRF began</span><b class="num">${fmtK(D.cfg.start)}</b></div><div class="row"><span class="muted">Main work due</span><b class="num">${fmtDNum(D.jrf.targetN)}</b></div>` : ''}<button class="btn-line btn-accent" data-act="cfg">${D.cfg ? 'Edit timeline' : 'Set up timeline'}</button><button class="btn-line" data-act="leave">Declare leave days</button>
            <div class="sw-row"><div><div>Work order</div><div class="set-meta">Chapter by chapter (reading and drafting), or all reading then all drafting. All editing and proofreading always comes last.</div></div><select class="set-select" data-cfgorder>${[['chapter', 'Chapter by chapter'], ['phase', 'Phase by phase'], ['custom', 'Custom: I choose the next piece']].map(([v, l]) => `<option value="${v}" ${((D.cfg && D.cfg.order) || 'chapter') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>`;
        h += lookCard();
        if (window.GLiquid) h += GLiquid.settingsHTML();
        h += foldCard(`<div class="card"><h3>Security</h3><p class="hint">The PIN keeps people out of the app. Backups are encrypted with their own password.</p>${pin ? sw('autoLock', 'Lock when I leave the app') : ''}<button class="btn-line" data-act="pin-set">${pin ? 'Change PIN' : 'Set a PIN'}</button>${pin ? '<button class="btn-line" data-act="pin-off">Remove PIN</button>' : ''}</div>`, 'set-sec', false);
        h += foldCard(`<div class="card"><h3>Backup</h3><p class="hint">${prefs.lastBackup ? 'Last backup ' + fmtDT(prefs.lastBackup) : 'Not backed up yet.'} Share opens your phone's share sheet: choose Google Drive or Proton Drive.</p><button class="btn-line btn-accent" data-act="backup" data-m="share">Back up now (share)</button><button class="btn-line" data-act="backup" data-m="download">Save to Downloads</button><button class="btn-line" data-act="backup" data-m="plain">Share unencrypted copy</button><button class="btn-line" data-act="restore">Restore from a file</button>${sw('rememberPass', 'Remember backup password', 'Stored on this phone only.')}<button class="btn-line" data-act="erase" style="color:var(--warning)">Erase everything</button></div>`, 'set-bak', true);
        let adv = '';
        adv += foldCard(`<div class="card"><h3>Experience</h3><div class="wz-chips" style="margin:4px 0 10px"><button type="button" class="wz-chip" data-wrun="setup">Run setup again</button><button type="button" class="wz-chip" data-wrun="tour">Replay the tour</button></div>${sw('introOn', 'Opening screen')}${sw('greetOn', 'Greeting by name')}${sw('lineOn', 'Tips in the top banner', 'Proverbs and tips slide in now and then.')}${sw('smartOn', 'Smart sections', 'Sections you rarely open fold under More. The app learns for two weeks first.')}${sw('animOn', 'Slow task glide')}${sw('lossOn', 'Show the cost of delay', 'Days lost from the buffer on Today.')}${sw('gainOn', 'Show the reward of early work', 'Days of freedom banked on Today.')}${sw('ageOn', 'Show my age on the Life tab', 'Needs your birth date in the timeline.')}${sw('remindOn', 'Evening and backup reminders', 'Banners in the app. A web app cannot ring while closed.')}</div>`, 'set-exp', false);
        adv += foldCard(dataCard(), 'set-data', false);
        if (window.GCompanion) adv += window.GCompanion.settingsHTML();
        if (window.GFeel) adv += window.GFeel.settingsHTML();
        h += `<details class="gacc" data-gacc="set-adv" ${window.GAcc && GAcc.open('set-adv', false) ? 'open' : ''}><summary><h3>Advanced</h3><span class="gacc-n">Sound, Companion, data, setup</span></summary><div class="gacc-body">${adv}</div></details>`;
        put($('s-set'), h);
        const bb = $('bg-blur'), gb = $('glass-blur');
        if (bb) bb.oninput = () => { prefs.bgBlur = +bb.value; $('bg-blur-v').textContent = bb.value; applyTheme(); persist(); };
        if (gb) gb.oninput = () => { prefs.glassBlur = +gb.value; $('glass-blur-v').textContent = gb.value; document.documentElement.style.setProperty('--glass-blur', gb.value + 'px'); persist(); };
        const co = document.querySelector('[data-cfgorder]'); if (co) co.onchange = async () => { if (await confirmSheet({ title: 'Change the work order?', sub: 'The chain of pieces is re-ordered. Original deadlines stay fixed, so some pieces may suddenly look late or early.', ok: 'Change' })) { add({ t: 'cfg', c: { order: co.value } }); } render(); };
    }

    /* ================= Version 4: daily paces, splitting, custom order ================= */
    const trackOf = pid => P().tracks.filter(t => t.scopeIds.indexOf(pid) >= 0).sort((a, b) => a.scopeIds.length - b.scopeIds.length)[0] || null;

    /* ================= Version 5: what the app learns, the companion, and live progress ================= */
    const MOODS = {
        glow: ['I am glowing. You worked today.', 'Good work today. Rest well.'],
        calm: ['Ready when you are.', 'One small step is enough to begin.'],
        dim: ['I miss your work. A small step keeps the chain.', 'A short session today is better than none.'],
        rest: ['Rest well. Your chain is safe while you are on leave.']
    };
    function orbMessage() {
        if (!IN) return 'Hello.';
        if (IN.atRisk) return `Your ${IN.streak}-day chain needs a little work today. One more missed day breaks it.`;
        if (IN.late && IN.mood === 'dim') return 'A piece is late. Finish it to get back on track.';
        const L = MOODS[IN.mood]; return L[Math.floor(Date.now() / 3600e3) % L.length];
    }
    let GC = null, lastScreen = null, lastDone = null, lastStreak = null;
    const SCREEN_ACT = { plan: 'read', out: 'present', life: 'think', set: 'stand' };
    function renderOrb() {
        const host = $('orb'); if (!host || !window.GCompanion) return;
        if (!GC) GC = window.GCompanion.create(host, { legacyPlace: prefs.orbMode, tip: () => (Math.random() < 0.5 ? orbMessage() : ''), busy: () => $('sheet-bg').classList.contains('show') });
        if (!IN) return;
        GC.mood({ glow: 'happy', calm: 'calm', dim: 'concerned', rest: 'sleepy' }[IN.mood] || 'calm');
        // small, purposeful reactions: a piece finished, a new chain milestone, a new screen
        const doneN = D.pieces.list.filter(p => p.done).length;
        if (lastDone !== null && doneN > lastDone) { GC.do('celebrate', { force: true }); GC.say('Piece finished. Good work.', 3400); fx('fanfare'); }
        lastDone = doneN;
        if (lastStreak !== null && IN.streak > lastStreak && (IN.streak === 7 || IN.streak === 30 || IN.streak === 100)) { GC.do('celebrate', { force: true }); GC.say(`${IN.streak} days in a row. Well done.`, 4200); fx('fanfare'); }
        if (lastStreak !== null && lastStreak > 2 && IN.streak === 0) { try { const k = 'gf_sad', t = new Date().toDateString(); if (localStorage.getItem(k) !== t) { localStorage.setItem(k, t); fx('sad'); } } catch (e) {} }
        lastStreak = IN.streak;
        if (screen !== lastScreen) { if (lastScreen && SCREEN_ACT[screen] && !GC.state().action) GC.do(SCREEN_ACT[screen]); lastScreen = screen; }
    }
    function companionReturns() {
        try {
            const last = +localStorage.getItem('gc_last') || 0; localStorage.setItem('gc_last', String(Date.now()));
            if (last && Date.now() - last > 6 * 3600e3 && GC && GCompanion.prefs.get().place !== 'off') { GC.wake(); setTimeout(() => GC.say('Welcome back.', 3200), 900); }
        } catch (e) {}
    }
    // numbers that count up when they first appear or change (not on the quiet minute refresh)
    const shown = {};
    function countUps() {
        document.querySelectorAll('[data-count]').forEach(el => {
            const to = parseFloat(el.dataset.count), k = el.dataset.ck || el.dataset.count, dec = +el.dataset.dec || 0;
            const fmtv = v => dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN');
            const from = shown[k] === undefined ? 0 : shown[k]; shown[k] = to;
            if (document.body.classList.contains('still') || from === to) { el.textContent = fmtv(to); return; }
            const t0 = performance.now(), ms = 900;
            const step = now => { const f = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - f, 3); el.textContent = fmtv(from + (to - from) * e); if (f < 1 && el.isConnected) requestAnimationFrame(step); };
            requestAnimationFrame(step);
        });
    }
    const mring = (frac, centre, sub) => { const f = Math.max(0, Math.min(1, frac)), L = 226.2; return `<div class="ring mring"><svg viewBox="0 0 80 80"><circle class="ring-track" cx="40" cy="40" r="36" fill="none" stroke-width="7"/><circle class="arc" cx="40" cy="40" r="36" fill="none" stroke-width="7" stroke-linecap="round" stroke="url(#mrG)" style="--v:${(f * L).toFixed(1)}"/><defs><linearGradient id="mrG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--blue-a)"/><stop offset="1" stop-color="var(--blue-b)"/></linearGradient></defs></svg><div class="ring-center"><div class="ring-pct">${centre}</div>${sub ? `<div class="ring-cap">${sub}</div>` : ''}</div></div>`; };
    const WDN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], WDS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    // the piece you are working on, in numbers and pictures
    function focusBlock(p) {
        const t = trackOf(p.id);
        if (!t) {
            const dayNo = Math.max(1, Math.min(p.days, D.todayN - p.start + 1)), left = Math.max(0, p.due - D.todayN);
            return `<div class="focus">${mring(dayNo / p.days, `${dayNo}/${p.days}`, 'days')}<div class="focus-t"><div><b>Day ${dayNo}</b> of ${p.days} allotted</div><div class="hint">${p.status === 'late' ? `${dN(p.lateDays)} over its time` : left === 0 ? 'Due today' : `${dN(left)} left`}</div>${IN && IN.learned[p.grp] && IN.learned[p.grp].ratio ? `<div class="hint">You usually take about ${N(p.days * IN.learned[p.grp].ratio)} days for this kind of piece.</div>` : ''}</div></div>`;
        }
        const today = IN ? IN.qtyOn(t.id, D.todayN) : 0, goal = t.need || t.pace || 0;
        const bars = []; for (let i = 6; i >= 0; i--) bars.push(IN ? IN.qtyOn(t.id, D.todayN - i) : 0);
        const mx = Math.max(goal, Math.max.apply(null, bars), 1);
        return `<div class="focus">${mring(t.pct, `<span data-count="${Math.round(t.pct * 100)}" data-ck="p${t.id}">${Math.round(t.pct * 100)}</span>%`, '')}<div class="focus-t"><div class="focus-big"><b data-count="${Math.round(t.done)}" data-ck="d${t.id}">${N(t.done)}</b> / ${N(t.total)} ${esc(t.unit)}</div><div class="hint">${N(t.remaining)} ${esc(t.unit)} to go</div></div></div>
            ${goal > 0 ? `<div class="row mt"><span class="muted">Today</span><span><b>${N(today)}</b> / ${N(goal)} ${esc(t.unit)}</span></div><div class="slipbar"><i class="grow" style="width:${Math.min(100, today / goal * 100)}%;background:linear-gradient(90deg,var(--blue-a),var(--blue-b))"></i></div>` : ''}
            <div class="bars7" aria-label="Last seven days">${bars.map((v, i) => `<div class="b7"><i class="${i === 6 ? 'today' : ''} ${goal > 0 && v >= goal ? 'hit' : ''}" style="height:${Math.max(4, v / mx * 100)}%;--d:${i * 70}ms"></i><span>${WDS[new Date((D.todayN - 6 + i) * 86400000).getUTCDay()]}</span></div>`).join('')}${goal > 0 ? `<div class="b7line" style="bottom:calc(${goal / mx * 100}% * .72 + 16px)"></div>` : ''}</div>`;
    }
    function chainCard() {
        if (!IN || (IN.act === 0 && !IN.restToday)) return '';
        const dots = IN.days28.slice(-7).map(d => `<i class="${d.on ? 'on' : d.rest ? 'rest' : ''} ${d.n === D.todayN ? 'now' : ''}"></i>`).join('');
        const msg = IN.atRisk ? `Work a little today to keep your chain. Another missed day would break it.` : IN.workedToday ? 'You worked today. The chain is safe.' : IN.restToday ? 'Leave day. Your chain waits for you.' : 'Work a little today to add a link.';
        const earned = IN.badges.filter(b => b.on);
        return `<div class="card chain" data-sec="today:chain"><div class="row"><div><div class="safe-lbl">Work chain</div><div class="chain-n"><span class="flame ${IN.streak >= 3 ? 'lit' : ''}">🔥</span><b data-count="${IN.streak}" data-ck="chain">${IN.streak}</b><span class="hint"> ${IN.streak === 1 ? 'day' : 'days'} · best ${IN.best}</span></div></div><div class="dots7">${dots}</div></div>
            <div class="hint mt">${msg}</div><div class="hint">One missed day is forgiven. Leave days never break the chain.</div>
            ${earned.length ? `<div class="badges">${earned.map(b => `<span class="chip good">★ ${esc(b.label)}</span>`).join('')}</div>` : ''}</div>`;
    }
    function chainStrip() {
        const PP = P(); if (!PP.list.length) return '';
        const seg = p => { const c = p.done ? 'done' : p.status === 'late' ? 'late' : p.lockWhy ? 'lk' : (P().pickMode ? p.picked : p.start <= D.todayN) ? 'now' : 'later'; return `<i class="${c}" style="flex:${p.days}" title="${esc(pTitle(p))}"></i>`; };
        return `<div class="card"><h3>The whole chain</h3><div class="cstrip">${PP.list.map(seg).join('')}</div>
            <div class="legend"><span><i class="done"></i>done</span><span><i class="now"></i>now</span><span><i class="late"></i>late</span><span><i class="later"></i>to come</span><span><i class="lk"></i>locked</span></div>
            <div class="hint mt">Each block is one piece. A wider block has more allotted days.</div></div>`;
    }
    function chapterBars() {
        const chs = [...D.goals.values()].filter(g => g.chap).sort((a, b) => a.id - b.id); if (!chs.length) return '';
        return `<div class="card"><h3>Chapters at a glance</h3>${chs.map((c, i) => { const a = P().nodeAgg(c.id); const late = a.slip > 0.5; return `<div class="chrow"><div class="row"><span>${esc(c.title)}</span><span class="muted">${a.doneCount}/${a.count}${late ? ` · <span class="bad">${dN(a.slip)} late</span>` : ''}</span></div><div class="slipbar"><i class="grow" style="--d:${i * 60}ms;width:${a.pct * 100}%;background:${late ? 'linear-gradient(90deg,var(--warning),#f0a35e)' : 'linear-gradient(90deg,var(--blue-a),var(--blue-b))'}"></i></div></div>`; }).join('')}</div>`;
    }
    function learnedCard() {
        if (!IN) return '';
        const GN = { reading: 'Reading', drafting: 'Drafting', editing: 'Editing and proofreading' };
        let h = `<div class="card"><h3>What the app has learned</h3>`;
        if (prefs.learnOn === false) return h + `<p class="hint">Learning is switched off in Settings.</p></div>`;
        const rows = window.GInsight.GROUPS.map(g => { const L = IN.learned[g]; return L.ratio === null ? `<div class="row"><span class="muted">${GN[g]}</span><span class="muted">needs ${window.GInsight.MIN_SAMPLES - L.n} more finished ${window.GInsight.MIN_SAMPLES - L.n === 1 ? 'piece' : 'pieces'}</span></div>` : `<div class="row"><span class="muted">${GN[g]}</span><b class="num ${L.ratio > 1.15 ? 'bad' : L.ratio < 0.85 ? 'good' : ''}">${N(L.ratio)}× your plan</b></div>`; }).join('');
        h += rows + `<div class="hint mt">The app compares the days you take with the days you allot. Newer pieces count more. It needs ${window.GInsight.MIN_SAMPLES} finished pieces of one kind before it learns.</div>`;
        IN.suggestions.forEach(s => {
            h += `<div class="sugg"><div><b>${GN[s.grp]}</b> takes you ${N(s.ratio)} times the days you allot.</div><div class="hint">${plural(s.pieces.length, 'piece')} not yet started would change by ${s.change > 0 ? '+' : ''}${s.change} days in total. Your first deadlines stay fixed, so the delay still shows.</div><div class="hint">${s.pieces.slice(0, 3).map(x => `${esc(x.title)} ${x.from}→${x.to}`).join(' · ')}${s.pieces.length > 3 ? ' …' : ''}</div><button class="btn-line btn-accent" data-act="sugg" data-g="${s.grp}">Use these days</button></div>`;
        });
        return h + '</div>';
    }
    // when in the day you work, and how fast you go, from the time of every entry
    function dayPartLine() {
        const B = [['morning', 5, 12, 0], ['afternoon', 12, 17, 0], ['evening', 17, 22, 0], ['night', 22, 29, 0]];
        const logs = D.logs.filter(l => l.qty > 0); if (logs.length < 6) return '';
        logs.forEach(l => { let h = new Date(l.ts).getHours(); if (h < 5) h += 24; const b = B.find(x => h >= x[1] && h < x[2]); if (b) b[3] += l.qty; });
        const tot = B.reduce((a, b) => a + b[3], 0); if (!tot) return '';
        const top = B.slice().sort((a, b) => b[3] - a[3])[0], perSit = tot / logs.length;
        return `<div class="hint mt">Most of your work happens in the <b>${top[0]}</b> (${Math.round(top[3] / tot * 100)}%). An average entry is ${N(perSit)} ${esc((trackOf(logs[0].goal) || {}).unit || 'pages')}.</div>`;
    }
    function habitCard() {
        if (!IN || prefs.learnOn === false) return '';
        if (IN.act < 5) return `<div class="card"><h3>Your work habits</h3><p class="hint">After about two weeks of entries, this card shows your strongest and weakest days.</p></div>`;
        const order = [1, 2, 3, 4, 5, 6, 0];
        const cells = IN.days28.map(d => `<i class="${d.on ? 'on' : d.rest ? 'rest' : ''}" title="${fmtDNum(d.n)}"></i>`).join('');
        return `<div class="card"><h3>Your work habits</h3><div class="bars7 wk">${order.map((w, i) => `<div class="b7"><i class="${IN.strong === w ? 'hit' : ''} ${IN.weak === w ? 'low' : ''}" style="height:${Math.max(4, IN.rate[w] * 100)}%;--d:${i * 70}ms"></i><span>${WDS[w]}</span></div>`).join('')}</div>
            ${IN.enough && IN.strong !== null ? `<div class="hint mt">You work most on <b>${WDN[IN.strong]}s</b> and least on <b>${WDN[IN.weak]}s</b>. Put your hardest piece on a ${WDN[IN.strong]}, and keep ${WDN[IN.weak]} for light tasks.</div>` : '<div class="hint mt">Your days look even so far. More entries will show a pattern.</div>'}
            <div class="heat mt">${cells}</div><div class="hint">Last 28 days. Filled squares are days you worked.</div>${dayPartLine()}</div>`;
    }

    /* ===== Recently deleted: entries removed in the last 30 days can be put back ===== */
    function deletedList() {
        const lim = Date.now() - 30 * 864e5;
        return events.filter(v => v.t === 'void' && v.del && v.ts >= lim && !events.some(r => r.t === 'restored' && r.target === v.id))
            .map(v => ({ v, e: events.find(x => x.id === v.target) })).filter(x => x.e).reverse();
    }
    function deletedSheet() {
        const L = deletedList();
        sheet(`<h2>Recently deleted</h2><p>Entries you deleted in the last 30 days. Restore puts one back exactly where it was.</p>${L.length ? `<div style="max-height:52vh;overflow:auto">${L.map(x => `<div class="ledger-row"><div style="min-width:0"><div>${esc((x.e.t==='pos'?'Note':logInfo(x.e.goal).title)+(x.e.qty!=null?', '+N(x.e.qty)+' '+logInfo(x.e.goal).unit:''))}</div><div class="meta">${esc(fmtDNum ? new Date(x.e.ts).toDateString() : '')}</div></div><button type="button" class="mini-btn" data-rest="${x.v.id}">Restore</button></div>`).join('')}</div>` : '<div class="empty"><b>Nothing deleted</b><p>Deleted entries will wait here for 30 days.</p></div>'}<div class="modal-actions"><button class="btn-secondary" data-act="close">Close</button></div>`, box => {
            box.querySelectorAll('[data-rest]').forEach(b => b.onclick = () => {
                const v = events.find(x => x.id === +b.dataset.rest), e0 = v && events.find(x => x.id === v.target); if (!e0) return;
                { const c = Object.assign({}, e0); delete c.id; delete c.ts; add(c, e0.ts); }; add({ t: 'restored', target: v.id }); render(); deletedSheet(); toast('Restored');
            });
        });
    }
    function dataCard() {
        let kb = 0; try { kb = Math.round((localStorage.getItem(K_EV) || '').length / 1024); } catch (e) {}
        return `<div class="card"><h3>Your data</h3><p class="hint">Every entry is saved on this phone only: ${events.length} entries, about ${kb} KB. The app learns from them here. Nothing is sent anywhere. Use Backup to keep a safe copy.</p><button type="button" class="btn-line" data-act="deleted">Recently deleted (${deletedList().length})</button>${sw('learnOn', 'Learn from my entries', 'Gives suggested days, habit insights and a work chain.')}</div>`;
    }
    function trackBlock(t, micro) {
        if (!t) return '';
        const bits = [];
        if (t.finished) bits.push(`<div class="pinfo">All ${N(t.total)} ${esc(t.unit)} done.</div>`);
        else {
            if (t.pace > 0 && t.projN !== null) bits.push(`<div class="hint">At ${N(t.pace)} ${esc(t.unit)} a day you finish ${fmtDNum(t.projN)}.</div>`);
            if (t.deadline !== null && t.need !== null) bits.push(t.behind ? `<div class="pwarn" style="margin-top:6px">That is ${dN(t.projN - t.deadline)} after ${fmtDNum(t.deadline)}. To make it you need ${N(t.need)} ${esc(t.unit)} a day${t.pace > 0 ? ' (you plan ' + N(t.pace) + ')' : ''}.</div>` : `<div class="hint">To finish by ${fmtDNum(t.deadline)} you need ${N(t.need)} ${esc(t.unit)} a day.</div>`);
            if (t.avg7 > 0) bits.push(`<div class="hint">Your last 7 days: ${N(t.avg7)} ${esc(t.unit)} a day.</div>`);
        }
        return `<div class="trk" style="margin-top:10px">${micro ? '' : `<div class="row"><span><b>${N(t.done)}</b> / ${N(t.total)} ${esc(t.unit)}</span><span class="muted">${pctTxt(t.pct)}</span></div><div class="slipbar"><i style="width:${t.pct * 100}%;background:linear-gradient(90deg,var(--blue-a),var(--blue-b))"></i></div>`}${bits.join('')}${t.finished ? '' : `<button class="btn-line btn-accent" data-act="tlog" data-id="${t.id}" style="margin-top:8px">Log ${esc(t.unit)} read or done today</button>`}</div>`;
    }
    /* ---------- backdating: forgot to log? pick another date (never in the future, never before the JRF began) ---------- */
    const dayOn = (b, day) => b.dataset.k === day || (b.dataset.k === 'other' && ![0, 1, 2].some(k => E.keyOf(D.todayN - k) === day));
    function daySegHtml(dayKeys) {
        const min = D.jrf ? E.keyOf(D.jrf.startN) : '';
        return `<div class="seg" id="l-day">${dayKeys.map((k, i) => `<button data-k="${k}">${['Today', 'Yesterday', '2 days ago'][i]}</button>`).join('')}<button data-k="other">Other date</button></div><div class="lg-date"><input type="date" id="l-date" ${min ? `min="${min}"` : ''} max="${todayKey()}" value=""><div class="hint">Pick the day you really did the work. It is marked "added later" and everything is recalculated.</div></div>`;
    }
    function bindDays(box, setDay, upd) {
        const di = box.querySelector('#l-date'), wrap = box.querySelector('.lg-date'), err = box.querySelector('#l-e'); if (!di) return;
        const mark = () => { upd(); if (wrap.classList.contains('on')) box.querySelectorAll('#l-day button').forEach(b => b.classList.toggle('on', b.dataset.k === 'other')); };
        box.querySelectorAll('#l-day button').forEach(b => b.onclick = () => {
            if (b.dataset.k === 'other') { wrap.classList.add('on'); if (di.value) setDay(di.value); else { try { di.focus(); di.showPicker && di.showPicker(); } catch (e) {} } }
            else { wrap.classList.remove('on'); setDay(b.dataset.k); if (err) err.textContent = ''; }
            mark();
        });
        di.onchange = () => {
            const v = di.value; if (!v) return;
            if (v > todayKey()) { if (err) err.textContent = 'That date is in the future'; di.value = ''; return; }
            if (di.min && v < di.min) { if (err) err.textContent = 'That is before your JRF began'; di.value = ''; return; }
            if (err) err.textContent = ''; setDay(v); mark();
        };
    }
    /* ---------- Log history: every entry by day, newest first. Edit an amount, delete a wrong entry (with Undo). Everything is recalculated. ---------- */
    const logInfo = id => { const tk = P().tracks.find(x => x.id === id), it = D.items.get(id), g = D.goals.get(id); return { title: tk || !it ? (g ? g.title : 'Removed task') : it.title, unit: tk ? tk.unit : it ? it.unit : (g && g.qunit) || 'units' }; };
    const histState = { filter: 0, days: 14 };
    function histEntries() {
        const out = [];
        D.logs.forEach(l => { const day = l.day || E.localKey(l.ts); out.push({ k: 'log', e: l, id: l.id, goal: l.goal, day, n: E.dn ? E.dn(day) : 0, ts: l.ts }); });
        (D.poses || []).forEach(l => { const day = l.day || E.localKey(l.ts); out.push({ k: 'pos', e: l, id: l.id, goal: l.goal, day, n: E.dn ? E.dn(day) : 0, ts: l.ts }); });
        return out;
    }
    function histSummary() {
        const all = histEntries().filter(x => x.k === 'log'); if (!all.length) return '';
        const tk = todayKey(), td = all.filter(x => x.day === tk), by = {};
        td.forEach(x => { const u = logInfo(x.goal).unit; by[u] = (by[u] || 0) + x.e.qty; });
        return td.length ? 'Today: ' + Object.keys(by).map(u => N(by[u]) + ' ' + u).join(', ') + ' · ' + plural(td.length, 'entry').replace(/entrys/, 'entries') : 'Last entry: ' + fmtK(all.sort((a, b) => b.ts - a.ts)[0].day);
    }
    function histCard() { const sm = histSummary(); return sm ? `<div class="card tap" data-sec="today:log-history" data-act="hist" data-tell="Everything you logged, by day. You can fix a wrong entry there."><h3>Log history</h3><div class="row"><span>${esc(sm)}</span><b>›</b></div></div>` : ''; }
    function historySheet(filterId, keep) {
        const prevScroll = keep ? $('sheet').scrollTop : 0;
        let all = histEntries(); if (filterId !== undefined && !keep) { histState.filter = filterId && all.some(x => x.goal === filterId) ? filterId : 0; histState.days = 14; }
        const goals = [...new Set(all.map(x => x.goal))].map(g => ({ g, title: logInfo(g).title })).sort((a, b) => a.title.localeCompare(b.title));
        if (histState.filter && !goals.some(x => x.g === histState.filter)) histState.filter = 0;
        if (histState.filter) all = all.filter(x => x.goal === histState.filter);
        all.sort((a, b) => (b.n - a.n) || (b.ts - a.ts));
        const minN = D.todayN - histState.days + 1, shown = all.filter(x => x.n >= minN), older = all.length - shown.length;
        const days = []; shown.forEach(x => { let d = days[days.length - 1]; if (!d || d.day !== x.day) { d = { day: x.day, list: [] }; days.push(d); } d.list.push(x); });
        const hd = d => { const by = {}, logs = d.list.filter(x => x.k === 'log'); logs.forEach(x => { const u = logInfo(x.goal).unit; by[u] = (by[u] || 0) + x.e.qty; });
            const nm = keyDate(d.day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', ''); return `${nm}${logs.length ? ' · ' + Object.keys(by).map(u => N(by[u]) + ' ' + u).join(', ') + ' · ' + (logs.length === 1 ? '1 entry' : logs.length + ' entries') : ''}`; };
        const tm = ts => new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
        const row = x => { const inf = logInfo(x.goal);
            if (x.k === 'pos') return `<div class="hl-row hl-pos" data-hid="${x.id}"><div class="hl-main"><span class="hl-t">${tm(x.ts)}</span> <b>${esc(inf.title)}</b><div class="hint">Note: last ${unitWord(inf.unit, 1)} finished was ${N(x.e.page)}. Not counted as work.</div></div><div class="hl-b">${icoBtn('del', 'data-hact="del"', 'this note')}</div></div>`;
            return `<div class="hl-row" data-hid="${x.id}"><div class="hl-main"><span class="hl-t">${tm(x.ts)}</span> <b>${esc(inf.title)}</b>${x.e.late ? '<span class="lg-late">added later</span>' : ''}<div class="hl-amt"><b>${N(x.e.qty)}</b> ${esc(inf.unit)}</div></div><div class="hl-b">${icoBtn('edit', 'data-hact="edit"', 'this entry')}${icoBtn('del', 'data-hact="del"', 'this entry')}</div></div>`; };
        sheet(`<h2>Log history</h2><p class="hint">Newest first. Fix a wrong amount or delete a wrong entry. Everything is recalculated.</p>
            ${goals.length > 1 ? `<label class="field"><span>Show</span><select id="hl-f"><option value="0">All tasks</option>${goals.map(x => `<option value="${x.g}" ${x.g === histState.filter ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label>` : ''}
            ${days.length ? days.map(d => `<div class="hl-day">${esc(hd(d))}</div>${d.list.map(row).join('')}`).join('') : '<div class="empty"><span class="em-ico">🌱</span><b>Nothing logged in this period</b><p>Entries you log on Today will appear here.</p></div>'}
            ${older > 0 ? `<button type="button" class="btn-line" id="hl-more">Show older (${older})</button>` : ''}
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Close</button></div>`, box => {
            box.scrollTop = prevScroll;
            const f = box.querySelector('#hl-f'); if (f) f.onchange = () => { histState.filter = +f.value; histState.days = 14; historySheet(undefined, true); };
            const mo = box.querySelector('#hl-more'); if (mo) mo.onclick = () => { histState.days += 14; historySheet(undefined, true); };
            box.querySelectorAll('.hl-row').forEach(r => {
                const id = +r.dataset.hid, ent = all.find(x => x.id === id); if (!ent) return;
                const del = r.querySelector('[data-hact="del"]'), ed = r.querySelector('[data-hact="edit"]'), e0 = ent.e;
                del.onclick = async () => {
                    const inf0 = logInfo(ent.goal);
                    if (!(await confirmSheet({ title: 'Delete this entry?', sub: ent.k === 'pos' ? 'This note will be removed.' : `${N(e0.qty)} ${inf0.unit} will be removed and your totals recalculated. You can undo straight after.`, ok: 'Delete', danger: true }))) { historySheet(undefined, true); return; }
                    add({ t: 'void', target: id, del: 1 }); render(); historySheet(undefined, true); if (window.GFeel) GFeel.moment('down');
                    const inf = logInfo(ent.goal);
                    toast(ent.k === 'pos' ? 'Note deleted.' : `Deleted ${N(e0.qty)} ${inf.unit}. Everything is recalculated.`, () => { const c = Object.assign({}, e0); delete c.id; delete c.ts; add(c, e0.ts); render(); if ($('sheet-bg').classList.contains('show') && $('sheet').querySelector('.hl-day')) historySheet(undefined, true); });
                };
                if (ed) ed.onclick = () => {
                    const amt = r.querySelector('.hl-amt'), inf = logInfo(ent.goal);
                    amt.innerHTML = `<input type="number" inputmode="decimal" step="any" min="0" class="hl-in" value="${e0.qty}"> ${esc(inf.unit)} <button type="button" class="mini-btn btn-accent" data-hact="ok">Save</button> <button type="button" class="mini-btn" data-hact="cancel">Cancel</button>`;
                    ed.style.display = 'none'; const inp = amt.querySelector('input'); inp.focus(); inp.select();
                    amt.querySelector('[data-hact="cancel"]').onclick = () => historySheet(undefined, true);
                    amt.querySelector('[data-hact="ok"]').onclick = () => {
                        const v = parseFloat(inp.value); if (!(v > 0)) { toast('Enter an amount above 0'); return; }
                        if (v === e0.qty) { historySheet(undefined, true); return; }
                        add({ t: 'void', target: id }); const c = Object.assign({}, e0); delete c.id; delete c.ts; c.qty = v; const ne = add(c, e0.ts); render(); historySheet(undefined, true); if (window.GFeel) GFeel.moment('save');
                        toast(`Changed ${N(e0.qty)} to ${N(v)} ${inf.unit}. Everything is recalculated.`, () => { add({ t: 'void', target: ne.id }); const o = Object.assign({}, e0); delete o.id; delete o.ts; add(o, e0.ts); render(); if ($('sheet-bg').classList.contains('show') && $('sheet').querySelector('.hl-day')) historySheet(undefined, true); });
                    };
                };
            });
        });
    }
    function trackLogSheet(id) {
        const t = P().tracks.find(x => x.id === id); if (!t) return;
        let amt = '', day = todayKey(); const dayKeys = [0, 1, 2].map(k => E.keyOf(D.todayN - k));
        const isPg = /^(pages|steps|sections)$/.test(t.unit), base = Math.floor(t.done + 1e-9), pgLast = Math.min(t.total, base + 30);
        sheet(`<h2>${esc(D.goals.get(id).title)}</h2><div class="hint">${esc(pathOf(id))}</div>
            <div class="amt-disp" id="l-amt"></div>${isPg ? `<div class="pg-wrap"><div class="pg-cap"><span>Tap the last ${unitWord(t.unit, 1)} you finished</span><button class="pg-edit" type="button" id="pg-edit">Last finished: <b>${N(base)}</b> · change</button></div><div class="pg-row" id="pg-row"></div><div class="pg-ind" id="pg-ind"><i></i></div><div class="pg-sw" id="pg-sw"></div></div>` : ''}${daySegHtml(dayKeys)}
            <div class="grid2 mt" id="l-q"></div><div class="keypad" id="l-pad"></div><div class="error" id="l-e"></div><button type="button" class="pg-edit hl-link" data-act="hist" data-id="${id}">Log history</button>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="l-go">Log</button></div>`, box => {
            const disp = box.querySelector('#l-amt'), pgRow = box.querySelector('#pg-row');
            const selOf = () => { const q = parseFloat(amt); return q > 0 && Math.abs(q - Math.round(q)) < 1e-9 ? base + Math.round(q) : 0; };
            // a strip of short, wide pages: about five show at once, swipe for up to 30 ahead. Built once so the swipe position is kept.
            const pgInd = box.querySelector('#pg-ind'), pgSw = box.querySelector('#pg-sw');
            if (pgRow) {
                let h = ''; for (let n = base + 1; n <= pgLast; n++) h += `<button type="button" class="pg" data-p="${n}" data-i="${n - base - 1}" aria-label="${unitWord(t.unit, 1)} ${n}"><i>${n}</i></button>`;
                pgRow.innerHTML = h;
                const ind = () => { const w = pgRow.scrollWidth, c = pgRow.clientWidth; if (!pgInd) return; if (w <= c + 2) { pgInd.style.display = 'none'; if (pgSw) pgSw.textContent = ''; return; } const f = c / w, x = pgRow.scrollLeft / (w - c); pgInd.firstChild.style.width = (f * 100).toFixed(1) + '%'; pgInd.firstChild.style.left = (x * (1 - f) * 100).toFixed(1) + '%'; };
                pgRow.addEventListener('scroll', ind, { passive: true }); setTimeout(ind, 30); if (pgSw && pgLast - base > 5) pgSw.textContent = 'Swipe sideways for more ' + t.unit + ' (up to ' + N(pgLast) + ')';
            }
            const drawPg = () => { if (!pgRow) return; const sel = selOf(); pgRow.querySelectorAll('.pg').forEach(b => b.classList.toggle('on', !!sel && +b.dataset.p <= sel)); };
            if (pgRow) {
                pgRow.onclick = e => {
                    const pb = e.target.closest('[data-p]'); if (!pb) return; const n = +pb.dataset.p, sel = selOf();
                    amt = sel === n ? '' : String(n - base); upd();
                    if (sel !== n && window.GFeel) GFeel.moment('turn', (+pb.dataset.i) % 7);
                };
                const pe = box.querySelector('#pg-edit'); if (pe) pe.onclick = () => { closeSheet(); setTimeout(() => posSheet(id), 60); };
            }
            const upd = () => { disp.textContent = (amt || '0') + ' ' + t.unit; box.querySelectorAll('#l-day button').forEach(b => b.classList.toggle('on', dayOn(b, day))); drawPg(); };
            const q = []; if (t.pace > 0) q.push([t.pace, `My daily ${N(t.pace)}`]); if (t.need > 0 && t.need !== t.pace) q.push([t.need, `Needed ${N(t.need)}`]); q.push([t.remaining, `All remaining ${N(t.remaining)}`]);
            box.querySelector('#l-q').innerHTML = q.slice(0, 3).map(([v, l]) => `<button class="mini-btn" data-q="${v}">${l}</button>`).join('');
            box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { amt = String(Math.round(+b.dataset.q * 10) / 10); upd(); });
            buildPad(box.querySelector('#l-pad'), k => {
                if (k === '⌫') amt = amt.slice(0, -1); else if (k === '.') { if (amt.indexOf('.') < 0) amt = (amt || '0') + '.'; } else if (amt.replace('.', '').length < 6) amt += k;
                if (amt === '0' || amt === '00') amt = ''; upd();
            }, true);
            bindDays(box, v => { day = v; }, upd); upd();
            box.querySelector('#l-go').onclick = () => {
                const v = parseFloat(amt); if (!(v > 0)) { box.querySelector('#l-e').textContent = 'Enter an amount'; return; }
                const ev = add({ t: 'log', goal: id, qty: v, day, late: day !== todayKey() }); closeSheet(); render();
                const n = P().tracks.find(x => x.id === id);
                { const g = Math.max(n.pace || 0, n.need || 0), dq = IN ? IN.qtyOn(id, D.todayN) : 0; fx(n.finished ? 'fanfare' : (g > 0 && dq >= g - 0.05) ? (dq - v >= g - 0.05 ? 'bonus' : 'goalmet') : 'reward'); }
                toast(`+${N(v)} ${t.unit}. ` + (n.finished ? 'Finished: the pieces are ticked done.' : `${N(n.remaining)} to go${n.need > 0 && n.deadline !== null ? ', ' + N(n.need) + ' a day to make ' + fmtDNshort(n.deadline) : ''}.`), () => { add({ t: 'void', target: ev.id }); render(); fx('down'); });
            };
        });
    }
    /* ---------- "Last page I finished": where you are. It is a note, never work done today ---------- */
    function savePos(id, v) {
        const t = P().tracks.find(x => x.id === id); if (!t) return; const w = unitWord(t.unit, 1);
        const ev = add({ t: 'pos', goal: id, page: v, day: todayKey() }); render();
        toast(`Noted. Last ${w} finished: ${N(v)}. This is not counted as work today.`, () => { add({ t: 'void', target: ev.id }); render(); });
    }
    function posSheet(id) {
        const t = P().tracks.find(x => x.id === id); if (!t) return; const w = unitWord(t.unit, 1);
        sheet(`<h2>Last ${w} I finished</h2><p>${esc(D.goals.get(id).title)}. The app counts ${N(t.done)} of ${N(t.total)} ${esc(t.unit)} so far. Tell it the last ${w} you really finished. Your ${t.unit} for today stay as logged.</p>
            <label class="field"><span>Last ${w} finished</span><input type="number" inputmode="numeric" id="ps-n" value="${Math.floor(t.done + 1e-9)}" min="0" max="${t.total}"></label><div class="error" id="ps-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="ps-go">Save</button></div>`, box => {
            box.querySelector('#ps-go').onclick = () => { const v = parseFloat(val(box, '#ps-n')); if (!(v >= 0) || v > t.total) { box.querySelector('#ps-e').textContent = `Enter a number from 0 to ${N(t.total)}`; return; } closeSheet(); savePos(id, Math.round(v)); };
        });
    }
    // the character asks only when the app is unsure: no entry for 3 or more days on a task that is under way. At most once a day for each task.
    function maybeAskPosition() {
        try {
            if (!GC || !GC.ask || screen !== 'today' || !D || !D.cfg || $('sheet-bg').classList.contains('show') || $('lock').classList.contains('show') || (GC.asking && GC.asking())) return;
            const PP = P(), asked = prefs.posAsk || {};
            const t = PP.tracks.find(x => !x.finished && /^(pages|steps|sections)$/.test(x.unit) && PP.active.some(p => { const o = trackOf(p.id); return o && o.id === x.id; }) && x.lastLogN !== null && D.todayN - Math.max(x.lastLogN, x.posN === null ? -1e9 : x.posN) >= 3 && asked[x.id] !== todayKey());
            if (!t) return; prefs.posAsk = Object.assign({}, asked, { [t.id]: todayKey() }); persist();
            const w = unitWord(t.unit, 1);
            GC.ask(`What is the last ${w} you finished in ${D.goals.get(t.id).title}?`, { value: Math.floor(t.done + 1e-9), max: t.total, onSave: v => savePos(t.id, Math.round(v)) });
        } catch (e) {}
    }
    function trackSheet(id) {
        const g = D.goals.get(id); if (!g) return;
        const t = P().tracks.find(x => x.id === id), unitDef = t ? t.unit : (g.grp === 'reading' ? 'pages' : 'steps');
        const logs = D.logs.filter(l => l.goal === id).sort((a, b) => b.ts - a.ts).slice(0, 5);
        const scope = [...D.pieces.list].filter(p => { let x = p.g; while (x) { if (x.id === id) return true; x = x.parent ? D.goals.get(x.parent) : null; } return false; }).filter(p => !p.done);
        sheet(`<h2>Daily pace</h2><p><b>${esc(g.title)}</b>. Log ${g.grp === 'reading' ? 'the pages you read' : 'the amount you finish'} each day. When the total is reached, ${scope.length > 1 ? 'all ' + scope.length + ' pieces inside are' : 'the piece is'} ticked done on that day.</p>
            <div class="grid2"><label class="field"><span>Total</span><input type="number" inputmode="decimal" id="k-n" value="${t ? t.total : ''}" placeholder="246"></label><label class="field"><span>Counted in</span><select id="k-u">${['pages', 'steps', 'sections', 'words', 'hours'].map(u => `<option ${u === unitDef ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div>
            <div class="grid2"><label class="field"><span>My pace each day</span><input type="number" inputmode="decimal" id="k-p" value="${t && t.pace ? t.pace : ''}" placeholder="15"></label>${t ? '<div></div>' : '<label class="field"><span>Already done</span><input type="number" inputmode="decimal" id="k-d" value="0"></label>'}</div>
            ${scope.length ? '<label class="field check"><input type="checkbox" id="k-a" checked><span>Set the pieces\' allotted days from this pace (the first gets the days, the others one day each, because they finish together)</span></label>' : ''}
            <div id="k-pv"></div><div class="error" id="k-e"></div>
            ${logs.length ? `<div class="set-title" style="margin-top:10px">Recent</div>${logs.map(l => `<div class="ledger-row"><span>${fmtK(l.day || E.localKey(l.ts))}${l.late ? '<span class="lg-late">added later</span>' : ''}</span><span><b>${N(l.qty)}</b> <button class="mini-btn" data-act="void" data-id="${l.id}">Undo</button></span></div>`).join('')}` : ''}
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="k-go">Save</button>${t ? '<button class="btn-extra" id="k-off">Remove pace</button>' : ''}</div>`, box => {
            const pv = () => { const n = numv(box, '#k-n'), p = numv(box, '#k-p'), d = t ? t.done : (numv(box, '#k-d') || 0); const el = box.querySelector('#k-pv'); el.innerHTML = n > 0 && p > 0 ? `<div class="pinfo">${N(Math.max(0, n - d))} left at ${N(p)} a day takes ${dN(Math.ceil(Math.max(0, n - d) / p))}.</div>` : ''; };
            box.querySelectorAll('input').forEach(i => i.oninput = pv); pv();
            box.querySelector('#k-go').onclick = () => {
                const n = numv(box, '#k-n'), p = numv(box, '#k-p'), u = val(box, '#k-u'), e = box.querySelector('#k-e');
                if (!(n > 0)) { e.textContent = 'Enter the total'; return; } if (!(p > 0)) { e.textContent = 'Enter your pace per day'; return; }
                add({ t: 'goal', op: 'edit', gid: id, f: { qty: n, qunit: u, qpace: p } });
                const d0 = t ? 0 : (numv(box, '#k-d') || 0); if (d0 > 0) add({ t: 'log', goal: id, qty: Math.min(d0, n), day: todayKey() });
                const done = (t ? t.done : 0) + Math.min(d0, n), a = box.querySelector('#k-a');
                if (a && a.checked && scope.length) { const days = Math.max(1, Math.ceil(Math.max(0, n - done) / p)); scope.forEach((q, i) => add({ t: 'goal', op: 'edit', gid: q.id, f: { pdays: i === 0 ? days : 1 } })); }
                closeSheet(); render(); toast('Daily pace saved');
            };
            const off = box.querySelector('#k-off'); if (off) off.onclick = async () => { if (await confirmSheet({ title: 'Remove this daily pace?', sub: 'The pages you logged stay on record but no longer finish the pieces.', ok: 'Remove', danger: true })) { add({ t: 'goal', op: 'edit', gid: id, f: { qty: 0 } }); closeSheet(); render(); } };
        });
    }
    function splitSheet(id) {
        const p = P().byId.get(id); if (!p || p.done) return;
        sheet(`<h2>Split into sub-sections</h2><p><b>${esc(pTitle(p))}</b> becomes several smaller pieces, each ticked done on its own day. The ${dN(p.days)} are shared out; change any of them afterwards.</p>
            <div class="grid2"><label class="field"><span>How many sub-sections</span><input type="number" inputmode="numeric" id="x-n" value="3" min="2" max="12"></label><label class="field"><span>Days for each</span><input type="number" inputmode="numeric" id="x-d" value="${Math.max(1, Math.ceil(p.days / 3))}"></label></div>
            <div class="error" id="x-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="x-go">Split</button></div>`, box => {
            const nn = box.querySelector('#x-n'); nn.oninput = () => { const n = Math.round(+nn.value); if (n >= 2) box.querySelector('#x-d').value = Math.max(1, Math.ceil(p.days / n)); };
            box.querySelector('#x-go').onclick = () => {
                const n = Math.round(numv(box, '#x-n')), d = Math.round(numv(box, '#x-d')); if (!(n >= 2 && n <= 12)) { box.querySelector('#x-e').textContent = 'Choose 2 to 12 sub-sections'; return; } if (!(d >= 1)) { box.querySelector('#x-e').textContent = 'Allot at least one day'; return; }
                add({ t: 'goal', op: 'edit', gid: id, f: { kind: 'project' } });
                commit(id, Array.from({ length: n }, (_, i) => pc(`Sub-section ${i + 1} of ${n}`, d)));
                if ((D.pieces.picks || []).includes(id)) { const first = [...D.goals.values()].filter(g => g.parent === id).sort((x, y) => x.id - y.id)[0]; if (first) add({ t: 'next', goal: first.id }); }
                prefs.open = (prefs.open || []).concat([id]); persist(); closeSheet(); render(); toast(`Split into ${n}. Tick each when you finish it.`);
            };
        });
    }
    function pickSheet() {
        const chs = [...D.goals.values()].filter(g => g.chap).sort((a, b) => a.id - b.id);
        const open = P().open.filter(p => !p.locked);
        const rows = chs.map(c => { const ps = open.filter(p => p.chapter === c.id); return ps.length ? `<div class="set-title" style="margin-top:10px">${esc(c.title)}</div>${ps.slice(0, 40).map(p => `<div class="ledger-row" data-act="${P().pickMode ? 'begin' : 'next'}" data-id="${p.id}" style="cursor:pointer"><span>${esc(pTitle(p))}<span class="muted"> · ${esc(pathOf(p.parent).split(' › ').slice(1, 2).join(''))} · ${p.days} d</span></span><span class="muted">Pick</span></div>`).join('')}` : ''; }).join('');
        const loose = open.filter(p => p.chapter === null).map(p => `<div class="ledger-row" data-act="${P().pickMode ? 'begin' : 'next'}" data-id="${p.id}" style="cursor:pointer"><span>${esc(pTitle(p))}</span><span class="muted">Pick</span></div>`).join('');
        sheet(`<h2>What will you do next?</h2><p>${P().pickMode ? 'Pick any piece that is not done. Its clock starts today, and the app will ask how you want to break it down.' : 'Pick any piece that is not done. It moves to the front of the chain and its clock starts the day after your current piece finishes.'} Locked drafting is not listed until its reading is done.</p><div style="max-height:52vh;overflow:auto">${rows}${loose ? '<div class="set-title" style="margin-top:10px">Custom tasks</div>' + loose : ''}${!rows && !loose ? '<p class="hint">Nothing left to pick.</p>' : ''}</div><div class="modal-actions"><button class="btn-secondary" data-act="close">Close</button></div>`);
    }

    let IN = null, quiet = false;
    function refresh() {
        D = E.derive(events, Date.now());
        try { IN = window.GInsight.analyse(events, D, E); if (prefs.learnOn === false) { IN.suggestions = []; } } catch (e) { IN = null; }
        return D;
    }
    function render() {
        if (!render.gs && window.GSections) { render.gs = 1; GSections.init({ app: 'goal', enabled: () => prefs.smartOn !== false }); }
        lockPass(); applyTheme(); renderBanner();
        $('brand-sub').textContent = (prefs.greetOn ? greeting() + ' · ' : '') + fmtK(todayKey());
        document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.s === screen));
        document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + screen));
        document.body.classList.toggle('still', quiet || prefs.animOn === false || reduced());
        ({ today: renderToday, plan: renderPlan, out: renderOutlook, life: renderLife, set: renderSet })[screen]();
        renderOrb(); countUps();
    }

    /* ---------- Sheets ---------- */
    const WD = [[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']];
    function cfgSheet() {
        const c = D.cfg || {};
        const sel = (id, from, to, v) => `<select id="${id}">${Array.from({ length: to - from + 1 }, (_, i) => from + i).map(n => `<option ${n === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
        sheet(`<h2>Your timeline</h2><p>The JRF dates set the frame. Everything else is measured against it.</p>
            <label class="field"><span>JRF start date</span><input type="date" id="c-s" value="${c.start || ''}" autofocus></label>
            <div class="grid2"><label class="field"><span>JRF length (years)</span>${sel('c-y', 3, 6, c.years || 5)}</label><label class="field"><span>Finish the main work in (years)</span>${sel('c-t', 1, 5, c.target || 4)}</label></div>
            <label class="field"><span>Date of birth (optional, only for the age line)</span><input type="date" id="c-b" value="${c.birth || ''}"></label>
            <label class="field"><span>My fifth year is for…</span><input type="text" id="c-p" maxlength="120" value="${esc(c.purpose || '')}" placeholder="rest, family, finishing well, starting a life"></label>
            <div class="error" id="c-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="c-go">Save</button></div>`, box => {
            box.querySelector('#c-go').onclick = () => {
                const start = val(box, '#c-s'), years = +val(box, '#c-y'), target = +val(box, '#c-t');
                if (!start) { box.querySelector('#c-e').textContent = 'Choose the JRF start date'; return; }
                if (target >= years) { box.querySelector('#c-e').textContent = 'The main work must finish before the JRF ends'; return; }
                add({ t: 'cfg', c: { start, years, target, birth: val(box, '#c-b'), purpose: val(box, '#c-p').trim(), startMode: (D.cfg && D.cfg.startMode) || 'pick' } });
                closeSheet(); render(); toast('Timeline saved');
            };
        });
    }
    function taskSheet(id, parentPref) {
        const t = id ? D.goals.get(id) : null;
        const g = t || { title: '', unit: 'pages', total: '', perDay: '', days: E.WORK_DEFAULT.slice(), start: todayKey(), parent: parentPref || '' };
        const days = new Set(g.days);
        sheet(`<h2>${id ? 'Edit' : 'New'} task</h2>
            <label class="field"><span>What will you do?</span><input type="text" id="t-t" value="${esc(g.title)}" placeholder="Read Gurnah, Afterlives" autofocus></label>
            <div class="grid2"><label class="field"><span>Chapter / project</span><select id="t-p"><option value="">None</option>${D.projects.filter(p => !p.isPhase).map(p => `<option value="${p.id}" ${p.id === g.parent ? 'selected' : ''}>${esc(pathOf(p.id))}</option>`).join('')}</select></label>
            <label class="field"><span>Counted in</span><select id="t-u">${['pages', 'words', 'hours', 'sessions', 'items'].map(u => `<option ${u === g.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div>
            <div class="grid2"><label class="field"><span>Total to do</span><input type="number" inputmode="decimal" id="t-n" value="${g.total}"></label><label class="field"><span>Each working day</span><input type="number" inputmode="decimal" id="t-d" value="${g.perDay}"></label></div>
            <div class="grid2"><label class="field"><span>or hours a day</span><input type="number" inputmode="decimal" id="t-h" placeholder="3"></label><label class="field"><span>× amount per hour</span><input type="number" inputmode="decimal" id="t-ph" placeholder="5"></label></div>
            <div class="safe-lbl" style="margin-bottom:6px">Working days</div><div class="days-chips" id="t-days">${WD.map(([n, l]) => `<button type="button" data-d="${n}" class="${days.has(n) ? 'on' : ''}">${l}</button>`).join('')}</div>
            ${id ? `<div class="pinfo">Started ${fmtK(g.start)}. Deadline fixed at ${fmtK(g.deadline0)}. It cannot be moved after the first day.</div>` : `<div class="grid2"><label class="field"><span>Start</span><input type="date" id="t-s" value="${g.start}"></label><label class="field"><span>Must finish by (optional)</span><input type="date" id="t-dl"></label></div>`}
            <div id="t-pv"></div><div class="error" id="t-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="t-go">Save</button></div>`, box => {
            const spec = () => ({ total: numv(box, '#t-n'), perDay: numv(box, '#t-d'), days: [...days], start: id ? g.start : (val(box, '#t-s') || todayKey()) });
            const upd = () => {
                const hh = numv(box, '#t-h'), ph = numv(box, '#t-ph');
                if (hh > 0 && ph > 0 && document.activeElement && ['t-h', 't-ph'].indexOf(document.activeElement.id) >= 0) box.querySelector('#t-d').value = Math.round(hh * ph * 10) / 10;
                const s = spec(), dl = id ? g.deadline0 : val(box, '#t-dl'), pv = box.querySelector('#t-pv');
                let html = '';
                if (s.total > 0 && !(s.perDay > 0) && dl) { const need = Math.ceil(E.perDayFor(s, dl, D.leave, todayKey()) * 10) / 10; html = `<div class="pinfo">To finish by ${fmtK(dl)} you need ${N(need)} a day.</div>`; }
                else if (s.total > 0 && s.perDay > 0) {
                    const p = E.planPreview(s, D.leave, todayKey());
                    if (p && p.finish) { html = `<div class="pinfo">At ${N(s.perDay)} a day on your working days you finish on ${fmtK(p.finish)}.</div>`; if (dl && E.dn(p.finish) > E.dn(dl)) { const need = Math.ceil(E.perDayFor(s, dl, D.leave, todayKey()) * 10) / 10; html += `<div class="pwarn">That is ${dN(E.dn(p.finish) - E.dn(dl))} after your deadline. You would need ${N(need)} a day.</div>`; } }
                }
                pv.innerHTML = html;
            };
            box.querySelectorAll('input,select').forEach(x => x.oninput = upd);
            box.querySelectorAll('#t-days button').forEach(b => b.onclick = () => { const n = +b.dataset.d; if (days.has(n)) days.delete(n); else days.add(n); b.classList.toggle('on', days.has(n)); upd(); });
            upd();
            box.querySelector('#t-go').onclick = () => {
                const err = m => { box.querySelector('#t-e').textContent = m; };
                const title = val(box, '#t-t').trim(); if (!title) return err('Give the task a name');
                const s = spec(); if (!(s.total > 0)) return err('Enter the total amount');
                if (!days.size) return err('Choose at least one working day');
                const dl = id ? g.deadline0 : val(box, '#t-dl');
                let perDay = s.perDay;
                if (!(perDay > 0)) { if (!dl) return err('Enter the daily amount, or a finish-by date'); perDay = Math.ceil(E.perDayFor(s, dl, D.leave, todayKey()) * 10) / 10; }
                const f = { title, parent: +val(box, '#t-p') || null, unit: val(box, '#t-u'), total: s.total, perDay, days: [...days] };
                if (id) add({ t: 'goal', op: 'edit', gid: id, f });
                else {
                    const p = E.planPreview({ total: s.total, perDay, days: s.days, start: s.start }, D.leave, todayKey());
                    add({ t: 'goal', op: 'add', g: Object.assign({ id: D.nextGoalId, kind: 'task', start: s.start, deadline0: dl || (p && p.finish) }, f) });
                }
                closeSheet(); render(); toast('Task saved');
            };
        });
    }

    function traceList(t) {
        const items = [];
        const unit = t.unit, p = D.goals.get(t.g.parent), proj = p ? D.projects.find(x => x.id === p.id) : null, T = D.thesis;
        if (t.status === 'done') items.push(`Finished ${t.finishedN ? fmtDNum(t.finishedN) : ''}: ${slipText(t.slip)} against its deadline.`);
        else {
            const open = Math.max(t.behindQty, t.left);
            if (t.behindQty > 0.05) items.push(`${N(t.behindQty)} ${unit} unfinished from earlier days. That is ${dN(Math.max(1, t.behindDays))} of work at ${N(t.perDay)} a day, and it is added to today.`);
            else if (t.left > 0.05) items.push(`${N(t.left)} ${unit} left today. Anything unfinished tonight is added to tomorrow.`);
            else items.push(t.aheadQty > 0 ? `You are ${N(t.aheadQty)} ${unit} ahead: ${dN(Math.max(0.1, t.aheadDays))} banked.` : 'Today is covered.');
            items.push(t.never ? 'At the current pace this task never finishes.' : `At your ${t.rateActual ? 'recent' : 'committed'} pace of ${N(t.rate)} a day it finishes ${fmtDNum(t.projN)}, against a deadline of ${fmtDNum(t.deadlineN)}: ${slipText(t.slip)}.`);
            if (proj) {
                const sets = proj.kids.every(k => k.slip <= t.slip + 1e-9);
                items.push(`${proj.title}: ${slipText(proj.slip)}. ${proj.kids.length > 1 ? (sets && Math.abs(t.slip) > 0.5 ? 'This is the slowest task, so it sets the chapter.' : 'Another task sets the chapter\'s timing.') : ''}`);
                if (proj.thesis && T) items.push(`Thesis: ${T.slip > 0.5 ? `finishes ${dN(T.slip)} after the year-${D.jrf.target} target (${fmtDNum(T.projN)}).` : T.slip < -0.5 ? `finishes ${dN(-T.slip)} early.` : 'on target.'}`);
                if (proj.thesis && T) items.push(`Fifth-year buffer: ${Math.round(T.buffer)} days of ${Math.round(T.planned)}.`);
                else items.push('This project is outside the thesis plan, so it does not touch the buffer.');
            }
        }
        return `<ul class="trace">${items.map(x => `<li>${x}</li>`).join('')}</ul>`;
    }
    function taskDetail(id) {
        const t = D.byId.get(id); if (!t) return;
        const ids = t.derived ? new Set(t.items.map(i => i.id)) : new Set([id]);
        const logs = D.logs.filter(l => ids.has(l.goal)).sort((a, b) => b.ts - a.ts).slice(0, 6);
        const nexts = t.derived ? t.items.filter(i => i.remaining > 1e-9).slice(0, 3) : [];
        sheet(`<h2>${unitIcon(t.unit)} ${esc(t.g.title)}</h2><div class="row"><span class="muted">${esc(projTitle(t))}</span>${statusChip(t)}</div>
            <div class="row mt"><span class="muted">Done</span><b class="num">${N(t.done)} / ${N(t.total)} ${esc(t.unit)}</b></div>
            <div class="row"><span class="muted">Deadline (fixed)</span><b class="num">${fmtDNum(t.deadlineN)}</b></div>
            ${nexts.length ? `<div class="set-title" style="margin-top:14px">Next up</div>${nexts.map(i => `<div class="ledger-row"><span>${esc(itemLabel(i))}</span><span>${N(i.remaining)} ${esc(i.unit)} <button class="mini-btn" data-act="log-item" data-id="${i.id}">Log</button></span></div>`).join('')}` : ''}
            <div class="set-title" style="margin-top:14px">What this means</div>${traceList(t)}
            <div class="grid2 mt"><button class="btn-line btn-accent" data-act="log" data-id="${id}">Log progress</button>${t.behindQty > 0.05 ? `<button class="btn-line" data-act="replan" data-id="${id}">Re-plan backlog</button>` : `<button class="btn-line" data-act="task-edit" data-id="${id}">Edit</button>`}</div>
            ${t.behindQty > 0.05 ? `<button class="btn-line" data-act="task-edit" data-id="${id}">Edit</button>` : ''}
            ${logs.length ? `<div class="set-title" style="margin-top:14px">Recent</div>${logs.map(l => `<div class="ledger-row"><span>${fmtK(l.day || E.localKey(l.ts))}${l.late ? '<span class="lg-late">added later</span>' : ''}</span><span><b>${N(l.qty)}</b> ${esc(t.unit)} <button class="mini-btn" data-act="void" data-id="${l.id}">Undo</button></span></div>`).join('')}` : ''}
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Close</button><button class="btn-extra" data-act="task-del" data-id="${id}">Delete task</button></div>`);
    }
    /* logging against items (a daily plan spills into the next item) */
    const itemLabel = i => { const p = D.goals.get(i.parent); return (p && p.title !== i.title ? p.title + ' · ' : '') + i.title; };
    function logSheet(taskId, itemId) {
        const t = taskId ? D.byId.get(taskId) : null; if (taskId && !t) return;
        const derived = !!(t && t.derived);
        let selId = derived ? ((t.next || t.items[0] || {}).id) : itemId;
        const unit = t ? t.unit : (D.items.get(itemId) || {}).unit;
        const title = t ? t.g.title : (D.items.get(itemId) || {}).title;
        let amt = '', day = todayKey();
        const dayKeys = [0, 1, 2].map(k => E.keyOf(D.todayN - k));
        sheet(`<h2>${unitIcon(unit)} ${esc(title)}</h2>
            ${derived ? `<label class="field"><span>Start with</span><select id="l-it">${t.items.filter(i => i.remaining > 0).map(i => `<option value="${i.id}" ${i.id === selId ? 'selected' : ''}>${esc(itemLabel(i))} (${N(i.remaining)} left)</option>`).join('')}</select></label>` : ''}
            <div class="amt-disp" id="l-amt"></div>
            ${daySegHtml(dayKeys)}
            <div class="grid2 mt" id="l-q"></div>
            <div class="keypad" id="l-pad"></div><div class="error" id="l-e"></div><button type="button" class="pg-edit hl-link" data-act="hist" data-id="${taskId || itemId || 0}">Log history</button>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="l-go">Log</button></div>`, box => {
            const disp = box.querySelector('#l-amt');
            const sel = () => D.items.get(+(box.querySelector('#l-it') ? val(box, '#l-it') : selId)) || null;
            const chips = () => {
                const it = sel(), q = [];
                if (t && t.left > 0.05) q.push([t.left, `All of today: ${N(t.left)}`]);
                if (it && it.remaining > 0) q.push([it.remaining, `Finish this item: ${N(it.remaining)}`]);
                if (t && !derived) q.push([t.perDay, `One day's share: ${N(t.perDay)}`]);
                box.querySelector('#l-q').innerHTML = q.slice(0, 2).map(([v, l]) => `<button class="mini-btn" data-q="${v}">${l}</button>`).join('');
                box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { amt = String(Math.round(+b.dataset.q * 10) / 10); upd(); });
            };
            const upd = () => { disp.textContent = (amt || '0') + ' ' + unit; box.querySelectorAll('#l-day button').forEach(b => b.classList.toggle('on', dayOn(b, day))); };
            buildPad(box.querySelector('#l-pad'), k => {
                if (k === '⌫') amt = amt.slice(0, -1);
                else if (k === '.') { if (amt.indexOf('.') < 0) amt = (amt || '0') + '.'; }
                else if (amt.replace('.', '').length < 6) amt += k;
                if (amt === '0' || amt === '00') amt = '';
                upd();
            }, true);
            bindDays(box, v => { day = v; }, upd);
            const itSel = box.querySelector('#l-it'); if (itSel) itSel.onchange = () => { selId = +itSel.value; chips(); };
            chips(); upd();
            box.querySelector('#l-go').onclick = () => {
                const q = parseFloat(amt); if (!(q > 0)) { box.querySelector('#l-e').textContent = 'Enter an amount'; return; }
                const made = [];
                if (derived) {
                    let list = t.items.filter(i => i.remaining > 1e-9), at = list.findIndex(i => i.id === (sel() || {}).id); if (at < 0) at = 0;
                    list = list.slice(at); let left = q;
                    list.forEach((i, k) => { if (left <= 1e-9) return; const take = k === list.length - 1 ? left : Math.min(i.remaining, left); made.push(add({ t: 'log', goal: i.id, qty: take, day, late: day !== todayKey() })); left -= take; });
                    if (!made.length) made.push(add({ t: 'log', goal: t.items[t.items.length - 1].id, qty: q, day, late: day !== todayKey() }));
                } else made.push(add({ t: 'log', goal: taskId || itemId, qty: q, day, late: day !== todayKey() }));
                closeSheet(); render();
                { const nn = taskId ? D.byId.get(taskId) : null; fx(nn && nn.finished ? 'fanfare' : nn && nn.left < 0.05 ? 'glad' : 'up'); }
                let m = `+${N(q)} ${unit}. `;
                if (taskId) { const n = D.byId.get(taskId); if (n.finished) m += 'Finished. Well earned.'; else if (n.status === 'ahead') m += `${dN(Math.max(0.1, n.aheadDays))} ahead: banked.`; else if (n.status === 'behind') m += `Still ${N(n.behindQty)} behind.`; else if (n.left < 0.05) m += 'Done for today.'; else m += `${N(n.left)} to go today.`; }
                else { const it = D.items.get(itemId); m += it && it.remaining < 0.05 ? 'Item finished.' : `${N(it ? it.remaining : 0)} left in this item.`; }
                toast(m, () => { made.forEach(e => add({ t: 'void', target: e.id })); render(); fx('down'); });
            };
        });
    }

    function leaveSheet() {
        const up = D.leaves.filter(l => l.to >= todayKey()).sort((a, b) => a.from < b.from ? -1 : 1);
        sheet(`<h2>Declare leave</h2><p>Sickness, travel, exams. Targets pause on these days. Declare today or ahead of time, never afterwards. Each leave day pushes your plan later, and the shift is counted against the buffer.</p>
            <div class="grid2"><label class="field"><span>From</span><input type="date" id="v-f" value="${todayKey()}" min="${todayKey()}"></label><label class="field"><span>To</span><input type="date" id="v-t" value="${todayKey()}" min="${todayKey()}"></label></div>
            <label class="field"><span>Reason</span><input type="text" id="v-r" maxlength="60"></label><div class="error" id="v-e"></div>
            ${up.length ? `<div class="set-title">Upcoming</div>${up.map(l => `<div class="ledger-row"><span>${fmtK(l.from)}${l.to !== l.from ? ' to ' + fmtK(l.to) : ''} ${l.reason ? '· ' + esc(l.reason) : ''}</span><button class="mini-btn" data-act="void" data-id="${l.id}">Remove</button></div>`).join('')}` : ''}
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Close</button><button class="btn-primary" id="v-go">Declare</button></div>`, box => {
            box.querySelector('#v-go').onclick = () => {
                const f = val(box, '#v-f'), t = val(box, '#v-t'), e = box.querySelector('#v-e');
                if (!f || !t) { e.textContent = 'Choose both dates'; return; }
                if (f < todayKey()) { e.textContent = 'Leave cannot be declared for days already gone'; return; }
                if (t < f) { e.textContent = 'The end date comes before the start'; return; }
                add({ t: 'leave', from: f, to: t, reason: val(box, '#v-r').trim() }); closeSheet(); render(); toast('Leave declared');
            };
        });
    }
    function replanSheet(id) {
        const t = D.byId.get(id); if (!t) return;
        sheet(`<h2>Re-plan the backlog</h2><p>You have ${N(t.behindQty)} ${esc(t.unit)} unfinished. Spread it over the next working days instead of today alone. The deadline does not move, and this stays in the slip ledger forever.</p>
            <label class="field"><span>Spread over</span><select id="r-n">${[3, 5, 7, 10, 14].map(n => `<option ${n === 7 ? 'selected' : ''}>${n}</option>`).join('')}</select></label><div class="pinfo" id="r-pv"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="r-go">Re-plan</button></div>`, box => {
            const upd = () => { const n = +val(box, '#r-n'); box.querySelector('#r-pv').textContent = `About ${N(t.perDay + t.behindQty / n)} ${t.unit} a day for ${n} working days, then back to ${N(t.perDay)}.`; };
            box.querySelector('#r-n').onchange = upd; upd();
            box.querySelector('#r-go').onclick = () => { add({ t: 'replan', goal: id, day: todayKey(), spread: +val(box, '#r-n') }); closeSheet(); render(); toast('Backlog spread. The slip is on record.'); };
        });
    }
    function lifeSheet(id) {
        const l = id ? D.life.find(x => x.id === id) : { title: '', cat: 'Family & children', due: '', notes: '' };
        sheet(`<h2>${id ? 'Edit' : 'New'} life goal</h2><label class="field"><span>Goal</span><input type="text" id="g-t" value="${esc(l.title)}" placeholder="Build a family" autofocus></label>
            <div class="grid2"><label class="field"><span>Area</span><select id="g-c">${CATS.map(c => `<option ${c === l.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label class="field"><span>Aim for (optional)</span><input type="date" id="g-d" value="${l.due || ''}"></label></div>
            <label class="field"><span>Why it matters</span><textarea id="g-n">${esc(l.notes)}</textarea></label><div class="error" id="g-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="g-go">Save</button>${id ? '<button class="btn-extra" id="g-del">Delete this goal</button>' : ''}</div>`, box => {
            box.querySelector('#g-go').onclick = () => {
                const title = val(box, '#g-t').trim(); if (!title) { box.querySelector('#g-e').textContent = 'Give it a name'; return; }
                const f = { title, cat: val(box, '#g-c'), due: val(box, '#g-d') || null, notes: val(box, '#g-n').trim() };
                if (id) add({ t: 'goal', op: 'edit', gid: id, f }); else add({ t: 'goal', op: 'add', g: Object.assign({ id: D.nextGoalId, kind: 'life' }, f) });
                closeSheet(); render();
            };
            const del = box.querySelector('#g-del');
            if (del) del.onclick = async () => { if (await confirmSheet({ title: 'Delete "' + l.title + '"?', sub: 'Its steps are removed too.', ok: 'Delete', danger: true })) { add({ t: 'goal', op: 'del', gid: id }); render(); } };
        });
    }
    function msSheet(parent) {
        sheet(`<h2>Add a step</h2><p>One concrete action you can take, with a date. It does not depend on the thesis.</p><label class="field"><span>Step</span><input type="text" id="m-t" placeholder="Speak to my family about meeting someone" autofocus></label><label class="field"><span>By when</span><input type="date" id="m-d"></label><div class="error" id="m-e"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="m-go">Add</button></div>`, box => {
            box.querySelector('#m-go').onclick = () => {
                const title = val(box, '#m-t').trim(); if (!title) { box.querySelector('#m-e').textContent = 'Describe the step'; return; }
                add({ t: 'goal', op: 'add', g: { id: D.nextGoalId, kind: 'ms', parent, title, due: val(box, '#m-d') || null } }); closeSheet(); render();
            };
        });
    }
    function pinSheet() {
        if (!hasCrypto()) { toast('A PIN needs the https page'); return; }
        sheet(`<h2>${pinOn() ? 'Change' : 'Set'} PIN</h2><p>Four to six digits.</p><label class="field"><span>New PIN</span><input type="password" inputmode="numeric" maxlength="6" id="n-pin" autofocus></label><label class="field"><span>Repeat</span><input type="password" inputmode="numeric" maxlength="6" id="n-pin2"></label><div class="error" id="n-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="n-go">Save PIN</button></div>`, box => {
            box.querySelector('#n-go').onclick = async () => {
                const a = val(box, '#n-pin'), b = val(box, '#n-pin2');
                if (!/^\d{4,6}$/.test(a)) { box.querySelector('#n-e').textContent = 'Use 4 to 6 digits'; return; }
                if (a !== b) { box.querySelector('#n-e').textContent = 'The two PINs differ'; return; }
                await setPin(a); closeSheet(); render(); toast('PIN set');
            };
        });
    }

    /* ---------- Actions ---------- */
    document.addEventListener('click', async ev => {
        if (!ev.target || !ev.target.closest) return;
        const tl = ev.target.closest('[data-tell]'); if (tl && !ev.target.closest('[data-act]')) { if (GC && GC.tell) GC.tell(tl.dataset.tell, tl.dataset.tone); else toast(tl.dataset.tell); return; }
        const nav = ev.target.closest('.nav-item');
        if (nav) { screen = nav.dataset.s; render(); window.scrollTo(0, 0); return; }
        const el = ev.target.closest('[data-act]'); if (!el) { if (ev.target === $('sheet-bg')) { const dirty = [].some.call($('sheet').querySelectorAll('input:not([type=checkbox]):not([type=range]),textarea'), i => i.value !== i.defaultValue && !i.classList.contains('hl-in')); if (dirty && !$('sheet').querySelector('[data-r]')) { toast('Your changes are not saved yet. Use Cancel to leave.'); return; } closeSheet(); } return; }
        const act = el.dataset.act, id = +el.dataset.id;
        switch (act) {
            case 'close': closeSheet(); break;
            case 'cfg': cfgSheet(); break;
            case 'tlog': trackLogSheet(id); break;
            case 'hist': closeSheet(); setTimeout(() => historySheet(id || 0), 60); break;
            case 'tset': trackSheet(id); break;
            case 'split': splitSheet(id); break;
            case 'pick': closeSheet(); setTimeout(pickSheet, 60); break;
            case 'begin': closeSheet(); setTimeout(() => beginPiece(id), 60); break;
            case 'newdaily': newDailySheet(); break;
            case 'next': { const q = P().byId.get(id); if (D.cfg && D.cfg.order !== 'custom') add({ t: 'cfg', c: { order: 'custom' } }); add({ t: 'next', goal: id }); closeSheet(); render(); toast('Next: ' + (q ? pTitle(q) : 'chosen piece')); break; }
            case 'chap-add': D.cfg ? chapAddSheet() : cfgSheet(); break;
            case 'chap': chapterSheet(id); break;
            case 'grp': case 'nodeS': nodeSheet2(id); break;
            case 'pc': pieceSheet(id); break;
            case 'tick': ev.stopPropagation(); tick(id); break;
            case 'piece-add': pieceAddSheet(id); break;
            case 'sec-add2': sectionAddSheet(id); break;
            case 'bulk-grp': { const a = P().agg.get(id); closeSheet(); if (a) bulkSheet(a.pieces.map(p => p.id), (D.goals.get(id) || {}).title || ''); break; }
            case 'themes-add': themesSheet(id); break;
            case 'outline': D.cfg ? outlineSheet() : cfgSheet(); break;
            case 'custom-add': D.cfg ? customSheet() : cfgSheet(); break;
            case 'defaults': defaultsSheet(); break;
            case 'rebase': rebaseSheet(); break;
            case 'toggle': { ev.stopPropagation(); const o = prefs.open || []; prefs.open = o.indexOf(id) >= 0 ? o.filter(x => x !== id) : o.concat([id]); persist(); renderPlan(); break; }
            case 'accent': prefs.accent = el.dataset.v === 'gold' ? 'gold' : 'sapphire'; persist(); render(); break;
            case 'look': prefs.look = el.dataset.v; GLook.remember(prefs); persist(); render(); break;
            case 'pr-set': prefs.p = Object.assign({}, prefs.p, { [el.dataset.k]: el.dataset.v }); persist(); render(); break;
            case 'task-add': D.cfg ? taskSheet(0, +el.dataset.parent || 0) : cfgSheet(); break;
            case 'task': taskDetail(id); break;
            case 'task-edit': { const tt = D.goals.get(id); taskSheet(id); break; }
            case 'task-del': if (await confirmSheet({ title: 'Delete this task?', sub: 'Its progress is removed from the plan and the buffer.', ok: 'Delete', danger: true })) { add({ t: 'goal', op: 'del', gid: id }); render(); } break;
            case 'log': logSheet(id); break;
            case 'replan': replanSheet(id); break;
            case 'leave': leaveSheet(); break;
            case 'void': add({ t: 'void', target: id }); closeSheet(); render(); toast('Undone'); break;
            case 'line': lineBump++; renderToday(); break;
            case 'orb': toast(orbMessage()); break;
            case 'sugg': {
                const s = (IN && IN.suggestions || []).find(x => x.grp === el.dataset.g); if (!s) break;
                const made = s.pieces.map(x => add({ t: 'goal', op: 'edit', gid: x.id, f: { pdays: x.to } })); render();
                toast(plural(made.length, 'piece') + ' updated', () => { made.forEach(e => add({ t: 'void', target: e.id })); render(); fx('down'); }); break;
            }
            case 'deleted': deletedSheet(); break;
            case 'goto': screen = el.dataset.s; render(); window.scrollTo(0, 0); break;
            case 'to-today': screen = 'today'; render(); break;
            case 'life-add': lifeSheet(0); break;
            case 'life-edit': lifeSheet(id); break;
            case 'ms-add': msSheet(id); break;
            case 'toast-undo': { const f = $('toast')._undo; $('toast').classList.remove('show'); if (f) f(); break; }
            case 'b-later': prefs.remindSnooze = Date.now() + 3600e3; persist(); renderBanner(); break;
            case 'b-now': backupSheet('share'); break;
            case 'pick-bg': $('file-bg').click(); break;
            case 'clear-bg': try { localStorage.removeItem(K_BG); } catch (e) {} render(); toast('Default sky restored'); break;
            case 'pin-set': pinSheet(); break;
            case 'pin-off': if (await confirmSheet({ title: 'Remove PIN?', ok: 'Remove' })) { try { localStorage.removeItem(K_PIN); } catch (e) {} render(); } break;
            case 'backup': backupSheet(el.dataset.m); break;
            case 'restore': $('file-restore').click(); break;
            case 'erase': if (await confirmSheet({ title: 'Erase everything?', sub: 'All goals, logs and settings on this phone are deleted. Back up first if unsure.', ok: 'Erase', danger: true })) {
                [K_EV, K_PREF, K_PIN].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
                prefs = PREF_DEFAULT(); setEvents([]); screen = 'today'; render(); toast('Erased'); } break;
        }
    });
    document.addEventListener('change', ev => {
        if (!ev.target || !ev.target.closest) return;
        const ms = ev.target.closest('[data-ms]');
        if (ms) {
            const gid = +ms.dataset.ms;
            if (ms.checked) add({ t: 'done', goal: gid, day: todayKey() });
            else { const e = events.slice().reverse().find(x => x.t === 'done' && x.goal === gid && !D.events.find(v => v.t === 'void' && v.target === x.id)); if (e) add({ t: 'void', target: e.id }); }
            render(); return;
        }
        const el = ev.target.closest('[data-pref]'); if (!el) return;
        const k = el.dataset.pref;
        prefs[k] = el.type === 'checkbox' ? el.checked : el.value; persist();
        if (k === 'follow' && el.checked) followNow();
        if (k === 'rememberPass' && !el.checked) { prefs.pass = ''; persist(); }
        render();
    });
    document.addEventListener('input', ev => {
        if (!ev.target || !ev.target.closest) return;
        const r = ev.target.closest('[data-pr]'); if (!r) return;
        const k = r.dataset.pr, v = parseFloat(r.value); prefs.p = Object.assign({}, prefs.p, { [k]: v });
        const lab = $('pr-' + k); if (lab) lab.textContent = v + (k === 'dotAlpha' ? '%' : k === 'mTopIn' ? ' in' : ' px'); applyTheme(); persist();
    });
    document.addEventListener('change', ev => {
        const t = ev.target;
        if (t.matches && t.matches('[data-prs]')) { prefs.p = Object.assign({}, prefs.p, { [t.dataset.prs]: t.value }); persist(); render(); }
        else if (t.matches && t.matches('[data-prc]')) { prefs.p = Object.assign({}, prefs.p, { [t.dataset.prc]: t.checked }); persist(); render(); }
        else if (t.matches && t.matches('[data-prcol]')) { prefs.p = Object.assign({}, prefs.p, { [t.dataset.prcol]: t.value, paperColor: 'custom' }); persist(); render(); }
    });
    document.addEventListener('toggle', ev => {
        const d = ev.target; if (!d || !d.matches || !d.matches('details[data-acc]')) return;
        const k = d.dataset.acc, a = (prefs.acc || []).filter(x => x !== k); if (d.open) a.push(k); prefs.acc = a; persist();
    }, true);
    try { const mq = matchMedia('(prefers-color-scheme: dark)'); (mq.addEventListener ? mq.addEventListener('change', () => followNow()) : mq.addListener(() => followNow())); } catch (e) {}
    $('file-bg').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) processWallpaper(f); };
    $('file-restore').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) restoreFile(f); };

    /* ---------- Opening moments ---------- */
    function showSplash() {
        const s = $('splash'); if (!prefs.introOn || reduced()) return;
        $('s-hi').textContent = prefs.greetOn ? greeting() : "Rustam's Goal Manager";
        { const v = $('app-ver'), sv = $('s-ver'); if (v && sv) sv.textContent = v.textContent; }
        $('s-sub').textContent = !D.cfg ? "Let's set up your timeline" : (D.thesis && D.tasks.length ? `${Math.round(D.thesis.buffer)} days of buffer` : "Let's plan your work");
        s.classList.add('show');
        const close = () => { clearTimeout(showSplash._t); s.classList.remove('show'); };
        s.onclick = close; showSplash._t = setTimeout(close, 2900);
    }
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { hiddenAt = Date.now(); return; }
        if (pinOn() && prefs.autoLock && hiddenAt && Date.now() - hiddenAt > 60000) showLock();
        if (hiddenAt && Date.now() - hiddenAt > 5 * 60000) render();
        hiddenAt = 0;
    });
    setInterval(() => { if (!document.hidden && !$('sheet-bg').classList.contains('show') && !$('lock').classList.contains('show')) quiet = true; try { render(); } finally { quiet = false; document.body.classList.toggle('still', prefs.animOn === false || reduced()); } }, 60000);

    async function init() {
        initStore();
        refresh();
        if (D && D.cfg && D.cfg.startMode !== 'pick' && !prefs.pickAsked) { prefs.pickAsked = true; add({ t: 'cfg', c: { startMode: 'pick' } }); refresh(); }
        applyTheme();
        if (pinOn() && hasCrypto()) showLock();
        if (window.GLiquid) GLiquid.config({ prefs: () => prefs, set: (k, v) => { prefs[k] = v; persist(); }, render: () => { if (D) render(); } });
        if (window.GWizard) GWizard.config({ app: 'goal', brand: "Rustam's Goal Manager", prefs: () => prefs, set: (k, v) => { prefs[k] = v; persist(); }, apply: () => { applyTheme(); followNow(); }, render: () => { if (D) render(); }, hasData: () => events.length > 0,
          tour: [["Tap to learn", "Tap any graphic or number. The Companion explains it in simple words."], ["Log pages fast", "Tap + on a task, tap the last page you finished, then tap Log. The app always asks for the last page."], ["Fix a mistake", "Open Log history. Tap the pen to change an entry or the bin to delete it. You can always Undo."], ["The top banner", "It shows your last entry, and now and then a tip. Tap your last entry to see the history."], ["More", "Sections you rarely open fold under More. They come back when you open them."], ["Keep a copy", "Settings, then Backup, saves a copy of your data. You can run setup again or replay this tour in Settings."]],
          later: [
            { id: 'pin', after: 2, text: "Do you want a PIN to keep this app private?", opts: [["set", "Set a PIN"], ["no", "No thanks"]], apply: v => { if (v === 'set') pinSheet(); }, when: () => !pinOn() },
            { id: 'strict', after: 8, text: "Show the cost of delay and the gain of finishing early?", opts: [["both", "Show both"], ["gain", "Only the gains"], ["none", "Hide both"]], apply: v => { prefs.lossOn = v === 'both'; prefs.gainOn = v !== 'none'; persist(); }, when: () => events.filter(e => e.t === 'log').length >= 5 },
            { id: 'lite', after: 6, text: "This phone may be slow. Use Lite mode? It removes blur and motion. You can switch it back any time.", opts: [["1", "Use Lite"], ["0", "Keep the glass"]], apply: v => { prefs.lite = v === '1'; persist(); applyTheme(); }, when: () => !prefs.lite && window.GResume && GResume.weakPhone() }
          ] });
        const y0 = GResume.init({ key: 'gl_resume', screens: ['today','ins','life','mind','month','out','plan'], get: () => screen, set: s => { screen = s; } }); render(); GResume.restoreScroll(y0); companionReturns(); showSplash(); setTimeout(maybeAskPosition, 5200);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(maybeAskPosition, 1800); });
        if (window.GFeel) GFeel.saveButton({ save: () => { persist(); try { return !events.length || localStorage.getItem(K_EV) !== null; } catch (e) { return false; } }, backup: () => backupSheet('share') });
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    }
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    window.__gl = { get D() { return D; }, get IN() { return IN; }, E, add, render, get events() { return events; }, setScreen: s => { screen = s; render(); } };
    init();
})();
