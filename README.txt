Rustam's Goal Manager, version 5

Put ALL these files in your goal-manager GitHub repository (replace the old ones), then open the app twice so your phone picks up the update. Your data stays.
Files: index.html, style.css, flagship.css, engine.js, look.js, insight.js, app.js, sw.js, manifest.webmanifest, icon-192.png, icon-512.png, icon-maskable-512.png, and the new folder fonts/ (six small font files).

What is new in version 3
- Plan is organised by chapter: Reading (Skim, Scan), Drafting (parts, themes, pieces) and Editing and proofreading.
- Every piece has allotted days. The clock starts when the previous piece is done (or when you press Start). Late days push everything after. Early days come back as time.
- Tick pieces done on the day you finished. Tick whole chapters or groups at once for work you did before today.
- Look: Aurora, Paper and eleven nature themes. Paper has colour, texture, dot grid, graph boxes, ruled lines, margins and sliders.
- Fixed a bug: editing or deleting a goal could change the wrong item.

What is new in version 4
- Frosted glass now works on every card, block and panel (a page animation had been switching the blur off). Fixed in the Budget Manager too.
- Nothing is drawn above the top margin of the paper.
- Daily Tasks: give a reading piece a page count and a daily pace (for example By the Sea, 246 pages, 15 a day). Log pages each day; the app shows pages left, pages needed per day against your deadline, and finishes the piece automatically when you reach the total. Skim and Scan share one pass.
- Split a drafting piece into sub-sections (for example Orientation 1/3, 2/3, 3/3), each with its own allotted days and over or under count.
- Work order now has a Custom option: choose the next piece yourself from any piece not yet done. Use "Do this next" on any piece.

What is new in version 4.1
- Editing and proofreading always come last: every editing piece in every chapter is placed after all reading and drafting for the whole thesis, and stays locked until that is done. If you already did some editing, tap the locked piece and choose "I have already done this".

What is new in version 5
- Today now shows live progress for the piece you are working on: a ring, pages done out of the total, today's pages against what you need, and the last seven days as bars.
- Work chain: a streak of days with real work. One missed day is forgiven. Leave days never break it. A few quiet milestones are shown as stars.
- Companion orb in the header. It glows when you worked today, dims when you are behind or the chain is at risk, and rests on leave days. Tap it for a short message. You can switch it off in Settings.
- The app learns how many days you really take for reading, drafting and editing. After three finished pieces of one kind it suggests new allotted days for pieces you have not started. You press a button to accept; your first deadlines stay fixed, so delays still show. You can undo it.
- Plan shows the whole chain as coloured blocks, and each chapter's progress. Outlook shows what the app has learned and your work habits (your strongest and weakest weekday).
- Your data: every entry is saved on this phone only. Settings shows how many entries there are and lets you switch off learning.
- IMPORTANT: also copy the new file insight.js into your repository.

Version 5.1: the number pad now has a decimal point, so you can log 8.5 pages.

Version 5.2
- The Circle Companion replaces the small orb. It breathes, blinks and looks around with a rhythm of its own. Hands and props appear only when needed: arms up to celebrate, a pointing hand at a chart, a magnifying glass on Outlook. It speaks rarely.
- Settings > Your data > Companion: choose Header corner, Floating (bottom right) or Off.
- IMPORTANT: also copy the new file companion.js into your repository.

Version 5.3 (new Circle Companion)
- The Companion is redesigned from Rustam's own glass prototype and merged with the expressive one: clear glass body, light-catching rim, two slow orbit rings, a soft aura.
- Adaptive ink: the outline, face and hands turn dark on light themes and white on dark themes.
- Floating mode can be dragged anywhere. It settles against the nearest side and remembers its place.
- Its eyes follow your finger when you are near it. A tap makes it squash and bounce a little.
- New poses: waving, typing on a laptop, a coffee break.
- Replace companion.js and open the app twice.

v5.4 - The new Circle Companion (same as Budget Manager v2.7)
  A living spectre or a glass orb (choose in Settings > Circle Companion), 33 shapes, lifelike props, about 90 actions,
  idle life, pokes, proverbs and tips (about 19 lines a day), soft diffused shadow and an optional cosmic aura.
  It reacts when you finish a piece, reach a 7, 30 or 100 day chain, or change screen.
  Placement: header corner, floating and snapping, or free. Always on top.
  New files: companion-art.js, companion-lines.js. The old Companion setting under "Your data" is replaced by the Companion's own card.
  Cache v5-4.

