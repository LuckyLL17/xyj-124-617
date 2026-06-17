import { generateId } from '../utils/helpers.js';
import { INVENTORY_CATEGORIES } from '../utils/constants.js';

/**
 * 物品库存服务类
 * 负责管理公共物品的库存数据，包括物品增删改查、库存变动记录、低库存检测等
 */
export class InventoryService {
    /**
     * 构造函数
     * @param {Store} store - 数据存储实例
     */
    constructor(store) {
        this.store = store;
    }

    /**
     * 获取所有库存物品
     * @returns {Array} 物品列表
     */
    getAllItems() {
        return this.store.get('inventoryItems') || [];
    }

    /**
     * 根据ID获取指定物品
     * @param {string} id - 物品ID
     * @returns {Object|null} 物品对象，找不到则返回null
     */
    getItemById(id) {
        return this.getAllItems().find(i => i.id === id);
    }

    /**
     * 按分类获取物品
     * @param {string} category - 分类标识，'all' 表示全部分类
     * @returns {Array} 分类下的物品列表
     */
    getItemsByCategory(category) {
        if (!category || category === 'all') return this.getAllItems();
        return this.getAllItems().filter(i => i.category === category);
    }

    /**
     * 获取低库存物品列表
     * @param {number} [threshold] - 可选的自定义阈值，不传则使用物品自身的阈值
     * @returns {Array} 低库存物品列表
     */
    getLowStockItems(threshold) {
        return this.getAllItems().filter(item =>
            item.stock <= (typeof threshold === 'number' ? threshold : item.threshold)
        );
    }

    /**
     * 添加新物品
     * @param {Object} data - 物品数据
     * @param {string} data.name - 物品名称
     * @param {string} data.category - 物品分类
     * @param {string} [data.unit='个'] - 计量单位
     * @param {number} [data.stock=0] - 初始库存
     * @param {number} [data.threshold=5] - 低库存提醒阈值
     * @param {number} [data.estimatedPrice=0] - 预估单价
     * @param {string} [data.note=''] - 备注
     * @param {string} [operatorId] - 操作人ID
     * @param {string} [operatorName] - 操作人姓名
     * @returns {Object} 新创建的物品对象
     */
    addItem(data, operatorId, operatorName) {
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
        // 记录初始化库存日志
        this._addLog({
            itemId: item.id,
            itemName: item.name,
            type: 'adjust',
            quantity: item.stock,
            note: '初始化库存',
            operatorId: operatorId || null,
            operatorName: operatorName || ''
        });
        return item;
    }

    /**
     * 更新物品信息
     * @param {string} id - 物品ID
     * @param {Object} data - 要更新的数据
     * @param {string} [operatorId] - 操作人ID
     * @param {string} [operatorName] - 操作人姓名
     * @returns {Object|null} 更新后的物品对象，找不到则返回null
     */
    updateItem(id, data, operatorId, operatorName) {
        const item = this.getItemById(id);
        if (!item) return null;
        const oldStock = item.stock;
        const updated = { ...item, ...data, updatedAt: Date.now() };
        // 如果库存发生变化，记录调整日志
        if (data.stock !== undefined && parseInt(data.stock) !== oldStock) {
            const diff = parseInt(data.stock) - oldStock;
            this._addLog({
                itemId: id,
                itemName: updated.name,
                type: 'adjust',
                quantity: Math.abs(diff),
                note: diff > 0 ? `手动调整 +${diff}` : `手动调整 ${diff}`,
                operatorId: operatorId || null,
                operatorName: operatorName || ''
            });
        }
        this.store.update('inventoryItems', list =>
            (list || []).map(i => i.id === id ? updated : i)
        );
        return updated;
    }

    /**
     * 删除物品及其相关变动记录
     * @param {string} id - 物品ID
     */
    deleteItem(id) {
        this.store.update('inventoryItems', list => (list || []).filter(i => i.id !== id));
        this.store.update('inventoryLogs', list => (list || []).filter(l => l.itemId !== id));
    }

