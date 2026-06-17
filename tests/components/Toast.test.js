import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Toast } from '../../js/components/Toast.js';

describe('Toast component', () => {
  let toast;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="toast" class="hidden"></div>';
    toast = new Toast();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with toast element', () => {
      expect(toast.el).toBeDefined();
      expect(toast.el.id).toBe('toast');
    });

    it('should have _timer property', () => {
      expect(toast._timer).toBeNull();
    });
  });

  describe('show', () => {
    it('should set message text', () => {
      toast.show('测试消息');
      expect(toast.el.textContent).toBe('测试消息');
    });

    it('should remove hidden class', () => {
      toast.show('测试消息');
      expect(toast.el.classList.contains('hidden')).toBe(false);
    });

    it('should hide after duration', () => {
      toast.show('测试消息', 1000);
      expect(toast.el.classList.contains('hidden')).toBe(false);
      vi.advanceTimersByTime(1000);
      expect(toast.el.classList.contains('hidden')).toBe(true);
    });

    it('should use default duration of 2500ms', () => {
      toast.show('测试消息');
      vi.advanceTimersByTime(2499);
      expect(toast.el.classList.contains('hidden')).toBe(false);
      vi.advanceTimersByTime(1);
      expect(toast.el.classList.contains('hidden')).toBe(true);
    });

    it('should clear previous timer when called again', () => {
      toast.show('消息1', 1000);
      toast.show('消息2', 500);

      vi.advanceTimersByTime(500);
      expect(toast.el.classList.contains('hidden')).toBe(true);
    });
  });
});
