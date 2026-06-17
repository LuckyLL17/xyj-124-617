import { AVATAR_COLORS, BILL_CATEGORIES, INVENTORY_CATEGORIES, TASK_COLORS } from '../utils/constants.js';
import { getTodayStr } from '../utils/helpers.js';

export class FormField {
    static text(id, label, options = {}) {
        const { required, placeholder, value, maxlength } = options;
        return `
            <div class="form-group">
                <label>${label}</label>
                <input type="text" id="${id}" ${required ? 'required' : ''} ${placeholder ? `placeholder="${placeholder}"` : ''} ${value ? `value="${value}"` : ''} ${maxlength ? `maxlength="${maxlength}"` : ''}>
            </div>
        `;
    }

    static date(id, label, options = {}) {
        const { required, min, value } = options;
        return `
            <div class="form-group">
                <label>${label}</label>
                <input type="date" id="${id}" ${required ? 'required' : ''} ${min ? `min="${min}"` : ''} ${value ? `value="${value}"` : ''}>
            </div>
        `;
    }

    static select(id, label, options, config = {}) {
        const { required } = config;
        const optionsHtml = options.map(o =>
            `<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`
        ).join('');
        return `
            <div class="form-group">
                <label>${label}</label>
                <select id="${id}" ${required ? 'required' : ''}>${optionsHtml}</select>
            </div>
        `;
    }

    static textarea(id, label, options = {}) {
        const { placeholder, value } = options;
        return `
            <div class="form-group">
                <label>${label}</label>
                <textarea id="${id}" ${placeholder ? `placeholder="${placeholder}"` : ''}>${value || ''}</textarea>
            </div>
        `;
    }

    static hint(text) {
        return `<p class="form-hint">${text}</p>`;
    }

    static actions(cancelBtn, submitBtn) {
        return `
            <div class="form-actions">
                ${cancelBtn}
                ${submitBtn}
            </div>
        `;
    }

    static typeSelect(id, selectedType, taskTypes) {
        const options = Object.entries(taskTypes).map(([key, val]) => ({
            value: key,
            label: `${val.emoji} ${val.name}`,
            selected: key === selectedType
        }));
        return FormField.select(id, '任务类型', options, { required: true });
    }

    static taskColorPicker(selectedColor) {
        return `
            <div class="form-group">
                <label>标签颜色</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${TASK_COLORS.map(color => `
                        <label style="cursor: pointer;">
                            <input type="radio" name="taskTypeColor" value="${color}" ${selectedColor === color ? 'checked' : ''} style="display: none;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: ${color}; border: 3px solid ${selectedColor === color ? 'var(--text-primary)' : 'transparent'}; transition: all 0.2s;"
                                onclick="this.previousElementSibling.checked = true; document.querySelectorAll('input[name=taskTypeColor]').forEach(r => { r.nextElementSibling.style.borderColor = r.checked ? 'var(--text-primary)' : 'transparent'; });"></div>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }

    static taskTypeForm(taskType = null) {
        return `
            <form onsubmit="window._app.handleSaveTaskType(event, '${taskType ? taskType.id : ''}')">
                ${FormField.text('taskTypeName', '任务名称', { required: true, placeholder: '如：倒垃圾', value: taskType ? taskType.name : '', maxlength: 20 })}
                ${FormField.text('taskTypeEmoji', '图标（Emoji）', { placeholder: '如：🗑️', value: taskType ? taskType.emoji : '', maxlength: 4 })}
                ${FormField.taskColorPicker(taskType ? taskType.color : '')}
                <div class="form-group">
                    <label>默认周期（天）</label>
                    <input type="number" id="taskTypeInterval" required min="1" step="1" placeholder="自动提醒间隔天数" value="${taskType ? taskType.defaultInterval : 3}">
                    <p class="form-hint">用于逾期提醒和自动轮班的间隔周期</p>
                </div>
                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    `<button type="submit" class="btn btn-primary">${taskType ? '保存' : '添加'}</button>`
                )}
            </form>
        `;
    }

