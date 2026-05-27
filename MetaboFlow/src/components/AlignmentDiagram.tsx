import { onMount, For } from 'solid-js';
import { createSignal } from 'solid-js';
import type { SemanticAlignment } from '../types';

interface AlignmentDiagramProps {
  alignments: SemanticAlignment[];
}

const SVG_WIDTH = 700;
const NODE_W = 150;
const NODE_H = 40;
const COL_LEFT_X = 60;
const COL_RIGHT_X = SVG_WIDTH - 60 - NODE_W;
const ROW_GAP = 60;
const TOP_OFFSET = 30;

function confidenceColor(confidence: number) {
  if (confidence > 0.85) return '#00FF88';
  if (confidence > 0.7) return '#F5A623';
  return '#EF4444';
}

export default function AlignmentDiagram(props: AlignmentDiagramProps) {
  const [lineProgress, setLineProgress] = createSignal(0);

  onMount(() => {
    requestAnimationFrame(() => setLineProgress(1));
  });

  const rows = () => props.alignments.map((a, i) => ({
    alignment: a,
    y: TOP_OFFSET + i * ROW_GAP,
    color: confidenceColor(a.mappingConfidence),
  }));

  const svgHeight = () => TOP_OFFSET + Math.max(props.alignments.length, 1) * ROW_GAP;

  return (
    <div class="glass-card p-6">
      <h3 class="section-title mb-4">Semantic Alignment</h3>
      <div class="overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${svgHeight()}`}
          class="w-full"
          style={`min-width: ${SVG_WIDTH}px`}
        >
          <text
            x={COL_LEFT_X + NODE_W / 2}
            y={12}
            text-anchor="middle"
            fill="#8B949E"
            class="font-display font-semibold"
            style="font-size: 11px"
          >
            用户维度
          </text>
          <text
            x={COL_RIGHT_X + NODE_W / 2}
            y={12}
            text-anchor="middle"
            fill="#8B949E"
            class="font-display font-semibold"
            style="font-size: 11px"
          >
            专业分析维度
          </text>

          <For each={rows()}>
            {(row) => {
              const leftX = COL_LEFT_X;
              const rightX = COL_RIGHT_X;
              const cy = row.y + NODE_H / 2;
              const lineStartX = leftX + NODE_W;
              const lineEndX = rightX;
              const midX = (lineStartX + lineEndX) / 2;

              return (
                <g>
                  <rect
                    x={leftX}
                    y={row.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill="#161B22"
                    stroke="#21262D"
                    stroke-width="1"
                  />
                  <text
                    x={leftX + NODE_W / 2}
                    y={cy}
                    text-anchor="middle"
                    dominant-baseline="middle"
                    fill="#E6EDF3"
                    class="font-body"
                    style="font-size: 11px"
                  >
                    {row.alignment.userDimension}
                  </text>

                  <rect
                    x={rightX}
                    y={row.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill="#161B22"
                    stroke={row.color}
                    stroke-width="1"
                    opacity="0.8"
                  />
                  <text
                    x={rightX + NODE_W / 2}
                    y={cy}
                    text-anchor="middle"
                    dominant-baseline="middle"
                    fill="#E6EDF3"
                    class="font-body"
                    style="font-size: 11px"
                  >
                    {row.alignment.professionalDimension}
                  </text>

                  <line
                    x1={lineStartX}
                    y1={cy}
                    x2={lineEndX}
                    y2={cy}
                    stroke={row.color}
                    stroke-width="1.5"
                    stroke-dasharray={`${(lineEndX - lineStartX) * lineProgress()} ${lineEndX - lineStartX}`}
                    opacity="0.6"
                    style="transition: stroke-dasharray 0.8s ease-out"
                  />

                  <rect
                    x={midX - 22}
                    y={cy - 10}
                    width="44"
                    height="20"
                    rx="10"
                    fill="#0D1117"
                    stroke={row.color}
                    stroke-width="0.5"
                    opacity={lineProgress()}
                    style="transition: opacity 0.6s ease-out 0.3s"
                  />
                  <text
                    x={midX}
                    y={cy}
                    text-anchor="middle"
                    dominant-baseline="middle"
                    fill={row.color}
                    class="font-display font-bold"
                    style="font-size: 9px"
                    opacity={lineProgress()}
                  >
                    {(row.alignment.mappingConfidence * 100).toFixed(0)}%
                  </text>
                </g>
              );
            }}
          </For>
        </svg>
      </div>
    </div>
  );
}
