import type { RollDateRangePreset } from './rolldate'

export type RollDatePresetId =
  | 'today' | 'yesterday' | 'tomorrow'
  | 'thisWeek' | 'lastWeek' | 'nextWeek' | 'weekToDate' | 'weekend'
  | 'last7' | 'last14' | 'last30' | 'last90'
  | 'next7' | 'next14' | 'next30'
  | 'thisMonth' | 'lastMonth' | 'nextMonth' | 'monthToDate'
  | 'thisQuarter' | 'lastQuarter' | 'nextQuarter' | 'quarterToDate'
  | 'thisYear' | 'lastYear' | 'nextYear' | 'yearToDate' | 'last12Months'

export interface RollDatePresetsOptions {
  /** Label language; `'en'` and `'uk'` are built in, others fall back to English */
  locale?: string
  /** Override labels by preset id */
  labels?: Partial<Record<RollDatePresetId, string>>
  /** Week start for week presets. Defaults to the picker's `startWeekFromMonday` */
  startWeekFromMonday?: boolean
  /** Reference "today" (useful for tests and time zones) */
  now?: () => Date
}

export interface RollDateRelativePresetOptions {
  locale?: string
  label?: string
  id?: string
  now?: () => Date
}

export interface RollDateBuiltPreset extends RollDateRangePreset {
  id: string
}

export const PRESET_IDS: RollDatePresetId[]
export const DEFAULT_PRESETS: RollDatePresetId[]

export function presets(ids?: RollDatePresetId[], options?: RollDatePresetsOptions): RollDateBuiltPreset[]
export function lastN(n: number, unit?: 'day' | 'week' | 'month', options?: RollDateRelativePresetOptions): RollDateBuiltPreset
export function nextN(n: number, unit?: 'day' | 'week' | 'month', options?: RollDateRelativePresetOptions): RollDateBuiltPreset
