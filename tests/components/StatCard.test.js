import { describe, it, expect } from 'vitest';
import { StatCard } from '../../js/components/StatCard.js';

describe('StatCard component', () => {
  describe('render', () => {
    it('should return HTML string with stat-card class', () => {
      const result = StatCard.render('icon-class', '📊', '标题', '100', '说明');
      expect(result).toContain('stat-card');
      expect(result).toContain('stat-icon');
      expect(result).toContain('stat-info');
      expect(result).toContain('stat-value');
      expect(result).toContain('stat-label');
    });

    it('should include the iconClass', () => {
      const result = StatCard.render('test-icon', '📊', 'Title', 'value', 'label');
      expect(result).toContain('test-icon');
    });

    it('should include the emoji', () => {
      const result = StatCard.render('', '🎉', 'Title', 'value', 'label');
      expect(result).toContain('🎉');
    });

    it('should include title, value, and label', () => {
      const result = StatCard.render('', '📊', '测试标题', '999', '测试说明');
      expect(result).toContain('测试标题');
      expect(result).toContain('999');
      expect(result).toContain('测试说明');
    });

    it('should include iconStyle when provided', () => {
      const result = StatCard.render('', '📊', 'Title', 'value', 'label', 'color: red;');
      expect(result).toContain('color: red;');
    });
  });

  describe('renderGrid', () => {
    it('should wrap cards in stats-grid div', () => {
      const cards = ['<div>Card1</div>', '<div>Card2</div>'];
      const result = StatCard.renderGrid(cards);
      expect(result).toContain('stats-grid');
      expect(result).toContain('Card1');
      expect(result).toContain('Card2');
    });

    it('should work with empty array', () => {
      const result = StatCard.renderGrid([]);
      expect(result).toContain('stats-grid');
    });
  });
});
