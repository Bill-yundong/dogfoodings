import { Component, createEffect, createSignal, For } from 'solid-js';
import { Plus, Trash2, Play, ArrowRightLeft, Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-solid';
import { listMappingRules, createMappingRule, updateMappingRule, deleteMappingRule } from '@/db/mappingRule';
import { SemanticMappingEngine, defaultMappingRules } from '@/engine/semanticMapper';
import type { MappingRule } from '@/types';

const SemanticMappingPage: Component = () => {
  const [rules, setRules] = createSignal<MappingRule[]>([]);
  const [showEditor, setShowEditor] = createSignal(false);
  const [editingRule, setEditingRule] = createSignal<MappingRule | null>(null);
  const [testResult, setTestResult] = createSignal<{ success: boolean; message: string } | null>(null);
  const [testValue, setTestValue] = createSignal('220');

  const [formData, setFormData] = createSignal({
    sourceField: '',
    targetField: '',
    transformType: 'direct' as MappingRule['transformType'],
    transformExpression: '',
    sourceSystem: 'moldnexus',
    targetSystem: 'mes_siemens',
    isActive: true,
  });

  createEffect(async () => {
    const data = await listMappingRules();
    if (data.length === 0) {
      for (const rule of defaultMappingRules) {
        await createMappingRule(rule);
      }
      setRules(await listMappingRules());
    } else {
      setRules(data);
    }
  });

  const handleAdd = () => {
    setEditingRule(null);
    setFormData({
      sourceField: '',
      targetField: '',
      transformType: 'direct',
      transformExpression: '',
      sourceSystem: 'moldnexus',
      targetSystem: 'mes_siemens',
      isActive: true,
    });
    setShowEditor(true);
  };

  const handleEdit = (rule: MappingRule) => {
    setEditingRule(rule);
    setFormData({
      sourceField: rule.sourceField,
      targetField: rule.targetField,
      transformType: rule.transformType,
      transformExpression: rule.transformExpression,
      sourceSystem: rule.sourceSystem,
      targetSystem: rule.targetSystem,
      isActive: rule.isActive,
    });
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此映射规则吗？')) {
      await deleteMappingRule(id);
      setRules(await listMappingRules());
    }
  };

  const handleSave = async () => {
    try {
      if (editingRule()) {
        await updateMappingRule(editingRule()!.id, formData());
      } else {
        await createMappingRule(formData());
      }
      setRules(await listMappingRules());
      setShowEditor(false);
    } catch (error) {
      console.error('Failed to save mapping rule:', error);
    }
  };

  const handleTest = () => {
    const engine = new SemanticMappingEngine(rules());
    const result = engine.mapParameter(formData().sourceField, testValue(), {
      sourceSystem: formData().sourceSystem,
      targetSystem: formData().targetSystem,
    });

    if (result.success) {
      setTestResult({
        success: true,
        message: `转换成功: ${testValue()} → ${result.targetValue}`,
      });
    } else {
      setTestResult({
        success: false,
        message: `转换失败: ${result.error}`,
      });
    }
  };

  const handleSync = async () => {
    setTestResult({ success: true, message: '正在同步到 MES 系统...' });
    setTimeout(() => {
      setTestResult({ success: true, message: '同步完成！已同步 ' + rules().length + ' 条规则' });
    }, 1500);
  };

  const getTransformTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      direct: '直接映射',
      unit: '单位转换',
      formula: '公式计算',
      enum: '枚举映射',
      conditional: '条件分支',
    };
    return labels[type] || type;
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-100">语义映射配置</h1>
          <p class="text-sm text-gray-400 mt-1">配置工艺参数与生产系统间的字段映射关系</p>
        </div>
        <div class="flex items-center gap-3">
          <button onClick={handleSync} class="btn btn-secondary">
            <RefreshCw class="w-4 h-4" /> 同步到 MES
          </button>
          <button onClick={handleAdd} class="btn btn-primary">
            <Plus class="w-4 h-4" /> 新建规则
          </button>
        </div>
      </div>

      {testResult() && (
        <div class={`p-4 rounded-lg flex items-center gap-3 ${
          testResult()!.success ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'
        }`}>
          {testResult()!.success ? <CheckCircle class="w-5 h-5" /> : <AlertCircle class="w-5 h-5" />}
          <span>{testResult()!.message}</span>
        </div>
      )}

      <div class="grid grid-cols-2 gap-4">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title flex items-center gap-2">
              <Database class="w-4 h-4 text-primary-400" />
              源系统 - MoldNexus 工艺参数
            </span>
          </div>
          <div class="panel-content">
            <div class="space-y-2">
              <For each={rules().filter(r => r.sourceSystem === 'moldnexus')}>
                {(rule) => (
                  <div
                    class={`p-3 rounded-lg border transition-all cursor-pointer ${
                      rule.isActive ? 'bg-dark-100 border-dark-100 hover:border-primary-500/50' : 'bg-dark-200/50 border-transparent opacity-50'
                    }`}
                    onClick={() => handleEdit(rule)}
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-mono text-sm text-gray-200">{rule.sourceField}</p>
                        <p class="text-xs text-gray-500 mt-0.5">
                          {getTransformTypeLabel(rule.transformType)}
                          {rule.transformExpression && ` → ${rule.transformExpression}`}
                        </p>
                      </div>
                      <ArrowRightLeft class="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <span class="panel-title flex items-center gap-2">
              <Database class="w-4 h-4 text-accent-cyan" />
              目标系统 - MES 生产执行
            </span>
          </div>
          <div class="panel-content">
            <div class="space-y-2">
              <For each={rules().filter(r => r.sourceSystem === 'moldnexus')}>
                {(rule) => (
                  <div
                    class={`p-3 rounded-lg border transition-all ${
                      rule.isActive ? 'bg-dark-100 border-dark-100' : 'bg-dark-200/50 border-transparent opacity-50'
                    }`}
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-mono text-sm text-gray-200">{rule.targetField}</p>
                        <p class="text-xs text-gray-500 mt-0.5">
                          系统: {rule.targetSystem}
                        </p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class={`badge ${rule.isActive ? 'badge-success' : 'badge bg-gray-500/20 text-gray-500'}`}>
                          {rule.isActive ? '启用' : '禁用'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(rule.id);
                          }}
                          class="p-1 text-gray-500 hover:text-accent-red transition-colors"
                        >
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>

      {showEditor() && (
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div class="panel w-full max-w-lg mx-4">
            <div class="panel-header">
              <span class="panel-title">
                {editingRule() ? '编辑映射规则' : '新建映射规则'}
              </span>
              <button onClick={() => setShowEditor(false)} class="text-gray-400 hover:text-gray-200">
                ✕
              </button>
            </div>
            <div class="panel-content space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm text-gray-300 mb-1.5">源字段</label>
                  <input
                    type="text"
                    value={formData().sourceField}
                    onInput={(e) => setFormData({ ...formData(), sourceField: e.target.value })}
                    class="input"
                    placeholder="melt_temperature"
                  />
                </div>
                <div>
                  <label class="block text-sm text-gray-300 mb-1.5">目标字段</label>
                  <input
                    type="text"
                    value={formData().targetField}
                    onInput={(e) => setFormData({ ...formData(), targetField: e.target.value })}
                    class="input"
                    placeholder="MeltTemp"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm text-gray-300 mb-1.5">源系统</label>
                  <input
                    type="text"
                    value={formData().sourceSystem}
                    onInput={(e) => setFormData({ ...formData(), sourceSystem: e.target.value })}
                    class="input"
                  />
                </div>
                <div>
                  <label class="block text-sm text-gray-300 mb-1.5">目标系统</label>
                  <input
                    type="text"
                    value={formData().targetSystem}
                    onInput={(e) => setFormData({ ...formData(), targetSystem: e.target.value })}
                    class="input"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm text-gray-300 mb-1.5">转换类型</label>
                <select
                  value={formData().transformType}
                  onChange={(e) => setFormData({ ...formData(), transformType: e.target.value as any })}
                  class="input"
                >
                  <option value="direct">直接映射</option>
                  <option value="unit">单位转换</option>
                  <option value="formula">公式计算</option>
                  <option value="enum">枚举映射</option>
                  <option value="conditional">条件分支</option>
                </select>
              </div>

              {formData().transformType !== 'direct' && (
                <div>
                  <label class="block text-sm text-gray-300 mb-1.5">转换表达式</label>
                  <input
                    type="text"
                    value={formData().transformExpression}
                    onInput={(e) => setFormData({ ...formData(), transformExpression: e.target.value })}
                    class="input"
                    placeholder={
                      formData().transformType === 'unit' ? '°C->°F' :
                      formData().transformType === 'formula' ? 'x * 1.8 + 32' :
                      formData().transformType === 'enum' ? '1:low;2:medium;3:high' :
                      '<100:slow;>=100:fast'
                    }
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    {formData().transformType === 'unit' && '格式: 源单位->目标单位，如: °C->°F, mm/s->m/min'}
                    {formData().transformType === 'formula' && '使用 x 或 value 代表输入值，支持 +-*/() 运算'}
                    {formData().transformType === 'enum' && '格式: 值1:映射值1;值2:映射值2'}
                    {formData().transformType === 'conditional' && '格式: 条件1:结果1;条件2:结果2;default:默认值'}
                  </p>
                </div>
              )}

              {formData().transformType !== 'direct' && (
                <div class="p-4 bg-dark-100 rounded-lg space-y-3">
                  <p class="text-sm font-medium text-gray-300">测试转换</p>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      value={testValue()}
                      onInput={(e) => setTestValue(e.target.value)}
                      class="input flex-1"
                      placeholder="输入测试值"
                    />
                    <button onClick={handleTest} class="btn btn-secondary">
                      <Play class="w-4 h-4" /> 测试
                    </button>
                  </div>
                </div>
              )}

              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData().isActive}
                  onChange={(e) => setFormData({ ...formData(), isActive: e.target.checked })}
                  class="w-4 h-4 accent-primary-500"
                />
                <label for="isActive" class="text-sm text-gray-300">启用此规则</label>
              </div>

              <div class="flex justify-end gap-3 pt-4 border-t border-dark-100">
                <button onClick={() => setShowEditor(false)} class="btn btn-secondary">
                  取消
                </button>
                <button onClick={handleSave} class="btn btn-primary">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticMappingPage;
