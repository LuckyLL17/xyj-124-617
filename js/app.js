import { Store } from './store/Store.js';
import { MemberService } from './services/MemberService.js';
import { RecordService } from './services/RecordService.js';
import { ScheduleService } from './services/ScheduleService.js';
import { ReminderService } from './services/ReminderService.js';
import { BillService } from './services/BillService.js';
import { InventoryService } from './services/InventoryService.js';
import { MessageService } from './services/MessageService.js';
import { VoteService } from './services/VoteService.js';
import { TaskTypeService } from './services/TaskTypeService.js';
import { Modal } from './components/Modal.js';
import { Toast } from './components/Toast.js';
import { TabNav } from './components/TabNav.js';
import { DashboardModule } from './modules/DashboardModule.js';
import { MembersModule } from './modules/MembersModule.js';
import { RecordsModule } from './modules/RecordsModule.js';
import { ScheduleModule } from './modules/ScheduleModule.js';
import { InventoryModule } from './modules/InventoryModule.js';
import { BillsModule } from './modules/BillsModule.js';
import { RemindersModule } from './modules/RemindersModule.js';
import { MessagesModule } from './modules/MessagesModule.js';
import { VotesModule } from './modules/VotesModule.js';
import { TaskTypesModule } from './modules/TaskTypesModule.js';
import { getCurrentDateDisplay } from './utils/helpers.js';

class App {
    constructor() {
        this.store = new Store({
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

        this.taskTypeService = new TaskTypeService(this.store);
        this.memberService = new MemberService(this.store);
        this.recordService = new RecordService(this.store);
        this.scheduleService = new ScheduleService(this.store);
        this.reminderService = new ReminderService(this.store);
        this.billService = new BillService(this.store);
        this.inventoryService = new InventoryService(this.store);
        this.messageService = new MessageService(this.store);
        this.voteService = new VoteService(this.store);

        this.modal = new Modal();
        this.toast = new Toast();

        this.dashboardModule = new DashboardModule(
            this.store, this.memberService, this.recordService, this.scheduleService, this.billService, this.taskTypeService
        );
        this.membersModule = new MembersModule(
            this.store, this.memberService, this.taskTypeService, this.modal, this.toast
        );
        this.recordsModule = new RecordsModule(
            this.store, this.memberService, this.recordService, this.taskTypeService, this.modal, this.toast
        );
        this.scheduleModule = new ScheduleModule(
            this.store, this.memberService, this.scheduleService, this.recordService, this.taskTypeService, this.modal, this.toast
        );
        this.billsModule = new BillsModule(
            this.store, this.memberService, this.billService, this.modal, this.toast
        );
        this.inventoryModule = new InventoryModule(
            this.store, this.inventoryService, this.memberService, this.billsModule, this.modal, this.toast
        );
        this.remindersModule = new RemindersModule(
            this.store, this.memberService, this.reminderService, this.taskTypeService
        );
        this.messagesModule = new MessagesModule(
            this.store, this.memberService, this.messageService, this.modal, this.toast
        );
        this.votesModule = new VotesModule(
            this.store, this.memberService, this.voteService, this.modal, this.toast
        );
        this.taskTypesModule = new TaskTypesModule(
            this.store, this.taskTypeService, this.modal, this.toast
        );

        this.billsModule.setOnBillSavedCallback((billId, inventoryItemId, inventoryQty) => {
            this.inventoryModule.onBillSaved(billId, inventoryItemId, inventoryQty);
        });

        this._setupStoreSubscriptions();
        this._exposeGlobalHandlers();
    }

    init() {
        this._loadData();
        this._renderCurrentDate();
        this._bindEvents();
        this._renderAll();
        this._startReminderCheck();
    }

    _loadData() {
        const restored = this.store.restore();
        if (!restored) {
            this._initSampleData();
        }
    }

    _initSampleData() {
        this.store.batch(() => {
            this.taskTypeService.getAll();

            const members = this.memberService.generateSampleMembers();
            this.store.set('members', members);

            const records = this.recordService.generateSampleRecords(members, this.taskTypeService);
            this.store.set('records', records);

            const schedules = this.scheduleService.generateDefaultSchedules(members, this.taskTypeService);
            this.store.set('schedules', schedules);

            const inventoryItems = this.inventoryService.generateSampleItems();
            this.store.set('inventoryItems', inventoryItems);

            const inventoryLogs = this.inventoryService.generateSampleLogs(inventoryItems);
            this.store.set('inventoryLogs', inventoryLogs);

            const messages = this.messageService.generateSampleMessages(members);
            this.store.set('messages', messages);

            const votes = this.voteService.generateSampleVotes(members);
            this.store.set('votes', votes);
        });
        this.store.persist();
    }

    _setupStoreSubscriptions() {
        this.store.onAny(() => {
            this.store.persist();
            this._renderAll();
        });
    }

    _renderCurrentDate() {
        document.getElementById('currentDate').textContent = getCurrentDateDisplay();
    }

    _bindEvents() {
        this.tabNav = new TabNav('.tabs', (tabId) => {
            this._renderAll();
        });

        document.getElementById('addMemberBtn').addEventListener('click', () => {
            this.membersModule.showAddModal();
        });
        document.getElementById('addRecordBtn').addEventListener('click', () => {
            this.recordsModule.showAddModal();
        });
        document.getElementById('addScheduleBtn').addEventListener('click', () => {
            this.scheduleModule.showAddModal();
        });
        document.getElementById('addInventoryBtn').addEventListener('click', () => {
            this.inventoryModule.showAddModal();
        });
        document.getElementById('addBillBtn').addEventListener('click', () => {
            this.billsModule.showAddModal();
        });
        document.getElementById('addMessageBtn').addEventListener('click', () => {
            this.messagesModule.showAddModal();
        });
        const addVoteBtn = document.getElementById('addVoteBtn');
        if (addVoteBtn) addVoteBtn.addEventListener('click', () => {
            this.votesModule.showAddModal();
        });
        const addTaskTypeBtn = document.getElementById('addTaskTypeBtn');
        if (addTaskTypeBtn) addTaskTypeBtn.addEventListener('click', () => {
            this.taskTypesModule.showAddModal();
        });

        document.getElementById('filterType').addEventListener('change', () => {
            this.recordsModule.renderRecords();
        });
        document.getElementById('filterMember').addEventListener('change', () => {
            this.recordsModule.renderRecords();
        });

        document.getElementById('billFilterCategory').addEventListener('change', () => {
            this.billsModule.renderBills();
        });
        document.getElementById('billFilterMember').addEventListener('change', () => {
            this.billsModule.renderBills();
        });

        const invFilterCategory = document.getElementById('invFilterCategory');
        const invFilterStock = document.getElementById('invFilterStock');
        const invSearch = document.getElementById('invSearch');
        const invLogItemFilter = document.getElementById('invLogItemFilter');
        const invLogTypeFilter = document.getElementById('invLogTypeFilter');
        if (invFilterCategory) invFilterCategory.addEventListener('change', () => this.inventoryModule.renderItems());
        if (invFilterStock) invFilterStock.addEventListener('change', () => this.inventoryModule.renderItems());
        if (invSearch) {
            let timer;
            invSearch.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(() => this.inventoryModule.renderItems(), 200);
            });
        }
        if (invLogItemFilter) invLogItemFilter.addEventListener('change', () => this.inventoryModule.renderLogs());
        if (invLogTypeFilter) invLogTypeFilter.addEventListener('change', () => this.inventoryModule.renderLogs());
    }

