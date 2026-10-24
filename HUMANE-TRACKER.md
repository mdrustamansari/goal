# Humane-design tracker
Reference for every app (Budget Manager, Goal Manager and any future app). Read it before any interface work. Update it in the same release as the work.
Companion file: DESIGN-LANGUAGE.md (the rules). This file is the progress: what we do, what is missing, what is next.
Created: 18 Oct 2026. Last updated: 18 Oct 2026 (Goal v5.34, Budget v2.32).

Status words: DONE, PARTLY, TODO, CHECK (needs a test on a real phone).
Work order agreed with Rustam: one aspect at a time. Start with 1, 2 and 8, then 3 to 7, then 9 and 10. Each one is built only after he says "go".

## The 10 aspects

### 1. Simple path, depth underneath: PARTLY
Beginners see one obvious way. Experts find shortcuts and settings below, never forced.
- DONE: More fold for categories and rare sections (Smart sections); learned quick amounts; Companion explains on tap; short wizard, optional tour.
- DONE 1a: Basic and Advanced in Settings (advanced folded).
- DONE 1b: swipe actions on ledger and history rows (swipe to edit or delete).
- DONE 1c: long-press shortcuts (edit a category, copy an entry).
- TODO 1d: one clear main action on each screen (check Goal Today first).
- TODO 1e: fewer cards on Goal Today by default.

### 2. Sensible defaults: MOSTLY
Works well before anything is changed.
- DONE: Flagship theme; learned pace and amounts; Companion governor (slows itself when the phone works hard); ask-later questions instead of long setup.
- DONE 2a (changed): Lite is never switched on by itself, because frosted glass is core. A weak phone is asked once, as a small question.
- DONE 2b: "Follow my phone" on by default for new installs.
- DONE 2c: reopens on the last screen (not Settings) within 6 hours. The last account already follows each category. Date stays today.
- TODO 2d: backup time learned from when he usually opens the app.
- TODO 2e: review every default once per release (list them in one place).

### 3. Consistency: PARTLY
The same gesture or word means the same thing everywhere.
- DONE: shared files for look, banner, sections, wizard, Companion; same icons for Edit and Delete; same words in both apps.
- DONE 3a: one set of gestures across both apps (see 1b, 1c).
- DONE 3b (word list in DESIGN-LANGUAGE.md section 10): one glossary of words (Log, Add, Entry, Piece, Task) and use it everywhere.
- DONE 3c (checked: Cancel left, main action right): same sheet layout and button order (Cancel left, main action right) in every sheet.

### 4. Forgives mistakes: STRONG
- DONE: undo toast after delete and edit; confirmation before delete; nothing is ever removed from the log (a void event).
- TODO 4a: undo for category and goal changes.
- DONE 4b: a "recently deleted" list that keeps entries for 30 days.
- DONE 4c (tap outside is blocked when typing is unsaved): warn before leaving a half-filled sheet.

### 5. Fast, calm feedback: GOOD (heat is the weak point)
- DONE: soft tap sound and vibration (separate switches); smooth rest and wake of the Companion; banner slide; governor and frame cap; real glass kept.
- CHECK 5a: heat on his real phone with the Companion on screen (v5.21+).
- PARTLY 5b: saves already confirm through the Companion or toast; a separate quiet note is not needed yet.
- DONE 5c: one motion standard (speeds and curves) in one place.
- DONE 5d: numbers keep the same width (tabular digits) so they do not jiggle.

### 6. Remembers and continues: PARTLY
- DONE: asks "last page I finished"; remembers the page, theme, prefs.
- DONE 6a (scroll and screen; open sections already kept): restore scroll position and open sections.
- TODO 6b: keep a half-typed entry if the app is closed.
- (2c covers the last account, date and tab.)

### 7. Restraint: IMPROVING
- DONE: Smart sections; tips moved into the banner; categories fold; one ask-later card at a time.
- DONE 7a: shorten Settings (see 1a).
- DONE 7b: fewer Companion options by default (advanced fold).
- TODO 7c: review each screen once per release: remove or fold anything not used in 3 weeks.

### 8. Small details: MANY DONE, SOME MISSING
- DONE: glass tap sound; gentle vibration; hairline edges on every theme (audited); tooltips and labels on icon buttons; slide and fade of the banner; Companion bloom.
- DONE 8a: larger tap areas (44 px) without changing the look; our icon buttons are 34 px and small buttons about 32 px.
- DONE 8b: tabular digits (same as 5d).
- DONE 8c: helpful empty states ("No entries yet. Tap + to add one").
- DONE 8d: visible focus ring on every control.
- DONE 8e: vibration on destructive confirmations.
- DONE 8f: check text truncation and long names on small screens.

