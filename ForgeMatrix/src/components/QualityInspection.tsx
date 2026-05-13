import React, { useState } from 'react';
import { QualityData } from '../types';

interface QualityInspectionProps {
  batchId: string;
  existingQuality?: QualityData;
  onSubmit: (quality: QualityData) => void;
}

export const QualityInspection: React.FC<QualityInspectionProps> = ({
  batchId,
  existingQuality,
  onSubmit
}) => {
  const [hardness, setHardness] = useState(existingQuality?.hardness?.toString() || '45');
  const [microstructure, setMicrostructure] = useState(existingQuality?.microstructure || 'martensite');
  const [defects, setDefects] = useState<string[]>(existingQuality?.defects || []);
  const [coolingRateDeviation, setCoolingRateDeviation] = useState(
    existingQuality?.coolingRateDeviation?.toString() || '5'
  );

  const defectOptions = ['裂纹', '气孔', '偏析', '过热', '过烧'];

  const toggleDefect = (defect: string) => {
    setDefects(prev =>
      prev.includes(defect)
        ? prev.filter(d => d !== defect)
        : [...prev, defect]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      batchId,
      inspectionTime: Date.now(),
      hardness: parseFloat(hardness),
      microstructure,
      defects,
      passed: defects.length === 0 && Math.abs(parseFloat(coolingRateDeviation)) < 15,
      coolingRateDeviation: parseFloat(coolingRateDeviation)
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 16 }}>
      <h4 style={{ marginBottom: 16, color: '#333' }}>质量检验</h4>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#666' }}>
          硬度 (HRC)
        </label>
        <input
          type="number"
          value={hardness}
          onChange={(e) => setHardness(e.target.value)}
          style={{
            width: '100%',
            padding: 10,
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 14
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#666' }}>
          显微组织
        </label>
        <select
          value={microstructure}
          onChange={(e) => setMicrostructure(e.target.value)}
          style={{
            width: '100%',
            padding: 10,
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 14
          }}
        >
          <option value="martensite">马氏体</option>
          <option value="bainite">贝氏体</option>
          <option value="ferrite">铁素体</option>
          <option value="pearlite">珠光体</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#666' }}>
          缺陷检测
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {defectOptions.map((defect) => (
            <button
              key={defect}
              type="button"
              onClick={() => toggleDefect(defect)}
              style={{
                padding: '6px 16px',
                border: '1px solid #ddd',
                borderRadius: 16,
                backgroundColor: defects.includes(defect) ? '#f44336' : '#f5f5f5',
                color: defects.includes(defect) ? 'white' : '#666',
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              {defect}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#666' }}>
          冷却速率偏差 (%)
        </label>
        <input
          type="number"
          value={coolingRateDeviation}
          onChange={(e) => setCoolingRateDeviation(e.target.value)}
          style={{
            width: '100%',
            padding: 10,
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 14
          }}
        />
      </div>

      <button
        type="submit"
        style={{
          width: '100%',
          padding: 12,
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        提交检验结果
      </button>

      {existingQuality && (
        <div style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: existingQuality.passed ? '#e8f5e9' : '#ffebee',
          borderRadius: 6,
          fontSize: 13
        }}>
          {existingQuality.passed ? '✅ 检验通过' : '❌ 检验未通过'}
        </div>
      )}
    </form>
  );
};
