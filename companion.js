/* The Circle Companion v3: a cute fluid spectre. It usually rests as a circle (or a ghost with a wavy tail),
   but often molds into other shapes, uses props, gestures, plays and rests, like a small living thing.
   Needs companion-art.js and companion-lines.js first. No libraries. Respects "reduce motion".
   API: const c = GCompanion.create(placeholderElement, { tip: () => 'text', busy: () => bool, legacyPlace: 'header'|'float'|'off' })
        c.mood(name)  c.pose(name, ms)  c.shape(id, ms)  c.do(actionName, {force})  c.say(text, ms)  c.sayQuiet(text)
        c.poke()  c.wise()  c.wake()  c.show(bool)  c.actions()  c.shapes()
   Settings are the companion's own (GCompanion.prefs, GCompanion.settingsHTML()). */
(function (root) {
    'use strict';
    const ART = root.GCArt, LINES = root.GCLines || { pick: () => '' };
    if (!ART) return;
    const { SHAPES, ORDER, PROPS, N, INK } = ART, mk = ART.mk, Hh = ART.H;
    const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const still = () => reduced() || !!(document.body && document.body.classList.contains('still')) || document.documentElement.classList.contains('lite');
    const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
    const pickOne = a => a[Math.floor(Math.random() * a.length)];
    const ease = u => u * u * (3 - 2 * u);

    // ================= settings (the character's own)
    const PKEY = 'gc_prefs', DEF = { place: 'header', rest: 'circle', move: 60, act: 55, talk: 19, wise: true, look: 'spectre', aura: true, avoid: 'off', hue: 'classic', huespeed: 'calm', huen: 2, fx: 'rich', flare: 'soft', catchlight: true, evade: 'spring', evspeed: 'normal' };
    let PR = null; const watchers = [], RESERVE = [];
    function loadPrefs(legacy) {
        if (PR) return PR;
        let o = null; try { o = JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch (e) {}
        PR = Object.assign({}, DEF, o || {});
        if (!o && legacy) PR.place = legacy === 'float' ? 'snap' : legacy === 'off' ? 'off' : 'header';
        return PR;
    }
    function setPrefs(p) { PR = Object.assign(loadPrefs(), p); try { localStorage.setItem(PKEY, JSON.stringify(PR)); } catch (e) {} watchers.forEach(f => { try { f(PR); } catch (e) {} }); }

    // ================= moods (numbers blend smoothly)
    const BASE = { eo: 1, eh: 0, ec: 0, ry: 3.4, gx: 0, gy: 0, mc: 0.25, mw: 8, mx: 0, mo: 0, sc: 1, tilt: 0, lift: 0, glow: 0.55, brow: 0 };
    const MOODS = {
        calm: {}, happy: { eo: 0, eh: 1, mc: 0.95, mw: 11, lift: -2, glow: 0.85 }, proud: { eo: 0, eh: 1, mc: 0.75, mw: 10, lift: -4, sc: 1.04, glow: 0.9 },
        curious: { ry: 4, gx: 1, gy: -0.6, mc: 0.1, mw: 5, tilt: 6, glow: 0.65 }, concerned: { ry: 3, gy: 0.8, mc: -0.45, mw: 7, sc: 0.94, tilt: -4, glow: 0.35, brow: 1 },
        thoughtful: { gx: -1, gy: -0.9, mc: 0, mw: 6, mx: 3, tilt: 5, glow: 0.5 }, reassuring: { mc: 0.55, mw: 9, sc: 1.02, glow: 0.7 },
        content: { eo: 0, ec: 1, mc: 0.45, mw: 8, glow: 0.6 }, sleepy: { eo: 0, ec: 1, mc: 0.05, mw: 4, sc: 0.97, tilt: 8, glow: 0.25 },
        surprised: { ry: 4.6, mc: 0, mw: 3, mo: 1, lift: -3, glow: 0.8 }, yawn: { eo: 0, ec: 1, mo: 1, mw: 3, glow: 0.4 }, laugh: { eo: 0, eh: 1, mo: 0.8, mc: 1, mw: 12, glow: 0.95 }
    };
    const ALIAS = { thinking: 'thoughtful', concern: 'concerned', reassured: 'reassuring', pride: 'proud', surprise: 'surprised', sadness: 'concerned' };
    const ACTION_ALIAS = { rest: 'calm', listen: 'curious', analyse: 'thoughtful', reassure: 'reassuring', celebrate: 'proud', concern: 'concerned', surprise: 'surprised', sad: 'concerned' };
    const EVENT = { approaching: 'thoughtful', over: 'concerned', saved: 'happy', goal: 'proud', unusual: 'surprised', 'savings-added': 'happy', 'savings-withdrawn': 'thoughtful' };

    // ================= hands (targets for left and right arm; null = tucked in)
    const POSES = {
        none: {}, cheer: { L: [-40, -34], R: [40, -34], props: ['sparks'], mood: 'happy' }, notes: { L: [-14, 42], R: [14, 36], props: ['notebook', 'pen'], mood: 'calm' },
        insight: { R: [35, -14], props: ['mag'], mood: 'curious' }, point: { R: [43, -4], props: ['chart'], mood: 'calm' }, heart: { L: [-13, 31], R: [13, 31], props: ['heart'], mood: 'happy' },
        wave: { R: [40, -30], mood: 'happy', wag: 'R' }, laptop: { L: [-11, 45], R: [11, 45], props: ['macbook'], mood: 'thoughtful', type: 1 }, coffee: { R: [32, 33], props: ['coffee'], mood: 'content' },
        calc: { L: [-12, 47], R: [12, 47], props: ['calculator'], mood: 'curious', type: 1 }, pointer: { R: [33, 33], props: ['stick', 'chart'], mood: 'happy' },
        knock: { R: [22, 2], mood: 'curious', wag: 'K' }, think: { R: [9, 21], mood: 'thoughtful' }, shrug: { L: [-37, 2], R: [37, 2], mood: 'curious' },
        stretch: { L: [-37, -37], R: [37, -37], mood: 'content' }, clap: { L: [-5, 14], R: [5, 14], mood: 'happy', clap: 1 }, dance: { L: [-36, -6], R: [36, -6], mood: 'happy', wag: 'alt' },
        out: { L: [-40, 6], R: [40, 6], mood: 'happy' }
    };
    const FORMS = {
        sit: { dy: 9, sx: 1.05, sy: 0.9, rot: 0, feet: 0 }, stand: { dy: 4, sx: 0.96, sy: 1.1, rot: 0, feet: 1 }, lie: { dy: 6, dx: 6, sx: 1.08, sy: 0.84, rot: -84, feet: 0 },
        relax: { dy: 5, sx: 1.05, sy: 0.92, rot: -7, feet: 0 }, squat: { dy: 7, sx: 1.14, sy: 0.8, rot: 0, feet: 0 }, tall: { dy: 0, sx: 0.9, sy: 1.18, rot: 0, feet: 0 }, lean: { dy: 0, sx: 1, sy: 1, rot: 11, feet: 0 }
    };

    // ================= body motions: f(t, d, amp, dir) -> offsets. t and d in seconds.
    const M0 = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 };
    const hopWave = (t, T, h) => { const u = (t % T) / T; if (u < 0.16) { const k = u / 0.16; return { dy: 0, sy: 1 - 0.2 * Math.sin(k * Math.PI / 2), sx: 1 + 0.12 * k }; } if (u < 0.78) { const v = (u - 0.16) / 0.62; return { dy: -h * 4 * v * (1 - v), sy: 1 + 0.12 * Math.sin(v * Math.PI), sx: 1 - 0.06 * Math.sin(v * Math.PI) }; } const k = (u - 0.78) / 0.22; return { dy: 0, sy: 1 - 0.18 * Math.sin(k * Math.PI), sx: 1 + 0.1 * Math.sin(k * Math.PI) }; };
    const MOT = {
        jump: (t, d, a) => hopWave(t, 0.85, 24 * a), hop: (t, d, a) => hopWave(t, 0.5, 9 * a),
        bounce: (t, d, a) => { const b = Math.abs(Math.sin(t * 5)); return { dy: -b * 7 * a, sy: 1 - 0.07 * (1 - b), sx: 1 + 0.05 * (1 - b) }; },
        spin: (t, d) => ({ sx: Math.cos(Math.min(1, t / Math.min(d, 1.4)) * Math.PI * 2), rot: Math.sin(t * 4) * 3 }),
        wobble: (t, d, a) => ({ rot: Math.sin(t * 14) * 10 * a * Math.exp(-t * 1.6) }),
        shake: (t, d, a) => ({ dx: Math.sin(t * 22) * 4 * a * (1 - clamp(t / d, 0, 1) * 0.5), rot: Math.sin(t * 22) * 3 }),
        nod: (t, d, a) => ({ dy: Math.abs(Math.sin(t * 7)) * 3 * a, sy: 1 - Math.abs(Math.sin(t * 7)) * 0.05 * a }),
        tremble: (t, d, a) => ({ dx: Math.sin(t * 44) * 1.1 * a }),
        stretch: (t, d, a) => { const e = Math.sin(clamp(t / d, 0, 1) * Math.PI); return { sy: 1 + 0.28 * e * a, sx: 1 - 0.14 * e * a, dy: -4 * e * a }; },
        squash: (t, d, a) => { const e = Math.sin(clamp(t / d, 0, 1) * Math.PI); return { sy: 1 - 0.26 * e * a, sx: 1 + 0.2 * e * a }; },
        laugh: (t, d, a) => ({ dy: -Math.abs(Math.sin(t * 13)) * 3.5 * a, rot: Math.sin(t * 13) * 4 * a, sy: 1 + Math.sin(t * 26) * 0.04 }),
        dance: (t, d, a) => ({ dx: Math.sin(t * 3.2) * 7 * a, rot: Math.sin(t * 3.2) * 10 * a, dy: -Math.abs(Math.sin(t * 6.4)) * 5 * a }),
        peek: (t, d, a, dir) => { const u = clamp(t / d, 0, 1), e = ease(clamp(u / 0.22, 0, 1)) * (1 - ease(clamp((u - 0.78) / 0.22, 0, 1))); return { dx: dir * 40 * e * a, rot: dir * 15 * e }; },
        hide: (t, d) => { const e = ease(clamp(t / d, 0, 1)); return { sx: lerp(1, 0.04, e), sy: lerp(1, 0.04, e), dy: 22 * e }; },
        knock: (t) => { const k = t < 1 ? Math.max(0, Math.sin(t * 11)) : 0; return { sx: 1 + 0.09 * k, sy: 1 + 0.09 * k }; },
        rise: (t, d) => { const u = clamp(t / d, 0, 1), c1 = 1.7, c3 = c1 + 1, e = 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); return { sy: 0.3 + 0.7 * e, sx: 1 + 0.25 * (1 - e) }; },
        sink: (t, d) => { const e = ease(clamp(t / d, 0, 1)); return { sy: lerp(1, 0.55, e), sx: lerp(1, 1.12, e), dy: 8 * e }; },
        float: (t, d, a) => ({ dy: Math.sin(t * 1.6) * 6 * a }), lean: (t, d, a, dir) => ({ rot: dir * 12 * ease(clamp(t / 0.6, 0, 1)) * a }),
        pace: (t, d, a) => ({ dx: Math.sin(t * 1.4) * 22 * a, dy: -Math.abs(Math.sin(t * 5.6)) * 2.5 }),
        launch: (t, d) => { const u = t / d; if (u < 0.2) return { dx: Math.sin(t * 50) * 1.6, sy: 1 + u * 0.4 }; if (u < 0.55) { const k = (u - 0.2) / 0.35; return { dy: -150 * k * k, sy: 1.25 }; } if (u < 0.6) return { dy: 140, sy: 1.1 }; const k = ease((u - 0.6) / 0.4); return { dy: 140 * (1 - k), sy: 1.1 - 0.1 * k }; },
        slide: (t, d, a, dir) => ({ dx: dir * 24 * Math.sin(clamp(t / d, 0, 1) * Math.PI) * a, rot: dir * 8 * Math.sin(clamp(t / d, 0, 1) * Math.PI) })
    };

    // ================= actions: a step is {t: ms, shape, mood, pose, props:[..], form, motion:{type,amp}, say, look:[x,y], blink, walk}
    const S = (t, o) => Object.assign({ t }, o || {});
    const ACTIONS = {
        hello: [S(2000, { pose: 'wave', mood: 'happy', say: '@hello' })], wave: [S(1700, { pose: 'wave', mood: 'happy' })], bow: [S(1500, { mood: 'content', motion: { type: 'nod', amp: 1.8 } })],
        nod: [S(1000, { mood: 'happy', motion: { type: 'nod' } })], no: [S(1000, { mood: 'concerned', motion: { type: 'shake' } })], shrug: [S(1700, { pose: 'shrug', mood: 'curious', motion: { type: 'wobble', amp: 0.5 } })],
        smile: [S(2200, { mood: 'content' })], blink: [S(700, { blink: 2 })], lookaround: [S(900, { look: [-1, -0.2] }), S(1000, { look: [1, 0.1] }), S(800, { look: [0, -0.7] })],
        giggle: [S(1300, { mood: 'laugh', motion: { type: 'laugh', amp: 0.7 } })], laugh: [S(2600, { mood: 'laugh', motion: { type: 'laugh' }, say: '@poke' })],
        jump: [S(1700, { mood: 'happy', motion: { type: 'jump' } })], hop: [S(1600, { mood: 'happy', motion: { type: 'hop' } })], spin: [S(1300, { mood: 'happy', motion: { type: 'spin' } })],
        dance: [S(4800, { pose: 'dance', form: 'stand', motion: { type: 'dance' }, props: ['notes'] })], excited: [S(2400, { mood: 'happy', pose: 'cheer', motion: { type: 'jump', amp: 0.7 } })],
        cheer: [S(2600, { pose: 'cheer', mood: 'proud', motion: { type: 'hop' } })], clap: [S(2400, { pose: 'clap', motion: { type: 'hop', amp: 0.5 } })],
        celebrate: [S(900, { shape: 'trophy', mood: 'proud', motion: { type: 'squash' } }), S(3200, { shape: 'trophy', mood: 'proud', pose: 'cheer', motion: { type: 'jump', amp: 0.8 }, props: ['confetti'], say: '@done' })],
        think: [S(3000, { pose: 'think', mood: 'thoughtful', look: [-1, -0.8] })], ponder: [S(800, { mood: 'curious', motion: { type: 'wobble' } }), S(2600, { shape: 'question', motion: { type: 'float', amp: 0.6 } })],
        idea: [S(1000, { mood: 'curious', motion: { type: 'squash' } }), S(2600, { shape: 'bulb', mood: 'surprised', motion: { type: 'jump', amp: 0.7 } })],
        warn: [S(900, { mood: 'surprised', motion: { type: 'squash' } }), S(2800, { shape: 'danger', motion: { type: 'shake' } })], wait: [S(3400, { shape: 'hourglass', motion: { type: 'float', amp: 0.4 } })],
        yes: [S(2200, { shape: 'tick', motion: { type: 'hop', amp: 0.7 } })], noway: [S(2200, { shape: 'cross', motion: { type: 'shake' } })], notice: [S(2400, { shape: 'exclamation', motion: { type: 'hop' } })],
        question: [S(2600, { shape: 'question', motion: { type: 'wobble' } })], knock: [S(2300, { pose: 'knock', props: ['ripple'], motion: { type: 'knock' }, mood: 'curious', say: 'Knock knock.' })],
        peek: [S(3000, { motion: { type: 'peek' }, mood: 'curious' })], peekaboo: [S(900, { motion: { type: 'hide' } }), S(700, { motion: { type: 'hide' } }), S(1100, { mood: 'surprised', motion: { type: 'rise' }, say: 'Peekaboo!' })],
        hide: [S(1600, { motion: { type: 'hide' }, mood: 'sleepy' })], sleep: [S(1000, { mood: 'sleepy', motion: { type: 'sink' } }), S(7000, { shape: 'moon', mood: 'sleepy', props: ['zzz'], form: 'relax' })],
        nap: [S(1100, { props: ['bed'], form: 'lie', mood: 'sleepy' }), S(7500, { props: ['bed', 'pillow', 'zzz'], form: 'lie', mood: 'sleepy' })],
        yawn: [S(2200, { mood: 'yawn', motion: { type: 'stretch', amp: 0.7 } })], stretch: [S(2600, { pose: 'stretch', mood: 'content', motion: { type: 'stretch' } })],
        wake: [S(1100, { mood: 'surprised', motion: { type: 'rise' } }), S(2000, { pose: 'stretch', mood: 'content', motion: { type: 'stretch' } })], rise: [S(1300, { mood: 'curious', motion: { type: 'rise' } })],
        stand: [S(4200, { form: 'stand', mood: 'calm', props: ['platform'] })], sit: [S(5200, { form: 'sit', props: ['chair'], mood: 'content' })], relax: [S(5200, { form: 'relax', mood: 'content', props: ['pillow'] })],
        work: [S(900, { form: 'sit', props: ['chair'] }), S(7200, { form: 'sit', props: ['chair'], pose: 'laptop', mood: 'thoughtful' })],
        calculate: [S(1000, { mood: 'curious', props: ['calculator'] }), S(4500, { pose: 'calc', mood: 'thoughtful', motion: { type: 'nod', amp: 0.5 } })],
        write: [S(5200, { pose: 'notes', mood: 'thoughtful' })], read: [S(1000, { shape: 'book', motion: { type: 'squash' } }), S(4200, { shape: 'book', motion: { type: 'float', amp: 0.4 } })],
        present: [S(6000, { pose: 'pointer', mood: 'happy', form: 'stand' })], coffee: [S(900, { form: 'sit', props: ['chair'] }), S(6500, { form: 'sit', props: ['chair'], pose: 'coffee', mood: 'content' })],
        play: [S(5200, { props: ['ball'], mood: 'happy', motion: { type: 'bounce' } })], sing: [S(4600, { props: ['notes'], mood: 'happy', motion: { type: 'float', amp: 0.5 } })],
        love: [S(3400, { shape: 'heart', mood: 'happy', motion: { type: 'bounce', amp: 0.7 } })], gift: [S(3000, { shape: 'gift', motion: { type: 'hop' } })], save: [S(3400, { shape: 'jar', motion: { type: 'hop', amp: 0.6 }, say: '@save' })],
        coin: [S(2400, { shape: 'coin', motion: { type: 'spin' } })], rain: [S(2400, { shape: 'cloud', motion: { type: 'float', amp: 0.5 } }), S(3000, { shape: 'umbrella', mood: 'happy', motion: { type: 'wobble', amp: 0.6 } })],
        rocket: [S(4200, { shape: 'rocket', mood: 'happy', motion: { type: 'launch' } })], lock: [S(2800, { shape: 'lock', motion: { type: 'squash', amp: 0.6 } })], shield: [S(3000, { shape: 'shield', motion: { type: 'hop', amp: 0.5 } })],
        star: [S(3000, { shape: 'star', motion: { type: 'spin' } })], bell: [S(2800, { shape: 'bell', motion: { type: 'wobble', amp: 1.4 } })], flag: [S(3000, { shape: 'flag', mood: 'proud', motion: { type: 'wobble', amp: 0.5 } })],
        calendar: [S(3000, { shape: 'calendar', motion: { type: 'float', amp: 0.5 } })], clock: [S(3400, { shape: 'clock', motion: { type: 'float', amp: 0.5 } })], search: [S(3600, { shape: 'magnifier', mood: 'curious', motion: { type: 'wobble', amp: 0.6 } })],
        chart: [S(3400, { shape: 'chart', motion: { type: 'hop', amp: 0.5 } })], wallet: [S(3000, { shape: 'wallet', motion: { type: 'hop', amp: 0.5 } })], notepad: [S(3200, { shape: 'notepad', motion: { type: 'wobble', amp: 0.5 } })],
        cube: [S(3000, { shape: 'cube', motion: { type: 'spin' } })], laptop: [S(3400, { shape: 'macbook', motion: { type: 'hop', amp: 0.5 } })], sign: [S(3600, { shape: 'signboard', motion: { type: 'wobble', amp: 0.5 } })],
        bubble: [S(3600, { shape: 'speech', motion: { type: 'float', amp: 0.5 } })], moon: [S(4200, { shape: 'moon', mood: 'sleepy', motion: { type: 'float', amp: 0.4 } })], bulb: [S(3000, { shape: 'bulb', mood: 'surprised', motion: { type: 'hop' } })],
        slide: [S(2400, { motion: { type: 'slide' }, mood: 'happy' })], pace: [S(5000, { form: 'stand', motion: { type: 'pace' }, mood: 'thoughtful', walk: true })], lean: [S(3000, { motion: { type: 'lean' }, mood: 'content' })], tremble: [S(1800, { mood: 'concerned', motion: { type: 'tremble' } })],
        proverb: [S(600, { mood: 'thoughtful' }), S(5600, { mood: 'content', pose: 'point', say: '@proverb' })], tipTalk: [S(600, { mood: 'curious' }), S(5600, { pose: 'insight', mood: 'happy', say: '@tip' })],
        chat: [S(4200, { mood: 'content', say: '@chat', motion: { type: 'nod', amp: 0.5 } })], sleepy: [S(3000, { mood: 'sleepy' })],
        morph: [S(3000, { shape: '?', mood: 'curious', motion: { type: 'hop', amp: 0.6 } })],
        // combinations
        morning: { chain: ['wake', 'stretch', 'coffee', 'work'] }, workday: { chain: ['work', 'think', 'calculate', 'yes'] }, breakTime: { chain: ['stand', 'coffee', 'relax'] }, bedtime: { chain: ['yawn', 'moon', 'nap'] },
        party: { chain: ['excited', 'dance', 'celebrate'] }, study: { chain: ['read', 'write', 'think', 'idea'] }, moneyCheck: { chain: ['calculate', 'chart', 'yes'] }, rainyDay: { chain: ['rain', 'sit', 'coffee'] },
        playTime: { chain: ['play', 'hop', 'laugh'] }, tour: { chain: ['cube', 'laptop', 'wallet', 'jar', 'star', 'love'] }
    };

    // ================= placement and the one global CSS
    function injectCss() {
        if (document.getElementById('gc-css')) return;
        const s = document.createElement('style'); s.id = 'gc-css';
        s.textContent = `
.gc { --gc-ink: #1b2430; position: fixed; left: 0; top: 0; z-index: 400; width: 56px; height: 56px; color: var(--gc-ink); pointer-events: none; }
html[data-gc-ink="white"] .gc { --gc-ink: #ffffff; }
.gc svg { position: absolute; left: 50%; top: 50%; width: 112px; height: 112px; margin: -56px 0 0 -56px; overflow: visible; pointer-events: none; filter: none !important; }
.gc .gc-hit { position: absolute; inset: 0; border-radius: 50%; cursor: pointer; background: none; border: 0; padding: 0; pointer-events: auto; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.gc.drag .gc-hit { cursor: grabbing; }
.gc.movable .gc-hit { cursor: grab; touch-action: none; }
.gc .gc-hit:focus-visible { outline: 2px solid var(--blue-a, #1fb8f5); outline-offset: 3px; }
.gc.settle { transition: left .34s cubic-bezier(.2,.9,.3,1), top .34s cubic-bezier(.2,.9,.3,1); }
.gc-bubble { position: absolute; max-width: 230px; width: max-content; padding: 9px 13px; border-radius: 16px; font-size: .95rem; line-height: 1.4; color: var(--text-main); background: var(--glass-hi, rgba(255,255,255,.85)); border: 1px solid var(--glass-line, rgba(255,255,255,.6)); -webkit-backdrop-filter: blur(var(--glass-blur, 20px)); backdrop-filter: blur(var(--glass-blur, 20px)); box-shadow: 0 8px 24px rgba(30,20,60,.18); opacity: 0; pointer-events: none; transform: scale(.92); transition: opacity .35s ease, transform .35s cubic-bezier(.2,.9,.3,1.2); z-index: 5; }
.gc.glide { transition: left 1.9s ease-in-out, top 1.9s ease-in-out; }
.gc-card { position: fixed; left: 50%; bottom: calc(150px + env(safe-area-inset-bottom)); transform: translateX(-50%) translateY(10px); max-width: min(86%, 340px); padding: 10px 15px; border-radius: 16px; font-size: .95rem; line-height: 1.4; color: var(--text-main); background: var(--glass-hi, rgba(255,255,255,.88)); border: 1px solid var(--glass-line, rgba(255,255,255,.6)); box-shadow: 0 8px 24px rgba(30,20,60,.2); opacity: 0; pointer-events: none; transition: opacity .3s, transform .3s; z-index: 399; text-align: center; }
.gc-card { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
.gc-card .gc-undo { background: color-mix(in srgb, var(--blue-b, #4a6cf7) 16%, transparent); color: var(--text-main); border: 1px solid var(--glass-line, rgba(0,0,0,.15)); border-radius: 12px; padding: 5px 12px; font-size: .9rem; }
.gc-ask { position: fixed; left: 50%; bottom: calc(150px + env(safe-area-inset-bottom)); transform: translateX(-50%) translateY(10px); width: min(88%, 360px); padding: 14px 16px; border-radius: 18px; color: var(--text-main); background: var(--glass-hi, rgba(255,255,255,.92)); -webkit-backdrop-filter: blur(var(--glass-blur, 20px)); backdrop-filter: blur(var(--glass-blur, 20px)); border: 1px solid var(--glass-line, rgba(255,255,255,.6)); box-shadow: 0 10px 30px rgba(30,20,60,.25); opacity: 0; pointer-events: none; transition: opacity .3s, transform .3s; z-index: 401; }
.gc-ask.on { opacity: 1; transform: translateX(-50%); pointer-events: auto; }
.gc-ask .q { font-size: 1rem; line-height: 1.4; margin-bottom: 10px; } .gc-ask .r { display: flex; gap: 8px; align-items: center; }
.gc-ask input { flex: 1; min-width: 0; font-size: 1.1rem; padding: 9px 12px; border-radius: 12px; border: 1px solid var(--glass-line, rgba(0,0,0,.15)); background: var(--input-bg, #fff); color: var(--text-main); }
.gc-ask button { border-radius: 12px; padding: 9px 14px; font-size: .95rem; border: 1px solid var(--btn-line, rgba(40,55,95,.30)); background: var(--btn-bg, rgba(255,255,255,.55)); color: var(--text-main); } .gc-ask button.ok { background: linear-gradient(135deg, var(--blue-a, #7aa7ff), var(--blue-b, #4a6cf7)); color: var(--on-accent, #fff); border: none; font-weight: 600; }
.gc-ask .err { color: var(--warning, #d63a34); font-size: .85rem; margin-top: 6px; min-height: 1em; }
html.lite .gc-ask, body.still .gc-ask { transition: none; }
.gc-card.on { opacity: 1; transform: translateX(-50%); pointer-events: auto; }
html.lite .gc-card, body.still .gc-card { transition: none; }
.gc-bubble.on { opacity: 1; transform: none; pointer-events: auto; }
.gc-set input[type=range] { width: 100%; accent-color: var(--blue-b, #4a6cf7); margin: 4px 0 2px; }
.gc-set .gc-lbl { display: flex; justify-content: space-between; font-size: .85rem; color: var(--text-muted); }
.gc-set .gc-row { margin-top: 12px; }
.gc-set .set-select { width: 100%; max-width: 100%; margin-top: 4px; }
@media (prefers-reduced-motion: reduce) { .gc.settle { transition: none; } .gc-bubble { transition: none; } }
`;
        document.head.appendChild(s);
    }
    // adaptive ink: the real text colour of the app tells us if the screen is dark
    function rgbOf(v) { v = (v || '').trim(); let m = v.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i); if (m) return [+m[1], +m[2], +m[3]]; m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); if (!m) return null; let t = m[1]; if (t.length === 3) t = t.split('').map(c => c + c).join(''); return [parseInt(t.slice(0, 2), 16), parseInt(t.slice(2, 4), 16), parseInt(t.slice(4, 6), 16)]; }
    function updateInk() { try { const r = document.documentElement, cs = getComputedStyle(r), c = rgbOf(cs.getPropertyValue('--text-main')) || rgbOf(getComputedStyle(document.body).color); if (c) r.setAttribute('data-gc-ink', (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 > 0.58 ? 'white' : 'dark'); } catch (e) {} }
    let inkOn = false; function watchInk() { if (inkOn) return; inkOn = true; updateInk(); try { new MutationObserver(updateInk).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-look', 'data-scheme', 'data-acc', 'class', 'style'] }); } catch (e) {} if (root.matchMedia) { const q = root.matchMedia('(prefers-color-scheme: dark)'); if (q.addEventListener) q.addEventListener('change', () => setTimeout(updateInk, 30)); } root.addEventListener('pageshow', updateInk); }

    let current = null;
    function create(host, opts) {
        injectCss(); watchInk(); opts = opts || {}; loadPrefs(opts.legacyPlace);
        const shell = document.createElement('div'); shell.className = 'gc'; document.body.appendChild(shell);
        host.style.width = '56px'; host.style.height = '56px'; host.style.flexShrink = '0'; host.innerHTML = '';
        const svg = mk('svg', { viewBox: '-60 -60 120 120', 'aria-hidden': 'true' }, shell), defs = mk('defs', {}, svg), uid = 'gc' + Math.floor(Math.random() * 1e6);
        const SS = {}, grad = (tag, id, at, st) => { const g = mk(tag, Object.assign({ id: uid + id }, at), defs); SS[id] = st.map(([o, c, a]) => mk('stop', { offset: o, 'stop-color': c, 'stop-opacity': a === undefined ? 1 : a }, g)); return g; };
        grad('radialGradient', 'g', { cx: '50%', cy: '50%', r: '55%' }, [['0', '#ffffff', 0.05], ['.55', '#bff3ee', 0.1], ['.86', '#9fe4ea', 0.22], ['1', '#ffffff', 0.34]]);
        grad('radialGradient', 's', { cx: '40%', cy: '38%', r: '66%' }, [['.6', '#0b3a5c', 0], ['1', '#0b3a5c', 0.22]]);
        grad('radialGradient', 'w', { cx: '72%', cy: '84%', r: '50%' }, [['0', '#ffd27a', 0.36], ['1', '#ffd27a', 0]]);
        grad('radialGradient', 'c', { cx: '24%', cy: '30%', r: '54%' }, [['0', '#7fe0cf', 0.4], ['1', '#7fe0cf', 0]]);
        grad('radialGradient', 'sp', { cx: '50%', cy: '50%', r: '50%' }, [['0', '#ffffff', 0.95], ['1', '#ffffff', 0]]);
        const rimG = grad('linearGradient', 'r', { x1: '0', y1: '0', x2: '1', y2: '1' }, [['0', '#ffd98a'], ['.5', '#8fe3d3'], ['1', '#ffd98a']]);
        grad('linearGradient', 'o', { x1: '0', y1: '0', x2: '1', y2: '0' }, [['0', '#7fe0e8'], ['.5', '#ffffff'], ['1', '#f5d29a']]);
        grad('radialGradient', 'ht', { cx: '50%', cy: '50%', r: '50%' }, [['.45', '#7fe0e8', 0.5], ['1', '#7fe0e8', 0]]);
        grad('radialGradient', 'hg', { cx: '50%', cy: '50%', r: '50%' }, [['.45', '#ffd98a', 0.4], ['1', '#ffd98a', 0]]);
        grad('radialGradient', 'oh', { cx: '31%', cy: '22%', r: '42%' }, [['0', '#ffffff', 0.85], ['.35', '#ffffff', 0.28], ['1', '#ffffff', 0]]);
        grad('radialGradient', 'oc', { cx: '73%', cy: '80%', r: '40%' }, [['0', '#ffe3a6', 0.55], ['1', '#ffe3a6', 0]]);
        grad('radialGradient', 'nb', { cx: '50%', cy: '50%', r: '50%' }, [['.3', '#b79bff', 0.34], ['.7', '#ff9fd0', 0.12], ['1', '#ff9fd0', 0]]);
        grad('linearGradient', 'fl', { x1: '0', y1: '0', x2: '1', y2: '0' }, [['0', '#ffffff', 0], ['.5', '#ffffff', 0.95], ['1', '#ffffff', 0]]);
        grad('linearGradient', 'fv', { x1: '0', y1: '0', x2: '0', y2: '1' }, [['0', '#bff6ff', 0], ['.5', '#ffffff', 0.9], ['1', '#bff6ff', 0]]);
        const blurF = mk('filter', { id: uid + 'bl', x: '-60%', y: '-300%', width: '220%', height: '700%' }, defs); mk('feGaussianBlur', { stdDeviation: 3.4 }, blurF);
        const G = ART.grads(defs, uid), U = id => `url(#${uid}${id})`;
        // shifting invisibility: soft dark blobs drift across a mask over the body fill (never the face)
        grad('radialGradient', 'fb', { cx: '50%', cy: '50%', r: '50%' }, [['0', '#000', 0.95], ['.55', '#000', 0.5], ['1', '#000', 0]]);
        const fmask = mk('mask', { id: uid + 'fm', maskUnits: 'userSpaceOnUse', x: -90, y: -90, width: 180, height: 180 }, defs); mk('rect', { x: -90, y: -90, width: 180, height: 180, fill: '#fff' }, fmask);
        const fblobs = [0, 1, 2].map(() => mk('circle', { r: 20, fill: U('fb') }, fmask));

        // ---- layers, back to front
        const shadow = mk('ellipse', { cx: 0, cy: 41, rx: 20, ry: 4.6, fill: '#2a2f6e', opacity: 0.2, filter: `url(#${uid}bl)` }, svg);
        const auraT = mk('circle', { cx: -5, cy: -3, r: 48, fill: U('ht') }, svg), auraG = mk('circle', { cx: 8, cy: 9, r: 42, fill: U('hg') }, svg);
        const ring = (rx, ry) => { const g = mk('g', {}, svg); mk('ellipse', { cx: 0, cy: 0, rx, ry, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.5, opacity: 0.28 }, g); mk('ellipse', { cx: 0, cy: 0, rx, ry, fill: 'none', stroke: U('o'), 'stroke-width': 0.8, opacity: 0.75 }, g); return g; };
        const orb1 = ring(47, 17), orb2 = ring(43, 24), sp1 = mk('circle', { r: 1.3, fill: '#fff' }, svg), sp2 = mk('circle', { r: 1, fill: '#ffe2a8' }, svg);
        const auraV = mk('circle', { cx: 6, cy: -6, r: 50, fill: U('nb') }, svg);
        const st4 = (fill) => mk('path', { d: 'M0 -4.2Q.5 -.5 4.2 0Q.5 .5 0 4.2Q-.5 .5 -4.2 0Q-.5 -.5 0 -4.2Z', fill }, svg), star1 = st4('#ffffff'), star2 = st4('#ffe2a8');
        const twink = [[-46, -20], [44, -30], [50, 14], [-38, 30], [22, -48], [-18, 46]].map(([x, y], i) => ({ e: mk('circle', { cx: x, cy: y, r: i % 2 ? 0.7 : 0.9, fill: i % 3 ? '#fff' : '#cfeeff' }, svg), i }));
        const scene_ = mk('g', {}, svg), backL = mk('g', {}, scene_), bodyG = mk('g', {}, scene_), frontL = mk('g', {}, scene_), limbs = mk('g', {}, scene_), feet = mk('g', {}, scene_);
        // body
        const fillG = mk('g', {}, bodyG);
        const bodyPaths = [mk('path', { fill: U('g') }, fillG), mk('path', { fill: U('c') }, fillG), mk('path', { fill: U('w') }, fillG), mk('path', { fill: U('s') }, fillG)];
        const tintP = mk('path', { fill: '#fff', opacity: 0 }, fillG); bodyPaths.push(tintP);
        const orbHi = mk('path', { fill: U('oh'), opacity: 0 }, fillG), orbCa = mk('path', { fill: U('oc'), opacity: 0 }, fillG); bodyPaths.push(orbHi, orbCa);
        const rimP = mk('path', { fill: 'none', stroke: U('r'), 'stroke-width': 1.6, opacity: 0.9, pathLength: 100 }, bodyG), inkP = mk('path', { fill: 'none', stroke: INK, 'stroke-width': 0.55, opacity: 0.6, pathLength: 100 }, bodyG);
        bodyPaths.push(rimP, inkP);
        // outline light: a soft white band and a soft dark band travel round the edge (layers of different length make the ends fade)
        const edgeL = [[34, 0.2, 2.0], [22, 0.38, 1.7], [11, 0.85, 1.4]].map(([w, o, sw]) => ({ w, o, W: mk('path', { fill: 'none', stroke: '#fff', 'stroke-width': sw, 'stroke-linecap': 'round', pathLength: 100, opacity: o }, bodyG), B: mk('path', { fill: 'none', stroke: '#0b1020', 'stroke-width': sw * 0.8, 'stroke-linecap': 'round', pathLength: 100, opacity: o * 0.55 }, bodyG) }));
        edgeL.forEach(l => { bodyPaths.push(l.W, l.B); });
        const glyphL = mk('g', {}, bodyG), spec = mk('ellipse', { rx: 11, ry: 5.5, fill: U('sp') }, bodyG);
        const flare = mk('g', {}, bodyG), FT = root.GFlareTex || null, flTint = [], flImg = [];
        if (FT) {
            const mkF = id => { const f = mk('filter', { id: uid + id, x: '0', y: '0', width: '1', height: '1', 'color-interpolation-filters': 'sRGB' }, defs); const fl = mk('feFlood', { 'flood-color': '#ffe2a8', result: 'c' }, f); mk('feComposite', { in: 'c', in2: 'SourceGraphic', operator: 'in' }, f); flTint.push(fl); return U(id); };
            const fa = mkF('fta'), fb = mkF('ftb');
            // main bloom (soft, no spikes: softened texture), plus faint ghosts along the line through the body
            flImg.push({ e: mk('image', { href: FT.glow, x: -31, y: -31, width: 62, height: 62, filter: fa, preserveAspectRatio: 'none' }, flare), k: 'glow' });
            [[1.1, 15, 0.5, fb], [2.1, 9, 0.38, fa], [3.2, 22, 0.22, fb]].forEach(([t, sz, op, f]) => flImg.push({ e: mk('image', { href: FT.ghost, x: -sz / 2, y: -sz / 2, width: sz, height: sz, filter: f, opacity: op, preserveAspectRatio: 'none' }, flare), k: 'ghost', t, op }));
        }
        flare.style.mixBlendMode = 'screen';
        // "catch the light": every so often the whitest part of the outline blooms for a moment
        const catchG = mk('g', { opacity: 0 }, bodyG); catchG.style.mixBlendMode = 'screen'; let catchSoft = null, flC = null;
        if (FT) { const f = mk('filter', { id: uid + 'ftc', x: '0', y: '0', width: '1', height: '1', 'color-interpolation-filters': 'sRGB' }, defs); flC = mk('feFlood', { 'flood-color': '#ffe9c2', result: 'c' }, f); mk('feComposite', { in: 'c', in2: 'SourceGraphic', operator: 'in' }, f); flTint.push(flC);
            catchSoft = mk('image', { href: FT.glow, x: -22, y: -22, width: 44, height: 44, filter: U('ftc'), preserveAspectRatio: 'none' }, catchG); }
        const ct = { next: performance.now() + 5000 + Math.random() * 6000, t0: 0, dur: 2200 };
        const face = mk('g', {}, bodyG);
        const st = (a) => Object.assign({ fill: 'none', stroke: INK, 'stroke-linecap': 'round' }, a);
        const browL = mk('path', st({ 'stroke-width': 1.5 }), face), browR = mk('path', st({ 'stroke-width': 1.5 }), face);
        const eyeL = mk('ellipse', { fill: INK }, face), eyeR = mk('ellipse', { fill: INK }, face);
        const happyL = mk('path', st({ 'stroke-width': 2 }), face), happyR = mk('path', st({ 'stroke-width': 2 }), face), closeL = mk('path', st({ 'stroke-width': 2 }), face), closeR = mk('path', st({ 'stroke-width': 2 }), face);
        const mouth = mk('path', st({ 'stroke-width': 2 }), face), mouthO = mk('ellipse', { fill: INK }, face);
        const footL = mk('ellipse', { rx: 6, ry: 3, fill: INK, opacity: 0 }, feet), footR = mk('ellipse', { rx: 6, ry: 3, fill: INK, opacity: 0 }, feet);
        const armL = mk('path', st({ 'stroke-width': 1.9, opacity: 0 }), limbs), armR = mk('path', st({ 'stroke-width': 1.9, opacity: 0 }), limbs);
        const handL = mk('circle', { r: 2.5, fill: INK, opacity: 0 }, limbs), handR = mk('circle', { r: 2.5, fill: INK, opacity: 0 }, limbs);
        const hit = document.createElement('button'); hit.type = 'button'; hit.className = 'gc-hit'; hit.setAttribute('aria-label', 'Circle Companion. Tap to play.'); shell.appendChild(hit);
        const bubble = document.createElement('div'); bubble.className = 'gc-bubble'; shell.appendChild(bubble);

        // ---- props
        const props = {};
        Object.keys(PROPS).forEach(name => {
            const d = PROPS[name], rec = { d, a: 0, t: 0, ticks: [] };
            const wrap = (layerG) => { const g = mk('g', { opacity: 0, display: 'none' }, layerG); return g; };
            if (d.layer === 'both') { rec.gb = wrap(backL); rec.gf = wrap(frontL); d.back(Hh(rec.gb), G); d.front(Hh(rec.gf), G); }
            else { rec.gf = wrap(d.layer === 'back' ? backL : frontL); const r = d.build(Hh(rec.gf), G); if (r && r.tick) rec.ticks.push(r.tick); }
            props[name] = rec;
        });
        const glyphs = {};
        function glyph(id) { if (glyphs[id]) return glyphs[id]; const sh = SHAPES[id], g = mk('g', { display: 'none', opacity: 0 }, glyphL), rec = { g, op: 0, tick: null }; if (sh.glyph) { const r = sh.glyph(Hh(g)); if (r && r.tick) rec.tick = r.tick; } glyphs[id] = rec; return rec; }

        // ---- state
        const cur = new Float32Array(N * 2), vel = new Float32Array(N * 2), tgt = new Float32Array(N * 2);
        const P = Object.assign({}, BASE, { blink: 0, fo: 1, fx: 0, fy: 0, fs: 1, tr: 255, tg: 255, tb: 255, ta: 0, feet: 0, fdy: 0, fdx: 0, fsx: 1, fsy: 1, frot: 0, armL: 0, armR: 0, hxL: 0, hyL: 0, hxR: 0, hyR: 0, sk: 0 });
        let T = Object.assign({}, BASE), base = 'calm', shapeId = 'circle', scene = { shape: 'rest', mood: null, pose: 'none', props: [], form: null, walk: false, look: null }, poseOver = null, poseTimer = null;
        let motion = null, act = null, actTimer = null, actSeq = 0, running = false, last = 0, t0 = performance.now(), shown = true;
        let blinkAt = t0 + 2500, blinkUntil = 0, gazeAt = t0 + 3000, gzx = 0, gzy = 0, extraBlink = 0, ks = 0, kv = 0, pgx = 0, pgy = 0, ptAt = 0, ptx = 0, pty = 0, speakUntil = 0, bubbleTimer = null, typed = null;
        let lastTouch = 0, pokes = [], dragging = false, nextIdle = null, bx = { x0: -30, x1: 30, y0: -30, y1: 30 }, hdrOk = false;
        const restId = () => PR.rest === 'ghost' ? 'ghost' : 'circle';
        const rest = (f) => f ? f : null;

        function setTargetShape(id, instant) {
            if (PR.look === 'orb') id = 'circle'; else if (id === '?' || id === 'rest') id = id === 'rest' ? restId() : pickOne(ORDER);
            const sh = SHAPES[id] || SHAPES.circle; shapeId = id; const o = ART.outline(sh);
            for (let i = 0; i < N; i++) { tgt[i * 2] = o[i][0]; tgt[i * 2 + 1] = o[i][1]; }
            const f = sh.face || { o: 1, x: 0, y: 0, s: 1 }; T.fo = f.o; T.fx = f.x; T.fy = f.y; T.fs = f.s;
            const tn = sh.tint || [255, 255, 255, 0]; T.tr = tn[0]; T.tg = tn[1]; T.tb = tn[2]; T.ta = tn[3]; T.sk = sh.skirt ? 1 : 0;
            if (SHAPES[id].glyph) glyph(id);
            if (instant) { cur.set(tgt); vel.fill(0); }
        }
        function applyScene(instant) {
            const m = Object.assign({}, BASE, MOODS[scene.mood || base] || {});
            const pn = poseOver || scene.pose || 'none', p = POSES[pn] || POSES.none;
            if (pn !== 'none' && p.mood && !scene.mood) Object.assign(m, MOODS[p.mood] || {});
            const keep = { fo: T.fo, fx: T.fx, fy: T.fy, fs: T.fs, tr: T.tr, tg: T.tg, tb: T.tb, ta: T.ta, sk: T.sk };
            T = Object.assign(m, keep);
            T.armL = p.L ? 1 : 0; T.armR = p.R ? 1 : 0; if (p.L) { T.hxL = p.L[0]; T.hyL = p.L[1]; } if (p.R) { T.hxR = p.R[0]; T.hyR = p.R[1]; }
            const fm = FORMS[scene.form] || { dy: 0, dx: 0, sx: 1, sy: 1, rot: 0, feet: 0 };
            T.fdy = fm.dy; T.fdx = fm.dx || 0; T.fsx = fm.sx; T.fsy = fm.sy; T.frot = fm.rot; T.feet = fm.feet || (scene.walk ? 1 : 0);
            const want = new Set(scene.props.concat(p.props || [])); Object.keys(props).forEach(k => props[k].t = want.has(k) ? 1 : 0);
            setTargetShape(scene.shape || 'rest', instant);
            if (instant) snapAll();
        }
        function snapAll() { Object.keys(T).forEach(k => { if (typeof T[k] === 'number') P[k] = T[k]; }); Object.keys(props).forEach(k => props[k].a = props[k].t); }

        // ---- speaking
        function dayCount(add) { let c = 0; const d = new Date().toDateString(); try { const o = JSON.parse(localStorage.getItem('gc_say') || '{}'); c = o.d === d ? o.c : 0; if (add) localStorage.setItem('gc_say', JSON.stringify({ d, c: c + 1 })); } catch (e) {} return c; }
        function placeBubble() {
            const r = shell.getBoundingClientRect(), bw = bubble.offsetWidth, bh = bubble.offsetHeight, vw = innerWidth, vh = innerHeight, m = 8;
            let x = r.left + r.width / 2 - bw / 2, y = r.top + r.height / 2 > vh / 2 ? r.top - bh - 14 : r.bottom + 14;
            x = clamp(x, m, vw - bw - m); if (y < m) y = r.bottom + 14; if (y + bh > vh - m) y = Math.max(m, r.top - bh - 14);
            bubble.style.left = (x - r.left) + 'px'; bubble.style.top = (y - r.top) + 'px';
        }
        function say(text, ms, force) {
            if (!text || PR.place === 'off') return false; if (PR.talk <= 0) return false;
            bubble.textContent = ''; bubble.style.visibility = 'hidden'; bubble.classList.add('on'); bubble.textContent = text; placeBubble(); bubble.style.visibility = '';
            clearTimeout(bubbleTimer); const dur = ms || Math.max(3600, text.length * 75); bubbleTimer = setTimeout(() => bubble.classList.remove('on'), dur);
            speakUntil = performance.now() + Math.min(2600, text.length * 55); return true;
        }
        bubble.addEventListener('click', () => { bubble.classList.remove('on'); clearTimeout(bubbleTimer); });
        let lastQuiet = 0;
        // Unasked talk: within the daily limit and never twice within 10 minutes.
        function sayQuiet(text, ms) { if (PR.talk <= 0 || dayCount() >= PR.talk) return false; if (Date.now() - lastQuiet < 600000) return false; if (!say(text, ms)) return false; lastQuiet = Date.now(); dayCount(true); return true; }
        function stepSay(s, o) { if (!s) return; let line = s; if (s[0] === '@') { const tag = s.slice(1); if ((tag === 'proverb' || tag === 'tip') && !PR.wise) return; line = LINES.pick(tag); } if (o && o.force) { if (PR.talk > 0) say(line); } else sayQuiet(line); }

        // ---- actions
        function cancelAction() { clearTimeout(actTimer); act = null; motion = null; }
        function finish() { act = null; motion = null; scene = { shape: 'rest', mood: null, pose: 'none', props: [], form: null, walk: false, look: null }; applyScene(); }
        function runSteps(steps, o, done) {
            const id = ++actSeq; act = { id, name: o.name }; let i = 0;
            const go = () => {
                if (!act || act.id !== id) return; if (i >= steps.length) { if (done) done(); else finish(); return; }
                const s = steps[i++], st_ = still();
                if (s.shape !== undefined) scene.shape = s.shape; else if (i === 1) scene.shape = 'rest';
                ['mood', 'pose', 'form', 'walk', 'look'].forEach(k => { if (s[k] !== undefined) scene[k] = s[k]; else if (i === 1) scene[k] = (k === 'pose' ? 'none' : k === 'walk' ? false : null); });
                if (s.props) scene.props = s.props.slice(); else if (i === 1) scene.props = [];
                if (s.look) { gzx = s.look[0]; gzy = s.look[1]; gazeAt = performance.now() + s.t + 400; }
                if (s.blink) extraBlink = s.blink;
                if (s.motion && !st_) { const dir = (shell.getBoundingClientRect().left + 28) < innerWidth / 2 ? -1 : 1; motion = { f: MOT[s.motion.type] || MOT.hop, amp: s.motion.amp || 1, start: performance.now(), d: Math.max(0.3, s.t / 1000), dir }; } else motion = null;
                applyScene(st_); if (s.say) stepSay(s.say, o);
                actTimer = setTimeout(go, st_ ? Math.min(s.t, 1500) : s.t);
            };
            go();
        }
        function runAction(name, o) {
            o = Object.assign({ name }, o || {}); const def = ACTIONS[name]; if (!def || PR.place === 'off') return false; cancelAction();
            if (def.chain) { let k = 0; const next = () => { if (k >= def.chain.length) { finish(); return; } const d2 = ACTIONS[def.chain[k++]]; if (!d2) { next(); return; } const steps = d2.chain ? [] : d2; runSteps(steps, o, next); }; next(); return true; }
            runSteps(def, o); return true;
        }

        // ---- idle life: it does something now and then, like a small living thing
        const IDLE = [
            ['blink', 6, 1], ['smile', 4, 1], ['lookaround', 5, 1], ['hop', 3, 1], ['stretch', 3, 1], ['yawn', 2, 1], ['nod', 1, 1], ['sing', 2, 1], ['wave', 2, 1], ['shrug', 1, 1], ['chat', 3, 1], ['proverb', 3, 1], ['tipTalk', 2, 1],
            ['think', 3, 2], ['peek', 3, 2], ['knock', 2, 2], ['play', 3, 2], ['read', 2, 2], ['write', 2, 2], ['calculate', 2, 2], ['peekaboo', 2, 2], ['morph', 6, 2], ['idea', 2, 2], ['love', 1, 2], ['spin', 2, 2], ['coin', 1, 2], ['rain', 1, 2],
            ['dance', 2, 3], ['coffee', 2, 3], ['work', 2, 3], ['nap', 1, 3], ['sleep', 1, 3], ['rocket', 1, 3], ['party', 1, 3], ['stand', 2, 3], ['sit', 2, 3], ['relax', 2, 3]
        ];
        function idleTick() {
            nextIdle = null; if (document.hidden || PR.place === 'off' || PR.act <= 0) { scheduleIdle(8000); return; }
            const A = PR.act, maxE = A < 30 ? 1 : A < 65 ? 2 : 3, busyUi = opts.busy && opts.busy(), hr = new Date().getHours(), night = hr >= 23 || hr < 5;
            if (act || dragging || performance.now() - lastTouch < 3000 || (busyUi && Math.random() < 0.85) || still()) { scheduleIdle(9000); return; }
            const pool = IDLE.filter(x => x[2] <= maxE && !(busyUi && x[2] > 1)).map(x => { let w = x[1]; if (night) { if (x[0] === 'nap' || x[0] === 'sleep' || x[0] === 'yawn') w *= 6; if (x[0] === 'dance' || x[0] === 'party' || x[0] === 'rocket') w *= 0.15; } if (!PR.wise && (x[0] === 'proverb' || x[0] === 'tipTalk')) w = 0; return [x[0], w]; });
            let tot = pool.reduce((s, x) => s + x[1], 0), r = Math.random() * tot, pickN = pool[0][0]; for (const x of pool) { r -= x[1]; if (r <= 0) { pickN = x[0]; break; } }
            if (pickN === 'tipTalk' && opts.tip) { const t = opts.tip(); if (t) { runAction('tipTalk', {}); setTimeout(() => { if (act) { } }, 0); lastTip = t; } }
            runAction(pickN, {}); scheduleIdle();
        }
        let lastTip = null;
        function scheduleIdle(ms) { clearTimeout(nextIdle); if (PR.act <= 0 || PR.place === 'off') return; const mean = 150 * Math.pow(0.04, PR.act / 100); nextIdle = setTimeout(idleTick, ms || mean * rnd(0.6, 1.4) * 1000); }

        // ---- poke: it reacts, for fun
        function poke() {
            const now = performance.now(); lastTouch = now; pokes = pokes.filter(t => now - t < 8000); pokes.push(now); kv = -3.2; const n = pokes.length;
            if (shown && !still()) {
                let a;
                if (n >= 7) a = 'peekaboo'; else if (n >= 4) a = 'dizzy'; else a = pickOne(['giggle', 'jump', 'spin', 'laugh', 'hop', 'wave', 'knock', 'peek', 'excited', 'bow', 'stretch', 'dance']);
                if (a === 'dizzy') { cancelAction(); runSteps([S(2400, { mood: 'surprised', motion: { type: 'spin' }, say: 'Oh! I am dizzy.', look: [1, 0.5] }), S(1400, { mood: 'concerned', motion: { type: 'wobble' } })], { force: true, name: 'dizzy' }); }
                else if (a === 'laugh') { runAction('laugh', { force: true }); }
                else { runAction(a, { force: true }); if (n === 1 || Math.random() < 0.4) { const line = (Math.random() < 0.35 && opts.tip && opts.tip()) || LINES.pick('poke'); if (PR.talk > 0) say(line); } }
            } else if (PR.talk > 0) say(opts.tip && opts.tip() || LINES.pick('poke'));
        }

        // ---- frame
        const cx0 = (a, b) => (a + b) / 2, cy0 = cx0;
        let frameN = 0;
        function draw(time, st_) {
            const s = time / 1000, mv = st_ ? 0 : PR.move / 100 * 1.6, pose = POSES[poseOver || scene.pose || 'none'] || POSES.none;
            const breath = (Math.sin(s * 1.5) * 0.018 + Math.sin(s * 0.63 + 1) * 0.008) * mv, flt = (Math.sin(s * 0.7) * 1.4 + Math.sin(s * 1.13 + 2) * 0.7) * mv, drift = (Math.sin(s * 0.41 + 3) * 1.6 + Math.sin(s * 0.97) * 0.8) * mv;
            // body: points + a little jelly
            const J = 0.42 * mv * (PR.look === 'orb' ? 0.1 : 1), sk = P.sk, pts = new Array(N);
            let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
            for (let i = 0; i < N; i++) {
                let x = cur[i * 2], y = cur[i * 2 + 1]; const l = Math.hypot(x, y) || 1, nz = (Math.sin(s * 1.3 + i * 0.9) * 0.5 + Math.sin(s * 0.7 - i * 1.7) * 0.5) * J;
                x += x / l * nz; y += y / l * nz;
                if (sk > 0.01 && y > 20) { y += Math.sin(s * 2.4 + x * 0.22) * 2.3 * sk * Math.max(0.4, mv * 0.8 + 0.2); x += Math.cos(s * 2 + y) * 0.5 * sk; }
                pts[i] = [x, y]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
            bx = { x0, x1, y0, y1 };
            let d = ''; for (let i = 0; i < N; i++) { const p0 = pts[(i + N - 1) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N]; if (i === 0) d += `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`; d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; }
            d += 'Z'; bodyPaths.forEach(p => p.setAttribute('d', d));
            const fxOn = PR.fx !== 'off' && !st_ && !still(), richOn = PR.fx === 'rich' && fxOn && PR.look !== 'orb';
            let wpt = null;
            if (fxOn) {
                const f1 = (s * 0.03) % 1, f2 = ((0.5 - s * 0.021) % 1 + 1) % 1, wrap = v => ((v % 100) + 100) % 100;
                edgeL.forEach(l => { l.W.style.display = ''; l.B.style.display = ''; l.W.setAttribute('stroke-dasharray', `${l.w} ${100 - l.w}`); l.W.setAttribute('stroke-dashoffset', wrap(l.w / 2 - f1 * 100).toFixed(2)); l.B.setAttribute('stroke-dasharray', `${l.w} ${100 - l.w}`); l.B.setAttribute('stroke-dashoffset', wrap(l.w / 2 - f2 * 100).toFixed(2)); });
                const g1 = 20, g2 = 26, c1 = ((f1 + 0.3) % 1) * 100, c2 = ((f2 + 0.45) % 1) * 100;
                inkP.setAttribute('stroke-dasharray', `${100 - g1} ${g1}`); inkP.setAttribute('stroke-dashoffset', wrap(100 - g1 / 2 - c1).toFixed(2));
                rimP.setAttribute('stroke-dasharray', `${100 - g2} ${g2}`); rimP.setAttribute('stroke-dashoffset', wrap(100 - g2 / 2 - c2).toFixed(2));
                if (ct.t0 || performance.now() > ct.next - 120) { try { wpt = inkP.getPointAtLength(f1 * inkP.getTotalLength()); } catch (e) { wpt = null; } }   // measuring the path is costly: only while the flare is on
            } else { edgeL.forEach(l => { l.W.style.display = 'none'; l.B.style.display = 'none'; }); inkP.removeAttribute('stroke-dasharray'); rimP.removeAttribute('stroke-dasharray'); }
            if (richOn && (frameN++ & 1) === 0) {
                fillG.setAttribute('mask', U('fm'));
                fblobs.forEach((b, i) => { const w = 0.11 + i * 0.047, r = 17 + i * 5 + Math.sin(s * 0.23 + i) * 4; b.setAttribute('cx', (Math.sin(s * w + i * 2.1) * 26).toFixed(1)); b.setAttribute('cy', (Math.cos(s * (w * 0.8) + i * 1.3) * 26 + 4).toFixed(1)); b.setAttribute('r', r.toFixed(1)); b.setAttribute('opacity', (0.55 + 0.4 * Math.sin(s * 0.17 + i * 1.9)).toFixed(2)); });
            } else if (!richOn && fillG.hasAttribute('mask')) fillG.removeAttribute('mask');
            tintP.setAttribute('fill', `rgb(${P.tr | 0},${P.tg | 0},${P.tb | 0})`); tintP.setAttribute('opacity', P.ta.toFixed(2));
            const bw = x1 - x0, bh = y1 - y0; spec.setAttribute('cx', (x0 + bw * 0.3).toFixed(1)); spec.setAttribute('cy', (y0 + bh * 0.2).toFixed(1)); spec.setAttribute('rx', Math.max(4, bw * 0.19).toFixed(1)); spec.setAttribute('ry', Math.max(2.4, bh * 0.09).toFixed(1)); spec.setAttribute('transform', `rotate(-28 ${(x0 + bw * 0.3).toFixed(1)} ${(y0 + bh * 0.2).toFixed(1)})`);
            // whole-body transform: float, form, motion, squash around the ground
            const mo = motion ? motion.f((performance.now() - motion.start) / 1000, motion.d, motion.amp, motion.dir) : null, m = mo ? Object.assign({}, M0, mo) : M0;
            const by = y1, sc = P.sc * (1 + breath), sqx = 1 - ks * 0.09, sqy = 1 + ks * 0.09, ly = P.lift + flt + P.fdy;
            const sx = sc * P.fsx * m.sx * sqx, sy = sc * (1 - breath * 0.6) * P.fsy * m.sy * sqy, rot = P.tilt + drift + P.frot + m.rot, dx = P.fdx + m.dx, dy = ly + m.dy;
            const tr = `translate(${dx.toFixed(2)} ${(dy + by).toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(0 ${(-by).toFixed(2)})`;
            bodyG.setAttribute('transform', tr); limbs.setAttribute('transform', tr); feet.setAttribute('transform', tr);
            const pt = `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`; backL.setAttribute('transform', `translate(${dx.toFixed(2)} ${(m.dy * 0.4).toFixed(2)})`); frontL.setAttribute('transform', `translate(${dx.toFixed(2)} ${(m.dy * 0.4).toFixed(2)})`);
            shadow.setAttribute('rx', ((20 + (x1 - x0 - 60) * 0.2) * (1 - (dy - 5) * 0.012)).toFixed(1)); shadow.setAttribute('opacity', clamp(0.24 - (dy - 5) * 0.006, 0.06, 0.28).toFixed(3)); shadow.setAttribute('cx', dx.toFixed(1)); shadow.setAttribute('cy', Math.max(41, by + 11).toFixed(1));
            const gl = P.glow * (0.8 + 0.2 * Math.sin(s * 1.1)); auraT.setAttribute('opacity', gl.toFixed(2)); auraG.setAttribute('opacity', (gl * 0.85).toFixed(2));
            auraT.setAttribute('r', (44 + P.glow * 6).toFixed(1)); auraG.setAttribute('r', (38 + P.glow * 6).toFixed(1));
            const ox = dx * 0.8, oy = dy * 0.8; orb1.setAttribute('transform', `translate(${ox.toFixed(1)} ${oy.toFixed(1)}) rotate(${(-28 + s * 8 * mv).toFixed(2)})`); orb2.setAttribute('transform', `translate(${ox.toFixed(1)} ${oy.toFixed(1)}) rotate(${(52 - s * 5.5 * mv).toFixed(2)})`);
            auraV.setAttribute('opacity', (gl * 0.9).toFixed(2)); auraV.setAttribute('cx', (6 + dx * 0.8 + Math.sin(s * 0.5) * 3).toFixed(1)); auraV.setAttribute('cy', (-6 + dy * 0.8 + Math.cos(s * 0.4) * 3).toFixed(1));
            const fp = 0.45 + 0.4 * Math.sin(s * 1.2 + 1), fcx = x0 + bw * 0.3, fcy = y0 + bh * 0.2; flare.setAttribute('transform', `translate(${fcx.toFixed(1)} ${fcy.toFixed(1)})`); flare.setAttribute('opacity', (fp * (0.5 + P.glow * 0.5)).toFixed(2));
            flImg.forEach(o => { if (o.k === 'ghost') { const gx = (cx0(x0, x1) - fcx) * o.t * 0.5, gy = (cy0(y0, y1) - fcy) * o.t * 0.5; o.e.setAttribute('transform', `translate(${gx.toFixed(1)} ${gy.toFixed(1)})`); } else o.e.setAttribute('transform', `rotate(${(Math.sin(s * 0.5) * 8).toFixed(1)})`); });
            { const nowT = performance.now(); let env = 0;
              if (!ct.t0 && PR.catchlight !== false && fxOn && nowT > ct.next) { ct.t0 = nowT; ct.dur = 1800; }
              if (ct.t0) { const k = (nowT - ct.t0) / ct.dur; if (k >= 1) { ct.t0 = 0; ct.next = nowT + 10000 + Math.random() * 10000; } else env = Math.pow(Math.sin(Math.PI * k), 2); }
              if (catchSoft) { const px = wpt ? wpt.x : fcx, py = wpt ? wpt.y : fcy;
                catchG.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${(s * 6).toFixed(1)}) scale(${(0.7 + env * 0.9).toFixed(2)})`);
                catchG.setAttribute('opacity', Math.min(1, env * 1.15).toFixed(2)); } }
            twink.forEach(t => t.e.setAttribute('opacity', (0.15 + 0.85 * Math.max(0, Math.sin(s * (0.9 + t.i * 0.23) * Math.max(0.35, mv) + t.i * 1.9))).toFixed(2)));
            star1.setAttribute('transform', `translate(${sp1.getAttribute('cx') || 0} ${sp1.getAttribute('cy') || 0}) scale(${(0.6 + 0.6 * Math.abs(Math.sin(s * 1.3))).toFixed(2)})`); star2.setAttribute('transform', `translate(${sp2.getAttribute('cx') || 0} ${sp2.getAttribute('cy') || 0}) scale(${(0.5 + 0.6 * Math.abs(Math.sin(s * 0.9 + 1.7))).toFixed(2)})`);
            rimG.setAttribute('gradientTransform', `rotate(${((s * 12 * mv) % 360).toFixed(1)} .5 .5)`);
            const a1 = s * 0.6 * mv, a2 = s * 0.43 * mv + 2; sp1.setAttribute('cx', (ox + Math.cos(a1) * 40).toFixed(1)); sp1.setAttribute('cy', (oy + Math.sin(a1) * 15 - 8).toFixed(1)); sp1.setAttribute('opacity', (0.35 + 0.6 * Math.max(0, Math.sin(s * 1.3 * Math.max(0.3, mv)))).toFixed(2));
            sp2.setAttribute('cx', (ox + Math.cos(a2) * 36).toFixed(1)); sp2.setAttribute('cy', (oy + Math.sin(a2) * 20 + 10).toFixed(1)); sp2.setAttribute('opacity', (0.3 + 0.6 * Math.max(0, Math.sin(s * 0.9 * Math.max(0.3, mv) + 1.7))).toFixed(2));
            // glyphs of the current shape
            Object.keys(glyphs).forEach(id => { const g = glyphs[id], on = id === shapeId ? 1 : 0; g.op = lerp(g.op, on, st_ ? 1 : 0.14); if (g.op < 0.01) { if (g.g.getAttribute('display') !== 'none') g.g.setAttribute('display', 'none'); } else { g.g.setAttribute('display', ''); g.g.setAttribute('opacity', g.op.toFixed(2)); if (g.tick) g.tick(s); } });
            // face
            const gx = P.gx + gzx + pgx * 0.9, gy = P.gy + gzy + pgy * 0.7;
            face.setAttribute('transform', `translate(${(P.fx + gx * 2.6 * P.fs).toFixed(2)} ${(P.fy + gy * 2 * P.fs).toFixed(2)}) scale(${P.fs.toFixed(3)})`); face.setAttribute('opacity', clamp(P.fo, 0, 1).toFixed(2));
            const open = Math.max(0, P.eo * (1 - P.blink)), ry = Math.max(0.2, P.ry * (1 - P.blink * 0.92));
            [[eyeL, -9], [eyeR, 9]].forEach(([e, x]) => { e.setAttribute('cx', x); e.setAttribute('cy', -3); e.setAttribute('rx', 2.3); e.setAttribute('ry', ry.toFixed(2)); e.setAttribute('opacity', open.toFixed(2)); });
            const hp = x => `M${x - 3.8} -1 Q${x} -6.2 ${x + 3.8} -1`, cp = x => `M${x - 3.6} -3.2 Q${x} 0.6 ${x + 3.6} -3.2`;
            happyL.setAttribute('d', hp(-9)); happyR.setAttribute('d', hp(9)); happyL.setAttribute('opacity', P.eh.toFixed(2)); happyR.setAttribute('opacity', P.eh.toFixed(2));
            const cl = Math.min(1, P.ec + P.blink * P.eo); closeL.setAttribute('d', cp(-9)); closeR.setAttribute('d', cp(9)); closeL.setAttribute('opacity', cl.toFixed(2)); closeR.setAttribute('opacity', cl.toFixed(2));
            const b = P.brow; browL.setAttribute('d', `M-13 -9 L-5.5 ${-9 - 2.6 * b}`); browR.setAttribute('d', `M5.5 ${-9 - 2.6 * b} L13 -9`); browL.setAttribute('opacity', b.toFixed(2)); browR.setAttribute('opacity', b.toFixed(2));
            const talk = performance.now() < speakUntil && !st_ ? (0.5 + 0.5 * Math.sin(s * 17)) * 0.8 : 0, mop = clamp(P.mo + talk, 0, 1);
            const mw = P.mw / 2, my = 9, mc = P.mc * 6; mouth.setAttribute('d', `M${(-mw + P.mx).toFixed(1)} ${my} Q${P.mx.toFixed(1)} ${(my + mc).toFixed(1)} ${(mw + P.mx).toFixed(1)} ${my}`); mouth.setAttribute('opacity', (1 - mop).toFixed(2));
            mouthO.setAttribute('cx', P.mx.toFixed(1)); mouthO.setAttribute('cy', 10); mouthO.setAttribute('rx', (1.6 + mop * 1).toFixed(2)); mouthO.setAttribute('ry', (1 + mop * 2.2).toFixed(2)); mouthO.setAttribute('opacity', mop.toFixed(2));
            // arms
            const shx = Math.max(24, (x1 - x0) / 2 * 0.95), SH = { L: [-shx, 6], R: [shx, 6] };
            const typing = pose.type && !st_ ? Math.sin(s * 15) * 0.9 : 0, wagv = !st_ && pose.wag ? Math.sin(s * (pose.wag === 'K' ? 11 : 6.5)) : 0;
            const arm = (path, hand, a, hx, hy, side) => {
                const sh = SH[side]; if (pose.wag === 'R' && side === 'R') hx += wagv * 4; if (pose.wag === 'alt') hy += (side === 'L' ? wagv : -wagv) * 9; if (pose.wag === 'K' && side === 'R') { hx += Math.max(0, wagv) * 5; } if (pose.type) hy += side === 'L' ? typing : -typing;
                if (pose.clap) hx += (side === 'L' ? 1 : -1) * (Math.sin(s * 9) * 0.5 + 0.5) * 7 - (side === 'L' ? 5 : -5) * 0.2;
                const x = lerp(sh[0], hx, a), y = lerp(sh[1], hy, a);
                path.setAttribute('d', `M${sh[0].toFixed(1)} ${sh[1]} Q${((sh[0] + x) / 2 + (side === 'L' ? -5 : 5) * a).toFixed(1)} ${((sh[1] + y) / 2 + 6 * a).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`);
                path.setAttribute('opacity', Math.min(1, a * 1.6).toFixed(2)); hand.setAttribute('cx', x.toFixed(1)); hand.setAttribute('cy', y.toFixed(1)); hand.setAttribute('opacity', Math.min(1, a * 1.6).toFixed(2));
            };
            arm(armL, handL, P.armL, P.hxL, P.hyL, 'L'); arm(armR, handR, P.armR, P.hxR, P.hyR, 'R');
            // feet
            const fy_ = y1 + 1.5, walk = scene.walk && !st_ ? Math.sin(s * 8) : 0;
            footL.setAttribute('cx', -9); footR.setAttribute('cx', 9); footL.setAttribute('cy', (fy_ - Math.max(0, walk) * 2.2).toFixed(1)); footR.setAttribute('cy', (fy_ - Math.max(0, -walk) * 2.2).toFixed(1)); footL.setAttribute('opacity', P.feet.toFixed(2)); footR.setAttribute('opacity', P.feet.toFixed(2));
            // props: pop in with a little overshoot
            Object.keys(props).forEach(k => {
                const r = props[k]; const on = r.a > 0.01; [r.gb, r.gf].forEach(g => { if (!g) return; if (!on) { if (g.getAttribute('display') !== 'none') g.setAttribute('display', 'none'); return; } g.setAttribute('display', ''); g.setAttribute('opacity', Math.min(1, r.a * 1.4).toFixed(2)); const a = r.d.a || [0, 0], sc2 = 0.3 + 0.7 * r.a; g.setAttribute('transform', `translate(${a[0]} ${a[1]}) scale(${sc2.toFixed(3)}) translate(${-a[0]} ${-a[1]})`); });
                if (on) r.ticks.forEach(f => f(s));
            });
        }
        // sleep between pictures instead of waking the screen 60 times a second just to find nothing changed
        // how often a resting character is redrawn: about 10 times a second while you are using the app, 7 when it has been quiet, 4 while the page scrolls
        // (slow breathing does not need more, and every picture makes the phone re-blur the frosted glass under it)
        // The frame governor. Busy (the page scrolls, you type or tap elsewhere): the picture is held, nobody is watching it.
        // Quiet for a moment: about 10 pictures a second. Still for a long time: it rests, and stirs for a moment now and then.
        // Anything that really changes (a mood, a prop, a move) is always drawn at once.
        let lastUse = performance.now(), burstUntil = 0, burstNext = performance.now() + 30000;
        const useNow = () => { lastUse = performance.now(); };
        ['pointerdown', 'keydown', 'input'].forEach(ev => document.addEventListener(ev, useNow, { passive: true, capture: true }));
        function settling() { for (const k in T) if (typeof T[k] === 'number' && Math.abs(P[k] - T[k]) > 0.004) return true; for (const n in props) if (Math.abs(props[n].a - props[n].t) > 0.004) return true; return false; }
        // Rest and stir without a jolt: the Companion's own clock (vt) runs at a "rate" that eases down to 0 when it rests and back up to 1 when it wakes,
        // so its drifting slows to a stop and starts again gently. Pictures are only drawn while the rate is moving or above 0.
        let rate = 1, vt = 0;
        // Cool-running governor: it measures what its own drawing costs this phone (milliseconds of work per second, smoothed over about 20 s)
        // and on a low battery. If that stays high it draws less often and rests sooner; it comes back by itself when things calm down.
        let duty = 0, dutyAt = performance.now(), batTier = 0, tier = 0;
        const STEP = [80, 120, 200], WIN = [12000, 8000, 5000];
        function noteCost(ms, now) { const gap = Math.max(1, now - dutyAt); dutyAt = now; const a = 1 - Math.exp(-gap / 20000); duty += (ms * 1000 / gap - duty) * a; tier = Math.max(batTier, duty > 70 ? 2 : duty > 40 ? 1 : 0); }
        try { if (navigator.getBattery) navigator.getBattery().then(b => { const u = () => { batTier = b.charging ? 0 : b.level < 0.1 ? 2 : b.level < 0.2 ? 1 : 0; }; u(); b.addEventListener('levelchange', u); b.addEventListener('chargingchange', u); }).catch(() => {}); } catch (e) {}
        root.__gcTier = () => ({ tier, duty: Math.round(duty), rate });
        function awake(now) {
            const idle = now - Math.max(lastUse, lastTouch);
            if (idle < WIN[tier]) return true;
            if (now > burstNext) { burstUntil = now + 4000; burstNext = now + 12000 + Math.random() * 13000; }
            return now < burstUntil;
        }
        function ambMs(now) {
            if (settling()) return STEP[tier];
            if (now - lastScroll < 450 || now - lastUse < 450) return 1e9;
            if (awake(now)) return STEP[tier];
            return rate > 0.01 ? STEP[tier] : 1e9;
        }
        function wake(ms) { ms = Math.min(ms, 300); if (ms > 24) setTimeout(() => requestAnimationFrame(frame), ms - 12); else requestAnimationFrame(frame); }
        function frame(now) {
            if (!running) return;
            if (now - last < ((dragging || gliding || spr) ? 15 : 30)) { requestAnimationFrame(frame); return; }   // 60 pictures a second only while you drag it or it springs; 30 is plenty for the rest   // never faster than about 60 pictures a second (many phones refresh at 90 or 120 Hz, which would double the work for nothing)
            if (!document.hidden && PR.place === 'off') { setTimeout(() => requestAnimationFrame(frame), 500); return; }   // hidden by the owner: no drawing at all
            if (!document.hidden && shown && !act && !dragging && !gliding && !motion && !spr && !poseOver && still() && now - last < 250) { wake(250 - (now - last)); return; }   // still or Lite mode: the picture only needs a refresh now and then
            if (!document.hidden && shown && !act && !dragging && !gliding && !motion && !spr && !poseOver && Math.abs(ks) < 0.004 && Math.abs(kv) < 0.05 && now - ptAt > 2400 && now - last < (root.__gcAmb || ambMs(now))) { wake((root.__gcAmb || ambMs(now)) - (now - last)); return; }   // resting: ambient drifting only needs about 20 pictures a second (it was 30); every picture also makes the phone re-blur the frosted glass under it
            const dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now;
            if (document.hidden || !shown) { wake(300); return; }
            const st_ = still();
            if (PR.place === 'header') syncHeader();
            const k = 1 - Math.exp(-dt * 6.5); for (const key in T) if (typeof T[key] === 'number') P[key] = lerp(P[key], T[key], k);
            Object.keys(props).forEach(n => { const r = props[n]; r.a = lerp(r.a, r.t, 1 - Math.exp(-dt * 6)); });
            P.armL = lerp(P.armL, T.armL, 1 - Math.exp(-dt * 5)); P.armR = lerp(P.armR, T.armR, 1 - Math.exp(-dt * 5));
            // fluid body: every point is a soft spring
            if (st_) { cur.set(tgt); } else { for (let i = 0; i < N * 2; i++) { const K = 95 * (0.85 + 0.3 * Math.sin(i * 0.37)); vel[i] += ((tgt[i] - cur[i]) * K - vel[i] * 11.5) * dt; cur[i] += vel[i] * dt; } }
            kv += (-ks * 150 - kv * 9) * dt; ks += kv * dt;
            const near = now - ptAt < 2200; pgx = lerp(pgx, near ? ptx : 0, 1 - Math.exp(-dt * 4)); pgy = lerp(pgy, near ? pty : 0, 1 - Math.exp(-dt * 4));
            if (!st_) {
                if (now > blinkAt) { blinkUntil = now + rnd(110, 170); blinkAt = now + rnd(2600, 7200); if (Math.random() < 0.18) blinkAt = now + 380; }
                if (extraBlink > 0 && now > blinkUntil + 120) { blinkUntil = now + 130; extraBlink--; }
                if (now > gazeAt) { gazeAt = now + rnd(2800, 8000); const r = Math.random(); if (r < 0.45) { gzx = 0; gzy = 0; } else { gzx = rnd(-1, 1); gzy = rnd(-0.6, 0.5); } }
            }
            P.blink = now < blinkUntil ? 1 : lerp(P.blink, 0, 1 - Math.exp(-dt * 25));
            { const want = awake(now) ? 1 : 0; rate += (want - rate) * (1 - Math.exp(-dt / (want ? 0.45 : 0.6))); if (want === 0 && rate < 0.004) rate = 0; if (want === 1 && rate > 0.996) rate = 1; vt += dt * 1000 * rate; }
            const c0 = performance.now(); draw(st_ ? 1000 : vt, st_); noteCost(performance.now() - c0, now); requestAnimationFrame(frame);
        }
        function start() { if (running) return; running = true; last = performance.now(); if (reduced()) { applyScene(true); draw(1000, true); } requestAnimationFrame(frame); }

        // ---- where it lives: header (fixed, follows the header slot), snap (floating, snaps to the nearest side), free
        const POSK = 'gc_pos';
        function syncHeader() { const r = host.getBoundingClientRect(); if (r.width > 0 && r.bottom > -100) { shell.style.left = (r.left + r.width / 2 - 28) + 'px'; shell.style.top = (r.top + r.height / 2 - 28) + 'px'; hdrOk = true; } }
        const lim = () => ({ minX: 2, maxX: innerWidth - 56 - 2, minY: 8 + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0), maxY: innerHeight - 56 - 8 });
        function clearOf(x, y) { for (const f of RESERVE) { let rs = []; try { rs = f() || []; } catch (e) {} for (const b of rs) { if (x + 56 > b.left + 2 && x < b.right - 2 && y + 56 > b.top + 2 && y < b.bottom - 2) y = Math.max(8, b.top - 56 - 6); } } return y; }
        function put(x, y) { const L = lim(); shell.style.left = clamp(x, L.minX, L.maxX) + 'px'; shell.style.top = clamp(y, L.minY, L.maxY) + 'px'; }
        function savePos(x, y) { const L = lim(); try { localStorage.setItem(POSK, JSON.stringify({ fx: (x - L.minX) / (L.maxX - L.minX), fy: (y - L.minY) / (L.maxY - L.minY) })); } catch (e) {} }
        function restorePos() { if (gliding) return; let o = null; const _r = restorePos0; _r();
            const r = shell.getBoundingClientRect(); const y = clearOf(r.left, r.top); if (y !== r.top) put(r.left, y); }
        function restorePos0() { let o = null; try { o = JSON.parse(localStorage.getItem(POSK) || 'null'); } catch (e) {} const L = lim(); if (o && isFinite(o.fx) && isFinite(o.fy)) put(L.minX + clamp(o.fx, 0, 1) * (L.maxX - L.minX), L.minY + clamp(o.fy, 0, 1) * (L.maxY - L.minY)); else put(L.maxX, innerHeight * 0.72); if (PR.place === 'snap') { const r = shell.getBoundingClientRect(); put(r.left + 28 < innerWidth / 2 ? L.minX : L.maxX, r.top); } }
        function applyPlace() {
            const p = PR.place; shell.style.display = (p === 'off' || !shown) ? 'none' : ''; shell.classList.toggle('movable', p === 'snap' || p === 'free');
            if (p === 'header') { hdrOk = false; syncHeader(); } else if (p !== 'off') restorePos();
            if (!hdrOk && p === 'header') { shell.style.left = (innerWidth - 70) + 'px'; shell.style.top = '12px'; }
            scheduleIdle(); setScene();
        }
        function setScene() { if (!act) { scene.shape = 'rest'; applyScene(); } }
        let ds = null, dragged = false, gliding = false;
        hit.addEventListener('pointerdown', e => { if (e.button !== undefined && e.button !== 0) return; cancelSpring(); const r = shell.getBoundingClientRect(); ds = { x: e.clientX, y: e.clientY, l: r.left, t: r.top, id: e.pointerId }; dragged = false; try { hit.setPointerCapture(e.pointerId); } catch (_) {} });
        hit.addEventListener('pointermove', e => {
            if (!ds || ds.id !== e.pointerId) return; const dx = e.clientX - ds.x, dy = e.clientY - ds.y;
            if (PR.place === 'header' || Math.hypot(dx, dy) < 7 && !dragged) return;
            if (!dragged) { dragged = true; dragging = true; shell.classList.remove('settle'); shell.classList.add('drag'); cancelAction(); scene = { shape: 'rest', mood: 'surprised', pose: 'none', props: [], form: null, walk: false, look: null }; applyScene(); }
            put(ds.l + dx, ds.t + dy); if (e.cancelable) e.preventDefault();
        });
        const end = e => {
            if (!ds || (e && ds.id !== e.pointerId)) return; ds = null; shell.classList.remove('drag'); lastTouch = performance.now();
            if (dragged) { dragging = false; const r = shell.getBoundingClientRect(), L = lim(); let tx = r.left, ty = clamp(r.top, L.minY, L.maxY); if (PR.place === 'snap') { tx = r.left + 28 < innerWidth / 2 ? L.minX : L.maxX; } ty = clearOf(tx, ty); if (PR.place === 'snap') springTo(tx, ty, { fast: true }); else { put(tx, ty); savePos(clamp(tx, L.minX, L.maxX), ty); } setTimeout(() => { dragged = false; finish(); runAction('hop', { force: true }); }, 60); }
            else poke();
        };
        hit.addEventListener('pointerup', end); hit.addEventListener('pointercancel', e => { if (ds) { ds = null; dragging = false; shell.classList.remove('drag'); } });
        hit.addEventListener('click', e => { if (e.detail === 0) poke(); });
        root.addEventListener('resize', () => { if (PR.place === 'header') syncHeader(); else restorePos(); });
        document.addEventListener('pointermove', e => { if (document.hidden || !shown) return; const r = shell.getBoundingClientRect(), dx = e.clientX - (r.left + 28), dy = e.clientY - (r.top + 28); if (Math.hypot(dx, dy) > 260) return; ptAt = performance.now(); ptx = clamp(dx / 110, -1, 1); pty = clamp(dy / 110, -1, 1); }, { passive: true });
        document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); scheduleIdle(); } });

        const seen = new Map();
        function reactOnce(key, mood, win) { const now = Date.now(); if (now - (seen.get(key) || 0) < win) return false; seen.set(key, now); api.mood(mood); clearTimeout(api._rt); api._rt = setTimeout(() => api.mood('calm'), 3600); return true; }
        const api = {
            mood(m) { m = ALIAS[m] || m; base = MOODS[m] ? m : 'calm'; if (!act) applyScene(still()); },
            pose(name, ms) { clearTimeout(poseTimer); poseOver = POSES[name] && name !== 'none' ? name : null; applyScene(still()); if (ms) poseTimer = setTimeout(() => { poseOver = null; applyScene(); }, ms); },
            shape(id, ms) { if (!SHAPES[id] && id !== 'rest') return; cancelAction(); scene = { shape: id, mood: null, pose: 'none', props: [], form: null, walk: false, look: null }; applyScene(still()); if (ms) actTimer = setTimeout(finish, ms); },
            do(name, o) { lastTouch = performance.now(); return runAction(name, o); },
            say(text, ms) { return say(text, ms, true); }, sayQuiet, poke, wise() { const t = PR.wise ? LINES.pick(Math.random() < 0.6 ? 'proverb' : 'tip') : ''; return t ? sayQuiet(t) : false; },
            show(v) { shown = v !== false; applyPlace(); }, wake() { cancelAction(); runSteps([S(900, { mood: 'sleepy', form: 'relax' }), S(900, { mood: 'surprised', motion: { type: 'rise' } }), S(1400, { pose: 'stretch', mood: 'content', motion: { type: 'stretch' } })], { force: true, name: 'wake' }); },
            actions: () => Object.keys(ACTIONS), shapes: () => ['circle', 'ghost'].concat(ORDER), props: () => Object.keys(PROPS), tip: () => lastTip,
            setPos() { applyPlace(); }, resetPos() { try { localStorage.removeItem(POSK); } catch (e) {} applyPlace(); },
            state() { return { base, shape: shapeId, action: act && act.name, place: PR.place, ink: document.documentElement.getAttribute('data-gc-ink') }; },
            setMood(name, message) { api.mood(name); if (message) say(message, 3600, true); }, perform(a) { api.mood(ACTION_ALIAS[a] || 'calm'); },
            respondToBudgetEvent(ev) { return reactOnce(String(ev), EVENT[ev] || 'curious', 15000); }, respondToMilestone(key, name) { return reactOnce('m:' + key, name || 'proud', 86400000); },
            reset() { cancelAction(); poseOver = null; finish(); }, get moodName() { return base; },
            tour() { runAction('tour', { force: true }); }, showSomething() { runAction(pickOne(Object.keys(ACTIONS).filter(k => k !== 'tour' && k !== 'sleep' && k !== 'nap' && k !== 'bedtime' && k !== 'blink')), { force: true }); }
        };

        // ---- tell: speak a detail when the user taps a graphic (does not count towards the daily lines)
        const card = document.createElement('div'); card.className = 'gc-card'; document.body.appendChild(card); let cardT = null;
        card.addEventListener('click', () => card.classList.remove('on'));
        function tell(text, tone) {
            if (!text) return false; lastTouch = performance.now();
            if (PR.place !== 'off' && PR.talk > 0 && shown) { say(text, Math.max(4200, text.length * 80), true); card.classList.remove('on'); }
            else { card.textContent = text; card.classList.add('on'); clearTimeout(cardT); cardT = setTimeout(() => card.classList.remove('on'), Math.max(4200, text.length * 80)); }
            if (PR.place !== 'off' && shown && !dragging) { try { runAction(tone === 'bad' ? 'shrug' : 'nod', { force: true }); } catch (e) {} }
            return true;
        }
        api.tell = tell;
        // respond: the character delivers an app response (a confirmation, a warning). Short text card always shows, so nothing is voice-only.
        function respond(text, o) {
            o = o || {}; if (!text) return false; lastTouch = performance.now();
            card.innerHTML = ''; const sp = document.createElement('span'); sp.textContent = text; card.appendChild(sp);
            if (o.undo) { const b = document.createElement('button'); b.type = 'button'; b.className = 'gc-undo'; b.textContent = 'Undo'; b.onclick = e => { e.stopPropagation(); card.classList.remove('on'); clearTimeout(cardT); try { o.undo(); } catch (x) {} }; card.appendChild(b); }
            card.classList.add('on'); clearTimeout(cardT); cardT = setTimeout(() => card.classList.remove('on'), o.undo ? 6500 : Math.max(3200, text.length * 70));
            if (PR.place !== 'off' && shown && !dragging) { try { runAction(o.tone === 'bad' ? 'shrug' : 'nod', { force: true }); } catch (e) {} }
            return true;
        }
        api.respond = respond;
        // ask: the character asks one short question with a number box (used only when the app is unsure)
        const askEl = document.createElement('div'); askEl.className = 'gc-ask'; askEl.innerHTML = '<div class="q"></div><div class="r"><input type="number" inputmode="numeric" min="0"><button type="button" class="ok">Save</button><button type="button" class="no">Later</button></div><div class="err"></div>'; document.body.appendChild(askEl);
        function ask(q, o) {
            o = o || {}; const inp = askEl.querySelector('input'), err = askEl.querySelector('.err'); askEl.querySelector('.q').textContent = q; inp.value = o.value !== undefined ? o.value : ''; err.textContent = '';
            const close = () => askEl.classList.remove('on');
            askEl.querySelector('.ok').onclick = () => { const v = parseFloat(inp.value); if (!(v >= 0) || (o.max !== undefined && v > o.max)) { err.textContent = o.max !== undefined ? `Enter a number from 0 to ${o.max}` : 'Enter a number'; return; } close(); if (o.onSave) o.onSave(v); };
            askEl.querySelector('.no').onclick = () => { close(); if (o.onLater) o.onLater(); };
            askEl.classList.add('on'); if (PR.place !== 'off' && shown && PR.talk > 0) say(q, 4200, true);
            if (PR.place !== 'off' && shown && !dragging) { try { runAction('shrug', { force: true }); } catch (e) {} }
            return true;
        }
        api.ask = ask; api.asking = () => askEl.classList.contains('on');

        // ---- avoid text: when it sits over words for a moment, it glides to the nearest clear spot and stays there
        let lastScroll = 0, overSince = 0, quietUntil = 0, avTimer = null;
        let lastPtr = 0, dirty = true, lastKey = '', lastHit = false, lastScan = 0;
        // the text scan is costly: repeat it only when the page, the scroll or the character has changed (or every 4 s as a safety net)
        const markDirty = () => { dirty = true; };
        addEventListener('resize', markDirty, { passive: true }); addEventListener('pointerup', markDirty, { passive: true, capture: true }); addEventListener('orientationchange', markDirty);
        try { if (window.MutationObserver) new MutationObserver(ms => { for (let i = 0; i < ms.length; i++) if (!shell.contains(ms[i].target)) { dirty = true; return; } }).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
        addEventListener('scroll', () => { lastScroll = performance.now(); dirty = true; }, { passive: true, capture: true });
        addEventListener('pointerdown', () => { lastPtr = performance.now(); }, { passive: true, capture: true });
        addEventListener('keydown', () => { lastPtr = performance.now(); }, { passive: true, capture: true });
        // inside an open sheet only the sheet counts: its words, its keypad and its fields (the page behind is dimmed and out of reach)
        const openSheet = () => { try { return (opts.busy && opts.busy()) ? document.querySelector('.modal-backdrop.show .modal') : null; } catch (e) { return null; } };
        // the page rarely changes, so the scan of every word is kept for a few seconds and redone only after a scroll, a resize, a change to the page or a sheet opening
        let rcDirty = true, rcAt = 0, rcKey = '', rcRects = [];
        try { new MutationObserver(ms => { for (let i = 0; i < ms.length; i++) if (!shell.contains(ms[i].target)) { rcDirty = true; return; } }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'open'] }); } catch (e) {}
        addEventListener('resize', () => { rcDirty = true; }, { passive: true }); addEventListener('scroll', () => { rcDirty = true; }, { passive: true, capture: true });
        function textRects() {
            const sh = openSheet(), key = sh ? 's' : 'p', t = performance.now();
            if (!rcDirty && key === rcKey && t - rcAt < 10000) return rcRects;
            rcRects = textRectsScan(); rcKey = key; rcAt = t; rcDirty = false; return rcRects;
        }
        function textRectsScan() {
            const sh = openSheet(), out = [], vw = innerWidth, vh = innerHeight, tw = document.createTreeWalker(sh || document.body, NodeFilter.SHOW_TEXT, { acceptNode(n) { if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT; const p = n.parentElement; if (!p || p.closest('.gc, .gc-card, script, style, svg, #splash, .lock')) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; } });
            const rg = document.createRange(); let n, c = 0;
            while ((n = tw.nextNode()) && c < 1500) { rg.selectNodeContents(n); const rs = rg.getClientRects(); for (let i = 0; i < rs.length; i++) { const r = rs[i]; if (r.width < 2 || r.height < 4 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue; out.push(r); c++; } }
            if (sh) sh.querySelectorAll('.keypad, input, select, textarea').forEach(el => { const r = el.getBoundingClientRect(); if (r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < vh) out.push(r); });
            return out;
        }
        const hits = (x, y, rs) => { for (let i = 0; i < rs.length; i++) { const r = rs[i]; if (x + 58 > r.left + 1 && x - 2 < r.right - 1 && y + 58 > r.top + 2 && y - 2 < r.bottom - 2) return true; } return false; };
        function avoidStep() {
            const mode = PR.avoid; if (!mode || mode === 'off' || (PR.place !== 'snap' && PR.place !== 'free') || !shown || document.hidden || dragging || act) { overSince = 0; return; }
            const now = performance.now(); const sh = openSheet(); if (now < quietUntil || now - lastTouch < 4000 || now - lastScroll < 500 || (sh && now - lastPtr < 1400)) { overSince = 0; return; }   // in a sheet it waits until the hands are off the keypad
            const r = shell.getBoundingClientRect(), key = Math.round(r.left) + ',' + Math.round(r.top) + (sh ? 's' : '');
            let rs = null, hit;
            if (!dirty && key === lastKey && now - lastScan < 10000) hit = lastHit; else { rs = textRects(); hit = hits(r.left, r.top, rs); dirty = false; lastKey = key; lastHit = hit; lastScan = now; }
            if (!hit) { overSince = 0; return; }
            if (!rs) rs = textRects();
            if (!overSince) { overSince = now; return; } if (now - overSince < (mode === 'eager' ? 300 : 1000)) return;
            overSince = 0; const L = lim(), cand = [];
            if (PR.place === 'snap') { [L.minX, L.maxX].forEach(x => { for (let y = L.minY; y <= L.maxY; y += 20) cand.push([x, y, Math.abs(x - r.left) * 0.4 + Math.abs(y - r.top)]); }); }
            else { for (let y = L.minY; y <= L.maxY; y += 20) { cand.push([r.left, y, Math.abs(y - r.top)]); [L.minX, L.maxX].forEach(x => cand.push([x, y, Math.abs(x - r.left) * 0.7 + Math.abs(y - r.top)])); } for (let x = L.minX; x <= L.maxX; x += 20) cand.push([x, r.top, Math.abs(x - r.left)]); }
            cand.sort((a, b) => a[2] - b[2]);
            for (const c of cand) { const y = clearOf(c[0], c[1]); if (y !== c[1]) continue; if (!hits(c[0], c[1], rs)) { glideTo(c[0], c[1]); quietUntil = now + 3500; return; } }
            if (sh) {   // nowhere clear: park in the dim strip above the sheet
                const m = sh.getBoundingClientRect(), py = Math.max(L.minY, m.top - 62), px = PR.place === 'snap' ? (r.left + 28 > innerWidth / 2 ? L.maxX : L.minX) : clamp(r.left, L.minX, L.maxX);
                if (Math.abs(py - r.top) > 3 || Math.abs(px - r.left) > 3) { glideTo(px, py); quietUntil = now + 3500; return; }
            }
            quietUntil = now + 6000;
        }
        // ---- physics stop: a damped spring. It leans into the move, runs a little past the spot, rebounds, takes a small second bounce and settles.
        let spr = null;
        function cancelSpring() { if (spr) { cancelAnimationFrame(spr.raf); spr = null; } gliding = false; shell.classList.remove('glide', 'settle'); svg.style.transform = ''; }
        function springTo(x, y, o) {
            o = o || {}; const L = lim(); x = clamp(x, L.minX, L.maxX); y = clamp(y, L.minY, L.maxY);
            savePos(x, y);
            const r0 = shell.getBoundingClientRect(), x0 = r0.left, y0 = r0.top, dist = Math.hypot(x - x0, y - y0);
            if (still() || dist < 2) { cancelSpring(); put(x, y); return; }
            cancelSpring(); gliding = true;
            const style = o.style || 'spring', spd = { slow: 0.62, normal: 1, fast: 1.7 }[o.spd] || 1;
            // [stiffness, damping ratio, overshoot cap factor, stretch strength, sway, hops]
            const ST = { spring: [82, 0.42, 1, 1, 0, 0], glide: [46, 1.0, 0, 0.35, 0, 0], float: [13, 0.8, 0.3, 0, 1, 0], dart: [250, 0.62, 0.7, 1.5, 0, 0], hop: [0, 0, 0, 0, 0, 1] }[style] || [82, 0.42, 1, 1, 0, 0];
            const fast = o.fast, k = fast ? 150 : ST[0], zeta = fast ? 0.42 : ST[1], c = 2 * zeta * Math.sqrt(k || 1), cap = (Math.min(26, 8 + dist * 0.06)) * (fast ? 1 : ST[2]), ux = (x - x0) / dist, uy = (y - y0) / dist, ang = Math.atan2(uy, ux) * 180 / Math.PI, stretchK = fast ? 1 : ST[3], sway = ST[4];
            const hops = ST[5] ? Math.max(1, Math.round(dist / 120)) : 0, hopDur = hops ? (0.45 + hops * 0.34) / spd : 0, hopH = Math.min(46, 18 + dist * 0.08);
            let u = 0, v = 0, last = performance.now(), hit1 = false, sq = 0, sqv = 0, calm = 0, lastHop = -1;
            const W = innerWidth, H = innerHeight;
            const step = now => {
                const dt0 = Math.min(0.05, (now - last) / 1000); last = now;
                let px, py, st = 0, q = 0;
                if (hops) {
                    const t = Math.min(1, (now - spr.t0) / 1000 / hopDur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, ph = e * hops, hi = Math.min(hops - 1, Math.floor(ph)), fr = ph - hi;
                    if (hi !== lastHop) { if (lastHop >= 0) sqv += 1.6; lastHop = hi; }
                    px = x0 + (x - x0) * e; py = y0 + (y - y0) * e - Math.sin(Math.PI * fr) * hopH;
                    for (let i = 0, n = Math.ceil(dt0 / 0.008) || 1; i < n; i++) { const h = dt0 / n, sa = -230 * sq - 17 * sqv; sqv += sa * h; sq += sqv * h; }
                    st = Math.sin(Math.PI * fr) * 0.1; q = clamp(sq, -0.14, 0.2);
                    if (t >= 1 && Math.abs(sq) < 0.01) { shell.style.left = x + 'px'; shell.style.top = y + 'px'; svg.style.transform = ''; spr = null; gliding = false; return; }
                    if (t >= 1) { px = x; py = y; }
                } else {
                    const dt = dt0 * spd, n = Math.ceil(dt / 0.008) || 1, h = dt / n;
                    for (let i = 0; i < n; i++) { const a = -k * (u - 1) - c * v; v += a * h; u += v * h; const sa = -230 * sq - 17 * sqv; sqv += sa * h; sq += sqv * h; }
                    if (!hit1 && u >= 1) { hit1 = true; sqv += Math.min(2.4, Math.abs(v) * dist / 420) * (stretchK > 0.5 ? 1 : 0.3); }
                    const off = (u - 1) * dist, extra = u > 1 ? (cap > 0 ? cap * Math.tanh(off / cap) : 0) : off;
                    px = x + ux * extra; py = y + uy * extra;
                    if (sway) { const sw = Math.sin(clamp(u, 0, 1) * Math.PI * 2) * 14 * Math.min(1, dist / 200) * (1 - clamp(u, 0, 1)); px += -uy * sw; py += ux * sw; }
                    st = clamp(Math.abs(v) * dist * spd / 5200, 0, 0.16) * stretchK; q = clamp(sq, -0.14, 0.2) * (stretchK > 0.5 ? 1 : 0.4);
                    if (Math.abs(u - 1) < 0.0015 && Math.abs(v) < 0.02 && Math.abs(sq) < 0.004) calm++; else calm = 0;
                    if (calm > 6 || now - spr.t0 > 6500) { shell.style.left = x + 'px'; shell.style.top = y + 'px'; svg.style.transform = ''; spr = null; gliding = false; return; }
                }
                px = clamp(px, -6, W - 50); py = clamp(py, L.minY - 4, H - 50);
                shell.style.left = px + 'px'; shell.style.top = py + 'px';
                svg.style.transform = hops ? `scale(${(1 - q * 0.7 + st * 0.2).toFixed(3)}, ${(1 + q + st * 0.4).toFixed(3)})` : `rotate(${ang.toFixed(1)}deg) scale(${(1 + st - q * 0.7).toFixed(3)}, ${(1 - st * 0.55 + q).toFixed(3)}) rotate(${(-ang).toFixed(1)}deg)`;
                spr.raf = requestAnimationFrame(step);
            };
            spr = { t0: performance.now(), raf: 0 }; spr.raf = requestAnimationFrame(step);
        }
        function glideTo(x, y) { springTo(x, y, { style: PR.evade, spd: PR.evspeed }); }
        function avoidRestart() { clearInterval(avTimer); avTimer = null; overSince = 0; if (PR.avoid && PR.avoid !== 'off') avTimer = setInterval(avoidStep, 600); }
        avoidRestart(); watchers.push(avoidRestart);
        const cosmic = [auraT, auraG, auraV, orb1, orb2, sp1, sp2, star1, star2, flare].concat(twink.map(t => t.e));
        // ---- shifting spectrum colour: two or three soft colours of the spectrum at a time, slowly drifting (one colour a day when still or Lite)
        const ORIG = {}; Object.keys(SS).forEach(k => { ORIG[k] = SS[k].map(e => e.getAttribute('stop-color')); }); const FLO = ['#ffe2a8', '#ffe2a8', '#ffe9c2'];
        const hsl = (h, sa, l) => `hsl(${Math.round(((h % 360) + 360) % 360)} ${sa}% ${l}%)`;
        const setStops = (id, cols) => { const a = SS[id]; if (a) cols.forEach((c, i) => { if (c && a[i]) a[i].setAttribute('stop-color', c); }); };
        let hueKey = '';
        function applyHue() {
            if (PR.hue !== 'shift') { if (hueKey !== 'classic') { Object.keys(ORIG).forEach(k => setStops(k, ORIG[k])); flTint.forEach((f, i) => f.setAttribute('flood-color', FLO[i])); hueKey = 'classic'; } return; }
            const n = PR.huen === 3 ? 3 : 2, calm = still(), sp = { slow: 0.6, calm: 1.6, lively: 4.2 }[PR.huespeed] || 1.6;
            const H = calm ? (Math.floor(Date.now() / 864e5) * 47) % 360 : Math.floor((Date.now() / 1000 * sp) % 360);
            const key = H + '/' + n + '/' + PR.look; if (key === hueKey) return; hueKey = key;
            const A = H, B = H + (n === 3 ? 50 : 75), C = n === 3 ? H + 105 : H + 75;
            setStops('g', [null, hsl(A, 55, 90), hsl(B, 55, 83), null]); setStops('c', [hsl(A, 62, 70), hsl(A, 62, 70)]); setStops('w', [hsl(B, 68, 74), hsl(B, 68, 74)]);
            setStops('ht', [hsl(A, 62, 72), hsl(A, 62, 72)]); setStops('hg', [hsl(B, 68, 78), hsl(B, 68, 78)]); setStops('nb', [hsl(C, 60, 76), hsl(B, 60, 80), hsl(B, 60, 80)]);
            setStops('r', [hsl(B, 70, 78), hsl(A, 65, 72), hsl(B, 70, 78)]); setStops('o', [hsl(A, 70, 78), null, hsl(B, 70, 80)]); setStops('oc', [hsl(B, 75, 82), hsl(B, 75, 82)]);
            if (flTint[0]) flTint[0].setAttribute('flood-color', hsl(B, 80, 84)); if (flTint[1]) flTint[1].setAttribute('flood-color', hsl(A, 80, 82)); if (flTint[2]) flTint[2].setAttribute('flood-color', hsl(B, 70, 90));
        }
        applyHue(); setInterval(applyHue, 250); watchers.push(() => { hueKey = ''; applyHue(); });
        let lkLook = PR.look, lkRest = PR.rest;
        function applyLook() {
            const orbMode = PR.look === 'orb'; orbHi.setAttribute('opacity', orbMode ? 1 : 0); orbCa.setAttribute('opacity', orbMode ? 1 : 0);
            cosmic.forEach(e => { e.style.display = PR.aura === false ? 'none' : ''; });
            shell.classList.toggle('gc-orb', orbMode);
        }
        applyLook();
        if (PR.look === 'orb') setTargetShape('circle', true);
        let lkPlace = PR.place;
        watchers.push(() => {
            if (PR.place !== lkPlace) { lkPlace = PR.place; applyPlace(); } applyLook();
            if (PR.look !== lkLook) { lkLook = PR.look; lkRest = PR.rest; setTargetShape('rest'); }
            else if (PR.rest !== lkRest) { lkRest = PR.rest; if (shapeId === 'circle' || shapeId === 'ghost') setTargetShape('rest'); }
        });
        current = api; root.CircleCompanion = api;
        applyScene(true); applyPlace(); start();
        setTimeout(() => { if (!act) { syncHeaderOnce(); } }, 300); function syncHeaderOnce() { if (PR.place === 'header') syncHeader(); }
        return api;
    }

    // ================= the character's own Settings card (any app can drop this in)
    function settingsHTML() {
        const p = loadPrefs(), opt = (v, t, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${t}</option>`;
        const A = root.GAcc ? root.GAcc.sec : (k, t, bd) => bd;
        const sw = (k, t, d, on) => `<div class="gc-row"><div class="sw-row" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span>${t}<span class="hint" style="display:block">${d}</span></span><label class="switch"><input type="checkbox" data-gc="${k}" ${on ? 'checked' : ''}><i></i></label></div></div>`;
        const sel = (k, t, o, h) => `<div class="gc-row"><div>${t}</div><select class="set-select" data-gc="${k}">${o}</select>${h ? `<div class="hint">${h}</div>` : ''}</div>`;
        const look = sel('look', 'Character', opt('spectre', 'Spectre: molds into many shapes', p.look) + opt('orb', 'Glass orb: always a perfect sphere', p.look), 'The orb keeps its round body and still gestures, speaks and uses props.')
            + sw('aura', 'Cosmic aura', 'Glow, rings, soft lens flare and tiny stars around it.', p.aura !== false)
            + sel('hue', 'Colour', opt('classic', 'Classic: teal and gold', p.hue) + opt('shift', 'Shifting spectrum: slow drifting colours', p.hue), 'Shifting uses soft colours that drift. In Lite mode or with reduced motion it keeps one colour a day.')
            + sel('fx', 'Glass effects', opt('rich', 'Rich: fading glass, travelling outline light', p.fx) + opt('light', 'Light: outline light only', p.fx) + opt('off', 'Off: plain and steady', p.fx), 'Parts of the body fade softly and a band of light and shadow runs round the edge. Rich uses more battery. Lite mode turns it all off.')
            + sw('catchlight', 'Catch the light', 'Every 10 to 20 seconds the brightest part of the outline blooms for a moment.', p.catchlight !== false)
            + `<div class="gc-shift" style="display:${p.hue === 'shift' ? '' : 'none'}">` + sel('huespeed', 'Colour speed', opt('slow', 'Slow: about 10 minutes a round', p.huespeed) + opt('calm', 'Calm: about 4 minutes', p.huespeed) + opt('lively', 'Lively: about 1.5 minutes', p.huespeed)) + sel('huen', 'Colours at a time', opt('2', 'Two', String(p.huen)) + opt('3', 'Three', String(p.huen))) + '</div>';
        const where = sel('place', 'Where it lives', opt('header', 'Fixed in the header corner', p.place) + opt('snap', 'Floating, snaps to the nearest side', p.place) + opt('free', 'Floating, free anywhere', p.place) + opt('off', 'Hidden', p.place), 'It always stays on top. In the floating modes, drag it where you like.')
            + sel('avoid', 'Avoid text', opt('off', 'Off: stays where I put it', p.avoid) + opt('gentle', 'Gentle: slides beside text after about 1 second', p.avoid) + opt('eager', 'Eager: slides after a moment', p.avoid), 'Only in the floating modes. It never moves while you drag it.')
            + sel('evade', 'Movement style when it avoids text', opt('spring', 'Springy: runs past, rebounds, settles', p.evade) + opt('glide', 'Glide: smooth and calm', p.evade) + opt('float', 'Float: slow, like a bubble', p.evade) + opt('hop', 'Hop: small jumps', p.evade) + opt('dart', 'Dart: quick and sharp', p.evade))
            + sel('evspeed', 'Speed of that movement', opt('slow', 'Slow', p.evspeed) + opt('normal', 'Normal', p.evspeed) + opt('fast', 'Fast', p.evspeed));
        const beh = sel('rest', 'Resting form (Spectre)', opt('circle', 'Circle', p.rest) + opt('ghost', 'Ghost with a wavy tail', p.rest))
            + `<div class="gc-row"><div>Movement</div><input type="range" min="0" max="100" value="${p.move}" data-gc="move"><div class="gc-lbl"><span>Still</span><span>Lively</span></div></div>
<div class="gc-row"><div>Activity</div><input type="range" min="0" max="100" value="${p.act}" data-gc="act"><div class="gc-lbl"><span>Rarely</span><span>Often</span></div><div class="hint">How often it changes shape, plays, rests or does something on its own.</div></div>
<div class="gc-row"><div>Talking: <b data-gc-out="talk">${p.talk}</b> lines a day</div><input type="range" min="0" max="40" value="${p.talk}" data-gc="talk"><div class="gc-lbl"><span>Silent</span><span>Chatty</span></div></div>`
            + sw('wise', 'Proverbs and tips', 'Wisdom lines when it speaks.', p.wise);
        return `<div class="card gc-set"><h3>Circle Companion</h3><p class="hint">Your small companion. All of this stays on this phone.</p>
${A('gc-char', 'Character and colour', look, true)}${A('gc-where', 'Where it lives', where, true)}${A('gc-beh', 'How it behaves', beh, false)}
<button class="btn-line" data-gc-act="show">Show me something</button><button class="btn-line" data-gc-act="tour">Show me some shapes</button><button class="btn-line" data-gc-act="reset">Put it back in its corner</button></div>`;
    }
    document.addEventListener('input', e => { const el = e.target && e.target.closest && e.target.closest('[data-gc]'); if (!el || el.type !== 'range') return; const k = el.dataset.gc, v = +el.value; const out = document.querySelector(`[data-gc-out="${k}"]`); if (out) out.textContent = v; setPrefs({ [k]: v }); });
    document.addEventListener('change', e => { const el = e.target && e.target.closest && e.target.closest('[data-gc]'); if (!el || el.type === 'range') return; const k = el.dataset.gc; let v = el.type === 'checkbox' ? el.checked : el.value; if (k === 'huen') v = +v; setPrefs({ [k]: v }); if (k === 'hue') { const w = document.querySelector('.gc-shift'); if (w) w.style.display = v === 'shift' ? '' : 'none'; } });
    document.addEventListener('click', e => { const el = e.target && e.target.closest && e.target.closest('[data-gc-act]'); if (!el || !current) return; const a = el.dataset.gcAct; if (a === 'show') current.showSomething(); else if (a === 'tour') current.tour(); else if (a === 'reset') { setPrefs({ place: 'header' }); current.resetPos(); const s = document.querySelector('select[data-gc="place"]'); if (s) s.value = 'header'; } });

    root.GCompanion = { create, settingsHTML, reserve: f => { if (typeof f === 'function') RESERVE.push(f); }, prefs: { get: () => loadPrefs(), set: setPrefs, onChange: f => watchers.push(f) }, ACTIONS: () => Object.keys(ACTIONS), SHAPES: () => ORDER.slice() };
})(typeof window !== 'undefined' ? window : this);
