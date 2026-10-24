/* Work report: hours of work in a week or a month, against the same days before, plus projections at your learned speed.
   Pure functions; nothing is stored here.  Hours come from the minutes you entered; where you gave none, from the amount
   divided by your speed for that task (marked as an estimate).  Rest and leave days are never counted as missed.
   Deadlines are never moved by anything here. */
(function (root) {
    'use strict';
    const DAY = 864e5;
    const r1 = v => Math.round(v * 10) / 10;
    const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const cv = a => { if (a.length < 2) return 1; const m = a.reduce((s, x) => s + x, 0) / a.length; if (!m) return 1; return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length) / m; };
    const mid = ts => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
    const add = (ts, n) => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); };
    const dnOf = ts => { const d = new Date(ts); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
    const when = e => { if (e.day && /^\d{4}-\d\d-\d\d$/.test(e.day)) { const p = e.day.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12).getTime(); } return e.ts; };
    const weekStart = ts => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime(); };

    function bounds(now, kind, back) {
        const d = new Date(now);
        if (kind === 'month') { const s = new Date(d.getFullYear(), d.getMonth() - back, 1).getTime(), e = new Date(d.getFullYear(), d.getMonth() - back + 1, 1).getTime(); return { start: s, end: e, days: Math.round((e - s) / DAY) }; }
        const s = add(weekStart(now), -7 * back); return { start: s, end: add(s, 7), days: 7 };
    }

    /* hours for one log; est is true when it came from the amount and the speed, not from minutes you gave */
    function hoursOf(l, eff) {
        if (l.min > 0) return { h: Math.min(600, l.min) / 60, est: false };
        if (eff > 0 && l.qty > 0) return { h: l.qty / eff, est: true };
        return { h: 0, est: true, none: true };
    }

    function prep(o) {
        const goals = o.goals, sp = o.speed || new Map(), S = o.Speed || root.Speed;
        const voided = new Set(); (o.events || []).forEach(e => { if (e.t === 'void') voided.add(e.target); });
        const out = [];
        (o.events || []).forEach(e => {
            if (e.t !== 'log' || voided.has(e.id) || !(e.qty > 0)) return;
            const sub = S ? S.subjectOf(goals, e.goal) : e.goal, key = sub === null || sub === undefined ? e.goal : sub, s = sp.get(key), kg = goals.get(key) || goals.get(e.goal), x = kg && kg.qunit === 'hours' ? { h: Math.min(600, e.qty), est: false } : hoursOf(e, s && s.eff);
            out.push({ key, qty: e.qty, h: x.h, est: x.est, none: !!x.none, at: when(e), ts: e.ts, day: dnOf(when(e)), min: e.min > 0, sh: typeof e.st === 'number' && e.st >= 0 ? Math.floor(e.st / 60) : null });
        });
        return out;
    }

    function report(o) {
        const now = o.now || Date.now(), kind = o.kind === 'month' ? 'month' : 'week', back = o.back || 0;
        const B = bounds(now, kind, back), P = bounds(now, kind, back + 1), today = mid(now);
        const running = now < B.end, elapsed = running ? Math.min(B.days, Math.round((today - B.start) / DAY) + 1) : B.days;
        const cutoff = add(B.start, elapsed), pCut = add(P.start, Math.min(P.days, elapsed));   // the same days of the earlier period while running
        const L = prep(o), leave = o.leave || new Set(), goals = o.goals;
        const inCur = L.filter(l => l.at >= B.start && l.at < cutoff), inPrev = L.filter(l => l.at >= P.start && l.at < (running ? pCut : P.end));
        const tasks = new Map();
        const get = k => { if (!tasks.has(k)) { const g = goals.get(k), t = (o.tracks || []).find(x => x.id === k); tasks.set(k, { id: k, title: g ? g.title : 'Task', unit: t ? t.unit : (g && g.qunit) || '', grp: g ? g.grp : null, cur: 0, prev: 0, qty: 0, est: false, total: t ? t.total : 0, done: t ? t.done : 0 }); } return tasks.get(k); };
        inCur.forEach(l => { const t = get(l.key); t.cur += l.h; t.qty += l.qty; if (l.est) t.est = true; });
        inPrev.forEach(l => { get(l.key).prev += l.h; });
        const list = [...tasks.values()].map(t => Object.assign(t, { diff: r1(t.cur - t.prev) })).filter(t => t.cur > 0 || t.prev > 0 || t.qty > 0).sort((a, b) => b.cur - a.cur || b.prev - a.prev);
        const hours = list.reduce((s, t) => s + t.cur, 0), prevHours = list.reduce((s, t) => s + t.prev, 0);
        const day = [], dayPrev = [];
        for (let i = 0; i < B.days; i++) {
            const a = add(B.start, i), b = add(B.start, i + 1);
            day.push(i < elapsed ? inCur.filter(l => l.at >= a && l.at < b).reduce((s, l) => s + l.h, 0) : null);
            const pa = add(P.start, i), pb = add(P.start, i + 1); dayPrev.push(i < P.days ? L.filter(l => l.at >= pa && l.at < pb).reduce((s, l) => s + l.h, 0) : 0);
        }
        const worked = day.map((v, i) => v !== null && inCur.some(l => l.at >= add(B.start, i) && l.at < add(B.start, i + 1)));
        const isLeave = i => leave.has(dnOf(add(B.start, i) + 12 * 36e5));
        const planned = []; for (let i = 0; i < elapsed; i++) if (!isLeave(i) || worked[i]) planned.push(i);
        const keptDays = planned.filter(i => worked[i]).length;
        const unknown = inCur.filter(l => l.none).length;
        const fin = (o.finished || []).filter(f => f.at >= B.start && f.at < cutoff);
        return {
            kind, back, running, start: B.start, end: B.end, days: B.days, elapsed, hours, prevHours, diff: r1(hours - prevHours), tasks: list,
            day, dayPrev, worked, leaveIdx: day.map((v, i) => isLeave(i)), planDays: planned.length, keptDays, kept: planned.length ? keptDays / planned.length : null,
            finished: fin.map(f => f.title), unknown, estimated: inCur.some(l => l.est && !l.none), count: inCur.length, firstDow: new Date(B.start).getDay()
        };
    }

    /* habits per task: weekdays, time of day, length of a sitting, speed.  Triangulation: a habit is "confident" when 3 or more clues agree. */
    function habits(o) {
        const now = o.now || Date.now(), sp = o.speed || new Map(), L = prep(o), from = add(mid(now), -56), out = [];
        const by = new Map(); L.filter(l => l.at >= from && l.at <= now + DAY).forEach(l => { if (!by.has(l.key)) by.set(l.key, []); by.get(l.key).push(l); });
        by.forEach((ls, key) => {
            const g = o.goals.get(key), s = sp.get(key); if (!g) return;
            // one sitting = all entries of that task on one day
            const days = new Map(); ls.forEach(l => { const d = days.get(l.day) || { day: l.day, h: 0, qty: 0, hrs: [], at: l.at }; d.h += l.h; d.qty += l.qty; if (l.sh !== null && l.sh !== undefined) d.hrs.push(l.sh); else if (l.ts && Math.abs(l.ts - l.at) < DAY) d.hrs.push(new Date(l.ts).getHours()); days.set(l.day, d); });
            const sit = [...days.values()], n = sit.length;
            const share = [0, 0, 0, 0, 0, 0, 0]; sit.forEach(d => { share[(new Date(d.at).getDay() + 6) % 7]++; });
            const weeks = Math.max(1, Math.min(8, Math.ceil((mid(now) - Math.min.apply(null, sit.map(d => d.at))) / (7 * DAY)) || 1));
            const perWeek = n / weeks, shareF = share.map(c => c / weeks);
            const hrsAll = sit.flatMap(d => d.hrs.slice(0, 1)), tod = hrsAll.length >= 3 ? (() => { const m = hrsAll.filter(h => h < 12).length, a = hrsAll.filter(h => h >= 12 && h < 17).length, e = hrsAll.filter(h => h >= 17).length, t = hrsAll.length, best = Math.max(m, a, e); return best / t >= 0.6 ? (best === m ? 'mornings' : best === a ? 'afternoons' : 'evenings') : null; })() : null;
            const hs = sit.filter(d => d.h > 0).map(d => d.h), per = hs.length >= 3 ? median(hs) : null, perCv = hs.length >= 3 ? cv(hs) : 1;
            const q = sit.map(d => d.qty), perQty = median(q);
            const clues = []; if (n >= 3 && perWeek >= 1.5) clues.push('rhythm'); if (tod) clues.push('time'); if (per !== null && perCv <= 0.4) clues.push('length'); if (s && s.status === 'confident') clues.push('speed');
            const rhythm = perWeek >= 4.5 ? 'most weekdays' : perWeek >= 3.5 ? 'four days a week' : perWeek >= 2.5 ? 'three days a week' : perWeek >= 1.5 ? 'two days a week' : perWeek >= 0.8 ? 'about once a week' : 'now and then';
            const prevEff = s && s.weeks ? s.weeks.filter(v => v !== null) : [];
            let move = 0, was = null, now2 = s && s.eff || null;
            if (prevEff.length >= 2) { const a = prevEff[prevEff.length - 2], b = prevEff[prevEff.length - 1]; if (Math.abs(b - a) >= 0.2) { move = b > a ? 1 : -1; was = a; now2 = b; } }
            out.push({ key, id: key, title: g.title, grp: g.grp, unit: s && s.unit || g.qunit, n, perWeek, share: shareF, rhythm, tod, perHours: per, perQty, clues, sure: clues.length >= 3, likely: clues.length === 2, status: s ? s.status : 'none', speed: s && s.eff || null, move, was, speedNow: now2 });
        });
        return out.sort((a, b) => b.n - a.n);
    }

    /* projections: hours left at your speed, and a range of weeks at your recent hours per week.  Never moves a deadline. */
    function project(o) {
        const now = o.now || Date.now(), sp = o.speed || new Map(), L = prep(o), a = add(weekStart(now), -28), res = [];
        const hrsWeek = key => { const xs = L.filter(l => (key === null || l.key === key) && l.at >= a && l.at < weekStart(now)); const h = xs.reduce((s, l) => s + l.h, 0); const first = xs.length ? Math.min.apply(null, xs.map(l => l.at)) : null; if (first === null) return null; const w = Math.min(4, Math.max(1, Math.round((weekStart(now) - weekStart(first)) / (7 * DAY)))); return h / w; };
        let totalHrs = 0, any = false;
        (o.tracks || []).forEach(t => {
            const s = sp.get(t.id), rem = Math.max(0, (t.total || 0) - (t.done || 0)); if (!(rem > 1e-6)) return;
            if (!s || !(s.eff > 0)) { res.push({ id: t.id, title: t.title, unit: t.unit, rem, hours: null }); return; }
            const hrs = rem / s.eff, hw = hrsWeek(t.id) || hrsWeek(null); totalHrs += hrs; any = true;
            let lo = null, hi = null; if (hw > 0.2) { const w = hrs / hw; lo = Math.max(1, Math.floor(w * 0.85)); hi = Math.max(lo, Math.ceil(w * 1.2)); if (w < 1) { lo = hi = 1; } }
            res.push({ id: t.id, title: t.title, unit: t.unit, rem, hours: hrs, speed: s.eff, status: s.status, lo, hi, perWeek: hw || null });
        });
        const hw = hrsWeek(null);
        return { items: res, totalHours: any ? totalHrs : null, perWeek: hw };
    }

    root.GReport = { report, habits, project, bounds, hoursOf, weekStart };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.GReport;
})(typeof window !== 'undefined' ? window : globalThis);
