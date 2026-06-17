import { INVENTORY_CATEGORIES, INVENTORY_LOG_TYPES } from '../utils/constants.js';
import { formatDateTime } from '../utils/helpers.js';
import { EmptyState } from '../components/EmptyState.js';
import { FormField } from '../components/FormField.js';

export class InventoryModule {
    constructor(store, inventoryService, memberService, billsModule, modal, toast) {
        this.store = store;
        this.inventoryService = inventoryService;
        this.memberService = memberService;
        this.billsModule = billsModule;
        this.modal = modal;
        this.toast = toast;
    }

    render() {
        this.renderSummary();
        this.renderLowStockAlert();
        this.renderItems();
        this.renderLogs();
        this.updateFilters();
    }

    renderSummary() {
        const items = this.inventoryService.getAllItems();
        const lowStock = this.inventoryService.getLowStockItems();
        const totalValue = items.reduce((sum, i) => sum + i.stock * i.estimatedPrice, 0);
        const totalStock = items.reduce((sum, i) => sum + i.stock, 0);

        const grid = document.querySelector('#inventory .stats-grid');
        if (!grid) return;
        grid.innerHTML = [
            this._statCard('📦', '物品种类', items.length, '当前库存物品数', 'inv-cat-icon'),
            this._statCard('🔢', '总库存量', totalStock, '所有物品合计', 'inv-total-icon'),
            this._statCard('⚠️', '库存不足', lowStock.length, '需要补货数量', 'inv-low-icon'),
            this._statCard('💰', '预估价值', `¥${totalValue.toFixed(0)}`, '库存总估值', 'inv-value-icon')
        ].join('');
    }

    _statCard(emoji, title, value, label, iconClass) {
        return `
            <div class="stat-card">
                <div class="stat-icon ${iconClass}">${emoji}</div>
                <div class="stat-info">
                    <h3>${title}</h3>
                    <p class="stat-value">${value}</p>
                    <p class="stat-label">${label}</p>
                </div>
            </div>
        `;
    }

