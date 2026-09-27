(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.RollDatePresets = {}));
})(this, (function (exports) { 'use strict';

    const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
    const addMonths = (date, months) => new Date(date.getFullYear(), date.getMonth() + months, 1);
    const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const startOfQuarter = (date) => new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);

    const startOfWeek = (date, mondayFirst) => {
        const offset = mondayFirst ? (date.getDay() + 6) % 7 : date.getDay();
        return addDays(date, -offset)
    };

    const weekStartsOnMonday = (picker, options) => {
        if (typeof options.startWeekFromMonday === 'boolean') return options.startWeekFromMonday
        return picker?.options?.startWeekFromMonday !== false
    };

    const RANGES = {
        today: { icon: 'day', range: (t) => [t, t] },
        yesterday: { icon: 'day', range: (t) => [addDays(t, -1), addDays(t, -1)] },
        tomorrow: { icon: 'day', range: (t) => [addDays(t, 1), addDays(t, 1)] },

        thisWeek: { icon: 'week', range: (t, m) => [startOfWeek(t, m), addDays(startOfWeek(t, m), 6)] },
        lastWeek: { icon: 'week', range: (t, m) => [addDays(startOfWeek(t, m), -7), addDays(startOfWeek(t, m), -1)] },
        nextWeek: { icon: 'week', range: (t, m) => [addDays(startOfWeek(t, m), 7), addDays(startOfWeek(t, m), 13)] },
        weekToDate: { icon: 'week', range: (t, m) => [startOfWeek(t, m), t] },
        weekend: {
            icon: 'weekend',
            range: (t) => {
                const day = t.getDay();
                if (day === 0) return [addDays(t, -1), t]
                const saturday = addDays(t, 6 - day);
                return [saturday, addDays(saturday, 1)]
            }
        },

        last7: { icon: 'past', range: (t) => [addDays(t, -6), t] },
        last14: { icon: 'past', range: (t) => [addDays(t, -13), t] },
        last30: { icon: 'past', range: (t) => [addDays(t, -29), t] },
        last90: { icon: 'past', range: (t) => [addDays(t, -89), t] },
        next7: { icon: 'future', range: (t) => [t, addDays(t, 6)] },
        next14: { icon: 'future', range: (t) => [t, addDays(t, 13)] },
        next30: { icon: 'future', range: (t) => [t, addDays(t, 29)] },

        thisMonth: { icon: 'month', range: (t) => [addMonths(t, 0), endOfMonth(t)] },
        lastMonth: { icon: 'month', range: (t) => [addMonths(t, -1), endOfMonth(addMonths(t, -1))] },
        nextMonth: { icon: 'month', range: (t) => [addMonths(t, 1), endOfMonth(addMonths(t, 1))] },
        monthToDate: { icon: 'month', range: (t) => [addMonths(t, 0), t] },

        thisQuarter: { icon: 'quarter', range: (t) => [startOfQuarter(t), endOfMonth(addMonths(startOfQuarter(t), 2))] },
        lastQuarter: {
            icon: 'quarter',
            range: (t) => {
                const start = addMonths(startOfQuarter(t), -3);
                return [start, endOfMonth(addMonths(start, 2))]
            }
        },
        nextQuarter: {
            icon: 'quarter',
            range: (t) => {
                const start = addMonths(startOfQuarter(t), 3);
                return [start, endOfMonth(addMonths(start, 2))]
            }
        },
        quarterToDate: { icon: 'quarter', range: (t) => [startOfQuarter(t), t] },

        thisYear: { icon: 'year', range: (t) => [new Date(t.getFullYear(), 0, 1), new Date(t.getFullYear(), 11, 31)] },
        lastYear: { icon: 'year', range: (t) => [new Date(t.getFullYear() - 1, 0, 1), new Date(t.getFullYear() - 1, 11, 31)] },
        nextYear: { icon: 'year', range: (t) => [new Date(t.getFullYear() + 1, 0, 1), new Date(t.getFullYear() + 1, 11, 31)] },
        yearToDate: { icon: 'year', range: (t) => [new Date(t.getFullYear(), 0, 1), t] },
        last12Months: { icon: 'year', range: (t) => [new Date(t.getFullYear() - 1, t.getMonth(), t.getDate() + 1), t] }
    };

    const LABELS = {
        en: {
            today: 'Today',
            yesterday: 'Yesterday',
            tomorrow: 'Tomorrow',
            thisWeek: 'This week',
            lastWeek: 'Last week',
            nextWeek: 'Next week',
            weekToDate: 'Week to date',
            weekend: 'Weekend',
            last7: 'Last 7 days',
            last14: 'Last 14 days',
            last30: 'Last 30 days',
            last90: 'Last 90 days',
            next7: 'Next 7 days',
            next14: 'Next 14 days',
            next30: 'Next 30 days',
            thisMonth: 'This month',
            lastMonth: 'Last month',
            nextMonth: 'Next month',
            monthToDate: 'Month to date',
            thisQuarter: 'This quarter',
            lastQuarter: 'Last quarter',
            nextQuarter: 'Next quarter',
            quarterToDate: 'Quarter to date',
            thisYear: 'This year',
            lastYear: 'Last year',
            nextYear: 'Next year',
            yearToDate: 'Year to date',
            last12Months: 'Last 12 months'
        },
        uk: {
            today: 'Сьогодні',
            yesterday: 'Вчора',
            tomorrow: 'Завтра',
            thisWeek: 'Цей тиждень',
            lastWeek: 'Минулий тиждень',
            nextWeek: 'Наступний тиждень',
            weekToDate: 'З початку тижня',
            weekend: 'Вихідні',
            last7: 'Останні 7 днів',
            last14: 'Останні 14 днів',
            last30: 'Останні 30 днів',
            last90: 'Останні 90 днів',
            next7: 'Наступні 7 днів',
            next14: 'Наступні 14 днів',
            next30: 'Наступні 30 днів',
            thisMonth: 'Цей місяць',
            lastMonth: 'Минулий місяць',
            nextMonth: 'Наступний місяць',
            monthToDate: 'З початку місяця',
            thisQuarter: 'Цей квартал',
            lastQuarter: 'Минулий квартал',
            nextQuarter: 'Наступний квартал',
            quarterToDate: 'З початку кварталу',
            thisYear: 'Цей рік',
            lastYear: 'Минулий рік',
            nextYear: 'Наступний рік',
            yearToDate: 'З початку року',
            last12Months: 'Останні 12 місяців'
        }
    };

    const UNIT_WORDS = {
        en: {
            day: ['day', 'days'],
            week: ['week', 'weeks'],
            month: ['month', 'months']
        },
        uk: {
            day: ['день', 'дні', 'днів'],
            week: ['тиждень', 'тижні', 'тижнів'],
            month: ['місяць', 'місяці', 'місяців']
        }
    };

    const RELATIVE_WORDS = {
        en: { last: 'Last', next: 'Next' },
        uk: { last: 'Останні', next: 'Наступні' }
    };

    const pluralIndex = (lang, n) => {
        if (lang === 'uk') {
            const mod10 = n % 10;
            const mod100 = n % 100;
            if (mod10 === 1 && mod100 !== 11) return 0
            if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1
            return 2
        }
        return n === 1 ? 0 : 1
    };

    const resolveLang = (locale) => {
        const lang = String(locale || 'en').toLowerCase().split(/[-_]/)[0];
        return LABELS[lang] ? lang : 'en'
    };

    const todayFor = (options) => startOfDay(
        typeof options.now === 'function' ? options.now() : new Date()
    );

    const PRESET_IDS = Object.keys(RANGES);

    const DEFAULT_PRESETS = ['today', 'last7', 'last30', 'thisMonth', 'lastMonth', 'thisYear'];

    /**
     * Builds `rangePresets` for RollDate Core.
     * @param {string[]} [ids] preset ids in display order
     * @param {{ locale?: string, labels?: Record<string, string>, startWeekFromMonday?: boolean, now?: () => Date }} [options]
     */
    function presets(ids = DEFAULT_PRESETS, options = {}) {
        const lang = resolveLang(options.locale);
        const labels = { ...LABELS.en, ...LABELS[lang], ...(options.labels || {}) };

        return ids.reduce((list, id) => {
            const def = RANGES[id];
            if (!def) {
                console.warn(`RollDate presets: unknown preset "${id}"`);
                return list
            }
            list.push({
                id,
                icon: def.icon,
                label: labels[id],
                getRange: (picker) => def.range(todayFor(options), weekStartsOnMonday(picker, options))
            });
            return list
        }, [])
    }

    const relativePreset = (direction, n, unit, options = {}) => {
        const count = Math.max(1, Math.floor(Number(n)) || 1);
        const safeUnit = UNIT_WORDS.en[unit] ? unit : 'day';
        const lang = resolveLang(options.locale);
        const word = UNIT_WORDS[lang][safeUnit][pluralIndex(lang, count)];
        const label = options.label || `${RELATIVE_WORDS[lang][direction]} ${count} ${word}`;

        const shift = (today, amount) => {
            if (safeUnit === 'week') return addDays(today, amount * 7)
            if (safeUnit === 'month') return new Date(today.getFullYear(), today.getMonth() + amount, today.getDate())
            return addDays(today, amount)
        };

        return {
            id: options.id || `${direction}${count}${safeUnit[0].toUpperCase()}${safeUnit.slice(1)}s`,
            icon: options.icon || (direction === 'last' ? 'past' : 'future'),
            label,
            getRange: () => {
                const today = todayFor(options);
                return direction === 'last'
                    ? [addDays(shift(today, -count), 1), today]
                    : [today, addDays(shift(today, count), -1)]
            }
        }
    };

    /** Rolling window ending today, e.g. `lastN(3, 'month')` */
    const lastN = (n, unit = 'day', options) => relativePreset('last', n, unit, options);

    /** Rolling window starting today, e.g. `nextN(2, 'week')` */
    const nextN = (n, unit = 'day', options) => relativePreset('next', n, unit, options);

    exports.DEFAULT_PRESETS = DEFAULT_PRESETS;
    exports.PRESET_IDS = PRESET_IDS;
    exports.lastN = lastN;
    exports.nextN = nextN;
    exports.presets = presets;

}));
