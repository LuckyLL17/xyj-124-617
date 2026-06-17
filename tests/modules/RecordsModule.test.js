import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecordsModule } from '../../js/modules/RecordsModule.js';
import { createTestStore } from '../helpers/testUtils.js';
import { MemberService } from '../../js/services/MemberService.js';
import { RecordService } from '../../js/services/RecordService.js';
import { TaskTypeService } from '../../js/services/TaskTypeService.js';

describe('RecordsModule', () => {
  let store;
  let memberService;
  let recordService;
  let taskTypeService;
  let modalMock;
  let toastMock;
  let recordsModule;

  beforeEach(() => {
    store = createTestStore();
    memberService = new MemberService(store);
    recordService = new RecordService(store);
    taskTypeService = new TaskTypeService(store);
    modalMock = { open: vi.fn(), close: vi.fn() };
    toastMock = { show: vi.fn() };

    recordsModule = new RecordsModule(
      store,
      memberService,
      recordService,
      taskTypeService,
      modalMock,
      toastMock
    );
  });

  describe('_rgba', () => {
    it('should convert hex to rgba with default alpha', () => {
      const result = recordsModule._rgba('#ff0000');
      expect(result).toBe('rgba(255, 0, 0, 0.15)');
    });

    it('should accept custom alpha', () => {
      const result = recordsModule._rgba('#00ff00', 0.5);
      expect(result).toBe('rgba(0, 255, 0, 0.5)');
    });
  });

  describe('_getTaskTypes', () => {
    it('should return task types as object', () => {
      const types = recordsModule._getTaskTypes();
      expect(typeof types).toBe('object');
      expect(Object.keys(types).length).toBeGreaterThan(0);
    });
  });

  describe('renderRecords', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="recordsList"></div>
        <select id="filterType"><option value="all">全部</option></select>
        <select id="filterMember"><option value="all">全部</option></select>
      `;
    });

    it('should render empty state when no records', () => {
      recordsModule.renderRecords();
      const container = document.getElementById('recordsList');
      expect(container.innerHTML).toContain('empty-state');
      expect(container.innerHTML).toContain('暂无记录');
    });

    it('should render record items when there are records', () => {
      const member = memberService.add('小明', '明', '#ff0000');
      const taskTypes = taskTypeService.getEnabled();
      if (taskTypes.length > 0) {
        recordService.add(member.id, taskTypes[0].id, Date.now(), '测试备注');
      }

      recordsModule.renderRecords();

      const container = document.getElementById('recordsList');
      expect(container.innerHTML).toContain('record-item');
    });
  });

  describe('showAddModal', () => {
    it('should show toast if no members', () => {
      recordsModule.showAddModal();
      expect(toastMock.show).toHaveBeenCalled();
      expect(modalMock.open).not.toHaveBeenCalled();
    });

    it('should open modal when there are members', () => {
      memberService.add('小明');
      recordsModule.showAddModal('trash');
      expect(modalMock.open).toHaveBeenCalled();
    });
  });

  describe('saveRecord', () => {
    beforeEach(() => {
      const member = memberService.add('小明');
      const taskTypes = taskTypeService.getEnabled();
      const firstTypeId = taskTypes.length > 0 ? taskTypes[0].id : 'trash';
      document.body.innerHTML = `
        <select id="recordType"><option value="${firstTypeId}" selected>测试</option></select>
        <select id="recordMember"><option value="${member.id}" selected>小明</option></select>
        <input type="date" id="recordDate" value="2024-01-15">
        <textarea id="recordNote">测试备注</textarea>
      `;
    });

    it('should add a new record', () => {
      const event = { preventDefault: vi.fn() };
      recordsModule.saveRecord(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(recordService.getAll().length).toBe(1);
      expect(toastMock.show).toHaveBeenCalled();
      expect(modalMock.close).toHaveBeenCalled();
    });
  });

  describe('deleteRecord', () => {
    it('should delete record when confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const member = memberService.add('小明');
      const taskTypes = taskTypeService.getEnabled();
      const record = recordService.add(member.id, taskTypes[0].id, Date.now());

      recordsModule.deleteRecord(record.id);
      expect(recordService.getAll().length).toBe(0);
      expect(toastMock.show).toHaveBeenCalled();
    });

    it('should not delete record when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const member = memberService.add('小明');
      const taskTypes = taskTypeService.getEnabled();
      const record = recordService.add(member.id, taskTypes[0].id, Date.now());

      recordsModule.deleteRecord(record.id);
      expect(recordService.getAll().length).toBe(1);
    });
  });

  describe('render', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="recordsList"></div>
        <select id="filterType"><option value="all">全部</option></select>
        <select id="filterMember"><option value="all">全部</option></select>
      `;
    });

    it('should call render methods', () => {
      const renderRecordsSpy = vi.spyOn(recordsModule, 'renderRecords');
      const updateTypeFilterSpy = vi.spyOn(recordsModule, 'updateTypeFilter');
      const updateMemberFilterSpy = vi.spyOn(recordsModule, 'updateMemberFilter');

      recordsModule.render();

      expect(renderRecordsSpy).toHaveBeenCalled();
      expect(updateTypeFilterSpy).toHaveBeenCalled();
      expect(updateMemberFilterSpy).toHaveBeenCalled();
    });
  });
});
