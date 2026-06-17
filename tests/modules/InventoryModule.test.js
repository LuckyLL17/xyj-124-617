import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryModule } from '../../js/modules/InventoryModule.js';
import { createTestStore, createTestMember } from '../helpers/testUtils.js';
import { InventoryService } from '../../js/services/InventoryService.js';
import { MemberService } from '../../js/services/MemberService.js';
import { INVENTORY_CATEGORIES } from '../../js/utils/constants.js';

describe('InventoryModule', () => {
  let store;
  let inventoryService;
  let memberService;
  let billsModule;
  let modal;
  let toast;
  let inventoryModule;

  beforeEach(() => {
    store = createTestStore();
    inventoryService = new InventoryService(store);
    memberService = new MemberService(store);

    billsModule = {
      showAddModalWithPrefill: vi.fn(),
    };

    modal = {
      open: vi.fn(),
      close: vi.fn(),
    };

    toast = {
      show: vi.fn(),
    };

    inventoryModule = new InventoryModule(
      store,
      inventoryService,
      memberService,
      billsModule,
      modal,
      toast
    );
  });

  describe('constructor', () => {
    it('should initialize with all dependencies', () => {
      expect(inventoryModule.store).toBe(store);
      expect(inventoryModule.inventoryService).toBe(inventoryService);
      expect(inventoryModule.memberService).toBe(memberService);
      expect(inventoryModule.billsModule).toBe(billsModule);
      expect(inventoryModule.modal).toBe(modal);
      expect(inventoryModule.toast).toBe(toast);
    });
  });

  describe('_statCard', () => {
    it('should return a stat card HTML string', () => {
      const result = inventoryModule._statCard('📦', '物品种类', 10, '当前库存物品数', 'inv-cat-icon');
      expect(result).toContain('stat-card');
      expect(result).toContain('📦');
      expect(result).toContain('物品种类');
      expect(result).toContain('10');
      expect(result).toContain('当前库存物品数');
      expect(result).toContain('inv-cat-icon');
    });

    it('should handle different emoji and values', () => {
      const result = inventoryModule._statCard('⚠️', '库存不足', 3, '需要补货数量', 'inv-low-icon');
      expect(result).toContain('⚠️');
      expect(result).toContain('库存不足');
      expect(result).toContain('3');
      expect(result).toContain('需要补货数量');
    });
  });

  describe('_categoryBg', () => {
    it('should return correct background color for paper category', () => {
      expect(inventoryModule._categoryBg('paper')).toBe('#dbeafe');
    });

    it('should return correct background color for cleaning category', () => {
      expect(inventoryModule._categoryBg('cleaning')).toBe('#d1fae5');
    });

    it('should return correct background color for grocery category', () => {
      expect(inventoryModule._categoryBg('grocery')).toBe('#fef3c7');
    });

    it('should return correct background color for kitchen category', () => {
      expect(inventoryModule._categoryBg('kitchen')).toBe('#fed7aa');
    });

    it('should return correct background color for appliance category', () => {
      expect(inventoryModule._categoryBg('appliance')).toBe('#ede9fe');
    });

    it('should return correct background color for other category', () => {
      expect(inventoryModule._categoryBg('other')).toBe('#e2e8f0');
    });

    it('should return default color for unknown category', () => {
      expect(inventoryModule._categoryBg('unknown')).toBe('#e2e8f0');
    });
  });

  describe('renderSummary', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="inventory"><div class="stats-grid"></div></div>';
    });

    it('should render empty stats when no items', () => {
      inventoryModule.renderSummary();
      const grid = document.querySelector('#inventory .stats-grid');
      expect(grid.innerHTML).toContain('stat-card');
      expect(grid.innerHTML).toContain('物品种类');
      expect(grid.innerHTML).toContain('0');
    });

    it('should render correct stats with items', () => {
      inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5, estimatedPrice: 3.5 });
      inventoryService.addItem({ name: '洗洁精', category: 'cleaning', unit: '瓶', stock: 2, threshold: 2, estimatedPrice: 15 });

      inventoryModule.renderSummary();

      const grid = document.querySelector('#inventory .stats-grid');
      expect(grid.innerHTML).toContain('物品种类');
      expect(grid.innerHTML).toContain('2');
      expect(grid.innerHTML).toContain('总库存量');
      expect(grid.innerHTML).toContain('12');
      expect(grid.innerHTML).toContain('库存不足');
      expect(grid.innerHTML).toContain('1');
      expect(grid.innerHTML).toContain('预估价值');
      expect(grid.innerHTML).toContain('¥65');
    });

    it('should return early if grid element not found', () => {
      document.body.innerHTML = '';
      expect(() => inventoryModule.renderSummary()).not.toThrow();
    });
  });

  describe('renderLowStockAlert', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="lowStockAlert"></div>';
    });

    it('should show empty when no low stock items', () => {
      inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });

      inventoryModule.renderLowStockAlert();

      const container = document.getElementById('lowStockAlert');
      expect(container.innerHTML).toBe('');
    });

    it('should show low stock banner when items are low', () => {
      inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 3, threshold: 5 });
      inventoryService.addItem({ name: '洗洁精', category: 'cleaning', unit: '瓶', stock: 1, threshold: 2 });

      inventoryModule.renderLowStockAlert();

      const container = document.getElementById('lowStockAlert');
      expect(container.innerHTML).toContain('low-stock-banner');
      expect(container.innerHTML).toContain('库存提醒');
      expect(container.innerHTML).toContain('卷纸');
      expect(container.innerHTML).toContain('洗洁精');
    });

    it('should return early if container not found', () => {
      document.body.innerHTML = '';
      expect(() => inventoryModule.renderLowStockAlert()).not.toThrow();
    });
  });

  describe('renderItems', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="inventoryItems"></div>
        <select id="invFilterCategory">
          <option value="all">全部分类</option>
        </select>
        <select id="invFilterStock">
          <option value="all">全部状态</option>
        </select>
        <input type="text" id="invSearch" value="">
      `;
    });

    it('should render empty state when no items', () => {
      inventoryModule.renderItems();
      const container = document.getElementById('inventoryItems');
      expect(container.innerHTML).toContain('empty-state');
      expect(container.innerHTML).toContain('暂无物品');
    });

    it('should render item cards when items exist', () => {
      inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5, estimatedPrice: 3.5, note: '卫生间使用' });

      inventoryModule.renderItems();

      const container = document.getElementById('inventoryItems');
      expect(container.innerHTML).toContain('inv-item-card');
      expect(container.innerHTML).toContain('卷纸');
      expect(container.innerHTML).toContain('卫生间使用');
    });

    it('should filter by category', () => {
      inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });
      inventoryService.addItem({ name: '洗洁精', category: 'cleaning', unit: '瓶', stock: 5, threshold: 2 });

      const catSelect = document.getElementById('invFilterCategory');
      catSelect.innerHTML = '<option value="all">全部分类</option><option value="paper">纸品卫生</option><option value="cleaning">清洁用品</option>';
      catSelect.value = 'paper';

      inventoryModule.renderItems();

      const container = document.getElementById('inventoryItems');
      expect(container.innerHTML).toContain('卷纸');
      expect(container.innerHTML).not.toContain('洗洁精');
    });

    it('should filter by low stock', () => {
      inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });
      inventoryService.addItem({ name: '洗洁精', category: 'cleaning', unit: '瓶', stock: 1, threshold: 2 });

      const stockSelect = document.getElementById('invFilterStock');
      stockSelect.innerHTML = '<option value="all">全部状态</option><option value="low">库存不足</option><option value="normal">库存正常</option><option value="empty">缺货</option>';
      stockSelect.value = 'low';

      inventoryModule.renderItems();

      const container = document.getElementById('inventoryItems');
      expect(container.innerHTML).toContain('洗洁精');
      expect(container.innerHTML).not.toContain('卷纸');
    });

    it('should filter by normal stock', () => {
      inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });
      inventoryService.addItem({ name: '洗洁精', category: 'cleaning', unit: '瓶', stock: 1, threshold: 2 });

      const stockSelect = document.getElementById('invFilterStock');
      stockSelect.innerHTML = '<option value="all">全部状态</option><option value="low">库存不足</option><option value="normal">库存正常</option><option value="empty">缺货</option>';
      stockSelect.value = 'normal';

      inventoryModule.renderItems();

      const container = document.getElementById('inventoryItems');
      expect(container.innerHTML).toContain('卷纸');
      expect(container.innerHTML).not.toContain('洗洁精');
    });

    it('should filter by empty stock', () => {
      inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 0, threshold: 5 });
      inventoryService.addItem({ name: '洗洁精', category: 'cleaning', unit: '瓶', stock: 3, threshold: 2 });

      const stockSelect = document.getElementById('invFilterStock');
      stockSelect.innerHTML = '<option value="all">全部状态</option><option value="low">库存不足</option><option value="normal">库存正常</option><option value="empty">缺货</option>';
      stockSelect.value = 'empty';

      inventoryModule.renderItems();

      const container = document.getElementById('inventoryItems');
      expect(container.innerHTML).toContain('卷纸');
      expect(container.innerHTML).not.toContain('洗洁精');
    });

    it('should filter by search term', () => {
      inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5, note: '卫生间' });
      inventoryService.addItem({ name: '抽纸', category: 'paper', unit: '包', stock: 5, threshold: 4 });
      inventoryService.addItem({ name: '洗洁精', category: 'cleaning', unit: '瓶', stock: 3, threshold: 2 });

      document.getElementById('invSearch').value = '纸';

      inventoryModule.renderItems();

      const container = document.getElementById('inventoryItems');
      expect(container.innerHTML).toContain('卷纸');
      expect(container.innerHTML).toContain('抽纸');
      expect(container.innerHTML).not.toContain('洗洁精');
    });

    it('should return early if container not found', () => {
      document.body.innerHTML = '';
      expect(() => inventoryModule.renderItems()).not.toThrow();
    });
  });

  describe('renderLogs', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="inventoryLogs"></div>
        <select id="invLogItemFilter">
          <option value="all">全部物品</option>
        </select>
        <select id="invLogTypeFilter">
          <option value="all">全部类型</option>
        </select>
      `;
    });

    it('should render empty state when no logs', () => {
      inventoryModule.renderLogs();
      const container = document.getElementById('inventoryLogs');
      expect(container.innerHTML).toContain('empty-state');
      expect(container.innerHTML).toContain('暂无变动记录');
    });

    it('should render log items when logs exist', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });

      inventoryModule.renderLogs();

      const container = document.getElementById('inventoryLogs');
      expect(container.innerHTML).toContain('inv-log-item');
      expect(container.innerHTML).toContain('卷纸');
    });

    it('should filter by item', () => {
      const item1 = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });
      const item2 = inventoryService.addItem({ name: '洗洁精', category: 'cleaning', unit: '瓶', stock: 5, threshold: 2 });

      const itemSelect = document.getElementById('invLogItemFilter');
      itemSelect.innerHTML = `<option value="all">全部物品</option><option value="${item1.id}">卷纸</option><option value="${item2.id}">洗洁精</option>`;
      itemSelect.value = item1.id;

      inventoryModule.renderLogs();

      const container = document.getElementById('inventoryLogs');
      expect(container.innerHTML).toContain('卷纸');
    });

    it('should filter by type', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });
      inventoryService.consume(item.id, 2, '测试消耗');

      const typeSelect = document.getElementById('invLogTypeFilter');
      typeSelect.innerHTML = '<option value="all">全部类型</option><option value="consume">消耗</option><option value="restock">补货</option><option value="adjust">调整</option>';
      typeSelect.value = 'consume';

      inventoryModule.renderLogs();

      const container = document.getElementById('inventoryLogs');
      expect(container.innerHTML).toContain('消耗');
    });

    it('should return early if container not found', () => {
      document.body.innerHTML = '';
      expect(() => inventoryModule.renderLogs()).not.toThrow();
    });
  });

  describe('updateFilters', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <select id="invFilterCategory"></select>
        <select id="invLogItemFilter"></select>
      `;
    });

    it('should populate category filter with all categories', () => {
      inventoryModule.updateFilters();
      const catSelect = document.getElementById('invFilterCategory');
      expect(catSelect.innerHTML).toContain('全部分类');
      expect(catSelect.innerHTML).toContain(INVENTORY_CATEGORIES.paper.name);
      expect(catSelect.innerHTML).toContain(INVENTORY_CATEGORIES.cleaning.name);
      expect(catSelect.innerHTML).toContain(INVENTORY_CATEGORIES.grocery.name);
    });

    it('should populate item filter with all items', () => {
      const item1 = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });
      const item2 = inventoryService.addItem({ name: '洗洁精', category: 'cleaning', unit: '瓶', stock: 5, threshold: 2 });

      inventoryModule.updateFilters();

      const itemSelect = document.getElementById('invLogItemFilter');
      expect(itemSelect.innerHTML).toContain('全部物品');
      expect(itemSelect.innerHTML).toContain('卷纸');
      expect(itemSelect.innerHTML).toContain('洗洁精');
      expect(itemSelect.innerHTML).toContain(item1.id);
      expect(itemSelect.innerHTML).toContain(item2.id);
    });

    it('should preserve current category selection', () => {
      const catSelect = document.getElementById('invFilterCategory');
      catSelect.innerHTML = `
        <option value="all">全部分类</option>
        <option value="paper" selected>纸品卫生</option>
      `;
      catSelect.value = 'paper';

      inventoryModule.updateFilters();
      expect(catSelect.value).toBe('paper');
    });

    it('should preserve current item selection', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });
      const itemSelect = document.getElementById('invLogItemFilter');
      itemSelect.innerHTML = `
        <option value="all">全部物品</option>
        <option value="${item.id}" selected>卷纸</option>
      `;
      itemSelect.value = item.id;

      inventoryModule.updateFilters();
      expect(itemSelect.value).toBe(item.id);
    });

    it('should handle missing filter elements gracefully', () => {
      document.body.innerHTML = '';
      expect(() => inventoryModule.updateFilters()).not.toThrow();
    });
  });

  describe('render', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="inventory"><div class="stats-grid"></div></div>
        <div id="lowStockAlert"></div>
        <div id="inventoryItems"></div>
        <div id="inventoryLogs"></div>
        <select id="invFilterCategory"></select>
        <select id="invFilterStock"></select>
        <input type="text" id="invSearch" value="">
        <select id="invLogItemFilter"></select>
        <select id="invLogTypeFilter"></select>
      `;
    });

    it('should call all render methods', () => {
      const renderSummarySpy = vi.spyOn(inventoryModule, 'renderSummary');
      const renderLowStockSpy = vi.spyOn(inventoryModule, 'renderLowStockAlert');
      const renderItemsSpy = vi.spyOn(inventoryModule, 'renderItems');
      const renderLogsSpy = vi.spyOn(inventoryModule, 'renderLogs');
      const updateFiltersSpy = vi.spyOn(inventoryModule, 'updateFilters');

      inventoryModule.render();

      expect(renderSummarySpy).toHaveBeenCalled();
      expect(renderLowStockSpy).toHaveBeenCalled();
      expect(renderItemsSpy).toHaveBeenCalled();
      expect(renderLogsSpy).toHaveBeenCalled();
      expect(updateFiltersSpy).toHaveBeenCalled();
    });
  });

  describe('showAddModal', () => {
    it('should open modal with add item form', () => {
      inventoryModule.showAddModal();
      expect(modal.open).toHaveBeenCalled();
      expect(modal.open.mock.calls[0][0]).toBe('添加物品');
      expect(modal.open.mock.calls[0][1]).toContain('invItemName');
      expect(modal.open.mock.calls[0][1]).toContain('invItemCategory');
    });
  });

  describe('showEditModal', () => {
    it('should open modal with item data for editing', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5, estimatedPrice: 3.5 });

      inventoryModule.showEditModal(item.id);

      expect(modal.open).toHaveBeenCalled();
      expect(modal.open.mock.calls[0][0]).toBe('编辑物品');
      expect(modal.open.mock.calls[0][1]).toContain('卷纸');
    });

    it('should return early if item not found', () => {
      inventoryModule.showEditModal('nonexistent-id');
      expect(modal.open).not.toHaveBeenCalled();
    });
  });

  describe('showConsumeModal', () => {
    it('should show toast when stock is empty', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 0, threshold: 5 });

      inventoryModule.showConsumeModal(item.id);

      expect(toast.show).toHaveBeenCalledWith('库存为空，请先补货');
      expect(modal.open).not.toHaveBeenCalled();
    });

    it('should open modal with consume form when stock available', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });

      inventoryModule.showConsumeModal(item.id);

      expect(modal.open).toHaveBeenCalled();
      expect(modal.open.mock.calls[0][0]).toBe('快捷消耗');
      expect(modal.open.mock.calls[0][1]).toContain('invActionQty');
    });

    it('should return early if item not found', () => {
      inventoryModule.showConsumeModal('nonexistent-id');
      expect(modal.open).not.toHaveBeenCalled();
    });
  });

  describe('showRestockModal', () => {
    it('should open modal with restock form', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 3, threshold: 5 });

      inventoryModule.showRestockModal(item.id);

      expect(modal.open).toHaveBeenCalled();
      expect(modal.open.mock.calls[0][0]).toBe('快捷补货');
      expect(modal.open.mock.calls[0][1]).toContain('invActionQty');
    });

    it('should return early if item not found', () => {
      inventoryModule.showRestockModal('nonexistent-id');
      expect(modal.open).not.toHaveBeenCalled();
    });
  });

  describe('showPurchaseModal', () => {
    it('should show toast when no members exist', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 3, threshold: 5, estimatedPrice: 3.5 });

      inventoryModule.showPurchaseModal(item.id);

      expect(toast.show).toHaveBeenCalledWith('请先添加成员');
      expect(billsModule.showAddModalWithPrefill).not.toHaveBeenCalled();
    });

    it('should call billsModule.showAddModalWithPrefill when members exist', () => {
      memberService.add('小明');
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 3, threshold: 5, estimatedPrice: 3.5 });

      inventoryModule.showPurchaseModal(item.id);

      expect(billsModule.showAddModalWithPrefill).toHaveBeenCalled();
      const prefill = billsModule.showAddModalWithPrefill.mock.calls[0][0];
      expect(prefill.inventoryItemId).toBe(item.id);
      expect(prefill.inventoryQty).toBeGreaterThan(0);
    });

    it('should return early if item not found', () => {
      memberService.add('小明');
      inventoryModule.showPurchaseModal('nonexistent-id');
      expect(billsModule.showAddModalWithPrefill).not.toHaveBeenCalled();
    });
  });

  describe('showItemLogsModal', () => {
    it('should open modal with item logs', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });
      inventoryService.consume(item.id, 2, '测试消耗');

      inventoryModule.showItemLogsModal(item.id);

      expect(modal.open).toHaveBeenCalled();
      expect(modal.open.mock.calls[0][0]).toContain('卷纸');
      expect(modal.open.mock.calls[0][0]).toContain('变动记录');
    });

    it('should show logs including initial stock log', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });

      inventoryModule.showItemLogsModal(item.id);

      expect(modal.open).toHaveBeenCalled();
      expect(modal.open.mock.calls[0][1]).toContain('inv-log-item');
      expect(modal.open.mock.calls[0][1]).toContain('调整');
      expect(modal.open.mock.calls[0][1]).toContain('初始化库存');
    });

    it('should return early if item not found', () => {
      inventoryModule.showItemLogsModal('nonexistent-id');
      expect(modal.open).not.toHaveBeenCalled();
    });
  });

  describe('saveItem', () => {
    const createItemForm = (item = null) => {
      document.body.innerHTML = `
        <form>
          <input type="text" id="invItemName" value="${item ? item.name : '新物品'}">
          <select id="invItemCategory">
            <option value="paper" ${item && item.category === 'paper' ? 'selected' : ''}>纸品卫生</option>
            <option value="cleaning" ${item && item.category === 'cleaning' ? 'selected' : ''}>清洁用品</option>
            <option value="grocery" ${item && item.category === 'grocery' ? 'selected' : ''}>日常消耗</option>
          </select>
          <input type="text" id="invItemUnit" value="${item ? item.unit : '个'}">
          <input type="number" id="invItemStock" value="${item ? item.stock : 0}">
          <input type="number" id="invItemThreshold" value="${item ? item.threshold : 5}">
          <input type="number" id="invItemPrice" value="${item ? item.estimatedPrice : ''}">
          <textarea id="invItemNote">${item ? item.note : ''}</textarea>
        </form>
      `;
    };

    it('should add a new item', () => {
      createItemForm();
      const event = { preventDefault: vi.fn() };

      inventoryModule.saveItem(event, null);

      expect(event.preventDefault).toHaveBeenCalled();
      const items = inventoryService.getAllItems();
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('新物品');
      expect(toast.show).toHaveBeenCalledWith('物品已添加');
      expect(modal.close).toHaveBeenCalled();
    });

    it('should update an existing item', () => {
      const item = inventoryService.addItem({ name: '旧物品', category: 'paper', unit: '卷', stock: 5, threshold: 3, estimatedPrice: 0 });
      createItemForm(item);
      document.getElementById('invItemName').value = '新物品名';
      document.getElementById('invItemCategory').value = 'cleaning';

      const event = { preventDefault: vi.fn() };
      inventoryModule.saveItem(event, item.id);

      const updatedItem = inventoryService.getItemById(item.id);
      expect(updatedItem.name).toBe('新物品名');
      expect(updatedItem.category).toBe('cleaning');
      expect(toast.show).toHaveBeenCalledWith('物品已更新');
      expect(modal.close).toHaveBeenCalled();
    });

    it('should show error when name is empty', () => {
      createItemForm();
      document.getElementById('invItemName').value = '';

      const event = { preventDefault: vi.fn() };
      inventoryModule.saveItem(event, null);

      expect(toast.show).toHaveBeenCalledWith('请输入物品名称');
      expect(modal.close).not.toHaveBeenCalled();
    });
  });

  describe('deleteItem', () => {
    let confirmSpy;

    beforeEach(() => {
      confirmSpy = vi.spyOn(window, 'confirm');
    });

    afterEach(() => {
      confirmSpy.mockRestore();
    });

    it('should not delete when user cancels', () => {
      confirmSpy.mockReturnValue(false);
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });

      inventoryModule.deleteItem(item.id);

      expect(confirmSpy).toHaveBeenCalled();
      expect(inventoryService.getAllItems().length).toBe(1);
      expect(toast.show).not.toHaveBeenCalled();
    });

    it('should delete item when user confirms', () => {
      confirmSpy.mockReturnValue(true);
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });

      inventoryModule.deleteItem(item.id);

      expect(confirmSpy).toHaveBeenCalled();
      expect(inventoryService.getAllItems().length).toBe(0);
      expect(toast.show).toHaveBeenCalledWith('物品已删除');
    });

    it('should return early if item not found', () => {
      confirmSpy.mockReturnValue(true);
      inventoryModule.deleteItem('nonexistent-id');
      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe('handleAction', () => {
    const createActionForm = () => {
      document.body.innerHTML = `
        <form>
          <input type="number" id="invActionQty" value="1">
          <textarea id="invActionNote"></textarea>
          <input type="number" id="invActionAmount" value="0">
        </form>
      `;
    };

    it('should consume item', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });
      createActionForm();
      document.getElementById('invActionQty').value = '3';

      const event = { preventDefault: vi.fn() };
      inventoryModule.handleAction(event, item.id, 'consume');

      const updatedItem = inventoryService.getItemById(item.id);
      expect(updatedItem.stock).toBe(7);
      expect(toast.show).toHaveBeenCalledWith('已消耗 3');
      expect(modal.close).toHaveBeenCalled();
    });

    it('should restock item', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 3, threshold: 5 });
      createActionForm();
      document.getElementById('invActionQty').value = '5';

      const event = { preventDefault: vi.fn() };
      inventoryModule.handleAction(event, item.id, 'restock');

      const updatedItem = inventoryService.getItemById(item.id);
      expect(updatedItem.stock).toBe(8);
      expect(toast.show).toHaveBeenCalledWith('已补货 5');
      expect(modal.close).toHaveBeenCalled();
    });

    it('should show error for invalid quantity', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 10, threshold: 5 });
      createActionForm();
      document.getElementById('invActionQty').value = '0';

      const event = { preventDefault: vi.fn() };
      inventoryModule.handleAction(event, item.id, 'consume');

      expect(toast.show).toHaveBeenCalledWith('请输入有效数量');
      expect(modal.close).not.toHaveBeenCalled();
    });

    it('should handle purchase action with billsModule', () => {
      memberService.add('小明');
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 3, threshold: 5, estimatedPrice: 3.5 });
      createActionForm();
      document.getElementById('invActionQty').value = '5';
      document.getElementById('invActionAmount').value = '17.5';

      const event = { preventDefault: vi.fn() };
      inventoryModule.handleAction(event, item.id, 'purchase');

      expect(billsModule.showAddModalWithPrefill).toHaveBeenCalled();
      const prefill = billsModule.showAddModalWithPrefill.mock.calls[0][0];
      expect(prefill.inventoryItemId).toBe(item.id);
      expect(prefill.inventoryQty).toBe(5);
      expect(prefill.amount).toBe('17.50');
    });

    it('should show error for invalid purchase amount', () => {
      memberService.add('小明');
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 3, threshold: 5 });
      createActionForm();
      document.getElementById('invActionQty').value = '5';
      document.getElementById('invActionAmount').value = '0';

      const event = { preventDefault: vi.fn() };
      inventoryModule.handleAction(event, item.id, 'purchase');

      expect(toast.show).toHaveBeenCalledWith('请输入有效金额');
      expect(billsModule.showAddModalWithPrefill).not.toHaveBeenCalled();
    });

    it('should show toast when no members for purchase', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 3, threshold: 5 });
      createActionForm();
      document.getElementById('invActionQty').value = '5';
      document.getElementById('invActionAmount').value = '17.5';

      const event = { preventDefault: vi.fn() };
      inventoryModule.handleAction(event, item.id, 'purchase');

      expect(toast.show).toHaveBeenCalledWith('请先添加成员');
      expect(billsModule.showAddModalWithPrefill).not.toHaveBeenCalled();
    });
  });

  describe('onBillSaved', () => {
    it('should call inventoryService.purchase when inventoryItemId and inventoryQty provided', () => {
      const item = inventoryService.addItem({ name: '卷纸', category: 'paper', unit: '卷', stock: 3, threshold: 5 });
      const purchaseSpy = vi.spyOn(inventoryService, 'purchase');

      inventoryModule.onBillSaved('bill-123', item.id, 5);

      expect(purchaseSpy).toHaveBeenCalledWith(item.id, 5, 'bill-123');
      const updatedItem = inventoryService.getItemById(item.id);
      expect(updatedItem.stock).toBe(8);
    });

    it('should not call purchase when inventoryItemId is missing', () => {
      const purchaseSpy = vi.spyOn(inventoryService, 'purchase');
      inventoryModule.onBillSaved('bill-123', null, 5);
      expect(purchaseSpy).not.toHaveBeenCalled();
    });

    it('should not call purchase when inventoryQty is missing', () => {
      const purchaseSpy = vi.spyOn(inventoryService, 'purchase');
      inventoryModule.onBillSaved('bill-123', 'item-123', null);
      expect(purchaseSpy).not.toHaveBeenCalled();
    });
  });
});
