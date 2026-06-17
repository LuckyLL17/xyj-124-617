import { generateId } from '../utils/helpers.js';
import { DEFAULT_TASK_TYPES, TASK_COLORS } from '../utils/constants.js';

export class TaskTypeService {
    constructor(store) {
        this.store = store;
    }

    _ensureInit() {
        if (!this.store.get('taskTypes')) {
            this.store.set('taskTypes', this._getDefaultTypes());
        }
    }

    _getDefaultTypes() {
        return Object.entries(DEFAULT_TASK_TYPES).map(([key, val], index) => ({
            id: key,
            name: val.name,
            emoji: val.emoji,
            color: TASK_COLORS[index % TASK_COLORS.length],
            defaultInterval: val.defaultInterval,
            enabled: true,
            order: index
        }));
    }

    getAll() {
        this._ensureInit();
        return [...this.store.get('taskTypes')].sort((a, b) => a.order - b.order);
    }

    getEnabled() {
        return this.getAll().filter(t => t.enabled);
    }

    getById(id) {
        return this.getAll().find(t => t.id === id);
    }

    getAllAsObject() {
        const obj = {};
        this.getAll().forEach(t => {
            obj[t.id] = {
                name: t.name,
                emoji: t.emoji,
                color: t.color,
                defaultInterval: t.defaultInterval,
                enabled: t.enabled
            };
        });
        return obj;
    }

    getEnabledAsObject() {
        const obj = {};
        this.getEnabled().forEach(t => {
            obj[t.id] = {
                name: t.name,
                emoji: t.emoji,
                color: t.color,
                defaultInterval: t.defaultInterval
            };
        });
        return obj;
    }

    add(name, emoji, color, defaultInterval) {
        this._ensureInit();
        const all = this.getAll();
        const newType = {
            id: generateId(),
            name: name.trim(),
            emoji: (emoji || '').trim() || '📋',
            color: color || TASK_COLORS[all.length % TASK_COLORS.length],
            defaultInterval: parseInt(defaultInterval) || 3,
            enabled: true,
            order: all.length
        };
        this.store.update('taskTypes', types => [...(types || this._getDefaultTypes()), newType]);
        return newType;
    }

    update(id, data) {
        this._ensureInit();
        this.store.update('taskTypes', types =>
            (types || this._getDefaultTypes()).map(t =>
                t.id === id ? { ...t, ...data } : t
            )
        );
    }

    delete(id) {
        this._ensureInit();
        const hasRecords = this.store.get('records').some(r => r.type === id);
        const hasSchedules = this.store.get('schedules').some(s => s.type === id);
        if (hasRecords || hasSchedules) {
            throw new Error('该任务类型已有相关记录或排班，无法删除。建议停用而非删除。');
        }
        this.store.update('taskTypes', types =>
            (types || this._getDefaultTypes()).filter(t => t.id !== id)
        );
    }

    toggleEnabled(id) {
        const type = this.getById(id);
        if (type) {
            this.update(id, { enabled: !type.enabled });
        }
    }

    reorder(newOrder) {
        this._ensureInit();
        const types = this.store.get('taskTypes') || this._getDefaultTypes();
        const reordered = newOrder.map((id, index) => {
            const t = types.find(x => x.id === id);
            return t ? { ...t, order: index } : null;
        }).filter(Boolean);
        const remaining = types.filter(t => !newOrder.includes(t.id));
        let nextOrder = reordered.length;
        remaining.forEach(t => {
            reordered.push({ ...t, order: nextOrder++ });
        });
        this.store.set('taskTypes', reordered);
    }

    moveUp(id) {
        const all = this.getAll();
        const index = all.findIndex(t => t.id === id);
        if (index <= 0) return;
        const newOrder = all.map(t => t.id);
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        this.reorder(newOrder);
    }

    moveDown(id) {
        const all = this.getAll();
        const index = all.findIndex(t => t.id === id);
        if (index < 0 || index >= all.length - 1) return;
        const newOrder = all.map(t => t.id);
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        this.reorder(newOrder);
    }
}
