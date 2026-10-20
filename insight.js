/* Rustam's Goal Manager: what the app learns from your own entries.
   Pure functions. Everything is worked out on this phone from the event log; nothing is sent anywhere. */
(function (root) {
    'use strict';
    const MIN_SAMPLES = 3;           // a learned pace needs at least this many finished tasks of the same kind
    const GROUPS = ['reading', 'drafting', 'editing'];

    function analyse(events, D, E) {
        const dn = E.dn, todayN = D.todayN;
        const voided = new Set(); events.forEach(e => { if (e.t === 'void') voided.add(e.target); });
        const live = events.filter(e => e.t !== 'void' && !voided.has(e.id));
        const dayOf = e => dn(e.day || E.localKey(e.ts));

        // ---- which days had real work (a log with a quantity, or a task ticked done on that day)
        const act = new Map();                       // dayN -> number of entries
        const qtyBy = new Map();                     // goalId -> Map(dayN -> qty)
        live.forEach(e => {
            if (e.t === 'log' && e.qty > 0) {
                const n = dayOf(e); act.set(n, (act.get(n) || 0) + 1);
                if (!qtyBy.has(e.goal)) qtyBy.set(e.goal, new Map());
                const m = qtyBy.get(e.goal); m.set(n, (m.get(n) || 0) + e.qty);
            } else if (e.t === 'fin') { const n = dayOf(e); if (n <= todayN) act.set(n, (act.get(n) || 0) + 1); }
        });
        const leave = new Set(); (D.leaves || []).forEach(l => { for (let n = dn(l.from); n <= dn(l.to); n++) leave.add(n); });
        const isAct = n => act.has(n), isRest = n => leave.has(n);

        // ---- chain: it only breaks after TWO missed days in a row. Leave days neither add nor break.
        const run = from => { let s = 0, gap = 0; for (let n = from; n > todayN - 900; n--) { if (isAct(n)) { s++; gap = 0; } else if (!isRest(n)) { gap++; if (gap >= 2) break; } } return s; };
        const start = isAct(todayN) || isRest(todayN) ? todayN : todayN - 1;
        const streak = run(start);
        const firstN = act.size ? Math.min.apply(null, [...act.keys()]) : todayN;
        let best = 0, s = 0, gap = 0;
        for (let n = firstN; n <= todayN; n++) { if (isAct(n)) { s++; gap = 0; best = Math.max(best, s); } else if (!isRest(n)) { gap++; if (gap >= 2) { s = 0; gap = 0; } } }
        const workedToday = isAct(todayN), restToday = isRest(todayN);
        const atRisk = streak > 0 && !workedToday && !restToday && !isAct(todayN - 1) && !isRest(todayN - 1);

        // ---- week pattern (last 8 weeks)
        const wk = Array.from({ length: 7 }, () => ({ days: 0, active: 0 }));
        for (let n = todayN - 55; n <= todayN; n++) { if (n < firstN) continue; const w = new Date(n * 86400000).getUTCDay(); if (!isRest(n)) { wk[w].days++; if (isAct(n)) wk[w].active++; } }
        const rate = wk.map(x => x.days ? x.active / x.days : 0);
        const enough = todayN - firstN >= 14 && wk.every(x => x.days >= 2);
        let strong = null, weak = null;
        if (enough) { strong = rate.indexOf(Math.max.apply(null, rate)); weak = rate.indexOf(Math.min.apply(null, rate)); if (rate[strong] - rate[weak] < 0.2) strong = weak = null; }
        const days28 = []; for (let n = todayN - 27; n <= todayN; n++) days28.push({ n, on: isAct(n), rest: isRest(n) });

        // ---- how long you really take, by kind of task (newer tasks count more)
        const learned = {};
        GROUPS.forEach(g => {
            const ds = D.pieces.list.filter(p => p.done && p.took !== null && p.grp === g && !p.mirror).sort((a, b) => a.finN - b.finN).slice(-8);
            if (ds.length < MIN_SAMPLES) { learned[g] = { n: ds.length, ratio: null }; return; }
            let a = 0, b = 0; ds.forEach((p, i) => { const w = i + 1; a += w * p.took; b += w * p.days; });
            learned[g] = { n: ds.length, ratio: Math.min(3, Math.max(0.5, a / b)) };
        });
        // ---- suggestions: only for tasks that have not started and have no hard date. You decide; nothing changes by itself.
        const suggestions = [];
        GROUPS.forEach(g => {
            const L = learned[g]; if (L.ratio === null || (L.ratio > 0.85 && L.ratio < 1.15)) return;
            const ps = D.pieces.list.filter(p => !p.done && p.grp === g && p.status === 'later' && !p.fixed && !p.g.mirror)
                .map(p => ({ id: p.id, title: p.title, from: p.days, to: Math.max(1, Math.round(p.days * L.ratio)) })).filter(x => x.to !== x.from);
            if (ps.length) suggestions.push({ grp: g, ratio: L.ratio, n: L.n, pieces: ps, change: ps.reduce((t, x) => t + x.to - x.from, 0) });
        });

        // ---- the companion's mood
        const late = D.pieces.open.some(p => p.status === 'late');
        const quiet = !workedToday && !restToday && !isAct(todayN - 1) && !isRest(todayN - 1);
        const mood = restToday ? 'rest' : late || atRisk || (quiet && act.size) ? 'dim' : workedToday ? 'glow' : 'calm';

        // ---- a few quiet milestones
        const chapDone = [...D.goals.values()].some(g => { if (!g.chap) return false; const a = D.pieces.nodeAgg(g.id); return a.count > 0 && a.doneCount === a.count && a.doneCount > 0; });
        const badges = [
            { id: 'w1', label: 'Seven-day chain', on: best >= 7 },
            { id: 'w4', label: 'Thirty-day chain', on: best >= 30 },
            { id: 'early', label: 'Finished early', on: D.pieces.earlyDays > 0 },
            { id: 'run', label: 'Five on time in a row', on: D.pieces.onTimeRun >= 5 },
            { id: 'chap', label: 'A chapter complete', on: chapDone }
        ];
        return { streak, best, workedToday, restToday, atRisk, mood, late, rate, strong, weak, enough, days28, learned, suggestions, badges, qtyBy, act: act.size,
            qtyOn: (goal, n) => (qtyBy.get(goal) || new Map()).get(n) || 0 };
    }
    const I = { analyse, MIN_SAMPLES, GROUPS };
    if (typeof module !== 'undefined' && module.exports) module.exports = I; else root.GInsight = I;
})(typeof window !== 'undefined' ? window : this);
