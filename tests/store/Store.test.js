import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Store } from '../../js/store/Store.js';

describe('Store', () => {
  let store;

  beforeEach(() => {
    store = new Store({
      members: [],
      records: [],
      count: 0,
    });
  });

  describe('constructor', () => {
    it('should initialize with given state', () => {
      const state = store.getState();
      expect(state.members).toEqual([]);
      expect(state.records).toEqual([]);
      expect(state.count).toBe(0);
    });

    it('should copy initial state (not reference)', () => {
      const initial = { a: 1 };
      const s = new Store(initial);
      initial.a = 2;
      expect(s.get('a')).toBe(1);
    });
  });

  describe('getState', () => {
    it('should return the full state object', () => {
      const state = store.getState();
      expect(typeof state).toBe('object');
      expect(state).toHaveProperty('members');
      expect(state).toHaveProperty('records');
    });
  });

  describe('get', () => {
    it('should return value for given key', () => {
      expect(store.get('count')).toBe(0);
      expect(store.get('members')).toEqual([]);
    });

    it('should return undefined for non-existent key', () => {
      expect(store.get('nonexistent')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set value for given key', () => {
      store.set('count', 5);
      expect(store.get('count')).toBe(5);
    });

    it('should notify subscribers', () => {
      const callback = vi.fn();
      store.subscribe('count', callback);
      store.set('count', 10);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(10, 0);
    });

    it('should notify global listeners', () => {
      const callback = vi.fn();
      store.onAny(callback);
      store.set('count', 10);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('count', 10, 0);
    });
  });

  describe('update', () => {
    it('should update value using updater function', () => {
      store.update('count', old => old + 5);
      expect(store.get('count')).toBe(5);
    });

    it('should pass old value to updater', () => {
      const updater = vi.fn(old => old * 2);
      store.set('count', 3);
      store.update('count', updater);
      expect(updater).toHaveBeenCalledWith(3);
      expect(store.get('count')).toBe(6);
    });

    it('should notify subscribers', () => {
      const callback = vi.fn();
      store.subscribe('count', callback);
      store.update('count', old => old + 1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(1, 0);
    });
  });

  describe('subscribe', () => {
    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = store.subscribe('count', callback);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      store.set('count', 5);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should only notify subscribers of the specific key', () => {
      const countCallback = vi.fn();
      const membersCallback = vi.fn();
      store.subscribe('count', countCallback);
      store.subscribe('members', membersCallback);

      store.set('count', 5);
      expect(countCallback).toHaveBeenCalledTimes(1);
      expect(membersCallback).not.toHaveBeenCalled();
    });
  });

  describe('onAny', () => {
    it('should notify on any state change', () => {
      const callback = vi.fn();
      store.onAny(callback);

      store.set('count', 5);
      store.set('members', [{ id: 1 }]);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = store.onAny(callback);

      unsubscribe();
      store.set('count', 5);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('batch', () => {
    it('should batch multiple updates', () => {
      const callback = vi.fn();
      store.subscribe('count', callback);

      store.batch(() => {
        store.set('count', 1);
        store.set('count', 2);
        store.set('count', 3);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(3, 0);
    });

    it('should flush notifications after batch', () => {
      const countCallback = vi.fn();
      const membersCallback = vi.fn();
      store.subscribe('count', countCallback);
      store.subscribe('members', membersCallback);

      store.batch(() => {
        store.set('count', 1);
        store.set('members', [{ id: 1 }]);
      });

      expect(countCallback).toHaveBeenCalledTimes(1);
      expect(membersCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle nested batches', () => {
      const callback = vi.fn();
      store.subscribe('count', callback);

      store.batch(() => {
        store.set('count', 1);
        store.batch(() => {
          store.set('count', 2);
        });
        store.set('count', 3);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should still run function even if it throws', () => {
      const callback = vi.fn();
      store.subscribe('count', callback);

      expect(() => {
        store.batch(() => {
          store.set('count', 5);
          throw new Error('test error');
        });
      }).toThrow('test error');

      expect(store.get('count')).toBe(5);
    });
  });

  describe('persist', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should save state to localStorage', () => {
      store.set('members', [{ id: '1', name: 'Test' }]);
      store.persist();

      const saved = JSON.parse(localStorage.getItem('sharehouse_data'));
      expect(saved.members).toHaveLength(1);
      expect(saved.members[0].name).toBe('Test');
    });

    it('should persist only specified keys when provided', () => {
      store.set('count', 5);
      store.set('members', [{ id: '1' }]);
      store.persist('count');

      const saved = JSON.parse(localStorage.getItem('sharehouse_data'));
      expect(saved).toHaveProperty('count');
      expect(saved).not.toHaveProperty('members');
    });
  });

  describe('restore', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should restore state from localStorage', () => {
      const testData = { members: [{ id: '1', name: 'Restored' }], count: 42 };
      localStorage.setItem('sharehouse_data', JSON.stringify(testData));

      const result = store.restore();
      expect(result).toBe(true);
      expect(store.get('members')).toEqual(testData.members);
      expect(store.get('count')).toBe(42);
    });

    it('should return false if no saved data', () => {
      const result = store.restore();
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear localStorage', () => {
      localStorage.setItem('sharehouse_data', JSON.stringify({ test: true }));
      store.clear();
      expect(localStorage.getItem('sharehouse_data')).toBeNull();
    });
  });
});
