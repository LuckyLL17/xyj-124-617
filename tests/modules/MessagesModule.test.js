import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessagesModule } from '../../js/modules/MessagesModule.js';
import { createTestStore } from '../helpers/testUtils.js';
import { MemberService } from '../../js/services/MemberService.js';
import { MessageService } from '../../js/services/MessageService.js';

describe('MessagesModule', () => {
  let store;
  let memberService;
  let messageService;
  let modalMock;
  let toastMock;
  let messagesModule;

  beforeEach(() => {
    store = createTestStore();
    memberService = new MemberService(store);
    messageService = new MessageService(store);
    modalMock = { open: vi.fn(), close: vi.fn() };
    toastMock = { show: vi.fn() };

    messagesModule = new MessagesModule(
      store,
      memberService,
      messageService,
      modalMock,
      toastMock
    );
  });

  describe('_escapeHtml', () => {
    it('should escape HTML tags', () => {
      const result = messagesModule._escapeHtml('<div>hello</div>');
      expect(result).toBe('&lt;div&gt;hello&lt;/div&gt;');
    });

    it('should return plain text unchanged', () => {
      const result = messagesModule._escapeHtml('hello world');
      expect(result).toBe('hello world');
    });

    it('should escape ampersands', () => {
      const result = messagesModule._escapeHtml('a & b & c');
      expect(result).toBe('a &amp; b &amp; c');
    });

    it('should escape script tags', () => {
      const result = messagesModule._escapeHtml('<script>alert(1)</script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;/script&gt;');
    });
  });

  describe('_formatContent', () => {
    it('should format content with mentioned members', () => {
      const members = [{ id: '1', name: '小明' }];
      const result = messagesModule._formatContent('你好 @小明', members);
      expect(result).toContain('<span class="mention-highlight">@小明</span>');
    });

    it('should convert newlines to <br>', () => {
      const result = messagesModule._formatContent('line1\nline2', []);
      expect(result).toBe('line1<br>line2');
    });

    it('should escape HTML before formatting mentions', () => {
      const members = [{ id: '1', name: '小明' }];
      const result = messagesModule._formatContent('<b>@小明</b>', members);
      expect(result).toContain('&lt;b&gt;');
      expect(result).toContain('<span class="mention-highlight">@小明</span>');
    });

    it('should handle multiple mentions of same member', () => {
      const members = [{ id: '1', name: '小明' }];
      const result = messagesModule._formatContent('@小明 你好 @小明', members);
      const matches = result.match(/<span class="mention-highlight">@小明<\/span>/g);
      expect(matches.length).toBe(2);
    });
  });

  describe('_renderReply', () => {
    it('should render a reply item', () => {
      const reply = {
        id: 'reply1',
        nickname: '测试者',
        content: '这是一条回复',
        createdAt: Date.now()
      };
      const result = messagesModule._renderReply(reply);
      expect(result).toContain('reply-item');
      expect(result).toContain('测试者');
      expect(result).toContain('这是一条回复');
    });

    it('should escape HTML in reply content', () => {
      const reply = {
        id: 'reply1',
        nickname: '<b>hack</b>',
        content: '<script>alert(1)</script>',
        createdAt: Date.now()
      };
      const result = messagesModule._renderReply(reply);
      expect(result).toContain('&lt;b&gt;');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('_renderMessage', () => {
    it('should render a message card', () => {
      const message = {
        id: 'msg1',
        nickname: '小明',
        content: '这是一条留言',
        isPinned: false,
        createdAt: Date.now(),
        replies: [],
        mentionedMemberIds: []
      };
      const result = messagesModule._renderMessage(message);
      expect(result).toContain('message-card');
      expect(result).toContain('小明');
      expect(result).toContain('这是一条留言');
    });

    it('should render pinned message with pinned class', () => {
      const message = {
        id: 'msg1',
        nickname: '小明',
        content: '置顶留言',
        isPinned: true,
        createdAt: Date.now(),
        replies: [],
        mentionedMemberIds: []
      };
      const result = messagesModule._renderMessage(message);
      expect(result).toContain('message-card pinned');
      expect(result).toContain('pinned-badge');
    });

    it('should render mentioned members', () => {
      memberService.add('小红', '红', '#ff0000');
      const members = memberService.getAll();
      const message = {
        id: 'msg1',
        nickname: '小明',
        content: '@小红 你好',
        isPinned: false,
        createdAt: Date.now(),
        replies: [],
        mentionedMemberIds: [members[0].id]
      };
      const result = messagesModule._renderMessage(message);
      expect(result).toContain('mention-tag');
      expect(result).toContain('@小红');
    });

    it('should render replies', () => {
      const message = {
        id: 'msg1',
        nickname: '小明',
        content: '留言内容',
        isPinned: false,
        createdAt: Date.now(),
        replies: [
          { id: 'r1', nickname: '小红', content: '回复内容', createdAt: Date.now() }
        ],
        mentionedMemberIds: []
      };
      const result = messagesModule._renderMessage(message);
      expect(result).toContain('message-replies');
      expect(result).toContain('reply-item');
      expect(result).toContain('回复内容');
    });

    it('should include reply input section', () => {
      const message = {
        id: 'msg123',
        nickname: '小明',
        content: '内容',
        isPinned: false,
        createdAt: Date.now(),
        replies: [],
        mentionedMemberIds: []
      };
      const result = messagesModule._renderMessage(message);
      expect(result).toContain('replySection_msg123');
      expect(result).toContain('replyNickname_msg123');
      expect(result).toContain('replyContent_msg123');
    });
  });

  describe('render', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="messagesList"></div>';
    });

    it('should render empty state when no messages', () => {
      messagesModule.render();
      const container = document.getElementById('messagesList');
      expect(container.innerHTML).toContain('暂无留言');
      expect(container.innerHTML).toContain('💬');
    });

    it('should render message list when there are messages', () => {
      messageService.add({ nickname: '小明', content: '第一条留言' });
      messageService.add({ nickname: '小红', content: '第二条留言' });

      messagesModule.render();

      const container = document.getElementById('messagesList');
      expect(container.innerHTML).toContain('message-card');
      expect(container.innerHTML).toContain('小明');
      expect(container.innerHTML).toContain('小红');
    });

    it('should call _renderMessage for each message', () => {
      messageService.add({ nickname: 'A', content: 'a' });
      messageService.add({ nickname: 'B', content: 'b' });
      messageService.add({ nickname: 'C', content: 'c' });

      const renderSpy = vi.spyOn(messagesModule, '_renderMessage');
      messagesModule.render();

      expect(renderSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('showAddModal', () => {
    it('should open modal with message form', () => {
      messagesModule.showAddModal();
      expect(modalMock.open).toHaveBeenCalled();
      expect(modalMock.open.mock.calls[0][0]).toBe('发布留言');
    });

    it('should include member checkboxes when members exist', () => {
      memberService.add('小明', '明', '#ff0000');
      memberService.add('小红', '红', '#00ff00');

      messagesModule.showAddModal();

      const bodyHtml = modalMock.open.mock.calls[0][1];
      expect(bodyHtml).toContain('mention-checkbox');
      expect(bodyHtml).toContain('小明');
      expect(bodyHtml).toContain('小红');
    });

    it('should show empty message when no members', () => {
      messagesModule.showAddModal();
      const bodyHtml = modalMock.open.mock.calls[0][1];
      expect(bodyHtml).toContain('暂无成员');
    });

    it('should include message form inputs', () => {
      messagesModule.showAddModal();
      const bodyHtml = modalMock.open.mock.calls[0][1];
      expect(bodyHtml).toContain('messageNickname');
      expect(bodyHtml).toContain('messageContent');
      expect(bodyHtml).toContain('messageForm');
    });
  });

  describe('saveMessage', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="messageNickname" value="">
        <textarea id="messageContent"></textarea>
        <div class="mention-checkboxes"></div>
      `;
    });

    it('should show error when nickname is empty', () => {
      document.getElementById('messageNickname').value = '';
      document.getElementById('messageContent').value = '有内容';

      messagesModule.saveMessage();

      expect(toastMock.show).toHaveBeenCalledWith('请输入你的昵称', 'error');
      expect(modalMock.close).not.toHaveBeenCalled();
    });

    it('should show error when content is empty', () => {
      document.getElementById('messageNickname').value = '测试者';
      document.getElementById('messageContent').value = '';

      messagesModule.saveMessage();

      expect(toastMock.show).toHaveBeenCalledWith('请输入留言内容', 'error');
      expect(modalMock.close).not.toHaveBeenCalled();
    });

    it('should save message and close modal', () => {
      document.getElementById('messageNickname').value = '测试者';
      document.getElementById('messageContent').value = '测试留言内容';

      messagesModule.saveMessage();

      const messages = messageService.getAll();
      expect(messages.length).toBe(1);
      expect(messages[0].nickname).toBe('测试者');
      expect(messages[0].content).toBe('测试留言内容');
      expect(modalMock.close).toHaveBeenCalled();
      expect(toastMock.show).toHaveBeenCalledWith('留言发布成功', 'success');
    });

    it('should save with mentioned members', () => {
      const member1 = memberService.add('小明', '明', '#ff0000');
      const member2 = memberService.add('小红', '红', '#00ff00');

      document.body.innerHTML = `
        <input id="messageNickname" value="测试者">
        <textarea id="messageContent">测试内容</textarea>
        <div class="mention-checkboxes">
          <label class="mention-checkbox">
            <input type="checkbox" value="${member1.id}" checked>
            <span>小明</span>
          </label>
          <label class="mention-checkbox">
            <input type="checkbox" value="${member2.id}" checked>
            <span>小红</span>
          </label>
        </div>
      `;

      messagesModule.saveMessage();

      const messages = messageService.getAll();
      expect(messages[0].mentionedMemberIds).toEqual([member1.id, member2.id]);
    });

    it('should trim whitespace from inputs', () => {
      document.getElementById('messageNickname').value = '  测试者  ';
      document.getElementById('messageContent').value = '  测试内容  ';

      messagesModule.saveMessage();

      const messages = messageService.getAll();
      expect(messages[0].nickname).toBe('测试者');
      expect(messages[0].content).toBe('测试内容');
    });
  });

  describe('deleteMessage', () => {
    it('should delete message when confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const message = messageService.add({ nickname: '小明', content: '要删除的留言' });

      messagesModule.deleteMessage(message.id);

      expect(messageService.getAll().length).toBe(0);
      expect(toastMock.show).toHaveBeenCalledWith('留言已删除', 'success');
    });

    it('should not delete message when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const message = messageService.add({ nickname: '小明', content: '保留的留言' });

      messagesModule.deleteMessage(message.id);

      expect(messageService.getAll().length).toBe(1);
      expect(toastMock.show).not.toHaveBeenCalled();
    });
  });

  describe('togglePin', () => {
    it('should pin an unpinned message', () => {
      const message = messageService.add({ nickname: '小明', content: '留言' });
      expect(message.isPinned).toBe(false);

      messagesModule.togglePin(message.id);

      const updated = messageService.getById(message.id);
      expect(updated.isPinned).toBe(true);
      expect(toastMock.show).toHaveBeenCalledWith('已置顶', 'success');
    });

    it('should unpin a pinned message', () => {
      const message = messageService.add({ nickname: '小明', content: '留言' });
      messageService.togglePin(message.id);

      messagesModule.togglePin(message.id);

      const updated = messageService.getById(message.id);
      expect(updated.isPinned).toBe(false);
      expect(toastMock.show).toHaveBeenCalledWith('已取消置顶', 'success');
    });
  });

  describe('showReplyInput', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="replySection_msg1" style="display: none;"></div>
      `;
    });

    it('should show reply input section', () => {
      messagesModule.showReplyInput('msg1');
      const section = document.getElementById('replySection_msg1');
      expect(section.style.display).toBe('block');
    });

    it('should not throw when section does not exist', () => {
      expect(() => {
        messagesModule.showReplyInput('nonexistent');
      }).not.toThrow();
    });
  });

  describe('hideReplyInput', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="replySection_msg1" style="display: block;"></div>
      `;
    });

    it('should hide reply input section', () => {
      messagesModule.hideReplyInput('msg1');
      const section = document.getElementById('replySection_msg1');
      expect(section.style.display).toBe('none');
    });

    it('should not throw when section does not exist', () => {
      expect(() => {
        messagesModule.hideReplyInput('nonexistent');
      }).not.toThrow();
    });
  });

  describe('submitReply', () => {
    beforeEach(() => {
      const message = messageService.add({ nickname: '楼主', content: '原帖内容' });
      document.body.innerHTML = `
        <input id="replyNickname_${message.id}" value="">
        <textarea id="replyContent_${message.id}"></textarea>
      `;
    });

    it('should show error when nickname is empty', () => {
      const message = messageService.getAll()[0];
      document.getElementById(`replyNickname_${message.id}`).value = '';
      document.getElementById(`replyContent_${message.id}`).value = '回复内容';

      messagesModule.submitReply(message.id);

      expect(toastMock.show).toHaveBeenCalledWith('请输入你的昵称', 'error');
    });

    it('should show error when content is empty', () => {
      const message = messageService.getAll()[0];
      document.getElementById(`replyNickname_${message.id}`).value = '回复者';
      document.getElementById(`replyContent_${message.id}`).value = '';

      messagesModule.submitReply(message.id);

      expect(toastMock.show).toHaveBeenCalledWith('请输入回复内容', 'error');
    });

    it('should submit reply successfully', () => {
      const message = messageService.getAll()[0];
      document.getElementById(`replyNickname_${message.id}`).value = '回复者';
      document.getElementById(`replyContent_${message.id}`).value = '这是回复内容';

      messagesModule.submitReply(message.id);

      const updated = messageService.getById(message.id);
      expect(updated.replies.length).toBe(1);
      expect(updated.replies[0].nickname).toBe('回复者');
      expect(updated.replies[0].content).toBe('这是回复内容');
      expect(toastMock.show).toHaveBeenCalledWith('回复成功', 'success');
    });

    it('should trim whitespace from inputs', () => {
      const message = messageService.getAll()[0];
      document.getElementById(`replyNickname_${message.id}`).value = '  回复者  ';
      document.getElementById(`replyContent_${message.id}`).value = '  回复内容  ';

      messagesModule.submitReply(message.id);

      const updated = messageService.getById(message.id);
      expect(updated.replies[0].nickname).toBe('回复者');
      expect(updated.replies[0].content).toBe('回复内容');
    });
  });
});
