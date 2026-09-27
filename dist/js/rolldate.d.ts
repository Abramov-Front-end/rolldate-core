/**
 * Type definitions for @rolldate/core
 * https://rolldate.dev/
 */

export type RollDateTheme = 'main' | 'dark' | 'light' | 'default'
export type RollDateSelectType = 'single' | 'range' | 'multi'
export type RollDatePeriod = 'day' | 'month' | 'year'
export type RollDateDateLike = string | Date
/** `Date#getDay()`: 0 Sunday … 6 Saturday */
export type RollDateWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type RollDateRangeRule = {
  from: RollDateDateLike
  to: RollDateDateLike
}

export type RollDateWeeklyRule = {
  repeat: 'weekly'
  weekdays: RollDateWeekday[]
}

export type RollDateMonthlyRule = {
  repeat: 'monthly'
  weekday: RollDateWeekday
  occurrence: 1 | 2 | 3 | 4 | 5 | -1
}

export type RollDateRule =
  | RollDateDateLike
  | RollDateRangeRule
  | RollDateWeeklyRule
  | RollDateMonthlyRule
  | ((date: Date) => boolean)

export interface RollDateFooterButton {
  /** Button label */
  text: string
  /** Visual style; `'link'` is text with a dashed underline */
  variant?: 'primary' | 'secondary' | 'link'
  /** Footer side. Left buttons are grouped at the start, the rest at the end. Default `'right'` */
  position?: 'left' | 'right'
  /** Extra CSS classes for theming */
  className?: string
  /** Accessible name when the visible text is not enough */
  ariaLabel?: string
  /** Built-in action */
  action?: 'today' | 'clear' | 'close'
  /** Custom click handler; receives the picker instance */
  onClick?: (picker: RollDate) => void
}

export interface RollDateHighlightDate {
  date: RollDateDateLike
  /** One dot color */
  color?: string
  /** Multiple dot colors on the same day (e.g. several events) */
  colors?: (string | null | undefined)[]
}

export interface RollDateViewMonth {
  year: number
  /** 0–11 */
  month: number
}

export interface RollDateRangePreset {
  /** Button label */
  label: string
  /** Stable id, rendered as `data-preset-id` for theming. Defaults to the array index */
  id?: string
  /** Icon id, rendered as `data-icon`; themes map it to an image */
  icon?: string
  /** Returns `[start, end]`. Use `picker.getViewMonth()` / `picker.selectedDates` for context. */
  getRange: (picker: RollDate) => [RollDateDateLike, RollDateDateLike] | RollDateDateLike[]
}

