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
- Piece: one part of a goal in Goal. Task: a custom piece you made yourself.
- Pool: the month's money in Budget. Never "wallet" or "fund".
- Companion: the soft character. Banner: the strip at the top.
- Button order in a sheet: Cancel on the left, the main action on the right.
- Tone: calm, short, kind, no blame. Say what happened, then what can be done.
- Companion unasked talk: within the daily limit, and never twice within 10 minutes.

## 11. Glass styles
- Frosted (default): the original frosted glass. Never changed.
- Liquid (opt-in, Settings, Glass style): clear glass learned from the macOS-style window screenshot. Parts: light rim on the top-left that fades, dark rim along the bottom, a faint inner glow, a soft tinted shadow, large smooth corners, flat translucent pills for the selected item.
- Liquid has no refraction (bending). It was tried and dropped: the browser feature is not reliable on phones.
- Liquid settings: Frost (default 7 px), Tint (22%, Paper pages get +16%), Rim light (70%), Diagonal highlight (off). Sheets always keep a strong tint and at least 14 px frost.
- Rule: every interface change is audited with Liquid on as well as Frosted, on all 10 themes (buttons and text contrast).
