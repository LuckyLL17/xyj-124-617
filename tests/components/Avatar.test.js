import { describe, it, expect } from 'vitest';
import { Avatar } from '../../js/components/Avatar.js';

describe('Avatar component', () => {
  describe('render', () => {
    it('should return a string with avatar HTML', () => {
      const member = { name: '小明', avatar: '明', color: '#ff0000' };
      const result = Avatar.render(member);
      expect(typeof result).toBe('string');
      expect(result).toContain('<div');
      expect(result).toContain('明');
    });

    it('should render with correct color', () => {
      const member = { name: 'test', avatar: 'T', color: '#123456' };
      const result = Avatar.render(member);
      expect(result).toContain('#123456');
    });

    it('should render default size md', () => {
      const member = { name: 'test', avatar: 'T', color: '#000' };
      const result = Avatar.render(member);
      expect(result).toContain('avatar-md');
      expect(result).toContain('width:48px');
      expect(result).toContain('height:48px');
      expect(result).toContain('font-size:20px');
    });

    it('should render xs size', () => {
      const member = { name: 'test', avatar: 'T', color: '#000' };
      const result = Avatar.render(member, 'xs');
      expect(result).toContain('avatar-xs');
      expect(result).toContain('width:18px');
      expect(result).toContain('height:18px');
    });

    it('should render sm size', () => {
      const member = { name: 'test', avatar: 'T', color: '#000' };
      const result = Avatar.render(member, 'sm');
      expect(result).toContain('avatar-sm');
      expect(result).toContain('width:32px');
      expect(result).toContain('height:32px');
    });

    it('should render lg size', () => {
      const member = { name: 'test', avatar: 'T', color: '#000' };
      const result = Avatar.render(member, 'lg');
      expect(result).toContain('avatar-lg');
      expect(result).toContain('width:56px');
      expect(result).toContain('height:56px');
    });

    it('should use md size styles for invalid size', () => {
      const member = { name: 'test', avatar: 'T', color: '#000' };
      const result = Avatar.render(member, 'invalid');
      expect(result).toContain('width:48px');
      expect(result).toContain('height:48px');
      expect(result).toContain('font-size:20px');
    });

    it('should show ? when no member provided', () => {
      const result = Avatar.render(null);
      expect(result).toContain('?');
      expect(result).toContain('#94a3b8');
    });
  });
});
