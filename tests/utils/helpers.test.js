import { describe, it, expect } from 'vitest';
import {
  generateId,
  formatDate,
  formatDateShort,
  formatDateTime,
  getMonthStart,
  getDaysDiff,
  getDaysDiffBetween,
  getTodayStr,
  getDateStr,
  getCurrentDateDisplay,
  WEEKDAY_MAP,
  getWeekday,
  getWeekdayName,
  getWeekdayShort,
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  isSameDay,
  getDayOfMonth,
  getLastDayOfMonth,
  generateDateRange,
} from '../../js/utils/helpers.js';

describe('helpers - generateId', () => {
  it('should generate a string id', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate unique ids', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('helpers - formatDate', () => {
  it('should format date to zh-CN locale', () => {
    const ts = new Date(2024, 0, 15).getTime();
    const result = formatDate(ts);
    expect(result).toContain('2024');
    expect(result).toContain('01');
    expect(result).toContain('15');
  });
});

describe('helpers - formatDateShort', () => {
  it('should format date as M/D', () => {
    const ts = new Date(2024, 5, 20).getTime();
    const result = formatDateShort(ts);
    expect(result).toBe('6/20');
  });
});

describe('helpers - formatDateTime', () => {
  it('should format date and time', () => {
    const ts = new Date(2024, 5, 20, 14, 30).getTime();
    const result = formatDateTime(ts);
    expect(result).toContain('06');
    expect(result).toContain('20');
    expect(result).toContain('14');
    expect(result).toContain('30');
  });
});

describe('helpers - getMonthStart', () => {
  it('should return start of current month', () => {
    const result = getMonthStart();
    const date = new Date(result);
    expect(date.getDate()).toBe(1);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
  });
});

describe('helpers - getDaysDiff', () => {
  it('should return positive days for future date', () => {
    const future = Date.now() + 86400000 * 5;
    const diff = getDaysDiff(future);
    expect(diff).toBeGreaterThan(0);
  });

  it('should return negative days for past date', () => {
    const past = Date.now() - 86400000 * 3;
    const diff = getDaysDiff(past);
    expect(diff).toBeLessThan(0);
  });
});

describe('helpers - getDaysDiffBetween', () => {
  it('should return correct days between two timestamps', () => {
    const start = new Date(2024, 0, 1).getTime();
    const end = new Date(2024, 0, 10).getTime();
    expect(getDaysDiffBetween(start, end)).toBe(9);
  });

  it('should return negative if end is before start', () => {
    const start = new Date(2024, 0, 10).getTime();
    const end = new Date(2024, 0, 1).getTime();
    expect(getDaysDiffBetween(start, end)).toBe(-9);
  });

  it('should return 0 for same day', () => {
    const start = new Date(2024, 0, 1, 10, 0).getTime();
    const end = new Date(2024, 0, 1, 18, 0).getTime();
    expect(getDaysDiffBetween(start, end)).toBe(0);
  });
});

describe('helpers - getTodayStr', () => {
  it('should return today as YYYY-MM-DD', () => {
    const result = getTodayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('helpers - getDateStr', () => {
  it('should return date as YYYY-MM-DD format', () => {
    const ts = new Date(Date.UTC(2024, 5, 20, 12, 0, 0)).getTime();
    const result = getDateStr(ts);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return same date for same timestamp', () => {
    const ts = Date.now();
    const result1 = getDateStr(ts);
    const result2 = getDateStr(ts);
    expect(result1).toBe(result2);
  });
});

describe('helpers - getCurrentDateDisplay', () => {
  it('should return formatted current date with weekday', () => {
    const result = getCurrentDateDisplay();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('helpers - WEEKDAY_MAP', () => {
  it('should have 7 days', () => {
    expect(Object.keys(WEEKDAY_MAP).length).toBe(7);
  });

  it('should have name and short for each day', () => {
    for (let i = 0; i < 7; i++) {
      expect(WEEKDAY_MAP[i]).toHaveProperty('name');
      expect(WEEKDAY_MAP[i]).toHaveProperty('short');
    }
  });
});

describe('helpers - getWeekday', () => {
  it('should return correct weekday (0-6)', () => {
    const ts = new Date(2024, 0, 1).getTime();
    expect(getWeekday(ts)).toBe(1);
  });
});

describe('helpers - getWeekdayName', () => {
  it('should return weekday name in Chinese', () => {
    const ts = new Date(2024, 0, 1).getTime();
    expect(getWeekdayName(ts)).toBe('周一');
  });
});

describe('helpers - getWeekdayShort', () => {
  it('should return short weekday name', () => {
    const ts = new Date(2024, 0, 1).getTime();
    expect(getWeekdayShort(ts)).toBe('一');
  });
});

describe('helpers - startOfDay', () => {
  it('should return start of day for given timestamp', () => {
    const ts = new Date(2024, 5, 20, 14, 30, 45).getTime();
    const result = startOfDay(ts);
    const d = new Date(result);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
    expect(d.getDate()).toBe(20);
  });

  it('should use current time if no timestamp provided', () => {
    const result = startOfDay();
    const d = new Date(result);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('helpers - addDays', () => {
  it('should add days correctly', () => {
    const ts = new Date(2024, 0, 15).getTime();
    const result = addDays(ts, 5);
    expect(new Date(result).getDate()).toBe(20);
  });

  it('should set time to start of day', () => {
    const ts = new Date(2024, 0, 15, 14, 30).getTime();
    const result = addDays(ts, 1);
    const d = new Date(result);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('should handle negative days', () => {
    const ts = new Date(2024, 0, 15).getTime();
    const result = addDays(ts, -5);
    expect(new Date(result).getDate()).toBe(10);
  });
});

describe('helpers - addWeeks', () => {
  it('should add weeks correctly', () => {
    const ts = new Date(2024, 0, 1).getTime();
    const result = addWeeks(ts, 2);
    expect(getDaysDiffBetween(ts, result)).toBe(14);
  });
});

describe('helpers - addMonths', () => {
  it('should add months correctly', () => {
    const ts = new Date(2024, 0, 15).getTime();
    const result = addMonths(ts, 3);
    const d = new Date(result);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(15);
  });

  it('should set time to start of day', () => {
    const ts = new Date(2024, 0, 15, 14, 30).getTime();
    const result = addMonths(ts, 1);
    const d = new Date(result);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('helpers - isSameDay', () => {
  it('should return true for same day', () => {
    const ts1 = new Date(2024, 0, 15, 10, 0).getTime();
    const ts2 = new Date(2024, 0, 15, 18, 0).getTime();
    expect(isSameDay(ts1, ts2)).toBe(true);
  });

  it('should return false for different days', () => {
    const ts1 = new Date(2024, 0, 15).getTime();
    const ts2 = new Date(2024, 0, 16).getTime();
    expect(isSameDay(ts1, ts2)).toBe(false);
  });
});

describe('helpers - getDayOfMonth', () => {
  it('should return day of month', () => {
    const ts = new Date(2024, 0, 25).getTime();
    expect(getDayOfMonth(ts)).toBe(25);
  });
});

describe('helpers - getLastDayOfMonth', () => {
  it('should return last day of month', () => {
    expect(getLastDayOfMonth(2024, 0)).toBe(31);
    expect(getLastDayOfMonth(2024, 1)).toBe(29);
    expect(getLastDayOfMonth(2023, 1)).toBe(28);
    expect(getLastDayOfMonth(2024, 3)).toBe(30);
  });
});

describe('helpers - generateDateRange', () => {
  it('should generate array of dates', () => {
    const start = new Date(2024, 0, 1).getTime();
    const result = generateDateRange(start, 5);
    expect(result.length).toBe(5);
    expect(isSameDay(result[0], start)).toBe(true);
    expect(getDaysDiffBetween(result[0], result[4])).toBe(4);
  });

  it('should start from start of day', () => {
    const start = new Date(2024, 0, 1, 14, 30).getTime();
    const result = generateDateRange(start, 3);
    result.forEach(ts => {
      const d = new Date(ts);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    });
  });
});
