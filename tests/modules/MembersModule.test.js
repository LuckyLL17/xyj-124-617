import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MembersModule } from '../../js/modules/MembersModule.js';
import { createTestStore } from '../helpers/testUtils.js';
import { MemberService } from '../../js/services/MemberService.js';
import { TaskTypeService } from '../../js/services/TaskTypeService.js';

describe('MembersModule', () => {
  let store;
  let memberService;
  let taskTypeService;
  let modalMock;
  let toastMock;
  let membersModule;

  beforeEach(() => {
    store = createTestStore();
    memberService = new MemberService(store);
    taskTypeService = new TaskTypeService(store);
    modalMock = { open: vi.fn(), close: vi.fn() };
    toastMock = { show: vi.fn() };

    membersModule = new MembersModule(
      store,
      memberService,
      taskTypeService,
      modalMock,
      toastMock
    );
  });

  describe('render', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="membersList"></div>';
    });

    it('should render empty state when no members', () => {
      membersModule.render();
      const container = document.getElementById('membersList');
      expect(container.innerHTML).toContain('empty-state');
      expect(container.innerHTML).toContain('暂无成员');
    });

    it('should render member cards when there are members', () => {
      memberService.add('小明', '明', '#ff0000');
      memberService.add('小红', '红', '#00ff00');

      membersModule.render();

      const container = document.getElementById('membersList');
      expect(container.innerHTML).toContain('member-card');
      expect(container.innerHTML).toContain('小明');
      expect(container.innerHTML).toContain('小红');
    });
  });

  describe('showAddModal', () => {
    it('should open modal with member form', () => {
      membersModule.showAddModal();
      expect(modalMock.open).toHaveBeenCalled();
      expect(modalMock.open.mock.calls[0][0]).toBe('添加成员');
    });
  });

  describe('showEditModal', () => {
    it('should open modal with member data', () => {
      const member = memberService.add('小明', '明', '#ff0000');
      membersModule.showEditModal(member.id);
      expect(modalMock.open).toHaveBeenCalled();
      expect(modalMock.open.mock.calls[0][0]).toContain('编辑');
    });

    it('should return early if member not found', () => {
      membersModule.showEditModal('nonexistent');
      expect(modalMock.open).not.toHaveBeenCalled();
    });
  });

  describe('saveMember', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="memberName" value="新成员">
        <input id="memberAvatar" value="新">
        <div>
          <input type="radio" name="memberColor" value="#ff0000" checked>
        </div>
      `;
    });

    it('should add a new member when no memberId', () => {
      const event = { preventDefault: vi.fn() };
      membersModule.saveMember(event, '');
      expect(event.preventDefault).toHaveBeenCalled();
      expect(memberService.getAll().length).toBe(1);
      expect(toastMock.show).toHaveBeenCalled();
      expect(modalMock.close).toHaveBeenCalled();
    });

    it('should update an existing member', () => {
      const member = memberService.add('旧名', '旧', '#0000ff');
      document.getElementById('memberName').value = '新名';
      const event = { preventDefault: vi.fn() };
      membersModule.saveMember(event, member.id);
      expect(memberService.getById(member.id).name).toBe('新名');
      expect(toastMock.show).toHaveBeenCalled();
    });
  });

  describe('deleteMember', () => {
    it('should delete member when confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const member = memberService.add('小明', '明', '#ff0000');
      membersModule.deleteMember(member.id);
      expect(memberService.getAll().length).toBe(0);
      expect(toastMock.show).toHaveBeenCalled();
    });

    it('should not delete member when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const member = memberService.add('小明', '明', '#ff0000');
      membersModule.deleteMember(member.id);
      expect(memberService.getAll().length).toBe(1);
    });
  });
});