    static memberSelect(id, members) {
        const options = members.map(m => ({
            value: m.id,
            label: m.name
        }));
        return FormField.select(id, '完成人', options, { required: true });
    }

    static colorPicker(selectedColor) {
        return `
            <div class="form-group">
                <label>头像颜色</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${AVATAR_COLORS.map(color => `
                        <label style="cursor: pointer;">
                            <input type="radio" name="memberColor" value="${color}" ${selectedColor === color ? 'checked' : ''} style="display: none;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: ${color}; border: 3px solid ${selectedColor === color ? 'var(--text-primary)' : 'transparent'}; transition: all 0.2s;"
                                onclick="this.previousElementSibling.checked = true; document.querySelectorAll('input[name=memberColor]').forEach(r => { r.nextElementSibling.style.borderColor = r.checked ? 'var(--text-primary)' : 'transparent'; });"></div>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }

    static recordForm(members, type, taskTypes) {
        const today = getTodayStr();
        const enabledTaskTypes = Object.fromEntries(
            Object.entries(taskTypes).filter(([, v]) => v.enabled !== false)
        );
        const firstKey = Object.keys(enabledTaskTypes)[0] || '';
        return `
            <form onsubmit="window._app.handleSaveRecord(event)">
                ${FormField.typeSelect('recordType', type || firstKey, enabledTaskTypes)}
                ${FormField.memberSelect('recordMember', members)}
                ${FormField.date('recordDate', '完成日期', { required: true, value: today })}
                ${FormField.textarea('recordNote', '备注（可选）', { placeholder: '补充说明...' })}
                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    '<button type="submit" class="btn btn-primary">保存</button>'
                )}
            </form>
        `;
    }

    static memberForm(member) {
        return `
            <form onsubmit="window._app.handleSaveMember(event, '${member ? member.id : ''}')">
                ${FormField.text('memberName', '姓名', { required: true, placeholder: '请输入姓名', value: member ? member.name : '' })}
                ${FormField.text('memberAvatar', '头像文字（1-2个字）', { maxlength: 2, placeholder: '如：小明 → 明', value: member ? member.avatar : '' })}
                ${FormField.hint('留空则自动取姓名首字')}
                ${FormField.colorPicker(member ? member.color : '')}
                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    `<button type="submit" class="btn btn-primary">${member ? '保存' : '添加'}</button>`
                )}
            </form>
        `;
    }

    static scheduleForm(members, taskTypes) {
        const today = getTodayStr();
        const enabledTaskTypes = Object.fromEntries(
            Object.entries(taskTypes).filter(([, v]) => v.enabled !== false)
        );
        const firstKey = Object.keys(enabledTaskTypes)[0] || '';
        return `
            <form onsubmit="window._app.handleSaveSchedule(event)">
                ${FormField.typeSelect('scheduleType', firstKey, enabledTaskTypes)}
                ${FormField.memberSelect('scheduleMember', members)}
                ${FormField.date('scheduleDate', '排定日期', { required: true, min: today, value: today })}
                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    '<button type="submit" class="btn btn-primary">添加</button>'
                )}
            </form>
        `;
    }

