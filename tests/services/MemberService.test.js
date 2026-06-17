import { describe, it, expect, beforeEach } from 'vitest';
import { MemberService } from '../../js/services/MemberService.js';
import { createTestStore, createTestMember } from '../helpers/testUtils.js';

describe('MemberService', () => {
  let store;
  let memberService;

  beforeEach(() => {
    store = createTestStore();
    memberService = new MemberService(store);
  });

  describe('getAll', () => {
    it('should return all members', () => {
      const members = [createTestMember(), createTestMember()];
      store.set('members', members);
      expect(memberService.getAll()).toEqual(members);
    });

    it('should return empty array when no members', () => {
      expect(memberService.getAll()).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return member by id', () => {
      const member = createTestMember({ id: 'test-id-123' });
      store.set('members', [member]);
      expect(memberService.getById('test-id-123')).toEqual(member);
    });

    it('should return undefined for non-existent id', () => {
      expect(memberService.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('add', () => {
    it('should add a new member', () => {
      const member = memberService.add('小明', '明', '#ff0000');
      expect(member).toHaveProperty('id');
      expect(member.name).toBe('小明');
      expect(member.avatar).toBe('明');
      expect(member.color).toBe('#ff0000');
      expect(member).toHaveProperty('joinDate');

      const all = memberService.getAll();
      expect(all.length).toBe(1);
      expect(all[0].name).toBe('小明');
    });

    it('should use first character of name as avatar if not provided', () => {
      const member = memberService.add('小红');
      expect(member.avatar).toBe('小');
    });

    it('should assign a random color if not provided', () => {
      const member = memberService.add('小刚');
      expect(member.color).toBeDefined();
      expect(typeof member.color).toBe('string');
      expect(member.color).toMatch(/^#/);
    });
  });

  describe('update', () => {
    it('should update member data', () => {
      const member = memberService.add('小明');
      memberService.update(member.id, { name: '大明', color: '#00ff00' });

      const updated = memberService.getById(member.id);
      expect(updated.name).toBe('大明');
      expect(updated.color).toBe('#00ff00');
    });

    it('should not affect other members', () => {
      const m1 = memberService.add('小明');
      const m2 = memberService.add('小红');
      memberService.update(m1.id, { name: '大明' });

      expect(memberService.getById(m2.id).name).toBe('小红');
    });
  });

  describe('delete', () => {
    it('should delete a member', () => {
      const member = memberService.add('小明');
      expect(memberService.getAll().length).toBe(1);

      memberService.delete(member.id);
      expect(memberService.getAll().length).toBe(0);
      expect(memberService.getById(member.id)).toBeUndefined();
    });

    it('should also delete related records, schedules, bills, settlements', () => {
      const member = createTestMember({ id: 'member-1' });
      store.set('members', [member]);
      store.set('records', [
        { id: 'r1', memberId: 'member-1', type: 'trash', date: Date.now() },
        { id: 'r2', memberId: 'other', type: 'trash', date: Date.now() },
      ]);
      store.set('schedules', [
        { id: 's1', memberId: 'member-1', type: 'trash', date: Date.now() },
      ]);
      store.set('bills', [
        { id: 'b1', payerId: 'member-1', amount: 100 },
      ]);
      store.set('settlements', [
        { id: 'st1', fromId: 'member-1', toId: 'other' },
        { id: 'st2', fromId: 'other', toId: 'member-1' },
      ]);

      memberService.delete('member-1');

      expect(store.get('records').length).toBe(1);
      expect(store.get('schedules').length).toBe(0);
      expect(store.get('bills').length).toBe(0);
      expect(store.get('settlements').length).toBe(0);
    });
  });

  describe('getMemberStats', () => {
    it('should return member task stats', () => {
      const member = createTestMember({ id: 'm1' });
      store.set('members', [member]);
      store.set('taskTypes', [
        { id: 'trash', name: '倒垃圾' },
        { id: 'clean', name: '打扫' },
      ]);
      store.set('records', [
        { id: 'r1', memberId: 'm1', type: 'trash', date: Date.now() },
        { id: 'r2', memberId: 'm1', type: 'trash', date: Date.now() },
        { id: 'r3', memberId: 'm1', type: 'clean', date: Date.now() },
      ]);

      const stats = memberService.getMemberStats('m1');
      expect(stats.total).toBe(3);
      expect(stats.trash).toBe(2);
      expect(stats.clean).toBe(1);
    });
  });

  describe('generateSampleMembers', () => {
    it('should generate sample members', () => {
      const members = memberService.generateSampleMembers();
      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBe(3);
      members.forEach(m => {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('name');
        expect(m).toHaveProperty('avatar');
        expect(m).toHaveProperty('color');
        expect(m).toHaveProperty('joinDate');
      });
    });
  });
});
