/**
 * Type definitions for @rolldate/core
 * https://www.rolldate.dev/
 */

export type RollDateTheme = 'dark' | 'light' | 'default'
export type RollDateSelectType = 'single' | 'range' | 'multi'
export type RollDatePeriod = 'day' | 'month' | 'year'
export type RollDateDateLike = string | Date

export interface RollDateFooterButton {
  /** Button label */
  text: string
  /** Built-in action */
  action?: 'today' | 'clear'
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
  startWeekFromMonday?: boolean
  disabledDates?: RollDateDateLike[]
  /** Dates with dot marker(s). Supports multiple colors per day via `{ date, colors: [...] }`. */
  highlightDates?: (RollDateDateLike | RollDateHighlightDate)[]
  /** Quick range buttons (range mode). Use `picker.getViewMonth()` for the scrolled month. */
  rangePresets?: RollDateRangePreset[]
  closeOnSelect?: boolean
  /** CSS selector for an external open control (popup mode) */
  triggerSelector?: string
  monthsNames?: string[]
  monthsShortNames?: string[]
  /** Weekday labels, Sunday-first order (rotated when startWeekFromMonday is true) */
  weekDaysNames?: string[]
  enableTime?: boolean
  use12Hour?: boolean
  /** Minute step for the time picker (e.g. 5 → 00, 05, 10…) */
  timeStep?: number
  /** Tick feedback on month/year/decade/time changes */
  hapticFeedback?: boolean
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
  close(): void
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
  setDisabledDates(dates: RollDateDateLike[]): void
  disableDate(dateLike: RollDateDateLike): void
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
