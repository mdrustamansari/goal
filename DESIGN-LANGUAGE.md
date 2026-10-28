# Rustam's apps: design language and philosophy
One living file for every app (Budget Manager, Goal Manager, and any future one).
Rule: when something new is decided, add it here in the same release. Never delete a rule; mark it "replaced by" instead.
Last updated: 18 Oct 2026 (Goal v5.25, Budget v2.23)

## 1. Philosophy
1. **Frosted glass is the heart of the design.** It is never switched off or weakened on any theme. We save energy by smarter means instead.
2. **Calm precision and airy clarity.** Thin large type, normal-weight small type, never bold. Slow, silky motion with no bounce.
3. **Think about logic and human psychology first, design second.** The app should feel helpful and non-judgemental.
4. **Learn from use, on the device only.** Habits, usual amounts, pace, and which sections he opens. Everything learned can be switched off.
5. **Show less by default.** The most useful things stay on top. Rarely used things fold under a quiet "More".
6. **Honest with little data.** Say how many days or records a number rests on. Do not draw conclusions from too few.
7. **Never change the user's records to fix a display.** Fix the calculation or the wording.
8. **Every enhancement is switchable in Settings.**

## 2. Look
- Flagship is the default theme (Sapphire accent; Champagne Gold as the second accent). Light and dark themes are fixed and never auto-converted. "Follow my phone" switches between Flagship Light and Dark.
- Shape: soft superellipse, generously rounded corners on cards, buttons and sheets.
- Type: sans only, with a choice of families.
- Dark themes are muted, flat and modern. Other light themes are light and muted with only a slight gradient.
- Old-paper tooltip colour is kept for the top banner.

## 3. Visibility checklist (run on every interface change)
1. Every button has a visible edge or fill on every theme, light and dark (hairline outline on light themes).
2. Text on a coloured button is checked (a later CSS rule must not turn it white-on-white).
3. Look at the screen on Flagship light, Flagship dark, Paper, a nature theme and Aurora.
4. Icons have a tooltip (`title`) and a spoken label (`aria-label`).
5. Destructive actions ask first, then still offer Undo.
6. Run the visibility audit on all 10 themes and every tab, plus the open entry sheet. It flags any button whose fill and edge both match its background, and any button text below 3:1 contrast. Result must be 0 flags. Run it with real backup data, not made-up data (Goal: log sheet, page picker and log history too). Last run 17 Oct 2026: 0 flags in both apps.
9. Small text buttons ("Log history", "Last finished: N · change", "New daily task") and info chips keep a hairline edge. Chip text is darkened on light themes so it passes 3:1 contrast.
7. Include buttons the Companion draws (its question box) and folded-section buttons.
8. Do not show a dropdown with only one choice. If one option remains, remove the list.

## 4. Components
- **Banner** (`banner.js`): one line at the top of Today. Info icon for "last finished"; bulb icon for a tip or proverb. Text slides up inside the banner, about 0.7 s. Tips are in normal upright type, never italic. Never switches while typing or with a sheet open. Reduced motion: it only fades.
- **Icon-only Edit and Delete:** Lucide `square-pen` (neutral) and `trash-2` (red), 34 px, same spacing everywhere.
- **Smart sections** (`sections.js`): a section tagged `data-sec` folds under "More" if untouched for 3 weeks, after 2 weeks of learning. Decided once when the app opens. Settings is never touched. Today, Plan, Life, Outlook, Month, Mindful and Insights use it.
- **Companion** (`companion.js`): always translucent, blobby, soft, supple and cute. Gentle bloom only (no photographic flare). Rests and wakes smoothly (its own clock slows and speeds up). Speaks rarely.
- **First-launch wizard** (`wizard.js`): short, five questions only (name, look, Companion, privacy and comfort, backup time). Appears only on a fresh install; existing data never sees it. "Run setup again" in Settings fills in current answers and changes no records. Skip is always possible.
- **Tour:** an optional six-card tour after the wizard, replayable from Settings.
- **Ask later:** everything else is asked one small question at a time on Today ("Quick question" card): at most one card, every answer wired to a real setting, "Later" snoozes 3 days. Never ask what the app can learn by itself. Current questions: PIN (day 2), day-close reminder (day 4) and 24-hour wait (day 5) in Budget, cost of delay (day 8) in Goal.
- **Sheets and confirmations:** `confirmSheet` with a red primary button for dangerous actions.

