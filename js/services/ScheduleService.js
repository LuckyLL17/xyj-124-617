import { generateId, startOfDay, addDays, addWeeks, addMonths, isSameDay, getWeekday, getDayOfMonth, generateDateRange } from '../utils/helpers.js';

export class ScheduleService {
    constructor(store) {
        this.store = store;
    }

    _ensureRulesInit() {
        if (!this.store.get('scheduleRules')) {
            this.store.set('scheduleRules', []);
        }
    }

    getAll() {
        return this.store.get('schedules');
    }

    getByType(type) {
        return this.store.get('schedules')
            .filter(s => s.type === type)
            .sort((a, b) => a.date - b.date);
    }

    getPending() {
        const now = Date.now();
        return this.store.get('schedules')
            .filter(s => !s.completed)
            .map(s => ({ ...s, daysDiff: Math.ceil((s.date - now) / (1000 * 60 * 60 * 24)) }))
            .filter(s => s.daysDiff <= 2)
            .sort((a, b) => a.daysDiff - b.daysDiff);
    }

    getById(id) {
        return this.store.get('schedules').find(s => s.id === id);
    }

    add(memberId, type, date, extra = {}) {
        const schedule = {
            id: generateId(),
            memberId,
            type,
            date: startOfDay(date),
            completed: false,
            completedDate: null,
            originalMemberId: null,
            substituteType: null,
            linkedScheduleId: null,
            substituteNote: null,
            ruleId: null,
            ...extra
        };
        this.store.update('schedules', schedules => [...schedules, schedule]);
        return schedule;
    }

    update(id, data) {
        this.store.update('schedules', schedules =>
            schedules.map(s => s.id === id ? { ...s, ...data } : s)
        );
    }

    markDone(id, recordService, taskTypeService) {
        const schedule = this.getById(id);
        if (!schedule) return;

        this.store.batch(() => {
            this.update(id, { completed: true, completedDate: Date.now() });
            const actualMemberId = schedule.memberId;
            recordService.add(actualMemberId, schedule.type, Date.now(), schedule.substituteType ? `（${schedule.substituteType === 'swap' ? '换值' : '代值'}完成）` : '（轮值完成）');
            this.autoAdvance(schedule.type, schedule.originalMemberId || schedule.memberId, taskTypeService);
        });
    }

    delete(id) {
        this.store.update('schedules', schedules => schedules.filter(s => s.id !== id));
    }

    moveToDate(id, newDate) {
        const schedule = this.getById(id);
        if (!schedule) throw new Error('排班不存在');
        this.update(id, { date: startOfDay(newDate) });
    }

    autoAdvance(type, lastMemberId, taskTypeService) {
        const schedules = this.store.get('schedules');
        const members = this.store.get('members');
        const taskTypes = taskTypeService.getAllAsObject();
        const taskType = taskTypes[type];
        if (!taskType) return;

        const typeMemberIds = schedules
            .filter(s => s.type === type)
            .map(s => s.memberId);

        const allMemberIds = members.map(m => m.id);
        const pool = typeMemberIds.length >= 2 ? typeMemberIds : allMemberIds;
        if (pool.length === 0) return;

        const currentIndex = pool.indexOf(lastMemberId);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % pool.length;
        const nextMemberId = pool[nextIndex];

        const interval = taskType.defaultInterval || 3;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + interval);
        nextDate.setHours(0, 0, 0, 0);

        const existingPending = schedules.find(
            s => s.type === type && s.memberId === nextMemberId && !s.completed
        );

