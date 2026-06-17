import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryService } from '../../js/services/InventoryService.js';
import { createTestStore } from '../helpers/testUtils.js';

describe('InventoryService', () => {
  let store;
  let inventoryService;

  beforeEach(() => {
    store = createTestStore();
    inventoryService = new InventoryService(store);
  });

  describe('getAllItems', () => {
    it('should return all items', () => {
      const items = [
        { id: 'i1', name: '卷纸', category: 'paper', stock: 10 },
        { id: 'i2', name: '洗衣液', category: 'cleaning', stock: 2 },
      ];
      store.set('inventoryItems', items);
      expect(inventoryService.getAllItems()).toEqual(items);
    });

    it('should return empty array when no items', () => {
      expect(inventoryService.getAllItems()).toEqual([]);
    });
  });

  describe('getItemById', () => {
    it('should return item by id', () => {
      const item = { id: 'i1', name: '卷纸', stock: 10 };
      store.set('inventoryItems', [item]);
      expect(inventoryService.getItemById('i1')).toEqual(item);
    });

    it('should return undefined for non-existent id', () => {
      expect(inventoryService.getItemById('nonexistent')).toBeUndefined();
    });
  });

  describe('getItemsByCategory', () => {
    beforeEach(() => {
      store.set('inventoryItems', [
        { id: 'i1', name: '卷纸', category: 'paper' },
        { id: 'i2', name: '抽纸', category: 'paper' },
        { id: 'i3', name: '洗衣液', category: 'cleaning' },
      ]);
    });

    it('should return items for specific category', () => {
      const result = inventoryService.getItemsByCategory('paper');
      expect(result.length).toBe(2);
      result.forEach(i => expect(i.category).toBe('paper'));
    });

    it('should return all items for "all" category', () => {
      const result = inventoryService.getItemsByCategory('all');
      expect(result.length).toBe(3);
    });

    it('should return all items for empty category', () => {
      const result = inventoryService.getItemsByCategory('');
      expect(result.length).toBe(3);
    });
  });

  describe('getLowStockItems', () => {
    beforeEach(() => {
      store.set('inventoryItems', [
        { id: 'i1', name: '卷纸', stock: 10, threshold: 5 },
        { id: 'i2', name: '抽纸', stock: 3, threshold: 4 },
        { id: 'i3', name: '洗衣液', stock: 1, threshold: 2 },
      ]);
    });

    it('should return items with stock at or below threshold', () => {
      const result = inventoryService.getLowStockItems();
      expect(result.length).toBe(2);
      const ids = result.map(i => i.id);
      expect(ids).toContain('i2');
      expect(ids).toContain('i3');
    });

    it('should use custom threshold if provided', () => {
      const result = inventoryService.getLowStockItems(8);
      expect(result.length).toBe(2);
    });
  });

  describe('addItem', () => {
    it('should add a new item', () => {
      const itemData = {
        name: '卷纸',
        category: 'paper',
        unit: '卷',
        stock: '10',
        threshold: '5',
        estimatedPrice: '3.5',
        note: '测试备注',
      };
      const item = inventoryService.addItem(itemData);

      expect(item).toHaveProperty('id');
      expect(item.name).toBe('卷纸');
      expect(item.category).toBe('paper');
      expect(item.unit).toBe('卷');
      expect(item.stock).toBe(10);
      expect(item.threshold).toBe(5);
      expect(item.estimatedPrice).toBe(3.5);
      expect(item.note).toBe('测试备注');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('updatedAt');

      expect(inventoryService.getAllItems().length).toBe(1);
    });

    it('should default unit to 个', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'other', stock: 1 });
      expect(item.unit).toBe('个');
    });

    it('should add a log when adding item', () => {
      inventoryService.addItem({ name: '测试', category: 'other', stock: 10 });
      const logs = inventoryService.getAllLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].type).toBe('adjust');
      expect(logs[0].quantity).toBe(10);
    });
  });

  describe('updateItem', () => {
    it('should update item data', () => {
      const item = inventoryService.addItem({ name: '旧名', category: 'paper', stock: 5 });
      const updated = inventoryService.updateItem(item.id, { name: '新名', threshold: 10 });

      expect(updated.name).toBe('新名');
      expect(updated.threshold).toBe(10);
      expect(updated).toHaveProperty('updatedAt');
    });

    it('should add log when stock changes', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'paper', stock: 10 });
      inventoryService.updateItem(item.id, { stock: 15 });

      const logs = inventoryService.getAllLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].type).toBe('adjust');
      expect(logs[0].quantity).toBe(5);
    });

    it('should return null if item not found', () => {
      const result = inventoryService.updateItem('nonexistent', { name: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteItem', () => {
    it('should delete item and its logs', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'paper', stock: 10 });
      expect(inventoryService.getAllItems().length).toBe(1);
      expect(inventoryService.getAllLogs().length).toBe(1);

      inventoryService.deleteItem(item.id);
      expect(inventoryService.getAllItems().length).toBe(0);
      expect(inventoryService.getAllLogs().length).toBe(0);
    });
  });

  describe('consume', () => {
    it('should decrease stock by quantity', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'paper', stock: 10 });
      const result = inventoryService.consume(item.id, 3);
      expect(result.stock).toBe(7);
    });

    it('should not go below zero', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'paper', stock: 2 });
      const result = inventoryService.consume(item.id, 5);
      expect(result.stock).toBe(0);
    });

    it('should add a consume log', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'paper', stock: 10 });
      inventoryService.consume(item.id, 3, '使用了3个');

      const logs = inventoryService.getLogsByItem(item.id);
      const consumeLogs = logs.filter(l => l.type === 'consume');
      expect(consumeLogs.length).toBe(1);
      expect(consumeLogs[0].quantity).toBe(3);
      expect(consumeLogs[0].note).toBe('使用了3个');
    });

    it('should return null if item not found', () => {
      const result = inventoryService.consume('nonexistent', 1);
      expect(result).toBeNull();
    });
  });

  describe('restock', () => {
    it('should increase stock by quantity', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'paper', stock: 5 });
      const result = inventoryService.restock(item.id, 10);
      expect(result.stock).toBe(15);
    });

    it('should add a restock log', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'paper', stock: 5 });
      inventoryService.restock(item.id, 10, '补货10个');

      const logs = inventoryService.getLogsByItem(item.id);
      const restockLogs = logs.filter(l => l.type === 'restock');
      expect(restockLogs.length).toBe(1);
      expect(restockLogs[0].quantity).toBe(10);
    });

    it('should return null if item not found', () => {
      const result = inventoryService.restock('nonexistent', 1);
      expect(result).toBeNull();
    });
  });

  describe('purchase', () => {
    it('should increase stock and add purchase log', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'paper', stock: 5 });
      const result = inventoryService.purchase(item.id, 5, 'bill-1', '购买补货');

      expect(result.stock).toBe(10);
      const logs = inventoryService.getLogsByItem(item.id);
      const purchaseLogs = logs.filter(l => l.type === 'purchase');
      expect(purchaseLogs.length).toBe(1);
      expect(purchaseLogs[0].billId).toBe('bill-1');
    });

    it('should return null if item not found', () => {
      const result = inventoryService.purchase('nonexistent', 1, 'bill-1');
      expect(result).toBeNull();
    });
  });

  describe('logs', () => {
    it('should get all logs', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'paper', stock: 10 });
      inventoryService.consume(item.id, 2);
      inventoryService.restock(item.id, 5);

      const logs = inventoryService.getAllLogs();
      expect(logs.length).toBe(3);
    });

    it('should get logs by item', () => {
      const item1 = inventoryService.addItem({ name: '物品1', category: 'paper', stock: 10 });
      const item2 = inventoryService.addItem({ name: '物品2', category: 'cleaning', stock: 5 });

      inventoryService.consume(item1.id, 1);
      inventoryService.consume(item2.id, 1);

      const logs1 = inventoryService.getLogsByItem(item1.id);
      expect(logs1.length).toBe(2);
    });

    it('should get recent logs sorted by date', () => {
      const item = inventoryService.addItem({ name: '测试', category: 'paper', stock: 10 });
      for (let i = 0; i < 5; i++) {
        inventoryService.consume(item.id, 1);
      }

      const recent = inventoryService.getRecentLogs(3);
      expect(recent.length).toBe(3);
      for (let i = 1; i < recent.length; i++) {
        expect(recent[i - 1].createdAt).toBeGreaterThanOrEqual(recent[i].createdAt);
      }
    });
  });

  describe('generateSampleItems', () => {
    it('should generate sample items', () => {
      const items = inventoryService.generateSampleItems();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      items.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('stock');
      });
    });
  });

  describe('generateSampleLogs', () => {
    it('should generate sample logs for items', () => {
      const items = inventoryService.generateSampleItems();
      const logs = inventoryService.generateSampleLogs(items);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
