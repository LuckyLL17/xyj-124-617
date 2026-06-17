import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskTypesModule } from '../../js/modules/TaskTypesModule.js';
import { createTestStore, createTestTaskType } from '../helpers/testUtils.js';
import { TaskTypeService } from '../../js/services/TaskTypeService.js';

describe('TaskTypesModule', () => {
  let store;
  let taskTypeService;
  let modalMock;
  let toastMock;
  let taskTypesModule;

  beforeEach(() => {
    store = createTestStore();
    taskTypeService = new TaskTypeService(store);
    modalMock = { open: vi.fn(), close: vi.fn() };
    toastMock = { show: vi.fn() };

    taskTypesModule = new TaskTypesModule(
      store,
      taskTypeService,
      modalMock,
      toastMock
    );
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(taskTypesModule.store).toBe(store);
      expect(taskTypesModule.taskTypeService).toBe(taskTypeService);
      expect(taskTypesModule.modal).toBe(modalMock);
      expect(taskTypesModule.toast).toBe(toastMock);
      expect(taskTypesModule._draggedId).toBeNull();
    });
  });

  describe('render', () => {
    it('should call renderConfigPanel', () => {
      const renderConfigPanelSpy = vi.spyOn(taskTypesModule, 'renderConfigPanel');
      taskTypesModule.render();
      expect(renderConfigPanelSpy).toHaveBeenCalled();
    });
  });

  describe('renderConfigPanel', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="taskTypesConfig"></div>';
    });

    it('should return early if container not found', () => {
      document.body.innerHTML = '';
      const getAllSpy = vi.spyOn(taskTypeService, 'getAll');
      taskTypesModule.renderConfigPanel();
      expect(getAllSpy).not.toHaveBeenCalled();
    });

    it('should render empty state when no task types', () => {
      vi.spyOn(taskTypeService, 'getAll').mockReturnValue([]);
      taskTypesModule.renderConfigPanel();
      const container = document.getElementById('taskTypesConfig');
      expect(container.innerHTML).toContain('empty-state');
      expect(container.innerHTML).toContain('暂无任务类型');
    });

    it('should render task type cards when there are task types', () => {
      const type1 = taskTypeService.add('倒垃圾', '🗑️', '#ff0000', 3);
      const type2 = taskTypeService.add('拖地', '🧹', '#00ff00', 7);

      taskTypesModule.renderConfigPanel();

      const container = document.getElementById('taskTypesConfig');
      expect(container.innerHTML).toContain('task-types-list');
      expect(container.innerHTML).toContain('task-type-card');
      expect(container.innerHTML).toContain('倒垃圾');
      expect(container.innerHTML).toContain('拖地');
      expect(container.innerHTML).toContain('拖拽排序');
    });
  });

  describe('_renderTypeCard', () => {
    it('should render a task type card with correct data', () => {
      const type = createTestTaskType({ name: '测试任务', emoji: '🧪', color: '#ff0000', defaultInterval: 5, enabled: true });
      const html = taskTypesModule._renderTypeCard(type, 0, 3);

      expect(html).toContain('task-type-card');
      expect(html).toContain(type.id);
      expect(html).toContain('测试任务');
      expect(html).toContain('🧪');
      expect(html).toContain('默认周期：5 天');
      expect(html).toContain('已启用');
      expect(html).toContain('#ff0000');
    });

    it('should render disabled style when task type is disabled', () => {
      const type = createTestTaskType({ enabled: false });
      const html = taskTypesModule._renderTypeCard(type, 1, 3);

      expect(html).toContain('已停用');
      expect(html).toContain('opacity: 0.5');
      expect(html).toContain('badge-disabled');
    });

    it('should disable up button for first item', () => {
      const type = createTestTaskType();
      const html = taskTypesModule._renderTypeCard(type, 0, 3);
      expect(html).toContain('disabled');
      expect(html).toContain('opacity:0.3');
    });

    it('should disable down button for last item', () => {
      const type = createTestTaskType();
      const html = taskTypesModule._renderTypeCard(type, 2, 3);
      const downButtonIndex = html.indexOf('下移');
      const disabledAfterDown = html.substring(downButtonIndex, downButtonIndex + 200);
      expect(disabledAfterDown).toContain('disabled');
    });

    it('should not disable move buttons for middle items', () => {
      const type = createTestTaskType();
      const html = taskTypesModule._renderTypeCard(type, 1, 3);
      expect(html.match(/disabled/g) || []).toHaveLength(0);
    });

    it('should have all action buttons', () => {
      const type = createTestTaskType();
      const html = taskTypesModule._renderTypeCard(type, 1, 3);

      expect(html).toContain('上移');
      expect(html).toContain('下移');
      expect(html).toContain('编辑');
      expect(html).toContain('删除');
      expect(html).toContain('停用');
    });
  });

  describe('_lightenColor', () => {
    it('should convert red hex color to rgba with alpha 0.15', () => {
      const result = taskTypesModule._lightenColor('#ff0000');
      expect(result).toBe('rgba(255, 0, 0, 0.15)');
    });

    it('should convert green hex color to rgba with alpha 0.15', () => {
      const result = taskTypesModule._lightenColor('#00ff00');
      expect(result).toBe('rgba(0, 255, 0, 0.15)');
    });

    it('should convert blue hex color to rgba with alpha 0.15', () => {
      const result = taskTypesModule._lightenColor('#0000ff');
      expect(result).toBe('rgba(0, 0, 255, 0.15)');
    });

    it('should handle white color', () => {
      const result = taskTypesModule._lightenColor('#ffffff');
      expect(result).toBe('rgba(255, 255, 255, 0.15)');
    });

    it('should handle black color', () => {
      const result = taskTypesModule._lightenColor('#000000');
      expect(result).toBe('rgba(0, 0, 0, 0.15)');
    });
  });

  describe('showAddModal', () => {
    it('should open modal with add task type form', () => {
      taskTypesModule.showAddModal();
      expect(modalMock.open).toHaveBeenCalled();
      expect(modalMock.open.mock.calls[0][0]).toBe('添加任务类型');
      expect(typeof modalMock.open.mock.calls[0][1]).toBe('string');
      expect(modalMock.open.mock.calls[0][1]).toContain('taskTypeName');
      expect(modalMock.open.mock.calls[0][1]).toContain('添加');
    });
  });

  describe('showEditModal', () => {
    it('should open modal with task type data for editing', () => {
      const type = taskTypeService.add('测试任务', '🧪', '#ff0000', 5);
      taskTypesModule.showEditModal(type.id);
      expect(modalMock.open).toHaveBeenCalled();
      expect(modalMock.open.mock.calls[0][0]).toBe('编辑任务类型');
      expect(modalMock.open.mock.calls[0][1]).toContain('测试任务');
      expect(modalMock.open.mock.calls[0][1]).toContain('保存');
    });

    it('should return early if task type not found', () => {
      taskTypesModule.showEditModal('nonexistent-id');
      expect(modalMock.open).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <form>
          <input id="taskTypeName" value="">
          <input id="taskTypeEmoji" value="">
          <div>
            <input type="radio" name="taskTypeColor" value="#6366f1" checked>
          </div>
          <input id="taskTypeInterval" value="3">
        </form>
      `;
    });

    it('should prevent default event behavior', () => {
      const event = { preventDefault: vi.fn() };
      document.getElementById('taskTypeName').value = '测试任务';
      taskTypesModule.save(event, '');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should show toast and return if name is empty', () => {
      const event = { preventDefault: vi.fn() };
      document.getElementById('taskTypeName').value = '';
      taskTypesModule.save(event, '');
      expect(toastMock.show).toHaveBeenCalledWith('请输入任务名称');
      expect(modalMock.close).not.toHaveBeenCalled();
    });

    it('should add a new task type when no typeId provided', () => {
      const event = { preventDefault: vi.fn() };
      document.getElementById('taskTypeName').value = '新任务类型';
      document.getElementById('taskTypeEmoji').value = '✨';
      document.getElementById('taskTypeInterval').value = '7';

      const initialCount = taskTypeService.getAll().length;
      taskTypesModule.save(event, '');

      expect(taskTypeService.getAll().length).toBe(initialCount + 1);
      expect(toastMock.show).toHaveBeenCalledWith('任务类型已添加');
      expect(modalMock.close).toHaveBeenCalled();
    });

    it('should update existing task type when typeId provided', () => {
      const type = taskTypeService.add('旧名称', '🧪', '#ff0000', 3);
      const event = { preventDefault: vi.fn() };

      document.getElementById('taskTypeName').value = '新名称';
      document.getElementById('taskTypeEmoji').value = '🌟';
      document.getElementById('taskTypeInterval').value = '5';

      taskTypesModule.save(event, type.id);

      const updated = taskTypeService.getById(type.id);
      expect(updated.name).toBe('新名称');
      expect(updated.emoji).toBe('🌟');
      expect(updated.defaultInterval).toBe(5);
      expect(toastMock.show).toHaveBeenCalledWith('任务类型已更新');
      expect(modalMock.close).toHaveBeenCalled();
    });

    it('should use default color if no color selected', () => {
      const event = { preventDefault: vi.fn() };
      document.getElementById('taskTypeName').value = '测试任务';
      document.querySelector('input[name="taskTypeColor"]:checked').checked = false;

      taskTypesModule.save(event, '');

      const types = taskTypeService.getAll();
      const newType = types[types.length - 1];
      expect(newType.color).toBe('#6366f1');
    });

    it('should use default interval if invalid value provided', () => {
      const event = { preventDefault: vi.fn() };
      document.getElementById('taskTypeName').value = '测试任务';
      document.getElementById('taskTypeInterval').value = 'invalid';

      taskTypesModule.save(event, '');

      const types = taskTypeService.getAll();
      const newType = types[types.length - 1];
      expect(newType.defaultInterval).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete task type when confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const type = taskTypeService.add('测试任务', '🧪', '#ff0000', 3);
      const initialCount = taskTypeService.getAll().length;

      taskTypesModule.delete(type.id);

      expect(taskTypeService.getAll().length).toBe(initialCount - 1);
      expect(toastMock.show).toHaveBeenCalledWith('任务类型已删除');
    });

    it('should not delete task type when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const type = taskTypeService.add('测试任务', '🧪', '#ff0000', 3);
      const initialCount = taskTypeService.getAll().length;

      taskTypesModule.delete(type.id);

      expect(taskTypeService.getAll().length).toBe(initialCount);
      expect(toastMock.show).not.toHaveBeenCalled();
    });

    it('should show error toast on exception', () => {
      const type = taskTypeService.add('测试任务', '🧪', '#ff0000', 3);
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(taskTypeService, 'delete').mockImplementation(() => {
        throw new Error('删除失败');
      });

      taskTypesModule.delete(type.id);

      expect(toastMock.show).toHaveBeenCalledWith('删除失败');
    });
  });

  describe('toggleEnabled', () => {
    it('should enable a disabled task type', () => {
      const type = taskTypeService.add('测试任务', '🧪', '#ff0000', 3);
      taskTypeService.update(type.id, { enabled: false });

      taskTypesModule.toggleEnabled(type.id);

      const updated = taskTypeService.getById(type.id);
      expect(updated.enabled).toBe(true);
      expect(toastMock.show).toHaveBeenCalledWith('任务类型已启用');
    });

    it('should disable an enabled task type', () => {
      const type = taskTypeService.add('测试任务', '🧪', '#ff0000', 3);

      taskTypesModule.toggleEnabled(type.id);

      const updated = taskTypeService.getById(type.id);
      expect(updated.enabled).toBe(false);
      expect(toastMock.show).toHaveBeenCalledWith('任务类型已停用');
    });
  });

  describe('moveUp', () => {
    it('should move task type up in order', () => {
      const allBefore = taskTypeService.getAll();
      const secondType = allBefore[1];
      const firstType = allBefore[0];

      taskTypesModule.moveUp(secondType.id);

      const allAfter = taskTypeService.getAll();
      expect(allAfter[0].id).toBe(secondType.id);
      expect(allAfter[1].id).toBe(firstType.id);
    });

    it('should do nothing if task type is already first', () => {
      const allBefore = taskTypeService.getAll();
      const firstType = allBefore[0];

      const initialOrder = allBefore.map(t => t.id);
      taskTypesModule.moveUp(firstType.id);
      const afterOrder = taskTypeService.getAll().map(t => t.id);

      expect(afterOrder).toEqual(initialOrder);
    });
  });

  describe('moveDown', () => {
    it('should move task type down in order', () => {
      const allBefore = taskTypeService.getAll();
      const firstType = allBefore[0];
      const secondType = allBefore[1];

      taskTypesModule.moveDown(firstType.id);

      const allAfter = taskTypeService.getAll();
      expect(allAfter[0].id).toBe(secondType.id);
      expect(allAfter[1].id).toBe(firstType.id);
    });

    it('should do nothing if task type is already last', () => {
      const allBefore = taskTypeService.getAll();
      const lastType = allBefore[allBefore.length - 1];

      const initialOrder = allBefore.map(t => t.id);
      taskTypesModule.moveDown(lastType.id);
      const afterOrder = taskTypeService.getAll().map(t => t.id);

      expect(afterOrder).toEqual(initialOrder);
    });
  });
});
