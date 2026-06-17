import { describe, it, expect, beforeEach } from 'vitest';
import { BillService } from '../../js/services/BillService.js';
import { createTestStore, createTestMember } from '../helpers/testUtils.js';

describe('BillService', () => {
  let store;
  let billService;

  beforeEach(() => {
    store = createTestStore();
    billService = new BillService(store);
  });

  describe('getAll', () => {
    it('should return all bills', () => {
      const bills = [
        { id: 'b1', category: 'rent', amount: 1000, payerId: 'm1' },
        { id: 'b2', category: 'electricity', amount: 200, payerId: 'm2' },
      ];
      store.set('bills', bills);
      expect(billService.getAll()).toEqual(bills);
    });

    it('should return empty array when no bills', () => {
      expect(billService.getAll()).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return bill by id', () => {
      const bill = { id: 'b1', category: 'rent', amount: 1000 };
      store.set('bills', [bill]);
      expect(billService.getById('b1')).toEqual(bill);
    });

    it('should return undefined for non-existent id', () => {
      expect(billService.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('getByMonth', () => {
    it('should return bills from month start', () => {
      const monthStart = new Date(2024, 0, 1).getTime();
      store.set('bills', [
        { id: 'b1', date: new Date(2024, 0, 15).getTime(), amount: 100 },
        { id: 'b2', date: new Date(2023, 11, 20).getTime(), amount: 200 },
      ]);
      const result = billService.getByMonth(monthStart);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('b1');
    });
  });

  describe('getFiltered', () => {
    beforeEach(() => {
      const now = Date.now();
      store.set('bills', [
        { id: 'b1', category: 'rent', amount: 1000, payerId: 'm1', date: now - 86400000 },
        { id: 'b2', category: 'electricity', amount: 200, payerId: 'm2', date: now - 86400000 * 2 },
        { id: 'b3', category: 'rent', amount: 900, payerId: 'm1', date: now - 86400000 * 30 },
      ]);
    });

    it('should filter by category', () => {
      const result = billService.getFiltered('rent', 'all');
      expect(result.length).toBe(2);
      result.forEach(b => expect(b.category).toBe('rent'));
    });

    it('should filter by member (payer)', () => {
      const result = billService.getFiltered('all', 'm2');
      expect(result.length).toBe(1);
      expect(result[0].payerId).toBe('m2');
    });

    it('should filter by month start', () => {
      const monthStart = Date.now() - 86400000 * 10;
      const result = billService.getFiltered('all', 'all', monthStart);
      expect(result.length).toBe(2);
    });

    it('should sort by date descending', () => {
      const result = billService.getFiltered('all', 'all');
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].date).toBeGreaterThanOrEqual(result[i].date);
      }
    });
  });

  describe('getMonthTotal', () => {
    it('should return total amount for month', () => {
      const monthStart = new Date(2024, 0, 1).getTime();
      store.set('bills', [
        { id: 'b1', date: new Date(2024, 0, 15).getTime(), amount: 100 },
        { id: 'b2', date: new Date(2024, 0, 20).getTime(), amount: 200 },
        { id: 'b3', date: new Date(2023, 11, 20).getTime(), amount: 300 },
      ]);
      expect(billService.getMonthTotal(monthStart)).toBe(300);
    });
  });

  describe('getCategoryTotal', () => {
    it('should return totals grouped by category', () => {
      const monthStart = new Date(2024, 0, 1).getTime();
      store.set('bills', [
        { id: 'b1', date: new Date(2024, 0, 15).getTime(), amount: 100, category: 'rent' },
        { id: 'b2', date: new Date(2024, 0, 20).getTime(), amount: 50, category: 'rent' },
        { id: 'b3', date: new Date(2024, 0, 25).getTime(), amount: 30, category: 'electricity' },
      ]);
      const result = billService.getCategoryTotal(monthStart);
      expect(result.rent).toBe(150);
      expect(result.electricity).toBe(30);
    });
  });

  describe('add', () => {
    it('should add a new bill', () => {
      const billData = {
        category: 'rent',
        amount: '1000.50',
        payerId: 'm1',
        date: Date.now(),
        note: '一月份房租',
        sharedBy: ['m1', 'm2'],
      };
      const bill = billService.add(billData);

      expect(bill).toHaveProperty('id');
      expect(bill.category).toBe('rent');
      expect(bill.amount).toBe(1000.5);
      expect(bill.payerId).toBe('m1');
      expect(bill.note).toBe('一月份房租');
      expect(bill.settled).toBe(false);
      expect(bill).toHaveProperty('createdAt');
      expect(bill.sharedBy).toEqual(['m1', 'm2']);
    });

    it('should default sharedBy to empty array', () => {
      const bill = billService.add({ category: 'rent', amount: 100, payerId: 'm1', date: Date.now() });
      expect(bill.sharedBy).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update bill data', () => {
      const bill = billService.add({ category: 'rent', amount: 100, payerId: 'm1', date: Date.now() });
      billService.update(bill.id, { amount: 200, note: 'updated' });
      const updated = billService.getById(bill.id);
      expect(updated.amount).toBe(200);
      expect(updated.note).toBe('updated');
    });
  });

  describe('delete', () => {
    it('should delete a bill', () => {
      const bill = billService.add({ category: 'rent', amount: 100, payerId: 'm1', date: Date.now() });
      expect(billService.getAll().length).toBe(1);
      billService.delete(bill.id);
      expect(billService.getAll().length).toBe(0);
    });
  });

  describe('markSettled', () => {
    it('should mark bill as settled', () => {
      const bill = billService.add({ category: 'rent', amount: 100, payerId: 'm1', date: Date.now() });
      expect(bill.settled).toBe(false);
      billService.markSettled(bill.id);
      expect(billService.getById(bill.id).settled).toBe(true);
    });
  });

  describe('markAllSettled', () => {
    it('should mark all bills as settled', () => {
      billService.add({ category: 'rent', amount: 100, payerId: 'm1', date: Date.now() });
      billService.add({ category: 'electricity', amount: 50, payerId: 'm2', date: Date.now() });
      billService.markAllSettled();
      billService.getAll().forEach(b => expect(b.settled).toBe(true));
    });
  });

  describe('getUnsettledTotal', () => {
    it('should return total of unsettled bills', () => {
      store.set('bills', [
        { id: 'b1', amount: 100, settled: false },
        { id: 'b2', amount: 200, settled: true },
        { id: 'b3', amount: 50, settled: false },
      ]);
      expect(billService.getUnsettledTotal()).toBe(150);
    });
  });

  describe('getSettledTotal', () => {
    it('should return total of settled bills', () => {
      store.set('bills', [
        { id: 'b1', amount: 100, settled: false },
        { id: 'b2', amount: 200, settled: true },
        { id: 'b3', amount: 50, settled: true },
      ]);
      expect(billService.getSettledTotal()).toBe(250);
    });
  });

  describe('_calculateRawSettlement', () => {
    it('should return empty array if no bills or no members', () => {
      const members = [createTestMember({ id: 'm1' })];
      const result = billService._calculateRawSettlement(members);
      expect(result).toEqual([]);
    });

    it('should calculate settlement correctly for two members', () => {
      const m1 = createTestMember({ id: 'm1', name: '小明' });
      const m2 = createTestMember({ id: 'm2', name: '小红' });
      const members = [m1, m2];

      store.set('bills', [
        { id: 'b1', payerId: 'm1', amount: 100, sharedBy: ['m1', 'm2'], settled: false },
      ]);

      const result = billService._calculateRawSettlement(members);
      expect(result.length).toBe(1);
      expect(result[0].fromId).toBe('m2');
      expect(result[0].toId).toBe('m1');
      expect(result[0].amount).toBe(50);
    });
  });

  describe('settlements', () => {
    it('should get empty settlements initially', () => {
      expect(billService.getSettlements()).toEqual([]);
    });

    it('should mark settlement done', () => {
      store.set('settlements', [
        { id: 's1', fromId: 'm1', toId: 'm2', amount: 50, settled: false },
      ]);
      billService.markSettlementDone('s1');
      const settlements = billService.getSettlements();
      expect(settlements[0].settled).toBe(true);
      expect(settlements[0]).toHaveProperty('settledAt');
    });

    it('should mark all settlements done', () => {
      store.set('settlements', [
        { id: 's1', settled: false },
        { id: 's2', settled: false },
      ]);
      billService.markAllSettlementsDone();
      billService.getSettlements().forEach(s => expect(s.settled).toBe(true));
    });

    it('should reset settlements', () => {
      store.set('settlements', [{ id: 's1', settled: false }]);
      billService.resetSettlements();
      expect(billService.getSettlements()).toEqual([]);
    });

    it('should delete settlements by member', () => {
      store.set('settlements', [
        { id: 's1', fromId: 'm1', toId: 'm2' },
        { id: 's2', fromId: 'm2', toId: 'm3' },
        { id: 's3', fromId: 'm3', toId: 'm4' },
      ]);
      billService.deleteSettlementsByMember('m2');
      const result = billService.getSettlements();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('s3');
    });
  });
});
