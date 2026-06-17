import { generateId } from '../utils/helpers.js';
import { INVENTORY_CATEGORIES } from '../utils/constants.js';

export class InventoryService {
    constructor(store) {
        this.store = store;
    }

    getAllItems() {
        return this.store.get('inventoryItems') || [];
    }

    getItemById(id) {
        return this.getAllItems().find(i => i.id === id);
    }

    getItemsByCategory(category) {
        if (!category || category === 'all') return this.getAllItems();
        return this.getAllItems().filter(i => i.category === category);
    }

    getLowStockItems(threshold) {
        return this.getAllItems().filter(item =>
            item.stock <= (typeof threshold === 'number' ? threshold : item.threshold)
        );
    }

    addItem(data) {
        const item = {
            id: generateId(),
            name: data.name,
            category: data.category,
            unit: data.unit || '个',
            stock: parseInt(data.stock) || 0,
            threshold: parseInt(data.threshold) || 5,
            estimatedPrice: parseFloat(data.estimatedPrice) || 0,
            note: data.note || '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.store.update('inventoryItems', list => [...(list || []), item]);
        this._addLog({
            itemId: item.id,
            itemName: item.name,
            type: 'adjust',
            quantity: item.stock,
            note: '初始化库存'
        });
        return item;
    }

    updateItem(id, data) {
        const item = this.getItemById(id);
        if (!item) return null;
        const oldStock = item.stock;
        const updated = { ...item, ...data, updatedAt: Date.now() };
        if (data.stock !== undefined && parseInt(data.stock) !== oldStock) {
            const diff = parseInt(data.stock) - oldStock;
            this._addLog({
                itemId: id,
                itemName: updated.name,
                type: 'adjust',
                quantity: Math.abs(diff),
                note: diff > 0 ? `手动调整 +${diff}` : `手动调整 ${diff}`
            });
        }
        this.store.update('inventoryItems', list =>
            (list || []).map(i => i.id === id ? updated : i)
        );
        return updated;
    }

    deleteItem(id) {
        this.store.update('inventoryItems', list => (list || []).filter(i => i.id !== id));
        this.store.update('inventoryLogs', list => (list || []).filter(l => l.itemId !== id));
    }

    consume(id, quantity, note) {
        const qty = parseInt(quantity) || 1;
        const item = this.getItemById(id);
        if (!item) return null;
        const newStock = Math.max(0, item.stock - qty);
        const actualQty = item.stock - newStock;
        if (actualQty <= 0) return item;
        this.store.update('inventoryItems', list =>
            (list || []).map(i => i.id === id ? { ...i, stock: newStock, updatedAt: Date.now() } : i)
        );
        this._addLog({
            itemId: id,
            itemName: item.name,
            type: 'consume',
            quantity: actualQty,
            note: note || ''
        });
        return { ...item, stock: newStock };
    }

    restock(id, quantity, note) {
        const qty = parseInt(quantity) || 1;
        const item = this.getItemById(id);
        if (!item) return null;
        const newStock = item.stock + qty;
        this.store.update('inventoryItems', list =>
            (list || []).map(i => i.id === id ? { ...i, stock: newStock, updatedAt: Date.now() } : i)
        );
        this._addLog({
            itemId: id,
            itemName: item.name,
            type: 'restock',
            quantity: qty,
            note: note || ''
        });
        return { ...item, stock: newStock };
    }

    purchase(id, quantity, billId, note) {
        const qty = parseInt(quantity) || 1;
        const item = this.getItemById(id);
        if (!item) return null;
        const newStock = item.stock + qty;
        this.store.update('inventoryItems', list =>
            (list || []).map(i => i.id === id ? { ...i, stock: newStock, updatedAt: Date.now() } : i)
        );
        this._addLog({
            itemId: id,
            itemName: item.name,
            type: 'purchase',
            quantity: qty,
            billId: billId,
            note: note || '购买补货'
        });
        return { ...item, stock: newStock };
    }

    getAllLogs() {
        return this.store.get('inventoryLogs') || [];
    }

    getLogsByItem(itemId) {
        return this.getAllLogs().filter(l => l.itemId === itemId);
    }

    getRecentLogs(limit) {
        return [...this.getAllLogs()]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit || 50);
    }

    _addLog(data) {
        const log = {
            id: generateId(),
            itemId: data.itemId,
            itemName: data.itemName,
            type: data.type,
            quantity: data.quantity,
            note: data.note || '',
            billId: data.billId || null,
            createdAt: Date.now()
        };
        this.store.update('inventoryLogs', list => [log, ...(list || [])].slice(0, 500));
    }

    generateSampleItems() {
        return [
            {
                id: generateId(),
                name: '卷纸',
                category: 'paper',
                unit: '卷',
                stock: 12,
                threshold: 6,
                estimatedPrice: 3.5,
                note: '卫生间使用',
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 2
            },
            {
                id: generateId(),
                name: '抽纸',
                category: 'paper',
                unit: '包',
                stock: 3,
                threshold: 4,
                estimatedPrice: 5,
                note: '客厅/厨房备用',
                createdAt: Date.now() - 86400000 * 8,
                updatedAt: Date.now() - 86400000
            },
            {
                id: generateId(),
                name: '洗洁精',
                category: 'cleaning',
                unit: '瓶',
                stock: 1,
                threshold: 2,
                estimatedPrice: 15,
                note: '厨房洗碗',
                createdAt: Date.now() - 86400000 * 15,
                updatedAt: Date.now() - 86400000 * 3
            },
            {
                id: generateId(),
                name: '洗衣液',
                category: 'cleaning',
                unit: '瓶',
                stock: 2,
                threshold: 1,
                estimatedPrice: 25,
                note: '',
                createdAt: Date.now() - 86400000 * 20,
                updatedAt: Date.now() - 86400000 * 5
            },
            {
                id: generateId(),
                name: '垃圾袋',
                category: 'grocery',
                unit: '卷',
                stock: 8,
                threshold: 5,
                estimatedPrice: 8,
                note: '大号',
                createdAt: Date.now() - 86400000 * 6,
                updatedAt: Date.now() - 86400000
            }
        ];
    }

    generateSampleLogs(items) {
        const logs = [];
        const types = ['consume', 'restock'];
        items.forEach(item => {
            const logCount = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < logCount; i++) {
                const type = types[Math.floor(Math.random() * types.length)];
                const qty = 1 + Math.floor(Math.random() * 3);
                logs.push({
                    id: generateId(),
                    itemId: item.id,
                    itemName: item.name,
                    type,
                    quantity: qty,
                    note: type === 'consume' ? `日常消耗 -${qty}` : `补充库存 +${qty}`,
                    billId: null,
                    createdAt: Date.now() - 86400000 * (i + 1) * (0.5 + Math.random())
                });
            }
        });
        return logs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 500);
    }
}
