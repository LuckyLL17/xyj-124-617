import { formatDate, getTodayStr, startOfDay, addDays, addWeeks, addMonths,
    isSameDay, getWeekday, getDayOfMonth, getLastDayOfMonth, WEEKDAY_MAP,
    generateDateRange, formatDateShort } from '../utils/helpers.js';
import { EmptyState } from '../components/EmptyState.js';
import { Avatar } from '../components/Avatar.js';
import { FormField } from '../components/FormField.js';

export class ScheduleModule {
    constructor(store, memberService, scheduleService, recordService, taskTypeService, modal, toast) {
        this.store = store;
        this.memberService = memberService;
        this.scheduleService = scheduleService;
        this.recordService = recordService;
        this.taskTypeService = taskTypeService;
        this.modal = modal;
        this.toast = toast;
        this.viewMode = 'list';
        this.calendarMode = 'month';
        this.calendarDate = startOfDay(Date.now());
        this.filterTypeIds = [];
        this.filterMemberIds = [];
        this.filterStatus = 'all';
        this._bindKeyboardShortcuts();
    }

    _bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const scheduleTab = document.getElementById('schedule');
            if (!scheduleTab || !scheduleTab.classList.contains('active')) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            if (this.viewMode !== 'calendar') return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this._navigateCalendar(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this._navigateCalendar(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this._navigateCalendar(this.calendarMode === 'month' ? -1 : -7, true);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this._navigateCalendar(this.calendarMode === 'month' ? 1 : 7, true);
                    break;
                case 't':
                case 'T':
                    e.preventDefault();
                    this.goToToday();
                    break;
                case 'm':
                case 'M':
                    e.preventDefault();
                    this.switchCalendarMode('month');
                    break;
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.switchCalendarMode('week');
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7': {
                    e.preventDefault();
                    const idx = parseInt(e.key) - 1;
                    const enabledTypes = this.taskTypeService.getEnabled();
                    if (enabledTypes[idx]) {
                        this.toggleFilterType(enabledTypes[idx].id);
                    }
                    break;
                }
                case 'Escape':
                    e.preventDefault();
                    this.clearFilters();
                    break;
            }
        });
    }

    _navigateCalendar(direction, isWeekNav = false) {
        if (this.calendarMode === 'month') {
            this.calendarDate = addMonths(this.calendarDate, direction);
        } else {
            if (isWeekNav) direction = direction / 7;
            this.calendarDate = addWeeks(this.calendarDate, direction);
        }
        this.render();
    }

    goToToday() {
        this.calendarDate = startOfDay(Date.now());
        this.render();
    }

    switchCalendarMode(mode) {
        this.calendarMode = mode;
        this.render();
    }

    toggleFilterType(typeId) {
        const idx = this.filterTypeIds.indexOf(typeId);
        if (idx === -1) {
            this.filterTypeIds.push(typeId);
        } else {
            this.filterTypeIds.splice(idx, 1);
        }
        this.render();
    }

    toggleFilterMember(memberId) {
        const idx = this.filterMemberIds.indexOf(memberId);
        if (idx === -1) {
            this.filterMemberIds.push(memberId);
        } else {
            this.filterMemberIds.splice(idx, 1);
        }
        this.render();
    }

    setFilterStatus(status) {
        this.filterStatus = status;
        this.render();
    }

    clearFilters() {
        this.filterTypeIds = [];
        this.filterMemberIds = [];
        this.filterStatus = 'all';
        this.render();
    }

    _getFilteredSchedules() {
        let schedules = this.scheduleService.getAll();

        if (this.filterTypeIds.length > 0) {
            schedules = schedules.filter(s => this.filterTypeIds.includes(s.type));
        }
        if (this.filterMemberIds.length > 0) {
            schedules = schedules.filter(s => this.filterMemberIds.includes(s.memberId));
        }
        if (this.filterStatus !== 'all') {
            const now = startOfDay(Date.now());
            if (this.filterStatus === 'completed') {
                schedules = schedules.filter(s => s.completed);
            } else if (this.filterStatus === 'pending') {
                schedules = schedules.filter(s => !s.completed && s.date >= now);
            } else if (this.filterStatus === 'overdue') {
                schedules = schedules.filter(s => !s.completed && s.date < now);
            }
        }

        return schedules.sort((a, b) => a.date - b.date);
    }

    _lightenColor(hex) {
        const alpha = 0.2;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    _darkenColor(hex, percent = 30) {
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    render() {
        const enabledTypes = this.taskTypeService.getEnabled();
        const grid = document.getElementById('scheduleGrid');
        const rulesContainer = document.getElementById('scheduleRulesContainer');
        const actionsBar = document.getElementById('scheduleActionBar');
        const filterBar = document.getElementById('scheduleFilterBar');

        if (!actionsBar) return;

        const showListBtn = this.viewMode === 'list' ? 'active' : '';
        const showCalendarBtn = this.viewMode === 'calendar' ? 'active' : '';
        const showRulesBtn = this.viewMode === 'rules' ? 'active' : '';

        actionsBar.innerHTML = enabledTypes.length === 0 ? '' : `
            <div class="schedule-action-bar">
                <div class="schedule-view-toggle">
                    <button class="view-btn ${showListBtn}" onclick="window._app.switchScheduleView('list')">📋 列表</button>
                    <button class="view-btn ${showCalendarBtn}" onclick="window._app.switchScheduleView('calendar')">📅 日历</button>
                    <button class="view-btn ${showRulesBtn}" onclick="window._app.switchScheduleView('rules')">⚙️ 规则</button>
                </div>
                <div class="schedule-action-btns">
                    ${this.viewMode === 'calendar' ? `
                        <button class="btn btn-secondary btn-sm" onclick="window._app.calGoToday()" title="今天 (T)">📍 今天</button>
                    ` : ''}
                    ${this.viewMode === 'list' ? `
                        <button class="btn btn-secondary btn-sm" onclick="window._app.showBatchGenerateModal()">⚡ 批量生成</button>
                    ` : ''}
                    ${this.viewMode === 'rules' ? `
                        <button class="btn btn-secondary btn-sm" onclick="window._app.showAddRuleModal()">+ 新建规则</button>
                    ` : ''}
                    <button class="btn btn-primary btn-sm" onclick="window._app.showAddScheduleModal()">+ 新建排班</button>
                </div>
            </div>
            ${this.viewMode === 'calendar' ? this._renderCalendarNav() : ''}
        `;

        if (enabledTypes.length === 0) {
            grid.innerHTML = EmptyState.render('请先在「任务配置」中启用任务类型');
            if (filterBar) filterBar.innerHTML = '';
            if (rulesContainer) rulesContainer.innerHTML = '';
            return;
        }

        if (filterBar && this.viewMode === 'calendar') {
            this._renderFilterBar(filterBar, enabledTypes);
        } else if (filterBar) {
            filterBar.innerHTML = '';
        }

        if (this.viewMode === 'list') {
            grid.style.display = 'grid';
            if (filterBar) filterBar.style.display = 'none';
            if (rulesContainer) rulesContainer.style.display = 'none';
            grid.innerHTML = enabledTypes.map(type => `
                <div class="schedule-column">
                    <h3 class="schedule-type-header" style="background: ${this._lightenColor(type.color)};">
                        ${type.emoji} ${type.name}
                    </h3>
                    <div id="schedule-${type.id}" class="schedule-list"></div>
                </div>
            `).join('');

            enabledTypes.forEach(type => {
                this.renderScheduleColumn(type.id);
            });
        } else if (this.viewMode === 'calendar') {
            grid.style.display = 'block';
            if (filterBar) filterBar.style.display = 'flex';
            if (rulesContainer) rulesContainer.style.display = 'none';
            grid.innerHTML = this.calendarMode === 'month'
                ? this._renderMonthCalendar()
                : this._renderWeekCalendar();
            requestAnimationFrame(() => this._initCalendarDragDrop());
        } else {
            grid.style.display = 'none';
            if (filterBar) filterBar.style.display = 'none';
            if (rulesContainer) {
                rulesContainer.style.display = 'block';
                this.renderRulesList();
            }
        }
    }

    _renderCalendarNav() {
        const d = new Date(this.calendarDate);
        const title = this.calendarMode === 'month'
            ? `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
            : `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 第 ${this._getWeekNumber()} 周`;

        const monthBtn = this.calendarMode === 'month' ? 'active' : '';
        const weekBtn = this.calendarMode === 'week' ? 'active' : '';

        return `
            <div class="calendar-nav">
                <div class="calendar-nav-left">
                    <button class="cal-nav-btn" onclick="window._app.calPrev()" title="←">‹</button>
                    <button class="cal-nav-btn" onclick="window._app.calGoToday()" title="今天 (T)">今天</button>
                    <button class="cal-nav-btn" onclick="window._app.calNext()" title="→">›</button>
                    <span class="calendar-title">${title}</span>
                </div>
                <div class="calendar-nav-right">
                    <div class="cal-mode-toggle">
                        <button class="cal-mode-btn ${monthBtn}" onclick="window._app.calSwitchMode('month')" title="月视图 (M)">月</button>
                        <button class="cal-mode-btn ${weekBtn}" onclick="window._app.calSwitchMode('week')" title="周视图 (W)">周</button>
                    </div>
                </div>
            </div>
        `;
    }

    _getWeekNumber() {
        const d = new Date(this.calendarDate);
        const start = new Date(d.getFullYear(), 0, 1);
        const days = Math.floor((d - start) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + start.getDay() + 1) / 7);
    }

    _renderFilterBar(filterBar, enabledTypes) {
        const members = this.memberService.getAll();

        const typeFilters = enabledTypes.map((type, idx) => {
            const active = this.filterTypeIds.includes(type.id);
            const style = active
                ? `background: ${type.color}; color: white; border-color: ${type.color};`
                : `background: white; color: var(--text-primary); border-color: var(--border);`;
            return `
                <button class="filter-chip" style="${style}" onclick="window._app.calToggleType('${type.id}')" title="按 ${idx + 1} 快速切换">
                    ${type.emoji} ${type.name}
                </button>
            `;
        }).join('');

        const memberFilters = members.map(m => {
            const active = this.filterMemberIds.includes(m.id);
            const style = active
                ? `background: var(--primary); color: white; border-color: var(--primary);`
                : `background: white; color: var(--text-primary); border-color: var(--border);`;
            return `
                <button class="filter-chip filter-chip-sm" style="${style}" onclick="window._app.calToggleMember('${m.id}')">
                    ${Avatar.render(m, 'xs')} ${m.name}
                </button>
            `;
        }).join('');

        const statusOptions = [
            { v: 'all', label: '全部' },
            { v: 'pending', label: '待执行' },
            { v: 'completed', label: '已完成' },
            { v: 'overdue', label: '已逾期' }
        ];

        const statusBtns = statusOptions.map(opt => {
            const active = this.filterStatus === opt.v;
            return `
                <button class="filter-chip ${active ? 'filter-chip-active' : ''}" onclick="window._app.calSetStatus('${opt.v}')">
                    ${opt.label}
                </button>
            `;
        }).join('');

        const hasFilters = this.filterTypeIds.length > 0 || this.filterMemberIds.length > 0 || this.filterStatus !== 'all';

        filterBar.innerHTML = `
            <div class="schedule-filter-bar">
                <div class="filter-section">
                    <span class="filter-label">任务类型：</span>
                    <div class="filter-chips-wrap">${typeFilters}</div>
                </div>
                <div class="filter-section">
                    <span class="filter-label">成员：</span>
                    <div class="filter-chips-wrap">${memberFilters}</div>
                </div>
                <div class="filter-section">
                    <span class="filter-label">状态：</span>
                    <div class="filter-chips-wrap">${statusBtns}</div>
                </div>
                ${hasFilters ? `
                    <div class="filter-section">
                        <button class="btn btn-secondary btn-sm" onclick="window._app.calClearFilters()" title="ESC 清除筛选">清除筛选</button>
                    </div>
                ` : ''}
            </div>
            <div class="calendar-shortcuts-tip">
                ⌨️ 快捷键：← → 切换 ${this.calendarMode === 'month' ? '月份' : '周'} · T 今天 · M 月视图 · W 周视图 · 1-7 切换任务类型 · ESC 清除筛选
            </div>
        `;
    }

    _renderMonthCalendar() {
        const d = new Date(this.calendarDate);
        const year = d.getFullYear();
        const month = d.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = getLastDayOfMonth(year, month);
        const today = startOfDay(Date.now());

        const schedules = this._getFilteredSchedules();
        const taskTypes = this.taskTypeService.getAllAsObject();
        const members = {};
        this.memberService.getAll().forEach(m => { members[m.id] = m; });

        const schedulesByDay = {};
        schedules.forEach(s => {
            const key = new Date(s.date).toDateString();
            if (!schedulesByDay[key]) schedulesByDay[key] = [];
            schedulesByDay[key].push(s);
        });

        let daysHtml = '';
        for (let i = 0; i < firstDay; i++) {
            daysHtml += `<div class="cal-cell cal-cell-other"></div>`;
        }

        for (let day = 1; day <= lastDate; day++) {
            const dateTs = new Date(year, month, day).getTime();
            const key = new Date(dateTs).toDateString();
            const daySchedules = schedulesByDay[key] || [];
            const isToday = isSameDay(dateTs, today);
            const weekday = getWeekday(dateTs);
            const isWeekend = weekday === 0 || weekday === 6;

            const cellClass = [
                'cal-cell',
                isToday ? 'cal-cell-today' : '',
                isWeekend ? 'cal-cell-weekend' : ''
            ].join(' ');

            const dayEventsHtml = daySchedules.slice(0, 3).map(s => {
                const type = taskTypes[s.type];
                const member = members[s.memberId];
                const color = type ? type.color : '#94a3b8';
                const completedClass = s.completed ? 'cal-event-completed' : '';
                const overdueClass = !s.completed && dateTs < today ? 'cal-event-overdue' : '';
                const draggableAttr = s.completed ? '' : 'draggable="true"';
                return `
                    <div class="cal-event ${completedClass} ${overdueClass}"
                         ${draggableAttr}
                         data-schedule-id="${s.id}"
                         style="background: ${this._lightenColor(color)}; border-left: 3px solid ${color};"
                         onclick="window._app.calShowEvent('${s.id}')"
                         title="${type ? type.name : '未知'} · ${member ? member.name : '未知'} · ${formatDate(s.date)}${s.completed ? '' : ' · 拖拽可改日期'}">
                        ${type ? type.emoji : '📌'} <span class="cal-event-text">${member ? member.name : '?'}</span>
                    </div>
                `;
            }).join('');

            const moreCount = daySchedules.length - 3;
            const moreHtml = moreCount > 0
                ? `<div class="cal-event-more" onclick="window._app.calShowDay(${dateTs})">+${moreCount} 更多</div>`
                : '';

            daysHtml += `
                <div class="${cellClass}" data-date="${dateTs}" onclick="window._app.calShowDay(${dateTs})">
                    <div class="cal-cell-header">
                        <span class="cal-day-number ${isToday ? 'cal-day-today' : ''}">${day}</span>
                        ${daySchedules.length > 0 ? `<span class="cal-count-dot">${daySchedules.length}</span>` : ''}
                    </div>
                    <div class="cal-cell-events">
                        ${dayEventsHtml}
                        ${moreHtml}
                    </div>
                </div>
            `;
        }

        const totalCells = firstDay + lastDate;
        const trailing = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < trailing; i++) {
            daysHtml += `<div class="cal-cell cal-cell-other"></div>`;
        }

        const weekdayHeaders = Object.values(WEEKDAY_MAP).map(w =>
            `<div class="cal-weekday">${w.name}</div>`
        ).join('');

        return `
            <div class="calendar-container">
                <div class="cal-weekday-row">${weekdayHeaders}</div>
                <div class="cal-grid">${daysHtml}</div>
            </div>
        `;
    }

    _renderWeekCalendar() {
        const base = new Date(this.calendarDate);
        const weekday = base.getDay();
        const weekStart = addDays(base.getTime(), -weekday);
        const today = startOfDay(Date.now());

        const schedules = this._getFilteredSchedules();
        const taskTypes = this.taskTypeService.getAllAsObject();
        const members = {};
        this.memberService.getAll().forEach(m => { members[m.id] = m; });

        const weekDays = generateDateRange(weekStart, 7);
        const schedulesByDay = {};
        schedules.forEach(s => {
            const key = new Date(s.date).toDateString();
            if (!schedulesByDay[key]) schedulesByDay[key] = [];
            schedulesByDay[key].push(s);
        });

        const hourRows = [];
        for (let h = 0; h < 24; h++) {
            hourRows.push(`<div class="cal-week-hour">${String(h).padStart(2, '0')}:00</div>`);
        }

        const headerHtml = weekDays.map(dateTs => {
            const d = new Date(dateTs);
            const isToday = isSameDay(dateTs, today);
            const wd = WEEKDAY_MAP[d.getDay()];
            const dayNum = d.getDate();
            const key = d.toDateString();
            const count = (schedulesByDay[key] || []).length;

            return `
                <div class="cal-week-header-cell ${isToday ? 'cal-cell-today' : ''}">
                    <div class="cal-week-header-top">
                        <span class="cal-week-weekday">${wd.name}</span>
                        <span class="cal-day-number ${isToday ? 'cal-day-today' : ''}">${dayNum}</span>
                        ${count > 0 ? `<span class="cal-count-dot">${count}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        const timeSlotHtml = weekDays.map(dateTs => {
            const d = new Date(dateTs);
            const key = d.toDateString();
            const isToday = isSameDay(dateTs, today);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const daySchedules = (schedulesByDay[key] || []).sort((a, b) => a.date - b.date);

            const eventsHtml = daySchedules.map(s => {
                const type = taskTypes[s.type];
                const member = members[s.memberId];
                const color = type ? type.color : '#94a3b8';
                const completedClass = s.completed ? 'cal-event-completed' : '';
                const overdueClass = !s.completed && dateTs < today ? 'cal-event-overdue' : '';
                const draggableAttr = s.completed ? '' : 'draggable="true"';

                return `
                    <div class="cal-week-event ${completedClass} ${overdueClass}"
                         ${draggableAttr}
                         data-schedule-id="${s.id}"
                         style="background: ${this._lightenColor(color)}; border-left: 4px solid ${color};"
                         onclick="window._app.calShowEvent('${s.id}')">
                        <div class="cal-week-event-title">
                            <span style="color: ${color}; font-weight: 600;">${type ? type.emoji : '📌'} ${type ? type.name : '未知'}</span>
                        </div>
                        <div class="cal-week-event-person">
                            ${Avatar.render(member, 'xs')}
                            <span>${member ? member.name : '未知'}</span>
                            ${s.completed ? '<span class="badge-done">✓ 已完成</span>' : ''}
                            ${!s.completed && dateTs < today ? '<span class="badge-overdue">逾期</span>' : ''}
                        </div>
                        ${s.substituteType ? `
                            <div class="cal-week-event-sub">
                                ${s.substituteType === 'swap' ? '🔄 换值' : '👤 代值'}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            return `
                <div class="cal-week-day-col ${isToday ? 'col-today' : ''} ${isWeekend ? 'col-weekend' : ''}" data-date="${dateTs}">
                    <div class="cal-week-day-date" onclick="window._app.calShowDay(${dateTs})">
                        ${d.getMonth() + 1}/${d.getDate()} ${isToday ? '· 今天' : ''}
                    </div>
                    <div class="cal-week-events">
                        ${eventsHtml || '<div class="cal-week-empty" onclick="window._app.calShowDay(' + dateTs + ')">+ 点击添加排班</div>'}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="calendar-container">
                <div class="cal-week-grid">
                    <div class="cal-week-header-spacer"></div>
                    <div class="cal-week-header-row">${headerHtml}</div>
                    <div class="cal-week-body">
                        ${timeSlotHtml}
                    </div>
                </div>
            </div>
        `;
    }

    showDayModal(dateTs) {
        const d = new Date(dateTs);
        const dateStr = formatDate(dateTs);
        const enabledTypes = this.taskTypeService.getEnabled();
        const members = this.memberService.getAll();
        const taskTypes = this.taskTypeService.getAllAsObject();
        const memberObj = {};
        members.forEach(m => { memberObj[m.id] = m; });

        const today = startOfDay(Date.now());
        const schedules = this.scheduleService.getAll()
            .filter(s => isSameDay(s.date, dateTs))
            .sort((a, b) => a.date - b.date);

        const eventsHtml = schedules.length === 0
            ? `<p class="empty-state" style="padding: 20px;">当天暂无排班</p>`
            : schedules.map(s => {
                const type = taskTypes[s.type];
                const member = memberObj[s.memberId];
                const color = type ? type.color : '#94a3b8';
                const isOverdue = !s.completed && dateTs < today;
                const statusBadge = s.completed
                    ? '<span class="schedule-status done">已完成</span>'
                    : isOverdue
                        ? '<span class="schedule-status overdue">逾期</span>'
                        : '<span class="schedule-status pending">待执行</span>';

                return `
                    <div class="cal-day-event" style="border-left: 4px solid ${color}; background: ${this._lightenColor(color)};">
                        <div class="cal-day-event-main">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <strong>${type ? type.emoji + ' ' + type.name : '未知任务'}</strong>
                                ${statusBadge}
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                                ${Avatar.render(member, 'sm')}
                                <span>${member ? member.name : '未知成员'}</span>
                                ${s.substituteType ? `
                                    <span class="substitute-badge ${s.substituteType}">
                                        ${s.substituteType === 'swap' ? '🔄 换值' : '👤 代值'}
                                    </span>
                                ` : ''}
                            </div>
                            ${s.substituteNote ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">📝 ${s.substituteNote}</div>` : ''}
                        </div>
                        <div class="cal-day-event-actions">
                            ${!s.completed ? `
                                <button class="btn btn-success btn-sm" onclick="window._app.markScheduleDone('${s.id}'); window._app.closeModal();">✓ 完成</button>
                                <button class="btn btn-info btn-sm" onclick="window._app.showSwapModal('${s.id}')">↔️</button>
                                <button class="btn btn-warning btn-sm" onclick="window._app.showSubstituteModal('${s.id}')">👥</button>
                            ` : ''}
                            <button class="btn btn-danger btn-sm" onclick="window._app.deleteSchedule('${s.id}'); window._app.closeModal();">×</button>
                        </div>
                    </div>
                `;
            }).join('');

        const form = `
            <div style="margin-bottom: 24px;">
                <h4 style="margin-bottom: 12px; font-size: 15px;">📌 当天排班</h4>
                ${eventsHtml}
            </div>
            <div style="border-top: 1px solid var(--border); padding-top: 20px;">
                <h4 style="margin-bottom: 12px; font-size: 15px;">➕ 快速添加</h4>
                <form onsubmit="window._app.calQuickAdd(event, ${dateTs})">
                    <div class="form-group">
                        <label>任务类型</label>
                        <select id="calQuickType" required>
                            <option value="">请选择</option>
                            ${enabledTypes.map(t => `<option value="${t.id}">${t.emoji} ${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>值班成员</label>
                        <select id="calQuickMember" required>
                            <option value="">请选择</option>
                            ${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">关闭</button>
                        <button type="submit" class="btn btn-primary">添加排班</button>
                    </div>
                </form>
            </div>
        `;

        this.modal.open(`📅 ${dateStr} 排班详情`, form);
    }

    showEventModal(scheduleId) {
        const schedule = this.scheduleService.getById(scheduleId);
        if (!schedule) return;
        this.showDayModal(schedule.date);
    }

    quickAddSchedule(event, dateTs) {
        event.preventDefault();
        const typeId = document.getElementById('calQuickType').value;
        const memberId = document.getElementById('calQuickMember').value;
        if (!typeId || !memberId) return;

        this.scheduleService.add(memberId, typeId, dateTs);
        this.modal.close();
        this.toast.show('排班已添加');
    }

    _initCalendarDragDrop() {
        const container = document.getElementById('scheduleGrid');
        if (!container) return;

        let draggedScheduleId = null;
        let draggedEl = null;
        let ghostEl = null;
        let lastDropTarget = null;

        const dropTargets = () => container.querySelectorAll('[data-date]');

        container.addEventListener('dragstart', (e) => {
            const eventEl = e.target.closest('[data-schedule-id]');
            if (!eventEl) return;

            draggedScheduleId = eventEl.dataset.scheduleId;
            draggedEl = eventEl;

            const schedule = this.scheduleService.getById(draggedScheduleId);
            if (!schedule || schedule.completed) {
                e.preventDefault();
                return;
            }

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedScheduleId);

            eventEl.classList.add('cal-dragging');

            ghostEl = eventEl.cloneNode(true);
            ghostEl.classList.add('cal-drag-ghost');
            ghostEl.style.position = 'fixed';
            ghostEl.style.pointerEvents = 'none';
            ghostEl.style.zIndex = '10000';
            ghostEl.style.width = eventEl.offsetWidth + 'px';
            ghostEl.style.opacity = '0.9';
            ghostEl.style.transform = 'rotate(2deg)';
            ghostEl.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            document.body.appendChild(ghostEl);
            positionGhost(e);

            dropTargets().forEach(t => t.classList.add('cal-drop-target'));
        });

        const positionGhost = (e) => {
            if (!ghostEl) return;
            ghostEl.style.left = (e.clientX + 12) + 'px';
            ghostEl.style.top = (e.clientY - 12) + 'px';
        };

        container.addEventListener('drag', (e) => {
            if (e.clientX === 0 && e.clientY === 0) return;
            positionGhost(e);
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const target = e.target.closest('[data-date]');
            if (lastDropTarget && lastDropTarget !== target) {
                lastDropTarget.classList.remove('cal-drop-hover');
            }
            if (target) {
                target.classList.add('cal-drop-hover');
                lastDropTarget = target;
            }
        });

        container.addEventListener('dragleave', (e) => {
            const target = e.target.closest('[data-date]');
            if (target && !target.contains(e.relatedTarget)) {
                target.classList.remove('cal-drop-hover');
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();

            if (ghostEl) {
                ghostEl.remove();
                ghostEl = null;
            }

            if (draggedEl) {
                draggedEl.classList.remove('cal-dragging');
            }

            dropTargets().forEach(t => {
                t.classList.remove('cal-drop-target');
                t.classList.remove('cal-drop-hover');
            });

            const targetCell = e.target.closest('[data-date]');
            if (!targetCell || !draggedScheduleId) return;

            const newDateTs = parseInt(targetCell.dataset.date);
            if (isNaN(newDateTs)) return;

            const schedule = this.scheduleService.getById(draggedScheduleId);
            if (!schedule) return;

            if (isSameDay(schedule.date, newDateTs)) return;

            const oldDateStr = formatDate(schedule.date);
            const newDateStr = formatDate(newDateTs);

            this.scheduleService.moveToDate(draggedScheduleId, newDateTs);

            const member = this.memberService.getById(schedule.memberId);
            const type = this.taskTypeService.getById(schedule.type);
            const name = member ? member.name : '未知';
            const typeName = type ? type.name : '未知';
            this.toast.show(`✅ ${name} 的${typeName}已从 ${oldDateStr} 移至 ${newDateStr}`);

            draggedScheduleId = null;
            draggedEl = null;
            lastDropTarget = null;
        });

        container.addEventListener('dragend', (e) => {
            if (ghostEl) {
                ghostEl.remove();
                ghostEl = null;
            }

            if (draggedEl) {
                draggedEl.classList.remove('cal-dragging');
            }

            dropTargets().forEach(t => {
                t.classList.remove('cal-drop-target');
                t.classList.remove('cal-drop-hover');
            });

            draggedScheduleId = null;
            draggedEl = null;
            lastDropTarget = null;
        });
    }

    renderScheduleColumn(typeId) {
        const container = document.getElementById(`schedule-${typeId}`);
        if (!container) return;

        const schedules = this.scheduleService.getByType(typeId);
        const typeObj = this.taskTypeService.getById(typeId);

        if (schedules.length === 0) {
            container.innerHTML = EmptyState.render('暂无排班');
            return;
        }

        const now = Date.now();
        container.innerHTML = schedules.map(schedule => {
            const member = this.memberService.getById(schedule.memberId);
            const originalMember = schedule.originalMemberId ? this.memberService.getById(schedule.originalMemberId) : null;
            const daysDiff = Math.ceil((schedule.date - now) / (1000 * 60 * 60 * 24));
            let statusClass = 'pending';
            let statusText = '待执行';
            let itemClass = '';

            if (schedule.completed) {
                statusClass = 'done';
                statusText = '已完成';
            } else if (daysDiff < 0) {
                statusClass = 'overdue';
                statusText = `逾期 ${Math.abs(daysDiff)} 天`;
                itemClass = 'overdue';
            } else if (daysDiff === 0) {
                statusText = '今天';
                itemClass = 'current';
            } else if (daysDiff === 1) {
                statusText = '明天';
                itemClass = 'current';
            } else {
                statusText = `${daysDiff} 天后`;
            }

            const substituteBadge = schedule.substituteType
                ? `<span class="substitute-badge ${schedule.substituteType}">
                    ${schedule.substituteType === 'swap' ? '🔄 换值' : '👤 代值'}
                    ${originalMember ? `<span class="substitute-origin">原为 ${originalMember.name}</span>` : ''}
                   </span>`
                : '';

            const colorStyle = typeObj ? `border-left: 4px solid ${typeObj.color};` : '';
            return `
                <div class="schedule-item ${itemClass}" style="${colorStyle}">
                    <div class="schedule-person">
                        ${Avatar.render(member, 'sm')}
                        <div style="min-width:0;">
                            <div class="schedule-name-row">
                                <span class="schedule-name">${member ? member.name : '未知成员'}</span>
                                ${substituteBadge}
                            </div>
                            <div class="schedule-date">${formatDate(schedule.date)}</div>
                            ${schedule.substituteNote ? `<div class="schedule-note">📝 ${schedule.substituteNote}</div>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                        <span class="schedule-status ${statusClass}">${statusText}</span>
                        <div class="schedule-actions">
                            ${!schedule.completed ? `
                                <button class="btn btn-success btn-sm" title="标记完成" onclick="window._app.markScheduleDone('${schedule.id}')">✓</button>
                                <button class="btn btn-info btn-sm" title="换值" onclick="window._app.showSwapModal('${schedule.id}')">↔️</button>
                                <button class="btn btn-warning btn-sm" title="代值" onclick="window._app.showSubstituteModal('${schedule.id}')">👥</button>
                            ` : ''}
                            <button class="btn btn-danger btn-sm" title="删除" onclick="window._app.deleteSchedule('${schedule.id}')">×</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRulesList() {
        const container = document.getElementById('scheduleRulesContainer');
        if (!container) return;
        const rules = this.scheduleService.getAllRules();
        const taskTypes = this.taskTypeService.getAllAsObject();
        const members = this.memberService.getAll();
        container.innerHTML = FormField.scheduleRulesList(rules, taskTypes, members, formatDate);
    }

    switchView(mode) {
        this.viewMode = mode;
        this.render();
    }

    showAddModal() {
        const members = this.memberService.getAll();
        if (members.length === 0) {
            this.toast.show('请先添加成员');
            return;
        }
        const taskTypes = this.taskTypeService.getAllAsObject();
        this.modal.open('新建排班', FormField.scheduleForm(members, taskTypes));
    }

    saveSchedule(event) {
        event.preventDefault();
        const type = document.getElementById('scheduleType').value;
        const memberId = document.getElementById('scheduleMember').value;
        const dateStr = document.getElementById('scheduleDate').value;
        const date = new Date(dateStr).getTime();

        this.scheduleService.add(memberId, type, date);
        this.modal.close();
        this.toast.show('排班已添加');
    }

    markDone(scheduleId) {
        this.scheduleService.markDone(scheduleId, this.recordService, this.taskTypeService);
        this.toast.show('已标记完成');
    }

    deleteSchedule(scheduleId) {
        if (!confirm('确定要删除这个排班吗？')) return;
        this.scheduleService.delete(scheduleId);
        this.toast.show('排班已删除');
    }

    showAddRuleModal() {
        const members = this.memberService.getAll();
        const taskTypes = this.taskTypeService.getAllAsObject();
        if (members.length === 0) {
            this.toast.show('请先添加成员');
            return;
        }
        this.modal.open('新建排班规则', FormField.scheduleRuleForm(null, taskTypes, members));
        setTimeout(() => this._initRuleFormInteractions(), 50);
    }

    showEditRuleModal(ruleId) {
        const rule = this.scheduleService.getRuleById(ruleId);
        if (!rule) {
            this.toast.show('规则不存在');
            return;
        }
        const members = this.memberService.getAll();
        const taskTypes = this.taskTypeService.getAllAsObject();
        this.modal.open('编辑排班规则', FormField.scheduleRuleForm(rule, taskTypes, members));
        setTimeout(() => this._initRuleFormInteractions(), 50);
    }

    _initRuleFormInteractions() {
        this._setupSortableMembers();
    }

    _setupSortableMembers() {
        const container = document.getElementById('ruleMemberList');
        if (!container) return;
        let draggedEl = null;

        container.querySelectorAll('.member-checkbox').forEach(item => {
            item.setAttribute('draggable', 'true');
            item.addEventListener('dragstart', (e) => {
                draggedEl = item;
                item.style.opacity = '0.5';
            });
            item.addEventListener('dragend', () => {
                item.style.opacity = '1';
                container.querySelectorAll('.member-checkbox').forEach(el => el.style.borderColor = '');
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (item !== draggedEl) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        item.style.borderTop = '2px solid var(--primary)';
                        item.style.borderBottom = '';
                    } else {
                        item.style.borderBottom = '2px solid var(--primary)';
                        item.style.borderTop = '';
                    }
                }
            });
            item.addEventListener('dragleave', () => {
                item.style.borderTop = '';
                item.style.borderBottom = '';
            });
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedEl || item === draggedEl) return;
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    container.insertBefore(draggedEl, item);
                } else {
                    container.insertBefore(draggedEl, item.nextSibling);
                }
                item.style.borderTop = '';
                item.style.borderBottom = '';
            });
        });
    }

    toggleRuleTypeFields() {
        const type = document.querySelector('input[name="ruleType"]:checked').value;
        document.getElementById('ruleIntervalFields').style.display = type === 'interval' ? 'block' : 'none';
        document.getElementById('ruleWeeklyFields').style.display = type === 'weekly' ? 'block' : 'none';
        document.getElementById('ruleMonthlyFields').style.display = type === 'monthly' ? 'block' : 'none';
        document.querySelectorAll('.rule-type-tab').forEach(tab => {
            const input = tab.querySelector('input');
            tab.classList.toggle('active', input && input.checked);
        });
    }

    saveScheduleRule(event, ruleId) {
        event.preventDefault();
        const taskTypeId = document.getElementById('ruleTaskType').value;
        if (!taskTypeId) {
            this.toast.show('请选择任务类型');
            return;
        }
        const type = document.querySelector('input[name="ruleType"]:checked').value;
        const startDate = new Date(document.getElementById('ruleStartDate').value).getTime();
        const enabled = document.getElementById('ruleEnabled').checked;

        const memberEl = document.getElementById('ruleMemberList');
        const memberOrder = [];
        memberEl.querySelectorAll('.member-checkbox').forEach(el => {
            const input = el.querySelector('input[name="ruleMember"]');
            if (input && input.checked) {
                memberOrder.push(input.value);
            }
        });

        if (memberOrder.length === 0) {
            this.toast.show('请至少选择一名成员');
            return;
        }

        const ruleData = {
            type,
            taskTypeId,
            memberOrder,
            startDate,
            enabled
        };

        switch (type) {
            case 'interval':
                ruleData.intervalDays = parseInt(document.getElementById('ruleIntervalDays').value) || 3;
                ruleData.weekdays = [];
                ruleData.monthDays = [];
                break;
            case 'weekly':
                ruleData.weekdays = Array.from(document.querySelectorAll('input[name="ruleWeekday"]:checked')).map(i => parseInt(i.value));
                ruleData.monthDays = [];
                ruleData.intervalDays = 7;
                if (ruleData.weekdays.length === 0) {
                    this.toast.show('请至少选择一个星期');
                    return;
                }
                break;
            case 'monthly':
                ruleData.monthDays = Array.from(document.querySelectorAll('input[name="ruleMonthday"]:checked')).map(i => parseInt(i.value));
                ruleData.weekdays = [];
                ruleData.intervalDays = 30;
                if (ruleData.monthDays.length === 0) {
                    this.toast.show('请至少选择一个日期');
                    return;
                }
                break;
        }

        if (ruleId) {
            this.scheduleService.updateRule(ruleId, ruleData);
            this.toast.show('规则已更新');
        } else {
            this.scheduleService.addRule(ruleData);
            this.toast.show('规则已创建');
        }
        this.modal.close();
    }

    toggleRuleEnabled(ruleId) {
        this.scheduleService.toggleRuleEnabled(ruleId);
        const rule = this.scheduleService.getRuleById(ruleId);
        this.toast.show(rule && rule.enabled ? '规则已启用' : '规则已停用');
    }

    deleteScheduleRule(ruleId) {
        if (!confirm('确定要删除这条规则吗？由该规则生成的排班不会被删除。')) return;
        this.scheduleService.deleteRule(ruleId);
        this.toast.show('规则已删除');
    }

    showBatchGenerateModal() {
        const rules = this.scheduleService.getAllRules();
        if (rules.length === 0) {
            if (!confirm('还没有创建排班规则，现在去创建吗？')) return;
            this.showAddRuleModal();
            return;
        }
        const taskTypes = this.taskTypeService.getAllAsObject();
        const members = this.memberService.getAll();
        this.modal.open('⚡ 智能批量生成排班', FormField.scheduleBatchForm(taskTypes, members));
    }

    handleBatchGenerate(event) {
        event.preventDefault();
        const days = Math.min(365, Math.max(1, parseInt(document.getElementById('batchDays').value) || 30));
        const startFrom = new Date(document.getElementById('batchStartDate').value).getTime();
        const taskTypeIds = Array.from(document.querySelectorAll('input[name="batchType"]:checked')).map(i => i.value);
        const clearExisting = document.getElementById('batchClearExisting').checked;

        if (taskTypeIds.length === 0) {
            this.toast.show('请至少选择一个任务类型');
            return;
        }

        const rules = this.scheduleService.getAllRules().filter(r => taskTypeIds.includes(r.taskTypeId));
        if (rules.length === 0) {
            this.toast.show('所选任务类型还没有排班规则');
            return;
        }

        try {
            const generated = this.scheduleService.generateSchedulesForDays(days, {
                taskTypeIds,
                clearExisting,
                startFrom
            });
            this.modal.close();
            this.toast.show(`✅ 成功生成 ${generated.length} 条排班（未来 ${days} 天）`);
        } catch (e) {
            this.toast.show('生成失败：' + e.message);
        }
    }

    showSwapModal(scheduleId) {
        const schedule = this.scheduleService.getById(scheduleId);
        if (!schedule) return;
        const candidates = this.scheduleService.getSwapCandidates(scheduleId);
        const members = this.memberService.getAll();
        this.modal.open('🔄 换值（互换排班）', FormField.scheduleSwapForm(schedule, candidates, members, formatDate));
    }

    handleScheduleSwap(event, scheduleId) {
        event.preventDefault();
        const targetId = document.getElementById('swapTargetId').value;
        const note = document.getElementById('swapNote')?.value?.trim() || '';
        try {
            this.scheduleService.swapSchedules(scheduleId, targetId, note);
            this.modal.close();
            this.toast.show('✅ 换值成功');
        } catch (e) {
            this.toast.show('换值失败：' + e.message);
        }
    }

    showSubstituteModal(scheduleId) {
        const schedule = this.scheduleService.getById(scheduleId);
        if (!schedule) return;
        const members = this.memberService.getAll();
        this.modal.open('👥 代值（指定他人代班）', FormField.scheduleSubstituteForm(schedule, members, formatDate));
        setTimeout(() => {
            const revertBox = document.getElementById('substituteRevert');
            const memberSection = document.getElementById('substituteMemberSection');
            if (revertBox && memberSection) {
                const toggle = () => {
                    memberSection.style.display = revertBox.checked ? 'none' : 'block';
                    memberSection.querySelectorAll('select, textarea').forEach(el => {
                        el.disabled = revertBox.checked;
                        el.required = !revertBox.checked;
                    });
                };
                revertBox.addEventListener('change', toggle);
                toggle();
            }
        }, 50);
    }

    handleScheduleSubstitute(event, scheduleId) {
        event.preventDefault();
        const revertBox = document.getElementById('substituteRevert');
        if (revertBox && revertBox.checked) {
            try {
                this.scheduleService.revertSubstitute(scheduleId);
                this.modal.close();
                this.toast.show('✅ 已恢复原值班人');
            } catch (e) {
                this.toast.show('操作失败：' + e.message);
            }
            return;
        }
        const substituteMemberId = document.getElementById('substituteMemberId').value;
        const note = document.getElementById('substituteNote')?.value?.trim() || '';
        try {
            this.scheduleService.substituteSchedule(scheduleId, substituteMemberId, note);
            this.modal.close();
            this.toast.show('✅ 代值成功');
        } catch (e) {
            this.toast.show('代值失败：' + e.message);
        }
    }
}