    _renderAll() {
        this.dashboardModule.render();
        this.membersModule.render();
        this.recordsModule.render();
        this.scheduleModule.render();
        this.inventoryModule.render();
        this.billsModule.render();
        this.votesModule.render();
        this.messagesModule.render();
        this.remindersModule.render();
        this.taskTypesModule.render();
    }

    _startReminderCheck() {
        setInterval(() => {
            this.remindersModule.render();
            this.dashboardModule.renderPendingTasks();
        }, 60000);
    }

    _exposeGlobalHandlers() {
        window._app = {
            handleSaveMember: (event, memberId) => this.membersModule.saveMember(event, memberId),
            editMember: (memberId) => this.membersModule.showEditModal(memberId),
            deleteMember: (memberId) => this.membersModule.deleteMember(memberId),

            handleSaveTaskType: (event, typeId) => this.taskTypesModule.save(event, typeId),
            editTaskType: (typeId) => this.taskTypesModule.showEditModal(typeId),
            deleteTaskType: (typeId) => this.taskTypesModule.delete(typeId),
            toggleTaskType: (typeId) => this.taskTypesModule.toggleEnabled(typeId),
            moveTaskTypeUp: (typeId) => this.taskTypesModule.moveUp(typeId),
            moveTaskTypeDown: (typeId) => this.taskTypesModule.moveDown(typeId),

            handleSaveRecord: (event) => {
                this.recordsModule.saveRecord(event);
            },
            quickAddRecord: (type) => this.recordsModule.showAddModal(type),
            deleteRecord: (recordId) => this.recordsModule.deleteRecord(recordId),

            handleSaveSchedule: (event) => this.scheduleModule.saveSchedule(event),
            markScheduleDone: (scheduleId) => {
                this.scheduleModule.markDone(scheduleId);
            },
            deleteSchedule: (scheduleId) => this.scheduleModule.deleteSchedule(scheduleId),
            showAddScheduleModal: () => this.scheduleModule.showAddModal(),

            switchScheduleView: (mode) => this.scheduleModule.switchView(mode),
            calPrev: () => this.scheduleModule._navigateCalendar(-1),
            calNext: () => this.scheduleModule._navigateCalendar(1),
            calGoToday: () => this.scheduleModule.goToToday(),
            calSwitchMode: (mode) => this.scheduleModule.switchCalendarMode(mode),
            calToggleType: (typeId) => this.scheduleModule.toggleFilterType(typeId),
            calToggleMember: (memberId) => this.scheduleModule.toggleFilterMember(memberId),
            calSetStatus: (status) => this.scheduleModule.setFilterStatus(status),
            calClearFilters: () => this.scheduleModule.clearFilters(),
            calShowDay: (dateTs) => this.scheduleModule.showDayModal(dateTs),
            calShowEvent: (scheduleId) => this.scheduleModule.showEventModal(scheduleId),
            calQuickAdd: (event, dateTs) => this.scheduleModule.quickAddSchedule(event, dateTs),
            calMoveToDate: (scheduleId, newDateTs) => this.scheduleService.moveToDate(scheduleId, newDateTs),
            showAddRuleModal: () => this.scheduleModule.showAddRuleModal(),
            showEditRuleModal: (ruleId) => this.scheduleModule.showEditRuleModal(ruleId),
            handleSaveScheduleRule: (event, ruleId) => this.scheduleModule.saveScheduleRule(event, ruleId),
            toggleRuleEnabled: (ruleId) => this.scheduleModule.toggleRuleEnabled(ruleId),
            deleteScheduleRule: (ruleId) => this.scheduleModule.deleteScheduleRule(ruleId),
            toggleRuleTypeFields: () => this.scheduleModule.toggleRuleTypeFields(),

            showBatchGenerateModal: () => this.scheduleModule.showBatchGenerateModal(),
            handleBatchGenerate: (event) => this.scheduleModule.handleBatchGenerate(event),

            showSwapModal: (scheduleId) => this.scheduleModule.showSwapModal(scheduleId),
            handleScheduleSwap: (event, scheduleId) => this.scheduleModule.handleScheduleSwap(event, scheduleId),
            showSubstituteModal: (scheduleId) => this.scheduleModule.showSubstituteModal(scheduleId),
            handleScheduleSubstitute: (event, scheduleId) => this.scheduleModule.handleScheduleSubstitute(event, scheduleId),

            handleSaveInventoryItem: (event, itemId) => this.inventoryModule.saveItem(event, itemId),
            editInventoryItem: (itemId) => this.inventoryModule.showEditModal(itemId),
            deleteInventoryItem: (itemId) => this.inventoryModule.deleteItem(itemId),
            showInventoryConsumeModal: (itemId) => this.inventoryModule.showConsumeModal(itemId),
            showInventoryRestockModal: (itemId) => this.inventoryModule.showRestockModal(itemId),
            showInventoryPurchaseModal: (itemId) => this.inventoryModule.showPurchaseModal(itemId),
            showInventoryItemLogs: (itemId) => this.inventoryModule.showItemLogsModal(itemId),
            handleInventoryAction: (event, itemId, action) => this.inventoryModule.handleAction(event, itemId, action),

            handleSaveBill: (event) => this.billsModule.saveBill(event),
            editBill: (billId) => this.billsModule.showEditModal(billId),
            deleteBill: (billId) => this.billsModule.deleteBill(billId),
            settleBill: (billId) => this.billsModule.settleBill(billId),
            settleAllBills: () => this.billsModule.settleAllBills(),
            settleOneSettlement: (settlementId) => this.billsModule.settleOneSettlement(settlementId),
            settleAllSettlements: () => this.billsModule.settleAllSettlements(),
            viewBillEvidence: (billId) => this.billsModule.viewBillEvidence(billId),

            saveMessage: () => this.messagesModule.saveMessage(),
            deleteMessage: (messageId) => this.messagesModule.deleteMessage(messageId),
            pinMessage: (messageId) => this.messagesModule.togglePin(messageId),
            showReplyInput: (messageId) => this.messagesModule.showReplyInput(messageId),
            hideReplyInput: (messageId) => this.messagesModule.hideReplyInput(messageId),
            submitReply: (messageId) => this.messagesModule.submitReply(messageId),

            createVote: () => this.votesModule.createVote(),
            addVoteOptionInput: () => this.votesModule.addVoteOptionInput(),
            toggleMaxChoices: () => this.votesModule.toggleMaxChoices(),
            switchVoteTab: (tab) => this.votesModule.switchTab(tab),
            openVoteDetail: (voteId) => this.votesModule.openVoteDetail(voteId),
            submitVote: (voteId) => this.votesModule.submitVote(voteId),
            archiveVote: (voteId) => this.votesModule.archiveVote(voteId),
            unarchiveVote: (voteId) => this.votesModule.unarchiveVote(voteId),
            validateVoteChoices: () => this.votesModule.validateVoteChoices(),
            scrollToBill: (billId) => {
                this.tabNav.switchTo('bills');
                setTimeout(() => {
                    const billEl = document.querySelector(`.bill-item [onclick*="${billId}"]`);
                    if (billEl) {
                        billEl.closest('.bill-item')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            },

            closeModal: () => this.modal.close()
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
