import { generateId } from '../utils/helpers.js';

export class BillService {
    constructor(store) {
        this.store = store;
        this._refreshing = false;
    }

    getAll() {
        return this.store.get('bills') || [];
    }

    getById(id) {
        return this.getAll().find(b => b.id === id);
    }

    getByMonth(monthStart) {
        return this.getAll().filter(b => b.date >= monthStart);
    }

    getFiltered(filterCategory, filterMember, monthStart) {
        let filtered = this.getAll();
        if (monthStart) {
            filtered = filtered.filter(b => b.date >= monthStart);
        }
        if (filterCategory && filterCategory !== 'all') {
            filtered = filtered.filter(b => b.category === filterCategory);
        }
        if (filterMember && filterMember !== 'all') {
            filtered = filtered.filter(b => b.payerId === filterMember);
        }
        return filtered.sort((a, b) => b.date - a.date);
    }

    getMonthTotal(monthStart) {
        return this.getByMonth(monthStart).reduce((sum, b) => sum + b.amount, 0);
    }

    getCategoryTotal(monthStart) {
        const bills = this.getByMonth(monthStart);
        const result = {};
        bills.forEach(b => {
            if (!result[b.category]) result[b.category] = 0;
            result[b.category] += b.amount;
        });
        return result;
    }

    _calculateRawSettlement(members) {
        const bills = this.getAll().filter(b => !b.settled);
        if (bills.length === 0 || members.length === 0) return [];

        const memberIds = members.map(m => m.id);
        const balances = {};
        memberIds.forEach(id => { balances[id] = 0; });

        bills.forEach(bill => {
            const sharedBy = bill.sharedBy && bill.sharedBy.length > 0
                ? bill.sharedBy.filter(id => memberIds.includes(id))
                : memberIds;

            if (sharedBy.length === 0) return;

            const perShare = Math.round((bill.amount / sharedBy.length) * 100) / 100;

            sharedBy.forEach(id => {
                balances[id] -= perShare;
            });

            balances[bill.payerId] += bill.amount;
        });

        const debtors = [];
        const creditors = [];
        Object.entries(balances).forEach(([memberId, balance]) => {
            const member = members.find(m => m.id === memberId);
            if (!member) return;
            const rounded = Math.round(balance * 100) / 100;
            if (rounded < -0.01) {
                debtors.push({ memberId, name: member.name, amount: Math.abs(rounded) });
            } else if (rounded > 0.01) {
                creditors.push({ memberId, name: member.name, amount: rounded });
            }
        });

        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        const raw = [];
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const payAmount = Math.min(debtors[i].amount, creditors[j].amount);
            if (payAmount > 0.01) {
                raw.push({
                    from: debtors[i].name,
                    fromId: debtors[i].memberId,
                    to: creditors[j].name,
                    toId: creditors[j].memberId,
                    amount: Math.round(payAmount * 100) / 100
                });
            }
            debtors[i].amount -= payAmount;
            creditors[j].amount -= payAmount;
            if (debtors[i].amount < 0.01) i++;
            if (creditors[j].amount < 0.01) j++;
        }
        return raw;
    }

    getSettlements() {
        return this.store.get('settlements') || [];
    }

    refreshSettlements(members) {
        if (this._refreshing) {
            return this.getSettlements();
        }
        this._refreshing = true;
        try {
            const raw = this._calculateRawSettlement(members);
            const existing = this.getSettlements();

            const matches = (s, r) =>
                s.fromId === r.fromId && s.toId === r.toId &&
                Math.abs(s.amount - r.amount) < 0.01;

            const usedIds = new Set();
            const result = [];
            raw.forEach(r => {
                const found = existing.find(s => matches(s, r));
                if (found) {
                    result.push(found);
                    usedIds.add(found.id);
                } else {
                    result.push({
                        id: generateId(),
                        ...r,
                        settled: false,
                        createdAt: Date.now()
                    });
                }
            });

            existing.filter(s => s.settled && !usedIds.has(s.id)).forEach(s => {
                result.push(s);
            });

            const isSame = existing.length === result.length &&
                existing.every(s => {
                    const r = result.find(x => x.id === s.id);
                    return r && r.settled === s.settled && Math.abs(r.amount - s.amount) < 0.01;
                });
            if (!isSame) {
                this.store.set('settlements', result);
            }
            return result;
        } finally {
            this._refreshing = false;
        }
    }

    calculateSettlement(members) {
        const raw = this._calculateRawSettlement(members);
        const existing = this.getSettlements();

        const matches = (s, r) =>
            s.fromId === r.fromId && s.toId === r.toId &&
            Math.abs(s.amount - r.amount) < 0.01;

        const result = [];
        raw.forEach(r => {
            const found = existing.find(s => !s.settled && matches(s, r));
            result.push(found || {
                id: '__tmp__' + r.fromId + '_' + r.toId + '_' + r.amount,
                ...r,
                settled: false
            });
        });

        existing.filter(s => s.settled).forEach(s => {
            if (!result.find(r => r.id === s.id)) {
                result.push(s);
            }
        });

        return result;
    }

    markSettlementDone(settlementId) {
        this.store.update('settlements', list =>
            (list || []).map(s => s.id === settlementId ? { ...s, settled: true, settledAt: Date.now() } : s)
        );
    }

    markAllSettlementsDone() {
        this.store.update('settlements', list =>
            (list || []).map(s => ({ ...s, settled: true, settledAt: Date.now() }))
        );
    }

    resetSettlements() {
        this.store.set('settlements', []);
    }

    add(data) {
        const bill = {
            id: generateId(),
            category: data.category,
            amount: parseFloat(data.amount),
            payerId: data.payerId,
            date: data.date,
            note: data.note || '',
            evidence: data.evidence || null,
            sharedBy: data.sharedBy && data.sharedBy.length > 0 ? data.sharedBy : [],
            settled: false,
            createdAt: Date.now()
        };
        this.store.update('bills', bills => [...(bills || []), bill]);
        return bill;
    }

    update(id, data) {
        this.store.update('bills', bills =>
            (bills || []).map(b => b.id === id ? { ...b, ...data } : b)
        );
    }

    delete(id) {
        this.store.update('bills', bills => (bills || []).filter(b => b.id !== id));
    }

    markSettled(id) {
        this.update(id, { settled: true });
    }

    markAllSettled() {
        this.store.update('bills', bills =>
            (bills || []).map(b => ({ ...b, settled: true }))
        );
    }

    getUnsettledTotal() {
        return this.getAll().filter(b => !b.settled).reduce((sum, b) => sum + b.amount, 0);
    }

    getSettledTotal() {
        return this.getAll().filter(b => b.settled).reduce((sum, b) => sum + b.amount, 0);
    }

    deleteSettlementsByMember(memberId) {
        this.store.update('settlements', list =>
            (list || []).filter(s => s.fromId !== memberId && s.toId !== memberId)
        );
    }
}
