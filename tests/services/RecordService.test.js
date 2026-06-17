import { describe, it, expect, beforeEach } from 'vitest';
import { RecordService } from '../../js/services/RecordService.js';
import { createTestStore, createTestMember, createTestTaskType } from '../helpers/testUtils.js';

describe('RecordService', () => {
  let store;
  let recordService;

  beforeEach(() => {
    store = createTestStore();
    recordService = new RecordService(store);
  });

  describe('getAll', () => {
    it('should return all records', () => {
      const records = [
        { id: 'r1', memberId: 'm1', type: 'trash', date: Date.now() },
        { id: 'r2', memberId: 'm2', type: 'clean', date: Date.now() },
      ];
      store.set('records', records);
      expect(recordService.getAll()).toEqual(records);
    });
  });

  describe('getFiltered', () => {
    beforeEach(() => {
      const now = Date.now();
      store.set('records', [
        { id: 'r1', memberId: 'm1', type: 'trash', date: now - 86400000 },
        { id: 'r2', memberId: 'm2', type: 'trash', date: now - 86400000 * 2 },
        { id: 'r3', memberId: 'm1', type: 'clean', date: now - 86400000 * 3 },
      ]);
    });

    it('should return all records when filters are all', () => {
      const result = recordService.getFiltered('all', 'all');
      expect(result.length).toBe(3);
    });

    it('should filter by type', () => {
      const result = recordService.getFiltered('trash', 'all');
      expect(result.length).toBe(2);
      result.forEach(r => expect(r.type).toBe('trash'));
    });

    it('should filter by member', () => {
      const result = recordService.getFiltered('all', 'm1');
      expect(result.length).toBe(2);
      result.forEach(r => expect(r.memberId).toBe('m1'));
    });

    it('should filter by both type and member', () => {
      const result = recordService.getFiltered('trash', 'm1');
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('trash');
      expect(result[0].memberId).toBe('m1');
    });

    it('should sort by date descending', () => {
      const result = recordService.getFiltered('all', 'all');
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].date).toBeGreaterThanOrEqual(result[i].date);
      }
    });
  });

  describe('getByMonth', () => {
    it('should return records from month start', () => {
      const monthStart = new Date(2024, 0, 1).getTime();
      store.set('records', [
        { id: 'r1', type: 'trash', date: new Date(2024, 0, 15).getTime() },
        { id: 'r2', type: 'trash', date: new Date(2023, 11, 20).getTime() },
      ]);
      const result = recordService.getByMonth(monthStart);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('r1');
    });
  });

  describe('getByMember', () => {
    it('should return records for specific member', () => {
      store.set('records', [
        { id: 'r1', memberId: 'm1', type: 'trash', date: Date.now() },
        { id: 'r2', memberId: 'm2', type: 'trash', date: Date.now() },
      ]);
      const result = recordService.getByMember('m1');
      expect(result.length).toBe(1);
      expect(result[0].memberId).toBe('m1');
    });
  });

  describe('getByType', () => {
    it('should return records of specific type', () => {
      store.set('records', [
        { id: 'r1', memberId: 'm1', type: 'trash', date: Date.now() },
        { id: 'r2', memberId: 'm1', type: 'clean', date: Date.now() },
      ]);
      const result = recordService.getByType('trash');
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('trash');
    });
  });

  describe('getLastByType', () => {
    it('should return the most recent record of a type', () => {
      const now = Date.now();
      store.set('records', [
        { id: 'r1', type: 'trash', date: now - 86400000 },
        { id: 'r2', type: 'trash', date: now },
        { id: 'r3', type: 'trash', date: now - 86400000 * 2 },
      ]);
      const result = recordService.getLastByType('trash');
      expect(result.id).toBe('r2');
    });

    it('should return null if no records of type', () => {
      expect(recordService.getLastByType('nonexistent')).toBeNull();
    });
  });

  describe('add', () => {
    it('should add a new record', () => {
      const date = Date.now();
      const record = recordService.add('m1', 'trash', date, '测试备注');

      expect(record).toHaveProperty('id');
      expect(record.memberId).toBe('m1');
      expect(record.type).toBe('trash');
      expect(record.date).toBe(date);
      expect(record.note).toBe('测试备注');

      expect(recordService.getAll().length).toBe(1);
    });

    it('should default note to empty string', () => {
      const record = recordService.add('m1', 'trash', Date.now());
      expect(record.note).toBe('');
    });
  });

  describe('delete', () => {
    it('should delete a record', () => {
      const record = recordService.add('m1', 'trash', Date.now());
      expect(recordService.getAll().length).toBe(1);

      recordService.delete(record.id);
      expect(recordService.getAll().length).toBe(0);
    });
  });

  describe('generateSampleRecords', () => {
    it('should generate sample records', () => {
      const members = [createTestMember({ id: 'm1' }), createTestMember({ id: 'm2' })];
      const taskTypeService = {
        getEnabled: () => [
          createTestTaskType({ id: 'trash' }),
          createTestTaskType({ id: 'clean' }),
        ],
      };

      const records = recordService.generateSampleRecords(members, taskTypeService);
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThan(0);
      records.forEach(r => {
        expect(r).toHaveProperty('id');
        expect(r).toHaveProperty('memberId');
        expect(r).toHaveProperty('type');
        expect(r).toHaveProperty('date');
      });
    });

    it('should return empty array if no enabled types', () => {
      const members = [createTestMember()];
      const taskTypeService = { getEnabled: () => [] };
      const records = recordService.generateSampleRecords(members, taskTypeService);
      expect(records).toEqual([]);
    });
  });
});
