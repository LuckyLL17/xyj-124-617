import { getDaysDiff, formatDate } from '../utils/helpers.js';

export class ReminderService {
    constructor(store) {
        this.store = store;
    }

    getAll(taskTypeService) {
        const now = Date.now();
        const reminders = [];

        this.store.get('schedules').forEach(schedule => {
            if (!schedule.completed) {
                const daysDiff = getDaysDiff(schedule.date);
                if (daysDiff <= 1) {
                    reminders.push({ ...schedule, daysDiff, auto: false });
                }
            }
        });

        const enabledTypes = taskTypeService.getEnabled();
        enabledTypes.forEach(type => {
            const lastRecord = this.store.get('records')
                .filter(r => r.type === type.id)
                .sort((a, b) => b.date - a.date)[0];

            if (lastRecord) {
                const daysSinceLast = Math.floor((now - lastRecord.date) / (1000 * 60 * 60 * 24));
                const interval = type.defaultInterval || 3;
                if (daysSinceLast >= interval) {
                    reminders.push({
                        id: 'auto_' + type.id,
                        type: type.id,
                        auto: true,
                        daysSinceLast,
                        lastMemberId: lastRecord.memberId,
                        lastDate: lastRecord.date
                    });
                }
            } else {
                reminders.push({
                    id: 'auto_' + type.id,
                    type: type.id,
                    auto: true,
                    neverDone: true
                });
            }
        });

        return reminders;
    }

    getOverdueCount() {
        const now = Date.now();
        return this.store.get('schedules').filter(s => {
            if (s.completed) return false;
            return s.date < now;
        }).length;
    }
}
