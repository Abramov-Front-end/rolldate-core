/**
 * Type definitions for @rolldate/core
 * https://rolldate-demo.vercel.app/
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
  setDisabledDates(dates: RollDateDateLike[]): void
  disableDate(dateLike: RollDateDateLike): void
  enableDate(dateLike: RollDateDateLike): void
  isDateDisabled(dateLike: RollDateDateLike): boolean
  destroy(): void
}

export default RollDate

export as namespace RollDateNS
declare global {
  interface Window {
    RollDate: typeof RollDate
  }
}
