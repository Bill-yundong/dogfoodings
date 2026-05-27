import { onMount, For, Show } from 'solid-js';
import { createSignal } from 'solid-js';
import { generateAlignments } from '../../engine/metabolic';
import { saveAlignment, getAllAlignments } from '../../db';
import AlignmentDiagram from '../../components/AlignmentDiagram';
import type { SemanticAlignment } from '../../types';

function confidenceColor(confidence: number) {
  if (confidence > 0.85) return '#00FF88';
  if (confidence > 0.7) return '#F5A623';
  return '#EF4444';
}

function confidenceBadge(confidence: number) {
  if (confidence > 0.85) return 'badge-low';
  if (confidence > 0.7) return 'badge-medium';
  return 'badge-high';
}

export default function Alignment() {
  const [alignments, setAlignments] = createSignal<SemanticAlignment[]>([]);
  const [saving, setSaving] = createSignal(false);

  onMount(() => {
    const generated = generateAlignments();
    setAlignments(generated);
  });

  async function handleSave() {
    setSaving(true);
    try {
      for (const alignment of alignments()) {
        await saveAlignment(alignment);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="section-title">语义对齐</h2>
        <button class="btn-primary text-sm" onClick={handleSave} disabled={saving()}>
          {saving() ? '保存中...' : '保存到数据库'}
        </button>
      </div>

      <AlignmentDiagram alignments={alignments()} />

      <div class="glass-card p-6">
        <h3 class="section-title mb-4">对齐详情</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-metabo-border">
                <th class="text-left font-body text-xs text-metabo-muted pb-3 pr-4">用户维度</th>
                <th class="text-left font-body text-xs text-metabo-muted pb-3 pr-4">专业分析维度</th>
                <th class="text-left font-body text-xs text-metabo-muted pb-3 pr-4">置信度</th>
                <th class="text-left font-body text-xs text-metabo-muted pb-3">描述</th>
              </tr>
            </thead>
            <tbody>
              <For each={alignments()}>
                {(alignment) => (
                  <tr class="border-b border-metabo-border/50">
                    <td class="py-3 pr-4">
                      <span class="font-body text-sm text-metabo-text">{alignment.userDimension}</span>
                    </td>
                    <td class="py-3 pr-4">
                      <span class="font-body text-sm text-metabo-text">{alignment.professionalDimension}</span>
                    </td>
                    <td class="py-3 pr-4">
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-1.5 bg-metabo-border rounded-full overflow-hidden">
                          <div
                            class="h-full rounded-full"
                            style={{
                              width: `${alignment.mappingConfidence * 100}%`,
                              'background-color': confidenceColor(alignment.mappingConfidence),
                            }}
                          />
                        </div>
                        <span class={confidenceBadge(alignment.mappingConfidence)}>
                          {(alignment.mappingConfidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td class="py-3">
                      <span class="font-body text-xs text-metabo-muted">{alignment.description}</span>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
