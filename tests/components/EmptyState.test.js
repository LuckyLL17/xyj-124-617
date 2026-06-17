import { describe, it, expect } from 'vitest';
import { EmptyState } from '../../js/components/EmptyState.js';

describe('EmptyState component', () => {
  describe('render', () => {
    it('should return a p element with empty-state class', () => {
      const result = EmptyState.render('暂无数据');
      expect(result).toContain('<p');
      expect(result).toContain('class="empty-state"');
      expect(result).toContain('暂无数据');
    });

    it('should include the message text', () => {
      const message = '测试空状态';
      const result = EmptyState.render(message);
      expect(result).toContain(message);
    });
  });
});
