import { createSignal, Show } from 'solid-js';

const TEMPLATES = [
  {
    id: 'basic',
    title: '基础代谢报告',
    desc: '基础代谢率分析与营养建议',
    icon: (
      <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
  },
  {
    id: 'glucose',
    title: '血糖动力学报告',
    desc: '餐后血糖响应曲线与风险评估',
    icon: (
      <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'full',
    title: '全面营养评估',
    desc: '宏量/微量营养素全面评估报告',
    icon: (
      <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
];

const REPORT_SECTIONS = [
  {
    title: '用户概况',
    content: '基础代谢率: 1600 kcal · 体重: 70kg · 年龄: 30岁 · 性别: 男\n胰岛素敏感性: 50 · 葡萄糖耐受: 70',
  },
  {
    title: '血糖分析',
    content: '平均餐后峰值: 7.8 mmol/L\n平均IAUC: 245.3\n高风险事件: 0 次\n餐后血糖恢复时间: 正常范围',
  },
  {
    title: '营养评估',
    content: '日均热量摄入: 1650 kcal (达标率 103%)\n蛋白质: 68g (达标率 81%)\n碳水: 210g (达标率 70%)\n脂肪: 55g (达标率 85%)\n膳食纤维: 18g (达标率 72%)',
  },
  {
    title: '建议',
    content: '1. 适当增加蛋白质摄入，建议每餐补充优质蛋白\n2. 增加膳食纤维摄入，推荐全谷物和蔬菜\n3. 控制高GI食物摄入，选择低GI替代品\n4. 保持规律饮食时间，避免暴饮暴食',
  },
];

export default function Reports() {
  const [selectedTemplate, setSelectedTemplate] = createSignal<string | null>(null);
  const [toast, setToast] = createSignal(false);

  function handleExport() {
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  return (
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <h2 class="section-title">报告生成</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <button
            class={`glass-card p-6 flex flex-col items-center gap-3 text-center transition-all duration-300 ${
              selectedTemplate() === t.id
                ? 'border-metabo-glow/50 shadow-glow-sm'
                : 'hover:border-metabo-glow/30'
            }`}
            onClick={() => setSelectedTemplate(t.id)}
          >
            <div class={`${
              selectedTemplate() === t.id ? 'text-metabo-glow' : 'text-metabo-muted'
            } transition-colors`}>
              {t.icon}
            </div>
            <h3 class="font-display font-semibold text-metabo-text">{t.title}</h3>
            <p class="font-body text-xs text-metabo-muted">{t.desc}</p>
          </button>
        ))}
      </div>

      <Show when={selectedTemplate()}>
        <div class="glass-card p-6 space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="section-title">报告预览</h3>
            <button class="btn-primary text-sm" onClick={handleExport}>
              导出报告
            </button>
          </div>

          <div class="space-y-6">
            {REPORT_SECTIONS.map((section) => (
              <div class="p-4 bg-metabo-dark/50 rounded-xl border border-metabo-border/50">
                <h4 class="font-display text-sm font-semibold text-metabo-glow mb-3">{section.title}</h4>
                <div class="font-body text-sm text-metabo-text whitespace-pre-line leading-relaxed">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Show>

      <Show when={toast()}>
        <div class="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div class="glass-card px-6 py-3 flex items-center gap-3 border-metabo-glow/50 shadow-glow-sm">
            <svg class="w-5 h-5 text-metabo-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span class="font-body text-sm text-metabo-glow">报告已生成</span>
          </div>
        </div>
      </Show>
    </div>
  );
}
