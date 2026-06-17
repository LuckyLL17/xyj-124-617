import { formatDateTime, formatDate, getDaysDiff } from '../utils/helpers.js';
import { VOTE_TYPES, VOTE_OPTION_COLORS, AVATAR_COLORS } from '../utils/constants.js';

export class VotesModule {
    constructor(store, memberService, voteService, modal, toast) {
        this.store = store;
        this.memberService = memberService;
        this.voteService = voteService;
        this.modal = modal;
        this.toast = toast;
        this._currentTab = 'active';
    }

    render() {
        const container = document.getElementById('votesContent');
        if (!container) return;

        const activeVotes = this.voteService.getActive();
        const archivedVotes = this.voteService.getArchived();
        const totalVoters = activeVotes.reduce((sum, v) => sum + this.voteService.getTotalVotes(v.id), 0);

        const displayVotes = this._currentTab === 'active' ? activeVotes : archivedVotes;
        const emptyText = this._currentTab === 'active'
            ? '暂无进行中的投票，点击右上角发起第一个投票吧'
            : '暂无已归档的投票';

        container.innerHTML = `
            <div class="vote-stats-grid">
                <div class="vote-stat-card">
                    <div class="vote-stat-icon active-icon">✅</div>
                    <div class="vote-stat-info">
                        <h3>进行中</h3>
                        <p class="vote-stat-value">${activeVotes.length}</p>
                        <p class="vote-stat-label">当前投票</p>
                    </div>
                </div>
                <div class="vote-stat-card">
                    <div class="vote-stat-icon archive-icon">📁</div>
                    <div class="vote-stat-info">
                        <h3>已归档</h3>
                        <p class="vote-stat-value">${archivedVotes.length}</p>
                        <p class="vote-stat-label">历史投票</p>
                    </div>
                </div>
                <div class="vote-stat-card">
                    <div class="vote-stat-icon voter-icon">👥</div>
                    <div class="vote-stat-info">
                        <h3>参与人次</h3>
                        <p class="vote-stat-value">${totalVoters}</p>
                        <p class="vote-stat-label">进行中投票</p>
                    </div>
                </div>
            </div>

            <div class="vote-tab-bar">
                <button class="vote-tab-btn ${this._currentTab === 'active' ? 'active' : ''}"
                        onclick="window._app.switchVoteTab('active')">
                    🟢 进行中 (${activeVotes.length})
                </button>
                <button class="vote-tab-btn ${this._currentTab === 'archived' ? 'active' : ''}"
                        onclick="window._app.switchVoteTab('archived')">
                    📁 已归档 (${archivedVotes.length})
                </button>
            </div>

            ${displayVotes.length === 0 ? `
                <div class="vote-empty">
                    <div class="vote-empty-icon">🗳️</div>
                    <h3>${emptyText}</h3>
                </div>
            ` : `
                <div class="votes-list">
                    ${displayVotes.map(vote => this._renderVoteCard(vote)).join('')}
                </div>
            `}
        `;
    }

