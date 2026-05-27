import type { AlignmentResult } from '@/types'

interface AlignmentPanelProps {
  alignment: AlignmentResult
}

function getConfidenceColor(confidence: number): string {
  if (confidence > 0.95) return '#22C55E'
  if (confidence > 0.85) return '#FFD60A'
  return '#FF6B2B'
}

function getDeviationColor(value: number): string {
  if (value <= 0.15) return '#00F0B5'
  if (value <= 0.35) return '#FFD60A'
  return '#FF6B2B'
}

function getScoreColor(score: number): string {
  if (score > 0.95) return '#22C55E'
  if (score > 0.85) return '#FFD60A'
  return '#FF6B2B'
}

export default function AlignmentPanel({ alignment }: AlignmentPanelProps) {
  const { alignmentScore, fieldMappings, deviationHeatmap } = alignment
  const scorePercent = (alignmentScore * 100).toFixed(1)
  const scoreColor = getScoreColor(alignmentScore)
  const ROW_HEIGHT = 52
  const CONNECTOR_WIDTH = 100
  const mappingHeight = fieldMappings.length * ROW_HEIGHT

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: '#1A1F2E' }}
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span style={{ color: '#E8ECF4', fontSize: '13px', fontWeight: 600 }}>
            Semantic Alignment
          </span>
          <span
            style={{
              color: scoreColor,
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: "'Orbitron', monospace",
            }}
          >
            {scorePercent}%
          </span>
        </div>
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 8, backgroundColor: '#2A2F3E' }}
        >
          <div
            className="rounded-full h-full transition-all duration-500"
            style={{
              width: `${alignmentScore * 100}%`,
              backgroundColor: scoreColor,
            }}
          />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Source Fields
          </span>
          <span
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Target Fields
          </span>
        </div>

        <div className="flex" style={{ height: mappingHeight }}>
          <div className="flex-1 flex flex-col">
            {fieldMappings.map((mapping, i) => (
              <div
                key={i}
                className="flex flex-col justify-center pr-3"
                style={{ height: ROW_HEIGHT }}
              >
                <span
                  style={{
                    color: '#E8ECF4',
                    fontSize: '12px',
                    fontFamily: "'Orbitron', monospace",
                  }}
                >
                  {mapping.sourceField}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="rounded-full overflow-hidden"
                    style={{ width: 56, height: 4, backgroundColor: '#2A2F3E' }}
                  >
                    <div
                      className="rounded-full h-full"
                      style={{
                        width: `${mapping.confidence * 100}%`,
                        backgroundColor: getConfidenceColor(mapping.confidence),
                      }}
                    />
                  </div>
                  <span
                    style={{
                      color: getConfidenceColor(mapping.confidence),
                      fontSize: '10px',
                      fontFamily: "'Orbitron', monospace",
                    }}
                  >
                    {(mapping.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="relative flex-shrink-0"
            style={{ width: CONNECTOR_WIDTH }}
          >
            <svg
              className="w-full"
              style={{ height: mappingHeight }}
            >
              {fieldMappings.map((mapping, i) => {
                const y = i * ROW_HEIGHT + ROW_HEIGHT / 2
                const lineColor = getConfidenceColor(mapping.confidence)
                return (
                  <g key={i}>
                    <line
                      x1={0}
                      y1={y}
                      x2={CONNECTOR_WIDTH}
                      y2={y}
                      stroke={lineColor}
                      strokeWidth={2}
                      strokeOpacity={0.5}
                    />
                    <circle cx={0} cy={y} r={3} fill={lineColor} />
                    <circle cx={CONNECTOR_WIDTH} cy={y} r={3} fill={lineColor} />
                    <text
                      x={CONNECTOR_WIDTH / 2}
                      y={y - 6}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.4)"
                      fontSize={10}
                      fontFamily="'Orbitron', monospace"
                    >
                      →
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="flex-1 flex flex-col">
            {fieldMappings.map((mapping, i) => (
              <div
                key={i}
                className="flex flex-col justify-center pl-3"
                style={{ height: ROW_HEIGHT }}
              >
                <span
                  style={{
                    color: '#E8ECF4',
                    fontSize: '12px',
                    fontFamily: "'Orbitron', monospace",
                  }}
                >
                  {mapping.targetField}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '10px',
                    }}
                  >
                    dev
                  </span>
                  <span
                    style={{
                      color: getDeviationColor(mapping.deviation),
                      fontSize: '10px',
                      fontWeight: 600,
                      fontFamily: "'Orbitron', monospace",
                    }}
                  >
                    {mapping.deviation.toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Deviation Heatmap
        </span>
        <div className="mt-3">
          {deviationHeatmap.map((row, i) => (
            <div key={i} className="flex">
              {row.map((value, j) => {
                const cellColor = getDeviationColor(value)
                const opacity = 0.2 + Math.min(value * 1.6, 0.8)
                return (
                  <div
                    key={j}
                    className="flex items-center justify-center rounded m-0.5"
                    style={{
                      width: 48,
                      height: 36,
                      backgroundColor: cellColor,
                      opacity,
                    }}
                  >
                    <span
                      style={{
                        color: '#E8ECF4',
                        fontSize: '9px',
                        fontFamily: "'Orbitron', monospace",
                      }}
                    >
                      {value.toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
