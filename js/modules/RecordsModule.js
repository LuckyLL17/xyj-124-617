import { formatDateTime } from '../utils/helpers.js';
import { EmptyState } from '../components/EmptyState.js';
import { FormField } from '../components/FormField.js';

export class RecordsModule {
    constructor(store, memberService, recordService, taskTypeService, modal, toast) {
        this.store = store;
        this.memberService = memberService;
        this.recordService = recordService;
        this.taskTypeService = taskTypeService;
        this.modal = modal;
        this.toast = toast;
    }

    render() {
        this.renderRecords();
        this.updateTypeFilter();
        this.updateMemberFilter();
    }

    _getTaskTypes() {
        return this.taskTypeService.getAllAsObject();
    }

    _rgba(hex, alpha = 0.15) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    renderRecords() {
        const container = document.getElementById('recordsList');
        const filterType = document.getElementById('filterType').value;
        const filterMember = document.getElementById('filterMember').value;
        const filtered = this.recordService.getFiltered(filterType, filterMember);
        const taskTypes = this._getTaskTypes();

        if (filtered.length === 0) {
            container.innerHTML = EmptyState.render('暂无记录');
            return;
        }

        container.innerHTML = filtered.map(record => {
            const member = this.memberService.getById(record.memberId);
            const type = taskTypes[record.type];
            if (!type) return '';
            return `
                <div class="record-item" style="border-left: 4px solid ${type.color};">
                    <div class="record-info">
                        <span class="record-emoji" style="background: ${this._rgba(type.color)};">${type.emoji}</span>
                        <div class="record-details">
                            <h4>${type.name}</h4>
                            <p>${member ? member.name : '未知成员'} · ${formatDateTime(record.date)}</p>
                        </div>
                    </div>
                    <button class="record-delete" onclick="window._app.deleteRecord('${record.id}')" title="删除">🗑️</button>
                </div>
            `;
        }).join('');
    }

    updateTypeFilter() {
        const select = document.getElementById('filterType');
        const currentValue = select.value;
        const taskTypes = this._getTaskTypes();
        const enabledTypes = Object.entries(taskTypes).filter(([, v]) => v.enabled !== false);
        
        select.innerHTML = '<option value="all">全部类型</option>' +
            enabledTypes.map(([key, val]) => `<option value="${key}">${val.emoji} ${val.name}</option>`).join('');
        select.value = currentValue || 'all';
    }

    updateMemberFilter() {
        const select = document.getElementById('filterMember');
        const currentValue = select.value;
        const members = this.memberService.getAll();
        select.innerHTML = '<option value="all">全部成员</option>' +
            members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        select.value = currentValue;
    }

    showAddModal(type) {
        const members = this.memberService.getAll();
        if (members.length === 0) {
            this.toast.show('请先添加成员');
            return;
        }
        const taskTypes = this._getTaskTypes();
        const title = type ? '快速记录' : '添加记录';
        this.modal.open(title, FormField.recordForm(members, type, taskTypes));
    }

    saveRecord(event) {
        event.preventDefault();
        const type = document.getElementById('recordType').value;
        const memberId = document.getElementById('recordMember').value;
        const dateStr = document.getElementById('recordDate').value;
        const note = document.getElementById('recordNote').value.trim();
        const date = new Date(dateStr).getTime();

        this.recordService.add(memberId, type, date, note);
        this.modal.close();
        this.toast.show('记录已添加');
    }

    deleteRecord(recordId) {
        if (!confirm('确定要删除这条记录吗？')) return;
        this.recordService.delete(recordId);
        this.toast.show('记录已删除');
    }
}
