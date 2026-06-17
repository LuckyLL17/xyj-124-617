import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BillsModule } from '../../js/modules/BillsModule.js';
import { createTestStore, createTestMember } from '../helpers/testUtils.js';
import { MemberService } from '../../js/services/MemberService.js';
import { BillService } from '../../js/services/BillService.js';
import { BILL_CATEGORIES } from '../../js/utils/constants.js';

describe('BillsModule', () => {
  let store;
  let memberService;
  let billService;
  let modal;
  let toast;
  let billsModule;

  beforeEach(() => {
    store = createTestStore();
    memberService = new MemberService(store);
    billService = new BillService(store);

    modal = {
      open: vi.fn(),
      close: vi.fn(),
    };

    toast = {
      show: vi.fn(),
    };

    billsModule = new BillsModule(store, memberService, billService, modal, toast);
  });

  describe('constructor', () => {
    it('should initialize with all dependencies', () => {
      expect(billsModule.store).toBe(store);
      expect(billsModule.memberService).toBe(memberService);
      expect(billsModule.billService).toBe(billService);
      expect(billsModule.modal).toBe(modal);
      expect(billsModule.toast).toBe(toast);
      expect(billsModule._currentEvidenceBase64).toBeNull();
      expect(billsModule._onBillSavedCallback).toBeNull();
    });
  });

  describe('setOnBillSavedCallback', () => {
    it('should set the callback function', () => {
      const callback = vi.fn();
      billsModule.setOnBillSavedCallback(callback);
      expect(billsModule._onBillSavedCallback).toBe(callback);
    });

    it('should accept null callback', () => {
      billsModule.setOnBillSavedCallback(null);
      expect(billsModule._onBillSavedCallback).toBeNull();
    });
  });

  describe('render', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="billsList"></div>
        <div id="settlementList"></div>
        <div id="settlementSummary"></div>
        <div id="billMonthTotal"></div>
        <div id="billPerPerson"></div>
        <div id="billCategoryBreakdown"></div>
        <select id="billFilterCategory"></select>
        <select id="billFilterMember"></select>
      `;
    });

    it('should call all render methods', () => {
      const renderBillsSpy = vi.spyOn(billsModule, 'renderBills');
      const renderSettlementSpy = vi.spyOn(billsModule, 'renderSettlement');
      const renderSummarySpy = vi.spyOn(billsModule, 'renderSummary');
      const updateBillFiltersSpy = vi.spyOn(billsModule, 'updateBillFilters');

      billsModule.render();

      expect(renderBillsSpy).toHaveBeenCalled();
      expect(renderSettlementSpy).toHaveBeenCalled();
      expect(renderSummarySpy).toHaveBeenCalled();
      expect(updateBillFiltersSpy).toHaveBeenCalled();
    });

    it('should render all sections when data exists', () => {
      const member1 = memberService.add('小明');
      const member2 = memberService.add('小红');
      billService.add({
        category: 'rent',
        amount: 2000,
        payerId: member1.id,
        date: Date.now(),
        note: '房租',
        sharedBy: [member1.id, member2.id],
      });

      billsModule.render();

      expect(document.getElementById('billsList').innerHTML).toContain('bill-item');
      expect(document.getElementById('settlementList').innerHTML).toContain('settlement-item');
      expect(document.getElementById('billMonthTotal').textContent).toContain('2000.00');
    });
  });

  describe('renderBills', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="billsList"></div>
        <select id="billFilterCategory"><option value="all">全部类别</option></select>
        <select id="billFilterMember"><option value="all">全部成员</option></select>
      `;
    });

    it('should render empty state when no bills', () => {
      billsModule.renderBills();
      const container = document.getElementById('billsList');
      expect(container.innerHTML).toContain('empty-state');
      expect(container.innerHTML).toContain('本月暂无账单记录');
    });

    it('should render bill items when bills exist', () => {
      const member = memberService.add('小明');
      billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        note: '房租',
        sharedBy: [member.id],
      });

      billsModule.renderBills();
      const container = document.getElementById('billsList');
      expect(container.innerHTML).toContain('bill-item');
      expect(container.innerHTML).toContain('¥1000.00');
      expect(container.innerHTML).toContain('小明');
    });

    it('should filter by category', () => {
      const member = memberService.add('小明');
      billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });
      billService.add({
        category: 'water',
        amount: 200,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });

      const catSelect = document.getElementById('billFilterCategory');
      catSelect.innerHTML = '<option value="all">全部类别</option><option value="rent">房租</option><option value="water">水费</option>';
      catSelect.value = 'rent';

      billsModule.renderBills();
      const container = document.getElementById('billsList');
      expect(container.innerHTML).toContain('¥1000.00');
      expect(container.innerHTML).not.toContain('¥200.00');
    });

    it('should show settled badge for settled bills', () => {
      const member = memberService.add('小明');
      const bill = billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });
      billService.markSettled(bill.id);

      billsModule.renderBills();
      const container = document.getElementById('billsList');
      expect(container.innerHTML).toContain('bill-settled-badge');
      expect(container.innerHTML).toContain('已结清');
    });
  });

  describe('renderSettlement', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="settlementList"></div>
        <div id="settlementSummary"></div>
      `;
    });

    it('should render empty state when no settlements', () => {
      billsModule.renderSettlement();
      const container = document.getElementById('settlementList');
      expect(container.innerHTML).toContain('empty-state');
      expect(container.innerHTML).toContain('无需分摊结算');
    });

    it('should render settlement items when there are unsettled bills', () => {
      const member1 = memberService.add('小明');
      const member2 = memberService.add('小红');
      billService.add({
        category: 'rent',
        amount: 2000,
        payerId: member1.id,
        date: Date.now(),
        sharedBy: [member1.id, member2.id],
      });

      billsModule.renderSettlement();
      const container = document.getElementById('settlementList');
      expect(container.innerHTML).toContain('settlement-item');
      expect(container.innerHTML).toContain('小红');
      expect(container.innerHTML).toContain('小明');
    });

    it('should show unsettled summary with amount and count', () => {
      const member1 = memberService.add('小明');
      const member2 = memberService.add('小红');
      billService.add({
        category: 'rent',
        amount: 2000,
        payerId: member1.id,
        date: Date.now(),
        sharedBy: [member1.id, member2.id],
      });

      billsModule.renderSettlement();
      const summaryEl = document.getElementById('settlementSummary');
      expect(summaryEl.innerHTML).toContain('待结算');
      expect(summaryEl.innerHTML).toContain('1000.00');
      expect(summaryEl.innerHTML).toContain('全部结清');
    });

    it('should show cleared message when all settlements are done', () => {
      const member1 = memberService.add('小明');
      const member2 = memberService.add('小红');
      billService.add({
        category: 'rent',
        amount: 2000,
        payerId: member1.id,
        date: Date.now(),
        sharedBy: [member1.id, member2.id],
      });

      billsModule.renderSettlement();
      const settlements = billService.getSettlements();
      settlements.forEach(s => billService.markSettlementDone(s.id));

      billsModule.renderSettlement();
      const summaryEl = document.getElementById('settlementSummary');
      expect(summaryEl.innerHTML).toContain('所有分摊已结清');
    });
  });

  describe('renderSummary', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="billMonthTotal"></div>
        <div id="billPerPerson"></div>
        <div id="billCategoryBreakdown"></div>
      `;
    });

    it('should show zero totals when no bills', () => {
      memberService.add('小明');

      billsModule.renderSummary();
      expect(document.getElementById('billMonthTotal').textContent).toBe('¥0.00');
      expect(document.getElementById('billPerPerson').textContent).toBe('¥0.00');
    });

    it('should calculate correct month total and per person', () => {
      const member1 = memberService.add('小明');
      const member2 = memberService.add('小红');
      billService.add({
        category: 'rent',
        amount: 2000,
        payerId: member1.id,
        date: Date.now(),
        sharedBy: [member1.id, member2.id],
      });
      billService.add({
        category: 'water',
        amount: 500,
        payerId: member2.id,
        date: Date.now(),
        sharedBy: [member1.id, member2.id],
      });

      billsModule.renderSummary();
      expect(document.getElementById('billMonthTotal').textContent).toBe('¥2500.00');
      expect(document.getElementById('billPerPerson').textContent).toBe('¥1250.00');
    });

    it('should render category breakdown with bars', () => {
      const member = memberService.add('小明');
      billService.add({
        category: 'rent',
        amount: 2000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });
      billService.add({
        category: 'grocery',
        amount: 500,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });

      billsModule.renderSummary();
      const breakdown = document.getElementById('billCategoryBreakdown');
      expect(breakdown.innerHTML).toContain('category-breakdown-item');
      expect(breakdown.innerHTML).toContain('category-bar');
      expect(breakdown.innerHTML).toContain(BILL_CATEGORIES.rent.name);
      expect(breakdown.innerHTML).toContain(BILL_CATEGORIES.grocery.name);
    });

    it('should show empty state in breakdown when no categories', () => {
      memberService.add('小明');

      billsModule.renderSummary();
      const breakdown = document.getElementById('billCategoryBreakdown');
      expect(breakdown.innerHTML).toContain('empty-state');
      expect(breakdown.innerHTML).toContain('暂无数据');
    });

    it('should handle no members gracefully', () => {
      billsModule.renderSummary();
      expect(document.getElementById('billPerPerson').textContent).toBe('¥0.00');
    });
  });

  describe('updateBillFilters', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <select id="billFilterCategory"></select>
        <select id="billFilterMember"></select>
      `;
    });

    it('should populate category filter with all categories', () => {
      billsModule.updateBillFilters();
      const catSelect = document.getElementById('billFilterCategory');
      expect(catSelect.innerHTML).toContain('全部类别');
      expect(catSelect.innerHTML).toContain(BILL_CATEGORIES.rent.name);
      expect(catSelect.innerHTML).toContain(BILL_CATEGORIES.water.name);
    });

    it('should populate member filter with all members', () => {
      const member1 = memberService.add('小明');
      const member2 = memberService.add('小红');

      billsModule.updateBillFilters();
      const memSelect = document.getElementById('billFilterMember');
      expect(memSelect.innerHTML).toContain('全部成员');
      expect(memSelect.innerHTML).toContain('小明');
      expect(memSelect.innerHTML).toContain('小红');
      expect(memSelect.innerHTML).toContain(member1.id);
      expect(memSelect.innerHTML).toContain(member2.id);
    });

    it('should preserve current category selection', () => {
      const catSelect = document.getElementById('billFilterCategory');
      catSelect.innerHTML = `
        <option value="all">全部类别</option>
        <option value="rent" selected>房租</option>
        <option value="water">水费</option>
      `;
      catSelect.value = 'rent';

      billsModule.updateBillFilters();
      expect(catSelect.value).toBe('rent');
    });

    it('should preserve current member selection', () => {
      const member = memberService.add('小明');
      const memSelect = document.getElementById('billFilterMember');
      memSelect.innerHTML = `
        <option value="all">全部成员</option>
        <option value="${member.id}" selected>小明</option>
      `;
      memSelect.value = member.id;

      billsModule.updateBillFilters();
      expect(memSelect.value).toBe(member.id);
    });

    it('should handle missing filter elements gracefully', () => {
      document.body.innerHTML = '';
      expect(() => billsModule.updateBillFilters()).not.toThrow();
    });
  });

  describe('showAddModal', () => {
    it('should show toast when no members exist', () => {
      billsModule.showAddModal();
      expect(toast.show).toHaveBeenCalledWith('请先添加成员');
      expect(modal.open).not.toHaveBeenCalled();
    });

    it('should open modal with bill form when members exist', () => {
      const member = memberService.add('小明');
      billsModule.showAddModal();
      expect(modal.open).toHaveBeenCalled();
      expect(modal.open.mock.calls[0][0]).toBe('添加账单');
      expect(modal.open.mock.calls[0][1]).toContain('billCategory');
      expect(modal.open.mock.calls[0][1]).toContain('billAmount');
    });

    it('should reset evidence base64 when opening add modal', () => {
      const member = memberService.add('小明');
      billsModule._currentEvidenceBase64 = 'old-data';
      billsModule.showAddModal();
      expect(billsModule._currentEvidenceBase64).toBeNull();
    });

    it('should accept prefill data', () => {
      const member = memberService.add('小明');
      const prefill = { category: 'water', amount: 100, note: '测试' };
      billsModule.showAddModal(prefill);
      expect(modal.open).toHaveBeenCalled();
      const formHtml = modal.open.mock.calls[0][1];
      expect(formHtml).toContain('water');
    });
  });

  describe('showAddModalWithPrefill', () => {
    it('should call showAddModal with prefill data', () => {
      const showAddModalSpy = vi.spyOn(billsModule, 'showAddModal');
      const prefill = { category: 'water', amount: 50 };
      billsModule.showAddModalWithPrefill(prefill);
      expect(showAddModalSpy).toHaveBeenCalledWith(prefill);
    });
  });

  describe('showEditModal', () => {
    it('should do nothing when bill not found', () => {
      billsModule.showEditModal('non-existent-id');
      expect(modal.open).not.toHaveBeenCalled();
    });

    it('should open modal with bill data for editing', () => {
      const member = memberService.add('小明');
      const bill = billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        note: '房租',
        sharedBy: [member.id],
      });

      billsModule.showEditModal(bill.id);
      expect(modal.open).toHaveBeenCalled();
      expect(modal.open.mock.calls[0][0]).toBe('编辑账单');
      const formHtml = modal.open.mock.calls[0][1];
      expect(formHtml).toContain(bill.id);
      expect(formHtml).toContain('1000');
    });

    it('should set current evidence from bill', () => {
      const member = memberService.add('小明');
      const bill = billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        evidence: 'base64data',
        sharedBy: [member.id],
      });

      billsModule.showEditModal(bill.id);
      expect(billsModule._currentEvidenceBase64).toBe('base64data');
    });
  });

  describe('saveBill', () => {
    const createBillForm = (bill = null) => {
      const member = memberService.add('小明');
      const member2 = memberService.add('小红');
      const dateStr = new Date().toISOString().split('T')[0];

      document.body.innerHTML = `
        <form id="billForm">
          <input type="hidden" id="billEditId" value="${bill ? bill.id : ''}">
          <input type="hidden" id="billInventoryPrefill" value="">
          <input type="hidden" id="billInventoryQty" value="">
          <select id="billCategory">
            <option value="rent">房租</option>
            <option value="water">水费</option>
          </select>
          <input type="number" id="billAmount" value="${bill ? bill.amount : '100'}">
          <select id="billPayer">
            <option value="${member.id}">小明</option>
          </select>
          <input type="date" id="billDate" value="${dateStr}">
          <div class="member-checkboxes">
            <label><input type="checkbox" name="billSharedBy" value="${member.id}" checked>小明</label>
            <label><input type="checkbox" name="billSharedBy" value="${member2.id}" checked>小红</label>
          </div>
          <textarea id="billNote">${bill ? bill.note : ''}</textarea>
        </form>
      `;

      return { member, member2 };
    };

    it('should add a new bill', () => {
      const { member } = createBillForm();
      const event = { preventDefault: vi.fn() };

      billsModule.saveBill(event);

      expect(event.preventDefault).toHaveBeenCalled();
      const bills = billService.getAll();
      expect(bills.length).toBe(1);
      expect(bills[0].amount).toBe(100);
      expect(bills[0].category).toBe('rent');
      expect(bills[0].payerId).toBe(member.id);
      expect(toast.show).toHaveBeenCalledWith('账单已添加');
      expect(modal.close).toHaveBeenCalled();
    });

    it('should update an existing bill', () => {
      const member = memberService.add('小明');
      const bill = billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });

      createBillForm(bill);
      document.getElementById('billAmount').value = '2000';
      document.getElementById('billCategory').value = 'water';

      const event = { preventDefault: vi.fn() };
      billsModule.saveBill(event);

      const updatedBill = billService.getById(bill.id);
      expect(updatedBill.amount).toBe(2000);
      expect(updatedBill.category).toBe('water');
      expect(toast.show).toHaveBeenCalledWith('账单已更新');
    });

    it('should show error when amount is invalid', () => {
      createBillForm();
      document.getElementById('billAmount').value = '0';

      const event = { preventDefault: vi.fn() };
      billsModule.saveBill(event);

      expect(toast.show).toHaveBeenCalledWith('请输入有效金额');
      expect(modal.close).not.toHaveBeenCalled();
    });

    it('should show error when no shared members selected', () => {
      createBillForm();
      document.querySelectorAll('input[name="billSharedBy"]').forEach(cb => cb.checked = false);

      const event = { preventDefault: vi.fn() };
      billsModule.saveBill(event);

      expect(toast.show).toHaveBeenCalledWith('请至少选择一个分摊成员');
      expect(modal.close).not.toHaveBeenCalled();
    });

    it('should call onBillSavedCallback when adding new bill with inventory prefill', () => {
      const callback = vi.fn();
      billsModule.setOnBillSavedCallback(callback);

      createBillForm();
      document.getElementById('billInventoryPrefill').value = 'inv-123';
      document.getElementById('billInventoryQty').value = '5';

      const event = { preventDefault: vi.fn() };
      billsModule.saveBill(event);

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][1]).toBe('inv-123');
      expect(callback.mock.calls[0][2]).toBe('5');
    });

    it('should not call callback when editing bill', () => {
      const member = memberService.add('小明');
      const bill = billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });

      const callback = vi.fn();
      billsModule.setOnBillSavedCallback(callback);

      createBillForm(bill);
      document.getElementById('billInventoryPrefill').value = 'inv-123';

      const event = { preventDefault: vi.fn() };
      billsModule.saveBill(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('deleteBill', () => {
    beforeEach(() => {
      vi.spyOn(window, 'confirm');
    });

    it('should not delete when user cancels', () => {
      window.confirm.mockReturnValue(false);
      const member = memberService.add('小明');
      const bill = billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });

      billsModule.deleteBill(bill.id);

      expect(window.confirm).toHaveBeenCalled();
      expect(billService.getAll().length).toBe(1);
      expect(toast.show).not.toHaveBeenCalled();
    });

    it('should delete bill when user confirms', () => {
      window.confirm.mockReturnValue(true);
      const member = memberService.add('小明');
      const bill = billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });

      billsModule.deleteBill(bill.id);

      expect(window.confirm).toHaveBeenCalled();
      expect(billService.getAll().length).toBe(0);
      expect(toast.show).toHaveBeenCalledWith('账单已删除');
    });

    it('should show confirm message', () => {
      window.confirm.mockReturnValue(false);
      billsModule.deleteBill('some-id');
      expect(window.confirm).toHaveBeenCalledWith('确定要删除这条账单吗？');
    });
  });

  describe('settleBill', () => {
    it('should mark bill as settled', () => {
      const member = memberService.add('小明');
      const bill = billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });

      billsModule.settleBill(bill.id);

      const settledBill = billService.getById(bill.id);
      expect(settledBill.settled).toBe(true);
      expect(toast.show).toHaveBeenCalledWith('账单已结清');
    });

    it('should handle non-existent bill id gracefully', () => {
      expect(() => billsModule.settleBill('non-existent')).not.toThrow();
    });
  });

  describe('settleOneSettlement', () => {
    it('should mark a single settlement as done', () => {
      const member1 = memberService.add('小明');
      const member2 = memberService.add('小红');
      billService.add({
        category: 'rent',
        amount: 2000,
        payerId: member1.id,
        date: Date.now(),
        sharedBy: [member1.id, member2.id],
      });
      billService.refreshSettlements([member1, member2]);
      const settlements = billService.getSettlements();
      const settlementId = settlements[0].id;

      billsModule.settleOneSettlement(settlementId);

      const updatedSettlements = billService.getSettlements();
      const updated = updatedSettlements.find(s => s.id === settlementId);
      expect(updated.settled).toBe(true);
      expect(toast.show).toHaveBeenCalledWith('已标记转账完成');
    });
  });

  describe('settleAllBills', () => {
    beforeEach(() => {
      vi.spyOn(window, 'confirm');
    });

    it('should not settle all when user cancels', () => {
      window.confirm.mockReturnValue(false);
      const member = memberService.add('小明');
      billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });
      billService.add({
        category: 'water',
        amount: 200,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });

      billsModule.settleAllBills();

      const unsettled = billService.getAll().filter(b => !b.settled);
      expect(unsettled.length).toBe(2);
      expect(toast.show).not.toHaveBeenCalled();
    });

    it('should settle all bills when user confirms', () => {
      window.confirm.mockReturnValue(true);
      const member = memberService.add('小明');
      billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });
      billService.add({
        category: 'water',
        amount: 200,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });

      billsModule.settleAllBills();

      const allSettled = billService.getAll().every(b => b.settled);
      expect(allSettled).toBe(true);
      expect(toast.show).toHaveBeenCalledWith('所有账单已结清');
    });

    it('should show confirm message', () => {
      window.confirm.mockReturnValue(false);
      billsModule.settleAllBills();
      expect(window.confirm).toHaveBeenCalledWith('确定将所有未结清账单标记为已结清吗？');
    });
  });

  describe('settleAllSettlements', () => {
    beforeEach(() => {
      vi.spyOn(window, 'confirm');
    });

    it('should not settle all settlements when user cancels', () => {
      window.confirm.mockReturnValue(false);
      const member1 = memberService.add('小明');
      const member2 = memberService.add('小红');
      billService.add({
        category: 'rent',
        amount: 2000,
        payerId: member1.id,
        date: Date.now(),
        sharedBy: [member1.id, member2.id],
      });
      billService.refreshSettlements([member1, member2]);

      billsModule.settleAllSettlements();

      const unsettled = billService.getSettlements().filter(s => !s.settled);
      expect(unsettled.length).toBeGreaterThan(0);
      expect(toast.show).not.toHaveBeenCalled();
    });

    it('should settle all settlements when user confirms', () => {
      window.confirm.mockReturnValue(true);
      const member1 = memberService.add('小明');
      const member2 = memberService.add('小红');
      billService.add({
        category: 'rent',
        amount: 2000,
        payerId: member1.id,
        date: Date.now(),
        sharedBy: [member1.id, member2.id],
      });
      billService.refreshSettlements([member1, member2]);

      billsModule.settleAllSettlements();

      const allSettled = billService.getSettlements().every(s => s.settled);
      expect(allSettled).toBe(true);
      expect(toast.show).toHaveBeenCalledWith('所有分摊已结清');
    });

    it('should show confirm message', () => {
      window.confirm.mockReturnValue(false);
      billsModule.settleAllSettlements();
      expect(window.confirm).toHaveBeenCalledWith('确定将所有分摊转账标记为已结清吗？');
    });
  });

  describe('viewBillEvidence', () => {
    it('should do nothing when bill not found', () => {
      billsModule.viewBillEvidence('non-existent');
      expect(modal.open).not.toHaveBeenCalled();
    });

    it('should do nothing when bill has no evidence', () => {
      const member = memberService.add('小明');
      const bill = billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        sharedBy: [member.id],
      });

      billsModule.viewBillEvidence(bill.id);
      expect(modal.open).not.toHaveBeenCalled();
    });

    it('should open modal with evidence image', () => {
      const member = memberService.add('小明');
      const bill = billService.add({
        category: 'rent',
        amount: 1000,
        payerId: member.id,
        date: Date.now(),
        evidence: 'data:image/png;base64,test',
        sharedBy: [member.id],
      });

      billsModule.viewBillEvidence(bill.id);
      expect(modal.open).toHaveBeenCalled();
      expect(modal.open.mock.calls[0][0]).toContain('账单依据');
      expect(modal.open.mock.calls[0][1]).toContain('evidence-full-img');
      expect(modal.open.mock.calls[0][1]).toContain('data:image/png;base64,test');
    });
  });
});
