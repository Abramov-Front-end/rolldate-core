# Changelog

All notable changes to `@rolldate/core` are documented here.

## [1.1.0] — 2026-08-03

### Added

- **`highlightDates`** — dot markers on calendar days; optional per-date `color`; multiple dots per day via `{ date, colors: [...] }`
- Highlight API: `setHighlightDates`, `highlightDate`, `unhighlightDate`, `isDateHighlighted`, `getHighlightColors`, `getHighlightColor`
- **`rangePresets`** — quick range buttons for `selectType: 'range'`; `getRange(picker)` receives the instance (use `picker.getViewMonth()` for the scrolled month)
- **`goToDate(date)`** — navigate calendar without changing selection
- **`getValue()` / `setValue(value)`** — read/write selection programmatically
- **`getViewMonth()` / `getViewDate()`** — visible month while scrolling (for presets and integrations)

### Changed

- **Range styling** — filled background (violet palette) instead of borders; distinct from Today (blue accent)
- Range presets apply selection via CSS classes only (no calendar jump / full DOM rebuild)
- Presets respect visible month and first selected date as anchor for “N days” ranges

### Fixed

- Range preset / `setValue` no longer scrolls calendar to the 1st of the month when half a month is visible

## [1.0.6] and earlier

See [GitHub releases](https://github.com/Abramov-Front-end/rolldate-core/releases).
