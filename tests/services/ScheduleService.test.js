import { describe, it, expect, beforeEach } from 'vitest';
import { ScheduleService } from '../../js/services/ScheduleService.js';
import { createTestStore, createTestMember, createTestTaskType } from '../helpers/testUtils.js';
import { startOfDay } from '../../js/utils/helpers.js';

describe('ScheduleService', () => {
  let store;
  let scheduleService;

  beforeEach(() => {
    store = createTestStore();
    scheduleService = new ScheduleService(store);
  });

  describe('getAll', () => {
    it('should return all schedules', () => {
      const schedules = [
        { id: 's1', memberId: 'm1', type: 'trash', date: Date.now() },
        { id: 's2', memberId: 'm2', type: 'clean', date: Date.now() },
      ];
      store.set('schedules', schedules);
      expect(scheduleService.getAll()).toEqual(schedules);
    });
  });

  describe('getByType', () => {
    beforeEach(() => {
      const now = Date.now();
      store.set('schedules', [
        { id: 's1', type: 'trash', memberId: 'm1', date: now + 86400000 },
        { id: 's2', type: 'trash', memberId: 'm2', date: now + 86400000 * 2 },
        { id: 's3', type: 'clean', memberId: 'm1', date: now + 86400000 },
      ]);
    });

    it('should return schedules of given type', () => {
      const result = scheduleService.getByType('trash');
      expect(result.length).toBe(2);
      result.forEach(s => expect(s.type).toBe('trash'));
    });

    it('should sort by date ascending', () => {
      const result = scheduleService.getByType('trash');
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].date).toBeLessThanOrEqual(result[i].date);
      }
    });
  });

  describe('getById', () => {
    it('should return schedule by id', () => {
      const schedule = { id: 's1', type: 'trash', memberId: 'm1' };
      store.set('schedules', [schedule]);
      expect(scheduleService.getById('s1')).toEqual(schedule);
    });

    it('should return undefined for non-existent id', () => {
      expect(scheduleService.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('add', () => {
    it('should add a new schedule', () => {
      const date = Date.now();
      const schedule = scheduleService.add('m1', 'trash', date);

      expect(schedule).toHaveProperty('id');
      expect(schedule.memberId).toBe('m1');
      expect(schedule.type).toBe('trash');
      expect(schedule.completed).toBe(false);
      expect(schedule).toHaveProperty('date');
    });

    it('should set date to start of day', () => {
      const date = new Date(2024, 5, 20, 14, 30).getTime();
      const schedule = scheduleService.add('m1', 'trash', date);
      expect(schedule.date).toBe(startOfDay(date));
    });
  });

  describe('update', () => {
    it('should update schedule data', () => {
      const schedule = scheduleService.add('m1', 'trash', Date.now());
      scheduleService.update(schedule.id, { memberId: 'm2', type: 'clean' });
      const updated = scheduleService.getById(schedule.id);
      expect(updated.memberId).toBe('m2');
      expect(updated.type).toBe('clean');
    });
  });

  describe('delete', () => {
    it('should delete a schedule', () => {
      const schedule = scheduleService.add('m1', 'trash', Date.now());
      expect(scheduleService.getAll().length).toBe(1);
      scheduleService.delete(schedule.id);
      expect(scheduleService.getAll().length).toBe(0);
    });
  });

  describe('moveToDate', () => {
    it('should move schedule to new date', () => {
      const oldDate = new Date(2024, 0, 15).getTime();
      const newDate = new Date(2024, 0, 20).getTime();
      const schedule = scheduleService.add('m1', 'trash', oldDate);

      scheduleService.moveToDate(schedule.id, newDate);
      const moved = scheduleService.getById(schedule.id);
      expect(moved.date).toBe(startOfDay(newDate));
    });

    it('should throw error if schedule not found', () => {
      expect(() => scheduleService.moveToDate('nonexistent', Date.now())).toThrow('排班不存在');
    });
  });

  describe('schedule rules', () => {
    describe('getAllRules', () => {
      it('should return all rules', () => {
        const rules = scheduleService.getAllRules();
        expect(Array.isArray(rules)).toBe(true);
      });
    });

    describe('addRule', () => {
      it('should add a new rule', () => {
        const rule = scheduleService.addRule({
          type: 'interval',
          taskTypeId: 'trash',
          memberOrder: ['m1', 'm2'],
          intervalDays: 3,
          startDate: Date.now(),
        });
        expect(rule).toHaveProperty('id');
        expect(rule.type).toBe('interval');
        expect(rule.enabled).toBe(true);
      });

      it('should set startDate to start of day', () => {
        const date = new Date(2024, 5, 20, 14, 30).getTime();
        const rule = scheduleService.addRule({
          type: 'interval',
          taskTypeId: 'trash',
          intervalDays: 3,
          startDate: date,
        });
        expect(rule.startDate).toBe(startOfDay(date));
      });
    });

    describe('getRuleById', () => {
      it('should return rule by id', () => {
        const rule = scheduleService.addRule({
          type: 'interval',
          taskTypeId: 'trash',
          intervalDays: 3,
        });
        expect(scheduleService.getRuleById(rule.id)).toBeDefined();
      });
    });

    describe('updateRule', () => {
      it('should update rule data', () => {
        const rule = scheduleService.addRule({
          type: 'interval',
          taskTypeId: 'trash',
          intervalDays: 3,
        });
        scheduleService.updateRule(rule.id, { intervalDays: 7 });
        const updated = scheduleService.getRuleById(rule.id);
        expect(updated.intervalDays).toBe(7);
      });
    });

    describe('deleteRule', () => {
      it('should delete rule and clear ruleId from schedules', () => {
        const rule = scheduleService.addRule({
          type: 'interval',
          taskTypeId: 'trash',
          intervalDays: 3,
        });
        store.set('schedules', [
          { id: 's1', ruleId: rule.id, type: 'trash', memberId: 'm1', date: Date.now() },
          { id: 's2', ruleId: null, type: 'trash', memberId: 'm2', date: Date.now() },
        ]);

        scheduleService.deleteRule(rule.id);
        expect(scheduleService.getRuleById(rule.id)).toBeUndefined();
        const s1 = scheduleService.getById('s1');
        expect(s1.ruleId).toBeNull();
      });
    });

    describe('toggleRuleEnabled', () => {
      it('should toggle rule enabled status', () => {
        const rule = scheduleService.addRule({
          type: 'interval',
          taskTypeId: 'trash',
          intervalDays: 3,
        });
        expect(rule.enabled).toBe(true);
        scheduleService.toggleRuleEnabled(rule.id);
        expect(scheduleService.getRuleById(rule.id).enabled).toBe(false);
      });
    });
  });

  describe('swapSchedules', () => {
    it('should swap members between two schedules', () => {
      const s1 = scheduleService.add('m1', 'trash', Date.now());
      const s2 = scheduleService.add('m2', 'trash', Date.now() + 86400000);

      scheduleService.swapSchedules(s1.id, s2.id);

      expect(scheduleService.getById(s1.id).memberId).toBe('m2');
      expect(scheduleService.getById(s2.id).memberId).toBe('m1');
      expect(scheduleService.getById(s1.id).substituteType).toBe('swap');
    });

    it('should throw error if schedules not found', () => {
      const s1 = scheduleService.add('m1', 'trash', Date.now());
      expect(() => scheduleService.swapSchedules(s1.id, 'nonexistent')).toThrow('排班不存在');
    });

    it('should throw error if different types', () => {
      const s1 = scheduleService.add('m1', 'trash', Date.now());
      const s2 = scheduleService.add('m2', 'clean', Date.now());
      expect(() => scheduleService.swapSchedules(s1.id, s2.id)).toThrow('只能在同一任务类型之间换值');
    });
  });

  describe('substituteSchedule', () => {
    it('should substitute member for a schedule', () => {
      const s = scheduleService.add('m1', 'trash', Date.now());
      scheduleService.substituteSchedule(s.id, 'm3', '有事代班');

      const updated = scheduleService.getById(s.id);
      expect(updated.memberId).toBe('m3');
      expect(updated.originalMemberId).toBe('m1');
      expect(updated.substituteType).toBe('substitute');
      expect(updated.substituteNote).toBe('有事代班');
    });

    it('should throw error if schedule not found', () => {
      expect(() => scheduleService.substituteSchedule('nonexistent', 'm2')).toThrow('排班不存在');
    });

    it('should throw error if substituting self', () => {
      const s = scheduleService.add('m1', 'trash', Date.now());
      expect(() => scheduleService.substituteSchedule(s.id, 'm1')).toThrow('不能自己代自己');
    });
  });

  describe('revertSubstitute', () => {
    it('should revert substitute', () => {
      const s = scheduleService.add('m1', 'trash', Date.now());
      scheduleService.substituteSchedule(s.id, 'm2');
      scheduleService.revertSubstitute(s.id);

      const reverted = scheduleService.getById(s.id);
      expect(reverted.memberId).toBe('m1');
      expect(reverted.originalMemberId).toBeNull();
      expect(reverted.substituteType).toBeNull();
    });

    it('should return false if no original member', () => {
      const s = scheduleService.add('m1', 'trash', Date.now());
      const result = scheduleService.revertSubstitute(s.id);
      expect(result).toBe(false);
    });
  });

  describe('getSwapCandidates', () => {
    it('should return candidate schedules for swap', () => {
      const s1 = scheduleService.add('m1', 'trash', Date.now() + 86400000);
      scheduleService.add('m2', 'trash', Date.now() + 86400000 * 2);
      scheduleService.add('m3', 'clean', Date.now() + 86400000);

      const candidates = scheduleService.getSwapCandidates(s1.id);
      expect(candidates.length).toBe(1);
      expect(candidates[0].memberId).toBe('m2');
    });

    it('should return empty array if schedule not found', () => {
      const candidates = scheduleService.getSwapCandidates('nonexistent');
      expect(candidates).toEqual([]);
    });
  });

  describe('generateDefaultSchedules', () => {
    it('should generate default schedules', () => {
      const members = [
        createTestMember({ id: 'm1' }),
        createTestMember({ id: 'm2' }),
      ];
      const taskTypeService = {
        getEnabled: () => [
          createTestTaskType({ id: 'trash', defaultInterval: 2 }),
        ],
      };

      const schedules = scheduleService.generateDefaultSchedules(members, taskTypeService);
      expect(schedules.length).toBe(2);
      schedules.forEach(s => {
        expect(s).toHaveProperty('id');
        expect(s).toHaveProperty('memberId');
        expect(s).toHaveProperty('type');
        expect(s.completed).toBe(false);
      });
    });
  });
});