v5.5 - Daily work now shows up in the Plan
  Pages (or sub-sections) logged on a daily task now count as work done on the Plan pieces under it.
  - Each open piece shows a small bar (work done) with a mark for where the clock says you should be.
    Tap a piece to see "Work done" (for example 94 of 246 pages) and "Against the clock" (days ahead or behind).
  - Chapter and thesis bars count work done, weighted by allotted days, not only whole finished pieces.
  - If one daily task covers several pieces (Skim then Scan), its progress is shared out in clock order.
  - The finish forecast follows your real pace once a piece has been under way for two days or more, so the buffer
    grows or shrinks a little each day. The fixed deadlines do not move.
  - A piece is still marked done only when you finish it, or when its daily task reaches 100%.
  New test file: tests/work.test.js. Cache v5-5.

v5.6 - Pick, then start
  The Today screen now recommends the next pieces. A piece starts only when you press "Start this".
  - Working on: the pieces you started (two at a time is the comfortable limit; a third asks first).
  - After Start, the app asks how you want to work: a daily pace (pages or steps), sub-sections, or just the clock.
  - Waiting is not counted as late. The clock for a piece runs from the day you start it, and finishing measures the real time taken.
    Fixed deadlines do not move, so unused days still show as lost buffer in the thesis forecast.
  - "New daily task" on Today: start from the Plan (recommended pieces first), or create a task outside the Plan.
    Tasks outside the Plan do not move the thesis clock.
  - Locked pieces cannot be started; the app says why.
  - Existing data: the app switches to this mode once, at first opening. Pieces you have already logged work on count as started.
  - A started piece with no work yet can be moved back with "Stop working on this".
  New test file: tests/pick.test.js. Cache v5-6.

v5.7 - A Today panel about today's work
  The top panel of Today now starts with today's work, not the buffer:
  - Today's goal: "12 of 15 pages" with a ring. With several daily tasks it shows how many daily goals are done, with a line for each.
    The goal is your planned daily pace, or the amount you need if that is higher.
  - Your pace: the last 7 days against what you need, and your progress on the daily task.
  - Last 7 days against the 7 before, and last 30 days against the 30 before, in "plan days" (one plan day = one day of the thesis plan;
    1 a day means exactly on plan). Only the days since you began are counted.
  - Where your speed leads: the finish date at your 30-day speed (7-day speed in the first two weeks), against the year-4 target
    (11 Feb 2027) and the JRF end (11 Feb 2028).
  - Up to three short insights: behind on a deadline, a small amount left today, chain at risk, ahead or behind the clock, faster or slower week.
  - The fifth-year buffer is now a slim strip at the bottom of the panel. Tap it to open Outlook.
  New test file: tests/rhythm.test.js. Cache v5-7.

v5.8 - The Today panel is now graphic: a ring with the number inside (segmented for several tasks), up to three icon chips (chain, pace, week against week), a 14-day bar strip with a dashed goal line, a road to your target and the JRF end with a projected-finish dot, and a buffer gauge. Tap any of them and the Companion says the detail (or shows a small card if Talking is Silent).
      "Other date" in the log sheets lets you add work for a day you forgot (not in the future, not before the JRF began). It is marked "added later".
      New sounds (all under 3 seconds, made on the phone) and vibration patterns, with their own settings. A round save button sits at the bottom left. Quiet secondary buttons when a piece is already active.
      Companion: new "Avoid text" setting (Off / Gentle / Eager). It slides slowly beside text and stays there. Cache v5-8.

v5.9 - Fixes. Sounds and vibration now react when your finger lifts (Android only allows them after a finished tap), and the audio is unlocked on the first tap. "Quiet at night" is now off by default (it had silenced every sound after 10 pm); settings were reset to the new defaults. Vibration patterns are longer and stronger, and Settings has a "Feel the vibration" button with a status line. The Companion no longer jumps during a slide when a setting changes or the screen resizes. Cache v5-9.

v5.10 - New theme "Sunflower": lemon-yellow to deep golden yellow, with dark text, in light and dark mode (Settings, Aurora colours, Palette). Marigold is unchanged. Vibration patterns are back to the original gentle feel; the strength option (Light, Medium, Strong) stays. Cache v5-10.