## 5. Energy and speed rules
1. Draw only when something changes. Static parts stay static.
2. The Companion draws about 12 pictures a second when awake, 0 when resting. A governor draws less if the phone is working hard or the battery is low.
3. Every picture that reaches the screen makes the phone re-blur the glass under it. So fewer pictures, not less glass.
4. Do not write the same value to the screen twice (`put()` dedupes).
5. Measure before and after.

## 6. Writing
- British English. Simple, concrete, ESL-friendly (B2 ceiling). Short sentences.
- Time in natural words: "today at 2:20 pm", "yesterday at 9:05 am", "on Monday at 6:40 pm".
- Not judgemental about money or work.

## 7. Behaviour
- The app always asks for "last page I finished" (real page numbers).
- Budget is a monthly pool only (no per-day allowance).
- Sounds are short (under 3 s). A separate switch silences the glass tap sound. Vibration pulses are gentle.
- Backups are encrypted. Data stays on the device.

## 8. Working agreement (with Claude)
- "Discuss" or "what do you think" means text only. Build only after "go".
- Summarise and ask before big builds. Ask clarifying questions one at a time.
- Ask before starting Release 2 (first-launch wizard and Companion tips and tricks).
- Save durable decisions to memory and to this file.

## 9. Tracker
The progress on the ten humane-design aspects lives in HUMANE-TRACKER.md. Read it before interface work and update it with each release.

## 10. Word list (same word, same meaning, in every app)
- Entry: one thing you recorded (a spend in Budget, a log in Goal). Never "transaction" or "record".
- Add: put something new in. Log: write progress in Goal only.
- Edit: change an entry. Delete: remove it (it waits 30 days in Recently deleted). Undo: take back the last action.
- Task: one thing you plan and log work on in Goal (reading, writing, editing, proofreading). Never "piece".
- Speed: how much you do in one hour ("5 pages an hour"). Daily pace is a different thing: the amount you plan each day.
- Pool: the month's money in Budget. Never "wallet" or "fund".
- Companion: the soft character. Banner: the strip at the top.
- Button order in a sheet: Cancel on the left, the main action on the right.
- Tone: calm, short, kind, no blame. Say what happened, then what can be done.
- Companion unasked talk: within the daily limit, and never twice within 10 minutes.

## 11. Glass styles
- Frosted (default): the original frosted glass. Never changed.
- Liquid (opt-in, Settings, Glass style): clear glass learned from the macOS-style window screenshot. Parts: light rim on the top-left that fades, dark rim along the bottom, a faint inner glow, a soft tinted shadow, large smooth corners, flat translucent pills for the selected item.
- Liquid has no refraction (bending). It was tried and dropped: the browser feature is not reliable on phones.
- Liquid settings: Frost (default 7 px), Tint (22%, Paper pages get +16%), Light rim brightness (100%) and blur (1 px) for the white edge just inside the hairline, Dark rim darkness (60%) and blur (3 px) for the dark edge just outside it, Shadow (60%), Top shine (60%, a soft white glow just inside the top edge), Diagonal highlight (off). An adaptive hairline (dark on light themes, light on dark themes, stronger when the glass is clearer) runs round every glass object. Buttons use a denser fill instead of blur, to keep the phone cool.
- Never set position on .nav-bar in Liquid: it is fixed, and must stay the same size in both styles. Sheets always keep a strong tint and at least 14 px frost.
- Rule: every interface change is audited with Liquid on as well as Frosted, on all 10 themes (buttons and text contrast).
- Messages after an action (toast with Undo, Companion bubble, question card) use the chosen glass style.
- Gestures: swipe a row left (delete, asks first) or right (edit); press and hold a row to edit; swipe anywhere else to change tab (not from the 24 px screen edges, not on sliders, inputs or sideways-scrolling strips).

## 12 Rise and fall marker
- One marker everywhere: a small triangle, ▲ for a rise and ▼ for a fall, always followed by the amount ("▲ ₹3", "▼ ₹180"). The app already uses it ("▼ ₹40 below your average"). Never mix in arrows (↑ ↓).
- Colour for spending: ▲ red, ▼ green. For saving or goals the colours are swapped. The triangle carries the meaning, so colour is never the only signal.
- Neutral or "no change": a flat dash "–".