    renderLowStockAlert() {
        const container = document.getElementById('lowStockAlert');
        if (!container) return;
        const lowStock = this.inventoryService.getLowStockItems();

        if (lowStock.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="low-stock-banner">
                <div class="low-stock-icon">⚠️</div>
                <div class="low-stock-content">
                    <strong>库存提醒：</strong>
                    以下物品库存不足，请及时补货：
                    <div class="low-stock-items">
                        ${lowStock.map(item => {
                            const cat = INVENTORY_CATEGORIES[item.category] || INVENTORY_CATEGORIES.other;
                            return `
                                <span class="low-stock-tag" onclick="window._app.showInventoryPurchaseModal('${item.id}')">
                                    ${cat.emoji} ${item.name}（${item.stock}/${item.threshold} ${item.unit}）
                                </span>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderItems() {
        const container = document.getElementById('inventoryItems');
        if (!container) return;

        const filterCategory = document.getElementById('invFilterCategory')?.value || 'all';
        const filterStock = document.getElementById('invFilterStock')?.value || 'all';
        const search = (document.getElementById('invSearch')?.value || '').toLowerCase().trim();

        let items = this.inventoryService.getAllItems();

        if (filterCategory !== 'all') {
            items = items.filter(i => i.category === filterCategory);
        }
        if (filterStock === 'low') {
            items = items.filter(i => i.stock <= i.threshold);
        } else if (filterStock === 'normal') {
            items = items.filter(i => i.stock > i.threshold);
        } else if (filterStock === 'empty') {
            items = items.filter(i => i.stock === 0);
        }
        if (search) {
            items = items.filter(i =>
                i.name.toLowerCase().includes(search) ||
                (i.note && i.note.toLowerCase().includes(search))
            );
        }

        if (items.length === 0) {
            container.innerHTML = EmptyState.render('暂无物品，点击右上角添加');
            return;
        }

        container.innerHTML = items.map(item => {
            const category = INVENTORY_CATEGORIES[item.category] || INVENTORY_CATEGORIES.other;
            const isLow = item.stock <= item.threshold;
            const isEmpty = item.stock === 0;
            const stockPercent = item.threshold > 0 ? Math.min(100, (item.stock / (item.threshold * 2)) * 100) : 50;
            const stockColor = isEmpty ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)';

            return `
                <div class="inv-item-card ${isEmpty ? 'inv-empty' : isLow ? 'inv-low' : ''}">
                    <div class="inv-item-header">
                        <div class="inv-item-icon" style="background: ${this._categoryBg(item.category)}">${category.emoji}</div>
                        <div class="inv-item-info">
                            <div class="inv-item-name-row">
                                <h4 class="inv-item-name">${item.name}</h4>
                                ${isEmpty ? '<span class="inv-badge inv-badge-danger">缺货</span>' : isLow ? '<span class="inv-badge inv-badge-warning">库存不足</span>' : ''}
                            </div>
                            <p class="inv-item-meta">${category.name} · ${item.unit} · 阈值 ${item.threshold}</p>
                            ${item.note ? `<p class="inv-item-note">${item.note}</p>` : ''}
                        </div>
                    </div>
                    <div class="inv-item-stock-row">
                        <div class="inv-stock-display">
                            <span class="inv-stock-value" style="color: ${stockColor}">${item.stock}</span>
                            <span class="inv-stock-unit">${item.unit}</span>
                        </div>
                        <div class="inv-stock-bar-bg">
                            <div class="inv-stock-bar" style="width: ${stockPercent}%; background: ${stockColor};"></div>
                        </div>
                    </div>
                    ${item.estimatedPrice > 0 ? `<div class="inv-item-price">预估 ¥${item.estimatedPrice.toFixed(2)}/${item.unit}</div>` : ''}
                    <div class="inv-item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="window._app.showInventoryConsumeModal('${item.id}')" title="消耗">
                            ➖ 消耗
                        </button>
                        <button class="btn btn-sm btn-success" onclick="window._app.showInventoryRestockModal('${item.id}')" title="补货">
                            ➕ 补货
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="window._app.showInventoryPurchaseModal('${item.id}')" title="购买">
                            🛒 购买
                        </button>
                    </div>
                    <div class="inv-item-subactions">
                        <button class="inv-sub-btn" onclick="window._app.showInventoryItemLogs('${item.id}')" title="变动记录">📋 记录</button>
                        <button class="inv-sub-btn" onclick="window._app.editInventoryItem('${item.id}')" title="编辑">✏️ 编辑</button>
                        <button class="inv-sub-btn inv-sub-danger" onclick="window._app.deleteInventoryItem('${item.id}')" title="删除">🗑️ 删除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    _categoryBg(category) {
        const map = {
            paper: '#dbeafe',
            cleaning: '#d1fae5',
            grocery: '#fef3c7',
            kitchen: '#fed7aa',
            appliance: '#ede9fe',
            other: '#e2e8f0'
        };
        return map[category] || map.other;
    }

    renderLogs() {
        const container = document.getElementById('inventoryLogs');
        if (!container) return;

        const filterItem = document.getElementById('invLogItemFilter')?.value || 'all';
        const filterType = document.getElementById('invLogTypeFilter')?.value || 'all';

        let logs = filterItem !== 'all'
            ? this.inventoryService.getLogsByItem(filterItem)
            : this.inventoryService.getRecentLogs(100);

        if (filterType !== 'all') {
            logs = logs.filter(l => l.type === filterType);
        }

        if (logs.length === 0) {
            container.innerHTML = EmptyState.render('暂无变动记录');
            return;
        }

        container.innerHTML = logs.map(log => {
            const type = INVENTORY_LOG_TYPES[log.type] || INVENTORY_LOG_TYPES.adjust;
            return `
                <div class="inv-log-item">
                    <div class="inv-log-type-icon" style="background: ${type.color}20; color: ${type.color}">
                        ${type.emoji}
                    </div>
                    <div class="inv-log-content">
                        <p class="inv-log-text">
                            <strong>${log.itemName}</strong>
                            <span class="inv-log-qty" style="color: ${type.color}">
                                ${type.emoji} ${log.type === 'consume' ? '-' : '+'}${log.quantity}
                            </span>
                            ${type.name}
                        </p>
                        ${log.note ? `<p class="inv-log-note">${log.note}</p>` : ''}
                        ${log.billId ? `<p class="inv-log-bill" onclick="window._app.scrollToBill('${log.billId}')">📎 关联账单</p>` : ''}
                        <span class="inv-log-time">${formatDateTime(log.createdAt)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateFilters() {
        const catSelect = document.getElementById('invFilterCategory');
        const itemSelect = document.getElementById('invLogItemFilter');
        if (catSelect) {
            const current = catSelect.value;
            catSelect.innerHTML = '<option value="all">全部分类</option>' +
                Object.entries(INVENTORY_CATEGORIES).map(([k, v]) =>
                    `<option value="${k}">${v.emoji} ${v.name}</option>`
                ).join('');
            catSelect.value = current || 'all';
        }
        if (itemSelect) {
            const current = itemSelect.value;
            const items = this.inventoryService.getAllItems();
            itemSelect.innerHTML = '<option value="all">全部物品</option>' +
                items.map(i => {
                    const cat = INVENTORY_CATEGORIES[i.category] || INVENTORY_CATEGORIES.other;
                    return `<option value="${i.id}">${cat.emoji} ${i.name}</option>`;
                }).join('');
            itemSelect.value = current || 'all';
        }
    }

    showAddModal() {
        this.modal.open('添加物品', FormField.inventoryItemForm());
    }

    showEditModal(itemId) {
        const item = this.inventoryService.getItemById(itemId);
        if (!item) return;
        this.modal.open('编辑物品', FormField.inventoryItemForm(item));
    }

    showConsumeModal(itemId) {
        const item = this.inventoryService.getItemById(itemId);
        if (!item) return;
        if (item.stock <= 0) {
            this.toast.show('库存为空，请先补货');
            return;
        }
        this.modal.open('快捷消耗', FormField.inventoryQuantityForm(item, 'consume'));
    }

    showRestockModal(itemId) {
        const item = this.inventoryService.getItemById(itemId);
        if (!item) return;
        this.modal.open('快捷补货', FormField.inventoryQuantityForm(item, 'restock'));
    }

    showPurchaseModal(itemId) {
        const item = this.inventoryService.getItemById(itemId);
        if (!item) return;
        const members = this.memberService.getAll();
        if (members.length === 0) {
            this.toast.show('请先添加成员');
            return;
        }
        const category = INVENTORY_CATEGORIES[item.category] || INVENTORY_CATEGORIES.other;
        const qty = Math.max(1, (item.threshold * 2 - item.stock));
        const prefill = {
            category: category.billCategory,
            amount: (item.estimatedPrice * qty).toFixed(2),
            note: `购买 ${item.name} × ${qty} ${item.unit}`,
            inventoryItemId: item.id,
            inventoryQty: qty
        };
        this.billsModule.showAddModalWithPrefill(prefill);
    }

    showItemLogsModal(itemId) {
        const item = this.inventoryService.getItemById(itemId);
        if (!item) return;
        const logs = this.inventoryService.getLogsByItem(itemId).slice(0, 50);
        const content = logs.length === 0
            ? EmptyState.render('暂无变动记录')
            : logs.map(log => {
                const type = INVENTORY_LOG_TYPES[log.type] || INVENTORY_LOG_TYPES.adjust;
                return `
                    <div class="inv-log-item">
                        <div class="inv-log-type-icon" style="background: ${type.color}20; color: ${type.color}">
                            ${type.emoji}
                        </div>
                        <div class="inv-log-content">
                            <p class="inv-log-text">
                                <span class="inv-log-qty" style="color: ${type.color}">
                                    ${log.type === 'consume' ? '-' : '+'}${log.quantity}
                                </span>
                                ${type.name}
                            </p>
                            ${log.note ? `<p class="inv-log-note">${log.note}</p>` : ''}
                            <span class="inv-log-time">${formatDateTime(log.createdAt)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        this.modal.open(`📋 ${item.name} - 变动记录`, `<div class="inv-logs-modal">${content}</div>`);
    }

    saveItem(event, editId) {
        event.preventDefault();
        const data = {
            name: document.getElementById('invItemName').value.trim(),
            category: document.getElementById('invItemCategory').value,
            unit: document.getElementById('invItemUnit').value.trim(),
            stock: document.getElementById('invItemStock').value,
            threshold: document.getElementById('invItemThreshold').value,
            estimatedPrice: document.getElementById('invItemPrice').value,
            note: document.getElementById('invItemNote').value.trim()
        };
        if (!data.name) {
            this.toast.show('请输入物品名称');
            return;
        }
        if (editId) {
            this.inventoryService.updateItem(editId, data);
            this.toast.show('物品已更新');
        } else {
            this.inventoryService.addItem(data);
            this.toast.show('物品已添加');
        }
        this.modal.close();
    }

    deleteItem(itemId) {
        const item = this.inventoryService.getItemById(itemId);
        if (!item) return;
        if (!confirm(`确定要删除「${item.name}」吗？相关变动记录也将被删除。`)) return;
        this.inventoryService.deleteItem(itemId);
        this.toast.show('物品已删除');
    }

    handleAction(event, itemId, action) {
        event.preventDefault();
        const qty = parseInt(document.getElementById('invActionQty').value) || 0;
        const note = document.getElementById('invActionNote')?.value?.trim() || '';

        if (qty <= 0) {
            this.toast.show('请输入有效数量');
            return;
        }

        if (action === 'consume') {
            this.inventoryService.consume(itemId, qty, note);
            this.toast.show(`已消耗 ${qty}`);
            this.modal.close();
            const item = this.inventoryService.getItemById(itemId);
            if (item && item.stock <= item.threshold) {
                setTimeout(() => this.toast.show(`提醒：${item.name} 库存不足`), 500);
            }
        } else if (action === 'restock') {
            this.inventoryService.restock(itemId, qty, note);
            this.toast.show(`已补货 ${qty}`);
            this.modal.close();
        } else if (action === 'purchase') {
            const amount = parseFloat(document.getElementById('invActionAmount').value) || 0;
            if (amount <= 0) {
                this.toast.show('请输入有效金额');
                return;
            }
            const members = this.memberService.getAll();
            if (members.length === 0) {
                this.toast.show('请先添加成员');
                return;
            }
            const item = this.inventoryService.getItemById(itemId);
            const category = INVENTORY_CATEGORIES[item.category] || INVENTORY_CATEGORIES.other;
            const prefill = {
                category: category.billCategory,
                amount: amount.toFixed(2),
                note: note || `购买 ${item.name} × ${qty} ${item.unit}`,
                inventoryItemId: itemId,
                inventoryQty: qty
            };
            this.billsModule.showAddModalWithPrefill(prefill);
        }
    }

    onBillSaved(billId, inventoryItemId, inventoryQty) {
        if (inventoryItemId && inventoryQty) {
            this.inventoryService.purchase(inventoryItemId, inventoryQty, billId);
        }
    }
}
