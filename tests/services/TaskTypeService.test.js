import { describe, it, expect, beforeEach } from 'vitest';
import { TaskTypeService } from '../../js/services/TaskTypeService.js';
import { createTestStore, createTestTaskType } from '../helpers/testUtils.js';
import { DEFAULT_TASK_TYPES, TASK_COLORS } from '../../js/utils/constants.js';

describe('TaskTypeService', () => {
  let store;
  let taskTypeService;

  beforeEach(() => {
    store = createTestStore();
    taskTypeService = new TaskTypeService(store);
  });

  describe('_ensureInit', () => {
    it('should initialize with default types if not set', () => {
      expect(store.get('taskTypes')).toBeNull();
      const all = taskTypeService.getAll();
      expect(all.length).toBeGreaterThan(0);
      expect(store.get('taskTypes')).toBeDefined();
    });
  });

  describe('getAll', () => {
    it('should return all task types sorted by order', () => {
      const types = [
        createTestTaskType({ id: 't1', order: 2 }),
        createTestTaskType({ id: 't2', order: 0 }),
        createTestTaskType({ id: 't3', order: 1 }),
      ];
      store.set('taskTypes', types);
      const result = taskTypeService.getAll();
      expect(result[0].id).toBe('t2');
      expect(result[1].id).toBe('t3');
      expect(result[2].id).toBe('t1');
    });

    it('should return default types when none set', () => {
      const result = taskTypeService.getAll();
      const defaultKeys = Object.keys(DEFAULT_TASK_TYPES);
      expect(result.length).toBe(defaultKeys.length);
    });
  });

  describe('getEnabled', () => {
    it('should return only enabled task types', () => {
      const types = [
        createTestTaskType({ id: 't1', enabled: true }),
        createTestTaskType({ id: 't2', enabled: false }),
        createTestTaskType({ id: 't3', enabled: true }),
      ];
      store.set('taskTypes', types);
      const result = taskTypeService.getEnabled();
      expect(result.length).toBe(2);
      result.forEach(t => expect(t.enabled).toBe(true));
    });
  });

  describe('getById', () => {
    it('should return task type by id', () => {
      const type = createTestTaskType({ id: 'test-id' });
      store.set('taskTypes', [type]);
      expect(taskTypeService.getById('test-id')).toEqual(type);
    });

    it('should return undefined for non-existent id', () => {
      expect(taskTypeService.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('getAllAsObject', () => {
    it('should return task types as object keyed by id', () => {
      const types = [
        createTestTaskType({ id: 't1', name: 'Task1', emoji: '🧪', color: '#ff0000', defaultInterval: 3, enabled: true }),
      ];
      store.set('taskTypes', types);
      const result = taskTypeService.getAllAsObject();
      expect(result).toHaveProperty('t1');
      expect(result.t1.name).toBe('Task1');
      expect(result.t1).toHaveProperty('name');
      expect(result.t1).toHaveProperty('emoji');
      expect(result.t1).toHaveProperty('color');
      expect(result.t1).toHaveProperty('defaultInterval');
      expect(result.t1).toHaveProperty('enabled');
    });
  });

  describe('getEnabledAsObject', () => {
    it('should return only enabled task types as object', () => {
      const types = [
        createTestTaskType({ id: 't1', enabled: true, name: 'T1', emoji: '🧪', color: '#ff0000', defaultInterval: 3 }),
        createTestTaskType({ id: 't2', enabled: false, name: 'T2', emoji: '🧹', color: '#00ff00', defaultInterval: 7 }),
      ];
      store.set('taskTypes', types);
      const result = taskTypeService.getEnabledAsObject();
      expect(result).toHaveProperty('t1');
      expect(result).not.toHaveProperty('t2');
    });
  });

  describe('add', () => {
    it('should add a new task type', () => {
      const newType = taskTypeService.add('新任务', '✨', '#ff0000', 5);
      expect(newType).toHaveProperty('id');
      expect(newType.name).toBe('新任务');
      expect(newType.emoji).toBe('✨');
      expect(newType.color).toBe('#ff0000');
      expect(newType.defaultInterval).toBe(5);
      expect(newType.enabled).toBe(true);
    });

    it('should trim name', () => {
      const newType = taskTypeService.add('  任务  ');
      expect(newType.name).toBe('任务');
    });

    it('should default emoji to 📋 if not provided', () => {
      const newType = taskTypeService.add('任务', '');
      expect(newType.emoji).toBe('📋');
    });

    it('should use color from TASK_COLORS based on length', () => {
      const all = taskTypeService.getAll();
      const newType = taskTypeService.add('任务', '🧪');
      expect(newType.color).toBe(TASK_COLORS[all.length % TASK_COLORS.length]);
    });

    it('should default interval to 3', () => {
      const newType = taskTypeService.add('任务', '🧪', '', null);
      expect(newType.defaultInterval).toBe(3);
    });
  });

  describe('update', () => {
    it('should update task type data', () => {
      const type = createTestTaskType({ id: 't1', name: '旧名' });
      store.set('taskTypes', [type]);
      taskTypeService.update('t1', { name: '新名', color: '#00ff00' });
      const updated = taskTypeService.getById('t1');
      expect(updated.name).toBe('新名');
      expect(updated.color).toBe('#00ff00');
    });
  });

  describe('delete', () => {
    it('should delete task type', () => {
      const type = createTestTaskType({ id: 't1' });
      store.set('taskTypes', [type]);
      store.set('records', []);
      store.set('schedules', []);
      taskTypeService.delete('t1');
      expect(taskTypeService.getById('t1')).toBeUndefined();
    });

    it('should throw error if has related records', () => {
      const type = createTestTaskType({ id: 't1' });
      store.set('taskTypes', [type]);
      store.set('records', [{ id: 'r1', type: 't1' }]);
      store.set('schedules', []);
      expect(() => taskTypeService.delete('t1')).toThrow();
    });

    it('should throw error if has related schedules', () => {
      const type = createTestTaskType({ id: 't1' });
      store.set('taskTypes', [type]);
      store.set('records', []);
      store.set('schedules', [{ id: 's1', type: 't1' }]);
      expect(() => taskTypeService.delete('t1')).toThrow();
    });
  });

  describe('toggleEnabled', () => {
    it('should toggle enabled status', () => {
      const type = createTestTaskType({ id: 't1', enabled: true });
      store.set('taskTypes', [type]);
      taskTypeService.toggleEnabled('t1');
      expect(taskTypeService.getById('t1').enabled).toBe(false);
      taskTypeService.toggleEnabled('t1');
      expect(taskTypeService.getById('t1').enabled).toBe(true);
    });
  });

  describe('reorder', () => {
    it('should reorder task types', () => {
      const types = [
        createTestTaskType({ id: 't1', order: 0 }),
        createTestTaskType({ id: 't2', order: 1 }),
        createTestTaskType({ id: 't3', order: 2 }),
      ];
      store.set('taskTypes', types);
      taskTypeService.reorder(['t3', 't1', 't2']);
      const result = taskTypeService.getAll();
      expect(result[0].id).toBe('t3');
      expect(result[0].order).toBe(0);
      expect(result[1].id).toBe('t1');
      expect(result[1].order).toBe(1);
      expect(result[2].id).toBe('t2');
      expect(result[2].order).toBe(2);
    });
  });

  describe('moveUp', () => {
    it('should move task type up', () => {
      const types = [
        createTestTaskType({ id: 't1', order: 0 }),
        createTestTaskType({ id: 't2', order: 1 }),
      ];
      store.set('taskTypes', types);
      taskTypeService.moveUp('t2');
      const result = taskTypeService.getAll();
      expect(result[0].id).toBe('t2');
      expect(result[1].id).toBe('t1');
    });

    it('should not move first item', () => {
      const types = [
        createTestTaskType({ id: 't1', order: 0 }),
        createTestTaskType({ id: 't2', order: 1 }),
      ];
      store.set('taskTypes', types);
      taskTypeService.moveUp('t1');
      const result = taskTypeService.getAll();
      expect(result[0].id).toBe('t1');
    });
  });

  describe('moveDown', () => {
    it('should move task type down', () => {
      const types = [
        createTestTaskType({ id: 't1', order: 0 }),
        createTestTaskType({ id: 't2', order: 1 }),
      ];
      store.set('taskTypes', types);
      taskTypeService.moveDown('t1');
      const result = taskTypeService.getAll();
      expect(result[0].id).toBe('t2');
      expect(result[1].id).toBe('t1');
    });

    it('should not move last item', () => {
      const types = [
        createTestTaskType({ id: 't1', order: 0 }),
        createTestTaskType({ id: 't2', order: 1 }),
      ];
      store.set('taskTypes', types);
      taskTypeService.moveDown('t2');
      const result = taskTypeService.getAll();
      expect(result[1].id).toBe('t2');
    });
  });
});
