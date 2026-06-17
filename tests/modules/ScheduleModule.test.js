import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScheduleModule } from '../../js/modules/ScheduleModule.js';
import { createTestStore, createTestMember, createTestTaskType } from '../helpers/testUtils.js';
import { MemberService } from '../../js/services/MemberService.js';
import { ScheduleService } from '../../js/services/ScheduleService.js';
import { RecordService } from '../../js/services/RecordService.js';
import { TaskTypeService } from '../../js/services/TaskTypeService.js';
import { startOfDay, addDays } from '../../js/utils/helpers.js';

describe('ScheduleModule', () => {
  let store;
  let memberService;
  let scheduleService;
  let recordService;
  let taskTypeService;
  let modalMock;
  let toastMock;
  let scheduleModule;

  beforeEach(() => {
    store = createTestStore();
    memberService = new MemberService(store);
    scheduleService = new ScheduleService(store);
    recordService = new RecordService(store);
    taskTypeService = new TaskTypeService(store);
    modalMock = { open: vi.fn(), close: vi.fn() };
    toastMock = { show: vi.fn() };

    scheduleModule = new ScheduleModule(
      store,
      memberService,
      scheduleService,
      recordService,
      taskTypeService,
      modalMock,
      toastMock
    );
  });

  describe('constructor', () => {
    it('should initialize with default viewMode as list', () => {
      expect(scheduleModule.viewMode).toBe('list');
    });

    it('should initialize with default calendarMode as month', () => {
      expect(scheduleModule.calendarMode).toBe('month');
    });

    it('should initialize with empty filter arrays', () => {
      expect(scheduleModule.filterTypeIds).toEqual([]);
      expect(scheduleModule.filterMemberIds).toEqual([]);
    });

    it('should initialize with filterStatus as all', () => {
      expect(scheduleModule.filterStatus).toBe('all');
    });

    it('should set calendarDate to today', () => {
      const today = startOfDay(Date.now());
      expect(scheduleModule.calendarDate).toBe(today);
    });
  });

  describe('_lightenColor', () => {
    it('should convert red hex to rgba with alpha 0.2', () => {
      const result = scheduleModule._lightenColor('#ff0000');
      expect(result).toBe('rgba(255, 0, 0, 0.2)');
    });

    it('should convert green hex to rgba with alpha 0.2', () => {
      const result = scheduleModule._lightenColor('#00ff00');
      expect(result).toBe('rgba(0, 255, 0, 0.2)');
    });

    it('should convert blue hex to rgba with alpha 0.2', () => {
      const result = scheduleModule._lightenColor('#0000ff');
      expect(result).toBe('rgba(0, 0, 255, 0.2)');
    });

    it('should handle white color', () => {
      const result = scheduleModule._lightenColor('#ffffff');
      expect(result).toBe('rgba(255, 255, 255, 0.2)');
    });

    it('should handle black color', () => {
      const result = scheduleModule._lightenColor('#000000');
      expect(result).toBe('rgba(0, 0, 0, 0.2)');
    });
  });

  describe('_darkenColor', () => {
    it('should darken red color by default 30%', () => {
      const result = scheduleModule._darkenColor('#ff0000');
      expect(result).toMatch(/^#/);
      expect(result.length).toBe(7);
    });

    it('should darken color by custom percentage', () => {
      const result1 = scheduleModule._darkenColor('#ffffff', 50);
      const result2 = scheduleModule._darkenColor('#ffffff', 10);
      expect(result1).not.toBe(result2);
    });

    it('should not go below 0 for any channel', () => {
      const result = scheduleModule._darkenColor('#000000', 100);
      expect(result).toBe('#000000');
    });

    it('should return a valid hex color format', () => {
      const result = scheduleModule._darkenColor('#6366f1');
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('toggleFilterType', () => {
    it('should add typeId to filter when not present', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.toggleFilterType('type1');
      expect(scheduleModule.filterTypeIds).toContain('type1');
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should remove typeId from filter when present', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.filterTypeIds = ['type1', 'type2'];
      scheduleModule.toggleFilterType('type1');
      expect(scheduleModule.filterTypeIds).not.toContain('type1');
      expect(scheduleModule.filterTypeIds).toContain('type2');
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should toggle same typeId on and off', () => {
      vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.toggleFilterType('type1');
      expect(scheduleModule.filterTypeIds.length).toBe(1);
      scheduleModule.toggleFilterType('type1');
      expect(scheduleModule.filterTypeIds.length).toBe(0);
    });
  });

  describe('toggleFilterMember', () => {
    it('should add memberId to filter when not present', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.toggleFilterMember('member1');
      expect(scheduleModule.filterMemberIds).toContain('member1');
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should remove memberId from filter when present', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.filterMemberIds = ['member1', 'member2'];
      scheduleModule.toggleFilterMember('member1');
      expect(scheduleModule.filterMemberIds).not.toContain('member1');
      expect(scheduleModule.filterMemberIds).toContain('member2');
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('setFilterStatus', () => {
    it('should set filter status to completed', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.setFilterStatus('completed');
      expect(scheduleModule.filterStatus).toBe('completed');
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should set filter status to pending', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.setFilterStatus('pending');
      expect(scheduleModule.filterStatus).toBe('pending');
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should set filter status to overdue', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.setFilterStatus('overdue');
      expect(scheduleModule.filterStatus).toBe('overdue');
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('clearFilters', () => {
    it('should clear all type filters', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.filterTypeIds = ['type1', 'type2'];
      scheduleModule.filterMemberIds = ['member1'];
      scheduleModule.filterStatus = 'completed';
      scheduleModule.clearFilters();
      expect(scheduleModule.filterTypeIds).toEqual([]);
      expect(scheduleModule.filterMemberIds).toEqual([]);
      expect(scheduleModule.filterStatus).toBe('all');
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('_getFilteredSchedules', () => {
    let member1, member2;
    let type1, type2;
    let today;

    beforeEach(() => {
      member1 = memberService.add('小明');
      member2 = memberService.add('小红');
      const enabledTypes = taskTypeService.getEnabled();
      type1 = enabledTypes[0];
      type2 = enabledTypes[1] || enabledTypes[0];
      today = startOfDay(Date.now());

      scheduleService.add(member1.id, type1.id, today);
      scheduleService.add(member2.id, type2.id, addDays(today, 2));
    });

    it('should return all schedules when no filters', () => {
      const result = scheduleModule._getFilteredSchedules();
      expect(result.length).toBe(2);
    });

    it('should filter by typeId', () => {
      scheduleModule.filterTypeIds = [type1.id];
      const result = scheduleModule._getFilteredSchedules();
      expect(result.every(s => s.type === type1.id)).toBe(true);
    });

    it('should filter by memberId', () => {
      scheduleModule.filterMemberIds = [member1.id];
      const result = scheduleModule._getFilteredSchedules();
      expect(result.every(s => s.memberId === member1.id)).toBe(true);
    });

    it('should filter completed schedules', () => {
      const schedules = scheduleService.getAll();
      scheduleService.markDone(schedules[0].id, recordService, taskTypeService);

      scheduleModule.filterStatus = 'completed';
      const result = scheduleModule._getFilteredSchedules();
      expect(result.every(s => s.completed)).toBe(true);
    });

    it('should filter pending schedules', () => {
      scheduleModule.filterStatus = 'pending';
      const result = scheduleModule._getFilteredSchedules();
      expect(result.every(s => !s.completed && s.date >= today)).toBe(true);
    });

    it('should filter overdue schedules', () => {
      const pastDate = addDays(today, -5);
      scheduleService.add(member1.id, type1.id, pastDate);

      scheduleModule.filterStatus = 'overdue';
      const result = scheduleModule._getFilteredSchedules();
      expect(result.every(s => !s.completed && s.date < today)).toBe(true);
    });

    it('should return schedules sorted by date ascending', () => {
      const result = scheduleModule._getFilteredSchedules();
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date).toBeGreaterThanOrEqual(result[i - 1].date);
      }
    });

    it('should combine type and member filters', () => {
      scheduleModule.filterTypeIds = [type1.id];
      scheduleModule.filterMemberIds = [member1.id];
      const result = scheduleModule._getFilteredSchedules();
      expect(result.every(s => s.type === type1.id && s.memberId === member1.id)).toBe(true);
    });
  });

  describe('switchView', () => {
    it('should switch to calendar view', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.switchView('calendar');
      expect(scheduleModule.viewMode).toBe('calendar');
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should switch to rules view', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.switchView('rules');
      expect(scheduleModule.viewMode).toBe('rules');
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should switch to list view', () => {
      scheduleModule.viewMode = 'calendar';
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.switchView('list');
      expect(scheduleModule.viewMode).toBe('list');
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('switchCalendarMode', () => {
    it('should switch to week mode', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.switchCalendarMode('week');
      expect(scheduleModule.calendarMode).toBe('week');
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should switch to month mode', () => {
      scheduleModule.calendarMode = 'week';
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.switchCalendarMode('month');
      expect(scheduleModule.calendarMode).toBe('month');
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('goToToday', () => {
    it('should set calendarDate to today', () => {
      const renderSpy = vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
      scheduleModule.calendarDate = addDays(Date.now(), 10);
      scheduleModule.goToToday();
      const today = startOfDay(Date.now());
      expect(scheduleModule.calendarDate).toBe(today);
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('_navigateCalendar', () => {
    beforeEach(() => {
      vi.spyOn(scheduleModule, 'render').mockImplementation(() => {});
    });

    it('should navigate forward one month in month mode', () => {
      const originalDate = scheduleModule.calendarDate;
      scheduleModule._navigateCalendar(1);
      const expected = new Date(originalDate);
      expected.setMonth(expected.getMonth() + 1);
      expect(new Date(scheduleModule.calendarDate).getMonth()).toBe(expected.getMonth());
    });

    it('should navigate backward one month in month mode', () => {
      const originalDate = scheduleModule.calendarDate;
      scheduleModule._navigateCalendar(-1);
      const expected = new Date(originalDate);
      expected.setMonth(expected.getMonth() - 1);
      expect(new Date(scheduleModule.calendarDate).getMonth()).toBe(expected.getMonth());
    });

    it('should navigate forward one week in week mode', () => {
      scheduleModule.calendarMode = 'week';
      const originalDate = scheduleModule.calendarDate;
      scheduleModule._navigateCalendar(1);
      const diff = (scheduleModule.calendarDate - originalDate) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(7);
    });

    it('should navigate backward one week in week mode', () => {
      scheduleModule.calendarMode = 'week';
      const originalDate = scheduleModule.calendarDate;
      scheduleModule._navigateCalendar(-1);
      const diff = (scheduleModule.calendarDate - originalDate) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(-7);
    });

    it('should handle week navigation in week mode with isWeekNav true', () => {
      scheduleModule.calendarMode = 'week';
      const originalDate = scheduleModule.calendarDate;
      scheduleModule._navigateCalendar(7, true);
      const diff = (scheduleModule.calendarDate - originalDate) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(7);
    });
  });

  describe('render', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="scheduleGrid"></div>
        <div id="scheduleRulesContainer"></div>
        <div id="scheduleActionBar"></div>
        <div id="scheduleFilterBar"></div>
      `;
    });

    it('should return early if scheduleActionBar not found', () => {
      document.body.innerHTML = '';
      scheduleModule.render();
      expect(document.body.innerHTML).toBe('');
    });

    it('should render action bar with view toggle buttons', () => {
      scheduleModule.render();
      const actionsBar = document.getElementById('scheduleActionBar');
      expect(actionsBar.innerHTML).toContain('schedule-action-bar');
      expect(actionsBar.innerHTML).toContain('view-btn');
    });

    it('should render list view by default', () => {
      scheduleModule.render();
      const grid = document.getElementById('scheduleGrid');
      expect(grid.style.display).toBe('grid');
      expect(grid.innerHTML).toContain('schedule-column');
    });

    it('should render calendar view when viewMode is calendar', () => {
      scheduleModule.viewMode = 'calendar';
      scheduleModule.render();
      const grid = document.getElementById('scheduleGrid');
      expect(grid.style.display).toBe('block');
      expect(grid.innerHTML).toContain('calendar-container');
    });

    it('should render rules view when viewMode is rules', () => {
      scheduleModule.viewMode = 'rules';
      scheduleModule.render();
      const grid = document.getElementById('scheduleGrid');
      const rulesContainer = document.getElementById('scheduleRulesContainer');
      expect(grid.style.display).toBe('none');
      expect(rulesContainer.style.display).toBe('block');
    });

    it('should show empty state when no enabled task types', () => {
      const allTypes = taskTypeService.getAll();
      allTypes.forEach(t => taskTypeService.toggleEnabled(t.id));
      scheduleModule.render();
      const grid = document.getElementById('scheduleGrid');
      expect(grid.innerHTML).toContain('empty-state');
    });

    it('should show filter bar in calendar view', () => {
      scheduleModule.viewMode = 'calendar';
      memberService.add('测试成员');
      scheduleModule.render();
      const filterBar = document.getElementById('scheduleFilterBar');
      expect(filterBar.style.display).toBe('flex');
      expect(filterBar.innerHTML).toContain('schedule-filter-bar');
    });
  });

  describe('renderScheduleColumn', () => {
    let member;
    let type;

    beforeEach(() => {
      member = memberService.add('小明');
      type = taskTypeService.getEnabled()[0];
      document.body.innerHTML = `<div id="schedule-${type.id}"></div>`;
    });

    it('should render empty state when no schedules', () => {
      scheduleModule.renderScheduleColumn(type.id);
      const container = document.getElementById(`schedule-${type.id}`);
      expect(container.innerHTML).toContain('empty-state');
    });

    it('should render schedule items when there are schedules', () => {
      scheduleService.add(member.id, type.id, Date.now());
      scheduleModule.renderScheduleColumn(type.id);
      const container = document.getElementById(`schedule-${type.id}`);
      expect(container.innerHTML).toContain('schedule-item');
    });

    it('should return early if container not found', () => {
      document.body.innerHTML = '';
      expect(() => scheduleModule.renderScheduleColumn('nonexistent')).not.toThrow();
    });
  });

  describe('renderRulesList', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="scheduleRulesContainer"></div>';
    });

    it('should render rules list container', () => {
      scheduleModule.renderRulesList();
      const container = document.getElementById('scheduleRulesContainer');
      expect(container.innerHTML).toBeDefined();
    });

    it('should return early if container not found', () => {
      document.body.innerHTML = '';
      expect(() => scheduleModule.renderRulesList()).not.toThrow();
    });
  });

  describe('showAddModal', () => {
    it('should show toast if no members', () => {
      scheduleModule.showAddModal();
      expect(toastMock.show).toHaveBeenCalled();
      expect(modalMock.open).not.toHaveBeenCalled();
    });

    it('should open modal when there are members', () => {
      memberService.add('小明');
      scheduleModule.showAddModal();
      expect(modalMock.open).toHaveBeenCalled();
      expect(modalMock.open.mock.calls[0][0]).toContain('新建排班');
    });
  });

  describe('saveSchedule', () => {
    let member;
    let type;

    beforeEach(() => {
      member = memberService.add('小明');
      type = taskTypeService.getEnabled()[0];
      document.body.innerHTML = `
        <select id="scheduleType"><option value="${type.id}" selected>测试</option></select>
        <select id="scheduleMember"><option value="${member.id}" selected>小明</option></select>
        <input type="date" id="scheduleDate" value="2024-01-15">
      `;
    });

    it('should add a new schedule', () => {
      const event = { preventDefault: vi.fn() };
      scheduleModule.saveSchedule(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(scheduleService.getAll().length).toBe(1);
      expect(toastMock.show).toHaveBeenCalled();
      expect(modalMock.close).toHaveBeenCalled();
    });
  });

  describe('markDone', () => {
    it('should mark schedule as done', () => {
      const member = memberService.add('小明');
      const type = taskTypeService.getEnabled()[0];
      const schedule = scheduleService.add(member.id, type.id, Date.now());

      scheduleModule.markDone(schedule.id);
      const updated = scheduleService.getById(schedule.id);
      expect(updated.completed).toBe(true);
      expect(toastMock.show).toHaveBeenCalled();
    });
  });

  describe('deleteSchedule', () => {
    let schedule;

    beforeEach(() => {
      const member = memberService.add('小明');
      const type = taskTypeService.getEnabled()[0];
      schedule = scheduleService.add(member.id, type.id, Date.now());
    });

    it('should delete schedule when confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      scheduleModule.deleteSchedule(schedule.id);
      expect(scheduleService.getAll().length).toBe(0);
      expect(toastMock.show).toHaveBeenCalled();
    });

    it('should not delete schedule when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      scheduleModule.deleteSchedule(schedule.id);
      expect(scheduleService.getAll().length).toBe(1);
      expect(toastMock.show).not.toHaveBeenCalled();
    });
  });

  describe('showAddRuleModal', () => {
    it('should show toast if no members', () => {
      scheduleModule.showAddRuleModal();
      expect(toastMock.show).toHaveBeenCalled();
      expect(modalMock.open).not.toHaveBeenCalled();
    });

    it('should open modal when there are members', () => {
      memberService.add('小明');
      scheduleModule.showAddRuleModal();
      expect(modalMock.open).toHaveBeenCalled();
      expect(modalMock.open.mock.calls[0][0]).toContain('新建排班规则');
    });
  });

  describe('showDayModal', () => {
    it('should open modal with day schedule details', () => {
      const member = memberService.add('小明');
      const type = taskTypeService.getEnabled()[0];
      const today = startOfDay(Date.now());
      scheduleService.add(member.id, type.id, today);

      scheduleModule.showDayModal(today);
      expect(modalMock.open).toHaveBeenCalled();
      expect(modalMock.open.mock.calls[0][0]).toContain('排班详情');
    });

    it('should show empty message when no schedules that day', () => {
      const today = startOfDay(Date.now());
      scheduleModule.showDayModal(today);
      expect(modalMock.open).toHaveBeenCalled();
      const content = modalMock.open.mock.calls[0][1];
      expect(content).toContain('当天暂无排班');
    });
  });

  describe('quickAddSchedule', () => {
    let member;
    let type;
    let today;

    beforeEach(() => {
      member = memberService.add('小明');
      type = taskTypeService.getEnabled()[0];
      today = startOfDay(Date.now());
      document.body.innerHTML = `
        <select id="calQuickType"><option value="${type.id}" selected>测试</option></select>
        <select id="calQuickMember"><option value="${member.id}" selected>小明</option></select>
      `;
    });

    it('should add schedule via quick add', () => {
      const event = { preventDefault: vi.fn() };
      scheduleModule.quickAddSchedule(event, today);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(scheduleService.getAll().length).toBe(1);
      expect(modalMock.close).toHaveBeenCalled();
      expect(toastMock.show).toHaveBeenCalled();
    });

    it('should return if no type selected', () => {
      document.body.innerHTML = `
        <select id="calQuickType"><option value="" selected></option></select>
        <select id="calQuickMember"><option value="${member.id}" selected>小明</option></select>
      `;
      const event = { preventDefault: vi.fn() };
      scheduleModule.quickAddSchedule(event, today);
      expect(scheduleService.getAll().length).toBe(0);
    });

    it('should return if no member selected', () => {
      document.body.innerHTML = `
        <select id="calQuickType"><option value="${type.id}" selected>测试</option></select>
        <select id="calQuickMember"><option value="" selected></option></select>
      `;
      const event = { preventDefault: vi.fn() };
      scheduleModule.quickAddSchedule(event, today);
      expect(scheduleService.getAll().length).toBe(0);
    });
  });
});