    /**
     * 消耗物品库存
     * @param {string} id - 物品ID
     * @param {number} quantity - 消耗数量
     * @param {string} [note=''] - 备注说明
     * @param {string} [operatorId] - 操作人ID
     * @param {string} [operatorName] - 操作人姓名
     * @returns {Object|null} 更新后的物品对象，找不到则返回null
     */
    consume(id, quantity, note, operatorId, operatorName) {
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
            note: note || '',
            operatorId: operatorId || null,
            operatorName: operatorName || ''
        });
        return { ...item, stock: newStock };
    }

    /**
     * 补充物品库存（快捷补货，不关联账单）
     * @param {string} id - 物品ID
     * @param {number} quantity - 补货数量
     * @param {string} [note=''] - 备注说明
     * @param {string} [operatorId] - 操作人ID
     * @param {string} [operatorName] - 操作人姓名
     * @returns {Object|null} 更新后的物品对象，找不到则返回null
     */
    restock(id, quantity, note, operatorId, operatorName) {
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
            note: note || '',
            operatorId: operatorId || null,
            operatorName: operatorName || ''
        });
        return { ...item, stock: newStock };
    }

    /**
     * 购买补货（关联账单）
     * @param {string} id - 物品ID
     * @param {number} quantity - 购买数量
     * @param {string} billId - 关联的账单ID
     * @param {string} [note='购买补货'] - 备注说明
     * @param {string} [operatorId] - 操作人ID
     * @param {string} [operatorName] - 操作人姓名
     * @returns {Object|null} 更新后的物品对象，找不到则返回null
     */
    purchase(id, quantity, billId, note, operatorId, operatorName) {
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
            note: note || '购买补货',
            operatorId: operatorId || null,
            operatorName: operatorName || ''
        });
        return { ...item, stock: newStock };
    }

    /**
     * 获取所有库存变动日志
     * @returns {Array} 日志列表
     */
    getAllLogs() {
        return this.store.get('inventoryLogs') || [];
    }

    /**
     * 获取指定物品的变动记录
     * @param {string} itemId - 物品ID
     * @returns {Array} 该物品的变动日志列表
     */
    getLogsByItem(itemId) {
        return this.getAllLogs().filter(l => l.itemId === itemId);
    }

    /**
     * 获取最近的变动记录
     * @param {number} [limit=50] - 返回记录数量限制
     * @returns {Array} 最近的变动日志列表
     */
    getRecentLogs(limit) {
        return [...this.getAllLogs()]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit || 50);
    }

    /**
     * 添加一条库存变动日志（内部方法）
     * @private
     * @param {Object} data - 日志数据
     * @param {string} data.itemId - 物品ID
     * @param {string} data.itemName - 物品名称
     * @param {string} data.type - 变动类型：consume/restock/adjust/purchase
     * @param {number} data.quantity - 变动数量
     * @param {string} [data.note=''] - 备注
     * @param {string} [data.billId=null] - 关联账单ID
     * @param {string} [data.operatorId=null] - 操作人ID
     * @param {string} [data.operatorName=''] - 操作人姓名
     */
    _addLog(data) {
        const log = {
            id: generateId(),
            itemId: data.itemId,
            itemName: data.itemName,
            type: data.type,
            quantity: data.quantity,
            note: data.note || '',
            billId: data.billId || null,
            operatorId: data.operatorId || null,
            operatorName: data.operatorName || '',
            createdAt: Date.now()
        };
        // 最多保留500条日志记录
        this.store.update('inventoryLogs', list => [log, ...(list || [])].slice(0, 500));
    }

    /**
     * 生成示例物品数据
     * @returns {Array} 示例物品列表
     */
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

    /**
     * 生成示例变动日志数据
     * @param {Array} items - 物品列表
     * @param {Array} [members=[]] - 成员列表，用于填充操作人
     * @returns {Array} 示例日志列表
     */
    generateSampleLogs(items, members = []) {
        const logs = [];
        const types = ['consume', 'restock'];
        items.forEach(item => {
            const logCount = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < logCount; i++) {
                const type = types[Math.floor(Math.random() * types.length)];
                const qty = 1 + Math.floor(Math.random() * 3);
                // 随机选择一个成员作为操作人
                const operator = members.length > 0
                    ? members[Math.floor(Math.random() * members.length)]
                    : null;
                logs.push({
                    id: generateId(),
                    itemId: item.id,
                    itemName: item.name,
                    type,
                    quantity: qty,
                    note: type === 'consume' ? `日常消耗 -${qty}` : `补充库存 +${qty}`,
                    billId: null,
                    operatorId: operator ? operator.id : null,
                    operatorName: operator ? operator.name : '',
                    createdAt: Date.now() - 86400000 * (i + 1) * (0.5 + Math.random())
                });
            }
        });
        return logs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 500);
    }
}
