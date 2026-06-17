export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

export function formatDateShort(timestamp) {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function getMonthStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export function getDaysDiff(timestamp) {
    const now = Date.now();
    return Math.ceil((timestamp - now) / (1000 * 60 * 60 * 24));
}

export function getDaysDiffBetween(startTs, endTs) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const start = new Date(startTs);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endTs);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

export function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

export function getDateStr(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
}

export function getCurrentDateDisplay() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return now.toLocaleDateString('zh-CN', options);
}

export const WEEKDAY_MAP = {
    0: { name: '周日', short: '日' },
    1: { name: '周一', short: '一' },
    2: { name: '周二', short: '二' },
    3: { name: '周三', short: '三' },
    4: { name: '周四', short: '四' },
    5: { name: '周五', short: '五' },
    6: { name: '周六', short: '六' }
};

export function getWeekday(timestamp) {
    return new Date(timestamp).getDay();
}

export function getWeekdayName(timestamp) {
    return WEEKDAY_MAP[getWeekday(timestamp)].name;
}

export function getWeekdayShort(timestamp) {
    return WEEKDAY_MAP[getWeekday(timestamp)].short;
}

export function startOfDay(timestamp) {
    const d = new Date(timestamp || Date.now());
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function addDays(timestamp, days) {
    const d = new Date(timestamp);
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function addWeeks(timestamp, weeks) {
    return addDays(timestamp, weeks * 7);
}

export function addMonths(timestamp, months) {
    const d = new Date(timestamp);
    d.setMonth(d.getMonth() + months);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function isSameDay(ts1, ts2) {
    const d1 = new Date(ts1);
    const d2 = new Date(ts2);
    return d1.getFullYear() === d2.getFullYear()
        && d1.getMonth() === d2.getMonth()
        && d1.getDate() === d2.getDate();
}

export function getDayOfMonth(timestamp) {
    return new Date(timestamp).getDate();
}

export function getLastDayOfMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

export function generateDateRange(startTs, days) {
    const dates = [];
    let current = startOfDay(startTs);
    for (let i = 0; i < days; i++) {
        dates.push(current);
        current = addDays(current, 1);
    }
    return dates;
}
