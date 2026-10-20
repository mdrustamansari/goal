/* Your speed: how much you do in one hour, learned from what you log.  Pure functions, nothing is stored here.
   Three clues, and the app trusts the speed only when they agree:
     1. TIMED sittings: the amount you logged divided by the time you entered (recent ones count more).
     2. USUAL sittings: the amount in your untimed entries, against how long your timed sittings usually take.
     3. Your own SETTING ("in one hour I usually do about N"), which is the starting point and a sanity check.
   Confident  = the speed is adopted quietly (and the change is kept in the history, with an undo).
   Still learning = nothing changes; the app shows what it noticed and asks.  A speed you pinned is never changed.
   Events: { t:'speed', goal, op:'use'|'pin'|'auto'|'keep', rate? }.  Logs may carry min (minutes). */
(function (root) {
    'use strict';
    const DAY = 864e5, HL = 14 * DAY;
    const r1 = v => Math.round(v * 10) / 10;
    const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const wmedian = (vals, ws) => { const p = vals.map((v, i) => [v, ws[i]]).sort((a, b) => a[0] - b[0]); const tot = p.reduce((s, x) => s + x[1], 0); let c = 0; for (const x of p) { c += x[1]; if (c >= tot / 2) return x[0]; } return p.length ? p[p.length - 1][0] : 0; };
    const cv = a => { if (a.length < 2) return 1; const m = a.reduce((s, x) => s + x, 0) / a.length; if (!m) return 1; return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length) / m; };
    const when = e => { if (e.day && /^\d{4}-\d\d-\d\d$/.test(e.day)) { const p = e.day.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12).getTime(); } return e.ts; };
    const startOfWeek = ts => { const d = new Date(ts), x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return new Date(x.getFullYear(), x.getMonth(), x.getDate() - ((x.getDay() + 6) % 7)).getTime(); };
    const addDays = (ts, n) => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); };

    /* which task a logged entry belongs to: the nearest goal that holds a daily amount (a daily pace) or is a task */
    function subjectOf(goals, id) {
        let x = goals.get(id), n = 0;
        while (x && n++ < 30) {
            if (((x.kind === 'project' || x.kind === 'piece') && x.qty > 0) || x.kind === 'task') return x.id;
            x = x.parent ? goals.get(x.parent) : null;
        }
        return null;
    }

    function core(sub, logs, sev, base0, asOf) {
        const L = logs.filter(l => l.ts <= asOf && l.qty > 0).sort((a, b) => when(a) - when(b));
        const S = sev.filter(e => e.ts <= asOf).sort((a, b) => (a.ts - b.ts) || ((a.id || 0) - (b.id || 0)));
        let base = base0 > 0 ? base0 : null, pin = null, keepUntil = 0;
        S.forEach(e => { if (e.op === 'use') { base = e.rate > 0 ? e.rate : base; pin = null; keepUntil = 0; } else if (e.op === 'pin') pin = e.rate > 0 ? e.rate : pin; else if (e.op === 'auto') pin = null; else if (e.op === 'keep') keepUntil = e.ts + 14 * DAY; });
        const timed = L.filter(l => l.min > 0).map(l => ({ rate: l.qty / (Math.min(600, l.min) / 60), hrs: Math.min(600, l.min) / 60, w: Math.pow(0.5, (asOf - when(l)) / HL), at: when(l) }));
        // one wild entry (a typing slip) must not decide anything
        const med = median(timed.map(t => t.rate)), clean = timed.length >= 4 ? timed.filter(t => t.rate <= med * 4 && t.rate >= med / 4) : timed;
        const recent = clean.slice(-8);
        const nTimed = clean.length;
        const A = recent.length >= 2 ? wmedian(recent.map(t => t.rate), recent.map(t => t.w)) : null;
        const cv4 = cv(clean.slice(-4).map(t => t.rate)), cv6 = cv(clean.slice(-6).map(t => t.rate));
        const sitHrs = recent.length ? median(recent.map(t => t.hrs)) : 0;
        const untimed = L.filter(l => !(l.min > 0) && when(l) > asOf - 28 * DAY);
        const B = untimed.length >= 3 && sitHrs > 0 ? median(untimed.map(l => l.qty)) / sitHrs : null;
        const usualAgrees = A && B ? Math.abs(B - A) / A <= 0.25 : false;
        const longRun = nTimed >= 6 && cv6 <= 0.2;
        const confident = !!A && nTimed >= 3 && cv4 <= 0.3 && (usualAgrees || longRun);
        const nearSetting = A && base ? Math.abs(A - base) / base <= 0.35 : null;
        let eff = pin || (confident ? r1(A) : base), status = pin ? 'pinned' : confident ? 'confident' : A ? 'learning' : base ? 'set' : 'none';
        const gap = A && base ? Math.abs(A - base) / base : 1;
        const ask = !pin && status === 'learning' && asOf >= keepUntil && (!base || gap >= 0.1);
        return { eff, status, A: A ? r1(A) : null, B: B ? r1(B) : null, base, pin, nTimed, usualAgrees, longRun, nearSetting, ask, suggest: ask && A ? r1(A) : null, keepUntil, nUntimed: untimed.length, cv4 };
    }

    /* the full picture for one task */
    function analyse(sub, logs, sev, base0, now) {
        const c = core(sub, logs, sev, base0, now);
        // history: re-run the same rules at earlier dates, to see when the speed in use last moved
        let adapted = null, prev = c.eff;
        for (let k = 1; k <= 10 && c.eff; k++) {
            const t = now - k * 7 * DAY, h = core(sub, logs, sev, base0, t);
            if (h.eff && prev && Math.abs(h.eff - prev) / prev >= 0.03) { adapted = { daysAgo: Math.round((now - (t + 7 * DAY)) / DAY) || 1, from: h.eff, to: prev }; break; }
            if (h.eff) prev = h.eff;
        }
        const w0 = startOfWeek(now), weeks = [];
        for (let k = 6; k >= 0; k--) { const a = addDays(w0, -7 * k), b = addDays(a, 7), r = logs.filter(l => l.qty > 0 && l.min > 0 && when(l) >= a && when(l) < b).map(l => l.qty / (Math.min(600, l.min) / 60)); weeks.push(r.length ? r1(median(r)) : null); }
        const wq = []; for (let k = 3; k >= 1; k--) { const a = addDays(w0, -7 * k), b = addDays(a, 7); wq.push(logs.filter(l => l.qty > 0 && when(l) >= a && when(l) < b).reduce((s, l) => s + l.qty, 0)); }
        const first = logs.length ? Math.min.apply(null, logs.map(when)) : now, haveWeeks = (w0 - startOfWeek(first)) / (7 * DAY);
        const avgWeek = haveWeeks >= 2 ? wq.reduce((s, x) => s + x, 0) / 3 : null;
        return Object.assign(c, { adapted, weeks, avgWeek, undoTo: adapted ? adapted.from : null });
    }

    /* every task that has logs or a setting, keyed by task id */
    function build(events, goals, now) {
        now = now || Date.now();
        const voided = new Set(); events.forEach(e => { if (e.t === 'void') voided.add(e.target); });
        const bySub = new Map(), sevBy = new Map();
        events.forEach(e => {
            if (voided.has(e.id)) return;
            if (e.t === 'log') { const s = subjectOf(goals, e.goal); if (s !== null) { if (!bySub.has(s)) bySub.set(s, []); bySub.get(s).push(e); } }
            else if (e.t === 'speed') { const s = subjectOf(goals, e.goal) || e.goal; if (!sevBy.has(s)) sevBy.set(s, []); sevBy.get(s).push(e); }
        });
        goals.forEach(g => { if (g.uph > 0 && !bySub.has(g.id) && subjectOf(goals, g.id) === g.id) bySub.set(g.id, []); });
        const out = new Map();
        bySub.forEach((logs, id) => { const g = goals.get(id); out.set(id, analyse(id, logs, sevBy.get(id) || [], g ? g.uph : 0, now)); });
        return out;
    }

    root.Speed = { build, analyse, core, subjectOf, DAY };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.Speed;
})(typeof window !== 'undefined' ? window : globalThis);
