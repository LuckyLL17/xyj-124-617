import { describe, it, expect, beforeEach } from 'vitest';
import { MessageService } from '../../js/services/MessageService.js';
import { createTestStore, createTestMember } from '../helpers/testUtils.js';

describe('MessageService', () => {
  let store;
  let messageService;

  beforeEach(() => {
    store = createTestStore();
    messageService = new MessageService(store);
  });

  describe('getAll', () => {
    it('should return all messages', () => {
      const messages = [
        { id: 'm1', nickname: '小明', content: '你好', isPinned: false, createdAt: Date.now() },
        { id: 'm2', nickname: '小红', content: '大家好', isPinned: true, createdAt: Date.now() - 86400000 },
      ];
      store.set('messages', messages);
      const result = messageService.getAll();
      expect(result.length).toBe(2);
    });

    it('should return empty array when no messages', () => {
      expect(messageService.getAll()).toEqual([]);
    });

    it('should sort with pinned first, then by createdAt desc', () => {
      const now = Date.now();
      store.set('messages', [
        { id: 'm1', isPinned: false, createdAt: now, nickname: '', content: '' },
        { id: 'm2', isPinned: true, createdAt: now - 86400000, nickname: '', content: '' },
        { id: 'm3', isPinned: true, createdAt: now, nickname: '', content: '' },
      ]);
      const result = messageService.getAll();
      expect(result[0].id).toBe('m3');
      expect(result[1].id).toBe('m2');
      expect(result[2].id).toBe('m1');
    });
  });

  describe('getById', () => {
    it('should return message by id', () => {
      const message = { id: 'm1', nickname: 'test', content: 'hello', createdAt: Date.now() };
      store.set('messages', [message]);
      expect(messageService.getById('m1')).toEqual(message);
    });

    it('should return undefined for non-existent id', () => {
      expect(messageService.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('add', () => {
    it('should add a new message', () => {
      const message = messageService.add({
        nickname: '小明',
        content: '大家好',
        mentionedMemberIds: ['m1', 'm2'],
      });

      expect(message).toHaveProperty('id');
      expect(message.nickname).toBe('小明');
      expect(message.content).toBe('大家好');
      expect(message.mentionedMemberIds).toEqual(['m1', 'm2']);
      expect(message.isPinned).toBe(false);
      expect(message).toHaveProperty('createdAt');
      expect(message.replies).toEqual([]);

      expect(messageService.getAll().length).toBe(1);
    });

    it('should default mentionedMemberIds to empty array', () => {
      const message = messageService.add({ nickname: 'test', content: 'hi' });
      expect(message.mentionedMemberIds).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete a message', () => {
      const message = messageService.add({ nickname: 'test', content: 'hi' });
      expect(messageService.getAll().length).toBe(1);

      messageService.delete(message.id);
      expect(messageService.getAll().length).toBe(0);
    });
  });

  describe('togglePin', () => {
    it('should toggle pin status', () => {
      const message = messageService.add({ nickname: 'test', content: 'hi' });
      expect(message.isPinned).toBe(false);

      messageService.togglePin(message.id);
      expect(messageService.getById(message.id).isPinned).toBe(true);

      messageService.togglePin(message.id);
      expect(messageService.getById(message.id).isPinned).toBe(false);
    });
  });

  describe('addReply', () => {
    it('should add a reply to a message', () => {
      const message = messageService.add({ nickname: '小明', content: '大家好' });
      const reply = messageService.addReply(message.id, {
        nickname: '小红',
        content: '你好小明',
      });

      expect(reply).toHaveProperty('id');
      expect(reply.nickname).toBe('小红');
      expect(reply.content).toBe('你好小明');
      expect(reply).toHaveProperty('createdAt');

      const updated = messageService.getById(message.id);
      expect(updated.replies.length).toBe(1);
      expect(updated.replies[0].nickname).toBe('小红');
    });
  });

  describe('deleteReply', () => {
    it('should delete a reply from a message', () => {
      const message = messageService.add({ nickname: '小明', content: '大家好' });
      const reply = messageService.addReply(message.id, { nickname: '小红', content: 'hi' });

      messageService.deleteReply(message.id, reply.id);
      const updated = messageService.getById(message.id);
      expect(updated.replies.length).toBe(0);
    });
  });

  describe('generateSampleMessages', () => {
    it('should generate sample messages', () => {
      const members = [
        createTestMember({ id: 'm1', name: '小明' }),
        createTestMember({ id: 'm2', name: '小红' }),
        createTestMember({ id: 'm3', name: '小刚' }),
      ];
      const messages = messageService.generateSampleMessages(members);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      messages.forEach(m => {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('nickname');
        expect(m).toHaveProperty('content');
        expect(m).toHaveProperty('replies');
      });
    });

    it('should return empty array if no members', () => {
      const messages = messageService.generateSampleMessages([]);
      expect(messages).toEqual([]);
    });
  });
});
