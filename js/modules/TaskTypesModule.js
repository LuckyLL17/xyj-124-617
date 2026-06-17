import { FormField } from '../components/FormField.js';
import { EmptyState } from '../components/EmptyState.js';

export class TaskTypesModule {
    constructor(store, taskTypeService, modal, toast) {
        this.store = store;
        this.taskTypeService = taskTypeService;
        this.modal = modal;
        this.toast = toast;
        this._draggedId = null;
    }

    render() {
        this.renderConfigPanel();
    }

    renderConfigPanel() {
        const container = document.getElementById('taskTypesConfig');
        if (!container) return;

        const taskTypes = this.taskTypeService.getAll();

        if (taskTypes.length === 0) {
            container.innerHTML = EmptyState.render('暂无任务类型，点击上方按钮添加');
            return;
        }

        container.innerHTML = `
            <div class="task-types-list" id="taskTypesList">
                ${taskTypes.map((type, index) => this._renderTypeCard(type, index, taskTypes.length)).join('')}
            </div>
            <p class="form-hint" style="margin-top: 16px; text-align: center;">
                💡 提示：拖拽卡片或使用 ↑↓ 按钮可调整排序顺序
            </p>
        `;

        this._bindDragEvents();
    }

    _renderTypeCard(type, index, total) {
        const isFirst = index === 0;
        const isLast = index === total - 1;
        const disabledStyle = type.enabled ? '' : 'opacity: 0.5; background: #f8fafc;';

        return `
            <div class="task-type-card" 
                 data-id="${type.id}" 
                 draggable="true"
                 style="${disabledStyle} border-left: 4px solid ${type.color};">
                <div class="task-type-drag-handle" title="拖拽排序">⋮⋮</div>
                <div class="task-type-main">
                    <div class="task-type-header">
                        <span class="task-type-emoji" style="background: ${this._lightenColor(type.color)};">${type.emoji}</span>
                        <div class="task-type-info">
                            <h4>${type.name}</h4>
                            <p>默认周期：${type.defaultInterval} 天</p>
                        </div>
                        <span class="task-type-badge ${type.enabled ? 'badge-enabled' : 'badge-disabled'}">
                            ${type.enabled ? '已启用' : '已停用'}
                        </span>
                    </div>
                </div>
                <div class="task-type-actions">
                    <button class="btn-icon" title="上移" 
                            onclick="window._app.moveTaskTypeUp('${type.id}')" 
                            ${isFirst ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>
                        ↑
                    </button>
                    <button class="btn-icon" title="下移" 
                            onclick="window._app.moveTaskTypeDown('${type.id}')" 
                            ${isLast ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>
                        ↓
                    </button>
                    <button class="btn-icon" title="${type.enabled ? '停用' : '启用'}" 
                            onclick="window._app.toggleTaskType('${type.id}')"
                            style="color: ${type.enabled ? 'var(--warning)' : 'var(--success)'};">
                        ${type.enabled ? '⏸' : '▶'}
                    </button>
                    <button class="btn-icon" title="编辑" 
                            onclick="window._app.editTaskType('${type.id}')"
                            style="color: var(--primary);">
                        ✏️
                    </button>
                    <button class="btn-icon" title="删除" 
                            onclick="window._app.deleteTaskType('${type.id}')"
                            style="color: var(--danger);">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    _lightenColor(hex) {
        const alpha = 0.15;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    _bindDragEvents() {
        const list = document.getElementById('taskTypesList');
        if (!list) return;

        const cards = list.querySelectorAll('.task-type-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this._draggedId = card.dataset.id;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', card.dataset.id);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                document.querySelectorAll('.task-type-card').forEach(c => {
                    c.classList.remove('drag-over-top', 'drag-over-bottom');
                });
                this._draggedId = null;
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = card.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                card.classList.remove('drag-over-top', 'drag-over-bottom');
                if (e.clientY < midY) {
                    card.classList.add('drag-over-top');
                } else {
                    card.classList.add('drag-over-bottom');
                }
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const draggedId = e.dataTransfer.getData('text/plain') || this._draggedId;
                if (!draggedId || draggedId === card.dataset.id) return;

                const liveCards = document.querySelectorAll('.task-type-card');
                const allIds = Array.from(liveCards).map(c => c.dataset.id);
                const targetId = card.dataset.id;
                const rect = card.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const insertBefore = e.clientY < midY;

                const draggedIdx = allIds.indexOf(draggedId);
                const targetIdx = allIds.indexOf(targetId);
                allIds.splice(draggedIdx, 1);
                let insertIdx = allIds.indexOf(targetId);
                if (!insertBefore) insertIdx += 1;
                allIds.splice(insertIdx, 0, draggedId);

                this.taskTypeService.reorder(allIds);
                this.toast.show('排序已更新');
            });
        });
    }

    showAddModal() {
        this.modal.open('添加任务类型', FormField.taskTypeForm(null));
    }

    showEditModal(typeId) {
        const taskType = this.taskTypeService.getById(typeId);
        if (!taskType) return;
        this.modal.open('编辑任务类型', FormField.taskTypeForm(taskType));
    }

    save(event, typeId) {
        event.preventDefault();
        const name = document.getElementById('taskTypeName').value.trim();
        const emoji = document.getElementById('taskTypeEmoji').value.trim();
        const colorInput = document.querySelector('input[name="taskTypeColor"]:checked');
        const color = colorInput ? colorInput.value : '#6366f1';
        const defaultInterval = parseInt(document.getElementById('taskTypeInterval').value) || 3;

        if (!name) {
            this.toast.show('请输入任务名称');
            return;
        }

        if (typeId) {
            this.taskTypeService.update(typeId, { name, emoji, color, defaultInterval });
            this.toast.show('任务类型已更新');
        } else {
            this.taskTypeService.add(name, emoji, color, defaultInterval);
            this.toast.show('任务类型已添加');
        }
        this.modal.close();
    }

    delete(typeId) {
        try {
            const type = this.taskTypeService.getById(typeId);
            if (!confirm(`确定要删除「${type.name}」吗？${type.enabled ? '注意：停用任务类型更安全。' : ''}`)) return;
            this.taskTypeService.delete(typeId);
            this.toast.show('任务类型已删除');
        } catch (e) {
            this.toast.show(e.message);
        }
    }

    toggleEnabled(typeId) {
        this.taskTypeService.toggleEnabled(typeId);
        const type = this.taskTypeService.getById(typeId);
        this.toast.show(type.enabled ? '任务类型已启用' : '任务类型已停用');
    }

    moveUp(typeId) {
        this.taskTypeService.moveUp(typeId);
    }

    moveDown(typeId) {
        this.taskTypeService.moveDown(typeId);
    }
}
