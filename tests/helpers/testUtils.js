import { Store } from '../../js/store/Store.js';
import { generateId } from '../../js/utils/helpers.js';

export function createTestStore(initialState = {}) {
  const defaultState = {
    members: [],
    records: [],
    schedules: [],
    taskTypes: null,
    bills: [],
    settlements: [],
    inventoryItems: [],
    inventoryLogs: [],
    votes: [],
    messages: [],
    scheduleRules: [],
  };
  return new Store({ ...defaultState, ...initialState });
}

export function createTestMember(overrides = {}) {
  return {
    id: generateId(),
    name: '测试成员',
    avatar: '测',
    color: '#6366f1',
    joinDate: Date.now(),
    ...overrides,
  };
}

export function createTestTaskType(overrides = {}) {
  return {
    id: generateId(),
    name: '测试任务',
    emoji: '🧪',
    color: '#f59e0b',
    defaultInterval: 3,
    enabled: true,
    order: 0,
    ...overrides,
  };
}
