import { getMonthStart, getDaysDiff, formatDate, formatDateTime } from '../utils/helpers.js';
import { StatCard } from '../components/StatCard.js';
import { EmptyState } from '../components/EmptyState.js';
import { Avatar } from '../components/Avatar.js';

export class DashboardModule {
    constructor(store, memberService, recordService, scheduleService, billService, taskTypeService) {
        this.store = store;
        this.memberService = memberService;
        this.recordService = recordService;
        this.scheduleService = scheduleService;
        this.billService = billService;
        this.taskTypeService = taskTypeService;
    }

    render() {
        this.renderStats();
        this.renderPendingTasks();
        this.renderRecentActivity();
        this.renderRanking();
    }

    _getTaskTypes() {
        return this.taskTypeService.getEnabledAsObject();
    }

    _lightenColor(hex) {
        const alpha = 0.15;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    renderStats() {
        const monthStart = getMonthStart();
        const monthRecords = this.recordService.getByMonth(monthStart);
        const members = this.memberService.getAll();
        const monthExpense = this.billService.getMonthTotal(monthStart);
        const taskTypes = this._getTaskTypes();

        const grid = document.querySelector('#dashboardStatsGrid');
        const statCards = Object.entries(taskTypes).map(([typeId, type]) => {
            const count = monthRecords.filter(r => r.type === typeId).length;
            const iconStyle = type.color ? `background: ${this._lightenColor(type.color)};` : '';
            return StatCard.render(`task-${typeId}`, type.emoji, type.name, count, '本月完成次数', iconStyle);
        });

        statCards.push(
            StatCard.render('member-icon', '👥', '合租成员', members.length, '当前人数', 'background: #ede9fe;'),
            StatCard.render('bill-icon', '💰', '本月支出', `¥${monthExpense.toFixed(0)}`, '本月账单总额', 'background: #fef3c7;')
        );

        grid.innerHTML = statCards.join('');
    }

    _rgba(hex, alpha = 0.15) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    renderPendingTasks() {
        const container = document.getElementById('pendingTasks');
        const pending = this.scheduleService.getPending();
        const taskTypes = this.taskTypeService.getAllAsObject();

        if (pending.length === 0) {
            container.innerHTML = EmptyState.render('暂无待处理事项 🎉');
            return;
        }

        const enabledPending = pending.filter(task => taskTypes[task.type] && taskTypes[task.type].enabled !== false);

        if (enabledPending.length === 0) {
            container.innerHTML = EmptyState.render('暂无待处理事项 🎉');
            return;
        }

        container.innerHTML = enabledPending.slice(0, 5).map(task => {
            const member = this.memberService.getById(task.memberId);
            const type = taskTypes[task.type];
            if (!type) return '';
            const isOverdue = task.daysDiff < 0;
            const timeText = isOverdue
                ? `已逾期 ${Math.abs(task.daysDiff)} 天`
                : task.daysDiff === 0
                    ? '今天'
                    : `还剩 ${task.daysDiff} 天`;

            return `
                <div class="task-item ${!isOverdue && task.daysDiff <= 1 ? 'warning' : ''}"
                     style="border-left: 4px solid ${type.color};">
                    <div class="task-info">
                        <span class="task-emoji" style="background: ${this._rgba(type.color)};">${type.emoji}</span>
                        <div class="task-details">
                            <h4>${type.name} - ${member ? member.name : '未知成员'}</h4>
                            <p>${formatDate(task.date)} · ${timeText}</p>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-success btn-sm" onclick="window._app.markScheduleDone('${task.id}')">已完成</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        const sorted = [...this.recordService.getAll()].sort((a, b) => b.date - a.date).slice(0, 8);
        const taskTypes = this.taskTypeService.getAllAsObject();

        if (sorted.length === 0) {
            container.innerHTML = EmptyState.render('暂无记录');
            return;
        }

        container.innerHTML = sorted.map(record => {
            const member = this.memberService.getById(record.memberId);
            const type = taskTypes[record.type];
            if (!type) return '';
            return `
                <div class="activity-item" style="border-left: 4px solid ${type.color};">
                    <span class="activity-emoji" style="background: ${this._rgba(type.color)};">${type.emoji}</span>
                    <div class="activity-content">
                        <p><strong>${member ? member.name : '未知成员'}</strong> 完成了 ${type.name}</p>
                        <span class="activity-time">${formatDateTime(record.date)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRanking() {
        const container = document.getElementById('ranking');
        const monthStart = getMonthStart();
        const members = this.memberService.getAll();

        const stats = members.map(member => {
            const monthRecords = this.recordService.getByMonth(monthStart)
                .filter(r => r.memberId === member.id);
            return { member, count: monthRecords.length };
        }).sort((a, b) => b.count - a.count);

        if (stats.length === 0) {
            container.innerHTML = EmptyState.render('暂无数据');
            return;
        }

        container.innerHTML = stats.map((stat, index) => `
            <div class="ranking-item">
                <span class="ranking-number">${index + 1}</span>
                <span class="ranking-name">${stat.member.name}</span>
                <span class="ranking-score">${stat.count} 次</span>
            </div>
        `).join('');
    }
}