export interface RollDateOptions {
  theme?: RollDateTheme
  selectType?: RollDateSelectType
  startDate?: RollDateDateLike
  minDate?: RollDateDateLike
  maxDate?: RollDateDateLike
  /** Input/output format tokens, e.g. 'DD.MM.YYYY'. Defaults from locale when omitted. */
  dateFormat?: string
  /** BCP 47 locale hint used when dateFormat is omitted */
  locale?: string
  /** Accessible name for the previous-month control. Defaults from locale (en/uk). */
  previousMonthLabel?: string
  /** Accessible name for the next-month control. Defaults from locale (en/uk). */
  nextMonthLabel?: string
  /** Suffix added to a selected day's accessible name. Defaults from locale (en/uk). */
  selectedLabel?: string
  startWeekFromMonday?: boolean
  /**
   * Denylist. Exact dates, inclusive ranges, weekly/monthly repeats, or callbacks.
   * Always wins over `enabledDates`.
   */
  disabledDates?: RollDateRule[]
  /**
   * Allowlist. When set, every other date is blocked (then `disabledDates` still wins).
   * Omit to allow all dates except `disabledDates` / min-max. `[]` blocks every date.
   */
  enabledDates?: RollDateRule[]
  /** Dates with dot marker(s). Supports multiple colors per day via `{ date, colors: [...] }`. */
  highlightDates?: (RollDateDateLike | RollDateHighlightDate)[]
  /** Quick range buttons (range mode). Use `picker.getViewMonth()` for the scrolled month. */
  rangePresets?: RollDateRangePreset[]
  /** Accessible name for the presets group */
  presetsLabel?: string
  /** Extra classes on `.RollDate__container`, e.g. a layout theme combined with a color theme */
  containerClass?: string
  closeOnSelect?: boolean
  /** CSS selector for an external open control (popup mode) */
  triggerSelector?: string
  monthsNames?: string[]
  monthsShortNames?: string[]
  /** Weekday labels, Sunday-first order (rotated when startWeekFromMonday is true) */
  weekDaysNames?: string[]
  enableTime?: boolean
  use12Hour?: boolean
  /** Time picker placement on desktop: right (default) or bottom. Always bottom below 640px. */
  timePosition?: 'right' | 'bottom'
  /** Minute step for the time picker (e.g. 5 → 00, 05, 10…) */
  timeStep?: number
  /** Tick feedback on month/year/decade/time changes */
  hapticFeedback?: boolean
  /**
   * Calendar (and time roll) wheel/touch speed. `1` is the built-in default.
   * Use `0.7` / `1.5` to slow down or speed up. `0` disables scroll; arrows and keyboard still work.
   */
  scrollSpeed?: number
  footerButtons?: RollDateFooterButton[]
  /** Called when selection changes. Single → Date | null; range/multi → Date[] */
  selectDate?: (value: Date | Date[] | null) => void
  onOpen?: () => void
  onClose?: () => void
  onViewChange?: (period: RollDatePeriod) => void
  onHoverDate?: (date: Date | null) => void
}

declare class RollDate {
  constructor(
    selector: string | [string, string],
    options?: RollDateOptions
  )

  /** Currently selected dates (read-only copy semantics in usage) */
  readonly selectedDates: Date[]
  /** Current calendar view level */
  readonly period: RollDatePeriod

  open(): void
  /** Close popup. Pass `{ restoreFocus: true }` to return focus to the element that opened it. */
  close(opts?: { restoreFocus?: boolean }): void
  selectToday(): void
  clearSelection(): void
  /** Navigate calendar to a date without changing selection */
  goToDate(dateLike: RollDateDateLike): boolean
  /** Month currently visible in the calendar (follows scroll). */
  getViewMonth(): RollDateViewMonth
  /** First day of the visible month. */
  getViewDate(): Date
  /** Current value: `Date | null` (single) or `Date[]` (range/multi) */
  getValue(): Date | Date[] | null
  /** Set value programmatically; pass `null` to clear */
  setValue(value: RollDateDateLike | RollDateDateLike[] | null): boolean
  setDisabledDates(dates: RollDateRule[]): void
  /**
   * Replace the allowlist. `undefined` turns it off; `[]` blocks every date.
   * Non-array values are ignored and keep the current allowlist.
   * Dates that become unavailable are removed from the selection and `selectDate` runs.
   */
  setEnabledDates(dates?: RollDateRule[]): void
  disableDate(dateLike: RollDateDateLike): void
  /** Removes one exact denylist entry. Does not override weekly, monthly, range, or callback `disabledDates` rules. */
  enableDate(dateLike: RollDateDateLike): void
  isDateDisabled(dateLike: RollDateDateLike): boolean
  setHighlightDates(dates: (RollDateDateLike | RollDateHighlightDate)[]): void
  highlightDate(dateLike: RollDateDateLike, color?: string): void
  unhighlightDate(dateLike: RollDateDateLike, color?: string): void
  isDateHighlighted(dateLike: RollDateDateLike): boolean
  /** All dot colors for a day (`null` entries = default accent dot) */
  getHighlightColors(dateLike: RollDateDateLike): (string | null)[]
  /** First custom dot color, or `null` */
  getHighlightColor(dateLike: RollDateDateLike): string | null
  destroy(): void
}

export default RollDate

export as namespace RollDateNS
declare global {
  interface Window {
    RollDate: typeof RollDate
  }
}
