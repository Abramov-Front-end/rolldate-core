# Changelog

All notable changes to `@rolldate/core` are documented here.

## [1.4.0] — 2026-09-27

### Added

- **Presets plugin** — `@rolldate/core/presets` (`dist/js/rolldate-presets.{js,mjs,min.js}`, global `RollDatePresets`): `presets(ids, { locale, labels, startWeekFromMonday, now })` with 28 ranges, EN/UK labels, and `lastN` / `nextN(n, 'day' | 'week' | 'month')`
- **`rangePresets[].id` / `icon`** — rendered as `data-preset-id` / `data-icon`; the preset matching the current range gets `RollDate__presets__button--active` and `aria-pressed="true"`
- **`presetsLabel`** — accessible name for the presets group (`role="group"`)
- **Layout slots** — `data-rd-slot="content" | "presets" | "footer"` on the container children
- **`containerClass`** — extra classes on `.RollDate__container` for CSS-only layout themes
- **`footerButtons[].variant: 'link'`** — text button with a dashed underline
- **`footerButtons[].position`** — `'left'` | `'right'`; left buttons group at the start of the footer, the rest at the end
- **`footerButtons[].className` / `ariaLabel`** and built-in **`action: 'close'`**

### Changed

- The presets bar is always a direct child of the container (it was placed inside the calendar content when there was no footer)
- `open()` no longer forces `display: block`, so the container keeps its CSS layout (flex by default, or a theme grid) in popup mode

### Fixed

- **Highlight runtime** — `setHighlightDates` / `highlightDate` / `unhighlightDate` update visible dots in place, so the calendar does not rebuild or jump

## [1.3.1] — 2026-09-26

### Added

- **`--rd-on-accent`** — text and icon color on filled accent, range endpoints, and primary buttons (was hardcoded white)
- Theme colors are fully overridable via `--rd-*` color custom properties on `.RollDate__container`

## [1.3.0] — 2026-09-17

### Added

- **`enabledDates`** — allowlist of exact dates, inclusive ranges, weekly/monthly repeats, or callbacks. When the option is set, every other date is blocked. `[]` blocks all dates.
- **`setEnabledDates(rules)`** — replace the allowlist at runtime (`undefined` turns it off, `[]` blocks every date). Dates that become unavailable are dropped from the selection and `selectDate` runs. Non-array values are ignored and keep the current allowlist.
- **`scrollSpeed`** — wheel/touch speed multiplier (`1` is the current default; `0.7` / `1.5` slow down or speed up; `0` disables scroll, arrows and keyboard still work)

### Changed

- **`disabledDates`** — same rule types as `enabledDates`; it remains a denylist and always wins over the allowlist
- **ISO `YYYY-MM-DD`** — parsed as a local calendar day in rules and `parseDate` (not UTC midnight)
- **Month/year view** — calendar shell keeps the day-view height; month and year cells fill the row width at that height
- **Calendar wheel** — slightly slower, same original step animation

### Fixed

- **Availability runtime** — `setEnabledDates` / `setDisabledDates` / `disableDate` / `enableDate` update visible days in place, so the calendar does not jump back to the current month
- **Keyboard days** — no default/white focus outline; the focused day keeps the accent border
- **Header month buttons** — next/prev scroll to that month instead of pinning the previous active day (e.g. the 16th) on screen
- **Popup down-scroll** — day window no longer trims down to a single viewport (blank calendar)
- **Inline / popup page jump** — calendar body is not a native scrollport, so a half-visible picker does not yank the page or a neighboring instance
- **Haptic tick** — `navigator.vibrate` runs only on touch-primary devices, so desktop wheel scroll no longer trips Chrome’s vibrate intervention
- **Month/year grid** — virtualized rows stay aligned (January in column 1; years keep a stable 4-column start) and load in whole rows instead of shifting cells sideways

## [1.2.4] — 2026-09-15

### Added

- **Keyboard accessibility** — day cells are `<button>` elements with roving `tabindex`, arrow/`Home`/`End`/`Page` navigation, and `Escape` to close popups
- **Localized month controls** — previous/next month buttons expose `aria-label` (`previousMonthLabel` / `nextMonthLabel`)
- **Selected state for assistive tech** — selected days set `aria-pressed` and include a locale-aware suffix in `aria-label`

### Fixed

- **Focus after select** — with `closeOnSelect: true`, closing the popup restores focus to the input that opened it
- **Focus-visible days** — keyboard focus uses a high-contrast outline instead of a border-only hint
- **Disabled days** — native `disabled` keeps them out of keyboard focus and selection