## 13 Budget report (v2.34)
- Lives at the top of Insights: Week/Month switch, This/Last switch, total with a day ring, donut, paired bars, day strip (calendar for months), habits, one small note.
- Running periods use the same days of the last period; closed periods use full against full. A brand-new period with no entries shows the last one in full.
- Habits: category + note words + price per person + rhythm. "sure" = 3 or more clues, "likely" = 2, never fewer than 3 entries. A number plus N in a note ("2N") means persons; price is judged per person.
- Calendar cells show spend as a dot, never a coloured fill, so the day number keeps full contrast.
- All class names start with rp-; rise and fall always use the .rf triangle marker.

## 14 Speed (Goal v5.36)
- One hour of work is the common unit across tasks, so pages, words and subsections can be added up as hours. The conversion is the person's own speed, never a guess.
- Clues: timed sittings, usual (untimed) sittings, the person's own setting. Words on screen: **confident** and **still learning**.
- Confident: the app adopts the speed quietly, keeps a history line ("Adapted about N days ago: a to b") with Undo. Still learning: nothing changes; show what was noticed and ask (Keep or Use). Undo pins the old speed until "Let the app adapt it".
- Deadlines are never moved by the app. Only speed, estimates and suggested amounts adapt.
- Speed changes use a neutral triangle (colour is not good or bad), because faster is not always better.
- Tab swipe does not slide the screen (see section 15). Never animate a whole screen of frosted glass: opacity switches the glass off, and a transform makes every card re-blur on every frame.

