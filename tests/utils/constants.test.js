import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TASK_TYPES,
  TASK_TYPES,
  TASK_COLORS,
  AVATAR_COLORS,
  STORAGE_KEY,
  BILL_CATEGORIES,
  INVENTORY_CATEGORIES,
  INVENTORY_LOG_TYPES,
  TAB_CONFIG,
  VOTE_TYPES,
  VOTE_OPTION_COLORS,
} from '../../js/utils/constants.js';

describe('constants - DEFAULT_TASK_TYPES', () => {
  it('should have trash, paper, clean task types', () => {
    expect(DEFAULT_TASK_TYPES).toHaveProperty('trash');
    expect(DEFAULT_TASK_TYPES).toHaveProperty('paper');
    expect(DEFAULT_TASK_TYPES).toHaveProperty('clean');
  });

  it('should have name, emoji, defaultInterval for each task type', () => {
    Object.values(DEFAULT_TASK_TYPES).forEach(type => {
      expect(type).toHaveProperty('name');
      expect(type).toHaveProperty('emoji');
      expect(type).toHaveProperty('defaultInterval');
    });
  });
});

describe('constants - TASK_TYPES', () => {
  it('should equal DEFAULT_TASK_TYPES', () => {
    expect(TASK_TYPES).toEqual(DEFAULT_TASK_TYPES);
  });
});

describe('constants - TASK_COLORS', () => {
  it('should be an array of colors', () => {
    expect(Array.isArray(TASK_COLORS)).toBe(true);
    expect(TASK_COLORS.length).toBeGreaterThan(0);
    TASK_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

describe('constants - AVATAR_COLORS', () => {
  it('should be an array of colors', () => {
    expect(Array.isArray(AVATAR_COLORS)).toBe(true);
    expect(AVATAR_COLORS.length).toBeGreaterThan(0);
    AVATAR_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

describe('constants - STORAGE_KEY', () => {
  it('should be a string', () => {
    expect(typeof STORAGE_KEY).toBe('string');
    expect(STORAGE_KEY).toBe('sharehouse_data');
  });
});

describe('constants - BILL_CATEGORIES', () => {
  it('should have multiple bill categories', () => {
    const expected = ['rent', 'water', 'electricity', 'gas', 'internet', 'grocery', 'cleaning', 'repair', 'other'];
    expected.forEach(cat => {
      expect(BILL_CATEGORIES).toHaveProperty(cat);
    });
  });

  it('should have name and emoji for each category', () => {
    Object.values(BILL_CATEGORIES).forEach(cat => {
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('emoji');
    });
  });
});

describe('constants - INVENTORY_CATEGORIES', () => {
  it('should have multiple inventory categories', () => {
    const expected = ['paper', 'cleaning', 'grocery', 'kitchen', 'appliance', 'other'];
    expected.forEach(cat => {
      expect(INVENTORY_CATEGORIES).toHaveProperty(cat);
    });
  });

  it('should have name, emoji, billCategory for each category', () => {
    Object.values(INVENTORY_CATEGORIES).forEach(cat => {
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('emoji');
      expect(cat).toHaveProperty('billCategory');
    });
  });
});

describe('constants - INVENTORY_LOG_TYPES', () => {
  it('should have consume, restock, adjust, purchase types', () => {
    expect(INVENTORY_LOG_TYPES).toHaveProperty('consume');
    expect(INVENTORY_LOG_TYPES).toHaveProperty('restock');
    expect(INVENTORY_LOG_TYPES).toHaveProperty('adjust');
    expect(INVENTORY_LOG_TYPES).toHaveProperty('purchase');
  });

  it('should have name, emoji, color for each log type', () => {
    Object.values(INVENTORY_LOG_TYPES).forEach(type => {
      expect(type).toHaveProperty('name');
      expect(type).toHaveProperty('emoji');
      expect(type).toHaveProperty('color');
    });
  });
});

describe('constants - TAB_CONFIG', () => {
  it('should be an array', () => {
    expect(Array.isArray(TAB_CONFIG)).toBe(true);
  });

  it('should have id and label for each tab', () => {
    TAB_CONFIG.forEach(tab => {
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('label');
    });
  });

  it('should have expected tabs', () => {
    const tabIds = TAB_CONFIG.map(t => t.id);
    const expected = ['dashboard', 'members', 'tasktypes', 'records', 'schedule', 'inventory', 'bills', 'votes', 'messages', 'reminders'];
    expected.forEach(id => {
      expect(tabIds).toContain(id);
    });
  });
});

describe('constants - VOTE_TYPES', () => {
  it('should have multiple vote types', () => {
    const expected = ['purchase', 'schedule', 'rule', 'expense', 'other'];
    expected.forEach(type => {
      expect(VOTE_TYPES).toHaveProperty(type);
    });
  });

  it('should have name, emoji, color for each vote type', () => {
    Object.values(VOTE_TYPES).forEach(type => {
      expect(type).toHaveProperty('name');
      expect(type).toHaveProperty('emoji');
      expect(type).toHaveProperty('color');
    });
  });
});

describe('constants - VOTE_OPTION_COLORS', () => {
  it('should be an array of colors', () => {
    expect(Array.isArray(VOTE_OPTION_COLORS)).toBe(true);
    expect(VOTE_OPTION_COLORS.length).toBeGreaterThan(0);
    VOTE_OPTION_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});
