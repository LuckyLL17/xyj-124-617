import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VotesModule } from '../../js/modules/VotesModule.js';
import { createTestStore } from '../helpers/testUtils.js';
import { VoteService } from '../../js/services/VoteService.js';
import { MemberService } from '../../js/services/MemberService.js';

describe('VotesModule', () => {
  let store;
  let voteService;
  let memberService;
  let modalMock;
  let toastMock;
  let votesModule;

  beforeEach(() => {
    store = createTestStore();
    voteService = new VoteService(store);
    memberService = new MemberService(store);
    modalMock = {
      open: vi.fn(),
      close: vi.fn(),
      isOpen: vi.fn().mockReturnValue(true),
      bodyEl: { innerHTML: '' }
    };
    toastMock = { show: vi.fn() };

    votesModule = new VotesModule(
      store,
      memberService,
      voteService,
      modalMock,
      toastMock
    );

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('_escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const result = votesModule._escapeHtml('<script>alert("xss")</script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;/script&gt;');
      expect(result).toContain('alert("xss")');
    });

    it('should return empty string for falsy values', () => {
      expect(votesModule._escapeHtml(null)).toBe('');
      expect(votesModule._escapeHtml(undefined)).toBe('');
      expect(votesModule._escapeHtml('')).toBe('');
    });

    it('should escape angle brackets and ampersands', () => {
      const result = votesModule._escapeHtml('Tom & Jerry <test>');
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });
  });

  describe('_getLastVoterNickname', () => {
    it('should return empty string when no nickname stored', () => {
      const result = votesModule._getLastVoterNickname();
      expect(result).toBe('');
    });

    it('should return stored nickname from localStorage', () => {
      localStorage.setItem('vote_last_nickname', '小明');
      const result = votesModule._getLastVoterNickname();
      expect(result).toBe('小明');
    });
  });

  describe('_setLastVoterNickname', () => {
    it('should store nickname in localStorage', () => {
      votesModule._setLastVoterNickname('小红');
      expect(localStorage.getItem('vote_last_nickname')).toBe('小红');
    });

    it('should handle empty string', () => {
      votesModule._setLastVoterNickname('');
      expect(localStorage.getItem('vote_last_nickname')).toBe('');
    });
  });

  describe('_renderMiniBar', () => {
    it('should render mini bar with correct percentage', () => {
      const option = { id: 'opt1', label: '选项A', votes: 3 };
      const result = votesModule._renderMiniBar(option, 0, 10);
      expect(result).toContain('vote-mini-bar-row');
      expect(result).toContain('选项A');
      expect(result).toContain('30%');
    });

    it('should handle zero total voters', () => {
      const option = { id: 'opt1', label: '选项A', votes: 0 };
      const result = votesModule._renderMiniBar(option, 0, 0);
      expect(result).toContain('0%');
    });

    it('should escape HTML in option label', () => {
      const option = { id: 'opt1', label: '<b>bold</b>', votes: 5 };
      const result = votesModule._renderMiniBar(option, 0, 10);
      expect(result).not.toContain('<b>bold</b>');
      expect(result).toContain('&lt;b&gt;');
    });
  });

  describe('_renderVoteCard', () => {
    it('should render vote card with basic info', () => {
      const vote = voteService.add({
        title: '测试投票',
        description: '投票描述',
        type: 'other',
        options: ['选项A', '选项B'],
        creatorNickname: '发起人'
      });

      const result = votesModule._renderVoteCard(vote);
      expect(result).toContain('vote-card');
      expect(result).toContain('测试投票');
      expect(result).toContain('投票描述');
      expect(result).toContain('发起人');
    });

    it('should render archived badge for archived vote', () => {
      const vote = voteService.add({
        title: '已归档投票',
        type: 'other',
        options: ['是', '否'],
        creatorNickname: '测试者'
      });
      voteService.archive(vote.id);
      const archivedVote = voteService.getById(vote.id);

      const result = votesModule._renderVoteCard(archivedVote);
      expect(result).toContain('archived');
      expect(result).toContain('已归档');
    });

    it('should escape HTML in vote title and description', () => {
      const vote = voteService.add({
        title: '<h1>标题</h1>',
        description: '<p>描述</p>',
        type: 'other',
        options: ['选项1', '选项2'],
        creatorNickname: '<b>发起人</b>'
      });

      const result = votesModule._renderVoteCard(vote);
      expect(result).not.toContain('<h1>标题</h1>');
      expect(result).not.toContain('<b>发起人</b>');
    });
  });

  describe('_renderVoteDetail', () => {
    it('should render vote detail with options', () => {
      const vote = voteService.add({
        title: '详细投票',
        description: '详细描述',
        type: 'purchase',
        options: ['选项A', '选项B', '选项C'],
        creatorNickname: '创建者'
      });

      const result = votesModule._renderVoteDetail(vote);
      expect(result).toContain('vote-detail');
      expect(result).toContain('详细投票');
      expect(result).toContain('vote-options-list');
    });

    it('should show voted notice when user has voted', () => {
      const vote = voteService.add({
        title: '已投票测试',
        type: 'other',
        options: ['同意', '不同意'],
        creatorNickname: '发起人'
      });
      voteService.castVote(vote.id, [vote.options[0].id], '测试用户');
      localStorage.setItem('vote_last_nickname', '测试用户');

      const result = votesModule._renderVoteDetail(voteService.getById(vote.id));
      expect(result).toContain('你已参与投票');
      expect(result).toContain('测试用户');
    });

    it('should show vote action area when user can vote', () => {
      const vote = voteService.add({
        title: '可投票测试',
        type: 'other',
        options: ['同意', '不同意'],
        creatorNickname: '发起人'
      });

      const result = votesModule._renderVoteDetail(vote);
      expect(result).toContain('voteVoterNickname');
      expect(result).toContain('确认投票');
    });

    it('should show archived notice for archived vote', () => {
      const vote = voteService.add({
        title: '归档投票',
        type: 'other',
        options: ['是', '否'],
        creatorNickname: '测试者'
      });
      voteService.archive(vote.id);

      const result = votesModule._renderVoteDetail(voteService.getById(vote.id));
      expect(result).toContain('该投票已归档');
    });
  });

  describe('render', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="votesContent"></div>';
    });

    it('should render empty state when no votes', () => {
      votesModule.render();
      const container = document.getElementById('votesContent');
      expect(container.innerHTML).toContain('vote-stats-grid');
      expect(container.innerHTML).toContain('暂无进行中的投票');
    });

    it('should render vote cards when there are active votes', () => {
      voteService.add({
        title: '投票1',
        type: 'other',
        options: ['是', '否'],
        creatorNickname: '发起人'
      });
      voteService.add({
        title: '投票2',
        type: 'purchase',
        options: ['买', '不买'],
        creatorNickname: '测试者'
      });

      votesModule.render();

      const container = document.getElementById('votesContent');
      expect(container.innerHTML).toContain('votes-list');
      expect(container.innerHTML).toContain('投票1');
      expect(container.innerHTML).toContain('投票2');
    });

    it('should render stats with correct counts', () => {
      voteService.add({
        title: '进行中投票',
        type: 'other',
        options: ['是', '否'],
        creatorNickname: 'A'
      });
      const archived = voteService.add({
        title: '已归档投票',
        type: 'other',
        options: ['是', '否'],
        creatorNickname: 'B'
      });
      voteService.archive(archived.id);

      votesModule.render();

      const container = document.getElementById('votesContent');
      expect(container.innerHTML).toContain('进行中');
      expect(container.innerHTML).toContain('已归档');
    });

    it('should return early when container not found', () => {
      document.body.innerHTML = '';
      expect(() => votesModule.render()).not.toThrow();
    });
  });

  describe('showAddModal', () => {
    it('should open modal with vote creation form', () => {
      votesModule.showAddModal();
      expect(modalMock.open).toHaveBeenCalled();
      expect(modalMock.open.mock.calls[0][0]).toBe('发起公共投票');
      expect(modalMock.open.mock.calls[0][1]).toContain('voteCreateForm');
      expect(modalMock.open.mock.calls[0][1]).toContain('voteTitle');
      expect(modalMock.open.mock.calls[0][1]).toContain('voteType');
    });

    it('should include option inputs in the form', () => {
      votesModule.showAddModal();
      const bodyHtml = modalMock.open.mock.calls[0][1];
      expect(bodyHtml).toContain('voteOptionsInputs');
      expect(bodyHtml).toContain('同意');
      expect(bodyHtml).toContain('不同意');
    });
  });

  describe('addVoteOptionInput', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="voteOptionsInputs">
          <div class="vote-option-input-row">
            <input type="text" class="form-input" value="选项1">
            <button class="btn-icon vote-option-remove">×</button>
          </div>
          <div class="vote-option-input-row">
            <input type="text" class="form-input" value="选项2">
            <button class="btn-icon vote-option-remove">×</button>
          </div>
        </div>
      `;
    });

    it('should add a new option input row', () => {
      votesModule.addVoteOptionInput();
      const rows = document.querySelectorAll('.vote-option-input-row');
      expect(rows.length).toBe(3);
    });

    it('should not add more than 10 options', () => {
      for (let i = 0; i < 8; i++) {
        votesModule.addVoteOptionInput();
      }
      let rows = document.querySelectorAll('.vote-option-input-row');
      expect(rows.length).toBe(10);

      votesModule.addVoteOptionInput();
      rows = document.querySelectorAll('.vote-option-input-row');
      expect(rows.length).toBe(10);
      expect(toastMock.show).toHaveBeenCalledWith('最多支持10个选项', 'error');
    });

    it('should return early when container not found', () => {
      document.body.innerHTML = '';
      expect(() => votesModule.addVoteOptionInput()).not.toThrow();
    });
  });

  describe('toggleMaxChoices', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input type="checkbox" id="voteAllowMultiple">
        <div id="maxChoicesGroup" style="display:none;"></div>
      `;
    });

    it('should show max choices group when checkbox is checked', () => {
      document.getElementById('voteAllowMultiple').checked = true;
      votesModule.toggleMaxChoices();
      const group = document.getElementById('maxChoicesGroup');
      expect(group.style.display).toBe('block');
    });

    it('should hide max choices group when checkbox is unchecked', () => {
      document.getElementById('voteAllowMultiple').checked = false;
      votesModule.toggleMaxChoices();
      const group = document.getElementById('maxChoicesGroup');
      expect(group.style.display).toBe('none');
    });
  });

  describe('validateVoteChoices', () => {
    beforeEach(() => {
      const vote = voteService.add({
        title: '多选投票',
        type: 'other',
        options: ['A', 'B', 'C', 'D'],
        creatorNickname: '测试者',
        allowMultiple: true,
        maxChoices: 2
      });
      votesModule._currentDetailVote = vote;
    });

    it('should show warning when exceeding max choices', () => {
      document.body.innerHTML = `
        <input type="checkbox" class="vote-option-input" value="opt1" checked>
        <input type="checkbox" class="vote-option-input" value="opt2" checked>
        <input type="checkbox" class="vote-option-input" value="opt3" checked>
      `;

      votesModule.validateVoteChoices();
      expect(toastMock.show).toHaveBeenCalledWith('最多只能选 2 项', 'warning');
    });

    it('should do nothing when within max choices', () => {
      document.body.innerHTML = `
        <input type="checkbox" class="vote-option-input" value="opt1" checked>
        <input type="checkbox" class="vote-option-input" value="opt2">
      `;

      votesModule.validateVoteChoices();
      expect(toastMock.show).not.toHaveBeenCalled();
    });

    it('should return early when no current detail vote', () => {
      votesModule._currentDetailVote = null;
      expect(() => votesModule.validateVoteChoices()).not.toThrow();
    });
  });

  describe('createVote', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <form id="voteCreateForm">
          <input type="text" id="voteTitle" value="新投票">
          <select id="voteType"><option value="other" selected>其他</option></select>
          <textarea id="voteDescription">描述</textarea>
          <div id="voteOptionsInputs">
            <div class="vote-option-input-row"><input type="text" value="选项1"></div>
            <div class="vote-option-input-row"><input type="text" value="选项2"></div>
          </div>
          <input type="checkbox" id="voteAllowMultiple">
          <input type="number" id="voteMaxChoices" value="2">
          <input type="datetime-local" id="voteEndAt" value="">
          <input type="text" id="voteCreatorNickname" value="发起人">
        </form>
      `;
    });

    it('should create a new vote successfully', () => {
      votesModule.createVote();

      const votes = voteService.getAll();
      expect(votes.length).toBe(1);
      expect(votes[0].title).toBe('新投票');
      expect(votes[0].creatorNickname).toBe('发起人');
      expect(votes[0].options.length).toBe(2);
      expect(modalMock.close).toHaveBeenCalled();
      expect(toastMock.show).toHaveBeenCalledWith('投票发起成功', 'success');
    });

    it('should show error when title is empty', () => {
      document.getElementById('voteTitle').value = '';
      votesModule.createVote();
      expect(toastMock.show).toHaveBeenCalledWith('请输入投票主题', 'error');
      expect(voteService.getAll().length).toBe(0);
    });

    it('should show error when less than 2 options', () => {
      document.getElementById('voteOptionsInputs').innerHTML = `
        <div class="vote-option-input-row"><input type="text" value="选项1"></div>
      `;
      votesModule.createVote();
      expect(toastMock.show).toHaveBeenCalledWith('请至少填写2个投票选项', 'error');
    });

    it('should show error when creator nickname is empty', () => {
      document.getElementById('voteCreatorNickname').value = '';
      votesModule.createVote();
      expect(toastMock.show).toHaveBeenCalledWith('请输入发起人昵称', 'error');
    });
  });

  describe('openVoteDetail', () => {
    it('should open modal with vote detail', () => {
      const vote = voteService.add({
        title: '详情投票',
        type: 'other',
        options: ['是', '否'],
        creatorNickname: '发起人'
      });

      votesModule.openVoteDetail(vote.id);

      expect(modalMock.open).toHaveBeenCalled();
      expect(modalMock.open.mock.calls[0][0]).toBe('投票详情');
      expect(votesModule._currentDetailVoteId).toBe(vote.id);
    });

    it('should show error when vote not found', () => {
      votesModule.openVoteDetail('nonexistent');
      expect(toastMock.show).toHaveBeenCalledWith('投票不存在', 'error');
      expect(modalMock.open).not.toHaveBeenCalled();
    });

    it('should set up refresh timer', () => {
      const vote = voteService.add({
        title: '刷新测试',
        type: 'other',
        options: ['A', 'B'],
        creatorNickname: '测试'
      });

      votesModule.openVoteDetail(vote.id);
      expect(votesModule._refreshTimer).toBeDefined();
    });
  });

  describe('submitVote', () => {
    let vote;

    beforeEach(() => {
      vote = voteService.add({
        title: '提交投票测试',
        type: 'other',
        options: ['选项A', '选项B'],
        creatorNickname: '发起人'
      });

      document.body.innerHTML = `
        <input type="text" id="voteVoterNickname" value="投票者">
        <input type="radio" class="vote-option-input" value="${vote.options[0].id}" checked>
        <input type="radio" class="vote-option-input" value="${vote.options[1].id}">
      `;

      modalMock.bodyEl = { innerHTML: '' };
    });

    it('should submit vote successfully', () => {
      votesModule.submitVote(vote.id);

      expect(voteService.hasUserVoted(vote.id, '投票者')).toBe(true);
      expect(toastMock.show).toHaveBeenCalledWith('投票成功', 'success');
      expect(localStorage.getItem('vote_last_nickname')).toBe('投票者');
    });

    it('should show error when nickname is empty', () => {
      document.getElementById('voteVoterNickname').value = '';
      votesModule.submitVote(vote.id);
      expect(toastMock.show).toHaveBeenCalledWith('请输入你的昵称', 'error');
    });

    it('should show error when no option selected', () => {
      document.querySelectorAll('.vote-option-input').forEach(el => el.checked = false);
      votesModule.submitVote(vote.id);
      expect(toastMock.show).toHaveBeenCalledWith('请选择至少一个选项', 'error');
    });

    it('should show error when user already voted', () => {
      voteService.castVote(vote.id, [vote.options[0].id], '投票者');
      votesModule.submitVote(vote.id);
      expect(toastMock.show).toHaveBeenCalledWith('该昵称已经参与过投票了', 'error');
    });
  });

  describe('archiveVote', () => {
    it('should archive vote when confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const vote = voteService.add({
        title: '归档测试',
        type: 'other',
        options: ['是', '否'],
        creatorNickname: '测试者'
      });

      votesModule.archiveVote(vote.id);

      expect(voteService.getById(vote.id).isArchived).toBe(true);
      expect(modalMock.close).toHaveBeenCalled();
      expect(toastMock.show).toHaveBeenCalledWith('投票已归档', 'success');
    });

    it('should not archive when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const vote = voteService.add({
        title: '取消归档',
        type: 'other',
        options: ['是', '否'],
        creatorNickname: '测试者'
      });

      votesModule.archiveVote(vote.id);

      expect(voteService.getById(vote.id).isArchived).toBe(false);
      expect(modalMock.close).not.toHaveBeenCalled();
    });
  });

  describe('unarchiveVote', () => {
    it('should unarchive vote', () => {
      const vote = voteService.add({
        title: '取消归档测试',
        type: 'other',
        options: ['是', '否'],
        creatorNickname: '测试者'
      });
      voteService.archive(vote.id);

      votesModule.unarchiveVote(vote.id);

      expect(voteService.getById(vote.id).isArchived).toBe(false);
      expect(modalMock.close).toHaveBeenCalled();
      expect(toastMock.show).toHaveBeenCalledWith('已取消归档', 'success');
    });
  });

  describe('switchTab', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="votesContent"></div>';
    });

    it('should switch to archived tab and show archived votes', () => {
      const archivedVote = voteService.add({
        title: '已归档投票',
        type: 'other',
        options: ['A', 'B'],
        creatorNickname: '测试'
      });
      voteService.archive(archivedVote.id);

      votesModule.switchTab('archived');

      expect(votesModule._currentTab).toBe('archived');
      const container = document.getElementById('votesContent');
      expect(container.innerHTML).toContain('已归档投票');
      expect(container.innerHTML).toContain('archived-badge');
    });

    it('should switch to active tab', () => {
      votesModule._currentTab = 'archived';
      votesModule.switchTab('active');
      expect(votesModule._currentTab).toBe('active');
    });

    it('should show empty state for archived tab when no archived votes', () => {
      votesModule.switchTab('archived');
      const container = document.getElementById('votesContent');
      expect(container.innerHTML).toContain('暂无已归档的投票');
    });
  });
});
