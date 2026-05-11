"use client";

import { useEffect, useState, useMemo } from "react";
import { EdgeHabitatEvaluator, habitatTypes } from "@/lib/habitatEvaluator";
import { generateMockEnvironmentalData } from "@/lib/correlationEngine";
import { HabitatQuality } from "@/types";

const mockSites = [
  { id: "site-1", name: "盐城湿地国家级自然保护区", lat: 33.5, lon: 120.5, type: "湿地" },
  { id: "site-2", name: "崇明东滩鸟类国家级自然保护区", lat: 31.5, lon: 121.8, type: "沿海滩涂" },
  { id: "site-3", name: "扎龙国家级自然保护区", lat: 46.8, lon: 124.3, type: "湿地" },
  { id: "site-4", name: "向海国家级自然保护区", lat: 44.8, lon: 122.3, type: "湿地" },
  { id: "site-5", name: "鄱阳湖国家级自然保护区", lat: 29.1, lon: 116.0, type: "湖泊" },
];

export default function HabitatQualityPanel() {
  const [evaluations, setEvaluations] = useState<Map<string, HabitatQuality>>(new Map());
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(true);
  const [selectedHabitatType, setSelectedHabitatType] = useState<string>("all");

  const evaluator = useMemo(() => new EdgeHabitatEvaluator(), []);
  const envData = useMemo(() => generateMockEnvironmentalData(200), []);

  useEffect(() => {
    const evaluateAll = async () => {
      setIsEvaluating(true);
      const results = new Map<string, HabitatQuality>();

      for (const site of mockSites) {
        await new Promise((r) => setTimeout(r, 100));
        const evaluation = evaluator.evaluate(
          { latitude: site.lat, longitude: site.lon },
          envData,
          site.type
        );
        results.set(site.id, evaluation);
      }

      setEvaluations(results);
      setIsEvaluating(false);
    };

    evaluateAll();
  }, [evaluator, envData]);

  const filteredSites = useMemo(() => {
    if (selectedHabitatType === "all") return mockSites;
    return mockSites.filter((s) => s.type === selectedHabitatType);
  }, [selectedHabitatType]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-100";
    if (score >= 70) return "text-emerald-600 bg-emerald-100";
    if (score >= 55) return "text-yellow-600 bg-yellow-100";
    if (score >= 40) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const getQualityLabel = (score: number) => {
    if (score >= 85) return "优秀";
    if (score >= 70) return "良好";
    if (score >= 55) return "一般";
    if (score >= 40) return "较差";
    return "极差";
  };

  const selectedEvaluation = selectedSite ? evaluations.get(selectedSite) : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">栖息地质量动态评价</h2>
            <p className="text-sm text-gray-500 mt-1">基于边缘计算的实时环境因子分析</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">栖息地类型:</span>
            <select
              value={selectedHabitatType}
              onChange={(e) => setSelectedHabitatType(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">全部</option>
              {habitatTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isEvaluating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600">正在执行边缘侧质量评估...</p>
            <p className="text-sm text-gray-400 mt-1">处理 {envData.length} 条环境因子数据</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {filteredSites.map((site) => {
                  const evaluation = evaluations.get(site.id);
                  if (!evaluation) return null;

                  return (
                    <div
                      key={site.id}
                      onClick={() => setSelectedSite(site.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedSite === site.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{site.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {site.type} · {site.lat.toFixed(2)}°N, {site.lon.toFixed(2)}°E
                          </p>
                          <div className="flex gap-4 mt-3">
                            <div className="text-center">
                              <div className="text-xs text-gray-400">食物</div>
                              <div className="font-medium text-gray-700">
                                {evaluation.foodAvailability.toFixed(0)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-400">水源</div>
                              <div className="font-medium text-gray-700">
                                {evaluation.waterAvailability.toFixed(0)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-400">庇护</div>
                              <div className="font-medium text-gray-700">
                                {evaluation.shelterQuality.toFixed(0)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-400">干扰</div>
                              <div className="font-medium text-gray-700">
                                {evaluation.disturbanceLevel.toFixed(0)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-400">生物多样</div>
                              <div className="font-medium text-gray-700">
                                {evaluation.biodiversityIndex.toFixed(0)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`px-4 py-3 rounded-xl ${getScoreColor(
                            evaluation.overallScore
                          )}`}
                        >
                          <div className="text-3xl font-bold">{evaluation.overallScore}</div>
                          <div className="text-xs text-center mt-1">
                            {getQualityLabel(evaluation.overallScore)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              evaluation.confidence >= 70
                                ? "bg-green-500"
                                : evaluation.confidence >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                          ></div>
                          <span className="text-xs text-gray-500">
                            置信度: {evaluation.confidence}%
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          更新于 {evaluation.lastUpdated.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {selectedEvaluation && (
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-6">
                  <h3 className="font-bold text-gray-800 mb-4">详细分析报告</h3>
                  
                  <div className="space-y-4">
                    {[
                      { label: "食物可获得性", value: selectedEvaluation.foodAvailability },
                      { label: "水源可获得性", value: selectedEvaluation.waterAvailability },
                      { label: "庇护质量", value: selectedEvaluation.shelterQuality },
                      { label: "干扰程度", value: 100 - selectedEvaluation.disturbanceLevel },
                      { label: "生物多样性指数", value: selectedEvaluation.biodiversityIndex },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{item.label}</span>
                          <span className="font-medium">{item.value.toFixed(0)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.value >= 70
                                ? "bg-green-500"
                                : item.value >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${item.value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">综合评分</span>
                      <span
                        className={`text-2xl font-bold ${
                          selectedEvaluation.overallScore >= 70
                            ? "text-green-600"
                            : selectedEvaluation.overallScore >= 50
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {selectedEvaluation.overallScore}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      {getQualityLabel(selectedEvaluation.overallScore)}栖息地
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">评价标准</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>优秀 (≥85分): 最适宜候鸟栖息</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span>良好 (70-84分): 适宜候鸟栖息</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>一般 (55-69分): 基本适宜</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span>较差 (40-54分): 不适宜</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>极差 (&lt;40分): 完全不适宜</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
