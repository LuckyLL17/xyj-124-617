import { formatDateTime } from '../utils/helpers.js';
import { AVATAR_COLORS } from '../utils/constants.js';

export class MessagesModule {
    constructor(store, memberService, messageService, modal, toast) {
        this.store = store;
        this.memberService = memberService;
        this.messageService = messageService;
        this.modal = modal;
        this.toast = toast;
    }

    render() {
        const container = document.getElementById('messagesList');
        const messages = this.messageService.getAll();

        if (messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">💬</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 8px;">暂无留言</h3>
                    <p style="color: var(--text-muted);">点击右上角按钮发布第一条留言吧</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(msg => this._renderMessage(msg)).join('');
    }

    _renderMessage(message) {
        const members = this.memberService.getAll();
        const mentionedMembers = (message.mentionedMemberIds || [])
            .map(id => members.find(m => m.id === id))
            .filter(Boolean);

        const avatarColor = AVATAR_COLORS[
            Math.abs(message.nickname.charCodeAt(0)) % AVATAR_COLORS.length
        ];

        const replyCount = (message.replies || []).length;

        return `
            <div class="message-card ${message.isPinned ? 'pinned' : ''}">
                <div class="message-header">
                    <div class="message-author">
                        <div class="message-avatar" style="background: ${avatarColor};">
                            ${message.nickname.charAt(0)}
                        </div>
                        <div class="message-author-info">
                            <span class="message-nickname">${this._escapeHtml(message.nickname)}</span>
                            <span class="message-time">${formatDateTime(message.createdAt)}</span>
                        </div>
                    </div>
                    <div class="message-actions">
                        ${message.isPinned ? '<span class="pinned-badge">📌 置顶</span>' : ''}
                        <button class="btn-icon" onclick="window._app.pinMessage('${message.id}')" title="${message.isPinned ? '取消置顶' : '置顶'}">
                            ${message.isPinned ? '📌' : '📍'}
                        </button>
                        <button class="btn-icon" onclick="window._app.deleteMessage('${message.id}')" title="删除">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="message-content">
                    ${this._formatContent(message.content, mentionedMembers)}
                </div>
                ${mentionedMembers.length > 0 ? `
                    <div class="message-mentions">
                        ${mentionedMembers.map(m => `<span class="mention-tag">@${m.name}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="message-footer">
                    <span class="reply-count">💬 ${replyCount} 条回复</span>
                    <button class="btn btn-text btn-sm" onclick="window._app.showReplyInput('${message.id}')">
                        回复
                    </button>
                </div>
                ${replyCount > 0 ? `
                    <div class="message-replies">
                        ${(message.replies || []).map(reply => this._renderReply(reply)).join('')}
                    </div>
                ` : ''}
                <div class="reply-input-section" id="replySection_${message.id}" style="display: none;">
                    <div class="reply-input-wrapper">
                        <input type="text" class="reply-nickname-input" id="replyNickname_${message.id}" placeholder="你的昵称">
                        <textarea class="reply-textarea" id="replyContent_${message.id}" placeholder="写下你的回复..." rows="2"></textarea>
                    </div>
                    <div class="reply-actions">
                        <button class="btn btn-primary btn-sm" onclick="window._app.submitReply('${message.id}')">发送</button>
                        <button class="btn btn-text btn-sm" onclick="window._app.hideReplyInput('${message.id}')">取消</button>
                    </div>
                </div>
            </div>
        `;
    }

    _renderReply(reply) {
        const avatarColor = AVATAR_COLORS[
            Math.abs(reply.nickname.charCodeAt(0)) % AVATAR_COLORS.length
        ];

        return `
            <div class="reply-item">
                <div class="reply-avatar" style="background: ${avatarColor};">
                    ${reply.nickname.charAt(0)}
                </div>
                <div class="reply-content-wrapper">
                    <div class="reply-header">
                        <span class="reply-nickname">${this._escapeHtml(reply.nickname)}</span>
                        <span class="reply-time">${formatDateTime(reply.createdAt)}</span>
                    </div>
                    <div class="reply-text">${this._escapeHtml(reply.content)}</div>
                </div>
            </div>
        `;
    }

    _formatContent(content, mentionedMembers) {
        let html = this._escapeHtml(content);
        mentionedMembers.forEach(member => {
            const regex = new RegExp(`@${member.name}`, 'g');
            html = html.replace(regex, `<span class="mention-highlight">@${member.name}</span>`);
        });
        return html.replace(/\n/g, '<br>');
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showAddModal() {
        const members = this.memberService.getAll();
        const memberOptions = members.map(m =>
            `<label class="mention-checkbox">
                <input type="checkbox" value="${m.id}">
                <span>${m.name}</span>
            </label>`
        ).join('');

        const bodyHtml = `
            <form id="messageForm" onsubmit="event.preventDefault(); window._app.saveMessage();">
                <div class="form-group">
                    <label class="form-label">你的昵称 *</label>
                    <input type="text" class="form-input" id="messageNickname" placeholder="请输入你的昵称" required>
                </div>
                <div class="form-group">
                    <label class="form-label">留言内容 *</label>
                    <textarea class="form-input" id="messageContent" rows="5" placeholder="写下你想说的话..." required></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">艾特室友</label>
                    <div class="mention-checkboxes">
                        ${memberOptions || '<p style="color: var(--text-muted); font-size: 14px;">暂无成员</p>'}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>
                    <button type="submit" class="btn btn-primary">发布</button>
                </div>
            </form>
        `;

        this.modal.open('发布留言', bodyHtml);
    }

    saveMessage() {
        const nickname = document.getElementById('messageNickname').value.trim();
        const content = document.getElementById('messageContent').value.trim();

        if (!nickname) {
            this.toast.show('请输入你的昵称', 'error');
            return;
        }
        if (!content) {
            this.toast.show('请输入留言内容', 'error');
            return;
        }

        const mentionCheckboxes = document.querySelectorAll('.mention-checkbox input:checked');
        const mentionedMemberIds = Array.from(mentionCheckboxes).map(cb => cb.value);

        this.messageService.add({ nickname, content, mentionedMemberIds });
        this.modal.close();
        this.toast.show('留言发布成功', 'success');
    }

    deleteMessage(messageId) {
        if (!confirm('确定要删除这条留言吗？')) return;
        this.messageService.delete(messageId);
        this.toast.show('留言已删除', 'success');
    }

    togglePin(messageId) {
        this.messageService.togglePin(messageId);
        const message = this.messageService.getById(messageId);
        this.toast.show(message.isPinned ? '已置顶' : '已取消置顶', 'success');
    }

    showReplyInput(messageId) {
        const section = document.getElementById(`replySection_${messageId}`);
        if (section) {
            section.style.display = 'block';
        }
    }

    hideReplyInput(messageId) {
        const section = document.getElementById(`replySection_${messageId}`);
        if (section) {
            section.style.display = 'none';
        }
    }

    submitReply(messageId) {
        const nicknameInput = document.getElementById(`replyNickname_${messageId}`);
        const contentInput = document.getElementById(`replyContent_${messageId}`);

        const nickname = nicknameInput.value.trim();
        const content = contentInput.value.trim();

        if (!nickname) {
            this.toast.show('请输入你的昵称', 'error');
            return;
        }
        if (!content) {
            this.toast.show('请输入回复内容', 'error');
            return;
        }

        this.messageService.addReply(messageId, { nickname, content });
        this.toast.show('回复成功', 'success');
    }
}
