import { describe, it, expect, beforeEach } from 'vitest';
import { Modal } from '../../js/components/Modal.js';

describe('Modal component', () => {
  let modal;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="modalOverlay" class="hidden">
        <div>
          <h2 id="modalTitle"></h2>
          <div id="modalBody"></div>
          <button id="modalClose">关闭</button>
        </div>
      </div>
    `;
    modal = new Modal();
  });

  describe('constructor', () => {
    it('should initialize with DOM elements', () => {
      expect(modal.overlay).toBeDefined();
      expect(modal.titleEl).toBeDefined();
      expect(modal.bodyEl).toBeDefined();
      expect(modal.closeBtn).toBeDefined();
    });
  });

  describe('open', () => {
    it('should set title and body content', () => {
      modal.open('测试标题', '<p>测试内容</p>');
      expect(modal.titleEl.textContent).toBe('测试标题');
      expect(modal.bodyEl.innerHTML).toBe('<p>测试内容</p>');
    });

    it('should show the modal (remove hidden class)', () => {
      modal.open('Title', 'Content');
      expect(modal.overlay.classList.contains('hidden')).toBe(false);
    });
  });

  describe('close', () => {
    it('should hide the modal (add hidden class)', () => {
      modal.open('Title', 'Content');
      modal.close();
      expect(modal.overlay.classList.contains('hidden')).toBe(true);
    });
  });

  describe('isOpen', () => {
    it('should return false when closed', () => {
      expect(modal.isOpen()).toBe(false);
    });

    it('should return true when open', () => {
      modal.open('Title', 'Content');
      expect(modal.isOpen()).toBe(true);
    });
  });

  describe('close button', () => {
    it('should close modal when close button clicked', () => {
      modal.open('Title', 'Content');
      modal.closeBtn.click();
      expect(modal.isOpen()).toBe(false);
    });
  });

  describe('overlay click', () => {
    it('should close when clicking overlay background', () => {
      modal.open('Title', 'Content');
      modal.overlay.click();
      expect(modal.isOpen()).toBe(false);
    });
  });
});
