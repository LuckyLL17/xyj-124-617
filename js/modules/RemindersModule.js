import { formatDate } from '../utils/helpers.js';
import { EmptyState } from '../components/EmptyState.js';

export class RemindersModule {
    constructor(store, memberService, reminderService, taskTypeService) {
        this.store = store;
        this.memberService = memberService;
        this.reminderService = reminderService;
        this.taskTypeService = taskTypeService;
    }

    _rgba(hex, alpha = 0.15) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    render() {
        const container = document.getElementById('remindersList');
        const reminders = this.reminderService.getAll(this.taskTypeService);
        const taskTypes = this.taskTypeService.getAllAsObject();

        const enabledReminders = reminders.filter(r => taskTypes[r.type] && taskTypes[r.type].enabled !== false);

        if (enabledReminders.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 8px;">一切正常！</h3>
                    <p style="color: var(--text-muted);">当前没有逾期或即将到期的任务</p>
                </div>
            `;
            return;
        }

        container.innerHTML = enabledReminders.map(reminder => {
            const type = taskTypes[reminder.type];
            const isWarning = reminder.daysDiff === 0 || reminder.daysDiff === 1;

            if (reminder.auto) {
                return this._renderAutoReminder(reminder, type);
            }

            return this._renderScheduleReminder(reminder, type, isWarning);
        }).join('');
    }

    _renderAutoReminder(reminder, type) {
        const lastMember = reminder.lastMemberId
            ? this.memberService.getById(reminder.lastMemberId)
            : null;
        const timeText = reminder.neverDone
            ? '还没有人完成过这项任务'
            : `上次完成是 ${reminder.daysSinceLast} 天前${lastMember ? '（' + lastMember.name + '）' : ''}`;

        return `
            <div class="reminder-item" style="border-left: 4px solid ${type.color};">
                <span class="reminder-icon" style="background: ${this._rgba(type.color)};">${type.emoji}</span>
                <div class="reminder-content">
                    <h3>${type.name} 需要处理了！</h3>
                    <p>${timeText}</p>
                    <p class="reminder-time">建议尽快安排人员处理</p>
                </div>
                <div class="reminder-actions">
                    <button class="btn btn-primary btn-sm" onclick="window._app.quickAddRecord('${reminder.type}')">记录完成</button>
                </div>
            </div>
        `;
    }

    _renderScheduleReminder(reminder, type, isWarning) {
        const member = this.memberService.getById(reminder.memberId);
        const timeText = reminder.daysDiff < 0
            ? `已逾期 ${Math.abs(reminder.daysDiff)} 天`
            : reminder.daysDiff === 0
                ? '今天需要完成'
                : '明天需要完成';

        return `
            <div class="reminder-item ${isWarning ? 'warning' : ''}" style="border-left: 4px solid ${type.color};">
                <span class="reminder-icon" style="background: ${this._rgba(type.color)};">${type.emoji}</span>
                <div class="reminder-content">
                    <h3>${type.name} - ${member ? member.name : '未知成员'}</h3>
                    <p>排定日期：${formatDate(reminder.date)}</p>
                    <p class="reminder-time">${timeText}</p>
                </div>
                <div class="reminder-actions">
                    <button class="btn btn-success btn-sm" onclick="window._app.markScheduleDone('${reminder.id}')">已完成</button>
                </div>
            </div>
        `;
    }
}
