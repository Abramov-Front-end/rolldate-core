/*!
 * RollDate
 * Human-readable build for review and customization.
 */

var RollDate = (function () {
    'use strict';

    function getDecade(year) {
        return Math.floor(year / 10) * 10
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

    /**
     * Light tick feedback for scroll snaps (month/year/time).
     * Uses Vibration API when available; otherwise a soft click (helps on iOS).
     */
    function hapticTick(enabled = true) {
        if (!enabled || typeof window === 'undefined') return
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
            return new Date(clean)
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

    class Observe {
        constructor(container) {
            this.$container = container;
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
            }, { threshold: 0.5 })
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
                const isDisabledByCustomRule = this.options.isDateDisabled ? this.options.isDateDisabled(d) : false;
                const isDisabled = (
                    (this.options.minDate && d < this.options.minDate) ||
                    (this.options.maxDate && d > this.options.maxDate) ||
                    isDisabledByCustomRule
                );
                dates.push({
                    date: new Date(d),
                    disabled: isDisabled
                });
            }

            return dates
        }

        getMonthsOrYears(period) {

            let upYear = this.current_year - (period === 'month' ? 5 : 18);
            let downYear = this.current_year + (period === 'month' ? 5 : 18);

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

            }

            // For month/year views bounds must match the currently generated window.
            // Otherwise, after switching view type (e.g. month -> year near edges),
            // stale bounds can cause endless add/remove virtualization loops.
            this.up_date = new Date(upYear, 0, 1);
            this.down_date = new Date(downYear + 1, 0, 0);

            const items = [];

            for (let y = upYear; y <= downYear; y++) {
                if (period === 'month') {
                    for (let m = 0; m < 12; m++) {
                        const date = new Date(y, m, 1);
                        const monthEnd = new Date(y, m + 1, 0);

                        let disabled = false;

                        if (this.options.minDate && monthEnd < this.options.minDate) {
                            disabled = true;
                        } else if (this.options.maxDate && date > this.options.maxDate) {
                            disabled = true;
                        }

                        items.push({ date, disabled });
                    }
                } else { // 'year'
                    const date = new Date(y, 0, 1);
                    let disabled = false;

                    if (this.options.minDate && y < this.options.minDate.getFullYear()) {
                        disabled = true;
                    } else if (this.options.maxDate && y > this.options.maxDate.getFullYear()) {
                        disabled = true;
                    }

                    items.push({ date, disabled });
                }
            }

            if (items.length < 16) {
                let extraYear = downYear + 1;
                while (items.length < 16) {
                    if (period === 'month') {
                        for (let m = 0; m < 12 && items.length < 16; m++) {
                            items.push({
                                date: new Date(extraYear, m, 1),
                                disabled: true
                            });
                        }
                    } else {
                        items.push({
                            date: new Date(extraYear, 0, 1),
                            disabled: true
                        });
                    }
                    extraYear++;
                }
            }

            return items;
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
            this.hasFooter = Boolean(options.enableTime || (options.footerButtons && options.footerButtons.length));

            this.init();
        }

        init() {
            const footerHtml = this.hasFooter ? `
            <div class="RollDate__footer">
                ${this.enableTime ? '<div class="RollDate__time"></div>' : ''}
                <div class="RollDate__footer__buttons"></div>
            </div>
        ` : '';

            this.$container.innerHTML = `
            <div class="RollDate__header">
                <div class="RollDate__calendar__switcher">
                    <div class="RollDate__header__year"></div>
                    <div class="RollDate__header__month"></div>
                </div>
                <div class="RollDate__calendar__buttons">
                    <button class="RollDate__calendar__button" data-direction="prev">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61 55" width="55" height="50">
                            <path id="Форма 2" fill-rule="evenodd" class="s0" d="m52.76 54.67l-44.73 0.12c-6.16 0.02-10.02-6.64-6.96-11.98l22.26-38.79c3.07-5.35 10.76-5.37 13.86-0.04l22.47 38.67c3.09 5.33-0.74 12.01-6.9 12.02z"/>
                        </svg>
                    </button>
                    <button class="RollDate__calendar__button" data-direction="next">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61 55" width="55" height="50">
                            <path id="Форма 2" fill-rule="evenodd" class="s0" d="m52.76 54.67l-44.73 0.12c-6.16 0.02-10.02-6.64-6.96-11.98l22.26-38.79c3.07-5.35 10.76-5.37 13.86-0.04l22.47 38.67c3.09 5.33-0.74 12.01-6.9 12.02z" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="RollDate__calendar">
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

        dates(array, selectedDates = [], selectType = 'single') {
            let datesHtml = '';
            const today = new Date();

            for (let i = 0; i < array.length; i++) {
                const date = array[i].date;
                const disabledClass = array[i].disabled ? 'RollDate__calendar__day--disabled' : '';
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

                datesHtml += `<div class="RollDate__calendar__day ${disabledClass} ${isToday ? 'RollDate__calendar__day--today' : ''} ${selectionClass}" 
                            data-bind='["year", "month"]'
                            data-year="${date.getFullYear()}"
                            data-month="${date.getMonth()}"  
                            data-day="${date.getDate()}">${date.getDate()}</div>`;
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
        #touchVelocityY = 0
        #touchMomentumId = null
        
        constructor(body, methods = {
            dominant: () => console.error('Function "dominant" is not found'),
            updatePeriod: () => console.error('Function "updatePeriod" is not found')
        }) {

            this.$body = body;
            this.$scroll_block = this.$body.querySelector('.RollDate__calendar__scrollblock');
            this.dominant = methods.dominant;
            this.updatePeriod = methods.updatePeriod;
            this.offset = 0;
            this.init();
        }

        init() {
            this.#boundWheelHandler = this.wheelHandler.bind(this);
            this.$body.addEventListener('wheel', this.#boundWheelHandler, { passive: false });
            this.#boundTouchStartHandler = this.touchStartHandler.bind(this);
            this.#boundTouchMoveHandler = this.touchMoveHandler.bind(this);
            this.#boundTouchEndHandler = this.touchEndHandler.bind(this);
            this.$body.addEventListener('touchstart', this.#boundTouchStartHandler, { passive: true });
            this.$body.addEventListener('touchmove', this.#boundTouchMoveHandler, { passive: false });
            this.$body.addEventListener('touchend', this.#boundTouchEndHandler, { passive: true });
            this.$body.addEventListener('touchcancel', this.#boundTouchEndHandler, { passive: true });
        }

        wheelHandler(e) {
            e.preventDefault();
            e.stopPropagation();

            const rawDelta = e.deltaY * 0.85;
            const steps = Math.abs(rawDelta) > 50 ? 20 : 1;
            const stepSize = rawDelta / steps;
            const currentWheelDirection = rawDelta > 0 ? 'down' : 'up';
            this.#isWheelAnimating = true;
            this.#edgeTriggeredInCurrentWheel = false;

            let i = 0;
            const animate = () => {
                if (i >= steps) {
                    this.#isWheelAnimating = false;
                    this.#edgeTriggeredInCurrentWheel = false;
                    return
                }

                this.offset -= stepSize;

                requestAnimationFrame(() => {
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
            this.#cancelTouchMomentum();
            this.#isTouchDragging = true;
            this.#touchLastY = e.touches[0].clientY;
            this.#touchLastTime = performance.now();
            this.#touchVelocityY = 0;
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
                const instantVelocity = deltaY / dt;
                this.#touchVelocityY = this.#touchVelocityY * 0.65 + instantVelocity * 0.35;
            }

            this.#touchLastY = currentY;
            this.#touchLastTime = now;

            if (Math.abs(deltaY) < 1) return

            this.offset += deltaY;
            this.dominant();

            const direction = deltaY < 0 ? 'down' : 'up';
            this.checkEdge(direction);
        }

        touchEndHandler() {
            this.#isTouchDragging = false;
            this.#edgeTriggeredInCurrentWheel = false;

            const velocityPerFrame = this.#touchVelocityY * 16;
            if (Math.abs(velocityPerFrame) >= 0.4) {
                this.#runTouchMomentum(velocityPerFrame);
            }
        }

        #cancelTouchMomentum() {
            if (this.#touchMomentumId !== null) {
                cancelAnimationFrame(this.#touchMomentumId);
                this.#touchMomentumId = null;
            }
        }

        #runTouchMomentum(velocity) {
            this.#cancelTouchMomentum();

            const step = () => {
                if (Math.abs(velocity) < 0.35 || this.blocked) {
                    this.#touchMomentumId = null;
                    this.#edgeTriggeredInCurrentWheel = false;
                    return
                }

                this.offset += velocity;
                velocity *= 0.92;
                this.dominant();

                const direction = velocity < 0 ? 'down' : 'up';
                this.checkEdge(direction);

                if (this.blocked) {
                    this.#touchMomentumId = null;
                    this.#edgeTriggeredInCurrentWheel = false;
                    return
                }

                this.#touchMomentumId = requestAnimationFrame(step);
            };

            this.#touchMomentumId = requestAnimationFrame(step);
        }

        apply() {
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
            if (this.#minScroll === null) {
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
            const scrollHeight = this.$scroll_block.clientHeight;
            const bodyHeight = this.$body.clientHeight;
            this.#minScroll = scrollHeight > bodyHeight ? -(scrollHeight - bodyHeight) : 0;
        }

        setBaseOffset(value = 0) {
            this.#baseOffset = value;
            this.apply();
        }

        resetMinScroll() {
            this.#minScroll = null;
        }

        destroy() {
            this.#cancelTouchMomentum();
            if (this.#boundWheelHandler) {
                this.$body.removeEventListener('wheel', this.#boundWheelHandler);
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
            const d = date instanceof Date ? date : new Date(date);
            if (this.ctx.options.minDate && d < this.ctx.options.minDate) return true
            if (this.ctx.options.maxDate && d > this.ctx.options.maxDate) return true
            return typeof this.ctx.isDateDisabled === 'function' && this.ctx.isDateDisabled(d)
        }

        update(direction) {
            const period = this.ctx.period;
            const isUp = direction === 'up';

            // Strict boundary checks to stop loading beyond min/max limits.
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
                                newDates.push({
                                    date: new Date(d),
                                    disabled: this.#isDayDisabled(d)
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
                                newDates.push({
                                    date: new Date(d),
                                    disabled: this.#isDayDisabled(d)
                                });
                            }
                            return { items: newDates, newBound: newLast }
                        }
                    },
                    render: dates => this.ctx.render.dates(
                        dates,
                        this.ctx.selectedDates,
                        this.ctx.options.selectType
                    ),
                    block: this.ctx.dom.$days_block
                },
                month: {
                    count: 36,
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
                            // Generate full-year chunks (multiple of 12) so Jan always starts grid rows.
                            let curr = new Date(upDate);
                            for (let i = 0; i < this.count; i++) {
                                curr.setMonth(curr.getMonth() - 1);
                                newDates.unshift({
                                    date: new Date(curr.getFullYear(), curr.getMonth(), 1),
                                    disabled: isMonthDisabled(curr.getFullYear(), curr.getMonth())
                                });
                            }
                            const newBound = newDates.length
                                ? newDates[0].date
                                : upDate;
                            return { items: newDates, newBound }
                        } else {
                            // Generate full-year chunks to keep row structure stable while scrolling.
                            let curr = new Date(downDate);
                            curr.setMonth(curr.getMonth() + 1);
                            for (let i = 0; i < this.count; i++) {
                                newDates.push({
                                    date: new Date(curr.getFullYear(), curr.getMonth(), 1),
                                    disabled: isMonthDisabled(curr.getFullYear(), curr.getMonth())
                                });
                                curr.setMonth(curr.getMonth() + 1);
                            }
                            const newBound = newDates.length
                                ? newDates[newDates.length - 1].date
                                : downDate;
                            return { items: newDates, newBound }
                        }
                    },
                    render: months => this.ctx.render.months(months),
                    block: this.ctx.dom.$months_block
                },
                year: {
                    count: 16,
                    ctx: this.ctx,
                    getNewItems: function (upDate, downDate) {
                        const newDates = [];
                        if (isUp) {
                            // Generate strictly before upDate year.
                            const startYear = upDate.getFullYear() - this.count;
                            for (let y = startYear; y < upDate.getFullYear(); y++) {
                                if (y < this.ctx.options.minDate.getFullYear()) continue
                                newDates.push({
                                    date: new Date(y, 0, 1),
                                    disabled: this.ctx.options.minDate.getFullYear() > y
                                });
                            }
                            const newBound = newDates.length
                                ? newDates[0].date
                                : upDate;
                            return { items: newDates, newBound }
                        } else {
                            // Generate strictly after downDate year.
                            const startYear = downDate.getFullYear() + 1;
                            for (let y = startYear; y < startYear + this.count; y++) {
                                if (y > this.ctx.options.maxDate.getFullYear()) break
                                newDates.push({
                                    date: new Date(y, 0, 1),
                                    disabled: this.ctx.options.maxDate.getFullYear() < y
                                });
                            }
                            const newBound = newDates.length
                                ? newDates[newDates.length - 1].date
                                : downDate;
                            return { items: newDates, newBound }
                        }
                    },
                    render: years => this.ctx.render.years(years),
                    block: this.ctx.dom.$years_block
                }
            }[period];

            if (!config) return

            const { items, newBound } = config.getNewItems(this.ctx.data.up_date, this.ctx.data.down_date);

            if (items.length) {
                config.block.insertAdjacentHTML(
                    isUp ? 'afterbegin' : 'beforeend',
                    config.render(items)
                );
            }

            this.ctx.data[`${direction}_date`] = newBound;
            this.ctx.observe.un();
            const trimSize = period === 'year'
                ? Math.min(4, items.length)
                : items.length;
            this.trim(direction, trimSize);
            this.ctx.observe.on(period);
            this.ctx.scroll.blocked = false;
        }

        trim(direction, remove) {
            const period = this.ctx.period;
            const block = this.ctx.dom[`$${period}s_block`];
            const isUp = direction === 'up';
            const minItemsInDom = period === 'year' ? 28 : 0;

            const oldHeight = block.scrollHeight;
            const items = Array.from(block.querySelectorAll(`.RollDate__calendar__${period}`));

            if (!remove || items.length <= remove * 2) return
            if (minItemsInDom && (items.length - remove) < minItemsInDom) return

            if (isUp) {
                items.slice(-remove).forEach(item => item.remove());
            } else {
                items.slice(0, remove).forEach(item => item.remove());
            }

            // Recalculate bounds from current DOM after trim to avoid flicker and endless refill loops.
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

            const newHeight = block.scrollHeight;
            const heightDelta = oldHeight - newHeight;
            this.ctx.scroll.checkMinScroll();

            if (isUp) this.ctx.scroll.offset -= heightDelta;
            else this.ctx.scroll.offset += heightDelta;
        }
    }

    const ITEM_HEIGHT = 28;

    const ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61 55" width="55" height="50" aria-hidden="true">
    <path fill-rule="evenodd" d="m52.76 54.67l-44.73 0.12c-6.16 0.02-10.02-6.64-6.96-11.98l22.26-38.79c3.07-5.35 10.76-5.37 13.86-0.04l22.47 38.67c3.09 5.33-0.74 12.01-6.9 12.02z"/>
</svg>`;

    class TimePicker {
        #hours = 0
        #minutes = 0
        #use12Hour = false
        #period = 'AM'
        #minuteStep = 1
        #columns = []
        #displayEl = null

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

        #build() {
            const hourValues = this.#use12Hour
                ? Array.from({ length: 12 }, (_, i) => i + 1)
                : Array.from({ length: 24 }, (_, i) => i);

            const minuteValues = [];
            for (let m = 0; m < 60; m += this.#minuteStep) {
                minuteValues.push(m);
            }

            this.root.innerHTML = `
            <div class="RollDate__time__picker">
            <div class="RollDate__time__field" data-unit="hour">
                <div class="RollDate__time__column">
                    <button type="button" class="RollDate__time__arrow RollDate__time__arrow--prev" data-dir="prev" aria-label="Earlier hour">${ARROW_SVG}</button>
                    <div class="RollDate__time__viewport">
                        <div class="RollDate__time__list"></div>
                    </div>
                    <button type="button" class="RollDate__time__arrow RollDate__time__arrow--next" data-dir="next" aria-label="Later hour">${ARROW_SVG}</button>
                </div>
            </div>
            <span class="RollDate__time__sep">:</span>
            <div class="RollDate__time__field" data-unit="minute">
                <div class="RollDate__time__column">
                    <button type="button" class="RollDate__time__arrow RollDate__time__arrow--prev" data-dir="prev" aria-label="Earlier minute">${ARROW_SVG}</button>
                    <div class="RollDate__time__viewport">
                        <div class="RollDate__time__list"></div>
                    </div>
                    <button type="button" class="RollDate__time__arrow RollDate__time__arrow--next" data-dir="next" aria-label="Later minute">${ARROW_SVG}</button>
                </div>
            </div>
            ${this.#use12Hour ? `
            <div class="RollDate__time__field RollDate__time__field--period" data-unit="period">
                <div class="RollDate__time__column">
                    <button type="button" class="RollDate__time__arrow RollDate__time__arrow--prev" data-dir="prev" aria-label="Earlier period">${ARROW_SVG}</button>
                    <div class="RollDate__time__viewport">
                        <div class="RollDate__time__list"></div>
                    </div>
                    <button type="button" class="RollDate__time__arrow RollDate__time__arrow--next" data-dir="next" aria-label="Later period">${ARROW_SVG}</button>
                </div>
            </div>` : ''}
            </div>
            <div class="RollDate__time__display" aria-live="polite"></div>
        `;

            this.#displayEl = this.root.querySelector('.RollDate__time__display');
            if (this.#use12Hour) {
                this.root.classList.add('RollDate__time--12h');
            }

            this.#columns.push(this.#createColumn('hour', hourValues, this.#displayHour()));
            this.#columns.push(this.#createColumn('minute', minuteValues, this.#minutes));
            if (this.#use12Hour) {
                this.#columns.push(this.#createColumn('period', ['AM', 'PM'], this.#period));
            }

            this.#updateDisplay();
        }

        #formatDisplay() {
            const hours = String(this.#hours).padStart(2, '0');
            const minutes = String(this.#minutes).padStart(2, '0');
            if (this.#use12Hour) {
                return `${String(this.#displayHour()).padStart(2, '0')}:${minutes} ${this.#period}`
            }
            return `${hours}:${minutes}`
        }

        #updateDisplay() {
            if (this.#displayEl) {
                this.#displayEl.textContent = this.#formatDisplay();
            }
        }

        #commitTime() {
            this.#readColumns();
            this.#updateDisplay();
            this.onChange(this.getTime());
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

            list.style.paddingTop = `${ITEM_HEIGHT}px`;
            list.style.paddingBottom = `${ITEM_HEIGHT}px`;

            const column = {
                unit,
                viewport,
                list,
                values,
                offset: 0
            };

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
                const raw = Math.round(-column.offset / ITEM_HEIGHT);
                return Math.min(values.length - 1, Math.max(0, raw))
            };

            column.getValue = () => values[column.indexFromOffset()];

            column.apply = (animate) => {
                list.style.transition = animate ? 'transform 0.2s ease' : 'none';
                list.style.transform = `translateY(${column.offset}px)`;
                column.updateActive();
            };

            column.snap = () => {
                const index = column.indexFromOffset();
                column.offset = -index * ITEM_HEIGHT;
                column._lastIndex = index;
                column.apply(true);
                this.#commitTime();
            };

            column.scrollToValue = (value, animate = true) => {
                const index = values.indexOf(value);
                if (index < 0) return
                column.offset = -index * ITEM_HEIGHT;
                column.apply(animate);
            };

            column.stepBy = (delta) => {
                const index = Math.min(values.length - 1, Math.max(0, column.indexFromOffset() + delta));
                column.offset = -index * ITEM_HEIGHT;
                column.apply(true);
            };

            column.scrollToValue(initial, false);
            this.#bindWheel(column);
            this.#bindTouch(column);
            this.#bindArrows(field, column);

            return column
        }

        #bindArrows(field, column) {
            field.querySelector('[data-dir="prev"]')?.addEventListener('click', (e) => {
                e.preventDefault();
                column.stepBy(-1);
            });
            field.querySelector('[data-dir="next"]')?.addEventListener('click', (e) => {
                e.preventDefault();
                column.stepBy(1);
            });
        }

        #bindWheel(column) {
            column.viewport.addEventListener('wheel', (e) => {
                e.preventDefault();
                e.stopPropagation();
                column.list.style.transition = 'none';
                column.offset -= e.deltaY * 0.35;
                const min = -(column.values.length - 1) * ITEM_HEIGHT;
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
                column.offset = startOffset + (e.touches[0].clientY - startY);
                const min = -(column.values.length - 1) * ITEM_HEIGHT;
                column.offset = Math.max(min, Math.min(0, column.offset));
                column.list.style.transform = `translateY(${column.offset}px)`;
                column.updateActive();
            }, { passive: false });

            column.viewport.addEventListener('touchend', () => column.snap());
        }

        #readColumns() {
            const hourCol = this.#columns.find(c => c.unit === 'hour');
            const minuteCol = this.#columns.find(c => c.unit === 'minute');
            const periodCol = this.#columns.find(c => c.unit === 'period');

            const hourValue = hourCol.getValue();
            this.#minutes = minuteCol.getValue();

            if (this.#use12Hour && periodCol) {
                this.#period = periodCol.getValue();
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
                this.#columns.find(c => c.unit === 'period')?.scrollToValue(this.#period);
            } else {
                this.#columns.find(c => c.unit === 'hour')?.scrollToValue(this.#hours);
            }
            this.#columns.find(c => c.unit === 'minute')?.scrollToValue(this.#minutes);
            this.#updateDisplay();
        }

        destroy() {
            this.#columns = [];
            this.root.innerHTML = '';
        }
    }

    class RollDate {
        static #instances = new Set()

        #wheelHandler
        #viewNumber = 0
        #viewPeriodNames = ['day', 'month', 'year']
        #selectedDates = []
        #firstOpen = true
        #disabledDateStamps = new Set()
        #docClickHandler = null
        #openTriggers = []

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

        #buildDisabledDateSet(dates = []) {
            const set = new Set();
            dates.forEach(dateLike => {
                const normalized = this.#normalizeDateInput(dateLike);
                if (normalized) set.add(this.#toDateStamp(normalized));
            });
            return set
        }

        #disableInputAssist(input) {
            if (!input || input.tagName !== 'INPUT') return
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('spellcheck', 'false');
        }

        #isDateDisabled(date) {
            return this.#disabledDateStamps.has(this.#toDateStamp(date))
        }

        #notifySelectionChange() {
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
            buttons.forEach((cfg) => {
                if (!cfg?.text) return
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'RollDate__footer__button';
                btn.textContent = cfg.text;
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.#handleFooterButton(cfg);
                });
                this.dom.$footer_buttons.append(btn);
            });
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
            if (typeof cfg.onClick === 'function') {
                cfg.onClick(this);
            }
        }

        #initTimePicker() {
            const start = this.options.startDate;
            this.timePicker = new TimePicker(this.dom.$time, {
                hours: start.getHours(),
                minutes: start.getMinutes(),
                use12Hour: this.options.use12Hour,
                minuteStep: this.options.timeStep,
                hapticFeedback: this.options.hapticFeedback !== false,
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
                theme: 'dark',
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
                closeOnSelect: true,
                enableTime: false,
                use12Hour: false,
                timeStep: 1,
                footerButtons: [],
                hapticFeedback: true,
                ...options
            };

            if (baseOptions.theme === 'default') {
                baseOptions.theme = 'dark';
            }

            const resolvedLocale = baseOptions.locale ||
                (typeof navigator !== 'undefined' ? navigator.language : undefined);
            baseOptions.dateFormat = baseOptions.dateFormat || getLocaleInputFormat(resolvedLocale);

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

            if (this.options.minDate > this.options.maxDate) {
                console.error('Date Error: maxDate is less than minDate!');
            }

            this.options.startDate = this.#clampDateToRange(
                this.options.startDate,
                this.options.minDate,
                this.options.maxDate
            );
            this.#disabledDateStamps = this.#buildDisabledDateSet(this.options.disabledDates);
            if (this.#isDateDisabled(this.options.startDate)) {
                this.options.startDate = new Date(this.options.minDate);
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
            }
            if (this.options.footerButtons?.length || this.options.enableTime) {
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
                footerButtons: this.options.footerButtons
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
            if (this.options.enableTime && this.dom.$time) {
                this.#initTimePicker();
            }

            this.virtualizer = new Virtualizer(this);

            this.#attachEvents();

            this.observe = new Observe(this.$container);

            this.data = new Data({
                startDate: this.options.startDate,
                minDate: this.options.minDate,
                maxDate: this.options.maxDate,
                startWeekFromMonday: this.options.startWeekFromMonday,
                isDateDisabled: date => this.#isDateDisabled(date)
            });

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

        #updateView() {
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
                        this.options.selectType
                    );
                    break

                default:
                    const dates = this.data.getMonthsOrYears(this.period);
                    this.dom[`$${this.period}s_block`].innerHTML = this.render[`${this.period}s`](dates);
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

            if ($firstEl) {
                setTimeout(() => {
                    const $scrollBlock = this.dom.$body.querySelector('.RollDate__calendar__scrollblock');
                    const bodyHeight = this.dom.$body.clientHeight;
                    const blockHeight = $scrollBlock.clientHeight;

                    if (blockHeight <= bodyHeight) {
                        this.scroll.setBaseOffset(bodyHeight - blockHeight);
                        this.scroll.offset = 0;
                        return
                    }

                    this.scroll.setBaseOffset(0);
                    const containerRect = $scrollBlock.getBoundingClientRect();
                    const firstRect = $firstEl.getBoundingClientRect();
                    const firstRectOffset = -(firstRect.top - containerRect.top);
                    const minScroll = this.scroll.minScroll;
                    this.scroll.offset = Math.max(firstRectOffset, minScroll);
                }, 0);
            }

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
                    trigger.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.open();
                    });

                    if (trigger.tagName === 'INPUT') {
                        trigger.addEventListener('focus', () => this.open());
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
                updatePeriod: (direction) => this.virtualizer.update(direction)
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
                        if (this.mode === 'popup' && this.options.closeOnSelect) this.close();
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

                        this.options.selectDate([...this.#selectedDates]);
                        this.#updateInputValue();

                        if (this.mode === 'popup' && this.#selectedDates.length === 2 && this.options.closeOnSelect) {
                            this.close();
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
                        if (this.mode === 'popup' && this.options.closeOnSelect) {
                            this.close();
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

                    hapticTick(this.options.hapticFeedback !== false);
                    this.#updateView(this.#viewNumber);
                });
            });
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

        setDisabledDates(dates = []) {
            this.options.disabledDates = Array.isArray(dates) ? dates : [];
            this.#disabledDateStamps = this.#buildDisabledDateSet(this.options.disabledDates);
            this.#syncSelectedWithDisabledDates();
            this.#updateView(this.#viewNumber);
        }

        disableDate(dateLike) {
            const normalized = this.#normalizeDateInput(dateLike);
            if (!normalized) return
            this.#disabledDateStamps.add(this.#toDateStamp(normalized));
            this.options.disabledDates = [...this.#disabledDateStamps].map(stamp => new Date(stamp));
            this.#syncSelectedWithDisabledDates();
            this.#updateView(this.#viewNumber);
        }

        enableDate(dateLike) {
            const normalized = this.#normalizeDateInput(dateLike);
            if (!normalized) return
            this.#disabledDateStamps.delete(this.#toDateStamp(normalized));
            this.options.disabledDates = [...this.#disabledDateStamps].map(stamp => new Date(stamp));
            this.#updateView(this.#viewNumber);
        }

        isDateDisabled(dateLike) {
            const normalized = this.#normalizeDateInput(dateLike);
            return normalized ? this.#isDateDisabled(normalized) : false
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

        open() {
            if (this.mode === 'popup') {
                this.#closeOtherPopups();
            }

            const wasOpen = this.$container.style.display !== 'none';
            this.$container.style.display = 'block';

            if (this.mode === 'popup') {
                this.#positionCalendar();

                if (this.#firstOpen) {
                    this.#scrollToStartDate();
                    this.#firstOpen = false;
                } else {
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

        close() {
            const wasOpen = this.$container.style.display !== 'none';
            this.$container.style.display = 'none';
            if (this.mode === 'popup') {
                const triggers = this.$endInput ? [this.$startInput, this.$endInput] :
                    this.$openTrigger ? [this.$openTrigger] : [this.$trigger];

                triggers.forEach(trigger => {
                    if (trigger && typeof trigger.blur === 'function') {
                        trigger.blur();
                    }
                });
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
                this.close();
            }
        }

        clearSelection() {
            if (this.options.selectType === 'range') {
                this.#clearRangeSelection();
            } else if (this.options.selectType === 'multi') {
                this.#clearMultiSelection();
            } else {
                this.#selectedDates = [];
            }

            this.#updateView(this.#viewNumber);
            this.#notifySelectionChange();
            this.#updateInputValue();
        }

        destroy() {
            if (this.#docClickHandler) {
                document.removeEventListener('click', this.#docClickHandler);
                this.#docClickHandler = null;
            }
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
