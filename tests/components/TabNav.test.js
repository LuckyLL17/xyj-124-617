import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TabNav } from '../../js/components/TabNav.js';

describe('TabNav component', () => {
  let onSwitch;

  beforeEach(() => {
    onSwitch = vi.fn();
    document.body.innerHTML = `
      <div class="tab-nav" id="testTabs">
        <button class="tab-btn active" data-tab="dashboard">概览</button>
        <button class="tab-btn" data-tab="members">成员</button>
        <button class="tab-btn" data-tab="records">记录</button>
      </div>
      <div class="tab-content active" id="dashboard">Dashboard Content</div>
      <div class="tab-content" id="members">Members Content</div>
      <div class="tab-content" id="records">Records Content</div>
    `;
  });

  describe('constructor', () => {
    it('should initialize with container selector', () => {
      const tabNav = new TabNav('#testTabs', onSwitch);
      expect(tabNav.container).toBeDefined();
      expect(tabNav.container.id).toBe('testTabs');
    });

    it('should bind click events to tab buttons', () => {
      const tabNav = new TabNav('#testTabs', onSwitch);
      const buttons = tabNav.container.querySelectorAll('.tab-btn');
      buttons[1].click();
      expect(onSwitch).toHaveBeenCalledWith('members');
    });
  });

  describe('switchTo', () => {
    let tabNav;

    beforeEach(() => {
      tabNav = new TabNav('#testTabs', onSwitch);
    });

    it('should set active class on target tab button', () => {
      tabNav.switchTo('members');
      const buttons = tabNav.container.querySelectorAll('.tab-btn');
      expect(buttons[0].classList.contains('active')).toBe(false);
      expect(buttons[1].classList.contains('active')).toBe(true);
      expect(buttons[2].classList.contains('active')).toBe(false);
    });

    it('should set active class on target tab content', () => {
      tabNav.switchTo('members');
      const contents = document.querySelectorAll('.tab-content');
      expect(contents[0].classList.contains('active')).toBe(false);
      expect(contents[1].classList.contains('active')).toBe(true);
      expect(contents[2].classList.contains('active')).toBe(false);
    });

    it('should switch to dashboard tab', () => {
      tabNav.switchTo('dashboard');
      const buttons = tabNav.container.querySelectorAll('.tab-btn');
      expect(buttons[0].classList.contains('active')).toBe(true);
    });
  });
});
