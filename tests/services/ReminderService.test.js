import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReminderService } from '../../js/services/ReminderService.js';
import { createTestStore } from '../helpers/testUtils.js';

describe('ReminderService', () => {
  let store;
  let reminderService;
  let taskTypeServiceMock;

  beforeEach(() => {
    store = createTestStore();
    reminderService = new ReminderService(store);
    taskTypeServiceMock = {
      getEnabled: () => [
        { id: 'trash', name: '倒垃圾', defaultInterval: 2 },
        { id: 'clean', name: '打扫', defaultInterval: 3 },
      ],
    };
  });

  describe('getAll', () => {
    it('should return schedule reminders for upcoming and overdue schedules', () => {
      const now = Date.now();
      store.set('schedules', [
        { id: 's1', memberId: 'm1', type: 'trash', date: now - 86400000, completed: false },
        { id: 's2', memberId: 'm2', type: 'clean', date: now + 86400000, completed: false },
        { id: 's3', memberId: 'm1', type: 'trash', date: now + 86400000 * 10, completed: false },
        { id: 's4', memberId: 'm2', type: 'clean', date: now - 86400000 * 2, completed: true },
      ]);
      store.set('records', []);

      const reminders = reminderService.getAll(taskTypeServiceMock);
      const scheduleReminders = reminders.filter(r => !r.auto);

      expect(scheduleReminders.length).toBe(2);
    });

    it('should include auto reminders based on task types and records', () => {
      const now = Date.now();
      store.set('schedules', []);
      store.set('records', [
        { id: 'r1', type: 'trash', memberId: 'm1', date: now - 86400000 * 5 },
        { id: 'r2', type: 'clean', memberId: 'm2', date: now - 86400000 },
      ]);

      const reminders = reminderService.getAll(taskTypeServiceMock);
      const autoReminders = reminders.filter(r => r.auto);

      expect(autoReminders.length).toBe(1);
      expect(autoReminders[0].type).toBe('trash');
    });

    it('should include never-done auto reminders for types with no records', () => {
      store.set('schedules', []);
      store.set('records', []);

      const reminders = reminderService.getAll(taskTypeServiceMock);
      const autoReminders = reminders.filter(r => r.auto && r.neverDone);

      expect(autoReminders.length).toBe(2);
    });
  });

  describe('getOverdueCount', () => {
    it('should return count of overdue incomplete schedules', () => {
      const now = Date.now();
      store.set('schedules', [
        { id: 's1', date: now - 86400000, completed: false },
        { id: 's2', date: now - 86400000 * 2, completed: false },
        { id: 's3', date: now + 86400000, completed: false },
        { id: 's4', date: now - 86400000, completed: true },
      ]);

      expect(reminderService.getOverdueCount()).toBe(2);
    });

    it('should return 0 if no schedules', () => {
      store.set('schedules', []);
      expect(reminderService.getOverdueCount()).toBe(0);
    });
  });
});