        if (!existingPending) {
            this.add(nextMemberId, type, nextDate.getTime());
        }
    }

    generateDefaultSchedules(members, taskTypeService) {
        const schedules = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const taskTypes = taskTypeService ? taskTypeService.getEnabled() : [];

        taskTypes.forEach(type => {
            members.forEach((member, index) => {
                const date = new Date(now);
                const interval = type.defaultInterval || 3;
                date.setDate(date.getDate() + index * interval);
                schedules.push({
                    id: generateId(),
                    memberId: member.id,
                    type: type.id,
                    date: date.getTime(),
                    completed: false,
                    completedDate: null,
                    originalMemberId: null,
                    substituteType: null,
                    linkedScheduleId: null,
                    substituteNote: null,
                    ruleId: null
                });
            });
        });

        return schedules;
    }

    // ===== 排班规则管理 =====
    getAllRules() {
        this._ensureRulesInit();
        return this.store.get('scheduleRules');
    }

    getRulesByType(taskTypeId) {
        return this.getAllRules().filter(r => r.taskTypeId === taskTypeId);
    }

    getRuleById(id) {
        return this.getAllRules().find(r => r.id === id);
    }

    addRule(ruleData) {
        this._ensureRulesInit();
        const rule = {
            id: generateId(),
            type: ruleData.type,
            taskTypeId: ruleData.taskTypeId,
            memberOrder: ruleData.memberOrder || [],
            intervalDays: ruleData.intervalDays || 3,
            weekdays: ruleData.weekdays || [],
            monthDays: ruleData.monthDays || [],
            startDate: startOfDay(ruleData.startDate || Date.now()),
            enabled: ruleData.enabled !== false,
            createdAt: Date.now()
        };
        this.store.update('scheduleRules', rules => [...rules, rule]);
        return rule;
    }

    updateRule(id, data) {
        this._ensureRulesInit();
        this.store.update('scheduleRules', rules =>
            rules.map(r => r.id === id ? { ...r, ...data } : r)
        );
    }

    deleteRule(id) {
        this._ensureRulesInit();
        this.store.update('scheduleRules', rules => rules.filter(r => r.id !== id));
        this.store.update('schedules', schedules =>
            schedules.map(s => s.ruleId === id ? { ...s, ruleId: null } : s)
        );
    }

    toggleRuleEnabled(id) {
        const rule = this.getRuleById(id);
        if (rule) {
            this.updateRule(id, { enabled: !rule.enabled });
        }
    }

    // ===== 根据规则判断日期是否匹配 =====
    _doesDateMatchRule(dateTs, rule) {
        switch (rule.type) {
            case 'interval': {
                const daysDiff = Math.round((dateTs - rule.startDate) / (1000 * 60 * 60 * 24));
                return daysDiff >= 0 && daysDiff % rule.intervalDays === 0;
            }
            case 'weekly': {
                const wd = getWeekday(dateTs);
                return dateTs >= rule.startDate && rule.weekdays.includes(wd);
            }
            case 'monthly': {
                const dom = getDayOfMonth(dateTs);
                return dateTs >= rule.startDate && rule.monthDays.includes(dom);
            }
            default:
                return false;
        }
    }

    // ===== 批量生成未来 N 天排班 =====
    generateSchedulesForDays(days, options = {}) {
        const { taskTypeIds = null, ruleIds = null, clearExisting = false, startFrom = Date.now() } = options;
        const startTs = startOfDay(startFrom);
        const dateRange = generateDateRange(startTs, days);
        const rules = this.getAllRules().filter(r => {
            if (!r.enabled) return false;
            if (taskTypeIds && !taskTypeIds.includes(r.taskTypeId)) return false;
            if (ruleIds && !ruleIds.includes(r.id)) return false;
            return true;
        });
        const members = this.store.get('members');
        const existingSchedules = this.getAll();

        if (clearExisting) {
            const endTs = addDays(startTs, days);
            this.store.update('schedules', schedules =>
                schedules.filter(s => s.date < startTs || s.date >= endTs || s.completed)
            );
        }

        const generated = [];
        const currentSchedules = this.getAll();

        rules.forEach(rule => {
            if (rule.memberOrder.length === 0) return;
            const memberPool = rule.memberOrder.filter(mid => members.some(m => m.id === mid));
            if (memberPool.length === 0) return;

            let matchCount = 0;
            dateRange.forEach(dateTs => {
                if (!this._doesDateMatchRule(dateTs, rule)) return;

                const alreadyExists = currentSchedules.some(s =>
                    s.type === rule.taskTypeId && isSameDay(s.date, dateTs)
                );
                if (alreadyExists) return;

                const memberIndex = matchCount % memberPool.length;
                const memberId = memberPool[memberIndex];
                const schedule = this.add(memberId, rule.taskTypeId, dateTs, { ruleId: rule.id });
                generated.push(schedule);
                matchCount++;
            });
        });

        return generated;
    }

    // ===== 按单条规则生成 N 天排班 =====
    generateByRule(ruleId, days, options = {}) {
        const rule = this.getRuleById(ruleId);
        if (!rule) return [];
        return this.generateSchedulesForDays(days, {
            ruleIds: [ruleId],
            clearExisting: options.clearExisting || false,
            startFrom: options.startFrom || rule.startDate
        });
    }

    // ===== 换值：两个排班互换成员 =====
    swapSchedules(scheduleId1, scheduleId2, note = '') {
        const s1 = this.getById(scheduleId1);
        const s2 = this.getById(scheduleId2);
        if (!s1 || !s2) throw new Error('排班不存在');
        if (s1.type !== s2.type) throw new Error('只能在同一任务类型之间换值');

        const originalMember1 = s1.originalMemberId || s1.memberId;
        const originalMember2 = s2.originalMemberId || s2.memberId;

        this.store.batch(() => {
            this.update(scheduleId1, {
                memberId: originalMember2,
                originalMemberId: originalMember1,
                substituteType: 'swap',
                linkedScheduleId: scheduleId2,
                substituteNote: note || null
            });
            this.update(scheduleId2, {
                memberId: originalMember1,
                originalMemberId: originalMember2,
                substituteType: 'swap',
                linkedScheduleId: scheduleId1,
                substituteNote: note || null
            });
        });
        return true;
    }

    // ===== 代值：指定其他人代班 =====
    substituteSchedule(scheduleId, substituteMemberId, note = '') {
        const schedule = this.getById(scheduleId);
        if (!schedule) throw new Error('排班不存在');
        if (schedule.memberId === substituteMemberId) throw new Error('不能自己代自己');

        const originalMemberId = schedule.originalMemberId || schedule.memberId;
        this.update(scheduleId, {
            memberId: substituteMemberId,
            originalMemberId,
            substituteType: 'substitute',
            substituteNote: note || null
        });
        return true;
    }

    // ===== 取消换值/代值，恢复原值班人 =====
    revertSubstitute(scheduleId) {
        const schedule = this.getById(scheduleId);
        if (!schedule || !schedule.originalMemberId) return false;

        if (schedule.substituteType === 'swap' && schedule.linkedScheduleId) {
            const linked = this.getById(schedule.linkedScheduleId);
            this.store.batch(() => {
                this.update(scheduleId, {
                    memberId: schedule.originalMemberId,
                    originalMemberId: null,
                    substituteType: null,
                    linkedScheduleId: null,
                    substituteNote: null
                });
                if (linked) {
                    this.update(schedule.linkedScheduleId, {
                        memberId: linked.originalMemberId || linked.memberId,
                        originalMemberId: null,
                        substituteType: null,
                        linkedScheduleId: null,
                        substituteNote: null
                    });
                }
            });
        } else {
            this.update(scheduleId, {
                memberId: schedule.originalMemberId,
                originalMemberId: null,
                substituteType: null,
                linkedScheduleId: null,
                substituteNote: null
            });
        }
        return true;
    }

    // ===== 获取可用于换值的候选排班列表 =====
    getSwapCandidates(scheduleId) {
        const schedule = this.getById(scheduleId);
        if (!schedule) return [];
        const now = startOfDay(Date.now());
        return this.getAll()
            .filter(s =>
                s.id !== scheduleId
                && s.type === schedule.type
                && !s.completed
                && s.date >= now
            )
            .sort((a, b) => a.date - b.date);
    }
}
