/*!
 * RollDate
 * Human-readable build for review and customization.
 */

var RollDate = (function () {
    'use strict';

    const NAV_LABELS = {
        en: {
            previousMonth: 'Previous month',
            nextMonth: 'Next month',
            selected: 'selected'
        },
        uk: {
            previousMonth: 'Попередній місяць',
            nextMonth: 'Наступний місяць',
            selected: 'вибрано'
        }
    };

    function getTranslation(key, locale = 'en') {
        const lang = String(locale || 'en').toLowerCase().split('-')[0];
        const dict = NAV_LABELS[lang] || NAV_LABELS.en;
        return dict[key] || NAV_LABELS.en[key] || key
    }
    function getDecade(year) {
        return Math.floor(year / 10) * 10
    }

    function alignToGrid(value, columns = 4) {
        return Math.floor(Number(value) / columns) * columns
    }

    function normalizeScrollSpeed(value) {
        if (value === undefined || value === null || value === '') return 1
        const n = Number(value);
        if (!Number.isFinite(n)) return 1
        return Math.max(0, n)
    }

    let lastHapticAt = 0;
    let hapticAudioCtx = null;

    function playSoftClick() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return
            if (!hapticAudioCtx) hapticAudioCtx = new AudioCtx();
            if (hapticAudioCtx.state === 'suspended') {
                hapticAudioCtx.resume().catch(() => {});
            }
            const t = hapticAudioCtx.currentTime;
            const osc = hapticAudioCtx.createOscillator();
            const gain = hapticAudioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = 180;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.045, t + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
            osc.connect(gain);
            gain.connect(hapticAudioCtx.destination);
            osc.start(t);
            osc.stop(t + 0.045);
        } catch {
            // Ignore audio unlock / autoplay failures.
        }
    }

    function isCoarsePointer() {
        try {
            return typeof window.matchMedia === 'function'
                && window.matchMedia('(pointer: coarse)').matches
        } catch {
            return false
        }
    }

    /**
     * Light tick feedback for scroll snaps (month/year/time).
     * Touch-primary devices only: Vibration API, otherwise a soft click (helps on iOS).
     * Desktop pointer / trackpad skips this so Chrome does not log a vibrate intervention.
     */
    function hapticTick(enabled = true) {
        if (!enabled || typeof window === 'undefined' || !isCoarsePointer()) return
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - lastHapticAt < 28) return
        lastHapticAt = now;

        try {
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                navigator.vibrate(10);
                return
            }
        } catch {
            // Fall through to audio click.
        }

        playSoftClick();
    }

    function parseDate(str, format = 'auto') {
        if (!str) return null

        const clean = str.trim();
        if (!clean) return null

        if (str instanceof Date) return str

        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
            const [year, month, day] = clean.split('-').map(Number);
            return new Date(year, month - 1, day)
        }

        if (format === 'auto') {

            const separator = clean.match(/[-/.]/)?.[0] || '.';
            const parts = clean.split(separator).map(Number);

            if (parts.length !== 3) return null

            const [a, b, c] = parts;
            let year, month, day;

            if (a >= 1000) {
                [year, month, day] = [a, b, c];
            }
            else if (c >= 1000) {
                [day, month, year] = [a, b, c];
            }
            else {
                [day, month, year] = [a, b, c];
            }

            return new Date(year, month - 1, day)
        }

        const patterns = {
            'YYYY-MM-DD': /^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$/,
            'DD/MM/YYYY': /^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})$/,
            'MM/DD/YYYY': /^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})$/,
            'DD.MM.YYYY': /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
            'MM.DD.YYYY': /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
        };

        const pattern = patterns[format];
        if (!pattern) {
            console.warn(`RollDate: unknown format "${format}". Using auto-detect.`);
            return parseDate(str, 'auto')
        }

        const match = clean.match(pattern);
        if (!match) return null

        let year, month, day;
        switch (format) {
            case 'YYYY-MM-DD':
                [, year, month, day] = match;
                break
            case 'DD/MM/YYYY':
            case 'DD.MM.YYYY':
                [, day, month, year] = match;
                break
            case 'MM/DD/YYYY':
            case 'MM.DD.YYYY':
                [, month, day, year] = match;
                break
        }

        return new Date(Number(year), Number(month) - 1, Number(day))
    }

    function formatDate(date, format = 'YYYY-MM-DD') {
        if (!date || !(date instanceof Date) || isNaN(date)) return ''

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');

        const tokens = {
            'YYYY': y,
            'YY': String(y).slice(-2),
            'MM': m,
            'M': date.getMonth() + 1,
            'DD': d,
            'D': date.getDate()
        };

        return format.replace(/YYYY|YY|MM|M|DD|D/g, match => tokens[match] || match)
    }

    function getLocaleInputFormat(locale) {
        const resolvedLocale = locale ||
            (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US');
        try {
            const dtf = new Intl.DateTimeFormat(resolvedLocale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const parts = dtf.formatToParts(new Date(2023, 5, 15)); // 15.06.2023
            return parts.map(p => {
                if (p.type === 'year') return 'YYYY'
                if (p.type === 'month') return 'MM'
                if (p.type === 'day') return 'DD'
                return p.value
            }).join('')
        } catch {
            return 'MM/DD/YYYY'
        }
    }

    function checkDateFormat(date, format) {
        return typeof date === 'string' ? parseDate(date, format) : date
    }

    function adjustToWeekStart(date, startMonday) {
        const day = date.getDay();
        const diff = (day - Number(startMonday) + 7) % 7;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff)
    }

    function adjustToWeekEnd(date, startMonday){
        const day = date.getDay();
        const diff = (6 - day + Number(startMonday) + 7) % 7;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff)
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    }

    function addDays(date, amount) {
        const next = startOfDay(date);
        next.setDate(next.getDate() + amount);
        return next
    }

    function addMonths(date, amount) {
        const day = date.getDate();
        const next = new Date(date.getFullYear(), date.getMonth() + amount, 1);
        const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(day, last));
        return next
    }

    function addYears(date, amount) {
        return addMonths(date, amount * 12)
    }

    function escapeAttr(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
    }

    function formatDayLabel(date, locale) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        try {
            return new Intl.DateTimeFormat(locale || undefined, options).format(date)
        } catch {
            return new Intl.DateTimeFormat('en', options).format(date)
        }
    }

    function findAvailableDate(start, direction, isUnavailable, minDate, maxDate, maxSteps = 800) {
        const step = direction < 0 ? -1 : 1;
        let cursor = startOfDay(start);
        const min = minDate ? startOfDay(minDate) : null;
        const max = maxDate ? startOfDay(maxDate) : null;

        for (let i = 0; i < maxSteps; i++) {
            if (min && cursor < min) return null
            if (max && cursor > max) return null
            if (!isUnavailable(cursor)) return cursor
            cursor = addDays(cursor, step);
        }
        return null
    }

    function nearestAvailableDate(start, isUnavailable, minDate, maxDate) {
        const origin = startOfDay(start);
        if (!isUnavailable(origin)) return origin

        const forward = findAvailableDate(addDays(origin, 1), 1, isUnavailable, minDate, maxDate);
        const backward = findAvailableDate(addDays(origin, -1), -1, isUnavailable, minDate, maxDate);

        if (forward && backward) {
            const originTime = origin.getTime();
            return Math.abs(forward.getTime() - originTime) <= Math.abs(backward.getTime() - originTime)
                ? forward
                : backward
        }
        return forward || backward || origin
    }

    class Observe {
        constructor(container, root = null) {
            this.$container = container;
            this.$root = root;
            this.intersecting = new Map();
            this.init();
        }
        init() {
            return this.observe = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    const year = entry.target.dataset.year;
                    const month = entry.target.dataset?.month ? '_' + entry.target.dataset.month : '';
                    const day = entry.target.dataset?.day ? '_' + entry.target.dataset.day : '';

                    const key = `${year}${month}${day}`;
                    if (entry.isIntersecting) {
                        this.intersecting.set(key, entry);
                    } else {
                        this.intersecting.delete(key);
                    }
                });
            }, { root: this.$root || null, threshold: 0.5 })
        }
        on(type, callback) {
            this.$container.querySelectorAll(`.RollDate__calendar__${type}`).forEach(item => {
                if (callback) callback(item);
                this.observe.observe(item);
            });
        }
        un() {
            this.intersecting.clear();
            this.$container.querySelectorAll(`.RollDate__calendar__day, .RollDate__calendar__month, .RollDate__calendar__year`).forEach(period => {
                this.observe.unobserve(period);
            });

        }

        dominant() {
            if (this.intersecting.size === 0) return null

            const counts = {};
            let periods = [];
            this.intersecting.forEach(entry => {
                const keys = {};
                periods = JSON.parse(entry.target.dataset.bind);
                for (const key of periods) {
                    keys[key] = entry.target.dataset[key];
                }

                const key = Object.values(keys).join('-');
                counts[key] = (counts[key] || 0) + 1;
            });

            const dominantKey = Object.keys(counts).reduce((a, b) =>
                counts[a] > counts[b] ? a : b
            );

            const values = dominantKey.split('-').map(Number);

            return Object.fromEntries(periods.map((k, i) => [k, values[i]]))
        }

        disconnect() {
            this.observe?.disconnect();
        }
    }

    class Data {
        up_date = null
        down_date = null
        current_year
        current_month
        current_decade

        constructor(options) {
            this.options = options;
            this.current_year = this.options.startDate.getFullYear();
            this.current_month = this.options.startDate.getMonth();
            this.current_decade = getDecade(this.current_year);
        }

        get currentPeriod() {
            return {
                year: this.current_year,
                month: this.current_month, 
                decade: this.current_decade
            }
        }

        setPeriod(period) {
            if ('year' in period) this.current_year = period.year;
            if ('month' in period) this.current_month = period.month;
            if ('decade' in period) this.current_decade = period.decade;
        }

        getDates() {
            let startDate = new Date(this.current_year, this.current_month - 3, 1);
            let endDate = new Date(this.current_year, this.current_month + 3, 0);

            if (this.options.minDate) {
                if (this.options.minDate > startDate) {
                    startDate = new Date(
                        this.options.minDate.getFullYear(),
                        this.options.minDate.getMonth(),
                        1
                    );
                }
            }

            if (this.options.maxDate) {
                if (this.options.maxDate < endDate) {
                    endDate = new Date(
                        this.options.maxDate.getFullYear(),
                        this.options.maxDate.getMonth() + 1,
                        0
                    );
                }
            }

            if (
                this.options.minDate &&
                this.options.maxDate &&
                this.options.minDate.getFullYear() === this.options.maxDate.getFullYear() &&
                this.options.minDate.getMonth() === this.options.maxDate.getMonth()
            ) {
                const y = this.options.minDate.getFullYear();
                const m = this.options.minDate.getMonth();
                startDate = new Date(y, m, 1);
                endDate = new Date(y, m + 1, 1);
            }

            startDate = adjustToWeekStart(startDate, this.options.startWeekFromMonday);
            endDate = adjustToWeekEnd(endDate, this.options.startWeekFromMonday);

            const daysBetween = Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1;
            if (daysBetween < 42) {

                const missing = 42 - daysBetween;
                const addStart = Math.ceil(missing / 2);
                const addEnd = Math.floor(missing / 2);

                startDate.setDate(startDate.getDate() - addStart);
                endDate.setDate(endDate.getDate() + addEnd);

                startDate = adjustToWeekStart(startDate, this.options.startWeekFromMonday);
                endDate = adjustToWeekEnd(endDate, this.options.startWeekFromMonday);
            }

            this.up_date = new Date(startDate);
            this.down_date = new Date(endDate);

            const dates = [];
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const date = new Date(d);
                dates.push({
                    date,
                    disabled: this.options.isDateDisabled ? this.options.isDateDisabled(date) : false
                });
            }

            return dates
        }

        getMonthsOrYears(period) {
            const yearCols = 4;
            let upYear = this.current_year - (period === 'month' ? 5 : 24);
            let downYear = this.current_year + (period === 'month' ? 5 : 24);

            if (this.options.minDate) {
                const minYear = this.options.minDate.getFullYear();
                if (minYear > upYear) upYear = minYear;
            }
            if (this.options.maxDate) {
                const maxYear = this.options.maxDate.getFullYear();
                if (maxYear < downYear) downYear = maxYear;
            }

            if (period === 'month') {
                if (
                    this.options.minDate &&
                    this.options.maxDate &&
                    this.options.minDate.getFullYear() === this.options.maxDate.getFullYear()
                ) {
                    const y = this.options.minDate.getFullYear();
                    upYear = y - 2;
                    downYear = y + 2;
                }
            } else {
                upYear = alignToGrid(upYear, yearCols);
                const span = downYear - upYear + 1;
                const rem = span % yearCols;
                if (rem) downYear += yearCols - rem;
            }

            // Inclusive Jan..Dec (or full year rows) so the 4-column grid never starts mid-row.
            this.up_date = new Date(upYear, 0, 1);
            this.down_date = new Date(downYear, 11, 1);

            const items = [];

            for (let y = upYear; y <= downYear; y++) {
                if (period === 'month') {
                    for (let m = 0; m < 12; m++) {
                        const date = new Date(y, m, 1);
                        const monthEnd = new Date(y, m + 1, 0);
                        let disabled = false;
                        if (this.options.minDate && monthEnd < this.options.minDate) disabled = true;
                        else if (this.options.maxDate && date > this.options.maxDate) disabled = true;
                        items.push({ date, disabled });
                    }
                } else {
                    const date = new Date(y, 0, 1);
                    let disabled = false;
                    if (this.options.minDate && y < this.options.minDate.getFullYear()) disabled = true;
                    else if (this.options.maxDate && y > this.options.maxDate.getFullYear()) disabled = true;
                    items.push({ date, disabled });
                }
            }

            while (period === 'month' ? items.length < 24 : items.length < 16) {
                const extraYear = (items[items.length - 1]?.date.getFullYear() ?? downYear) + 1;
                if (period === 'month') {
                    for (let m = 0; m < 12; m++) {
                        items.push({ date: new Date(extraYear, m, 1), disabled: true });
                    }
                } else {
                    items.push({ date: new Date(extraYear, 0, 1), disabled: true });
                }
            }

            if (period === 'year' && items.length) {
                this.down_date = items[items.length - 1].date;
            } else if (period === 'month' && items.length) {
                this.down_date = items[items.length - 1].date;
            }

            return items
        }
    }

    class Render {
        constructor(options) {
            this.$container = options.container;
            this.$trigger = options.trigger;
            this.startWeekFromMonday = options.startWeekFromMonday;
            this.monthsNames = options.monthsNames;
            this.monthsShortNames = options.monthsShortNames;
            this.weekDays = Array.isArray(options.weekDays) && options.weekDays.length === 7
                ? options.weekDays
                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            this.enableTime = Boolean(options.enableTime);
            this.hasFooter = Boolean(options.footerButtons && options.footerButtons.length);
            this.locale = options.locale;
            this.previousMonthLabel = options.previousMonthLabel || 'Previous month';
            this.nextMonthLabel = options.nextMonthLabel || 'Next month';
            this.selectedLabel = options.selectedLabel || 'selected';

            this.init();
        }

        init() {
            const timePanelHtml = this.enableTime
                ? '<div class="RollDate__time-separator" aria-hidden="true"></div><div class="RollDate__time-panel"><div class="RollDate__time"></div></div>'
                : '';

            const footerHtml = this.hasFooter ? `
            <div class="RollDate__footer" data-rd-slot="footer">
                <div class="RollDate__footer__buttons"></div>
            </div>
        ` : '';

            this.$container.innerHTML = `
            <div class="RollDate__content" data-rd-slot="content">
              <div class="RollDate__calendar">
                <div class="RollDate__header">
                    <div class="RollDate__calendar__switcher">
                        <div class="RollDate__header__year"></div>
                        <div class="RollDate__header__month"></div>
                    </div>
                    <div class="RollDate__calendar__buttons">
                        <button type="button" class="RollDate__calendar__button" data-direction="prev" aria-label="${escapeAttr(this.previousMonthLabel)}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61 55" width="55" height="50" aria-hidden="true" focusable="false">
                                <path id="Форма 2" fill-rule="evenodd" class="s0" d="m52.76 54.67l-44.73 0.12c-6.16 0.02-10.02-6.64-6.96-11.98l22.26-38.79c3.07-5.35 10.76-5.37 13.86-0.04l22.47 38.67c3.09 5.33-0.74 12.01-6.9 12.02z"/>
                            </svg>
                        </button>
                        <button type="button" class="RollDate__calendar__button" data-direction="next" aria-label="${escapeAttr(this.nextMonthLabel)}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61 55" width="55" height="50" aria-hidden="true" focusable="false">
                                <path id="Форма 2" fill-rule="evenodd" class="s0" d="m52.76 54.67l-44.73 0.12c-6.16 0.02-10.02-6.64-6.96-11.98l22.26-38.79c3.07-5.35 10.76-5.37 13.86-0.04l22.47 38.67c3.09 5.33-0.74 12.01-6.9 12.02z" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="RollDate__calendar__header">
                  ${this.#dayHeaders()}
                </div>
                <div class="RollDate__calendar__body">
                  <div class="RollDate__calendar__scrollblock">
                      <div class="RollDate__calendar__days"></div>
                      <div class="RollDate__calendar__months"></div>
                      <div class="RollDate__calendar__years"></div>
                  </div>
                </div>
              </div>
              ${timePanelHtml}
            </div>
            ${footerHtml}
        `;

            if ( this.$trigger.nodeName === 'DIV' || this.$trigger.nodeName === 'SPAN' || this.$trigger.nodeName === 'SECTION' ) {
                this.$trigger.append(this.$container);
            } else {
                document.body.append(this.$container);
            }
        }

        #dayHeaders() {
            const weekDays = this.weekDays;
            let header = '';
            const startIndex = Number(this.startWeekFromMonday);
            for (let i = startIndex; i < 7 + startIndex; i++) {
                header += `<div class="RollDate__calendar__header__weekday">${weekDays[i % 7]}</div>`;
            }
            return header
        }

        highlightDotsHtml(colors = []) {
            return this.#highlightDots(colors)
        }

        #highlightDots(colors = [], maxVisible = 5) {
            if (!colors.length) return ''

            const visible = colors.slice(0, maxVisible);
            const extra = colors.length - maxVisible;
            const many = visible.length > 3;
            const dotClass = many
                ? 'RollDate__calendar__day-dot RollDate__calendar__day-dot--compact'
                : 'RollDate__calendar__day-dot';

            const dots = visible.map(color => {
                if (color) {
                    return `<span class="${dotClass} RollDate__calendar__day-dot--custom" style="--rd-highlight-dot:${color}"></span>`
                }
                return `<span class="${dotClass}"></span>`
            }).join('');

            const more = extra > 0
                ? `<span class="RollDate__calendar__day-dot RollDate__calendar__day-dot--more">+${extra}</span>`
                : '';

            return `<span class="RollDate__calendar__day-dots" aria-hidden="true">${dots}${more}</span>`
        }

        dates(array, selectedDates = [], selectType = 'single', getHighlight = () => null) {
            let datesHtml = '';
            const today = new Date();

            for (let i = 0; i < array.length; i++) {
                const date = array[i].date;
                const disabledClass = array[i].disabled ? 'RollDate__calendar__day--disabled' : '';
                const highlight = getHighlight(date);
                const highlightDots = highlight ? this.#highlightDots(highlight.colors) : '';
                const isToday = date.toDateString() === today.toDateString();

                // Resolve selection class for current date cell.
                let selectionClass = '';
                if (selectType === 'single' || selectType === 'multi') {
                    const dayStamp = date.getTime();
                    const isSelected = selectedDates.some(
                        d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() === dayStamp
                    );
                    if (isSelected) selectionClass = 'RollDate__calendar__day--selected';
                } else if (selectType === 'range' && selectedDates.length === 2) {
                    const [start, end] = selectedDates;
                    const time = date.getTime();
                    const startStamp = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
                    const endStamp = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
                    if (time === startStamp) {
                        selectionClass = 'RollDate__calendar__day--range-first';
                    } else if (time === endStamp) {
                        selectionClass = 'RollDate__calendar__day--range-last';
                    } else if (time > startStamp && time < endStamp) {
                        selectionClass = 'RollDate__calendar__day--range-selected';
                    }
                }

                const isSelected = Boolean(selectionClass) || (
                    (selectType === 'range' && selectedDates.length === 1 &&
                        new Date(selectedDates[0].getFullYear(), selectedDates[0].getMonth(), selectedDates[0].getDate()).getTime() === date.getTime())
                );
                let label = formatDayLabel(date, this.locale);
                if (isSelected) label += `, ${this.selectedLabel}`;
                const disabledAttr = array[i].disabled ? ' disabled' : ' tabindex="-1"';
                const pressedAttr = array[i].disabled ? '' : ` aria-pressed="${isSelected ? 'true' : 'false'}"`;
                const todayAttr = isToday ? ' aria-current="date"' : '';

                datesHtml += `<button type="button" class="RollDate__calendar__day ${disabledClass} ${isToday ? 'RollDate__calendar__day--today' : ''} ${selectionClass}"
                            data-bind='["year", "month"]'
                            data-year="${date.getFullYear()}"
                            data-month="${date.getMonth()}"  
                            data-day="${date.getDate()}"
                            aria-label="${escapeAttr(label)}"${disabledAttr}${pressedAttr}${todayAttr}>${date.getDate()}${highlightDots}</button>`;
            }

            return datesHtml
        }
        months(array) {
            let monthsHtml = '';
            for (let i = 0; i < array.length; i++) {
                const date = new Date(array[i].date);
                const isDisabled = array[i].disabled;
                const month = date.getMonth();

                let currentClass = '';
                if (date.getFullYear() === new Date().getFullYear() && month === new Date().getMonth()) {
                    currentClass = 'RollDate__calendar__month--current';
                }

                monthsHtml += `<div class="RollDate__calendar__month${isDisabled ? ' RollDate__calendar__month--disabled' : ''} ${currentClass}" 
                                data-bind='["year"]'
                                data-month="${month}" 
                                data-year="${date.getFullYear()}"
                                data-click="day">
                                ${this.monthsShortNames[month]} 
                            </div>`;
            }

            return monthsHtml
        }

        years(array) {
            let yearsHtml = '';

            for (let i = 0; i < array.length; i++) {
                const date = new Date(array[i].date);
                const isDisabled = array[i].disabled;
                const year = date.getFullYear();

                let currentClass = '';
                if (year === new Date().getFullYear()) {
                    currentClass = 'RollDate__calendar__year--current';
                }

                yearsHtml += `<div class="RollDate__calendar__year${isDisabled ? ' RollDate__calendar__year--disabled' : ''} ${currentClass}" 
                                data-bind='["decade"]'
                                data-decade="${Math.floor(year / 10) * 10}"
                                data-month="0" 
                                data-year="${year}"
                                data-click="month">
                                ${year} 
                            </div>`;
            }

            return yearsHtml
        }

        clear(block) {
            block.innerHTML = '';
        }
    }

    class Scroll {
        #minScroll = null
        #EDGE_TOP = 25
        #EDGE_BOTTOM = 75
        #offset
        #baseOffset = 0
        #blocked
        #boundWheelHandler
        #boundTouchStartHandler
        #boundTouchMoveHandler
        #boundTouchEndHandler
        #isWheelAnimating = false
        #edgeTriggeredInCurrentWheel = false
        #lastEdgeTriggerAt = 0
        #isTouchDragging = false
        #touchLastY = 0
        #touchLastTime = 0
        #touchVelocity = 0
        #momentumId = 0
        #animId = 0
        #wheelToken = 0
        scrollSpeed = 1
        
        constructor(body, methods = {
            dominant: () => console.error('Function "dominant" is not found'),
            updatePeriod: () => console.error('Function "updatePeriod" is not found')
        }) {

            this.$body = body;
            this.$wheelRoot = this.$body.closest('.RollDate__container') || this.$body;
            this.$scroll_block = this.$body.querySelector('.RollDate__calendar__scrollblock');
            this.dominant = methods.dominant;
            this.updatePeriod = methods.updatePeriod;
            this.scrollSpeed = Number.isFinite(methods.scrollSpeed) ? Math.max(0, methods.scrollSpeed) : 1;
            this.offset = 0;
            this.init();
        }

        init() {
            this.#boundWheelHandler = this.wheelHandler.bind(this);
            this.$wheelRoot.addEventListener('wheel', this.#boundWheelHandler, { passive: false, capture: true });
            this.#boundTouchStartHandler = this.touchStartHandler.bind(this);
            this.#boundTouchMoveHandler = this.touchMoveHandler.bind(this);
            this.#boundTouchEndHandler = this.touchEndHandler.bind(this);
            this.$body.addEventListener('touchstart', this.#boundTouchStartHandler, { passive: true });
            this.$body.addEventListener('touchmove', this.#boundTouchMoveHandler, { passive: false });
            this.$body.addEventListener('touchend', this.#boundTouchEndHandler, { passive: true });
            this.$body.addEventListener('touchcancel', this.#boundTouchEndHandler, { passive: true });
        }

        wheelHandler(e) {
            if (e.target.closest?.('.RollDate__time')) return
            e.preventDefault();
            e.stopPropagation();
            this.#pinNativeScroll();
            this.#releaseClippedFocus();
            this.#cancelMomentum();
            if (this.scrollSpeed === 0) return
            const token = this.#wheelToken;

            const rawDelta = e.deltaY * 0.7 * this.scrollSpeed;
            const steps = Math.abs(rawDelta) > 50 ? 20 : 1;
            const stepSize = rawDelta / steps;
            const currentWheelDirection = rawDelta > 0 ? 'down' : 'up';
            this.#isWheelAnimating = true;
            this.#edgeTriggeredInCurrentWheel = false;

            let i = 0;
            const animate = () => {
                if (token !== this.#wheelToken) return
                if (i >= steps) {
                    this.#isWheelAnimating = false;
                    this.#edgeTriggeredInCurrentWheel = false;
                    return
                }

                this.offset -= stepSize;

                requestAnimationFrame(() => {
                    if (token !== this.#wheelToken) return
                    this.dominant();
                    this.checkEdge(currentWheelDirection);
                    i++;
                    animate();
                });
            };

            animate();
        }

        touchStartHandler(e) {
            if (!e.touches || e.touches.length !== 1) return
            this.#cancelMomentum();
            this.#isTouchDragging = true;
            this.#touchLastY = e.touches[0].clientY;
            this.#touchLastTime = performance.now();
            this.#touchVelocity = 0;
            this.#edgeTriggeredInCurrentWheel = false;
        }

        touchMoveHandler(e) {
            if (!this.#isTouchDragging || !e.touches || e.touches.length !== 1) return
            e.preventDefault();

            const currentY = e.touches[0].clientY;
            const deltaY = currentY - this.#touchLastY;
            const now = performance.now();
            const dt = now - this.#touchLastTime;
            if (dt > 0 && dt < 120) {
                this.#touchVelocity = this.#touchVelocity * 0.65 + (deltaY / dt) * 0.35;
            }
            this.#touchLastY = currentY;
            this.#touchLastTime = now;

            if (Math.abs(deltaY) < 1) return

            this.offset += deltaY * this.scrollSpeed;
            this.dominant();

            const direction = deltaY < 0 ? 'down' : 'up';
            this.checkEdge(direction);
        }

        touchEndHandler() {
            this.#isTouchDragging = false;
            this.#edgeTriggeredInCurrentWheel = false;
            if (this.scrollSpeed === 0) return

            const v = this.#touchVelocity * 16 * this.scrollSpeed;
            if (Math.abs(v) < 0.4) return

            let velocity = v;
            const step = () => {
                if (Math.abs(velocity) < 0.35) {
                    this.#momentumId = 0;
                    return
                }

                const prevOffset = this.#offset;
                this.offset += velocity;
                if (this.#offset === prevOffset) {
                    this.#momentumId = 0;
                    return
                }

                this.dominant();
                const direction = velocity < 0 ? 'down' : 'up';
                this.checkEdge(direction);

                velocity *= 0.92;
                this.#momentumId = requestAnimationFrame(step);
            };
            this.#momentumId = requestAnimationFrame(step);
        }

        #cancelMomentum() {
            this.#wheelToken++;
            if (!this.#momentumId) return
            cancelAnimationFrame(this.#momentumId);
            this.#momentumId = 0;
        }

        #cancelAnimate() {
            if (!this.#animId) return
            cancelAnimationFrame(this.#animId);
            this.#animId = 0;
            this.blocked = false;
        }

        animateTo(targetOffset, opts = {}) {
            this.#cancelMomentum();
            this.#cancelAnimate();

            const duration = opts.duration ?? 220;
            const start = this.#offset;
            const min = this.minScroll;
            const target = Math.max(Math.min(targetOffset, 0), min);

            if (Math.abs(target - start) < 1) {
                this.offset = target;
                this.dominant();
                opts.onComplete?.();
                return Promise.resolve()
            }

            this.blocked = true;
            const startTime = performance.now();

            return new Promise(resolve => {
                const step = (now) => {
                    const t = Math.min(1, (now - startTime) / duration);
                    const eased = 1 - Math.pow(1 - t, 3);
                    this.offset = start + (target - start) * eased;

                    if (t < 1) {
                        this.#animId = requestAnimationFrame(step);
                        return
                    }

                    this.offset = target;
                    this.blocked = false;
                    this.dominant();
                    this.#animId = 0;
                    opts.onComplete?.();
                    resolve();
                };
                this.#animId = requestAnimationFrame(step);
            })
        }

        #pinNativeScroll() {
            if (this.$body.scrollTop) this.$body.scrollTop = 0;
            if (this.$wheelRoot && this.$wheelRoot.scrollTop) this.$wheelRoot.scrollTop = 0;
        }

        #releaseClippedFocus() {
            const active = document.activeElement;
            if (!active || !this.$wheelRoot?.contains(active)) return
            const rect = this.$wheelRoot.getBoundingClientRect();
            if (rect.top < -1 || rect.bottom > window.innerHeight + 1) {
                active.blur();
            }
        }

        apply() {
            this.#pinNativeScroll();
            this.$scroll_block.style.transform = `translateY(${this.offset + this.#baseOffset}px)`;
        }

        get offset() { return this.#offset }
        set offset(value) {

            this.#offset = value;

            if ( this.#minScroll !== null ) {
                if (value >= 0) this.#offset = 0;
                else if (value <= this.#minScroll) this.#offset = this.#minScroll;
            }
            this.apply();
        }

        get blocked() { return this.#blocked }
        set blocked(value) { this.#blocked = value; }
        get minScroll() {
            if (this.#minScroll === null) this.checkMinScroll();
            return this.#minScroll ?? 0
        }

        checkEdge(direction) {
            if (this.#minScroll === null || this.#minScroll === 0) {
                this.checkMinScroll();
            }

            if (this.#minScroll === 0 || this.blocked) return
            if (this.#isWheelAnimating && this.#edgeTriggeredInCurrentWheel) return

            const percent = Math.abs(this.offset / this.#minScroll) * 100;
            const now = Date.now();
            const EDGE_COOLDOWN_MS = 60;

            if (now - this.#lastEdgeTriggerAt < EDGE_COOLDOWN_MS) return

            if (percent < this.#EDGE_TOP) {
                if (direction !== 'up') return
                this.#lastEdgeTriggerAt = now;
                this.#edgeTriggeredInCurrentWheel = true;
                this.blocked = true;
                this.updatePeriod('up');
            } else if (percent > this.#EDGE_BOTTOM) {
                if (direction !== 'down') return
                this.#lastEdgeTriggerAt = now;
                this.#edgeTriggeredInCurrentWheel = true;
                this.blocked = true;
                this.updatePeriod('down');
            }
        }

        checkMinScroll() {
            this.#pinNativeScroll();
            let contentHeight = 0;
            this.$scroll_block.querySelectorAll(
                '.RollDate__calendar__days, .RollDate__calendar__months, .RollDate__calendar__years'
            ).forEach(el => {
                if (el.scrollHeight > contentHeight) contentHeight = el.scrollHeight;
            });
            const bodyHeight = this.$body.clientHeight;
            this.#minScroll = contentHeight > bodyHeight ? -(contentHeight - bodyHeight) : 0;
        }

        setBaseOffset(value = 0) {
            this.#baseOffset = value;
            this.apply();
        }

        resetMinScroll() {
            this.#minScroll = null;
        }

        destroy() {
            this.#cancelMomentum();
            this.#cancelAnimate();
            if (this.#boundWheelHandler) {
                this.$wheelRoot.removeEventListener('wheel', this.#boundWheelHandler, { capture: true });
            }
            if (this.#boundTouchStartHandler) {
                this.$body.removeEventListener('touchstart', this.#boundTouchStartHandler);
            }
            if (this.#boundTouchMoveHandler) {
                this.$body.removeEventListener('touchmove', this.#boundTouchMoveHandler);
            }
            if (this.#boundTouchEndHandler) {
                this.$body.removeEventListener('touchend', this.#boundTouchEndHandler);
                this.$body.removeEventListener('touchcancel', this.#boundTouchEndHandler);
            }
        }
    }

    class Virtualizer {
        constructor(context) {
            this.ctx = context;
        }

        #isDayDisabled(date) {
            const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            return typeof this.ctx.isDateDisabled === 'function' ? this.ctx.isDateDisabled(day) : false
        }

        update(direction) {
            const period = this.ctx.period;
            const isUp = direction === 'up';

            // 🔑 Точна перевірка меж
            if (isUp) {
                if (period === 'year') {
                    if (this.ctx.data.up_date.getFullYear() <= this.ctx.options.minDate.getFullYear()) {
                        this.ctx.scroll.blocked = false;
                        return
                    }
                } else {
                    if (this.ctx.data.up_date <= this.ctx.options.minDate) {
                        this.ctx.scroll.blocked = false;
                        return
                    }
                }
            } else {
                if (period === 'year') {
                    if (this.ctx.data.down_date.getFullYear() >= this.ctx.options.maxDate.getFullYear()) {
                        this.ctx.scroll.blocked = false;
                        return
                    }
                } else {
                    if (this.ctx.data.down_date >= this.ctx.options.maxDate) {
                        this.ctx.scroll.blocked = false;
                        return
                    }
                }
            }

            const config = {
                day: {
                    count: 35,
                    getNewItems: (upDate, downDate) => {
                        const newDates = [];
                        if (isUp) {
                            let newFirst = new Date(upDate);
                            newFirst.setDate(upDate.getDate() - 35);
                            if (newFirst < this.ctx.options.minDate) {
                                const minDate = this.ctx.options.minDate;
                                newFirst = adjustToWeekStart(
                                    new Date(minDate.getFullYear(), minDate.getMonth(), 1),
                                    this.ctx.options.startWeekFromMonday
                                );
                            }
                            for (let d = new Date(newFirst); d < upDate; d.setDate(d.getDate() + 1)) {
                                const date = new Date(d);
                                newDates.push({
                                    date,
                                    disabled: this.#isDayDisabled(date)
                                });
                            }
                            return { items: newDates, newBound: newFirst }
                        } else {
                            let newLast = new Date(downDate);
                            newLast.setDate(downDate.getDate() + 35);
                            const firstNew = new Date(downDate);
                            firstNew.setDate(downDate.getDate() + 1);

                            if (newLast > this.ctx.options.maxDate) {
                                const maxDate = this.ctx.options.maxDate;
                                newLast = adjustToWeekEnd(
                                    new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0),
                                    this.ctx.options.startWeekFromMonday
                                );
                            }

                            for (let d = firstNew; d <= newLast; d.setDate(d.getDate() + 1)) {
                                const date = new Date(d);
                                newDates.push({
                                    date,
                                    disabled: this.#isDayDisabled(date)
                                });
                            }
                            return { items: newDates, newBound: newLast }
                        }
                    },
                    render: dates => this.ctx.render.dates(
                        dates,
                        this.ctx.selectedDates,
                        this.ctx.options.selectType,
                        date => {
                            const colors = this.ctx.getHighlightColors?.(date);
                            return colors?.length ? { colors } : null
                        }
                    ),
                    block: this.ctx.dom.$days_block
                },
                month: {
                    count: 12,
                    ctx: this.ctx,
                    getNewItems: function (upDate, downDate) {
                        const newDates = [];
                        const isMonthDisabled = (year, month) => {
                            const date = new Date(year, month, 1);
                            const monthEnd = new Date(year, month + 1, 0);
                            if (this.ctx.options.minDate && monthEnd < this.ctx.options.minDate) return true
                            if (this.ctx.options.maxDate && date > this.ctx.options.maxDate) return true
                            return false
                        };

                        if (isUp) {
                            const startYear = upDate.getFullYear() - Math.round(this.count / 12);
                            for (let i = 0; i < this.count; i++) {
                                const year = startYear + Math.floor(i / 12);
                                const month = i % 12;
                                newDates.push({
                                    date: new Date(year, month, 1),
                                    disabled: isMonthDisabled(year, month)
                                });
                            }
                        } else {
                            const startYear = downDate.getFullYear() + 1;
                            for (let i = 0; i < this.count; i++) {
                                const year = startYear + Math.floor(i / 12);
                                const month = i % 12;
                                newDates.push({
                                    date: new Date(year, month, 1),
                                    disabled: isMonthDisabled(year, month)
                                });
                            }
                        }

                        const newBound = newDates.length
                            ? (isUp ? newDates[0].date : newDates[newDates.length - 1].date)
                            : (isUp ? upDate : downDate);
                        return { items: newDates, newBound }
                    },
                    render: months => this.ctx.render.months(months),
                    block: this.ctx.dom.$months_block
                },
                year: {
                    count: 16,
                    ctx: this.ctx,
                    getNewItems: function (upDate, downDate) {
                        const newDates = [];
                        const isYearDisabled = (year) => {
                            if (this.ctx.options.minDate && year < this.ctx.options.minDate.getFullYear()) return true
                            if (this.ctx.options.maxDate && year > this.ctx.options.maxDate.getFullYear()) return true
                            return false
                        };

                        if (isUp) {
                            const startYear = upDate.getFullYear() - this.count;
                            for (let y = startYear; y < upDate.getFullYear(); y++) {
                                newDates.push({
                                    date: new Date(y, 0, 1),
                                    disabled: isYearDisabled(y)
                                });
                            }
                        } else {
                            const startYear = downDate.getFullYear() + 1;
                            for (let y = startYear; y < startYear + this.count; y++) {
                                newDates.push({
                                    date: new Date(y, 0, 1),
                                    disabled: isYearDisabled(y)
                                });
                            }
                        }

                        const newBound = newDates.length
                            ? (isUp ? newDates[0].date : newDates[newDates.length - 1].date)
                            : (isUp ? upDate : downDate);
                        return { items: newDates, newBound }
                    },
                    render: years => this.ctx.render.years(years),
                    block: this.ctx.dom.$years_block
                }
            }[period];

            if (!config) return

            const { items, newBound } = config.getNewItems(this.ctx.data.up_date, this.ctx.data.down_date);
            const block = config.block;
            const heightBefore = block.scrollHeight;

            if (items.length) {
                block.insertAdjacentHTML(
                    isUp ? 'afterbegin' : 'beforeend',
                    config.render(items)
                );
            }

            const inserted = block.scrollHeight - heightBefore;
            // Prepend grows the block upward. Shift translateY by the real inserted
            // height so the visible dates stay put. Do this before trim, and after
            // expanding minScroll so the setter does not clamp the compensation.
            if (isUp && inserted) {
                this.ctx.scroll.checkMinScroll();
                this.ctx.scroll.offset -= inserted;
            }

            this.ctx.data[`${direction}_date`] = newBound;
            this.ctx.observe.un();
            const cols = 4;
            const trimSize = period === 'month'
                ? Math.floor(items.length / 12) * 12
                : period === 'year'
                    ? Math.floor(items.length / cols) * cols
                    : items.length;
            this.trim(direction, trimSize);
            this.ctx.observe.on(period);
            if (typeof this.ctx.refreshDayTabindex === 'function') {
                this.ctx.refreshDayTabindex();
            }
            this.#ensureWindowInView();
            this.ctx.scroll.blocked = false;
        }

        #ensureWindowInView() {
            const body = this.ctx.dom.$body;
            const period = this.ctx.period;
            const items = this.ctx.dom[`$${period}s_block`].querySelectorAll(`.RollDate__calendar__${period}`);
            if (!items.length) return
            const box = body.getBoundingClientRect();
            for (const item of items) {
                const rect = item.getBoundingClientRect();
                if (rect.bottom > box.top + 2 && rect.top < box.bottom - 2) return
            }
            this.ctx.scroll.checkMinScroll();
            const mid = this.ctx.scroll.minScroll / 2;
            this.ctx.scroll.offset = this.ctx.scroll.offset < mid ? this.ctx.scroll.minScroll : 0;
        }

        trim(direction, remove) {
            const period = this.ctx.period;
            const block = this.ctx.dom[`$${period}s_block`];
            const isUp = direction === 'up';
            const minItemsInDom = period === 'year' ? 32 : period === 'month' ? 24 : 84;

            const items = Array.from(block.querySelectorAll(`.RollDate__calendar__${period}`));

            if (!remove || items.length - remove < minItemsInDom) {
                this.ctx.scroll.checkMinScroll();
                return
            }

            const oldHeight = block.scrollHeight;

            if (isUp) {
                items.slice(-remove).forEach(item => item.remove());
            } else {
                items.slice(0, remove).forEach(item => item.remove());
            }

            // Перераховуємо межі тільки з поточного DOM після trim, щоб уникнути "миготіння" і зациклення дозагрузки.
            const currentItems = Array.from(block.querySelectorAll(`.RollDate__calendar__${period}`));
            const firstItem = currentItems[0];
            const lastItem = currentItems[currentItems.length - 1];
            const toDate = (el) => {
                if (!el) return null
                const year = Number(el.dataset.year);
                const month = Number(el.dataset.month) || 0;
                const day = period === 'day' ? Number(el.dataset.day) : 1;
                return new Date(year, month, day)
            };

            const newUpDate = toDate(firstItem);
            const newDownDate = toDate(lastItem);
            if (newUpDate) this.ctx.data.up_date = newUpDate;
            if (newDownDate) this.ctx.data.down_date = newDownDate;

            const heightDelta = oldHeight - block.scrollHeight;
            this.ctx.scroll.checkMinScroll();

            // Bottom trim does not move remaining content (prepend already shifted
            // offset). Top trim does, so restore the visible window.
            if (!isUp) this.ctx.scroll.offset += heightDelta;
        }
    }

    const DEFAULT_ITEM_HEIGHT = 28;
    const DEFAULT_VISIBLE = 3;

    class TimePicker {
        #hours = 0
        #minutes = 0
        #use12Hour = false
        #period = 'AM'
        #minuteStep = 1
        #columns = []

        constructor(root, options = {}) {
            this.root = root;
            this.#use12Hour = Boolean(options.use12Hour);
            this.#minuteStep = Math.max(1, Number(options.minuteStep) || 1);
            this.#hours = this.#clamp24Hour(options.hours ?? 0);
            this.#minutes = this.#normalizeMinute(options.minutes ?? 0);
            if (this.#use12Hour) {
                this.#period = this.#hours >= 12 ? 'PM' : 'AM';
            }
            this.onChange = options.onChange || (() => {});
            this.hapticFeedback = options.hapticFeedback !== false;
            this.scrollSpeed = Number.isFinite(Number(options.scrollSpeed))
                ? Math.max(0, Number(options.scrollSpeed))
                : 1;
            this.#build();
        }

        #clamp24Hour(value) {
            const h = Number(value);
            if (Number.isNaN(h)) return 0
            return Math.min(23, Math.max(0, h))
        }

        #displayHour() {
            if (!this.#use12Hour) return this.#hours
            const h = this.#hours % 12;
            return h === 0 ? 12 : h
        }

        #normalizeMinute(value) {
            const step = this.#minuteStep;
            const m = Math.round(Number(value) / step) * step;
            return Math.min(59, Math.max(0, Number.isNaN(m) ? 0 : m))
        }

        #readMetrics(viewport) {
            const container = viewport.closest('.RollDate__container');
            const cs = container ? getComputedStyle(container) : getComputedStyle(viewport);
            const itemH = parseFloat(cs.getPropertyValue('--rd-time-item-h')) || DEFAULT_ITEM_HEIGHT;
            const visible = parseInt(cs.getPropertyValue('--rd-time-visible'), 10) || DEFAULT_VISIBLE;
            const pad = Math.floor((visible - 1) / 2) * itemH;
            return { itemH, visible, pad }
        }

        #build() {
            this.root.innerHTML = `
            <div class="RollDate__time__picker"></div>
            <div class="RollDate__time__period">
                <div class="RollDate__time__segmented RollDate__time__segmented--period" data-role="period">
                    <button type="button" class="RollDate__time__segment-btn" data-period="AM">AM</button>
                    <button type="button" class="RollDate__time__segment-btn" data-period="PM">PM</button>
                </div>
            </div>
        `;

            if (this.#use12Hour) {
                this.root.classList.add('RollDate__time--12h');
            }
            this.#bindToolbar();
            this.#buildPickerColumns();
            this.#syncToolbar();
        }

        #bindToolbar() {
            this.root.querySelector('[data-role="period"]')?.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-period]');
                if (!btn || !this.#use12Hour) return
                this.#setPeriod(btn.dataset.period);
            });
        }

        #setPeriod(period) {
            if (period !== 'AM' && period !== 'PM') return
            if (this.#period === period) return

            this.#readColumns();
            const was = this.#period;
            this.#period = period;

            if (was === 'AM' && period === 'PM' && this.#hours < 12) {
                this.#hours += 12;
            } else if (was === 'PM' && period === 'AM' && this.#hours >= 12) {
                this.#hours -= 12;
            }

            this.#columns.find(c => c.unit === 'hour')?.scrollToValue(this.#displayHour(), true);
            this.#syncToolbar();
            hapticTick(this.hapticFeedback);
            this.#commitTime();
        }

        #syncToolbar() {
            this.root.classList.toggle('RollDate__time--12h', this.#use12Hour);

            this.root.querySelectorAll('[data-period]').forEach((btn) => {
                const active = btn.dataset.period === this.#period;
                btn.classList.toggle('RollDate__time__segment-btn--active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }

        #destroyColumns() {
            this.#columns.forEach((column) => column._resizeObserver?.disconnect());
            this.#columns = [];
        }

        #buildPickerColumns() {
            this.#destroyColumns();

            const picker = this.root.querySelector('.RollDate__time__picker');
            if (!picker) return

            const hourValues = this.#use12Hour
                ? Array.from({ length: 12 }, (_, i) => i + 1)
                : Array.from({ length: 24 }, (_, i) => i);

            const minuteValues = [];
            for (let m = 0; m < 60; m += this.#minuteStep) {
                minuteValues.push(m);
            }

            picker.innerHTML = `
            <div class="RollDate__time__field" data-unit="hour">
                <div class="RollDate__time__column">
                    <div class="RollDate__time__viewport">
                        <div class="RollDate__time__list"></div>
                    </div>
                </div>
            </div>
            <span class="RollDate__time__sep">:</span>
            <div class="RollDate__time__field" data-unit="minute">
                <div class="RollDate__time__column">
                    <div class="RollDate__time__viewport">
                        <div class="RollDate__time__list"></div>
                    </div>
                </div>
            </div>
        `;

            this.#columns.push(this.#createColumn('hour', hourValues, this.#use12Hour ? this.#displayHour() : this.#hours));
            this.#columns.push(this.#createColumn('minute', minuteValues, this.#minutes));
        }

        #commitTime() {
            this.#readColumns();
            this.onChange(this.getTime());
        }

        #parseItemValue(unit, raw) {
            if (unit === 'period') return raw
            return Number(raw)
        }

        #createColumn(unit, values, initial) {
            const field = this.root.querySelector(`[data-unit="${unit}"]`);
            const viewport = field.querySelector('.RollDate__time__viewport');
            const list = field.querySelector('.RollDate__time__list');

            list.innerHTML = values.map((value) => {
                const label = unit === 'minute'
                    ? String(value).padStart(2, '0')
                    : String(value);
                return `<div class="RollDate__time__item" data-value="${value}">${label}</div>`
            }).join('');

            const column = {
                unit,
                viewport,
                list,
                values,
                offset: 0,
                getMetrics: () => this.#readMetrics(viewport)
            };

            const applyPadding = () => {
                const { pad } = column.getMetrics();
                list.style.paddingTop = `${pad}px`;
                list.style.paddingBottom = `${pad}px`;
            };
            applyPadding();

            column.updateActive = () => {
                const index = column.indexFromOffset();
                if (column._lastIndex !== index) {
                    if (column._lastIndex !== undefined) {
                        hapticTick(this.hapticFeedback);
                        this.#commitTime();
                    }
                    column._lastIndex = index;
                }
                list.querySelectorAll('.RollDate__time__item').forEach((el, i) => {
                    el.classList.toggle('RollDate__time__item--active', i === index);
                });
            };

            column.indexFromOffset = () => {
                const { itemH } = column.getMetrics();
                const raw = Math.round(-column.offset / itemH);
                return Math.min(values.length - 1, Math.max(0, raw))
            };

            column.getValue = () => values[column.indexFromOffset()];

            column.apply = (animate) => {
                list.style.transition = animate ? 'transform 0.2s ease' : 'none';
                list.style.transform = `translateY(${column.offset}px)`;
                column.updateActive();
            };

            column.snap = () => {
                const { itemH } = column.getMetrics();
                const index = column.indexFromOffset();
                column.offset = -index * itemH;
                column._lastIndex = index;
                column.apply(true);
                this.#commitTime();
            };

            column.scrollToValue = (value, animate = true) => {
                const { itemH } = column.getMetrics();
                const index = values.indexOf(value);
                if (index < 0) return
                column.offset = -index * itemH;
                column._lastIndex = index;
                column.apply(animate);
            };

            column.scrollToIndex = (index, animate = true) => {
                const { itemH } = column.getMetrics();
                const clamped = Math.min(values.length - 1, Math.max(0, index));
                column.offset = -clamped * itemH;
                column._lastIndex = clamped;
                column.apply(animate);
            };

            column.scrollToValue(initial, false);
            this.#bindWheel(column);
            this.#bindTouch(column);
            this.#bindItemClick(column);
            column._resizeObserver = new ResizeObserver(() => {
                applyPadding();
                column.scrollToIndex(column.indexFromOffset(), false);
            });
            column._resizeObserver.observe(viewport);

            return column
        }

        #bindItemClick(column) {
            column.list.addEventListener('click', (e) => {
                const item = e.target.closest('.RollDate__time__item');
                if (!item) return
                const value = this.#parseItemValue(column.unit, item.dataset.value);
                column.scrollToValue(value, true);
                this.#commitTime();
            });
        }

        #bindWheel(column) {
            column.viewport.addEventListener('wheel', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.scrollSpeed === 0) return
                const { itemH } = column.getMetrics();
                column.list.style.transition = 'none';
                column.offset -= e.deltaY * 0.35 * this.scrollSpeed;
                const min = -(column.values.length - 1) * itemH;
                column.offset = Math.max(min, Math.min(0, column.offset));
                column.list.style.transform = `translateY(${column.offset}px)`;
                column.updateActive();
                clearTimeout(column._snapTimer);
                column._snapTimer = setTimeout(() => column.snap(), 90);
            }, { passive: false });
        }

        #bindTouch(column) {
            let startY = 0;
            let startOffset = 0;

            column.viewport.addEventListener('touchstart', (e) => {
                if (!e.touches || e.touches.length !== 1) return
                startY = e.touches[0].clientY;
                startOffset = column.offset;
                column.list.style.transition = 'none';
            }, { passive: true });

            column.viewport.addEventListener('touchmove', (e) => {
                if (!e.touches || e.touches.length !== 1) return
                e.preventDefault();
                if (this.scrollSpeed === 0) return
                const { itemH } = column.getMetrics();
                column.offset = startOffset + (e.touches[0].clientY - startY) * this.scrollSpeed;
                const min = -(column.values.length - 1) * itemH;
                column.offset = Math.max(min, Math.min(0, column.offset));
                column.list.style.transform = `translateY(${column.offset}px)`;
                column.updateActive();
            }, { passive: false });

            column.viewport.addEventListener('touchend', () => column.snap());
        }

        #readColumns() {
            const hourCol = this.#columns.find(c => c.unit === 'hour');
            const minuteCol = this.#columns.find(c => c.unit === 'minute');
            if (!hourCol || !minuteCol) return

            const hourValue = hourCol.getValue();
            this.#minutes = minuteCol.getValue();

            if (this.#use12Hour) {
                if (this.#period === 'AM') {
                    this.#hours = hourValue === 12 ? 0 : hourValue;
                } else {
                    this.#hours = hourValue === 12 ? 12 : hourValue + 12;
                }
            } else {
                this.#hours = hourValue;
            }
        }

        getTime() {
            return { hours: this.#hours, minutes: this.#minutes }
        }

        setTime(hours, minutes) {
            this.#hours = this.#clamp24Hour(hours);
            this.#minutes = this.#normalizeMinute(minutes);
            if (this.#use12Hour) {
                this.#period = this.#hours >= 12 ? 'PM' : 'AM';
                this.#columns.find(c => c.unit === 'hour')?.scrollToValue(this.#displayHour());
            } else {
                this.#columns.find(c => c.unit === 'hour')?.scrollToValue(this.#hours);
            }
            this.#columns.find(c => c.unit === 'minute')?.scrollToValue(this.#minutes);
            this.#syncToolbar();
        }

        destroy() {
            this.#destroyColumns();
            this.root.innerHTML = '';
        }
    }

    const WEEKDAY_MIN = 0;
    const WEEKDAY_MAX = 6;
    const MONTHLY_OCCURRENCES = [1, 2, 3, 4, 5, -1];

    function cloneDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    }

    function warnInvalidRule(rule) {
        console.warn('RollDate: invalid date rule', rule);
    }

    function isValidWeekday(value) {
        return Number.isInteger(value) && value >= WEEKDAY_MIN && value <= WEEKDAY_MAX
    }

    function parseIsoLocalDate(value) {
        const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const date = new Date(year, month - 1, day);
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null
        }
        return date
    }

    function parseRuleDate(value, parseDateInput) {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return cloneDay(value)
        }

        if (typeof value === 'string') {
            const iso = parseIsoLocalDate(value);
            if (iso) return iso
            if (typeof parseDateInput === 'function') {
                const parsed = parseDateInput(value);
                if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
                    return cloneDay(parsed)
                }
            }
        }

        return null
    }

    function nthWeekdayOfMonth(year, month, weekday, occurrence) {
        if (occurrence === -1) {
            const last = new Date(year, month + 1, 0);
            const diff = (last.getDay() - weekday + 7) % 7;
            last.setDate(last.getDate() - diff);
            return last
        }

        const first = new Date(year, month, 1);
        const offset = (weekday - first.getDay() + 7) % 7;
        const day = 1 + offset + (occurrence - 1) * 7;
        const date = new Date(year, month, day);
        if (date.getMonth() !== month) return null
        return date
    }

    function compileDateRule(rule, parseDateInput) {
        if (typeof rule === 'function') {
            return date => Boolean(rule(cloneDay(date)))
        }

        if (typeof rule === 'string' || rule instanceof Date) {
            const exact = parseRuleDate(rule, parseDateInput);
            if (!exact) {
                warnInvalidRule(rule);
                return null
            }
            const stamp = exact.getTime();
            return date => cloneDay(date).getTime() === stamp
        }

        if (!rule || typeof rule !== 'object') {
            warnInvalidRule(rule);
            return null
        }

        if (rule.repeat === 'weekly') {
            if (!Array.isArray(rule.weekdays) || !rule.weekdays.length) {
                warnInvalidRule(rule);
                return null
            }
            const weekdays = [...new Set(rule.weekdays)];
            if (!weekdays.every(isValidWeekday)) {
                warnInvalidRule(rule);
                return null
            }
            return date => weekdays.includes(cloneDay(date).getDay())
        }

        if (rule.repeat === 'monthly') {
            if (!isValidWeekday(rule.weekday) || !MONTHLY_OCCURRENCES.includes(rule.occurrence)) {
                warnInvalidRule(rule);
                return null
            }
            const weekday = rule.weekday;
            const occurrence = rule.occurrence;
            return date => {
                const day = cloneDay(date);
                const target = nthWeekdayOfMonth(
                    day.getFullYear(),
                    day.getMonth(),
                    weekday,
                    occurrence
                );
                return Boolean(target && target.getTime() === day.getTime())
            }
        }

        if (rule.repeat != null) {
            warnInvalidRule(rule);
            return null
        }

        if (rule.from != null || rule.to != null) {
            const from = parseRuleDate(rule.from, parseDateInput);
            const to = parseRuleDate(rule.to, parseDateInput);
            if (!from || !to || from.getTime() > to.getTime()) {
                warnInvalidRule(rule);
                return null
            }
            return date => {
                const stamp = cloneDay(date).getTime();
                return stamp >= from.getTime() && stamp <= to.getTime()
            }
        }

        warnInvalidRule(rule);
        return null
    }

    function compileDateRules(rules, parseDateInput) {
        if (rules === undefined) return null
        if (!Array.isArray(rules)) {
            console.warn('RollDate: date rules must be an array');
            return []
        }
        return rules.map(rule => compileDateRule(rule, parseDateInput)).filter(Boolean)
    }

    function matchCompiledDateRules(date, matchers) {
        if (!Array.isArray(matchers) || !matchers.length) return false
        const day = cloneDay(date);
        return matchers.some(matcher => matcher(day))
    }

    function isDateEnabled(date, options = {}) {
        const day = cloneDay(date);
        const min = options.minDate ? cloneDay(options.minDate) : null;
        const max = options.maxDate ? cloneDay(options.maxDate) : null;

        if (min && day < min) return false
        if (max && day > max) return false

        const enabledMatchers = options.enabledMatchers !== undefined
            ? options.enabledMatchers
            : compileDateRules(options.enabledDates, options.parseDateInput);

        if (enabledMatchers !== null && !matchCompiledDateRules(day, enabledMatchers)) {
            return false
        }

        const disabledMatchers = options.disabledMatchers !== undefined
            ? options.disabledMatchers
            : compileDateRules(options.disabledDates || [], options.parseDateInput);

        if (matchCompiledDateRules(day, disabledMatchers || [])) return false
        return true
    }

    class RollDate {
        static #instances = new Set()

        #wheelHandler
        #viewNumber = 0
        #arrowAnimating = false
        #viewPeriodNames = ['day', 'month', 'year']
        #selectedDates = []
        #firstOpen = true
        #disabledMatchers = []
        #enabledMatchers = null
        #highlightDateMap = new Map()
        #presetButtons = []
        #docClickHandler = null
        #openTriggers = []
        #activeDateStamp = null
        #focusReturnEl = null
        #ignoreFocusOpen = false
        #focusAfterView = false
        #calendarKeyHandler = null
        #triggerListeners = []

        #clampDateToRange(date, minDate, maxDate) {
            if (!(date instanceof Date) || Number.isNaN(date.getTime())) return minDate
            if (date < minDate) return new Date(minDate)
            if (date > maxDate) return new Date(maxDate)
            return date
        }

        #toDateStamp(date) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
        }

        #normalizeDateInput(dateLike) {
            if (dateLike instanceof Date && !Number.isNaN(dateLike.getTime())) {
                return new Date(dateLike.getFullYear(), dateLike.getMonth(), dateLike.getDate())
            }

            if (typeof dateLike === 'string') {
                const clean = dateLike.trim();
                if (!clean) return null

                const valueSep = clean.match(/[-/.]/)?.[0];
                const formatSep = this.options.dateFormat.match(/[-/.]/)?.[0];
                const format = valueSep && formatSep && valueSep !== formatSep
                    ? 'auto'
                    : this.options.dateFormat;

                const date = parseDate(clean, format);
                if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
                    const fallback = parseDate(clean, 'auto');
                    if (!(fallback instanceof Date) || Number.isNaN(fallback.getTime())) return null
                    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate())
                }

                return new Date(date.getFullYear(), date.getMonth(), date.getDate())
            }

            const date = checkDateFormat(dateLike, this.options.dateFormat);
            if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
            return new Date(date.getFullYear(), date.getMonth(), date.getDate())
        }

        #buildHighlightDateMap(dates = []) {
            const map = new Map();
            if (!Array.isArray(dates)) return map

            dates.forEach(entry => {
                const item = this.#normalizeHighlightEntry(entry);
                if (!item) return

                const existing = map.get(item.stamp) || [];
                map.set(item.stamp, existing.concat(item.colors));
            });

            return map
        }

        #normalizeHighlightEntry(entry) {
            if (entry == null) return null

            if (typeof entry === 'string' || entry instanceof Date) {
                const normalized = this.#normalizeDateInput(entry);
                if (!normalized) return null
                return {
                    stamp: this.#toDateStamp(normalized),
                    colors: [null]
                }
            }

            if (typeof entry === 'object' && entry.date != null) {
                const normalized = this.#normalizeDateInput(entry.date);
                if (!normalized) return null
                const stamp = this.#toDateStamp(normalized);

                if (Array.isArray(entry.colors)) {
                    const colors = entry.colors.map(color => {
                        if (color == null || color === '') return null
                        return this.#sanitizeHighlightColor(color)
                    }).filter(color => color !== undefined);

                    if (colors.length) return { stamp, colors }
                }

                if (entry.color != null && entry.color !== '') {
                    const color = this.#sanitizeHighlightColor(entry.color);
                    if (color) return { stamp, colors: [color] }
                }

                return { stamp, colors: [null] }
            }

            return null
        }

        #sanitizeHighlightColor(color) {
            if (typeof color !== 'string') return null
            const value = color.trim();
            if (!value) return null

            if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value
            if (/^(rgb|rgba|hsl|hsla)\([^)]+\)$/i.test(value)) return value
            if (/^var\(--[\w-]+\)$/.test(value)) return value

            return null
        }

        #highlightMapToOptionsArray() {
            return [...this.#highlightDateMap.entries()].map(([stamp, colors]) => {
                const date = new Date(stamp);

                if (colors.length === 1 && colors[0] === null) return date
                if (colors.length === 1 && colors[0]) return { date, color: colors[0] }

                return { date, colors }
            })
        }

        #disableInputAssist(input) {
            if (!input || input.tagName !== 'INPUT') return
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('spellcheck', 'false');
        }

        #normalizeEnabledDates(rules) {
            if (rules === undefined) {
                this.options.enabledDates = undefined;
                return
            }
            if (!Array.isArray(rules)) {
                console.warn('RollDate: enabledDates must be an array');
                this.options.enabledDates = undefined;
                return
            }
            this.options.enabledDates = [...rules];
        }

        #compileAvailability() {
            const parseDateInput = dateLike => this.#normalizeDateInput(dateLike);
            this.#enabledMatchers = this.options.enabledDates === undefined
                ? null
                : compileDateRules(this.options.enabledDates, parseDateInput);
            this.#disabledMatchers = compileDateRules(this.options.disabledDates || [], parseDateInput) || [];
        }

        #isDateEnabled(date) {
            return isDateEnabled(date, {
                minDate: this.options.minDate,
                maxDate: this.options.maxDate,
                enabledMatchers: this.#enabledMatchers,
                disabledMatchers: this.#disabledMatchers
            })
        }

        #isDateDisabled(date) {
            return !this.#isDateEnabled(date)
        }

        #isDayUnavailable(date) {
            return this.#isDateDisabled(date)
        }

        #isDateHighlighted(date) {
            return this.#highlightDateMap.has(this.#toDateStamp(date))
        }

        #getHighlightMeta(date) {
            const colors = this.#highlightDateMap.get(this.#toDateStamp(date));
            if (!colors?.length) return null
            return { colors }
        }

        #notifySelectionChange() {
            this.#syncPresetState();
            if (this.options.selectType === 'single') {
                this.options.selectDate(this.#selectedDates[0] || null);
                return
            }
            this.options.selectDate([...this.#selectedDates]);
        }

        #syncSelectedWithDisabledDates() {
            const prevLength = this.#selectedDates.length;
            this.#selectedDates = this.#selectedDates.filter(date => !this.#isDateDisabled(date));
            if (prevLength !== this.#selectedDates.length) {
                this.#notifySelectionChange();
                this.#updateInputValue();
            }
        }

        #dayFromElement(dayEl) {
            return new Date(
                Number(dayEl.dataset.year),
                Number(dayEl.dataset.month),
                Number(dayEl.dataset.day)
            )
        }

        #refreshHighlightView() {
            if (!this.$container) return

            this.$container.querySelectorAll('.RollDate__calendar__day').forEach(dayEl => {
                const meta = this.#getHighlightMeta(this.#dayFromElement(dayEl));
                const nextHtml = meta ? this.render.highlightDotsHtml(meta.colors) : '';
                const existing = dayEl.querySelector('.RollDate__calendar__day-dots');
                if (!nextHtml) {
                    existing?.remove();
                    return
                }
                if (existing) {
                    existing.outerHTML = nextHtml;
                } else {
                    dayEl.insertAdjacentHTML('beforeend', nextHtml);
                }
            });
        }

        #refreshMonthYearAvailability() {
            this.$container.querySelectorAll('.RollDate__calendar__month').forEach(el => {
                const year = Number(el.dataset.year);
                const month = Number(el.dataset.month);
                const start = new Date(year, month, 1);
                const end = new Date(year, month + 1, 0);
                const disabled = Boolean(
                    (this.options.minDate && end < this.options.minDate) ||
                    (this.options.maxDate && start > this.options.maxDate)
                );
                el.classList.toggle('RollDate__calendar__month--disabled', disabled);
            });

            this.$container.querySelectorAll('.RollDate__calendar__year').forEach(el => {
                const year = Number(el.dataset.year);
                const disabled = Boolean(
                    (this.options.minDate && year < this.options.minDate.getFullYear()) ||
                    (this.options.maxDate && year > this.options.maxDate.getFullYear())
                );
                el.classList.toggle('RollDate__calendar__year--disabled', disabled);
            });
        }

        #refreshAvailabilityView() {
            if (!this.$container) return

            this.$container.querySelectorAll('.RollDate__calendar__day').forEach(dayEl => {
                const disabled = this.#isDateDisabled(this.#dayFromElement(dayEl));
                dayEl.classList.toggle('RollDate__calendar__day--disabled', disabled);
                dayEl.disabled = disabled;
                if (disabled) {
                    dayEl.removeAttribute('aria-pressed');
                    dayEl.tabIndex = -1;
                }
            });

            this.#refreshMonthYearAvailability();

            if (this.period === 'day') {
                this.#paintSelection();
                this.#syncDayTabindex({ focus: false });
            }
        }

        #applyTimeToDate(date) {
            const d = new Date(date);
            if (!this.options.enableTime) return d
            const time = this.timePicker?.getTime() || {
                hours: this.options.startDate.getHours(),
                minutes: this.options.startDate.getMinutes()
            };
            d.setHours(time.hours, time.minutes, 0, 0);
            return d
        }

        #formatDateTime(date) {
            const datePart = formatDate(date, this.options.dateFormat);

            if (!this.options.enableTime) return datePart

            const h = String(date.getHours()).padStart(2, '0');
            const m = String(date.getMinutes()).padStart(2, '0');
            return `${datePart} ${h}:${m}`
        }

        #initFooterButtons() {
            if (!this.dom.$footer_buttons) return

            const buttons = Array.isArray(this.options.footerButtons)
                ? this.options.footerButtons
                : [];

            this.dom.$footer_buttons.innerHTML = '';
            const groups = {};
            const groupFor = (position) => {
                if (!groups[position]) {
                    const group = document.createElement('div');
                    group.className = `RollDate__footer__group RollDate__footer__group--${position}`;
                    groups[position] = group;
                }
                return groups[position]
            };

            buttons.forEach((cfg) => {
                if (!cfg?.text) return
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'RollDate__footer__button';
                if (['primary', 'secondary', 'link'].includes(cfg.variant)) {
                    btn.classList.add(`RollDate__footer__button--${cfg.variant}`);
                }
                if (typeof cfg.className === 'string' && cfg.className.trim()) {
                    btn.classList.add(...cfg.className.trim().split(/\s+/));
                }
                if (cfg.ariaLabel) btn.setAttribute('aria-label', cfg.ariaLabel);
                if (cfg.action) btn.dataset.action = cfg.action;
                btn.textContent = cfg.text;
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.#handleFooterButton(cfg);
                });
                groupFor(cfg.position === 'left' ? 'left' : 'right').append(btn);
            });

            if (groups.left) this.dom.$footer_buttons.append(groups.left);
            if (groups.right) this.dom.$footer_buttons.append(groups.right);
        }

        #handleFooterButton(cfg) {
            if (cfg.action === 'today') {
                this.selectToday();
                return
            }
            if (cfg.action === 'clear') {
                this.clearSelection();
                return
            }
            if (cfg.action === 'close') {
                this.close({ restoreFocus: true });
                return
            }
            if (typeof cfg.onClick === 'function') {
                cfg.onClick(this);
            }
        }

        #mountRangePresets() {
            const presets = Array.isArray(this.options.rangePresets)
                ? this.options.rangePresets
                : [];

            if (this.options.selectType !== 'range' || !presets.length) return

            let bar = this.$container.querySelector('.RollDate__presets');
            if (!bar) {
                bar = document.createElement('div');
                bar.className = 'RollDate__presets';
                bar.dataset.rdSlot = 'presets';
                bar.setAttribute('role', 'group');
                if (this.options.presetsLabel) bar.setAttribute('aria-label', this.options.presetsLabel);
                this.$container.querySelector('.RollDate__content').after(bar);
            }

            bar.innerHTML = '';
            this.#presetButtons = [];
            presets.forEach((preset, index) => {
                if (!preset?.label || typeof preset.getRange !== 'function') return

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'RollDate__presets__button';
                btn.dataset.presetId = preset.id || String(index);
                if (preset.icon) btn.dataset.icon = preset.icon;
                btn.setAttribute('aria-pressed', 'false');
                const label = document.createElement('span');
                label.className = 'RollDate__presets__label';
                label.textContent = preset.label;
                btn.append(label);
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.#applyRangePreset(preset);
                });
                bar.append(btn);
                this.#presetButtons.push({ preset, btn });
            });

            if (bar.childElementCount) {
                this.$container.classList.add('RollDate__has-presets');
            }
            this.#syncPresetState();
        }

        #resolvePresetRange(preset) {
            const result = preset.getRange(this);
            if (!Array.isArray(result) || result.length < 2) return null

            const normalized = result
                .slice(0, 2)
                .map(dateLike => this.#normalizeDateInput(dateLike))
                .filter(Boolean)
                .map(date => this.#clampDateToRange(date, this.options.minDate, this.options.maxDate))
                .filter(date => !this.#isDateDisabled(date));

            if (normalized.length < 2) return null

            let [start, end] = normalized;
            if (start > end) [start, end] = [end, start];
            return [start, end]
        }

        #syncPresetState() {
            if (!this.#presetButtons.length) return
            const [start, end] = this.#selectedDates;
            const selected = start && end
                ? `${this.#toDateStamp(start)}:${this.#toDateStamp(end)}`
                : '';

            this.#presetButtons.forEach(({ preset, btn }) => {
                const range = selected ? this.#resolvePresetRange(preset) : null;
                const active = !!range &&
                    `${this.#toDateStamp(range[0])}:${this.#toDateStamp(range[1])}` === selected;
                btn.classList.toggle('RollDate__presets__button--active', active);
                btn.setAttribute('aria-pressed', String(active));
            });
        }

        #applyRangePreset(preset) {
            const range = this.#resolvePresetRange(preset);
            if (!range) return
            const [start, end] = range;

            this.#selectedDates = [
                this.#applyTimeToDate(start),
                this.#applyTimeToDate(end)
            ];
            this.#notifySelectionChange();
            this.#updateInputValue();
            this.#paintRangeSelection();
        }

        #initTimePicker() {
            const start = this.options.startDate;
            this.timePicker = new TimePicker(this.dom.$time, {
                hours: start.getHours(),
                minutes: start.getMinutes(),
                use12Hour: this.options.use12Hour,
                minuteStep: this.options.timeStep,
                hapticFeedback: this.options.hapticFeedback !== false,
                scrollSpeed: this.options.scrollSpeed,
                onChange: () => {
                    if (!this.#selectedDates.length) return
                    this.#selectedDates = this.#selectedDates.map(date => this.#applyTimeToDate(date));
                    this.#notifySelectionChange();
                    this.#updateInputValue();
                }
            });
        }

        constructor(selector, options = {}) {
            if (options === null || options === undefined) options = {};

            this.triggerSelector = options.triggerSelector;

            if (Array.isArray(selector)) {
                this.$startInput = document.querySelector(selector[0]);
                this.$endInput = document.querySelector(selector[1]);
                this.$trigger = this.$startInput;
                this.mode = 'popup';
            } else {
                this.$trigger = document.querySelector(selector);

                if (this.triggerSelector) {
                    this.$openTrigger = document.querySelector(this.triggerSelector);
                    this.mode = 'popup';
                } else if (this.$trigger.tagName === 'INPUT') {
                    this.mode = 'popup';
                } else {
                    this.mode = 'inline';
                }
            }

            const today = new Date();

            const baseOptions = {
                mode: 'auto',
                theme: 'main',
                startWeekFromMonday: true,
                selectType: 'single',
                monthsNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
                monthsShortNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                weekDaysNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                selectDate: dates => console.log(dates),
                onOpen: () => {},
                onClose: () => {},
                onViewChange: () => {},
                onHoverDate: () => {},
                disabledDates: [],
                highlightDates: [],
                closeOnSelect: true,
                enableTime: false,
                use12Hour: false,
                timeStep: 1,
                timePosition: 'right',
                footerButtons: [],
                rangePresets: [],
                presetsLabel: '',
                containerClass: '',
                hapticFeedback: true,
                scrollSpeed: 1,
                ...options
            };

            if (baseOptions.theme === 'default') {
                baseOptions.theme = 'main';
            }

            const resolvedLocale = baseOptions.locale ||
                (typeof navigator !== 'undefined' ? navigator.language : 'en');
            baseOptions.locale = resolvedLocale;
            baseOptions.dateFormat = baseOptions.dateFormat || getLocaleInputFormat(resolvedLocale);
            baseOptions.previousMonthLabel = baseOptions.previousMonthLabel || getTranslation('previousMonth', resolvedLocale);
            baseOptions.nextMonthLabel = baseOptions.nextMonthLabel || getTranslation('nextMonth', resolvedLocale);
            baseOptions.selectedLabel = baseOptions.selectedLabel || getTranslation('selected', resolvedLocale);

            const parsedDates = {
                startDate: checkDateFormat(
                    options.startDate !== undefined ? options.startDate : today,
                    baseOptions.dateFormat
                ),
                minDate: checkDateFormat(
                    options.minDate !== undefined ? options.minDate : new Date(today.getFullYear() - 100, today.getMonth(), 1),
                    baseOptions.dateFormat
                ),
                maxDate: checkDateFormat(
                    options.maxDate !== undefined ? options.maxDate : new Date(today.getFullYear() + 100, today.getMonth() + 1, 0),
                    baseOptions.dateFormat
                )
            };

            this.options = {
                ...baseOptions,
                ...parsedDates
            };
            this.options.scrollSpeed = normalizeScrollSpeed(this.options.scrollSpeed);

            if (this.options.minDate > this.options.maxDate) {
                console.error('Date Error: maxDate is less than minDate!');
            }

            this.options.startDate = this.#clampDateToRange(
                this.options.startDate,
                this.options.minDate,
                this.options.maxDate
            );
            this.options.disabledDates = Array.isArray(this.options.disabledDates)
                ? [...this.options.disabledDates]
                : [];
            this.#normalizeEnabledDates(this.options.enabledDates);
            this.#compileAvailability();
            this.#highlightDateMap = this.#buildHighlightDateMap(this.options.highlightDates);
            if (this.#isDateDisabled(this.options.startDate)) {
                this.options.startDate = nearestAvailableDate(
                    this.options.startDate,
                    date => this.#isDateDisabled(date),
                    this.options.minDate,
                    this.options.maxDate
                );
            }

            this.#init();
            RollDate.#instances.add(this);
        }

        #closeOtherPopups() {
            for (const instance of RollDate.#instances) {
                if (instance !== this && instance.mode === 'popup') {
                    instance.close();
                }
            }
        }

        #init() {
            if (typeof this.options !== 'object' || this.options === null) {
                console.error('RollDate: options is not an object!');
                return
            }

            this.$container = document.createElement('div');
            this.$container.className = `RollDate__container RollDate__calendar__type--days RollDate__theme_${this.options.theme}`;
            if (typeof this.options.containerClass === 'string' && this.options.containerClass.trim()) {
                this.$container.classList.add(...this.options.containerClass.trim().split(/\s+/));
            }

            this.#disableInputAssist(this.$trigger);
            this.#disableInputAssist(this.$startInput);
            this.#disableInputAssist(this.$endInput);

            if (this.mode === 'popup') {
                document.body.appendChild(this.$container);
                this.$container.style.display = 'none';
            } else {
                if (this.$trigger.nodeName === 'DIV' || this.$trigger.nodeName === 'SPAN' || this.$trigger.nodeName === 'SECTION') {
                    this.$trigger.append(this.$container);
                } else {
                    document.body.append(this.$container);
                }
            }

            if (this.options.enableTime) {
                this.$container.classList.add('RollDate__has-time');
                const timePosition = this.options.timePosition === 'bottom' ? 'bottom' : 'right';
                this.$container.classList.add(`RollDate__time-position_${timePosition}`);
            }
            if (this.options.footerButtons?.length) {
                this.$container.classList.add('RollDate__has-footer');
            }

            this.render = new Render({
                container: this.$container,
                trigger: this.$trigger,
                startWeekFromMonday: this.options.startWeekFromMonday,
                monthsNames: this.options.monthsNames,
                monthsShortNames: this.options.monthsShortNames,
                weekDays: this.options.weekDaysNames,
                enableTime: this.options.enableTime,
                footerButtons: this.options.footerButtons,
                locale: this.options.locale,
                previousMonthLabel: this.options.previousMonthLabel,
                nextMonthLabel: this.options.nextMonthLabel,
                selectedLabel: this.options.selectedLabel
            });

            this.dom ={
                $year: this.$container.querySelector('.RollDate__header__year'),
                $month: this.$container.querySelector('.RollDate__header__month'),
                $years_block: this.$container.querySelector('.RollDate__calendar__years'),
                $months_block: this.$container.querySelector('.RollDate__calendar__months'),
                $days_block: this.$container.querySelector('.RollDate__calendar__days'),
                $body: this.$container.querySelector('.RollDate__calendar__body'),
                $type_switcher: this.$container.querySelector('.RollDate__calendar__switcher'),
                $page_switcher: this.$container.querySelectorAll('.RollDate__calendar__button'),
                $footer_buttons: this.$container.querySelector('.RollDate__footer__buttons'),
                $time: this.$container.querySelector('.RollDate__time'),
            };

            this.#initFooterButtons();
            this.#mountRangePresets();
            if (this.options.enableTime && this.dom.$time) {
                this.#initTimePicker();
            }

            this.virtualizer = new Virtualizer(this);

            this.#attachEvents();

            this.observe = new Observe(this.$container, this.dom.$body);

            this.data = new Data({
                startDate: this.options.startDate,
                minDate: this.options.minDate,
                maxDate: this.options.maxDate,
                startWeekFromMonday: this.options.startWeekFromMonday,
                isDateDisabled: date => this.#isDateDisabled(date)
            });

            this.refreshDayTabindex = () => this.#onVirtualizeRefresh();
            this.#activeDateStamp = this.#toDateStamp(this.#resolveDefaultActiveDate());
            this.#updateView(this.#viewNumber);
        }

        #positionCalendar() {
            if (this.mode !== 'popup') return

            if (window.innerWidth <= 380) {
                this.$container.style.position = 'fixed';
                this.$container.style.left = '8px';
                this.$container.style.right = '8px';
                this.$container.style.top = 'auto';
                this.$container.style.bottom = '8px';
                this.$container.style.width = 'auto';
                this.$container.style.maxHeight = 'min(80vh, 560px)';
                this.$container.style.zIndex = '10000';
                return
            }

            // Use the primary trigger element for popup positioning.
            const positionTrigger = this.$endInput ? this.$startInput :
                (this.$openTrigger ? this.$trigger : this.$trigger);

            const rect = positionTrigger.getBoundingClientRect();

            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;

            if (spaceBelow < 300) {
                this.$container.style.top = `${rect.top + window.scrollY - this.$container.offsetHeight}px`;
            } else {
                this.$container.style.top = `${rect.bottom + window.scrollY}px`;
            }

            this.$container.style.left = `${rect.left + window.scrollX}px`;
            this.$container.style.right = 'auto';
            this.$container.style.bottom = 'auto';
            this.$container.style.width = '';
            this.$container.style.maxHeight = '';
            this.$container.style.position = 'absolute';
            this.$container.style.zIndex = '10000';
        }

        #updateView(viewNumberOrOptions, maybeOptions) {
            let options = {};

            if (typeof viewNumberOrOptions === 'object' && viewNumberOrOptions !== null) {
                options = viewNumberOrOptions;
            } else {
                if (typeof viewNumberOrOptions === 'number') {
                    this.#viewNumber = viewNumberOrOptions;
                }
                if (typeof maybeOptions === 'object' && maybeOptions !== null) {
                    options = maybeOptions;
                }
            }

            const preserveScroll = options.preserveScroll === true;
            const savedOffset = preserveScroll ? this.scroll.offset : null;
            const animateScroll = options.animate === true && Number(options.shift);
            const onScrollComplete = typeof options.onScrollComplete === 'function'
                ? options.onScrollComplete
                : null;
            const finishScroll = () => {
                const keepActiveDay = this.#focusAfterView;
                this.#syncDayTabindex({ focus: keepActiveDay });
                if (keepActiveDay && this.#activeDateStamp != null) {
                    this.#scrollDayIntoView(new Date(this.#activeDateStamp));
                }
                this.#focusAfterView = false;
                onScrollComplete?.();
            };

            this.#updateHeader();
            this.scroll.blocked = false;
            this.observe.un(this.period);
            this.#clearContent(this.period);

            switch (this.period) {
                case 'day':
                    const days = this.data.getDates();
                    this.dom.$days_block.innerHTML = this.render.dates(
                        days,
                        this.#selectedDates,
                        this.options.selectType,
                        date => this.#getHighlightMeta(date)
                    );
                    this.#syncDayTabindex({ focus: false });
                    break

                default:
                    const dates = this.data.getMonthsOrYears(this.period);
                    this.dom[`$${this.period}s_block`].innerHTML = this.render[`${this.period}s`](dates);
            }

            const applyScroll = () => {
                const $scrollBlock = this.dom.$body.querySelector('.RollDate__calendar__scrollblock');
                const bodyHeight = this.dom.$body.clientHeight;
                const blockHeight = $scrollBlock.clientHeight;

                if (blockHeight <= bodyHeight) {
                    this.scroll.setBaseOffset(bodyHeight - blockHeight);
                    this.scroll.offset = 0;
                    finishScroll();
                    return
                }

                this.scroll.setBaseOffset(0);
                this.scroll.resetMinScroll();

                if (preserveScroll && savedOffset != null) {
                    this.scroll.offset = Math.max(savedOffset, this.scroll.minScroll);
                    finishScroll();
                    return
                }

                const selectors = {
                    day: `.RollDate__calendar__day[data-year="${this.data.current_year}"][data-month="${this.data.current_month}"]`,
                    month: `.RollDate__calendar__month[data-year="${this.data.current_year}"][data-month="0"]`,
                    year: `.RollDate__calendar__year[data-decade="${this.data.current_decade}"][data-year="${this.data.current_year}"]`
                };
                let $firstEl = this.$container.querySelector(selectors[this.period]);
                if (!$firstEl) {
                    const fallbacks = {
                        day: `.RollDate__calendar__day[data-year="${this.data.current_year}"]`,
                        month: `.RollDate__calendar__month[data-year="${this.data.current_year}"]`,
                        year: `.RollDate__calendar__year[data-decade="${this.data.current_decade}"]`
                    };
                    $firstEl = this.$container.querySelector(fallbacks[this.period]);
                }

                if (!$firstEl) {
                    finishScroll();
                    return
                }

                const containerRect = $scrollBlock.getBoundingClientRect();
                const firstRect = $firstEl.getBoundingClientRect();
                const firstRectOffset = -(firstRect.top - containerRect.top);
                const targetOffset = Math.max(firstRectOffset, this.scroll.minScroll);

                if (animateScroll) {
                    const slide = Math.min(bodyHeight * 0.38, 140);
                    const startOffset = Math.max(
                        Math.min(targetOffset + (options.shift > 0 ? slide : -slide), 0),
                        this.scroll.minScroll
                    );
                    this.scroll.offset = startOffset;
                    this.scroll.animateTo(targetOffset, { onComplete: finishScroll });
                    return
                }

                this.scroll.offset = targetOffset;
                finishScroll();
            };

            setTimeout(applyScroll, 0);

            this.observe.on(this.period, item => {
                const cond = JSON.parse(item.dataset.bind).every(data => Number(item.dataset[data]) === this.data[`current_${data}`]);
                if (cond) item.classList.add(`RollDate__calendar__${this.period}--active`);
            });
        }

        #updateHeader() {
            if (this.period !== 'year') {
                this.dom.$year.innerText = this.data.current_year;
                this.dom.$month.innerText = this.options.monthsNames[this.data.current_month];
            } else {
                this.dom.$year.innerText = Number(this.data.current_decade) + '-' + (Number(this.data.current_decade) + 9);
            }

            const items = this.$container.querySelectorAll(`.RollDate__calendar__${this.period}`);

            items.forEach(item => {
                for (const period of JSON.parse(item.dataset.bind)) {
                    const condition = JSON.parse(item.dataset.bind).every(data => Number(item.dataset[data]) === this.data[`current_${data}`]);
                    if (condition) {
                        item.classList.add(`RollDate__calendar__${this.period}--active`);
                    } else {
                        item.classList.remove(`RollDate__calendar__${this.period}--active`);
                    }
                }
            });
        }

        #attachEvents() {
            if (this.mode === 'popup') {
                const openTriggers = [];

                // Resolve elements that are allowed to open the popup.
                if (this.triggerSelector) {
                    // Custom trigger provided by selector.
                    this.$openTrigger = document.querySelector(this.triggerSelector);
                    openTriggers.push(this.$openTrigger);
                } else if (this.$endInput) {
                    // Range mode with two inputs and no separate icon trigger.
                    openTriggers.push(this.$startInput, this.$endInput);
                } else {
                    // Single input mode.
                    openTriggers.push(this.$trigger);
                }

                this.#openTriggers = openTriggers.filter(Boolean);

                this.#openTriggers.forEach(trigger => {
                    const onClick = (e) => {
                        e.stopPropagation();
                        this.open({ source: trigger });
                    };
                    this.#bindTrigger(trigger, 'click', onClick);

                    if (trigger.tagName === 'INPUT') {
                        const onFocus = () => {
                            if (this.#ignoreFocusOpen) return
                            this.open({ source: trigger });
                        };
                        const onKeyDown = (e) => this.#handleInputKeyDown(e, trigger);
                        this.#bindTrigger(trigger, 'focus', onFocus);
                        this.#bindTrigger(trigger, 'keydown', onKeyDown);
                    }
                });

                // Close when clicking outside picker and trigger elements.
                this.#docClickHandler = (e) => {
                    if (!this.$container.contains(e.target) &&
                        !this.#openTriggers.some(t => t.contains(e.target))) {
                        this.close();
                    }
                };
                document.addEventListener('click', this.#docClickHandler);

                // Parse manual text input for popup inputs.
                const inputs = this.$endInput ? [this.$startInput, this.$endInput] : [this.$trigger];
                inputs.forEach(input => {
                    if (input?.tagName === 'INPUT') {
                        input.addEventListener('input', (e) => {
                            this.#parseInputValue(e.target.value);
                        });
                    }
                });
            }

            this.scroll = new Scroll(this.dom.$body, {
                dominant: () => {
                    const dominant = this.observe.dominant();
                    if (dominant) {
                        for (const period of Object.keys(dominant)) {
                            if (this.data[`current_${period}`] !== dominant[period]) {
                                if (dominant.hasOwnProperty('year') || dominant.hasOwnProperty('month')) {
                                    this.data.current_year = dominant.year;
                                    this.data.current_month = dominant.month;
                                    this.data.current_decade = getDecade(dominant.year);
                                }
                                if (dominant.hasOwnProperty('decade'))
                                    this.data.current_decade = dominant.decade;

                                hapticTick(this.options.hapticFeedback !== false);
                                this.#updateHeader();
                                break
                            }
                        }
                    }
                },
                updatePeriod: (direction) => this.virtualizer.update(direction),
                scrollSpeed: this.options.scrollSpeed
            });

            this.dom.$type_switcher.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this.#switchViewType(++this.#viewNumber);
            });

            this.dom.$body.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();

                const $view_clicker = e.target.closest('[data-click]');
                const $day = e.target.closest('[data-day]');

                if ($view_clicker) {
                    if (
                        $view_clicker.classList.contains('RollDate__calendar__month--disabled') ||
                        $view_clicker.classList.contains('RollDate__calendar__year--disabled')
                    ) {
                        return
                    }
                    this.data.current_month = Number($view_clicker.dataset.month);
                    this.data.current_year = Number($view_clicker.dataset.year);
                    this.data.current_decade = getDecade(this.data.current_year);
                    const view = $view_clicker.dataset.click;
                    this.#switchViewType(this.#viewPeriodNames.indexOf(view));
                }

                if ($day) {
                    if ($day.classList.contains('RollDate__calendar__day--disabled')) {
                        return
                    }
                    const date = this.#applyTimeToDate(new Date(
                        Number($day.dataset.year),
                        Number($day.dataset.month),
                        Number($day.dataset.day)
                    ));

                    if (this.options.selectType === 'single') {
                        this.$container.querySelectorAll('[data-day]').forEach(item => {
                            item.classList.remove('RollDate__calendar__day--selected');
                        });
                        $day.classList.add('RollDate__calendar__day--selected');

                        this.#selectedDates = [date];
                        this.options.selectDate(date);
                        this.#updateInputValue();
                        this.#activeDateStamp = this.#toDateStamp(date);
                        this.#syncDayTabindex({ focus: false });
                        if (this.mode === 'popup' && this.options.closeOnSelect) this.close({ restoreFocus: true });
                    }

                    if (this.options.selectType === 'range') {
                        const clickStamp = this.#toDateStamp(date);
                        const isClickInRange = this.#selectedDates.length === 2 &&
                            clickStamp >= this.#toDateStamp(this.#selectedDates[0]) &&
                            clickStamp <= this.#toDateStamp(this.#selectedDates[1]);

                        if (this.#selectedDates.length === 2 && !isClickInRange) {
                            this.#clearRangeSelection();
                        }

                        if (this.#selectedDates.length === 0) {
                            this.#selectedDates = [date];
                            $day.classList.add('RollDate__calendar__day--range-first');
                        } else {
                            const firstDate = this.#selectedDates[0];
                            const firstStamp = this.#toDateStamp(firstDate);
                            if (clickStamp > firstStamp) {
                                this.#selectedDates = [firstDate, date];

                                this.$container.querySelectorAll('[data-day]').forEach(dayEl => {
                                    const dayDate = new Date(
                                        Number(dayEl.dataset.year),
                                        Number(dayEl.dataset.month),
                                        Number(dayEl.dataset.day)
                                    );
                                    const stamp = this.#toDateStamp(dayDate);

                                    if (stamp === firstStamp) {
                                        dayEl.classList.add('RollDate__calendar__day--range-first');
                                    } else if (stamp === clickStamp) {
                                        dayEl.classList.add('RollDate__calendar__day--range-last');
                                    } else if (stamp > firstStamp && stamp < clickStamp) {
                                        dayEl.classList.add('RollDate__calendar__day--range-selected');
                                    }
                                });
                            } else if (clickStamp < firstStamp) {
                                this.#selectedDates = [date];
                                $day.classList.add('RollDate__calendar__day--range-first');

                                this.$container.querySelector('.RollDate__calendar__day--range-first:not([data-day="' + date.getDate() + '"])')
                                    ?.classList.remove('RollDate__calendar__day--range-first');
                            }
                        }

                        this.#syncPresetState();
                        this.options.selectDate([...this.#selectedDates]);
                        this.#updateInputValue();
                        this.#activeDateStamp = this.#toDateStamp(date);
                        this.#syncDayTabindex({ focus: false });

                        if (this.mode === 'popup' && this.#selectedDates.length === 2 && this.options.closeOnSelect) {
                            this.close({ restoreFocus: true });
                        }
                    }

                    if (this.options.selectType === 'multi') {
                        const clickStamp = this.#toDateStamp(date);
                        const isSelected = this.#selectedDates.some(
                            d => this.#toDateStamp(d) === clickStamp
                        );
                        if (isSelected) {
                            this.#selectedDates = this.#selectedDates.filter(
                                d => this.#toDateStamp(d) !== clickStamp
                            );
                            $day.classList.remove('RollDate__calendar__day--selected');
                        } else {
                            this.#selectedDates.push(date);
                            $day.classList.add('RollDate__calendar__day--selected');
                        }
                        this.options.selectDate(this.#selectedDates);
                        this.#updateInputValue();
                        this.#activeDateStamp = this.#toDateStamp(date);
                        this.#syncDayTabindex({ focus: false });
                        if (this.mode === 'popup' && this.options.closeOnSelect) {
                            this.close({ restoreFocus: true });
                        }
                    }
                }

                this.scroll.resetMinScroll();
            });

            this.dom.$body.addEventListener('mousemove', e => {
                const $day = e.target.closest('[data-day]');
                if (!$day) return
                if ($day.classList.contains('RollDate__calendar__day--disabled')) return

                const hoveredDate = new Date(
                    Number($day.dataset.year),
                    Number($day.dataset.month),
                    Number($day.dataset.day)
                );
                this.options.onHoverDate(hoveredDate, {
                    period: this.period,
                    selectedDates: [...this.#selectedDates]
                });
            });

            this.dom.$body.addEventListener('mouseleave', () => {
                this.options.onHoverDate(null, {
                    period: this.period,
                    selectedDates: [...this.#selectedDates]
                });
            });

            this.dom.$page_switcher.forEach($button => {
                $button.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (this.#arrowAnimating) return

                    const direction = e.currentTarget?.dataset?.direction;
                    if (direction !== 'prev' && direction !== 'next') return
                    const shift = direction === 'prev' ? -1 : 1;
                    const minYear = this.options.minDate.getFullYear();
                    const maxYear = this.options.maxDate.getFullYear();

                    if (this.period === 'day') {
                        const current = new Date(this.data.current_year, this.data.current_month, 1);
                        const target = new Date(this.data.current_year, this.data.current_month + shift, 1);
                        const minMonth = new Date(this.options.minDate.getFullYear(), this.options.minDate.getMonth(), 1);
                        const maxMonth = new Date(this.options.maxDate.getFullYear(), this.options.maxDate.getMonth(), 1);

                        if (target < minMonth || target > maxMonth) return
                        if (target.getTime() === current.getTime()) return

                        this.data.current_year = target.getFullYear();
                        this.data.current_month = target.getMonth();
                        this.data.current_decade = getDecade(this.data.current_year);
                        if (this.#activeDateStamp != null) {
                            const prev = new Date(this.#activeDateStamp);
                            const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
                            this.#activeDateStamp = this.#toDateStamp(
                                new Date(target.getFullYear(), target.getMonth(), Math.min(prev.getDate(), last))
                            );
                        }
                    } else if (this.period === 'month') {
                        const targetYear = this.data.current_year + shift;
                        if (targetYear < minYear || targetYear > maxYear) return

                        this.data.current_year = targetYear;
                        this.data.current_decade = getDecade(targetYear);
                    } else if (this.period === 'year') {
                        const currentDecade = getDecade(this.data.current_year);
                        const targetDecade = currentDecade + shift * 10;
                        const minDecade = getDecade(minYear);
                        const maxDecade = getDecade(maxYear);

                        if (targetDecade < minDecade || targetDecade > maxDecade) return

                        this.data.current_year = targetDecade;
                        this.data.current_decade = targetDecade;
                    }

                    this.#arrowAnimating = true;
                    hapticTick(this.options.hapticFeedback !== false);
                    this.#updateView(this.#viewNumber, {
                        animate: true,
                        shift,
                        onScrollComplete: () => {
                            this.#arrowAnimating = false;
                        }
                    });
                });
            });

            this.#calendarKeyHandler = (e) => this.#handleCalendarKeyDown(e);
            this.$container.addEventListener('keydown', this.#calendarKeyHandler);
        }

        #bindTrigger(element, type, handler) {
            element.addEventListener(type, handler);
            this.#triggerListeners.push({ element, type, handler });
        }

        #handleInputKeyDown(e, trigger) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.open({ source: trigger });
                return
            }
            if (e.key === 'Escape' && this.mode === 'popup' && this.$container.style.display !== 'none') {
                e.preventDefault();
                this.close({ restoreFocus: true });
            }
        }

        #resolveDefaultActiveDate() {
            let candidate = null;
            if (this.#selectedDates.length) {
                if (
                    this.options.selectType === 'range' &&
                    this.#focusReturnEl &&
                    this.$endInput &&
                    this.#focusReturnEl === this.$endInput &&
                    this.#selectedDates[1]
                ) {
                    candidate = this.#selectedDates[1];
                } else {
                    candidate = this.#selectedDates[0];
                }
            } else if (this.options.startDate) {
                candidate = this.options.startDate;
            } else {
                candidate = new Date();
            }

            const day = startOfDay(candidate);
            if (!this.#isDayUnavailable(day)) return day
            return nearestAvailableDate(
                day,
                date => this.#isDayUnavailable(date),
                this.options.minDate,
                this.options.maxDate
            )
        }

        #enabledDayElements() {
            return [...this.$container.querySelectorAll('.RollDate__calendar__day')].filter(el =>
                !el.disabled && !el.classList.contains('RollDate__calendar__day--disabled')
            )
        }

        #closestEnabledDay(days) {
            if (!days.length) return null
            const stamp = this.#activeDateStamp;
            if (stamp == null) return days[0]
            let best = days[0];
            let bestDelta = Math.abs(this.#dayElementStamp(best) - stamp);
            for (const day of days) {
                const delta = Math.abs(this.#dayElementStamp(day) - stamp);
                if (delta < bestDelta) {
                    best = day;
                    bestDelta = delta;
                }
            }
            return best
        }

        #syncDayTabindex({ focus = false } = {}) {
            if (this.period !== 'day') return
            const enabled = this.#enabledDayElements();
            enabled.forEach(el => { el.tabIndex = -1; });
            if (!enabled.length) return

            if (this.#activeDateStamp == null) {
                this.#activeDateStamp = this.#toDateStamp(this.#resolveDefaultActiveDate());
            }

            let active = this.#findDayElement(new Date(this.#activeDateStamp));
            if (!active || active.disabled || active.classList.contains('RollDate__calendar__day--disabled')) {
                active = this.#closestEnabledDay(enabled);
            }
            if (!active) return
            active.tabIndex = 0;
            this.#syncDayAccessibleName();
            if (focus && this.$container.style.display !== 'none') {
                active.focus({ preventScroll: true });
            }
            if (this.dom?.$body) this.dom.$body.scrollTop = 0;
        }

        #syncDayAccessibleName() {
            const selectedLabel = this.options.selectedLabel || getTranslation('selected', this.options.locale);
            this.$container.querySelectorAll('.RollDate__calendar__day').forEach(dayEl => {
                dayEl.removeAttribute('aria-selected');
                const date = new Date(
                    Number(dayEl.dataset.year),
                    Number(dayEl.dataset.month),
                    Number(dayEl.dataset.day)
                );
                const selected = dayEl.classList.contains('RollDate__calendar__day--selected') ||
                    dayEl.classList.contains('RollDate__calendar__day--range-first') ||
                    dayEl.classList.contains('RollDate__calendar__day--range-last') ||
                    dayEl.classList.contains('RollDate__calendar__day--range-selected');
                let label = formatDayLabel(date, this.options.locale);
                if (selected) label += `, ${selectedLabel}`;
                dayEl.setAttribute('aria-label', label);
                if (dayEl.disabled) {
                    dayEl.removeAttribute('aria-pressed');
                } else {
                    dayEl.setAttribute('aria-pressed', selected ? 'true' : 'false');
                }
            });
        }

        #onVirtualizeRefresh() {
            if (this.period !== 'day') return
            this.#syncDayTabindex({ focus: false });
        }

        #activateDate(date, { focus = true, direction = 0 } = {}) {
            const day = startOfDay(date);
            const monthChanged =
                this.data.current_year !== day.getFullYear() ||
                this.data.current_month !== day.getMonth();
            this.#activeDateStamp = this.#toDateStamp(day);

            if (monthChanged || !this.#findDayElement(day)) {
                this.#focusAfterView = focus;
                this.goToDate(day);
                return
            }

            this.data.current_decade = getDecade(day.getFullYear());
            this.#updateHeader();
            this.#syncDayTabindex({ focus });
            this.#scrollDayIntoView(day);

            if (direction && this.scroll) {
                this.scroll.checkMinScroll();
                this.scroll.checkEdge(direction < 0 ? 'up' : 'down');
                if (!this.#findDayElement(day)) {
                    this.#focusAfterView = focus;
                    this.goToDate(day);
                    return
                }
                this.#syncDayTabindex({ focus });
                this.#scrollDayIntoView(day);
            }
        }

        #scrollDayIntoView(date) {
            if (this.period !== 'day' || !this.scroll || !this.dom?.$body) return
            const dayEl = this.#findDayElement(date);
            if (!dayEl) return

            this.scroll.checkMinScroll();
            const bodyRect = this.dom.$body.getBoundingClientRect();
            const dayRect = dayEl.getBoundingClientRect();
            const pad = 2;

            if (dayRect.top >= bodyRect.top - pad && dayRect.bottom <= bodyRect.bottom + pad) return

            let next = this.scroll.offset;
            if (dayRect.top < bodyRect.top + pad) {
                next -= dayRect.top - (bodyRect.top + pad);
            } else {
                next -= dayRect.bottom - (bodyRect.bottom - pad);
            }
            this.scroll.offset = next;
        }

        #moveActiveDate(nextDate, direction) {
            const found = findAvailableDate(
                nextDate,
                direction,
                date => this.#isDayUnavailable(date),
                this.options.minDate,
                this.options.maxDate
            );
            if (!found) return
            this.#activateDate(found, { focus: true, direction });
        }

        #handleCalendarKeyDown(e) {
            if (e.key === 'Escape' && this.mode === 'popup' && this.$container.style.display !== 'none') {
                e.preventDefault();
                this.close({ restoreFocus: true });
                return
            }

            if (this.period !== 'day') return
            const dayEl = e.target.closest?.('.RollDate__calendar__day');
            if (!dayEl || dayEl.disabled) return

            const current = startOfDay(new Date(
                Number(dayEl.dataset.year),
                Number(dayEl.dataset.month),
                Number(dayEl.dataset.day)
            ));

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.#moveActiveDate(addDays(current, -1), -1);
                return
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.#moveActiveDate(addDays(current, 1), 1);
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.#moveActiveDate(addDays(current, -7), -1);
                return
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.#moveActiveDate(addDays(current, 7), 1);
                return
            }
            if (e.key === 'Home') {
                e.preventDefault();
                this.#moveActiveDate(adjustToWeekStart(current, this.options.startWeekFromMonday), -1);
                return
            }
            if (e.key === 'End') {
                e.preventDefault();
                this.#moveActiveDate(adjustToWeekEnd(current, this.options.startWeekFromMonday), 1);
                return
            }
            if (e.key === 'PageUp') {
                e.preventDefault();
                const target = e.shiftKey ? addYears(current, -1) : addMonths(current, -1);
                this.#moveActiveDate(target, -1);
                return
            }
            if (e.key === 'PageDown') {
                e.preventDefault();
                const target = e.shiftKey ? addYears(current, 1) : addMonths(current, 1);
                this.#moveActiveDate(target, 1);
                return
            }
        }

        #switchViewType(type) {
            const prevPeriod = this.period;
            if (type > 2) {
                type = this.period = 2;
                return
            }

            this.scroll.resetMinScroll();
            this.period = type;
            this.#updateView(this.period);

            for (const period of this.#viewPeriodNames)
                this.$container.classList.remove('RollDate__calendar__type--' + period + 's');

            this.$container.classList.add('RollDate__calendar__type--' + this.#viewPeriodNames[type] + 's');

            this.options.onViewChange({
                from: prevPeriod,
                to: this.period,
                current: {
                    year: this.data.current_year,
                    month: this.data.current_month,
                    decade: this.data.current_decade
                }
            });
        }

        #clearContent(type) {
            if (type !== 2) this.dom.$years_block.innerHTML = '';
            if (type !== 1) this.dom.$months_block.innerHTML = '';
            if (type !== 0) this.dom.$days_block.innerHTML = '';
        }

        #scrollToStartDate() {
            requestAnimationFrame(() => {
                this.scroll.checkMinScroll();

                const targetDate = this.options.startDate;
                const $targetEl = this.$container.querySelector(
                    `[data-year="${targetDate.getFullYear()}"][data-month="${targetDate.getMonth()}"]`
                );

                if ($targetEl) {
                    const containerRect = this.dom.$body.querySelector('.RollDate__calendar__scrollblock').getBoundingClientRect();
                    const targetRect = $targetEl.getBoundingClientRect();
                    const offset = -(targetRect.top - containerRect.top);

                    this.scroll.offset = offset;
                }
            });
        }

        get period() {
            return this.#viewPeriodNames[this.#viewNumber]
        }
        set period(number) {
            this.#viewNumber = number;
        }
        get selectedDates() {
            return this.#selectedDates
        }

        /** Visible calendar month (updates while scrolling). Month is 0–11. */
        getViewMonth() {
            return {
                year: this.data.current_year,
                month: this.data.current_month
            }
        }

        /** First day of the month currently shown in the calendar. */
        getViewDate() {
            const { year, month } = this.getViewMonth();
            return new Date(year, month, 1)
        }

        setDisabledDates(dates = []) {
            this.options.disabledDates = Array.isArray(dates) ? [...dates] : [];
            this.#compileAvailability();
            this.#syncSelectedWithDisabledDates();
            this.#refreshAvailabilityView();
        }

        setEnabledDates(dates) {
            if (dates !== undefined && !Array.isArray(dates)) {
                console.warn('RollDate: enabledDates must be an array or undefined');
                return
            }

            this.#normalizeEnabledDates(dates);
            this.#compileAvailability();
            this.#syncSelectedWithDisabledDates();
            this.#refreshAvailabilityView();
        }

        disableDate(dateLike) {
            const normalized = this.#normalizeDateInput(dateLike);
            if (!normalized) return
            const stamp = this.#toDateStamp(normalized);
            const already = (this.options.disabledDates || []).some(rule => {
                if (typeof rule === 'function' || (rule && typeof rule === 'object' && !(rule instanceof Date))) {
                    return false
                }
                const parsed = this.#normalizeDateInput(rule);
                return parsed && this.#toDateStamp(parsed) === stamp
            });
            if (!already) {
                this.options.disabledDates = [...(this.options.disabledDates || []), new Date(normalized)];
            }
            this.#compileAvailability();
            this.#syncSelectedWithDisabledDates();
            this.#refreshAvailabilityView();
        }

        enableDate(dateLike) {
            const normalized = this.#normalizeDateInput(dateLike);
            if (!normalized) return
            const stamp = this.#toDateStamp(normalized);
            this.options.disabledDates = (this.options.disabledDates || []).filter(rule => {
                if (typeof rule === 'function' || (rule && typeof rule === 'object' && !(rule instanceof Date))) {
                    return true
                }
                const parsed = this.#normalizeDateInput(rule);
                return !parsed || this.#toDateStamp(parsed) !== stamp
            });
            this.#compileAvailability();
            this.#refreshAvailabilityView();
        }

        isDateDisabled(dateLike) {
            const normalized = this.#normalizeDateInput(dateLike);
            return normalized ? this.#isDateDisabled(normalized) : true
        }

        setHighlightDates(dates = []) {
            this.options.highlightDates = Array.isArray(dates) ? dates : [];
            this.#highlightDateMap = this.#buildHighlightDateMap(this.options.highlightDates);
            this.#refreshHighlightView();
        }

        highlightDate(dateLike, color) {
            const normalized = this.#normalizeDateInput(dateLike);
            if (!normalized) return

            const stamp = this.#toDateStamp(normalized);
            const existing = this.#highlightDateMap.get(stamp) || [];
            const nextColor = color == null || color === ''
                ? null
                : this.#sanitizeHighlightColor(color);

            if (color != null && color !== '' && nextColor === undefined) return

            existing.push(nextColor ?? null);
            this.#highlightDateMap.set(stamp, existing);
            this.options.highlightDates = this.#highlightMapToOptionsArray();
            this.#refreshHighlightView();
        }

        unhighlightDate(dateLike, color) {
            const normalized = this.#normalizeDateInput(dateLike);
            if (!normalized) return

            const stamp = this.#toDateStamp(normalized);
            const existing = this.#highlightDateMap.get(stamp);
            if (!existing?.length) return

            if (color === undefined) {
                this.#highlightDateMap.delete(stamp);
            } else {
                const target = color == null || color === ''
                    ? null
                    : this.#sanitizeHighlightColor(color);

                const index = existing.findIndex(item => item === target);
                if (index === -1) return

                existing.splice(index, 1);
                if (existing.length) {
                    this.#highlightDateMap.set(stamp, existing);
                } else {
                    this.#highlightDateMap.delete(stamp);
                }
            }

            this.options.highlightDates = this.#highlightMapToOptionsArray();
            this.#refreshHighlightView();
        }

        isDateHighlighted(dateLike) {
            const normalized = this.#normalizeDateInput(dateLike);
            return normalized ? this.#isDateHighlighted(normalized) : false
        }

        getHighlightColors(dateLike) {
            const normalized = this.#normalizeDateInput(dateLike);
            if (!normalized) return []
            return [...(this.#highlightDateMap.get(this.#toDateStamp(normalized)) || [])]
        }

        getHighlightColor(dateLike) {
            return this.getHighlightColors(dateLike).find(color => color != null) ?? null
        }

        goToDate(dateLike) {
            const normalized = this.#normalizeDateInput(dateLike);
            if (!normalized) return false

            const clamped = this.#clampDateToRange(
                normalized,
                this.options.minDate,
                this.options.maxDate
            );

            this.data.current_year = clamped.getFullYear();
            this.data.current_month = clamped.getMonth();
            this.data.current_decade = getDecade(clamped.getFullYear());

            if (this.#viewNumber !== 0) {
                this.#viewNumber = 0;
                for (const period of this.#viewPeriodNames) {
                    this.$container.classList.remove('RollDate__calendar__type--' + period + 's');
                }
                this.$container.classList.add('RollDate__calendar__type--days');
            }

            this.#updateView(0);
            return true
        }

        getValue() {
            if (this.options.selectType === 'single') {
                const date = this.#selectedDates[0];
                return date ? new Date(date.getTime()) : null
            }

            return this.#selectedDates.map(date => new Date(date.getTime()))
        }

        setValue(value) {
            if (value == null || value === '') {
                this.clearSelection();
                return true
            }

            if (this.options.selectType === 'single') {
                const normalized = this.#normalizeDateInput(value);
                if (!normalized || this.#isDateDisabled(normalized)) return false
                this.#selectedDates = [this.#applyTimeToDate(normalized)];
            } else if (this.options.selectType === 'range') {
                const raw = Array.isArray(value) ? value : [value];
                const parsed = raw
                    .map(item => this.#normalizeDateInput(item))
                    .filter(Boolean)
                    .map(date => this.#clampDateToRange(date, this.options.minDate, this.options.maxDate))
                    .filter(date => !this.#isDateDisabled(date));

                if (!parsed.length) return false

                let start = parsed[0];
                let end = parsed.length > 1 ? parsed[1] : parsed[0];
                if (start > end) [start, end] = [end, start];

                this.#selectedDates = parsed.length > 1
                    ? [this.#applyTimeToDate(start), this.#applyTimeToDate(end)]
                    : [this.#applyTimeToDate(start)];
            } else {
                const raw = Array.isArray(value) ? value : [value];
                const parsed = raw
                    .map(item => this.#normalizeDateInput(item))
                    .filter(Boolean)
                    .map(date => this.#clampDateToRange(date, this.options.minDate, this.options.maxDate))
                    .filter(date => !this.#isDateDisabled(date))
                    .map(date => this.#applyTimeToDate(date));

                if (!parsed.length) return false

                const unique = [];
                const seen = new Set();
                parsed.forEach(date => {
                    const stamp = this.#toDateStamp(date);
                    if (seen.has(stamp)) return
                    seen.add(stamp);
                    unique.push(date);
                });
                this.#selectedDates = unique;
            }

            this.#paintSelection();
            this.#notifySelectionChange();
            this.#updateInputValue();
            return true
        }

        #dayElementStamp(dayEl) {
            return this.#toDateStamp(new Date(
                Number(dayEl.dataset.year),
                Number(dayEl.dataset.month),
                Number(dayEl.dataset.day)
            ))
        }

        #findDayElement(date) {
            if (!(date instanceof Date)) return null
            return this.$container.querySelector(
                `.RollDate__calendar__day[data-year="${date.getFullYear()}"][data-month="${date.getMonth()}"][data-day="${date.getDate()}"]`
            )
        }

        #paintRangeSelection() {
            this.$container.querySelectorAll('[data-day]').forEach(dayEl => {
                dayEl.classList.remove(
                    'RollDate__calendar__day--range-first',
                    'RollDate__calendar__day--range-last',
                    'RollDate__calendar__day--range-selected'
                );
            });
            this.#syncPresetState();

            if (!this.#selectedDates.length) return

            const firstStamp = this.#toDateStamp(this.#selectedDates[0]);

            if (this.#selectedDates.length === 1) {
                this.#findDayElement(this.#selectedDates[0])
                    ?.classList.add('RollDate__calendar__day--range-first');
                return
            }

            const endStamp = this.#toDateStamp(this.#selectedDates[1]);

            this.$container.querySelectorAll('[data-day]').forEach(dayEl => {
                const stamp = this.#dayElementStamp(dayEl);

                if (stamp === firstStamp) {
                    dayEl.classList.add('RollDate__calendar__day--range-first');
                } else if (stamp === endStamp) {
                    dayEl.classList.add('RollDate__calendar__day--range-last');
                } else if (stamp > firstStamp && stamp < endStamp) {
                    dayEl.classList.add('RollDate__calendar__day--range-selected');
                }
            });
        }

        #paintSingleSelection() {
            this.$container.querySelectorAll('[data-day]').forEach(dayEl => {
                dayEl.classList.remove('RollDate__calendar__day--selected');
            });

            const selected = this.#selectedDates[0];
            if (selected) {
                this.#findDayElement(selected)?.classList.add('RollDate__calendar__day--selected');
            }
        }

        #paintMultiSelection() {
            const selectedStamps = new Set(this.#selectedDates.map(date => this.#toDateStamp(date)));

            this.$container.querySelectorAll('[data-day]').forEach(dayEl => {
                if (selectedStamps.has(this.#dayElementStamp(dayEl))) {
                    dayEl.classList.add('RollDate__calendar__day--selected');
                } else {
                    dayEl.classList.remove('RollDate__calendar__day--selected');
                }
            });
        }

        #paintSelection() {
            if (this.options.selectType === 'range') {
                this.#paintRangeSelection();
            } else if (this.options.selectType === 'multi') {
                this.#paintMultiSelection();
            } else {
                this.#paintSingleSelection();
            }
            this.#syncDayAccessibleName();
        }

        #clearRangeSelection() {
            this.#selectedDates = [];
            this.$container.querySelectorAll('[data-day]').forEach(item => {
                item.classList.remove(
                    'RollDate__calendar__day--range-first',
                    'RollDate__calendar__day--range-last',
                    'RollDate__calendar__day--range-selected'
                );
            });
        }

        #clearMultiSelection() {
            this.#selectedDates = [];
            this.$container.querySelectorAll('[data-day].RollDate__calendar__day--selected')
                .forEach(el => el.classList.remove('RollDate__calendar__day--selected'));
        }

        #updateInputValue() {
            if (this.mode !== 'popup') return

            const format = (date) => this.#formatDateTime(date);

            if (this.$endInput) {
                if (this.#selectedDates.length >= 1) {
                    this.$startInput.value = format(this.#selectedDates[0]);
                } else {
                    this.$startInput.value = '';
                }

                if (this.#selectedDates.length === 2) {
                    this.$endInput.value = format(this.#selectedDates[1]);
                } else {
                    this.$endInput.value = '';
                }
            } else {
                const target = this.$trigger;
                if (target.tagName === 'INPUT') {
                    if (this.options.selectType === 'single' && this.#selectedDates.length > 0) {
                        target.value = format(this.#selectedDates[0]);
                    } else if (this.options.selectType === 'range') {
                        if (this.#selectedDates.length === 1) {
                            target.value = `${format(this.#selectedDates[0])} - `;
                        } else if (this.#selectedDates.length === 2) {
                            target.value = `${format(this.#selectedDates[0])} - ${format(this.#selectedDates[1])}`;
                        } else {
                            target.value = '';
                        }
                    } else if (this.options.selectType === 'multi' && this.#selectedDates.length > 0) {
                        target.value = this.#selectedDates.map(format).join(', ');
                    } else {
                        target.value = '';
                    }
                }
            }
        }

        #parseInputValue(value) {
            if (!value) {
                this.#selectedDates = [];
                this.#updateView(this.#viewNumber);
                return
            }

            try {
                if (this.options.selectType === 'single') {
                    const date = parseDate(value, this.options.dateFormat);
                    if (date && !this.#isDateDisabled(date)) {
                        this.#selectedDates = [date];
                        this.data.current_year = date.getFullYear();
                        this.data.current_month = date.getMonth();
                        this.#updateView(this.#viewNumber);
                    }
                } else if (this.options.selectType === 'range') {
                    const dates = value.split(/\s+-\s+/).map(part => part.trim());
                    const parsedDates = dates
                        .filter(d => d)
                        .map(d => parseDate(d, this.options.dateFormat))
                        .filter(d => !this.#isDateDisabled(d))
                        .filter(d => d);

                    if (parsedDates.length > 0) {
                        this.#selectedDates = parsedDates;
                        if (parsedDates.length >= 1) {
                            this.data.current_year = parsedDates[0].getFullYear();
                            this.data.current_month = parsedDates[0].getMonth();
                        }
                        this.#updateView(this.#viewNumber);
                    }
                } else if (this.options.selectType === 'multi') {
                    const dates = value.split(',').map(part => part.trim());
                    const parsedDates = dates
                        .filter(d => d)
                        .map(d => parseDate(d, this.options.dateFormat))
                        .filter(d => !this.#isDateDisabled(d))
                        .filter(d => d);

                    if (parsedDates.length > 0) {
                        this.#selectedDates = parsedDates;
                        this.data.current_year = parsedDates[0].getFullYear();
                        this.data.current_month = parsedDates[0].getMonth();
                        this.#updateView(this.#viewNumber);
                    }
                }
            } catch (e) {
                console.warn('Invalid date format:', value);
            }
        }

        open(opts = {}) {
            if (opts.source) {
                this.#focusReturnEl = opts.source;
            } else if (this.#openTriggers.includes(document.activeElement)) {
                this.#focusReturnEl = document.activeElement;
            } else if (this.$endInput && document.activeElement === this.$endInput) {
                this.#focusReturnEl = this.$endInput;
            } else {
                this.#focusReturnEl = this.$startInput || this.$trigger;
            }

            if (this.mode === 'popup') {
                this.#closeOtherPopups();
            }

            const wasOpen = this.$container.style.display !== 'none';
            this.$container.style.display = '';

            if (this.mode === 'popup') {
                this.#activeDateStamp = this.#toDateStamp(this.#resolveDefaultActiveDate());
                this.#positionCalendar();

                if (this.#firstOpen) {
                    this.#scrollToStartDate();
                    this.#firstOpen = false;
                    requestAnimationFrame(() => this.#syncDayTabindex({ focus: true }));
                } else {
                    this.#focusAfterView = true;
                    this.#updateView(this.#viewNumber);
                }
            } else {
                if (!this.dom?.$body) {
                    this.#updateView(this.#viewNumber);
                }
            }

            if (!wasOpen) {
                this.options.onOpen({
                    period: this.period,
                    selectedDates: [...this.#selectedDates]
                });
            }
        }

        close(opts = {}) {
            const wasOpen = this.$container.style.display !== 'none';
            this.$container.style.display = 'none';
            if (this.mode === 'popup') {
                if (opts.restoreFocus && this.#focusReturnEl && typeof this.#focusReturnEl.focus === 'function') {
                    this.#ignoreFocusOpen = true;
                    this.#focusReturnEl.focus();
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            this.#ignoreFocusOpen = false;
                        }, 0);
                    });
                } else {
                    const triggers = this.$endInput ? [this.$startInput, this.$endInput] :
                        this.$openTrigger ? [this.$openTrigger] : [this.$trigger];

                    triggers.forEach(trigger => {
                        if (trigger && typeof trigger.blur === 'function') {
                            trigger.blur();
                        }
                    });
                }
            }

            if (wasOpen) {
                this.options.onClose({
                    period: this.period,
                    selectedDates: [...this.#selectedDates]
                });
            }
        }

        selectToday() {
            const now = new Date();
            const dayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (this.#isDateDisabled(dayOnly)) return

            this.data.current_year = now.getFullYear();
            this.data.current_month = now.getMonth();
            this.data.current_decade = getDecade(now.getFullYear());

            if (this.options.enableTime && this.timePicker) {
                this.timePicker.setTime(now.getHours(), now.getMinutes());
            }

            const selected = this.#applyTimeToDate(now);

            if (this.options.selectType === 'single') {
                this.#selectedDates = [selected];
            } else if (this.options.selectType === 'range') {
                this.#selectedDates = [selected];
            } else if (this.options.selectType === 'multi') {
                const selectedStamp = this.#toDateStamp(selected);
                const exists = this.#selectedDates.some(d => this.#toDateStamp(d) === selectedStamp);
                if (!exists) this.#selectedDates.push(selected);
            }

            this.#updateView(this.#viewNumber);
            this.#notifySelectionChange();
            this.#updateInputValue();

            if (this.mode === 'popup' && this.options.closeOnSelect && this.options.selectType === 'single') {
                this.close({ restoreFocus: true });
            }
        }

        clearSelection() {
            if (this.options.selectType === 'range') {
                this.#clearRangeSelection();
            } else if (this.options.selectType === 'multi') {
                this.#clearMultiSelection();
            } else {
                this.#selectedDates = [];
                this.$container.querySelectorAll('[data-day].RollDate__calendar__day--selected')
                    .forEach(el => el.classList.remove('RollDate__calendar__day--selected'));
            }

            this.#notifySelectionChange();
            this.#updateInputValue();
        }

        destroy() {
            if (this.#docClickHandler) {
                document.removeEventListener('click', this.#docClickHandler);
                this.#docClickHandler = null;
            }
            if (this.#calendarKeyHandler) {
                this.$container.removeEventListener('keydown', this.#calendarKeyHandler);
                this.#calendarKeyHandler = null;
            }
            this.#triggerListeners.forEach(({ element, type, handler }) => {
                element.removeEventListener(type, handler);
            });
            this.#triggerListeners = [];
            RollDate.#instances.delete(this);
            this.observe.disconnect();
            this.scroll?.destroy();
            this.timePicker?.destroy();
            if (this.$container.parentNode) {
                this.$container.parentNode.removeChild(this.$container);
            }
        }
    }

    if (typeof window !== 'undefined') {
        window.RollDate = RollDate;
    }

    return RollDate;

})();
