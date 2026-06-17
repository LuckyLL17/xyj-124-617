import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardModule } from '../../js/modules/DashboardModule.js';
import { createTestStore, createTestMember, createTestTaskType } from '../helpers/testUtils.js';
import { MemberService } from '../../js/services/MemberService.js';
import { RecordService } from '../../js/services/RecordService.js';
import { ScheduleService } from '../../js/services/ScheduleService.js';
import { BillService } from '../../js/services/BillService.js';
import { TaskTypeService } from '../../js/services/TaskTypeService.js';

describe('DashboardModule', () => {
  let store;
  let memberService;
  let recordService;
  let scheduleService;
  let billService;
  let taskTypeService;
  let dashboardModule;

  beforeEach(() => {
    store = createTestStore();
    memberService = new MemberService(store);
    recordService = new RecordService(store);
    scheduleService = new ScheduleService(store);
    billService = new BillService(store);
    taskTypeService = new TaskTypeService(store);

    dashboardModule = new DashboardModule(
      store,
      memberService,
      recordService,
      scheduleService,
      billService,
      taskTypeService
    );
  });

  describe('_lightenColor', () => {
    it('should convert hex color to rgba with alpha', () => {
      const result = dashboardModule._lightenColor('#ff0000');
      expect(result).toBe('rgba(255, 0, 0, 0.15)');
    });

    it('should handle different colors', () => {
      const result = dashboardModule._lightenColor('#00ff00');
      expect(result).toBe('rgba(0, 255, 0, 0.15)');
    });

    it('should handle blue color', () => {
      const result = dashboardModule._lightenColor('#0000ff');
      expect(result).toBe('rgba(0, 0, 255, 0.15)');
    });

    it('should handle white', () => {
      const result = dashboardModule._lightenColor('#ffffff');
      expect(result).toBe('rgba(255, 255, 255, 0.15)');
    });

    it('should handle black', () => {
      const result = dashboardModule._lightenColor('#000000');
      expect(result).toBe('rgba(0, 0, 0, 0.15)');
    });
  });

  describe('_getTaskTypes', () => {
    it('should return enabled task types as object', () => {
      const types = dashboardModule._getTaskTypes();
      expect(typeof types).toBe('object');
      expect(Object.keys(types).length).toBeGreaterThan(0);
    });
  });

  describe('renderStats', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="dashboardStatsGrid"></div>';
    });

    it('should render stats cards', () => {
      const member1 = memberService.add('小明');
      const member2 = memberService.add('小红');
      const taskTypes = taskTypeService.getEnabled();
      if (taskTypes.length > 0) {
        recordService.add(member1.id, taskTypes[0].id, Date.now());
        recordService.add(member2.id, taskTypes[0].id, Date.now());
      }

      dashboardModule.renderStats();

      const grid = document.getElementById('dashboardStatsGrid');
      expect(grid.innerHTML).toContain('stat-card');
      expect(grid.innerHTML).toContain('合租成员');
      expect(grid.innerHTML).toContain('本月支出');
    });
  });

  describe('renderPendingTasks', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="pendingTasks"></div>';
    });

    it('should render pending tasks section with empty state', () => {
      dashboardModule.renderPendingTasks();
      const el = document.getElementById('pendingTasks');
      expect(el.innerHTML).toContain('empty-state');
    });
  });

  describe('renderRecentActivity', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="recentActivity"></div>';
    });

    it('should render recent activity section with empty state', () => {
      dashboardModule.renderRecentActivity();
      const el = document.getElementById('recentActivity');
      expect(el.innerHTML).toContain('empty-state');
    });
  });

  describe('renderRanking', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="ranking"></div>';
    });

    it('should render ranking section with empty state', () => {
      dashboardModule.renderRanking();
      const el = document.getElementById('ranking');
      expect(el.innerHTML).toContain('empty-state');
    });
  });

  describe('render', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="dashboardStatsGrid"></div>
        <div id="pendingTasks"></div>
        <div id="recentActivity"></div>
        <div id="ranking"></div>
      `;
    });

    it('should call all render methods', () => {
      const renderStatsSpy = vi.spyOn(dashboardModule, 'renderStats');
      const renderPendingSpy = vi.spyOn(dashboardModule, 'renderPendingTasks');
      const renderRecentSpy = vi.spyOn(dashboardModule, 'renderRecentActivity');
      const renderRankingSpy = vi.spyOn(dashboardModule, 'renderRanking');

      dashboardModule.render();

      expect(renderStatsSpy).toHaveBeenCalled();
      expect(renderPendingSpy).toHaveBeenCalled();
      expect(renderRecentSpy).toHaveBeenCalled();
      expect(renderRankingSpy).toHaveBeenCalled();
    });
  });
});
