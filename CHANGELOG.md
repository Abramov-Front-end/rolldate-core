# Changelog

All notable changes to `@rolldate/core` are documented here.

## [1.2.2] — 2026-08-17

### Changed

- **README** — added “What's new in 1.2” section; updated bundle size and www.rolldate.dev links
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
