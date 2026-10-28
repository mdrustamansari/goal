/* Rustam's Goal Manager: the commitment engine.
 * Everything on screen is calculated from one list of events: derive(events, now).
 * Rules: unfinished work always carries forward; deadlines never move; early work builds buffer.
 */
(function (root) {
    'use strict';
    const pad = n => String(n).padStart(2, '0');
    const dn = key => { const p = String(key).split('-'); return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); };
    const keyOf = n => { const d = new Date(n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
    const localKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const weekday = n => (new Date(n * 86400000).getUTCDay());
    const addYears = (key, y) => { const p = key.split('-'); const yy = +p[0] + y, m = +p[1], d = +p[2]; const dt = new Date(Date.UTC(yy, m - 1, d)); return keyOf(Math.floor(dt.getTime() / 86400000)); };
    const num = (v, d) => (isFinite(Number(v)) && v !== '' && v !== null && v !== undefined ? Number(v) : d);
    const HORIZON = 1825;
    const WORK_DEFAULT = [1, 2, 3, 4, 5, 6];

    function normGoal(g) {
        return {
            id: g.id, kind: ['project', 'life', 'ms', 'item', 'piece'].indexOf(g.kind) >= 0 ? g.kind : 'task',
            phase: g.phase || null, isPhase: !!g.isPhase, over: g.over || null,
            parent: g.parent || null, title: String(g.title || 'Untitled'),
            unit: g.unit || 'pages', total: Math.max(0, num(g.total, 0)), perDay: Math.max(0, num(g.perDay, 0)),
            days: Array.isArray(g.days) && g.days.length ? g.days.map(Number) : WORK_DEFAULT.slice(),
            start: g.start || null, deadline0: g.deadline0 || null,
            thesis: g.thesis !== false, cat: g.cat || 'Other', due: g.due || null, notes: g.notes || '',
            createdAt: g.createdAt || 0,
            pdays: Math.max(0, num(g.pdays, 0)), fixedEnd: g.fixedEnd || null, mirror: g.mirror || null,
            grp: g.grp || null, role: g.role || null, qty: Math.max(0, num(g.qty, 0)), qunit: g.qunit || 'pages', qpace: Math.max(0, num(g.qpace, 0)), uph: Math.max(0, num(g.uph, 0)), chap: !!g.chap, ord: (g.ord === undefined || g.ord === null) ? null : num(g.ord, 0), budget: Math.max(0, num(g.budget, 0)), wt: Math.max(0, num(g.wt, 0)), custom: !!g.custom
        };
    }

    /* One task, day by day: what was planned, what was done, what carries forward. */
    function simTask(g, ctx, extraDoneByDay) {
        const startN = dn(g.start), perDay = g.perDay, total = g.total;
        const doneMap = ctx.done.get(g.id) || new Map();
        const replans = (ctx.replans.get(g.id) || []);
        const planAt = [], doneAt = [], ledger = [];
        let planCum = 0, doneCum = 0, planFinishN = null, finishedN = null;
        let extraLeft = 0, extraPer = 0, extraDays = 0;
        doneMap.forEach((q, n) => { if (n < startN) doneCum += q; });
        const maxN = Math.max(ctx.todayN + 1, startN) + 3650;
        let n = startN;
        for (; n <= maxN; n++) {
            const prevDone = doneCum;
            doneCum += doneMap.get(n) || 0;
            replans.forEach(r => {
                if (r.dayN === n) {
                    const b = Math.max(0, planCum - prevDone);
                    if (b > 0) {
                        ledger.push({ dayN: n, backlog: b, slipDays: perDay > 0 ? b / perDay : 0, spread: r.spread });
                        planCum -= b; extraLeft = b; extraPer = b / Math.max(1, r.spread); extraDays = Math.max(1, r.spread);
                    }
                }
            });
            const working = g.days.indexOf(weekday(n)) >= 0 && !ctx.leave.has(n);
            if (working && planCum < total - 1e-9) {
                let inc = perDay;
                if (extraDays > 0) { const e = Math.min(extraPer, extraLeft); inc += e; extraLeft -= e; extraDays--; }
                planCum = Math.min(total, planCum + inc);
            }
            planAt.push(planCum); doneAt.push(doneCum);
            if (planFinishN === null && planCum >= total - 1e-9 && total > 0) planFinishN = n;
            if (finishedN === null && doneCum >= total - 1e-9 && total > 0) finishedN = n;
            if (n > ctx.todayN && planFinishN !== null && (finishedN !== null || n > ctx.todayN)) break;
            if (perDay <= 0 && n > ctx.todayN) break;
        }
        return { startN, planAt, doneAt, planFinishN, finishedN, ledger };
    }
    const at = (arr, startN, n) => (n < startN || !arr.length) ? 0 : arr[Math.min(arr.length - 1, n - startN)];

    function analyseTask(g, ctx) {
        const todayN = ctx.todayN, startN = dn(g.start);
        const s = simTask(g, ctx);
        const doneMap = ctx.done.get(g.id) || new Map();
        let doneTotal = 0; doneMap.forEach(q => { doneTotal += q; });
        const planYest = at(s.planAt, startN, todayN - 1), planToday = at(s.planAt, startN, todayN);
        const doneYest = todayN - 1 < startN ? Math.min(doneTotal, at(s.doneAt, startN, startN - 1)) : at(s.doneAt, startN, todayN - 1);
        const doneBeforeToday = Math.max(0, doneTotal - (doneMap.get(todayN) || 0));
        const doneToday = doneMap.get(todayN) || 0;
        const started = startN <= todayN;
        const finished = g.total > 0 && doneTotal >= g.total - 1e-9;
        const target = started && !finished ? Math.max(0, planToday - doneBeforeToday) : 0;
        const carriedStart = started ? Math.max(0, planYest - doneBeforeToday) : 0;
        const carried = Math.min(target, carriedStart), fresh = target - carried;
        const left = Math.max(0, target - doneToday);
        const carriedLeft = Math.min(left, Math.max(0, planYest - doneTotal)), newLeft = left - carriedLeft;
        const behindQty = started && !finished ? Math.max(0, planYest - doneTotal) : 0;
        const aheadQty = started ? Math.max(0, doneTotal - Math.max(planToday, 0)) : 0;
        const per = g.perDay > 0 ? g.perDay : 1;
        let status = !started ? 'later' : finished ? 'done' : behindQty > 1e-9 ? 'behind' : aheadQty > 1e-9 ? 'ahead' : 'on';
        // actual pace over the last 14 days
        let wd = 0, sum = 0;
        for (let k = Math.max(startN, todayN - 14); k <= todayN - 1; k++) {
            if (g.days.indexOf(weekday(k)) >= 0 && !ctx.leave.has(k)) wd++;
            sum += doneMap.get(k) || 0;
        }
        if (started && doneToday > 0) {      // work already done today counts toward the pace
            sum += doneToday;
            if (g.days.indexOf(weekday(todayN)) >= 0 && !ctx.leave.has(todayN)) wd++;
        }
        const enough = wd >= 3 && started;
        const rate = enough ? sum / wd : g.perDay;
        const deadlineN = dn(g.deadline0 || keyOf(s.planFinishN === null ? todayN : s.planFinishN));
        // projection
        let projN = null, never = false;
        const remaining = Math.max(0, g.total - doneTotal);
        if (finished) {
            projN = s.finishedN !== null ? s.finishedN : todayN;
        } else if (rate <= 1e-9) never = true;
        else {
            let rem = remaining, k = Math.max(todayN + 1, startN), guard = 0;
            while (rem > 1e-9 && guard < HORIZON) {
                if (g.days.indexOf(weekday(k)) >= 0 && !ctx.leave.has(k)) rem -= rate;
                if (rem <= 1e-9) break;
                k++; guard++;
            }
            if (rem > 1e-9) never = true; else projN = k;
        }
        const projShown = never ? todayN + HORIZON : projN;
        const slip = projShown - deadlineN;
        const recoveryPerDay = behindQty > 0 ? per + behindQty / 7 : 0;
        return {
            id: g.id, g, startN, total: g.total, done: doneTotal, remaining, perDay: g.perDay, unit: g.unit,
            started, finished, status, target, carried, fresh, doneToday, left, carriedLeft, newLeft,
            behindQty, aheadQty, behindDays: behindQty / per, aheadDays: aheadQty / per,
            projShown, rate, rateActual: enough, planFinishN: s.planFinishN, deadlineN, projN, never, slip,
            finishedN: s.finishedN, ledger: s.ledger, recoveryPerDay,
            planYest, planToday, pct: g.total > 0 ? Math.min(1, doneTotal / g.total) : 0
        };
    }

    /* A preview used while creating a task */
    function planPreview(spec, leaveSet, nowKey) {
        const g = normGoal(Object.assign({ id: -1, kind: 'task' }, spec));
        if (!g.start) g.start = nowKey;
        const ctx = { todayN: dn(nowKey), done: new Map(), replans: new Map(), leave: leaveSet || new Set() };
        if (!(g.perDay > 0) || !(g.total > 0)) return null;
        const s = simTask(g, ctx);
        return { finishN: s.planFinishN, finish: s.planFinishN === null ? null : keyOf(s.planFinishN), workDays: Math.ceil(g.total / g.perDay) };
    }
    // The daily amount needed to finish by a deadline
    function perDayFor(spec, deadlineKey, leaveSet, nowKey) {
        const g = normGoal(Object.assign({ id: -1, kind: 'task' }, spec));
        const startN = dn(g.start || nowKey), endN = dn(deadlineKey);
        let wd = 0;
        for (let n = startN; n <= endN; n++) if (g.days.indexOf(weekday(n)) >= 0 && !(leaveSet && leaveSet.has(n))) wd++;
        return wd > 0 ? g.total / wd : 0;
    }

    /* ---- Time-boxed pieces: every piece has allotted days; the clock chains from one piece to the next ---- */
    const GRP_RANK = { reading: 0, drafting: 1, editing: 2 };
    function buildPieces(X) {
        const { leave: leaveSet, goals, kidsOf, unfinTs, logs: allLogs, pstartMap, dl0Map, rebases, cfg, jrf, todayN, now, done, picks } = X, adjM = X.adj || new Map(), beginMap = X.beginMap || new Map(), pickMode = !!(cfg && cfg.startMode === 'pick');
        const finMap = new Map(X.finMap);
        const all = [...goals.values()].filter(g => g.kind === 'piece' && (!g.mirror || goals.has(g.mirror)) && g.pdays > 0);
        // daily paces: a quantity (pages, steps) logged each day that finishes the pieces under it
        const under = (id, pid) => { let x = goals.get(pid), n = 0; while (x && n++ < 30) { if (x.id === id) return true; x = x.parent ? goals.get(x.parent) : null; } return false; };
        const trackList = [];
        goals.forEach(g => {
            if ((g.kind !== 'project' && g.kind !== 'piece') || !(g.qty > 0)) return;
            const m = done.get(g.id) || new Map(), am = adjM.get(g.id) || [], days = [...new Set([...m.keys(), ...am.map(a => a[0])])].sort((a, b) => a - b);
            let cum = 0, reachedN = null; days.forEach(n => { cum += (m.get(n) || 0) + am.filter(a => a[0] === n).reduce((x, a) => x + a[1], 0); if (reachedN === null && cum >= g.qty - 1e-9) reachedN = n; });
            const lastLogN = m.size ? Math.max.apply(null, [...m.keys()]) : null, lastPos = am.length ? am[am.length - 1] : null;
            const scope = all.filter(p => under(g.id, p.id));
            const lastLogTs = Math.max.apply(null, [0].concat((allLogs || []).filter(l => under(g.id, l.goal)).map(l => l.ts || 0)));
            // a task you reopened by hand stays open until you log more; the quantity reached does not re-finish it behind your back
            if (reachedN !== null) scope.forEach(p => { if (!finMap.has(p.id) && !((unfinTs && unfinTs.get(p.id) || 0) > lastLogTs)) finMap.set(p.id, { day: keyOf(reachedN), ts: now, id: null, auto: true }); });
            trackList.push({ id: g.id, g, total: g.qty, unit: g.qunit, pace: g.qpace, done: Math.max(0, cum), lastLogN, posN: lastPos ? lastPos[0] : null, reachedN, scopeIds: scope.map(p => p.id), loggedToday: (m.get(todayN) || 0) > 0, last7: [...m.entries()].filter(([n]) => n > todayN - 7 && n <= todayN).reduce((s, [, q]) => s + q, 0) });
        });
        const ord = new Map(); let k = 0;
        const dfs = g => { ord.set(g.id, k++); (kidsOf.get(g.id) || []).forEach(dfs); };
        [...goals.values()].filter(g => !g.parent || !goals.has(g.parent)).sort((a, b) => a.id - b.id).forEach(dfs);
        const up = (g, f) => { let x = g, n = 0; while (x && n++ < 20) { if (f(x)) return x; x = x.parent ? goals.get(x.parent) : null; } return null; };
        const chapters = [...goals.values()].filter(g => g.chap).sort((a, b) => ord.get(a.id) - ord.get(b.id));
        const chapIdx = new Map(chapters.map((g, i) => [g.id, i]));
        const byPhase = cfg && cfg.order === 'phase';
        const recs = all.map(g => {
            const ch = up(g, x => x.chap), gr = up(g, x => x.grp), grp = gr ? gr.grp : (g.grp || null);
            const ci = ch ? chapIdx.get(ch.id) : 999, rank = grp in GRP_RANK ? GRP_RANK[grp] : 3;
            return { g, id: g.id, chapter: ch ? ch.id : null, grpNode: gr ? gr.id : null, grp, key: byPhase ? [0, rank, ci, ord.get(g.id)] : [rank === 2 ? 1 : 0, ci, rank, ord.get(g.id)] };
        }).sort((a, b) => { for (let i = 0; i < 4; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i]; return 0; });
        // editing and proofreading is the last stage of the whole thesis: locked until every reading and drafting piece is done
        const rdOpen = recs.filter(r => (r.grp === 'reading' || r.grp === 'drafting') && !finMap.has(r.id)).length, editLocked = r => r.grp === 'editing' && rdOpen > 0;
        if (cfg && cfg.order === 'custom') {
            const base = new Map(recs.map((r, i) => [r.id, i]));
            const cls = r => { const f = finMap.get(r.id); if (f) return [0, f.day ? dn(f.day) : -1, base.get(r.id)]; const pi = editLocked(r) ? -1 : picks.indexOf(r.id); if (pi >= 0) return [1, pi, 0]; return [2, 0, base.get(r.id)]; };
            recs.sort((a, b) => { const x = cls(a), y = cls(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
        }
        // work done on each piece, from the daily paces: a daily task's progress is shared out over the pieces under it, in clock order
        const recIdx = new Map(recs.map((r, i) => [r.id, i])), workMap = new Map();
        trackList.forEach(t => {
            const sc = t.scopeIds.filter(i => recIdx.has(i)).sort((a, b) => recIdx.get(a) - recIdx.get(b)); if (!sc.length) return;
            const tot = sc.reduce((s, i) => s + goals.get(i).pdays, 0); let acc = Math.min(1, t.done / t.total) * tot;
            sc.forEach(i => {
                const d = goals.get(i).pdays, w = Math.max(0, Math.min(1, acc / d)); acc = Math.max(0, acc - d);
                const prev = workMap.get(i); if (!prev || w > prev.w) workMap.set(i, { w, track: t.id, unit: t.unit, qty: sc.length === 1 ? t.done : null, total: sc.length === 1 ? t.total : null });
            });
        });
        const readingOpen = new Map();
        recs.forEach(r => { if (r.grp === 'reading' && !finMap.has(r.id) && r.chapter != null) readingOpen.set(r.chapter, (readingOpen.get(r.chapter) || 0) + 1); });
        const sim = ratio => {
            let cursor = null; const out = new Map();
            recs.forEach(r => {
                const g = r.g, fin = finMap.get(r.id), createdN = dn(localKey(g.createdAt || now));
                const days = fin ? g.pdays : Math.max(1, Math.ceil(g.pdays * ratio - 1e-9));
                let auto = Math.max(cursor === null ? -1e9 : cursor + 1, createdN);
                const man = pstartMap.has(r.id) ? dn(pstartMap.get(r.id)) : null;
                let start = man !== null && man < auto ? Math.max(man, createdN) : auto;
                const begN = beginMap.has(r.id) ? dn(beginMap.get(r.id)) : null, wk0 = workMap.get(r.id), picked = begN !== null || man !== null || !!(wk0 && wk0.w > 0);
                if (begN !== null) start = Math.max(begN, createdN);               // you pressed Start: the clock starts that day
                else if (pickMode && !fin && !picked) start = Math.max(auto, todayN);  // not picked yet: it waits, and the waiting is not counted as late
                let finN = fin && fin.day ? dn(fin.day) : null, took = null, projN, status, due = start + days - 1;
                if (fin) {
                    if (finN !== null) { if (finN < start) start = finN; if (finN >= createdN) took = finN - start + 1; due = start + g.pdays - 1; projN = finN; cursor = cursor === null ? finN : Math.max(cursor, finN); }
                    else projN = null;
                    status = 'done';
                } else {
                    projN = start > todayN ? due : Math.max(due, todayN);
                    // real pace: if work is under way, the finish follows the work done so far, not only the clock
                    const wk = workMap.get(r.id);
                    if (wk && wk.w > 0 && wk.w < 1 && start <= todayN && todayN - start + 1 >= 2) projN = Math.max(todayN, Math.min(todayN + Math.ceil((1 - wk.w) * (todayN - start + 1) / wk.w - 1e-9), todayN + 3 * g.pdays));
                    status = start > todayN ? 'later' : todayN > due ? 'late' : todayN === due ? 'due' : 'on';
                    if (pickMode && !picked && start <= todayN) status = 'ready';
                    cursor = pickMode && cursor !== null ? Math.max(cursor, projN) : projN;
                }
                out.set(r.id, { start, due, finN, took, projN, status, picked, lateDays: !fin && start <= todayN ? Math.max(0, todayN - due) : 0 });
            });
            return out;
        };
        const base = sim(1);
        const list = recs.map((r, i) => {
            const g = r.g, b = base.get(r.id), fin = finMap.get(r.id);
            const fixedN = g.fixedEnd ? dn(g.fixedEnd) : null;
            const dl0 = fixedN !== null ? fixedN : (dl0Map.has(r.id) ? dn(dl0Map.get(r.id)) : null);
            const lockWhy = r.grp === 'drafting' && r.chapter != null && (readingOpen.get(r.chapter) || 0) > 0 ? 'reading' : (editLocked(r) ? 'edit' : null), locked = !!lockWhy;
            const title = g.mirror && goals.get(g.mirror) ? 'Edit: ' + goals.get(g.mirror).title : g.title;
            const wk = workMap.get(r.id), wexp = !fin && wk && b.start <= todayN ? Math.min(1, Math.max(0, (todayN - b.start + 1) / g.pdays)) : null;
            const slip = fin ? (b.finN !== null && dl0 !== null ? b.finN - dl0 : 0) : (dl0 !== null && b.projN !== null ? b.projN - dl0 : 0);
            return Object.assign({}, r, b, { i, title, finId: fin ? fin.id : null, done: !!fin, doneUndated: !!fin && b.finN === null, days: g.pdays, dl0, slip, locked, lockWhy, fixed: fixedN !== null, over: b.took !== null ? b.took - g.pdays : null, began: beginMap.has(r.id), started: pickMode ? (b.picked || !!fin) : (pstartMap.has(r.id) || b.start <= todayN), manual: pstartMap.has(r.id), parent: g.parent,
                work: fin ? 1 : (wk ? wk.w : 0), hasWork: !!wk && !fin, workQty: wk && !fin ? wk.qty : null, workTotal: wk && !fin ? wk.total : null, workUnit: wk ? wk.unit : null,
                workExp: wexp, workAhead: wexp !== null ? (wk.w - wexp) * g.pdays : null });
        });
        const byId = new Map(list.map(p => [p.id, p]));
        // pace: how long you really take compared with what you allot
        const timed = list.filter(p => p.done && p.took !== null).slice(-10);
        const nT = timed.length, ratio = nT >= 3 ? Math.min(3, Math.max(0.5, timed.reduce((s, p) => s + p.took, 0) / timed.reduce((s, p) => s + p.days, 0))) : 1;
        const fc = ratio === 1 ? base : sim(ratio);
        const open = list.filter(p => !p.done);
        const lastProj = m => { let mx = null; list.forEach(p => { if (!p.done) { const v = m.get(p.id).projN; if (v !== null && (mx === null || v > mx)) mx = v; } }); return mx; };
        const projFinal = lastProj(base), forecastFinal = lastProj(fc);
        const baseFinal = open.length ? Math.max.apply(null, open.map(p => p.dl0 !== null ? p.dl0 : p.projN)) : null;
        // node aggregates
        const agg = new Map();
        const nodeAgg = id => {
            if (agg.has(id)) return agg.get(id);
            const ps = list.filter(p => { let x = p.g; while (x) { if (x.id === id) return true; x = x.parent ? goals.get(x.parent) : null; } return false; });
            const totalDays = ps.reduce((s, p) => s + p.days, 0), doneDays = ps.filter(p => p.done).reduce((s, p) => s + p.days, 0);
            const op = ps.filter(p => !p.done), dls = op.filter(p => p.dl0 !== null);
            const pr = op.length ? Math.max.apply(null, op.map(p => p.projN)) : null, dl = dls.length ? Math.max.apply(null, dls.map(p => p.dl0)) : null;
            const workDays = ps.reduce((s, p) => s + p.days * p.work, 0);
            const a = { id, count: ps.length, doneCount: ps.length - op.length, totalDays, doneDays, workDays, openDays: totalDays - workDays, pct: totalDays ? workDays / totalDays : 0, pctDone: totalDays ? doneDays / totalDays : 0, projN: pr, dl0: dl, slip: pr !== null && dl !== null ? pr - dl : 0, late: op.filter(p => p.status === 'late').length, next: op.sort((x, y) => x.i - y.i)[0] || null, pieces: ps };
            agg.set(id, a); return a;
        };
        goals.forEach(g => { if (g.kind === 'project') nodeAgg(g.id); });
        // headline numbers
        const doneList = list.filter(p => p.done && p.took !== null);
        const earlyDays = doneList.reduce((s, p) => s + Math.max(0, p.days - p.took), 0), overDays = doneList.reduce((s, p) => s + Math.max(0, p.took - p.days), 0);
        let run = 0; for (let j = doneList.length - 1; j >= 0 && doneList[j].took <= doneList[j].days; j--) run++;
        const totalDays = list.reduce((s, p) => s + p.days, 0), doneDays = list.filter(p => p.done).reduce((s, p) => s + p.days, 0), workDays = list.reduce((s, p) => s + p.days * p.work, 0);
        let thesis = null;
        if (jrf) {
            const pf = projFinal !== null ? projFinal : (doneList.length ? doneList[doneList.length - 1].finN : todayN);
            const bf = baseFinal !== null ? baseFinal : pf;
            const forgiven = rebases.reduce((s, r) => s + r.forgiven, 0);
            // The year-4 target is for reading and drafting. Editing, proofreading and finalising live in the fifth year.
            const FIN = cfg && num(cfg.finDays, -1) >= 0 ? num(cfg.finDays, 60) : 60;
            const wOpen = open.filter(p => p.grp !== 'editing'), eOpen = open.filter(p => p.grp === 'editing');
            const wDone = list.filter(p => p.done && p.grp !== 'editing' && p.finN != null);
            const pfW = wOpen.length ? Math.max.apply(null, wOpen.map(p => p.projN)) : (wDone.length ? Math.max.apply(null, wDone.map(p => p.finN)) : todayN);
            const editDays = eOpen.reduce((a, p) => a + p.days, 0), fifthDays = jrf.endN - jrf.targetN;
            const bfW = wOpen.length ? Math.max.apply(null, wOpen.map(p => p.dl0 !== null ? p.dl0 : p.projN)) : pfW;
            const fifth = { days: fifthDays, edit: editDays, fin: FIN, free: fifthDays - editDays - FIN, writeN: pfW, baseWriteN: bfW, editN: pf - pfW };
            thesis = { slip: pf - bf, planned: jrf.endN - bf - FIN, buffer: jrf.endN - pf - FIN, fifth, lost: Math.max(0, pf - bf), gained: Math.max(0, bf - pf), projN: pf, baseN: bf, toTarget: pfW - jrf.targetN, forecastN: forecastFinal !== null ? forecastFinal : pf, forecastToTarget: (forecastFinal !== null ? forecastFinal : pf) - (pf - pfW) - jrf.targetN, ratio, paced: nT, pct: totalDays ? workDays / totalDays : 0, pctDone: totalDays ? doneDays / totalDays : 0, workDays, forgiven, projects: [], openDays: totalDays - workDays, daysToTarget: jrf.targetN - todayN };
        }
        const active = pickMode ? open.filter(p => p.picked) : open.filter(p => p.start <= todayN).slice(0, 4);
        const upcoming = pickMode ? open.filter(p => !p.picked && !p.locked).slice(0, 3) : open.filter(p => p.start > todayN).slice(0, 3);
        const needLock = open.filter(p => p.dl0 === null && !p.fixed && now - (p.g.createdAt || now) >= 86400000);
        // a task with sub-tasks takes its daily pace from them (same unit only); with none, its pace is its own
        const trackIds = new Set(trackList.map(t => t.id));
        const nearTrack = id => { let x = goals.get(id), n = 0; x = x && x.parent ? goals.get(x.parent) : null; while (x && n++ < 30) { if (trackIds.has(x.id)) return x.id; x = x.parent ? goals.get(x.parent) : null; } return null; };
        const kidsT = new Map(); trackList.forEach(t => { const p = nearTrack(t.id); if (p !== null) { if (!kidsT.has(p)) kidsT.set(p, []); kidsT.get(p).push(t); } });
        trackList.forEach(t => { const ks = (kidsT.get(t.id) || []).filter(k => k.unit === t.unit); t.kidIds = ks.map(k => k.id); const sp = ks.reduce((a, k) => a + (k.pace > 0 ? k.pace : 0), 0); t.paceOwn = t.pace; if (ks.length && sp > 0) { t.pace = sp; t.paceFrom = 'kids'; } });
        // work logged on the sub-tasks counts for the task above them (same unit); one record, no second copy
        trackList.forEach(t => { if (t.kidIds && t.kidIds.length) { const ks = t.kidIds.map(i => trackList.find(x => x.id === i)); t.ownDone = t.done; t.done = Math.min(t.total, t.done + ks.reduce((a, k) => a + k.done, 0)); t.loggedToday = t.loggedToday || ks.some(k => k.loggedToday); } });
        const tracks = trackList.map(t => {
            const sc = t.scopeIds.map(i => byId.get(i)).filter(Boolean), op = sc.filter(p => !p.done);
            const fx = op.filter(p => p.fixed).map(p => p.dl0), dls = op.map(p => p.dl0 !== null ? p.dl0 : p.due), deadline = fx.length ? Math.min.apply(null, fx) : (dls.length ? Math.max.apply(null, dls) : null);
            const remaining = Math.max(0, t.total - t.done), fromToday = t.loggedToday ? 1 : 0;
            const daysLeft = deadline === null ? null : Math.max(0, deadline - todayN + 1 - fromToday);
            const need = daysLeft === null ? null : daysLeft > 0 ? Math.ceil(remaining / daysLeft - 1e-9) : remaining;
            const projN = t.pace > 0 && remaining > 0 ? todayN + Math.ceil(remaining / t.pace - 1e-9) - 1 + fromToday : null;
            return Object.assign({}, t, { remaining, pct: Math.min(1, t.done / t.total), deadline, daysLeft, need, projN, finished: remaining <= 1e-9, behind: projN !== null && deadline !== null && projN > deadline, avg7: t.last7 / 7, pieces: sc });
        });
        // rhythm: how much plan work you really do, week against week and month against month, and where that speed leads
        const wdByDay = new Map(), addWD = (n, v) => wdByDay.set(n, (wdByDay.get(n) || 0) + v), inTrack = new Set();
        trackList.forEach(t => {
            t.scopeIds.forEach(i => inTrack.add(i)); const m = done.get(t.id); if (!m) return;
            const tot = t.scopeIds.reduce((a, i) => a + (goals.get(i) ? goals.get(i).pdays : 0), 0); let cum = 0;
            [...m.keys()].sort((a, b) => a - b).forEach(n => { const q = Math.min(m.get(n), Math.max(0, t.total - cum)); cum += m.get(n); if (q > 0) addWD(n, q / t.total * tot); });
        });
        list.forEach(p => { if (p.done && p.finN !== null && !inTrack.has(p.id)) addWD(p.finN, p.days); });
        const lv = leaveSet || new Set(), sumWD = (a, b) => { let v = 0; for (let n = a; n <= b; n++) v += wdByDay.get(n) || 0; return v; }, openD = (a, b) => { let c = 0; for (let n = a; n <= b; n++) if (!lv.has(n)) c++; return Math.max(1, c); };
        const firstN = wdByDay.size ? Math.min.apply(null, [...wdByDay.keys()]) : null;
        const win = (a, b) => ({ days: sumWD(a, b), speed: sumWD(a, b) / openD(firstN !== null ? Math.max(a, Math.min(firstN, b)) : a, b) });
        const w7 = win(todayN - 6, todayN), p7 = win(todayN - 13, todayN - 7), w30 = win(todayN - 29, todayN), p30 = win(todayN - 59, todayN - 30);
        const remainWD = Math.max(0, totalDays - list.reduce((a, p) => a + p.days * p.work, 0));
        const basis = firstN !== null && firstN <= todayN - 13 ? w30 : w7, atSpeed = firstN !== null && basis.speed >= 0.03 && remainWD > 0 ? todayN + Math.ceil(remainWD / basis.speed) - 1 : null;
        const rhythm = { w7, p7, w30, p30, hasP7: firstN !== null && firstN <= todayN - 7, hasP30: firstN !== null && firstN <= todayN - 30, basisDays: basis === w30 ? 30 : 7, speed: basis.speed, remainWD, atSpeedN: remainWD <= 0 ? todayN : atSpeed, targetN: jrf ? jrf.targetN : null, endN: jrf ? jrf.endN : null, todayWD: wdByDay.get(todayN) || 0, firstN, days14: Array.from({ length: 14 }, (_, i) => { const n = todayN - 13 + i; return { n, v: wdByDay.get(n) || 0, leave: lv.has(n) }; }) };
        return { rhythm, pickMode, tracks, picks, list, byId, agg, nodeAgg, active, upcoming, open, thesis, totalDays, doneDays, earlyDays, overDays, onTimeRun: run, ratio, paced: nT, projFinal, forecastFinal, baseFinal, needLock, rebases, chapters: chapters.map(c => c.id), rdOpen };
    }

    function derive(events, now) {
        now = now || Date.now();
        const evs = events.slice().sort((a, b) => (a.ts - b.ts) || ((a.id || 0) - (b.id || 0)));
        const voided = new Set();
        evs.forEach(e => { if (e.t === 'void') voided.add(e.target); });
        const todayKey = localKey(now), todayN = dn(todayKey);
        let cfg = null;
        const goals = new Map();
        const unfinTs = new Map(), finMap = new Map(), pstartMap = new Map(), beginMap = new Map(), dl0Map = new Map(), rebases = []; let picks = [];
        const done = new Map(), replans = new Map(), leave = new Set(), leaves = [], marks = new Map(), logs = [], poses = [], adj = new Map(), logSum = new Map(), adjSum = new Map();
        let nextGoalId = 1;
        for (const e of evs) {
            if (e.t === 'void' || voided.has(e.id)) continue;
            switch (e.t) {
                case 'cfg': cfg = Object.assign({}, cfg || {}, e.c); break;
                case 'goal':
                    if (e.op === 'add' || e.op === 'addmany') { (e.op === 'add' ? [e.g] : e.gs).forEach(gg => { const g = normGoal(Object.assign({}, gg, { createdAt: e.ts })); goals.set(g.id, g); nextGoalId = Math.max(nextGoalId, g.id + 1); }); }
                    else if (false) { const g = normGoal(Object.assign({}, e.g, { createdAt: e.ts })); goals.set(g.id, g); nextGoalId = Math.max(nextGoalId, g.id + 1); }
                    else if (e.op === 'edit' && goals.has(e.gid)) {
                        const old = goals.get(e.gid), f = Object.assign({}, e.f);
                        if (old.fixedEnd && f.fixedEnd !== undefined && f.fixedEnd !== old.fixedEnd && e.ts - old.createdAt > 86400000) delete f.fixedEnd;   // a hard date cannot be moved after the first day
                        if (old.deadline0 && f.deadline0 && f.deadline0 !== old.deadline0 && e.ts - old.createdAt > 86400000) delete f.deadline0;   // a deadline cannot be moved after the first day
                        goals.set(e.gid, normGoal(Object.assign({}, old, f, { id: old.id, createdAt: old.createdAt })));
                    }
                    else if (e.op === 'reorder') { (e.ids || []).forEach((gid, i) => { const g = goals.get(gid); if (g) goals.set(gid, normGoal(Object.assign({}, g, { ord: (i + 1) * 10 }))); }); }
                    else if (e.op === 'del') { const rm = id => { goals.delete(id); [...goals.values()].forEach(g => { if (g.parent === id) rm(g.id); }); }; rm(e.gid); }
                    break;
                case 'log': {
                    if (e.sit) { logs.push(e); break; }   // a sitting (start to finish of a task): hours only, never pages or words
                    const n = dn(e.day || localKey(e.ts));
                    if (!done.has(e.goal)) done.set(e.goal, new Map());
                    const m = done.get(e.goal); m.set(n, (m.get(n) || 0) + e.qty);
                    logs.push(e); logSum.set(e.goal, (logSum.get(e.goal) || 0) + e.qty);
                    break;
                }
                case 'pos': {   // "Last page I finished: N". It fixes where you are. It is never work done today.
                    poses.push(e);
                    const n = dn(e.day || localKey(e.ts)), before = (logSum.get(e.goal) || 0) + (adjSum.get(e.goal) || 0), delta = e.page - before;
                    if (!adj.has(e.goal)) adj.set(e.goal, []); adj.get(e.goal).push([n, delta, e.page]); adjSum.set(e.goal, (adjSum.get(e.goal) || 0) + delta);
                    break;
                }
                case 'leave': { const a = dn(e.from), b = dn(e.to); for (let n = a; n <= b; n++) leave.add(n); leaves.push(e); break; }
                case 'replan': { if (!replans.has(e.goal)) replans.set(e.goal, []); replans.get(e.goal).push({ dayN: dn(e.day || todayKey), spread: Math.max(1, e.spread || 7) }); break; }
                case 'fin': finMap.set(e.goal, { day: e.day || null, ts: e.ts, id: e.id }); break;
                case 'unfin': finMap.delete(e.goal); unfinTs.set(e.goal, e.ts || 0); break;
                case 'pstart': pstartMap.set(e.goal, e.day); break;
                case 'begin': beginMap.set(e.goal, e.day || localKey(e.ts)); break;
                case 'unbegin': beginMap.delete(e.goal); break;
                case 'next': picks = [e.goal].concat(picks.filter(x => x !== e.goal)); break;
                case 'lock': Object.keys(e.map || {}).forEach(k => { if (e.rebase || !dl0Map.has(+k)) dl0Map.set(+k, e.map[k]); }); if (e.rebase) rebases.push({ ts: e.ts, forgiven: e.forgiven || 0 }); break;
                case 'done': marks.set(e.goal, e.day || localKey(e.ts)); break;
                default: break;
            }
        }
        const ctx = { todayN, done, replans, leave };
        const kidsOf = new Map();
        goals.forEach(g => { if (g.parent) { if (!kidsOf.has(g.parent)) kidsOf.set(g.parent, []); kidsOf.get(g.parent).push(g); } });
        const sk = g => g.ord !== null && g.ord !== undefined ? g.ord : 1e9 + g.id;   // a task you placed by hand keeps its place; new ones come last
        kidsOf.forEach(a => a.sort((x, y) => sk(x) - sk(y)));
        const sumMap = m => { let s = 0; if (m) m.forEach(q => { s += q; }); return s; };
        const itemsUnder = (root, out) => { out = out || []; (kidsOf.get(root) || []).forEach(c => { if (c.kind === 'item') out.push(c); else if (c.kind === 'project') itemsUnder(c.id, out); }); return out; };
        const ancestors = id => { const set = new Set(); let g = goals.get(id); while (g) { set.add(g.id); g = g.parent ? goals.get(g.parent) : null; } return set; };

        // items: the smallest pieces of the thesis
        const items = new Map();
        goals.forEach(g => { if (g.kind === 'item') { const dn_ = sumMap(done.get(g.id)); items.set(g.id, { id: g.id, g, title: g.title, unit: g.unit, total: g.total, done: dn_, remaining: Math.max(0, g.total - dn_), pct: g.total > 0 ? Math.min(1, dn_ / g.total) : 0, parent: g.parent }); } });

        // tasks: own-logged, or derived from the items under a node
        const tasks = [], derivedItems = new Map();
        goals.forEach(g => {
            if (g.kind !== 'task' || !g.start || !(g.perDay > 0)) return;
            if (g.over && goals.has(g.over)) {
                const its = itemsUnder(g.over).filter(i => i.total > 0);
                const total = its.reduce((s, i) => s + i.total, 0);
                if (!(total > 0)) return;
                const merged = new Map();
                its.forEach(i => { const m = done.get(i.id); if (m) m.forEach((q, n) => merged.set(n, (merged.get(n) || 0) + q)); });
                done.set(g.id, merged);
                const g2 = Object.assign({}, g, { total, unit: its[0].unit });
                tasks.push(analyseTask(g2, ctx));
                derivedItems.set(g.id, its.map(i => items.get(i.id)));
            } else if (!g.over && g.total > 0) tasks.push(analyseTask(g, ctx));
        });
        const byId = new Map(tasks.map(t => [t.id, t]));
        tasks.forEach(t => { if (derivedItems.has(t.id)) { t.derived = true; t.items = derivedItems.get(t.id); t.next = t.items.find(i => i.remaining > 1e-9) || null; } });

        // nodes (phases, chapters, parts, themes)
        const leavesOf = (id, out) => { out = out || []; (kidsOf.get(id) || []).forEach(c => {
            if (c.kind === 'item' && c.total > 0) out.push({ unit: c.unit, total: c.total, done: Math.min(c.total, sumMap(done.get(c.id))) });
            else if (c.kind === 'task' && !c.over && c.total > 0) out.push({ unit: c.unit, total: c.total, done: Math.min(c.total, sumMap(done.get(c.id))) });
            else if (c.kind === 'project') leavesOf(c.id, out);
        }); return out; };
        const projects = [];
        goals.forEach(g => {
            if (g.kind !== 'project') return;
            const kids = tasks.filter(t => { const par = t.g.parent; return par && (par === g.id || ancestors(par).has(g.id)); });
            const slip = kids.length ? Math.max(...kids.map(t => t.slip)) : 0;
            const proj = kids.length ? Math.max(...kids.map(t => t.projShown)) : null;
            const dl = kids.length ? Math.max(...kids.map(t => t.deadlineN)) : null;
            const lv = leavesOf(g.id);
            const units = new Set(lv.map(l => l.unit));
            const tot = lv.reduce((s, l) => s + l.total, 0), dd = lv.reduce((s, l) => s + l.done, 0);
            const pct = !lv.length ? 0 : units.size === 1 ? dd / tot : lv.reduce((s, l) => s + l.done / l.total, 0) / lv.length;
            const behind = kids.filter(t => t.status === 'behind').length;
            const par = g.parent ? goals.get(g.parent) : null;
            projects.push({ id: g.id, g, title: g.title, thesis: g.thesis, phase: g.phase, isPhase: g.isPhase, parent: g.parent, chapter: !g.isPhase && (!par || par.isPhase), kids, slip, deadlineN: dl, projN: proj, pct, leaves: lv.length, total: tot, done: dd, remaining: Math.max(0, tot - dd), unit: units.size === 1 ? [...units][0] : null, behind, started: kids.some(t => t.started), children: (kidsOf.get(g.id) || []).map(c => c.id) });
        });
        projects.sort((a, b) => a.id - b.id);
        const pById = new Map(projects.map(p => [p.id, p]));

        // work that has no daily plan yet
        const covered = new Set();
        derivedItems.forEach(its => its.forEach(i => covered.add(i.id)));
        goals.forEach(g => { if (g.kind === 'task' && g.over) itemsUnder(g.over).forEach(i => covered.add(i.id)); });
        const uncovered = new Map();
        items.forEach(i => { if (i.remaining > 1e-9 && !covered.has(i.id)) { let g = goals.get(i.parent), ch = null; while (g) { const p = pById.get(g.id); if (p && p.chapter) { ch = p; break; } g = g.parent ? goals.get(g.parent) : null; } const key = ch ? ch.id : 0; const u = uncovered.get(key) || { chapter: ch, total: 0, unit: i.unit, count: 0 }; u.total += i.remaining; u.count++; uncovered.set(key, u); } });

        // the JRF timeline and the buffer
        const c = cfg || null;
        let jrf = null, thesis = null;
        if (c && c.start) {
            const startN = dn(c.start), targetN = dn(addYears(c.start, c.target || 4)), endN = dn(addYears(c.start, c.years || 5));
            jrf = { startN, targetN, endN, years: c.years || 5, target: c.target || 4, elapsed: todayN - startN, total: endN - startN, daysToTarget: targetN - todayN, daysToEnd: endN - todayN, year: Math.min(c.years || 5, Math.max(1, Math.floor((todayN - startN) / 365.25) + 1)) };
            const th = projects.filter(p => p.thesis && p.chapter);
            const slip = th.reduce((s, p) => s + p.slip, 0);
            const planned = endN - targetN;
            thesis = { slip, planned, buffer: planned - slip, lost: Math.max(0, slip), gained: Math.max(0, -slip), projN: targetN + slip, projects: th, pct: th.length ? th.reduce((s, p) => s + p.pct, 0) / th.length : 0 };
        }

        // life
        const life = [];
        goals.forEach(g => {
            if (g.kind !== 'life') return;
            const ms = [...goals.values()].filter(m => m.kind === 'ms' && m.parent === g.id).map(m => ({ id: m.id, title: m.title, due: m.due, done: marks.get(m.id) || null, daysLeft: m.due ? dn(m.due) - todayN : null }));
            life.push({ id: g.id, title: g.title, cat: g.cat, due: g.due, notes: g.notes, daysLeft: g.due ? dn(g.due) - todayN : null, ms, doneCount: ms.filter(m => m.done).length });
        });

        // streak of days when every started task was on schedule at day end
        let streak = 0;
        { const act = tasks.filter(t => t.started && !t.finished); if (act.length) {
            const sims = act.map(t => ({ t, s: simTask(t.g, ctx) }));
            for (let n = todayN - 1; n > todayN - 200; n--) {
                let any = false, ok = true;
                sims.forEach(({ t, s }) => { if (n >= t.startN) { any = true; const p = at(s.planAt, t.startN, n), d = at(s.doneAt, t.startN, n); if (d + 1e-9 < p) ok = false; } });
                if (!any || !ok) break;
                streak++;
            }
        } }

        const pieces = buildPieces({ leave, goals, kidsOf, finMap, unfinTs, logs, pstartMap, beginMap, dl0Map, rebases, cfg: c, jrf, todayN, now, done, picks, adj });
        if (pieces.list.length && jrf) thesis = pieces.thesis;
        return { now, todayKey, todayN, pieces, events: evs, cfg: c, jrf, thesis, goals, tasks, byId, projects, pById, items, uncovered, kidsOf, life, leaves: leaves.filter(l => !voided.has(l.id)), leave, logs, poses, nextGoalId, streak, marks };
    }

    const E = { dn, keyOf, localKey, weekday, addYears, derive, planPreview, perDayFor, normGoal, HORIZON, WORK_DEFAULT };
    if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.GEngine = E;
})(typeof window !== 'undefined' ? window : globalThis);
