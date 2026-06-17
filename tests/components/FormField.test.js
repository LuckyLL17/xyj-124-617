import { describe, it, expect } from 'vitest';
import { FormField } from '../../js/components/FormField.js';

describe('FormField component', () => {
  describe('text', () => {
    it('should render text input field', () => {
      const result = FormField.text('testId', '测试标签', {});
      expect(result).toContain('form-group');
      expect(result).toContain('<label');
      expect(result).toContain('测试标签');
      expect(result).toContain('type="text"');
      expect(result).toContain('id="testId"');
    });

    it('should include required attribute', () => {
      const result = FormField.text('id', 'Label', { required: true });
      expect(result).toContain('required');
    });

    it('should include placeholder', () => {
      const result = FormField.text('id', 'Label', { placeholder: '请输入' });
      expect(result).toContain('placeholder="请输入"');
    });

    it('should include value', () => {
      const result = FormField.text('id', 'Label', { value: '默认值' });
      expect(result).toContain('value="默认值"');
    });

    it('should include maxlength', () => {
      const result = FormField.text('id', 'Label', { maxlength: 20 });
      expect(result).toContain('maxlength="20"');
    });
  });

  describe('date', () => {
    it('should render date input field', () => {
      const result = FormField.date('dateId', '日期标签', {});
      expect(result).toContain('type="date"');
      expect(result).toContain('id="dateId"');
      expect(result).toContain('日期标签');
    });

    it('should include min attribute', () => {
      const result = FormField.date('id', 'Label', { min: '2024-01-01' });
      expect(result).toContain('min="2024-01-01"');
    });

    it('should include value', () => {
      const result = FormField.date('id', 'Label', { value: '2024-06-15' });
      expect(result).toContain('value="2024-06-15"');
    });
  });

  describe('select', () => {
    it('should render select with options', () => {
      const options = [
        { value: 'v1', label: '选项1' },
        { value: 'v2', label: '选项2', selected: true },
      ];
      const result = FormField.select('selectId', '选择标签', options, {});
      expect(result).toContain('<select');
      expect(result).toContain('id="selectId"');
      expect(result).toContain('选项1');
      expect(result).toContain('选项2');
      expect(result).toContain('selected');
    });

    it('should include required attribute', () => {
      const result = FormField.select('id', 'Label', [], { required: true });
      expect(result).toContain('required');
    });
  });

  describe('textarea', () => {
    it('should render textarea field', () => {
      const result = FormField.textarea('taId', '描述标签', {});
      expect(result).toContain('<textarea');
      expect(result).toContain('id="taId"');
      expect(result).toContain('描述标签');
    });

    it('should include placeholder', () => {
      const result = FormField.textarea('id', 'Label', { placeholder: '请输入内容' });
      expect(result).toContain('placeholder="请输入内容"');
    });

    it('should include value', () => {
      const result = FormField.textarea('id', 'Label', { value: '默认内容' });
      expect(result).toContain('默认内容');
    });
  });

  describe('hint', () => {
    it('should render form hint', () => {
      const result = FormField.hint('提示信息');
      expect(result).toContain('form-hint');
      expect(result).toContain('提示信息');
    });
  });

  describe('actions', () => {
    it('should render form actions with buttons', () => {
      const result = FormField.actions('<button>取消</button>', '<button>提交</button>');
      expect(result).toContain('form-actions');
      expect(result).toContain('取消');
      expect(result).toContain('提交');
    });
  });

  describe('typeSelect', () => {
    it('should render task type select', () => {
      const taskTypes = {
        trash: { name: '倒垃圾', emoji: '🗑️', enabled: true },
        clean: { name: '打扫', emoji: '🧹', enabled: true },
      };
      const result = FormField.typeSelect('typeId', 'trash', taskTypes);
      expect(result).toContain('倒垃圾');
      expect(result).toContain('打扫');
      expect(result).toContain('🗑️');
    });
  });

  describe('memberSelect', () => {
    it('should render member select', () => {
      const members = [
        { id: 'm1', name: '小明' },
        { id: 'm2', name: '小红' },
      ];
      const result = FormField.memberSelect('memberId', members);
      expect(result).toContain('小明');
      expect(result).toContain('小红');
      expect(result).toContain('完成人');
    });
  });

  describe('billCategorySelect', () => {
    it('should render bill category select', () => {
      const result = FormField.billCategorySelect('catId', 'rent');
      expect(result).toContain('房租');
      expect(result).toContain('电费');
      expect(result).toContain('账单类别');
    });
  });

  describe('inventoryCategorySelect', () => {
    it('should render inventory category select', () => {
      const result = FormField.inventoryCategorySelect('catId', 'paper');
      expect(result).toContain('纸品卫生');
      expect(result).toContain('物品分类');
    });
  });

  describe('colorPicker', () => {
    it('should render color picker with colors', () => {
      const result = FormField.colorPicker('#6366f1');
      expect(result).toContain('头像颜色');
      expect(result).toContain('#6366f1');
    });
  });

  describe('taskColorPicker', () => {
    it('should render task color picker', () => {
      const result = FormField.taskColorPicker('#f59e0b');
      expect(result).toContain('标签颜色');
      expect(result).toContain('#f59e0b');
    });
  });
});