## [1.2.3] — 2026-08-18

### Fixed

- **`selectToday()` / “Now” footer** — when `enableTime` is on, sets current time (not just today’s date)
- **Month/year grid** — cell height matches 4×4 layout on desktop and mobile (no clipped rows)
- **Footer visibility** — footer renders only when `footerButtons` are configured (not implicitly from `enableTime`)

### Changed

- **AM/PM toggle** — slightly larger tap target and label (`min-width: 40px`, `font-size: 12px`)
- **README** — site links use `https://rolldate.dev/` (apex, no `www`)

## [1.2.2] — 2026-08-17

### Changed

- **README** — added “What's new in 1.2” section; updated bundle size and rolldate.dev links
- **CHANGELOG** — expanded 1.2.0 notes (footer separator, removed `timeLabel`)

## [1.2.1] — 2026-08-17

### Changed

- Updated README demo GIF (playground preview with themes, time, and generated code)

## [1.2.0] — 2026-08-17

### Added

- **`main` theme** — new default visual theme (blue accent, side-by-side calendar + time on desktop)
- **`timePosition`** — `'right'` (default) or `'bottom'`; mobile always stacks time below the calendar (≤640px)
- **Time picker redesign** — scrollable hour/minute rolls with AM/PM segmented toggle; no separate time readout block
- **`footerButtons[].variant`** — `'primary'` | `'secondary'` for themed footer actions

### Changed

- Default **`theme`** is `'main'` (`'default'` alias maps to `'main'`)
- **Right panel time** — 5 visible roll values; AM/PM toggle below rolls
- **Bottom / mobile time** — 3 visible values; rolls and AM/PM in one row
- Calendar navigation stays within the calendar column when time is shown beside it
- Separator between calendar and time panel uses margin (calendar width unchanged)
- Footer border appears only when **`footerButtons`** are configured (no empty separator with time-only layout)
- Removed **`timeLabel`** option and separate time readout block

### Removed

- **`timeLabel`** — use scrollable rolls + AM/PM toggle instead

## [1.1.4] — 2026-08-16

### Added

- **Animated arrow navigation** — smooth slide when using prev/next header buttons (day / month / year views)

### Changed

- **README** — Product Hunt as a text link instead of an embed badge
- **Homepage & docs** — official site at [rolldate.dev](https://rolldate.dev/)

## [1.1.3] — 2026-08-14

### Added

- **postinstall message** — friendly links to demo, docs, and GitHub after `npm install`

### Changed

- **README** — star/demo/docs CTA at the top
- **Download ZIP** — refreshed bundle, TypeScript definitions, updated README.txt

## [1.1.2] — 2026-08-14

### Fixed

- **Mobile scroll inertia** — touch momentum restored after swipe release (calendar days/months/years)

## [1.1.1] — 2026-08-03

### Changed

- **Docs** — README and demo site now reflect v1.1.0 bundle size (~52 KB min / ~13 KB gzip JS)

## [1.1.0] — 2026-08-03

### Added

- **`highlightDates`** — dot markers on calendar days; optional per-date `color`; multiple dots per day via `{ date, colors: [...] }`
- Highlight API: `setHighlightDates`, `highlightDate`, `unhighlightDate`, `isDateHighlighted`, `getHighlightColors`, `getHighlightColor`
- **`rangePresets`** — quick range buttons for `selectType: 'range'`; `getRange(picker)` receives the instance (use `picker.getViewMonth()` for the scrolled month)
- **`goToDate(date)`** — navigate calendar without changing selection
- **`getValue()` / `setValue(value)`** — read/write selection programmatically
- **`getViewMonth()` / `getViewDate()`** — visible month while scrolling (for presets and integrations)

### Changed

- **Bundle size** — `rolldate.min.js` is ~52 KB minified / ~13 KB gzip (was ~47 KB / ~12 KB in 1.0.x), mainly from highlights, range presets, and runtime API
- **Range styling** — filled background (violet palette) instead of borders; distinct from Today (blue accent)
- Range presets apply selection via CSS classes only (no calendar jump / full DOM rebuild)
- Presets respect visible month and first selected date as anchor for “N days” ranges

### Fixed

- Range preset / `setValue` no longer scrolls calendar to the 1st of the month when half a month is visible

## [1.0.6] and earlier

See [GitHub releases](https://github.com/Abramov-Front-end/rolldate-core/releases).