### 9. Accessibility: WEAKEST
- DONE: labels on icon buttons; reduced motion respected in the banner, wizard and folds; hairline contrast audit.
- DONE 9a (text checked on all 10 themes, 4.5:1): full contrast audit for text, not only buttons (3:1 now; aim for 4.5:1 on body text).
- DONE 9b (text size follows the phone; zoom allowed): follow the phone's text size.
- DONE 9c (a11y.js: roles, labels, keyboard): screen-reader pass on custom controls (page picker, keypad, chips).
- DONE 9d: reduced motion for the Companion and all remaining animations.
- DONE 9e: 44 px tap areas (see 8a).

### 10. Respect for the person: GOOD
- DONE: non-judgemental wording; one small question at a time; "Later" snoozes 3 days; honest with little data; British English at B2.
- DONE 10a (wording checked this release): review every message for tone once per release.
- DONE 10b: Companion talk cadence: never twice within 10 minutes unless asked.
- TODO 10c: never ask a question the app can learn by itself.

## How to use this file
1. Before interface work: read it and DESIGN-LANGUAGE.md.
2. Work on one aspect at a time, only after Rustam says "go".
3. After the work: change the status, tick items, add a line to the log below, and bump the "Last updated" line.
4. Run the visibility audit and the tests before shipping (see DESIGN-LANGUAGE.md section 3).

## Log
- 18 Oct 2026: file created from the 10-aspect review (Goal v5.25, Budget v2.23). No aspect worked on yet.
- 18 Oct 2026: Bundle A done (Goal v5.26, Budget v2.24): 44px hit areas, tabular digits, motion tokens, focus rings, global reduced motion, empty states on ledger, history and purchases. Audit 0 flags.
- 18 Oct 2026: Bundle B done (Goal v5.27, Budget v2.25): resume.js (screen and scroll), Follow my phone on by default, Lite offered to weak phones. Left for later: 2d learned backup time, 2e defaults list, 6b drafts.
- 18 Oct 2026: Bundle C done (Goal v5.28, Budget v2.26): Advanced fold in Settings, swipe and long-press (swipe.js), buzz on destructive confirm. Left: 1d one main action per screen, 1e fewer Goal Today cards, 3c sheet button order check.
- 18 Oct 2026: Bundle D done (Goal v5.29, Budget v2.27): Recently deleted (30 days, restore), unsaved-typing guard on sheets. Left: 4a undo for category and goal changes.
- 18 Oct 2026: Bundle E done (Goal v5.30, Budget v2.28): zoom allowed, a11y.js, text contrast fixed, long names wrap. Needs a real TalkBack check by Rustam.
- 18 Oct 2026: Bundle F done (Goal v5.31, Budget v2.29): Companion 10-minute gap, word list, sheet order check.
## Still open (next round)
- 1d one main action per screen and 1e fewer Goal Today cards (needs a design talk first).
- 2d learned backup time, 2e defaults list, 6b keep half-typed entry.
- 4a undo for category and goal changes. 5a heat on Rustam's phone. 5b separate Saved note (probably not needed).
- 7c, 10c: review once per release.
- Real-phone checks by Rustam: heat, TalkBack, swipe feel.
- 18 Oct 2026: Liquid glass style added (Goal v5.32, Budget v2.30), opt-in beside Frosted. Audit with Liquid on: 0 flags on all 10 themes. Refraction dropped.
- 18 Oct 2026: Liquid fixes, ledger limited to 5 entries, glass Saved and Undo messages, swipe between tabs (Goal v5.34, Budget v2.32). Next: weekly and monthly report (Budget), after a design talk.
- 2026-10-19: Budget v2.34 - weekly and monthly report with habits (same-days comparison, triangle marker, 2N persons). Goal unchanged (v5.35); shared CSS gained the rise/fall colours.
- 2026-10-19: Goal v5.36 - the word Task replaces Piece; speed (pages an hour) learned from optional timed logs, confident = adapts quietly with history and Undo, still learning = asks; Budget v2.35 and Goal: tab swipe jitter fixed (transform-only slide); danger text buttons got a hairline.
- 2026-10-20: Goal v5.36 / Budget v2.35 - tab-swipe jitter fixed (browser back-swipe and pull-to-refresh switched off, no slide), separate Light and Dark rim sliders (brightness and blur), no timed refresh (GFresh), Companion timers stop when hidden (5a).