    _renderVoteCard(vote) {
        const typeInfo = VOTE_TYPES[vote.type] || VOTE_TYPES.other;
        const stats = this.voteService.getStatistics(vote.id);
        const totalVoters = stats.totalVoters;
        const isEnded = this.voteService.isVoteEnded(vote);
        const daysLeft = vote.endAt ? getDaysDiff(vote.endAt) : null;

        const topOption = stats.options.reduce((a, b) => a.votes >= b.votes ? a : b);

        return `
            <div class="vote-card ${vote.isArchived ? 'archived' : ''}"
                 onclick="window._app.openVoteDetail('${vote.id}')">
                <div class="vote-card-header">
                    <div class="vote-type-badge" style="background: ${typeInfo.color}15; color: ${typeInfo.color};">
                        ${typeInfo.emoji} ${typeInfo.name}
                    </div>
                    ${vote.isArchived ? '<span class="vote-status-badge archived-badge">已归档</span>' :
                      isEnded ? '<span class="vote-status-badge ended-badge">已结束</span>' :
                      daysLeft !== null && daysLeft >= 0 ?
                        `<span class="vote-status-badge counting-badge">剩余 ${daysLeft} 天</span>` :
                      '<span class="vote-status-badge counting-badge">进行中</span>'}
                </div>
                <h3 class="vote-card-title">${this._escapeHtml(vote.title)}</h3>
                ${vote.description ? `<p class="vote-card-desc">${this._escapeHtml(vote.description)}</p>` : ''}

                <div class="vote-card-progress">
                    ${stats.options.slice(0, 2).map((opt, idx) => this._renderMiniBar(opt, idx, totalVoters)).join('')}
                    ${stats.options.length > 2 ? `<p class="vote-more-options">+${stats.options.length - 2} 更多选项</p>` : ''}
                </div>

                <div class="vote-card-footer">
                    <div class="vote-footer-left">
                        <span class="vote-creator">👤 ${this._escapeHtml(vote.creatorNickname)}</span>
                        <span class="vote-date">${formatDate(vote.createdAt)}</span>
                    </div>
                    <div class="vote-footer-right">
                        <span class="vote-participants">👥 ${totalVoters} 人参与</span>
                        ${topOption.votes > 0 ? `
                            <span class="vote-leading">
                                领先: ${this._escapeHtml(topOption.label.slice(0, 8))}${topOption.label.length > 8 ? '...' : ''}
                                (${topOption.percentage.toFixed(0)}%)
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    _renderMiniBar(option, index, totalVoters) {
        const color = VOTE_OPTION_COLORS[index % VOTE_OPTION_COLORS.length];
        const pct = totalVoters > 0 ? (option.votes / totalVoters) * 100 : 0;
        return `
            <div class="vote-mini-bar-row">
                <span class="vote-mini-label">${this._escapeHtml(option.label)}</span>
                <div class="vote-mini-bar">
                    <div class="vote-mini-fill" style="width: ${pct}%; background: ${color};"></div>
                </div>
                <span class="vote-mini-pct">${pct.toFixed(0)}%</span>
            </div>
        `;
    }

    _renderVoteDetail(vote) {
        const typeInfo = VOTE_TYPES[vote.type] || VOTE_TYPES.other;
        const stats = this.voteService.getStatistics(vote.id);
        const totalVoters = stats.totalVoters;
        const isEnded = this.voteService.isVoteEnded(vote);

        const lastVoterNickname = this._getLastVoterNickname(vote);
        const hasVoted = lastVoterNickname
            ? this.voteService.hasUserVoted(vote.id, lastVoterNickname)
            : false;
        const userVotedOptions = lastVoterNickname
            ? this.voteService.getUserVotedOptions(vote.id, lastVoterNickname)
            : [];

        const canVote = !vote.isArchived && !isEnded;

        return `
            <div class="vote-detail">
                <div class="vote-detail-header">
                    <div class="vote-type-badge large" style="background: ${typeInfo.color}15; color: ${typeInfo.color};">
                        ${typeInfo.emoji} ${typeInfo.name}
                    </div>
                    ${vote.allowMultiple ? `<span class="vote-type-tag">多选（最多${vote.maxChoices}项）</span>` : '<span class="vote-type-tag">单选</span>'}
                    ${vote.isArchived ? '<span class="vote-status-badge archived-badge">已归档</span>' :
                      isEnded ? '<span class="vote-status-badge ended-badge">已结束</span>' :
                      '<span class="vote-status-badge active-badge">进行中</span>'}
                </div>

                <h2 class="vote-detail-title">${this._escapeHtml(vote.title)}</h2>
                ${vote.description ? `<p class="vote-detail-desc">${this._escapeHtml(vote.description).replace(/\n/g, '<br>')}</p>` : ''}

                <div class="vote-meta-row">
                    <div class="vote-meta-item">
                        <span class="vote-meta-label">发起人</span>
                        <span class="vote-meta-value">${this._escapeHtml(vote.creatorNickname)}</span>
                    </div>
                    <div class="vote-meta-item">
                        <span class="vote-meta-label">创建时间</span>
                        <span class="vote-meta-value">${formatDateTime(vote.createdAt)}</span>
                    </div>
                    ${vote.endAt ? `
                        <div class="vote-meta-item">
                            <span class="vote-meta-label">截止时间</span>
                            <span class="vote-meta-value">${formatDateTime(vote.endAt)}</span>
                        </div>
                    ` : ''}
                    <div class="vote-meta-item">
                        <span class="vote-meta-label">参与人数</span>
                        <span class="vote-meta-value highlight">${totalVoters} 人</span>
                    </div>
                </div>

                <div class="vote-options-section">
                    <h3 class="vote-section-title">📊 实时投票结果</h3>
                    <div class="vote-options-list" id="voteOptionsContainer">
                        ${stats.options.map((opt, idx) => this._renderOptionBar(opt, idx, totalVoters, canVote && !hasVoted, vote.allowMultiple, userVotedOptions)).join('')}
                    </div>

                    ${canVote && !hasVoted ? `
                        <div class="vote-action-area">
                            <div class="form-group">
                                <label class="form-label">你的昵称 *</label>
                                <input type="text" class="form-input" id="voteVoterNickname"
                                       placeholder="请输入你的昵称用于记录投票" value="${this._escapeHtml(lastVoterNickname || '')}">
                            </div>
                            <button class="btn btn-primary btn-block" onclick="window._app.submitVote('${vote.id}')">
                                确认投票
                            </button>
                        </div>
                    ` : hasVoted ? `
                        <div class="vote-voted-notice">
                            ✅ 你已参与投票（身份：${this._escapeHtml(lastVoterNickname)}）
                            <span class="vote-voted-options">你选了: ${userVotedOptions.map(oid => {
                                const opt = vote.options.find(o => o.id === oid);
                                return opt ? this._escapeHtml(opt.label) : '';
                            }).join('、')}</span>
                        </div>
                    ` : vote.isArchived ? `
                        <div class="vote-archived-notice">📁 该投票已归档，无法继续投票</div>
                    ` : `
                        <div class="vote-ended-notice">⏰ 该投票已结束，无法继续投票</div>
                    `}
                </div>

                ${totalVoters > 0 ? `
                    <div class="vote-voters-section">
                        <h3 class="vote-section-title">👥 投票详情 (${totalVoters}人)</h3>
                        <div class="vote-voters-list">
                            ${stats.options.map(opt => this._renderVoterList(opt)).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="vote-detail-footer">
                    ${!vote.isArchived ? `
                        <button class="btn btn-secondary" onclick="window._app.archiveVote('${vote.id}')">
                            📁 归档此投票
                        </button>
                    ` : `
                        <button class="btn btn-secondary" onclick="window._app.unarchiveVote('${vote.id}')">
                            ↩️ 取消归档
                        </button>
                    `}
                    <span class="vote-readonly-tip">
                        ${vote.isArchived ? '已归档' : '投票创建后不可修改或删除'}
                    </span>
                </div>
            </div>
        `;
    }

    _renderOptionBar(option, index, totalVoters, canSelect, isMultiple, votedOptionIds) {
        const color = VOTE_OPTION_COLORS[index % VOTE_OPTION_COLORS.length];
        const pct = totalVoters > 0 ? (option.votes / totalVoters) * 100 : 0;
        const isSelected = votedOptionIds.includes(option.id);
        const inputType = isMultiple ? 'checkbox' : 'radio';

        return `
            <div class="vote-option-item ${isSelected ? 'voted' : ''}">
                ${canSelect ? `
                    <label class="vote-option-select">
                        <input type="${inputType}"
                               name="voteOption"
                               value="${option.id}"
                               class="vote-option-input"
                               ${isMultiple ? `onchange="window._app.validateVoteChoices()"` : ''}>
                    </label>
                ` : ''}
                <div class="vote-option-main">
                    <div class="vote-option-top">
                        <span class="vote-option-label" style="color: ${color};">
                            ${this._escapeHtml(option.label)}
                        </span>
                        <div class="vote-option-stats">
                            <span class="vote-option-count">${option.votes} 票</span>
                            <span class="vote-option-pct">${pct.toFixed(1)}%</span>
                        </div>
                    </div>
                    <div class="vote-option-bar">
                        <div class="vote-option-fill"
                             style="width: ${pct}%; background: linear-gradient(90deg, ${color}, ${color}dd);"></div>
                    </div>
                    ${isSelected ? '<span class="vote-option-badge">✓ 你选的</span>' : ''}
                </div>
            </div>
        `;
    }

    _renderVoterList(option) {
        if (option.voterNicknames.length === 0) return '';
        return `
            <div class="vote-voter-group">
                <div class="vote-voter-group-title">
                    ${this._escapeHtml(option.label)}
                    <span class="vote-voter-group-count">(${option.votes}人)</span>
                </div>
                <div class="vote-voter-avatars">
                    ${option.voterNicknames.map(name => {
                        const avatarColor = AVATAR_COLORS[Math.abs(name.charCodeAt(0)) % AVATAR_COLORS.length];
                        return `
                            <div class="vote-voter-avatar" style="background: ${avatarColor};" title="${this._escapeHtml(name)}">
                                ${name.charAt(0)}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    _getLastVoterNickname() {
        try {
            return localStorage.getItem('vote_last_nickname') || '';
        } catch (e) {
            return '';
        }
    }

    _setLastVoterNickname(name) {
        try {
            localStorage.setItem('vote_last_nickname', name);
        } catch (e) {}
    }

    showAddModal() {
        const typeOptions = Object.entries(VOTE_TYPES).map(([key, val]) =>
            `<option value="${key}">${val.emoji} ${val.name}</option>`
        ).join('');

        const bodyHtml = `
            <form id="voteCreateForm" onsubmit="event.preventDefault(); window._app.createVote();">
                <div class="form-group">
                    <label class="form-label">投票主题 *</label>
                    <input type="text" class="form-input" id="voteTitle"
                           placeholder="例如：是否购买共享洗衣机？" maxlength="100" required>
                </div>
                <div class="form-group">
                    <label class="form-label">投票类型 *</label>
                    <select class="form-input" id="voteType" required>
                        ${typeOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">详细说明</label>
                    <textarea class="form-input" id="voteDescription" rows="3"
                              placeholder="补充说明投票的背景、细节等（可选）" maxlength="500"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">投票选项 *（至少2个）</label>
                    <div id="voteOptionsInputs">
                        <div class="vote-option-input-row">
                            <input type="text" class="form-input" placeholder="选项 1" value="同意" required>
                            <button type="button" class="btn-icon vote-option-remove" style="visibility:hidden;">×</button>
                        </div>
                        <div class="vote-option-input-row">
                            <input type="text" class="form-input" placeholder="选项 2" value="不同意" required>
                            <button type="button" class="btn-icon vote-option-remove" style="visibility:hidden;">×</button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-text btn-sm" onclick="window._app.addVoteOptionInput()" style="margin-top: 8px;">
                        + 添加选项
                    </button>
                </div>
                <div class="vote-rules-group">
                    <div class="form-group form-inline">
                        <label class="form-label">多选投票</label>
                        <label class="form-switch">
                            <input type="checkbox" id="voteAllowMultiple" onchange="window._app.toggleMaxChoices()">
                            <span class="form-switch-slider"></span>
                        </label>
                    </div>
                    <div class="form-group" id="maxChoicesGroup" style="display:none;">
                        <label class="form-label">最多可选数量</label>
                        <input type="number" class="form-input form-input-sm" id="voteMaxChoices" min="2" value="2">
                    </div>
                    <div class="form-group">
                        <label class="form-label">截止时间（可选）</label>
                        <input type="datetime-local" class="form-input" id="voteEndAt">
                    </div>
                    <div class="form-group">
                        <label class="form-label">发起人昵称 *</label>
                        <input type="text" class="form-input" id="voteCreatorNickname"
                               placeholder="请输入你的昵称" required>
                    </div>
                </div>
                <div class="vote-tip-box">
                    ⚠️ 投票创建后将不可修改或删除，确认信息无误后再提交。可在投票结束后归档。
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>
                    <button type="submit" class="btn btn-primary">发起投票</button>
                </div>
            </form>
        `;

        this.modal.open('发起公共投票', bodyHtml);
    }

    addVoteOptionInput() {
        const container = document.getElementById('voteOptionsInputs');
        if (!container) return;
        const count = container.querySelectorAll('.vote-option-input-row').length;
        if (count >= 10) {
            this.toast.show('最多支持10个选项', 'error');
            return;
        }
        const row = document.createElement('div');
        row.className = 'vote-option-input-row';
        row.innerHTML = `
            <input type="text" class="form-input" placeholder="选项 ${count + 1}" required>
            <button type="button" class="btn-icon vote-option-remove" onclick="this.parentElement.remove();">×</button>
        `;
        container.appendChild(row);
    }

    toggleMaxChoices() {
        const cb = document.getElementById('voteAllowMultiple');
        const group = document.getElementById('maxChoicesGroup');
        if (cb && group) {
            group.style.display = cb.checked ? 'block' : 'none';
        }
    }

    validateVoteChoices() {
        const vote = this._currentDetailVote;
        if (!vote || !vote.allowMultiple) return;
        const inputs = document.querySelectorAll('.vote-option-input:checked');
        if (inputs.length > vote.maxChoices) {
            inputs[inputs.length - 1].checked = false;
            this.toast.show(`最多只能选 ${vote.maxChoices} 项`, 'warning');
        }
    }

    createVote() {
        const title = document.getElementById('voteTitle').value.trim();
        const type = document.getElementById('voteType').value;
        const description = document.getElementById('voteDescription').value.trim();
        const allowMultiple = document.getElementById('voteAllowMultiple').checked;
        const maxChoicesInput = document.getElementById('voteMaxChoices');
        const maxChoices = allowMultiple ? Math.max(2, parseInt(maxChoicesInput?.value || 2, 10)) : 1;
        const endAtInput = document.getElementById('voteEndAt').value;
        const endAt = endAtInput ? new Date(endAtInput).getTime() : null;
        const creatorNickname = document.getElementById('voteCreatorNickname').value.trim();

        const optionInputs = document.querySelectorAll('#voteOptionsInputs .vote-option-input-row input');
        const options = Array.from(optionInputs)
            .map(i => i.value.trim())
            .filter(v => v.length > 0);

        if (!title) {
            this.toast.show('请输入投票主题', 'error');
            return;
        }
        if (options.length < 2) {
            this.toast.show('请至少填写2个投票选项', 'error');
            return;
        }
        if (!creatorNickname) {
            this.toast.show('请输入发起人昵称', 'error');
            return;
        }
        if (endAt && endAt <= Date.now()) {
            this.toast.show('截止时间必须晚于当前时间', 'error');
            return;
        }
        if (allowMultiple && maxChoices > options.length) {
            this.toast.show(`最大可选数不能超过选项数量(${options.length})`, 'error');
            return;
        }

        this.voteService.add({
            title,
            description,
            type,
            options,
            creatorNickname,
            endAt,
            allowMultiple,
            maxChoices
        });

        this.modal.close();
        this.toast.show('投票发起成功', 'success');
    }

    openVoteDetail(voteId) {
        const vote = this.voteService.getById(voteId);
        if (!vote) {
            this.toast.show('投票不存在', 'error');
            return;
        }
        this._currentDetailVote = vote;
        this._currentDetailVoteId = voteId;
        const bodyHtml = this._renderVoteDetail(vote);
        this.modal.open('投票详情', bodyHtml);

        if (this._refreshTimer) clearInterval(this._refreshTimer);
        this._refreshTimer = setInterval(() => {
            if (!this.modal.isOpen()) {
                clearInterval(this._refreshTimer);
                return;
            }
            const freshVote = this.voteService.getById(voteId);
            if (freshVote) {
                this._currentDetailVote = freshVote;
                this.modal.bodyEl.innerHTML = this._renderVoteDetail(freshVote);
            }
        }, 3000);
    }

    submitVote(voteId) {
        const vote = this.voteService.getById(voteId);
        if (!vote) return;

        const nicknameInput = document.getElementById('voteVoterNickname');
        const nickname = nicknameInput ? nicknameInput.value.trim() : '';
        if (!nickname) {
            this.toast.show('请输入你的昵称', 'error');
            return;
        }

        const checkedInputs = document.querySelectorAll('.vote-option-input:checked');
        const optionIds = Array.from(checkedInputs).map(i => i.value);

        if (optionIds.length === 0) {
            this.toast.show('请选择至少一个选项', 'error');
            return;
        }
        if (!vote.allowMultiple && optionIds.length > 1) {
            this.toast.show('此投票只能选择一项', 'error');
            return;
        }
        if (vote.allowMultiple && optionIds.length > vote.maxChoices) {
            this.toast.show(`最多只能选择 ${vote.maxChoices} 项`, 'error');
            return;
        }
        if (this.voteService.hasUserVoted(voteId, nickname)) {
            this.toast.show('该昵称已经参与过投票了', 'error');
            return;
        }

        this.voteService.castVote(voteId, optionIds, nickname);
        this._setLastVoterNickname(nickname);
        this.toast.show('投票成功', 'success');

        const freshVote = this.voteService.getById(voteId);
        if (freshVote) {
            this._currentDetailVote = freshVote;
            this.modal.bodyEl.innerHTML = this._renderVoteDetail(freshVote);
        }
    }

    archiveVote(voteId) {
        if (!confirm('确定要归档此投票吗？归档后可以取消归档恢复。')) return;
        this.voteService.archive(voteId);
        this.modal.close();
        this.toast.show('投票已归档', 'success');
    }

    unarchiveVote(voteId) {
        this.voteService.unarchive(voteId);
        this.modal.close();
        this.toast.show('已取消归档', 'success');
    }

    switchTab(tab) {
        this._currentTab = tab;
        this.render();
    }

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
