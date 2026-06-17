import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemindersModule } from '../../js/modules/RemindersModule.js';
import { createTestStore, createTestMember, createTestTaskType } from '../helpers/testUtils.js';
import { MemberService } from '../../js/services/MemberService.js';
import { ReminderService } from '../../js/services/ReminderService.js';
import { TaskTypeService } from '../../js/services/TaskTypeService.js';
import { ScheduleService } from '../../js/services/ScheduleService.js';
import { RecordService } from '../../js/services/RecordService.js';

describe('RemindersModule', () => {
  let store;
  let memberService;
  let reminderService;
  let taskTypeService;
  let scheduleService;
  let recordService;
  let remindersModule;

  beforeEach(() => {
    store = createTestStore();
    memberService = new MemberService(store);
    reminderService = new ReminderService(store);
    taskTypeService = new TaskTypeService(store);
    scheduleService = new ScheduleService(store);
    recordService = new RecordService(store);

    remindersModule = new RemindersModule(
      store,
      memberService,
      reminderService,
      taskTypeService
    );
  });

  describe('_rgba', () => {
    it('should convert hex color to rgba with default alpha 0.15', () => {
      const result = remindersModule._rgba('#ff0000');
      expect(result).toBe('rgba(255, 0, 0, 0.15)');
    });

    it('should convert hex color to rgba with custom alpha', () => {
      const result = remindersModule._rgba('#00ff00', 0.5);
      expect(result).toBe('rgba(0, 255, 0, 0.5)');
    });

    it('should handle blue color correctly', () => {
      const result = remindersModule._rgba('#0000ff');
      expect(result).toBe('rgba(0, 0, 255, 0.15)');
    });

    it('should handle white color', () => {
      const result = remindersModule._rgba('#ffffff');
      expect(result).toBe('rgba(255, 255, 255, 0.15)');
    });

    it('should handle black color', () => {
      const result = remindersModule._rgba('#000000');
      expect(result).toBe('rgba(0, 0, 0, 0.15)');
    });
  });

  describe('_renderAutoReminder', () => {
    it('should render auto reminder with never done status', () => {
      const type = createTestTaskType({ id: 'test1', name: '测试任务', emoji: '🧪', color: '#f59e0b' });
      const reminder = {
        id: 'auto_test1',
        type: 'test1',
        auto: true,
        neverDone: true
      };

      const result = remindersModule._renderAutoReminder(reminder, type);

      expect(result).toContain('reminder-item');
      expect(result).toContain('🧪');
      expect(result).toContain('测试任务');
      expect(result).toContain('还没有人完成过这项任务');
      expect(result).toContain('记录完成');
      expect(result).toContain('border-left: 4px solid #f59e0b');
    });

    it('should render auto reminder with last member info', () => {
      const member = memberService.add('小明');
      const type = createTestTaskType({ id: 'test2', name: '打扫卫生', emoji: '🧹', color: '#10b981' });
      const reminder = {
        id: 'auto_test2',
        type: 'test2',
        auto: true,
        daysSinceLast: 5,
        lastMemberId: member.id
      };

      const result = remindersModule._renderAutoReminder(reminder, type);

      expect(result).toContain('打扫卫生');
      expect(result).toContain('上次完成是 5 天前');
      expect(result).toContain('小明');
      expect(result).toContain('建议尽快安排人员处理');
    });

    it('should render auto reminder without last member info', () => {
      const type = createTestTaskType({ id: 'test3', name: '倒垃圾', emoji: '🗑️', color: '#ef4444' });
      const reminder = {
        id: 'auto_test3',
        type: 'test3',
        auto: true,
        daysSinceLast: 3,
        lastMemberId: null
      };

      const result = remindersModule._renderAutoReminder(reminder, type);

      expect(result).toContain('倒垃圾');
      expect(result).toContain('上次完成是 3 天前');
      expect(result).not.toContain('（');
    });
  });

  describe('_renderScheduleReminder', () => {
    it('should render overdue schedule reminder', () => {
      const member = memberService.add('小红');
      const type = createTestTaskType({ id: 'test1', name: '做饭', emoji: '🍳', color: '#f59e0b' });
      const reminder = {
        id: 'sched_1',
        type: 'test1',
        memberId: member.id,
        date: Date.now() - 86400000 * 2,
        daysDiff: -2,
        auto: false
      };

      const result = remindersModule._renderScheduleReminder(reminder, type, false);

      expect(result).toContain('reminder-item');
      expect(result).toContain('🍳');
      expect(result).toContain('做饭');
      expect(result).toContain('小红');
      expect(result).toContain('已逾期 2 天');
      expect(result).toContain('已完成');
    });

    it('should render warning schedule reminder for today', () => {
      const member = memberService.add('小刚');
      const type = createTestTaskType({ id: 'test2', name: '洗衣', emoji: '🧺', color: '#8b5cf6' });
      const reminder = {
        id: 'sched_2',
        type: 'test2',
        memberId: member.id,
        date: Date.now(),
        daysDiff: 0,
        auto: false
      };

      const result = remindersModule._renderScheduleReminder(reminder, type, true);

      expect(result).toContain('warning');
      expect(result).toContain('洗衣');
      expect(result).toContain('小刚');
      expect(result).toContain('今天需要完成');
    });

    it('should render schedule reminder for tomorrow', () => {
      const member = memberService.add('小丽');
      const type = createTestTaskType({ id: 'test3', name: '拖地', emoji: '🧹', color: '#06b6d4' });
      const reminder = {
        id: 'sched_3',
        type: 'test3',
        memberId: member.id,
        date: Date.now() + 86400000,
        daysDiff: 1,
        auto: false
      };

      const result = remindersModule._renderScheduleReminder(reminder, type, true);

      expect(result).toContain('warning');
      expect(result).toContain('拖地');
      expect(result).toContain('小丽');
      expect(result).toContain('明天需要完成');
    });

    it('should render schedule reminder with unknown member', () => {
      const type = createTestTaskType({ id: 'test4', name: '浇花', emoji: '🌸', color: '#ec4899' });
      const reminder = {
        id: 'sched_4',
        type: 'test4',
        memberId: 'nonexistent',
        date: Date.now(),
        daysDiff: 0,
        auto: false
      };

      const result = remindersModule._renderScheduleReminder(reminder, type, true);

      expect(result).toContain('未知成员');
      expect(result).toContain('浇花');
    });
  });

  describe('render', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="remindersList"></div>';
    });

    it('should render empty state when no reminders', () => {
      const taskTypes = taskTypeService.getAll();
      taskTypes.forEach(type => {
        taskTypeService.toggleEnabled(type.id);
      });

      remindersModule.render();

      const container = document.getElementById('remindersList');
      expect(container.innerHTML).toContain('一切正常！');
      expect(container.innerHTML).toContain('当前没有逾期或即将到期的任务');
      expect(container.innerHTML).toContain('✅');
    });

    it('should render auto reminders', () => {
      const member = memberService.add('小明');
      const taskTypes = taskTypeService.getEnabled();
      if (taskTypes.length > 0) {
        const oldDate = Date.now() - 86400000 * 10;
        recordService.add(member.id, taskTypes[0].id, oldDate);
      }

      remindersModule.render();

      const container = document.getElementById('remindersList');
      expect(container.innerHTML).toContain('reminder-item');
      expect(container.innerHTML).toContain('记录完成');
    });

    it('should render schedule reminders', () => {
      const member = memberService.add('小红');
      const taskTypes = taskTypeService.getEnabled();
      if (taskTypes.length > 0) {
        scheduleService.add(member.id, taskTypes[0].id, Date.now());
      }

      remindersModule.render();

      const container = document.getElementById('remindersList');
      expect(container.innerHTML).toContain('reminder-item');
      expect(container.innerHTML).toContain('已完成');
    });

    it('should filter out disabled task types', () => {
      const member = memberService.add('小刚');
      const allTaskTypes = taskTypeService.getAll();

      allTaskTypes.forEach((type, index) => {
        if (index > 0) {
          taskTypeService.toggleEnabled(type.id);
        }
      });

      const enabledTypes = taskTypeService.getEnabled();
      expect(enabledTypes.length).toBe(1);

      const type = enabledTypes[0];
      const oldDate = Date.now() - 86400000 * 10;
      recordService.add(member.id, type.id, oldDate);

      const beforeCount = document.getElementById('remindersList').innerHTML.length;
      remindersModule.render();
      const afterDisabled = document.getElementById('remindersList').innerHTML;
      expect(afterDisabled).toContain('reminder-item');

      taskTypeService.toggleEnabled(type.id);
      remindersModule.render();
      const afterAllDisabled = document.getElementById('remindersList').innerHTML;
      expect(afterAllDisabled).toContain('一切正常！');
    });

    it('should call _renderAutoReminder for auto reminders', () => {
      const member = memberService.add('小明');
      const taskTypes = taskTypeService.getEnabled();
      if (taskTypes.length > 0) {
        const oldDate = Date.now() - 86400000 * 10;
        recordService.add(member.id, taskTypes[0].id, oldDate);
      }

      const renderAutoSpy = vi.spyOn(remindersModule, '_renderAutoReminder');

      remindersModule.render();

      expect(renderAutoSpy).toHaveBeenCalled();
    });

    it('should call _renderScheduleReminder for schedule reminders', () => {
      const member = memberService.add('小红');
      const taskTypes = taskTypeService.getEnabled();
      if (taskTypes.length > 0) {
        scheduleService.add(member.id, taskTypes[0].id, Date.now());
      }

      const renderScheduleSpy = vi.spyOn(remindersModule, '_renderScheduleReminder');

      remindersModule.render();

      expect(renderScheduleSpy).toHaveBeenCalled();
    });
  });
});