v5.11 - The Look card is tidier: the theme tiles are smaller, four to a row, so Settings is shorter. Cache v5-11.

v5.12 - Fix: after the app's quiet one-minute refresh, the app stayed in "still" mode (no animation) until you tapped a tab. That froze the Companion, so it jumped instead of gliding. The refresh now restores the normal animation state. Cache v5-12.

v5.13 - Page icons in "Log pages read or done today": seven book-page icons with real page numbers, starting after the last page you finished (finished 113, and the row shows 114 to 120). Tap the last page you reached and all pages up to it light up; the amount fills in itself. "Last finished: N · change" sets where you are (a note, never counted as work today). The Companion asks "What is the last page you finished?" only when the app is unsure (no entry for 3 or more days on a task under way), at most once a day for each task.
      New page-turn sound and vibration: each lit page plays the next note of a rising scale with a soft paper swish; Log gives a chime, a fuller chord when the daily goal is met, and a brighter sparkle for pages beyond the goal. The tap sound is now a soft, quiet glass "tink". The Companion now delivers the app's responses (confirmations, warnings, with the Undo button on a small card); with the Companion hidden, the normal toast returns. Cache v5-13.

v5.14 - Page icons are shorter and wider, like real pages. About five show at once; swipe sideways for up to 30 ahead. The row always starts after the last page you finished.
      Log history: a card on Today and a link in the log boxes. Entries by day, newest first, with day totals (for example "Mon 12 Oct · 14 pages · 2 entries"), time, task, amount, an "added later" tag, and position notes shown as notes (not work). Edit an amount, or delete a wrong entry; the Companion offers Undo and everything is recalculated. Filter by task. 14 days shown, "Show older" for more.
      Long panes fold with a small triangle (closed, open). Settings opens on the most useful parts; your choice is remembered.
      Accidental touches: sliders now move only when you deliberately drag the round handle (a tap on the bar does nothing, and a scroll that starts on a slider does not move it). Switches ignore a swipe.
      Companion: a physical stop after "Avoid text" slides or after a drag-and-snap: it leans into the move, runs a little past the spot, rebounds, takes a small second bounce and settles. With reduced motion or Lite mode it moves straight there.
      Companion: a soft lens-flare in the aura (a bloom at the highlight and faint ghosts), tinted to its colour. No sharp star spikes.
      Companion: new "Colour" setting, Classic or Shifting spectrum (two or three soft colours drifting; speed Slow, Calm or Lively). Off by default. In Lite mode or with reduced motion it keeps one colour a day.
      Cache v5-14.
      Credits: the lens-flare textures are resized and softened from three.js examples (MIT License, Copyright (c) three.js authors, https://github.com/mrdoob/three.js).

v5.15 - Companion effects. Parts of the spectre body now fade in and out softly, like light through glass (never the face). A soft band of light and a soft band of shadow travel round the outline of every character, and parts of the outline fade away. Every 10 to 20 seconds the brightest part of the outline "catches the light" with a short flare. Settings, Circle Companion: "Glass effects" (Rich, Light, Off), "Lens flare style" (Soft or Photographic, a real starburst from the owner's own image), "Catch the light" on or off. Lite mode and reduced motion switch it all off.
      New: "Movement style when it avoids text" (Springy, Glide, Float, Hop, Dart) and "Speed of that movement" (Slow, Normal, Fast). Cache v5-15.

v5.16 - Flagship theme, dark themes, no more jumping.
      New: "Version 5.16" is shown just under the app title.
      Fixed: the sheets (log pages, amounts, keypad) no longer jump. They are pinned to the top, so they only grow downwards; the page behind is frozen while a sheet is open; the keyboard no longer moves them.
      New: the Companion now avoids text inside sheets and keypads too. It never moves while your hands are on the keypad. If nowhere is clear it waits in the dim strip above the sheet.
      New: the Flagship theme, now the default. Calm precision and airy clarity: refined frosted glass, thin large numbers and titles with light small text (never bold), soft rounded shapes, one soft light from the top left, slow and silky motion with no bounce. Light and dark versions. Accent: Sapphire or Champagne Gold. Optional "Soft glow" (a faint glow on the lower edge of cards, buttons and bars). Letters: phone default (San Francisco or Roboto), Inter, Manrope or Arial.
      New: five dark themes: Royal Gold, Midnight Forest, Deep Ocean, Ember Dusk, Graphite. Look is sorted into Light themes and Dark themes.
      Changed: themes are now fixed. A light theme stays light and a dark theme stays dark, whatever your phone is set to. Optional "Follow my phone" switches between your last light theme and your last dark theme (first dark: Flagship Dark if your light theme is Flagship, otherwise Graphite).
      Changed: a Paper look you never customised moves to Flagship once. A customised Paper page stays as it is.
      IMPORTANT: also copy the new file flagship.css and the folder fonts/ into your repository.
      Credits: Inter and Manrope fonts, SIL Open Font License 1.1 (fontsource.org). Cache v5-16.

v5.17 - Visible buttons, calmer colours, a cooler phone.
      Fixed: in Flagship (light and dark) and every dark theme, secondary buttons, keypad keys and chips now have their own fill and a clear edge, so they can always be seen. Accent buttons keep their colour and get a fine edge.
      Changed: the five dark themes are now muted and flat (soft grey-tinted colours, only a whisper of light in the corner, flatter shadows). Flagship Dark and Light have a quieter haze.
      Changed: the other light themes are paler and more muted, with only a slight gradient. Aurora's colour haze is half as strong; the nature themes have a lighter sky and a soft veil over the scenery.
      Cooler phone (nothing removed): the main heat came from the frosted-glass blur being redone for every card under the moving Companion many times a second. On smooth backgrounds (Flagship, dark themes, Aurora, Paper, nature themes without a wallpaper photo) the blur could not be seen anyway, so cards use a slightly more frosted tint instead. The nav bar, sheets and speech bubbles keep the live blur, and so does any look with a wallpaper photo. The Companion now draws its resting animation about 20 times a second (it was 30), remembers where the words on the page are instead of scanning every word several times a second, and checks for text every 0.6 second. The soft colour haze no longer has an extra blur layer. In my test the idle load fell from about 85% to about 35% of one core (laptop test, so expect smaller numbers on a phone).
      Cache v5-17.

v5.18 - Today against yesterday, a torn-paper note, and a phone that follows Flagship.
      New: a small card under the Today panel shows pages done today / yesterday (for example 11/23) with two slim bars. Tap it to hear the numbers.
      New: a yellow torn-paper strip above the Today panel: "You finished reading page 143 last sitting". It uses your last entry and your "last page" notes. Tap it to open the log history.
      New: Settings > Sounds has a separate "Glass tap sound" switch. The other sounds stay on.
      Changed: "Follow my phone" now always uses Flagship Light and Flagship Dark.
      New: the habits card also tells you in which part of the day you work most, and your average entry.
      Every entry already stores its date and time, so speed and habits are worked out from all of them.
      Cache v5-18. Copy ALL files, including flagship.css, look.js, feel.js and the fonts/ folder.

v5.19 - Note and "yesterday" refinements.
      Changed: the torn note is now old white paper with a yellow tint, half as tall, and says "Last time you stopped at page 145".
      Changed: no separate today/yesterday card. Under the daily bars in the Today panel there is one slim line: pages today, a thin mark for yesterday, and a gold part when you pass yesterday. Tap it and the Companion explains.
      Cache v5-19.

v5.20 - Real frosted glass everywhere, a much cooler phone.
      Changed: every theme (Flagship, dark, Aurora, Paper, nature) has the real live frosted glass again, as in v5.15. Nothing is switched off.
      Cooler phone, nothing removed: the Companion no longer redraws when nothing changes. While the page scrolls or you type it holds its picture; when you pause it moves about 10 times a second; after about 9 seconds of stillness it rests and stirs for a moment now and then. Moods, props, pokes and moves are still drawn at once. Its busy moves are capped at 30 pictures a second (60 only while you drag it). Snow and rain move in smooth small steps. Test on a laptop: with the glass on, the Companion at rest cost 1% of a core, against about 70-85% before.
      Changed: the note under the header is now a soft old-paper note that matches the app, with the time in natural words: "You last stopped at page 145, yesterday at 8:40 pm."
      Changed: the yesterday mark under the daily bars is darker and clear on Flagship light.
      New: the Welcome screen shows the app version.
      Cache v5-20. Copy ALL files (companion.js, look.js, flagship.css, style.css, app.js, index.html, sw.js, feel.js).

v5.21 - A livelier Companion that rests and wakes gently, and a cooler phone.
      Changed: the Companion no longer jumps between still and moving. Its own clock slows to a stop and starts again softly, and it stirs for about 4 seconds every 12 to 25 seconds. It also checks how hard it is working for your phone (and your battery) and draws less often if needed.
      Removed: the photographic lens flare. Only the gentle bloom is left (the file is much smaller).
      Log history: Edit and Delete are now small icons with a tooltip. Delete asks first, then still offers Undo.
      The note at the top is now a simple, flat banner.

v5.22 - One banner with tips, smart sections, clearer edit buttons.
      New: the top banner now shows "last finished" (info icon) and, now and then, a tip or proverb (bulb icon). The text slides up inside the banner. The separate tip block is gone.
      New: Smart sections. After two weeks the app folds sections you have not opened for three weeks under "More". Switch it off in Settings.
      Fixed: the Save button text was invisible on light themes. Log history now has a Cancel button, and the note row uses the same bin icon.
      New file: DESIGN-LANGUAGE.md, the design rules shared by all your apps.

Update (17 Oct 2026, later): The Lens flare style list is gone (only the gentle bloom remains, so there is nothing to choose). Tips in the top banner now use normal upright type. Every button now has a visible edge on all themes, including the Companion's question box and the More button. Checked on all 10 themes and every tab.

v5.24 - Every button is visible on every theme.
      Fixed (checked with your real backup on all 10 themes): the small buttons "New daily task", "Choose another piece", "Last finished: N · change" and "Log history" now have a hairline edge. The info chips (streak, pace, percent) have an edge too, and their text is darker on light themes.

Release 2 (Goal v5.25 / Budget v2.23) - First-launch wizard, tour and small questions later.
      New: on a fresh install a short wizard asks five things: your name, the look, the Companion, privacy and comfort, and the backup time. If you already have data, you will not see it.
      New: an optional six-card tour after the wizard. In Settings, Experience: "Run setup again" and "Replay the tour". Running setup again changes none of your records.
      New: everything else is asked later, one small "Quick question" card at a time on Today (for example: a PIN, the evening reminder, the 24-hour wait, the cost of delay). Tap Later to be asked again in 3 days.
      The greeting uses the name you give.

Bundle A (Goal v5.26 / Budget v2.24) - Feel foundations: bigger touch areas, steady digits, one motion standard, focus rings, reduced motion on every theme, helpful empty states. Also HUMANE-TRACKER.md.

Bundle B (Goal v5.27 / Budget v2.25) - Smart defaults and memory: the app reopens on the screen and scroll position you left (within 6 hours; never on Settings), Follow my phone is on for new installs, and a slow phone is offered Lite mode as a small question (never switched on without asking).

Bundle C (Goal v5.28 / Budget v2.26) - Simple path: Settings now shows everyday items first, with sound, Companion, data and setup in a folded "Advanced" section. Swipe a ledger or history row left to delete (it still asks first) or right to edit; press and hold to edit. A confirmed delete gives a firm buzz.

Bundle D (Goal v5.29 / Budget v2.27) - Safety nets: a Recently deleted list (Settings, Advanced, Your data) keeps deleted entries for 30 days with a Restore button; tapping outside a sheet with unsaved typing no longer closes it.

Bundle E (Goal v5.30 / Budget v2.28) - Accessibility: pinch-to-zoom is allowed again, screen-reader and keyboard help for custom controls (a11y.js; Enter, Space and Escape work), clearer warning and good text on light themes (4.5:1), long names wrap instead of stretching the screen. The phone text-size setting already scales the app.

Bundle F (Goal v5.31 / Budget v2.29) - The Companion never speaks unasked twice within 10 minutes. A shared word list and the sheet button order rule are now in DESIGN-LANGUAGE.md.

Liquid glass (Goal v5.32 / Budget v2.30) - New Settings card "Glass style": Frosted (your glass, unchanged, the default) or Liquid (clear glass, light rim on the top-left, dark rim along the bottom, inner glow, soft tinted shadow). Liquid has sliders for Frost (starts at 7 px), Tint and Rim light, a Diagonal highlight switch (off) and a reset button. Sheets always keep a strong tint so forms stay clear. Lite mode removes the frost.