    static scheduleRuleForm(rule = null, taskTypes = {}, members = []) {
        const enabledTypes = Object.entries(taskTypes)
            .filter(([, v]) => v.enabled !== false)
            .map(([k, v]) => ({ value: k, label: v.emoji + ' ' + v.name, selected: rule && rule.taskTypeId === k }));
        if (enabledTypes.length === 0) enabledTypes.unshift({ value: '', label: '请先启用任务类型' });
        const firstTypeId = rule ? rule.taskTypeId : enabledTypes[0].value;
        const selectOptions = {};
        enabledTypes.forEach(function(o) {
            var name = o.label;
            if (name.length > 2) name = name.substring(2);
            selectOptions[o.value] = { name: name, emoji: '', enabled: true };
        });

        const memberCheckboxes = members.map(m => {
            const checked = rule && rule.memberOrder && rule.memberOrder.includes(m.id) ? 'checked' : '';
            return `
                <label class="member-checkbox" data-member-id="${m.id}" style="cursor: move;">
                    <input type="checkbox" name="ruleMember" value="${m.id}" ${checked}>
                    <span class="member-checkbox-label">${m.name}</span>
                    <span class="drag-handle">⋮⋮</span>
                </label>
            `;
        }).join('');

        const weekdays = [
            { val: 1, label: '一' }, { val: 2, label: '二' },
            { val: 3, label: '三' }, { val: 4, label: '四' },
            { val: 5, label: '五' }, { val: 6, label: '六' },
            { val: 0, label: '日' }
        ];
        const weekdayBtns = weekdays.map(w => {
            const checked = rule && rule.type === 'weekly' && rule.weekdays.includes(w.val) ? 'checked' : '';
            return `
                <label class="weekday-btn">
                    <input type="checkbox" name="ruleWeekday" value="${w.val}" ${checked}>
                    <span>${w.label}</span>
                </label>
            `;
        }).join('');

        const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);
        const monthDayBtns = monthDays.map(d => {
            const checked = rule && rule.type === 'monthly' && rule.monthDays.includes(d) ? 'checked' : '';
            return `
                <label class="monthday-btn">
                    <input type="checkbox" name="ruleMonthday" value="${d}" ${checked}>
                    <span>${d}</span>
                </label>
            `;
        }).join('');

        const today = getTodayStr();
        const startDateVal = rule ? new Date(rule.startDate).toISOString().split('T')[0] : today;