## 15 Looking, not ticking
- Screens refresh only when you look at them: when the app comes back to the front, or at the next full hour while it is in view (greetings, "today" figures). There is no minute timer. While the app is hidden there are no timers at all (GFresh in fresh.js; the Companion's colour and avoid timers stop too).
- If a sheet or the lock screen is open when a refresh is due, it waits until you close it.
- No browser swipe-back or pull-to-refresh: html and body use overscroll-behavior: none, so our own swipes never fight with the browser's.
- Tab swipe changes the screen without sliding it: moving a whole screen of frosted glass re-blurs every card on every frame.

## 16. Goal work report (v5.37)
Same shape as the Budget report. Hero: "About N hours", one comparison line with the ▲/▼ triangle (more work green, less red), plan-kept ring. Donut of hours by task (tap to isolate), paired bars (solid = now, faint = before) with natural quantities beneath ("3.1 h · 18 pages · 112 of 246 overall"), a days-worked strip or month calendar (dashed = to come, soft = rest day), "How you work" habits with confident / still learning badges, finished tasks named (repeats grouped ×N), work left at current speed as a week range, one calm note. Speed markers use the same triangle but stay neutral. Hours from entered minutes, else amount ÷ speed (marked "estimated"); entries with neither are left out and said so. Code: report.js (pure, tests/report.test.js).

## 17. One button language (Goal v5.38)
Two states, one shape. Pale glass (default) and filled accent (primary, selected, "on"). Large buttons 44-46 px, full pill; small ones 34 px, full pill (radius 999px); icon buttons square. Top shine: white 65%, 2 px, no blur, inside the top edge. Bottom shadow: dark, 2 px down, 3 px blur, outside the hairline. Light themes dim the inside slightly so the shine shows. Danger keeps the same shape; only the words turn red. No backdrop blur on buttons (they sit inside frosted cards, where it would show nothing and cost power). Pressed: 1 px down, shadow tightens. Files: goals/buttons.css.
Look settings can be exported and restored as a file (themes, glass, rim, fonts, paper, sounds, Companion; never goals, entries or PIN).

## 18. Liquid body tone (Goal v5.40, trial; Budget and later apps wait for approval)
A flat tone over the body of each Liquid glass object: dark navy on light themes (slider "Body tone", default 15%), white at 60% of that on dark themes. The rim light and top shine stay as they were, so they read against the body. Files: flagship.css (end), liquid.js (lqBody).

## 19. Three kinds of button (Goal v5.41; replaces the single-style rule in 17)
Distraction and focus. All pills, one height (40 px), only the primary has bold text.
1. PRIMARY: filled accent, bold. The thing you most likely want here. Also the selected choice in a segmented control or chip row.
2. GLASS: tinted glass (accent 9%, black 0% by default, sliders in Settings), crisp white top shine (65%, no blur), soft dark bottom shadow (3 px blur). Actions that belong to the task in hand.
3. OUTLINE: hollow glass, hairline only, no fill, shine or shadow. Something you may start that is not part of the task (Add, Select a task, Choose another task), and the unselected choice in a segmented control.
4. LINK: underlined text, no button. Reveals more or goes somewhere else (13 more).
Rule of thumb: a link goes somewhere, an outline starts something, glass continues the task, primary completes it. Files: buttons.css, btnlook.js.

## 20. Glass tint (Goal v5.42; replaces the Liquid body tone in 18)
Glass buttons and Liquid cards share one tint: the theme's accent (darker on light themes, lighter on dark ones), 9% by default, plus optional black (0% by default, 10% at most). No flat black or white layer. Sliders: Settings, Glass tint (btnlook.js).

## 21. Settings (Goal v5.44)
- Top page shows state before it asks for choices: two tiles with one big number or picture and small words beside it (Backup: days since the last copy; Look: theme swatches), then three groups of rows. Each row: coloured icon tile, label, current value, chevron. Rows need no explanation.
- A page opens from a row and returns with "‹ Settings". Tapping the Settings tab again goes back to the top.
- Hero first: a ring or a big number says the state; the action follows (Back up now = primary, Save to Downloads = glass). Rare or risky things are links; "Erase everything…" stands alone, in red, at the end.
- Nothing is repeated on a page without a reason; switches live with the thing they change.
- Row, tile and link edges are exempt from the button audit: rows sit inside a bordered group, links are underlined text.

## 22. Work days (Goal v5.51)
- One work day is 3 hours. Show effort as a fraction (nearest sixth) in large thin type, with the decimal small and grey beside it.
- Card: coloured icon tile on the left, fraction, small unit text; on the right a ring of three battery-like sections, one per work hour of the part-day, with a ×N badge for full days. The first card on a screen carries the tiny "WORK HOUR" label (60 px ring); others use the 40 px ring.
- Colours in every app: blue = plan, progress or work left; green = gain (banked, saved); red = loss (behind, overspent). Arrows: up = gain, down = loss.

## 22. Light inside the glass button (Goal v5.52 / Budget v2.43)
Glass and primary buttons: top shine white 65% (no blur), inner glow at the bottom edge white 40% with 9 px blur (light refracted into the glass), dark shadow 3 px outside the hairline. Outline pills and links have none of these.

## 23. Where the button system lives (read this before touching any button)
The single source of truth is `shared/buttons.css` (shape, kinds, sizes, glow) and `shared/btnlook.js` (Glass tint sliders). `shared/sync.sh` copies them, with the other shared files, into every app (`bash shared/sync.sh`, with the app folders beside `shared/`). Never edit an app's copy: edit `shared/` and sync.
- Kinds: primary (filled, bold), glass (task-related, accent tint 9%, white top shine 65% no blur, white bottom glow 40% / 9 px, dark shadow 3 px outside), outline (hollow, hairline only, no underline; for things not part of the task), link (underlined text, no button).
- Shape: full pill (999 px). Height by role: 40 px standard (main actions, Week/Month style switches), 28 px compact (Done, chips, mini and icon buttons, pop-up buttons), 52 px number keys.
- Specificity trap: the shared shape rule ends with `:not(.link-btn)`, so any override of height must also end with `:not(.link-btn)` and use an element or class selector, never an ID.
- Every new button gets one of the kinds above through a class; check it with the glow scan (`gl2.js`) and the audit.

## 24. Hour slots (Goal v5.55)
A task counted in hours, or with sub-tasks counted in hours, shows a row of 24 px round slots on its Working-on card, one per sub-task (or per hour). The day's logged hours fill them in order: empty (translucent track), half (left-to-right blue fill), full (green with a white check, 3.4 px stroke). One line below says "2 of 4 done today · 2 h 30 min of 4 h". A newly completed slot plays the soft "glad" sound; the last one plays the goal-met sound. The slots and the Today plan card read the same hour record.

## 25. One action, one record (Goal v5.57)
A button that completes something also records the time it took, in the same tap, on the same record every screen reads. Done = finish day + sitting (start pre-filled from the last sitting, end = now). Anything it created is removed by its undo and by Reopen. Bulk "already done" ticks never invent hours.

## 26. A card must change what you do (Goal v5.58)
A card that only repeats numbers is removed or merged. Every card says what a figure means for the goal (from the engine, not a copy) and ends in one button that does the single most useful next thing. Text that sits on a round icon or chip takes its colours from the theme (text on glass, never a fixed white), so it reads in light and dark.

## 27. One look per theme (Goal v5.58 / Budget v2.45)
Glass, rim, tint, button tint, accent, letters, paper and palette belong to the theme they were set in. Choosing a theme loads that theme's saved look; a theme never customised starts from its own defaults. Nothing carries over from the last theme used.
