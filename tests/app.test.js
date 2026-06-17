import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Store } from '../js/store/Store.js';
import { MemberService } from '../js/services/MemberService.js';
import { TaskTypeService } from '../js/services/TaskTypeService.js';
import { RecordService } from '../js/services/RecordService.js';
import { ScheduleService } from '../js/services/ScheduleService.js';
import { BillService } from '../js/services/BillService.js';
import { InventoryService } from '../js/services/InventoryService.js';
import { MessageService } from '../js/services/MessageService.js';
import { VoteService } from '../js/services/VoteService.js';
import { ReminderService } from '../js/services/ReminderService.js';
import { DashboardModule } from '../js/modules/DashboardModule.js';
import { MembersModule } from '../js/modules/MembersModule.js';
import { RecordsModule } from '../js/modules/RecordsModule.js';
import { ScheduleModule } from '../js/modules/ScheduleModule.js';
import { BillsModule } from '../js/modules/BillsModule.js';
import { InventoryModule } from '../js/modules/InventoryModule.js';
import { RemindersModule } from '../js/modules/RemindersModule.js';
import { MessagesModule } from '../js/modules/MessagesModule.js';
import { VotesModule } from '../js/modules/VotesModule.js';
import { TaskTypesModule } from '../js/modules/TaskTypesModule.js';

describe('App Modules Integration', () => {
  let store;
  let taskTypeService;
  let memberService;
  let recordService;
  let scheduleService;
  let reminderService;
  let billService;
  let inventoryService;
  let messageService;
  let voteService;
  let modal;
  let toast;

  beforeEach(() => {
    store = new Store({
      members: [],
      records: [],
      schedules: [],
      scheduleRules: [],
      bills: [],
      settlements: [],
      inventoryItems: [],
      inventoryLogs: [],
      messages: [],
      votes: [],
      taskTypes: null
    });

    taskTypeService = new TaskTypeService(store);
    memberService = new MemberService(store);
    recordService = new RecordService(store);
    scheduleService = new ScheduleService(store);
    reminderService = new ReminderService(store);
    billService = new BillService(store);
    inventoryService = new InventoryService(store);
    messageService = new MessageService(store);
    voteService = new VoteService(store);

    modal = { open: vi.fn(), close: vi.fn(), isOpen: vi.fn(() => false), bodyEl: document.createElement('div') };
    toast = { show: vi.fn() };
  });

  describe('Service Layer', () => {
    it('should create all services successfully', () => {
      expect(taskTypeService).toBeInstanceOf(TaskTypeService);
      expect(memberService).toBeInstanceOf(MemberService);
      expect(recordService).toBeInstanceOf(RecordService);
      expect(scheduleService).toBeInstanceOf(ScheduleService);
      expect(reminderService).toBeInstanceOf(ReminderService);
      expect(billService).toBeInstanceOf(BillService);
      expect(inventoryService).toBeInstanceOf(InventoryService);
      expect(messageService).toBeInstanceOf(MessageService);
      expect(voteService).toBeInstanceOf(VoteService);
    });

    it('should share the same store instance', () => {
      const member = memberService.add('测试成员', '测', '#ff0000');
      const storeMembers = store.get('members');
      expect(storeMembers.length).toBe(1);
      expect(storeMembers[0].id).toBe(member.id);

      const record = recordService.add(member.id, 'trash', Date.now());
      const storeRecords = store.get('records');
      expect(storeRecords.length).toBe(1);
      expect(storeRecords[0].id).toBe(record.id);
    });
  });

  describe('Module Layer', () => {
    let dashboardModule;
    let membersModule;
    let recordsModule;
    let scheduleModule;
    let billsModule;
    let inventoryModule;
    let remindersModule;
    let messagesModule;
    let votesModule;
    let taskTypesModule;

    beforeEach(() => {
      dashboardModule = new DashboardModule(
        store, memberService, recordService, scheduleService, billService, taskTypeService
      );
      membersModule = new MembersModule(
        store, memberService, taskTypeService, modal, toast
      );
      recordsModule = new RecordsModule(
        store, memberService, recordService, taskTypeService, modal, toast
      );
      scheduleModule = new ScheduleModule(
        store, memberService, scheduleService, recordService, taskTypeService, modal, toast
      );
      billsModule = new BillsModule(
        store, memberService, billService, modal, toast
      );
      inventoryModule = new InventoryModule(
        store, inventoryService, memberService, billsModule, modal, toast
      );
      remindersModule = new RemindersModule(
        store, memberService, reminderService, taskTypeService
      );
      messagesModule = new MessagesModule(
        store, memberService, messageService, modal, toast
      );
      votesModule = new VotesModule(
        store, memberService, voteService, modal, toast
      );
      taskTypesModule = new TaskTypesModule(
        store, taskTypeService, modal, toast
      );
    });

    it('should create all modules successfully', () => {
      expect(dashboardModule).toBeInstanceOf(DashboardModule);
      expect(membersModule).toBeInstanceOf(MembersModule);
      expect(recordsModule).toBeInstanceOf(RecordsModule);
      expect(scheduleModule).toBeInstanceOf(ScheduleModule);
      expect(billsModule).toBeInstanceOf(BillsModule);
      expect(inventoryModule).toBeInstanceOf(InventoryModule);
      expect(remindersModule).toBeInstanceOf(RemindersModule);
      expect(messagesModule).toBeInstanceOf(MessagesModule);
      expect(votesModule).toBeInstanceOf(VotesModule);
      expect(taskTypesModule).toBeInstanceOf(TaskTypesModule);
    });

    it('should share services across modules', () => {
      const member = memberService.add('共享测试', '共', '#00ff00');
      const memberFromModule = membersModule.memberService.getById(member.id);
      const memberFromRecords = recordsModule.memberService.getById(member.id);

      expect(memberFromModule).toBeDefined();
      expect(memberFromRecords).toBeDefined();
      expect(memberFromModule.name).toBe('共享测试');
      expect(memberFromRecords.name).toBe('共享测试');
    });

    it('should have billsModule callback setup for inventory', () => {
      billsModule.setOnBillSavedCallback(vi.fn());
      expect(billsModule._onBillSavedCallback).toBeDefined();
    });
  });

  describe('Store subscription flow', () => {
    it('should trigger subscribers when state changes', () => {
      const callback = vi.fn();
      store.onAny(callback);

      memberService.add('订阅测试', '订', '#0000ff');

      expect(callback).toHaveBeenCalled();
    });

    it('should persist data to localStorage', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem');
      memberService.add('持久化测试', '持', '#ff00ff');
      store.persist();

      expect(spy).toHaveBeenCalledWith(
        'sharehouse_data',
        expect.stringContaining('持久化测试')
      );
      spy.mockRestore();
    });
  });
});
