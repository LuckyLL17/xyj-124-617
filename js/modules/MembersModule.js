import { formatDate } from '../utils/helpers.js';
import { EmptyState } from '../components/EmptyState.js';
import { Avatar } from '../components/Avatar.js';
import { FormField } from '../components/FormField.js';

export class MembersModule {
    constructor(store, memberService, taskTypeService, modal, toast) {
        this.store = store;
        this.memberService = memberService;
        this.taskTypeService = taskTypeService;
        this.modal = modal;
        this.toast = toast;
    }

    render() {
        const container = document.getElementById('membersList');
        const members = this.memberService.getAll();
        const enabledTaskTypes = this.taskTypeService.getEnabled();

        if (members.length === 0) {
            container.innerHTML = EmptyState.render('暂无成员，点击上方按钮添加');
            return;
        }

        container.innerHTML = members.map(member => {
            const stats = this.memberService.getMemberStats(member.id);
            const joinDate = formatDate(member.joinDate);

            const typeStats = enabledTaskTypes.map(type => `
                <div class="member-stat">
                    <div class="member-stat-value">${stats[type.id] || 0}</div>
                    <div class="member-stat-label">${type.name}</div>
                </div>
            `).join('');

            return `
                <div class="member-card">
                    <div class="member-header">
                        ${Avatar.render(member, 'md')}
                        <div class="member-info">
                            <h3>${member.name}</h3>
                            <p>入住：${joinDate}</p>
                        </div>
                    </div>
                    <div class="member-stats" style="grid-template-columns: repeat(${Math.min(enabledTaskTypes.length, 4)}, 1fr);">
                        ${typeStats}
                    </div>
                    <div class="member-actions">
                        <button class="btn btn-secondary btn-sm" onclick="window._app.editMember('${member.id}')">编辑</button>
                        <button class="btn btn-danger btn-sm" onclick="window._app.deleteMember('${member.id}')">删除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    showAddModal() {
        this.modal.open('添加成员', FormField.memberForm(null));
    }

    showEditModal(memberId) {
        const member = this.memberService.getById(memberId);
        if (!member) return;
        this.modal.open('编辑成员', FormField.memberForm(member));
    }

    saveMember(event, memberId) {
        event.preventDefault();
        const name = document.getElementById('memberName').value.trim();
        let avatar = document.getElementById('memberAvatar').value.trim();
        const colorInput = document.querySelector('input[name="memberColor"]:checked');
        const color = colorInput ? colorInput.value : null;

        if (!name) {
            this.toast.show('请输入姓名');
            return;
        }

        if (!avatar) {
            avatar = name.charAt(0);
        }

        if (memberId) {
            this.memberService.update(memberId, { name, avatar, color: color || undefined });
            this.toast.show('成员已更新');
        } else {
            this.memberService.add(name, avatar, color);
            this.toast.show('成员已添加');
        }

        this.modal.close();
    }

    deleteMember(memberId) {
        if (!confirm('确定要删除该成员吗？相关的记录和排班也会被移除。')) return;
        this.memberService.delete(memberId);
        this.toast.show('成员已删除');
    }
}
