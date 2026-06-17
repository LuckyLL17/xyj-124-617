import { describe, it, expect, beforeEach } from 'vitest';
import { VoteService } from '../../js/services/VoteService.js';
import { createTestStore, createTestMember } from '../helpers/testUtils.js';

describe('VoteService', () => {
  let store;
  let voteService;

  beforeEach(() => {
    store = createTestStore();
    voteService = new VoteService(store);
  });

  describe('getAll', () => {
    it('should return all votes', () => {
      const votes = [
        { id: 'v1', title: '投票1', isArchived: false, createdAt: Date.now() },
        { id: 'v2', title: '投票2', isArchived: true, createdAt: Date.now() - 86400000 },
      ];
      store.set('votes', votes);
      const result = voteService.getAll();
      expect(result.length).toBe(2);
    });

    it('should return empty array when no votes', () => {
      expect(voteService.getAll()).toEqual([]);
    });

    it('should sort with archived at the end and by createdAt desc', () => {
      const now = Date.now();
      const votes = [
        { id: 'v1', title: '旧的活跃', isArchived: false, createdAt: now - 86400000 },
        { id: 'v2', title: '新的归档', isArchived: true, createdAt: now },
        { id: 'v3', title: '新的活跃', isArchived: false, createdAt: now },
      ];
      store.set('votes', votes);
      const result = voteService.getAll();
      expect(result[0].id).toBe('v3');
      expect(result[1].id).toBe('v1');
      expect(result[2].id).toBe('v2');
    });
  });

  describe('getActive', () => {
    it('should return only active (non-archived) votes', () => {
      store.set('votes', [
        { id: 'v1', isArchived: false, createdAt: Date.now() },
        { id: 'v2', isArchived: true, createdAt: Date.now() },
      ]);
      const result = voteService.getActive();
      expect(result.length).toBe(1);
      expect(result[0].isArchived).toBe(false);
    });
  });

  describe('getArchived', () => {
    it('should return only archived votes', () => {
      store.set('votes', [
        { id: 'v1', isArchived: false, createdAt: Date.now() },
        { id: 'v2', isArchived: true, createdAt: Date.now() },
      ]);
      const result = voteService.getArchived();
      expect(result.length).toBe(1);
      expect(result[0].isArchived).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return vote by id', () => {
      const vote = { id: 'v1', title: '测试投票', createdAt: Date.now() };
      store.set('votes', [vote]);
      expect(voteService.getById('v1')).toEqual(vote);
    });

    it('should return undefined for non-existent id', () => {
      expect(voteService.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('add', () => {
    it('should add a new vote', () => {
      const vote = voteService.add({
        title: '是否购买？',
        description: '投票描述',
        type: 'purchase',
        options: ['同意', '不同意'],
        creatorNickname: '小明',
      });

      expect(vote).toHaveProperty('id');
      expect(vote.title).toBe('是否购买？');
      expect(vote.description).toBe('投票描述');
      expect(vote.type).toBe('purchase');
      expect(vote.options.length).toBe(2);
      expect(vote.creatorNickname).toBe('小明');
      expect(vote.isArchived).toBe(false);
      expect(vote.allowMultiple).toBe(false);
      expect(vote.maxChoices).toBe(1);
      expect(vote).toHaveProperty('createdAt');
    });

    it('should initialize options with 0 votes', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['A', 'B'],
        creatorNickname: 'test',
      });
      vote.options.forEach(opt => {
        expect(opt.votes).toBe(0);
        expect(opt.voterNicknames).toEqual([]);
      });
    });

    it('should support allowMultiple', () => {
      const vote = voteService.add({
        title: '多选投票',
        type: 'rule',
        options: ['A', 'B', 'C'],
        creatorNickname: 'test',
        allowMultiple: true,
        maxChoices: 2,
      });
      expect(vote.allowMultiple).toBe(true);
      expect(vote.maxChoices).toBe(2);
    });
  });

  describe('archive', () => {
    it('should archive a vote', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['是', '否'],
        creatorNickname: 'test',
      });
      expect(vote.isArchived).toBe(false);
      voteService.archive(vote.id);
      expect(voteService.getById(vote.id).isArchived).toBe(true);
    });
  });

  describe('unarchive', () => {
    it('should unarchive a vote', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['是', '否'],
        creatorNickname: 'test',
      });
      voteService.archive(vote.id);
      voteService.unarchive(vote.id);
      expect(voteService.getById(vote.id).isArchived).toBe(false);
    });
  });

  describe('castVote', () => {
    it('should cast a vote', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['同意', '不同意'],
        creatorNickname: 'test',
      });
      const optionId = vote.options[0].id;

      voteService.castVote(vote.id, [optionId], '小明');
      const updated = voteService.getById(vote.id);
      expect(updated.options[0].votes).toBe(1);
      expect(updated.options[0].voterNicknames).toContain('小明');
    });

    it('should not allow voting twice', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['同意', '不同意'],
        creatorNickname: 'test',
      });
      const optionId = vote.options[0].id;

      voteService.castVote(vote.id, [optionId], '小明');
      voteService.castVote(vote.id, [vote.options[1].id], '小明');

      const updated = voteService.getById(vote.id);
      expect(updated.options[0].votes).toBe(1);
      expect(updated.options[1].votes).toBe(0);
    });

    it('should not allow voting on archived vote', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['同意', '不同意'],
        creatorNickname: 'test',
      });
      voteService.archive(vote.id);
      voteService.castVote(vote.id, [vote.options[0].id], '小明');

      const updated = voteService.getById(vote.id);
      expect(updated.options[0].votes).toBe(0);
    });

    it('should not allow voting after end date', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['同意', '不同意'],
        creatorNickname: 'test',
        endAt: Date.now() - 86400000,
      });
      voteService.castVote(vote.id, [vote.options[0].id], '小明');

      const updated = voteService.getById(vote.id);
      expect(updated.options[0].votes).toBe(0);
    });
  });

  describe('hasUserVoted', () => {
    it('should return true if user has voted', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['同意'],
        creatorNickname: 'test',
      });
      voteService.castVote(vote.id, [vote.options[0].id], '小明');
      expect(voteService.hasUserVoted(vote.id, '小明')).toBe(true);
    });

    it('should return false if user has not voted', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['同意'],
        creatorNickname: 'test',
      });
      expect(voteService.hasUserVoted(vote.id, '小明')).toBe(false);
    });

    it('should return false if vote not found', () => {
      expect(voteService.hasUserVoted('nonexistent', '小明')).toBe(false);
    });
  });

  describe('getTotalVotes', () => {
    it('should return total unique voters', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['A', 'B'],
        creatorNickname: 'test',
      });
      voteService.castVote(vote.id, [vote.options[0].id], '小明');
      voteService.castVote(vote.id, [vote.options[1].id], '小红');

      expect(voteService.getTotalVotes(vote.id)).toBe(2);
    });

    it('should return 0 if vote not found', () => {
      expect(voteService.getTotalVotes('nonexistent')).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return vote statistics', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['A', 'B'],
        creatorNickname: 'test',
      });
      voteService.castVote(vote.id, [vote.options[0].id], '小明');
      voteService.castVote(vote.id, [vote.options[0].id], '小红');

      const stats = voteService.getStatistics(vote.id);
      expect(stats.totalVoters).toBe(2);
      expect(stats.options[0].percentage).toBe(100);
      expect(stats.options[1].percentage).toBe(0);
      expect(typeof stats.isEnded).toBe('boolean');
    });

    it('should return null if vote not found', () => {
      expect(voteService.getStatistics('nonexistent')).toBeNull();
    });
  });

  describe('isVoteEnded', () => {
    it('should return true if archived', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['是'],
        creatorNickname: 'test',
      });
      voteService.archive(vote.id);
      expect(voteService.isVoteEnded(voteService.getById(vote.id))).toBe(true);
    });

    it('should return true if past end date', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['是'],
        creatorNickname: 'test',
        endAt: Date.now() - 86400000,
      });
      expect(voteService.isVoteEnded(vote)).toBe(true);
    });

    it('should return false if active and not ended', () => {
      const vote = voteService.add({
        title: '测试',
        type: 'purchase',
        options: ['是'],
        creatorNickname: 'test',
        endAt: Date.now() + 86400000,
      });
      expect(voteService.isVoteEnded(vote)).toBe(false);
    });
  });

  describe('generateSampleVotes', () => {
    it('should generate sample votes', () => {
      const members = [
        createTestMember({ id: 'm1', name: '小明' }),
        createTestMember({ id: 'm2', name: '小红' }),
        createTestMember({ id: 'm3', name: '小刚' }),
      ];
      const votes = voteService.generateSampleVotes(members);
      expect(Array.isArray(votes)).toBe(true);
      expect(votes.length).toBeGreaterThan(0);
      votes.forEach(v => {
        expect(v).toHaveProperty('id');
        expect(v).toHaveProperty('title');
        expect(v).toHaveProperty('options');
      });
    });

    it('should return empty array if no members', () => {
      const votes = voteService.generateSampleVotes([]);
      expect(votes).toEqual([]);
    });
  });
});