        return `
            <form onsubmit="window._app.handleSaveScheduleRule(event, '${rule ? rule.id : ''}')">
                ${FormField.typeSelect('ruleTaskType', firstTypeId, selectOptions)}

                <div class="form-group">
                    <label>循环规则类型</label>
                    <div class="rule-type-tabs">
                        <label class="rule-type-tab ${rule && rule.type === 'interval' ? 'active' : (!rule ? 'active' : '')}">
                            <input type="radio" name="ruleType" value="interval" ${(!rule || rule.type === 'interval') ? 'checked' : ''} onchange="window._app.toggleRuleTypeFields()">
                            <span>按间隔天数</span>
                        </label>
                        <label class="rule-type-tab ${rule && rule.type === 'weekly' ? 'active' : ''}">
                            <input type="radio" name="ruleType" value="weekly" ${rule && rule.type === 'weekly' ? 'checked' : ''} onchange="window._app.toggleRuleTypeFields()">
                            <span>按周循环</span>
                        </label>
                        <label class="rule-type-tab ${rule && rule.type === 'monthly' ? 'active' : ''}">
                            <input type="radio" name="ruleType" value="monthly" ${rule && rule.type === 'monthly' ? 'checked' : ''} onchange="window._app.toggleRuleTypeFields()">
                            <span>按月循环</span>
                        </label>
                    </div>
                </div>

                <div id="ruleIntervalFields" class="rule-type-fields" style="display: ${(!rule || rule.type === 'interval') ? 'block' : 'none'}">
                    <div class="form-group">
                        <label>间隔天数</label>
                        <input type="number" id="ruleIntervalDays" min="1" step="1" placeholder="如：3" value="${rule && rule.intervalDays || 3}">
                        <p class="form-hint">每隔 N 天重复一次</p>
                    </div>
                </div>

                <div id="ruleWeeklyFields" class="rule-type-fields" style="display: ${rule && rule.type === 'weekly' ? 'block' : 'none'}">
                    <div class="form-group">
                        <label>每周值班日</label>
                        <div class="weekday-grid">${weekdayBtns}</div>
                        <p class="form-hint">选中的每周几重复排班</p>
                    </div>
                </div>

                <div id="ruleMonthlyFields" class="rule-type-fields" style="display: ${rule && rule.type === 'monthly' ? 'block' : 'none'}">
                    <div class="form-group">
                        <label>每月值班日</label>
                        <div class="monthday-grid">${monthDayBtns}</div>
                        <p class="form-hint">选中的每月几号重复排班</p>
                    </div>
                </div>

                ${FormField.date('ruleStartDate', '起始日期', { required: true, min: today, value: startDateVal })}

                <div class="form-group">
                    <label>轮班成员顺序 <span class="form-hint" style="margin-left:8px;">（按勾选后可拖动排序</span></label>
                    <div class="member-checkboxes sortable-members" id="ruleMemberList">
                        ${memberCheckboxes}</div>
                    <p class="form-hint">按选中顺序依次轮班</p>
                </div>

                <div class="form-group" style="display:flex;align-items:center;gap:12px;">
                    <input type="checkbox" id="ruleEnabled" ${!rule || rule.enabled ? 'checked' : ''}>
                    <label for="ruleEnabled" style="margin:0;">启用此规则</label>
                </div>

                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    `<button type="submit" class="btn btn-primary">${rule ? '保存' : '创建规则'}</button>`
                )}
            </form>
        `;
    }

    static scheduleBatchForm(taskTypes = {}, members = []) {
        const enabledTypes = Object.entries(taskTypes)
            .filter(([, v]) => v.enabled !== false)
            .map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.name}` }));

        const typeCheckboxes = enabledTypes.map(t => `
            <label class="member-checkbox">
                <input type="checkbox" name="batchType" value="${t.value}" checked>
                <span class="member-checkbox-label">${t.label}</span>
            </label>
        `).join('');

        return `
            <form onsubmit="window._app.handleBatchGenerate(event)">
                <div class="form-group">
                    <label>生成未来多少天的排班</label>
                    <input type="number" id="batchDays" min="1" max="365" step="1" placeholder="如：30" value="30" required>
                    <p class="form-hint">最多可生成 365 天</p>
                </div>

                <div class="form-group">
                    <label>起始日期</label>
                    <input type="date" id="batchStartDate" value="${getTodayStr()}" min="${getTodayStr()}">
                </div>

                <div class="form-group">
                    <label>按哪些任务类型生成</label>
                    <div class="member-checkboxes">
                        ${typeCheckboxes}</div>
                    <p class="form-hint">只对已配置排班规则的类型生效</p>
                </div>

                <div class="form-group" style="display:flex;align-items:center;gap:12px;">
                    <input type="checkbox" id="batchClearExisting">
                    <label for="batchClearExisting" style="margin:0;">清空此期间内未完成的旧排班</label>
                </div>

                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    '<button type="submit" class="btn btn-primary">⚡ 智能生成</button>'
                )}
            </form>
        `;
    }

    static scheduleSwapForm(schedule, candidates, members, formatDateFn) {
        const memberMap = {};
        members.forEach(m => { memberMap[m.id] = m; });
        const currentMember = memberMap[schedule.memberId];

        const options = candidates.map(c => {
            const m = memberMap[c.memberId];
            return {
                value: c.id,
                label: `${formatDateFn(c.date)} (${m ? m.name : '未知'})`
            };
        });

        return `
            <form onsubmit="window._app.handleScheduleSwap(event, '${schedule.id}')">
                <div class="swap-info-card">
                    <p><strong>当前排班：</strong></p>
                    <p>📅 ${formatDateFn(schedule.date)}</p>
                    <p>👤 ${currentMember ? currentMember.name : '未知成员'}</p>
                </div>
                ${options.length === 0
                    ? '<p class="form-hint" style="color:var(--danger);">暂无同类型的其他排班可换</p>'
                    : `
                        ${FormField.select('swapTargetId', '选择要互换的排班', options, { required: true })}
                        ${FormField.textarea('swapNote', '换值说明（可选）', { placeholder: '换值原因等...' })}
                    `
                }
                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    `<button type="submit" class="btn btn-primary" ${options.length === 0 ? 'disabled' : ''}>确认换值</button>`
                )}
            </form>
        `;
    }

    static scheduleSubstituteForm(schedule, members, formatDateFn) {
        const memberMap = {};
        members.forEach(m => { memberMap[m.id] = m; });
        const currentMember = memberMap[schedule.memberId];
        const otherMembers = members.filter(m => m.id !== schedule.memberId);

        const options = otherMembers.map(m => ({
            value: m.id,
            label: m.name
        }));

        const originalMember = schedule.originalMemberId ? memberMap[schedule.originalMemberId] : null;

        return `
            <form onsubmit="window._app.handleScheduleSubstitute(event, '${schedule.id}')">
                <div class="swap-info-card">
                    <p><strong>当前排班：</strong></p>
                    <p>📅 ${formatDateFn(schedule.date)}</p>
                    <p>👤 原排班人：${currentMember ? currentMember.name : '未知成员'}</p>
                    ${originalMember ? `<p>📝 原计划：${originalMember.name}（${schedule.substituteType === 'swap' ? '换值' : '代值'}中）</p>` : ''}
                </div>
                ${schedule.originalMemberId ? `
                    <div class="form-group" style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                        <input type="checkbox" id="substituteRevert">
                        <label for="substituteRevert" style="margin:0;">恢复为原值班人（取消代/换值）</label>
                    </div>
                ` : ''}
                <div id="substituteMemberSection">
                    ${options.length === 0
                        ? '<p class="form-hint" style="color:var(--danger);">暂无其他成员</p>'
                        : `
                            ${FormField.select('substituteMemberId', '选择代值成员', options, { required: true })}
                            ${FormField.textarea('substituteNote', '代值说明（可选）', { placeholder: '代值原因等...' })}
                        `
                    }
                </div>
                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    `<button type="submit" class="btn btn-primary">确认</button>`
                )}
            </form>
        `;
    }

    static scheduleRulesList(rules, taskTypes, members, formatDateFn) {
        const typeMap = {};
        Object.entries(taskTypes).forEach(([k, v]) => { typeMap[k] = v; });
        const memberMap = {};
        members.forEach(m => { memberMap[m.id] = m; });
        const weekdayLabels = ['日','一','二','三','四','五','六'];

        if (rules.length === 0) {
            return '<div class="empty-state">暂无排班规则，点击上方按钮创建</div>';
        }

        return rules.map(function(rule) {
            const tt = typeMap[rule.taskTypeId];
            const memberNames = rule.memberOrder.map(function(id) { return memberMap[id] ? memberMap[id].name : '?'; }).join(' → ');
            let ruleDesc = '';
            switch (rule.type) {
                case 'interval':
                    ruleDesc = '每 ' + rule.intervalDays + ' 天';
                    break;
                case 'weekly':
                    ruleDesc = '每周' + rule.weekdays.map(function(d) { return weekdayLabels[d]; }).join('、');
                    break;
                case 'monthly':
                    ruleDesc = '每月' + rule.monthDays.join('、') + '号';
                    break;
            }
            const typeBadge = tt ? tt.emoji + ' ' + tt.name : '未知任务';
            const enabledClass = rule.enabled ? 'badge-enabled' : 'badge-disabled';
            const enabledText = rule.enabled ? '启用' : '停用';
            const cardClass = rule.enabled ? '' : 'rule-disabled';
            const toggleText = rule.enabled ? '停用' : '启用';
            const startDateStr = formatDateFn(rule.startDate);
            return `
                <div class="rule-card ${cardClass}">
                    <div class="rule-card-header">
                        <div class="rule-card-title">
                        <span class="rule-type-badge">${typeBadge}</span>
                        <span class="rule-enabled-badge ${enabledClass}">${enabledText}</span>
                        </div>
                    </div>
                    <div class="rule-card-body">
                        <p><span class="rule-meta-label">循环：</span>${ruleDesc}</p>
                        <p><span class="rule-meta-label">起始：</span>${startDateStr}</p>
                        <p><span class="rule-meta-label">轮班：</span>${memberNames || '未设置成员'}</p>
                    </div>
                    <div class="rule-card-actions">
                        <button class="btn btn-sm btn-secondary" onclick="window._app.toggleRuleEnabled('${rule.id}')">${toggleText}</button>
                        <button class="btn btn-sm btn-primary" onclick="window._app.showEditRuleModal('${rule.id}')">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="window._app.deleteScheduleRule('${rule.id}')">删除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    static billCategorySelect(id, selectedCategory) {
        const options = Object.entries(BILL_CATEGORIES).map(([key, val]) => ({
            value: key,
            label: `${val.emoji} ${val.name}`,
            selected: key === selectedCategory
        }));
        return FormField.select(id, '账单类别', options, { required: true });
    }

    static inventoryCategorySelect(id, selectedCategory) {
        const options = Object.entries(INVENTORY_CATEGORIES).map(([key, val]) => ({
            value: key,
            label: `${val.emoji} ${val.name}`,
            selected: key === selectedCategory
        }));
        return FormField.select(id, '物品分类', options, { required: true });
    }

    static inventoryItemForm(item = null) {
        return `
            <form onsubmit="window._app.handleSaveInventoryItem(event, '${item ? item.id : ''}')">
                ${FormField.text('invItemName', '物品名称', { required: true, placeholder: '如：卷纸、洗衣液', value: item ? item.name : '', maxlength: 20 })}
                ${FormField.inventoryCategorySelect('invItemCategory', item ? item.category : 'grocery')}
                ${FormField.text('invItemUnit', '计量单位', { required: true, placeholder: '如：个/卷/瓶/包', value: item ? item.unit : '个', maxlength: 5 })}
                <div class="form-group">
                    <label>当前库存</label>
                    <input type="number" id="invItemStock" required min="0" step="1" placeholder="0" value="${item ? item.stock : 0}">
                </div>
                <div class="form-group">
                    <label>低库存提醒阈值</label>
                    <input type="number" id="invItemThreshold" required min="0" step="1" placeholder="低于此数量时提醒" value="${item ? item.threshold : 5}">
                </div>
                <div class="form-group">
                    <label>预估单价（元）</label>
                    <input type="number" id="invItemPrice" min="0" step="0.01" placeholder="购买时预估单价" value="${item ? item.estimatedPrice : ''}">
                </div>
                ${FormField.textarea('invItemNote', '备注（可选）', { placeholder: '使用场景、规格等...', value: item ? item.note : '' })}
                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    `<button type="submit" class="btn btn-primary">${item ? '保存' : '添加'}</button>`
                )}
            </form>
        `;
    }

    static inventoryQuantityForm(item, action) {
        const actionConfig = {
            consume: { title: '快捷消耗', label: '消耗数量', emoji: '➖', min: 1, max: item.stock || 1, placeholder: '消耗数量' },
            restock: { title: '快捷补货', label: '补货数量', emoji: '➕', min: 1, placeholder: '补货数量' },
            purchase: { title: '购买补货', label: '购买数量', emoji: '🛒', min: 1, placeholder: '购买数量' }
        };
        const cfg = actionConfig[action] || actionConfig.restock;
        const maxAttr = cfg.max ? `max="${cfg.max}"` : '';
        return `
            <form onsubmit="window._app.handleInventoryAction(event, '${item.id}', '${action}')">
                <div class="inv-action-header">
                    <span class="inv-action-emoji">${cfg.emoji}</span>
                    <div>
                        <h4 style="font-size: 16px; color: var(--text-primary);">${cfg.title} - ${item.name}</h4>
                        <p style="font-size: 13px; color: var(--text-secondary);">当前库存: ${item.stock} ${item.unit}</p>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 20px;">
                    <label>${cfg.label}（${item.unit}）</label>
                    <input type="number" id="invActionQty" required min="${cfg.min}" ${maxAttr} step="1" placeholder="${cfg.placeholder}" value="1">
                </div>
                ${action === 'purchase' ? `
                    <div class="form-group">
                        <label>实际金额（元）</label>
                        <input type="number" id="invActionAmount" required min="0" step="0.01" placeholder="输入购买实际花费" value="${item.estimatedPrice ? (item.estimatedPrice * 1).toFixed(2) : ''}">
                        <p class="form-hint">填写后将自动创建账单记录</p>
                    </div>
                ` : ''}
                ${FormField.textarea('invActionNote', '备注（可选）', { placeholder: action === 'consume' ? '消耗说明...' : '来源、补充说明...' })}
                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    `<button type="submit" class="btn btn-primary">${action === 'consume' ? '确认消耗' : action === 'purchase' ? '确认购买' : '确认补货'}</button>`
                )}
            </form>
        `;
    }

    static billForm(members, bill = null, prefill = null) {
        const today = getTodayStr();
        const dateValue = bill ? new Date(bill.date).toISOString().split('T')[0] : today;
        const evidencePreview = bill && bill.evidence
            ? `<div id="evidencePreview"><img src="${bill.evidence}" class="evidence-preview-img" alt="账单依据预览"></div>`
            : '<div id="evidencePreview"></div>';

        const category = (prefill && prefill.category) || (bill && bill.category) || 'rent';
        const amount = (prefill && prefill.amount) || (bill && bill.amount) || '';
        const note = (prefill && prefill.note) || (bill && bill.note) || '';

        return `
            <form onsubmit="window._app.handleSaveBill(event)">
                <input type="hidden" id="billEditId" value="${bill ? bill.id : ''}">
                <input type="hidden" id="billInventoryPrefill" value="${prefill && prefill.inventoryItemId ? prefill.inventoryItemId : ''}">
                <input type="hidden" id="billInventoryQty" value="${prefill && prefill.inventoryQty ? prefill.inventoryQty : ''}">
                ${FormField.billCategorySelect('billCategory', category)}
                <div class="form-group">
                    <label>金额（元）</label>
                    <input type="number" id="billAmount" required min="0.01" step="0.01" placeholder="0.00" value="${amount}">
                </div>
                <div class="form-group">
                    <label>付款人</label>
                    <select id="billPayer" required>
                        ${members.map(m => `<option value="${m.id}" ${bill && bill.payerId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
                ${FormField.date('billDate', '账单日期', { required: true, value: dateValue })}
                <div class="form-group">
                    <label>分摊成员</label>
                    <div class="member-checkboxes">
                        ${members.map(m => {
                            const checked = bill && bill.sharedBy && bill.sharedBy.length > 0
                                ? bill.sharedBy.includes(m.id)
                                : true;
                            return `
                                <label class="member-checkbox">
                                    <input type="checkbox" name="billSharedBy" value="${m.id}" ${checked ? 'checked' : ''}>
                                    <span class="member-checkbox-label">${m.name}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                    <p class="form-hint">不选则默认所有成员分摊</p>
                </div>
                <div class="form-group">
                    <label>账单依据</label>
                    <input type="file" id="billEvidence" accept="image/*" class="file-input">
                    <p class="form-hint">支持图片文件，最大5MB</p>
                    ${evidencePreview}
                </div>
                ${FormField.textarea('billNote', '备注（可选）', { placeholder: '补充说明...', value: note })}
                ${FormField.actions(
                    '<button type="button" class="btn btn-secondary" onclick="window._app.closeModal()">取消</button>',
                    `<button type="submit" class="btn btn-primary">${bill ? '保存' : '添加'}</button>`
                )}
            </form>
        `;
    }
}
