import { generateId } from '../utils/helpers.js';
import { AVATAR_COLORS } from '../utils/constants.js';

export class MemberService {
    constructor(store) {
        this.store = store;
    }

    getAll() {
        return this.store.get('members');
    }

    getById(id) {
        return this.store.get('members').find(m => m.id === id);
    }

    add(name, avatar, color) {
        const member = {
            id: generateId(),
            name,
            avatar: avatar || name.charAt(0),
            color: color || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
            joinDate: Date.now()
        };
        this.store.update('members', members => [...members, member]);
        return member;
    }

    update(id, data) {
        this.store.update('members', members =>
            members.map(m => m.id === id ? { ...m, ...data } : m)
        );
    }

    delete(id) {
        this.store.batch(() => {
            this.store.update('members', members => members.filter(m => m.id !== id));
            this.store.update('records', records => records.filter(r => r.memberId !== id));
            this.store.update('schedules', schedules => schedules.filter(s => s.memberId !== id));
            this.store.update('bills', bills => bills.filter(b => b.payerId !== id));
            this.store.update('settlements', settlements =>
                (settlements || []).filter(s => s.fromId !== id && s.toId !== id)
            );
        });
    }

    getMemberStats(memberId) {
        const records = this.store.get('records').filter(r => r.memberId === memberId);
        const taskTypes = this.store.get('taskTypes') || [];
        const stats = { total: records.length };
        taskTypes.forEach(tt => {
            stats[tt.id] = records.filter(r => r.type === tt.id).length;
        });
        return stats;
    }

    generateSampleMembers() {
        const members = [
            { id: generateId(), name: '小明', avatar: '明', color: AVATAR_COLORS[0], joinDate: Date.now() - 86400000 * 30 },
            { id: generateId(), name: '小红', avatar: '红', color: AVATAR_COLORS[1], joinDate: Date.now() - 86400000 * 30 },
            { id: generateId(), name: '小刚', avatar: '刚', color: AVATAR_COLORS[2], joinDate: Date.now() - 86400000 * 20 }
        ];
        return members;
    }
}