- 2026-10-20 (Goal v5.37): Work report in Outlook (hours of work, plan kept, where hours went, same-days comparison, days worked, how you work, finished tasks named, work left at your speed as a range). Rest and leave days never counted as missed. Estimated hours are marked. Deadlines never moved. Pace markers neutral; amount-of-work markers green/red.

- 2026-10-21 (Goal v5.38): Unified buttons (buttons.css, Goal only for now; Budget to follow once confirmed). Tab-swipe blink fixed (data-tsw stays until the next tap on a tab; swipe.js shared, copied to Goal only). Pre-paint theme script in index.html. Look-settings file (save/restore).

- 2026-10-21 (Goal v5.39 / Budget v2.36): buttons are full pills in both apps; buttons.css, swipe fix, pre-paint theme and look-settings file now in both.

- 2026-10-21 (Goal v5.40 / Budget v2.37): Liquid body tone (Goal only; do not run sync.sh until Budget adopts it). Budget: applyTheme skipped when nothing about the look changed (tab-switch blink hardening; blink not reproducible in the sandbox).

- 2026-10-21 (Goal v5.41): button hierarchy (primary / glass / outline / link), one height, bold only on primary, Button glass tint sliders. Budget waits for approval; Budget's "sure" chip already reads "confident" (v2.37 source, unreleased).

- 2026-10-22 (Goal v5.42 and v5.43): Liquid cards take the accent tint; Liquid Tint is bipolar (left black 1–10%, centre none, right white 1–10%); backup reminder clears after a share that closes with AbortError (tap "I saved it").
- 2026-10-22 (Goal v5.44): Settings restructured. Top page: two glance tiles (Backup in days, Look swatches) and three groups of icon rows with values. One page per group: Appearance, Sound and feel, Companion, Home screens, Reminders, Timeline, Privacy and security, Backup and data. Erase sits alone at the foot of Backup. All buttons, pop-ups and pace chips are 40 px. Budget waits for approval.

- 2026-10-22 (Budget v2.38): Goal v5.41–v5.44 design adopted in Budget (buttons, Glass tint, Liquid accent tint and bipolar Tint, backup fix, restructured Settings). Standing rule: fix one app first, then repeat in the others; Budget is now level with Goal.

- 2026-10-22 (Goal v5.45 / Budget v2.39): buttons narrower than 60 px are 28 px tall (btnlook.js sets class b-sm); all others stay 40 px.
- 2026-10-22 (Goal v5.46 / Budget v2.40): outline pills have no underline; info chips (pace, kept) are 30 px; small buttons 28 px.
- 2026-10-22 (Goal v5.47 / Budget v2.41): button size by role, not width. Standard 40 px: main actions and Week/Month style switches. Compact 28 px: Done, chips, mini buttons, icon buttons, banner and pop-up buttons.
- 2026-10-22 (Goal v5.48): the log sheet has "Set start time" (digital clock, 12 hour, am/pm); today's sitting length is then exact (now minus start) and the start hour feeds time-of-day habits. Today asks "How many hours will you work today?" once a day (1–8 h, Not today, or Ask me later), then shows planned, done and left, and how many days the tasks in progress need at that pace. Switch: Home screens > "Ask my hours each day". Budget does not have this (Goal only).
- 2026-10-22 (Goal v5.49 / Budget v2.42): edit and delete icon buttons show their icons again (28 px circles, delete in red); every Delete in a sheet is a round trash button on the right.
- 2026-10-23 (Goal v5.50): the 'Set start time' clock also shows for tasks counted in hours (it was only for pages, steps, sections).
- 2026-10-23 (Goal v5.51): the 3-hour work day. One work day = 3 h, shown as fractions to the nearest sixth with the decimal beside (e.g. 1⅓, 0.67). Today: plan card (icon, fraction, ring of three "WORK HOUR" sections) and a weekly work-day balance card (green = banked, red = behind; today counts only once met or after 9 pm). Wherever the app says "about N hours" it now adds the work days. Deadlines and the date-based buffer are unchanged: calendar dates never move. Budget uses the same colours (blue plan, green gain, red loss).
- 2026-10-23 (Goal v5.52 / Budget v2.43): glass and primary buttons get a white inner glow at the bottom edge (40% opacity, 9 px blur; --b-gl), below the 65% top shine. Outline pills unchanged.
- 2026-10-24 (Goal v5.53 / Budget v2.44): the glow and glass look now also on the unselected segmented choices (Week/Month, Frosted/Liquid), number keys incl. the PIN screen (52 px), Budget quick amounts and pop-up buttons. Button system saved in shared/buttons.css and shared/btnlook.js; sync.sh copies them.
