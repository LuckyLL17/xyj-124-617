import { BILL_CATEGORIES } from '../utils/constants.js';
import { formatDate, getMonthStart } from '../utils/helpers.js';
import { EmptyState } from '../components/EmptyState.js';
import { FormField } from '../components/FormField.js';

export class BillsModule {
    constructor(store, memberService, billService, modal, toast) {
        this.store = store;
        this.memberService = memberService;
        this.billService = billService;
        this.modal = modal;
        this.toast = toast;
        this._currentEvidenceBase64 = null;
        this._onBillSavedCallback = null;
    }

    setOnBillSavedCallback(cb) {
        this._onBillSavedCallback = cb;
    }

    render() {
        this.renderBills();
        this.renderSettlement();
        this.renderSummary();
        this.updateBillFilters();
    }

    renderBills() {
        const container = document.getElementById('billsList');
        const filterCategory = document.getElementById('billFilterCategory')?.value || 'all';
        const filterMember = document.getElementById('billFilterMember')?.value || 'all';
        const monthStart = getMonthStart();
        const filtered = this.billService.getFiltered(filterCategory, filterMember, monthStart);

        if (filtered.length === 0) {
            container.innerHTML = EmptyState.render('本月暂无账单记录');
            return;
        }

        container.innerHTML = filtered.map(bill => {
            const category = BILL_CATEGORIES[bill.category] || BILL_CATEGORIES.other;
            const member = this.memberService.getById(bill.payerId);
            const allMembers = this.memberService.getAll();
            const sharedNames = bill.sharedBy && bill.sharedBy.length > 0
                ? bill.sharedBy.map(id => allMembers.find(m => m.id === id)?.name).filter(Boolean).join('、')
                : allMembers.map(m => m.name).join('、');
            return `
                <div class="bill-item ${bill.settled ? 'settled' : ''}">
                    <div class="bill-info">
                        <span class="bill-emoji">${category.emoji}</span>
                        <div class="bill-details">
                            <h4>${category.name}${bill.settled ? ' <span class="bill-settled-badge">已结清</span>' : ''}</h4>
                            <p>付款人: ${member ? member.name : '未知成员'} · ${formatDate(bill.date)}</p>
                            <p class="bill-shared-by">分摊: ${sharedNames}</p>
                            ${bill.note ? `<p class="bill-note">${bill.note}</p>` : ''}
                        </div>
                    </div>
                    <div class="bill-right">
                        <span class="bill-amount">¥${bill.amount.toFixed(2)}</span>
                        <div class="bill-actions">
                            ${bill.evidence ? `<button class="btn btn-sm btn-secondary" onclick="window._app.viewBillEvidence('${bill.id}')" title="查看依据">📎</button>` : ''}
                            <button class="btn btn-sm btn-secondary" onclick="window._app.editBill('${bill.id}')" title="编辑">✏️</button>
                            ${!bill.settled ? `<button class="btn btn-sm btn-success" onclick="window._app.settleBill('${bill.id}')" title="结清">✓</button>` : ''}
                            <button class="bill-delete" onclick="window._app.deleteBill('${bill.id}')" title="删除">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderSettlement() {
        const container = document.getElementById('settlementList');
        const members = this.memberService.getAll();
        this.billService.refreshSettlements(members);
        const settlements = this.billService.getSettlements();
        const unsettledSettlements = settlements.filter(s => !s.settled);
        const unsettledAmount = unsettledSettlements.reduce((sum, s) => sum + s.amount, 0);

        const summaryEl = document.getElementById('settlementSummary');
        if (summaryEl) {
            if (unsettledSettlements.length > 0) {
                summaryEl.innerHTML = `<span class="settlement-unsettled">待结算: <strong>¥${unsettledAmount.toFixed(2)}</strong> / ${unsettledSettlements.length} 笔</span>
                    <button class="btn btn-sm btn-primary" onclick="window._app.settleAllSettlements()" style="margin-left: 12px;">全部结清</button>`;
            } else if (settlements.length > 0) {
                summaryEl.innerHTML = '<span class="settlement-cleared">✅ 所有分摊已结清</span>';
            } else {
                summaryEl.innerHTML = '';
            }
        }

        if (settlements.length === 0) {
            container.innerHTML = EmptyState.render('无需分摊结算');
            return;
        }

        container.innerHTML = settlements.map(s => `
            <div class="settlement-item ${s.settled ? 'settlement-done' : ''}">
                <div class="settlement-row">
                    <span class="settlement-from">${s.from}</span>
                    <span class="settlement-arrow">→ 支付 ¥${s.amount.toFixed(2)} →</span>
                    <span class="settlement-to">${s.to}</span>
                </div>
                <div class="settlement-actions">
                    ${s.settled
                        ? '<span class="settlement-done-badge">已结清</span>'
                        : `<button class="btn btn-sm btn-success" onclick="window._app.settleOneSettlement('${s.id}')" title="标记已结清">✓ 已转账</button>`
                    }
                </div>
            </div>
        `).join('');
    }

    renderSummary() {
        const monthStart = getMonthStart();
        const monthTotal = this.billService.getMonthTotal(monthStart);
        const categoryTotal = this.billService.getCategoryTotal(monthStart);
        const members = this.memberService.getAll();
        const perPerson = members.length > 0 ? (monthTotal / members.length) : 0;

        const totalEl = document.getElementById('billMonthTotal');
        const perPersonEl = document.getElementById('billPerPerson');
        const breakdownEl = document.getElementById('billCategoryBreakdown');

        if (totalEl) totalEl.textContent = `¥${monthTotal.toFixed(2)}`;
        if (perPersonEl) perPersonEl.textContent = `¥${perPerson.toFixed(2)}`;

        if (breakdownEl) {
            const entries = Object.entries(categoryTotal).sort((a, b) => b[1] - a[1]);
            if (entries.length === 0) {
                breakdownEl.innerHTML = EmptyState.render('暂无数据');
            } else {
                breakdownEl.innerHTML = entries.map(([cat, total]) => {
                    const category = BILL_CATEGORIES[cat] || BILL_CATEGORIES.other;
                    const pct = monthTotal > 0 ? ((total / monthTotal) * 100).toFixed(1) : 0;
                    return `
                        <div class="category-breakdown-item">
                            <span class="category-label">${category.emoji} ${category.name}</span>
                            <div class="category-bar-bg">
                                <div class="category-bar" style="width: ${pct}%"></div>
                            </div>
                            <span class="category-amount">¥${total.toFixed(2)}</span>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    updateBillFilters() {
        const catSelect = document.getElementById('billFilterCategory');
        const memSelect = document.getElementById('billFilterMember');
        if (catSelect) {
            const currentCat = catSelect.value;
            catSelect.innerHTML = '<option value="all">全部类别</option>' +
                Object.entries(BILL_CATEGORIES).map(([k, v]) =>
                    `<option value="${k}">${v.emoji} ${v.name}</option>`
                ).join('');
            catSelect.value = currentCat;
        }
        if (memSelect) {
            const currentMem = memSelect.value;
            const members = this.memberService.getAll();
            memSelect.innerHTML = '<option value="all">全部成员</option>' +
                members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
            memSelect.value = currentMem;
        }
    }

    showAddModal(prefill = null) {
        const members = this.memberService.getAll();
        if (members.length === 0) {
            this.toast.show('请先添加成员');
            return;
        }
        this._currentEvidenceBase64 = null;
        this.modal.open('添加账单', FormField.billForm(members, null, prefill));
        this._bindFileUpload();
    }

    showAddModalWithPrefill(prefill) {
        this.showAddModal(prefill);
    }

    showEditModal(billId) {
        const bill = this.billService.getById(billId);
        if (!bill) return;
        const members = this.memberService.getAll();
        this._currentEvidenceBase64 = bill.evidence;
        this.modal.open('编辑账单', FormField.billForm(members, bill));
        this._bindFileUpload();
    }

    _bindFileUpload() {
        const fileInput = document.getElementById('billEvidence');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                        this.toast.show('文件大小不能超过5MB');
                        e.target.value = '';
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        this._currentEvidenceBase64 = ev.target.result;
                        const preview = document.getElementById('evidencePreview');
                        if (preview) {
                            preview.innerHTML = `<img src="${this._currentEvidenceBase64}" class="evidence-preview-img" alt="账单依据预览">`;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    saveBill(event) {
        event.preventDefault();
        const editId = document.getElementById('billEditId')?.value;
        const category = document.getElementById('billCategory').value;
        const amount = document.getElementById('billAmount').value;
        const payerId = document.getElementById('billPayer').value;
        const dateStr = document.getElementById('billDate').value;
        const note = document.getElementById('billNote').value.trim();
        const date = new Date(dateStr).getTime();

        const inventoryItemId = document.getElementById('billInventoryPrefill')?.value || '';
        const inventoryQty = document.getElementById('billInventoryQty')?.value || '';

        const sharedCheckboxes = document.querySelectorAll('input[name="billSharedBy"]:checked');
        const sharedBy = Array.from(sharedCheckboxes).map(cb => cb.value);

        if (!amount || parseFloat(amount) <= 0) {
            this.toast.show('请输入有效金额');
            return;
        }
        if (sharedBy.length === 0) {
            this.toast.show('请至少选择一个分摊成员');
            return;
        }

        const data = {
            category,
            amount: parseFloat(amount),
            payerId,
            date,
            note,
            evidence: this._currentEvidenceBase64,
            sharedBy
        };

        let billId = editId;
        if (editId) {
            this.billService.update(editId, data);
            this.toast.show('账单已更新');
        } else {
            const bill = this.billService.add(data);
            billId = bill.id;
            this.toast.show('账单已添加');
        }

        if (!editId && inventoryItemId && this._onBillSavedCallback) {
            this._onBillSavedCallback(billId, inventoryItemId, inventoryQty);
        }

        this.modal.close();
    }

    deleteBill(billId) {
        if (!confirm('确定要删除这条账单吗？')) return;
        this.billService.delete(billId);
        this.toast.show('账单已删除');
    }

    settleBill(billId) {
        this.billService.markSettled(billId);
        this.toast.show('账单已结清');
    }

    settleOneSettlement(settlementId) {
        this.billService.markSettlementDone(settlementId);
        this.toast.show('已标记转账完成');
    }

    settleAllBills() {
        if (!confirm('确定将所有未结清账单标记为已结清吗？')) return;
        this.billService.markAllSettled();
        this.toast.show('所有账单已结清');
    }

    settleAllSettlements() {
        if (!confirm('确定将所有分摊转账标记为已结清吗？')) return;
        this.billService.markAllSettlementsDone();
        this.toast.show('所有分摊已结清');
    }

    viewBillEvidence(billId) {
        const bill = this.billService.getById(billId);
        if (!bill || !bill.evidence) return;
        const category = BILL_CATEGORIES[bill.category] || BILL_CATEGORIES.other;
        this.modal.open(`账单依据 - ${category.name}`, `
            <div class="evidence-view">
                <img src="${bill.evidence}" class="evidence-full-img" alt="账单依据">
                <p class="evidence-info">${category.name} · ¥${bill.amount.toFixed(2)}</p>
            </div>
        `);
    }
}
