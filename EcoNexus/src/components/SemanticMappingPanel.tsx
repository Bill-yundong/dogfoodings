"use client";

import { useState, useMemo } from "react";
import { SemanticMapping } from "@/types";

const mockMappings: SemanticMapping[] = [
  {
    id: "map-001",
    researchTerm: "鸟类迁徙停留地",
    managementTerm: "候鸟补给站",
    mappingType: "equivalent",
    confidence: 0.95,
    domain: "栖息地管理",
    lastVerified: new Date("2024-01-15"),
    sources: ["中科院动物研究所", "国家林业和草原局"],
  },
  {
    id: "map-002",
    researchTerm: "种群动态监测",
    managementTerm: "候鸟数量普查",
    mappingType: "broader",
    confidence: 0.88,
    domain: "监测方法",
    lastVerified: new Date("2024-02-20"),
    sources: ["北京师范大学", "全国鸟类环志中心"],
  },
  {
    id: "map-003",
    researchTerm: "NDVI植被指数",
    managementTerm: "植被覆盖度",
    mappingType: "related",
    confidence: 0.75,
    domain: "环境因子",
    lastVerified: new Date("2024-01-10"),
    sources: ["遥感应用研究所"],
  },
  {
    id: "map-004",
    researchTerm: "繁殖成功率",
    managementTerm: "幼鸟存活率",
    mappingType: "narrower",
    confidence: 0.92,
    domain: "种群参数",
    lastVerified: new Date("2024-03-05"),
    sources: ["鸟类学会"],
  },
  {
    id: "map-005",
    researchTerm: "中途停歇地",
    managementTerm: "迁徙中转站",
    mappingType: "equivalent",
    confidence: 0.98,
    domain: "栖息地管理",
    lastVerified: new Date("2024-02-28"),
    sources: ["国际鸟盟", "湿地国际"],
  },
  {
    id: "map-006",
    researchTerm: "生态承载力",
    managementTerm: "栖息地容量",
    mappingType: "related",
    confidence: 0.82,
    domain: "栖息地管理",
    lastVerified: new Date("2024-01-25"),
    sources: ["生态环境研究中心"],
  },
  {
    id: "map-007",
    researchTerm: "禽流感监测点",
    managementTerm: "疫病防控站",
    mappingType: "equivalent",
    confidence: 0.90,
    domain: "疫病防控",
    lastVerified: new Date("2024-03-10"),
    sources: ["动物卫生与流行病学中心"],
  },
];

const domains = ["全部", "栖息地管理", "监测方法", "环境因子", "种群参数", "疫病防控"];
const mappingTypes = [
  { value: "equivalent", label: "等同", color: "bg-green-500" },
  { value: "broader", label: "更宽泛", color: "bg-blue-500" },
  { value: "narrower", label: "更具体", color: "bg-purple-500" },
  { value: "related", label: "相关", color: "bg-orange-500" },
];

export default function SemanticMappingPanel() {
  const [mappings, setMappings] = useState<SemanticMapping[]>(mockMappings);
  const [selectedDomain, setSelectedDomain] = useState("全部");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMapping, setNewMapping] = useState({
    researchTerm: "",
    managementTerm: "",
    mappingType: "equivalent" as SemanticMapping["mappingType"],
    domain: "栖息地管理",
    source: "",
  });

  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      const matchDomain = selectedDomain === "全部" || m.domain === selectedDomain;
      const matchSearch =
        searchTerm === "" ||
        m.researchTerm.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.managementTerm.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDomain && matchSearch;
    });
  }, [mappings, selectedDomain, searchTerm]);

  const stats = useMemo(() => {
    const byType = mappingTypes.reduce((acc, t) => {
      acc[t.value] = mappings.filter((m) => m.mappingType === t.value).length;
      return acc;
    }, {} as Record<string, number>);
    
    const avgConfidence =
      mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length;
    
    return { byType, avgConfidence, total: mappings.length };
  }, [mappings]);

  const handleAddMapping = () => {
    if (!newMapping.researchTerm || !newMapping.managementTerm) return;

    const mapping: SemanticMapping = {
      id: `map-${Date.now()}`,
      researchTerm: newMapping.researchTerm,
      managementTerm: newMapping.managementTerm,
      mappingType: newMapping.mappingType,
      confidence: 0.7,
      domain: newMapping.domain,
      lastVerified: new Date(),
      sources: newMapping.source ? [newMapping.source] : ["用户添加"],
    };

    setMappings([...mappings, mapping]);
    setShowAddModal(false);
    setNewMapping({
      researchTerm: "",
      managementTerm: "",
      mappingType: "equivalent",
      domain: "栖息地管理",
      source: "",
    });
  };

  const handleVerify = (id: string) => {
    setMappings(
      mappings.map((m) =>
        m.id === id
          ? {
              ...m,
              confidence: Math.min(1, m.confidence + 0.05),
              lastVerified: new Date(),
            }
          : m
      )
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm("确定要删除这个映射关系吗？")) {
      setMappings(mappings.filter((m) => m.id !== id));
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600 bg-green-100";
    if (confidence >= 0.75) return "text-blue-600 bg-blue-100";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getMappingTypeInfo = (type: string) => {
    return mappingTypes.find((t) => t.value === type) || mappingTypes[0];
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">语义映射管理</h2>
            <p className="text-sm text-gray-500 mt-1">
              科研机构术语与保护区管理术语的双向映射
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加映射
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4">
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-gray-600">映射关系总数</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl p-4">
            <div className="text-3xl font-bold text-green-600">{stats.byType.equivalent || 0}</div>
            <div className="text-sm text-gray-600">等同关系</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl p-4">
            <div className="text-3xl font-bold text-blue-600">
              {(stats.byType.broader || 0) + (stats.byType.narrower || 0)}
            </div>
            <div className="text-sm text-gray-600">层级关系</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl p-4">
            <div className="text-3xl font-bold text-purple-600">
              {(stats.avgConfidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">平均置信度</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索术语..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            {domains.map((domain) => (
              <button
                key={domain}
                onClick={() => setSelectedDomain(domain)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedDomain === domain
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredMappings.map((mapping) => {
            const typeInfo = getMappingTypeInfo(mapping.mappingType);
            return (
              <div
                key={mapping.id}
                className="border rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1">
                        <div className="text-xs text-blue-600 font-medium mb-1">科研术语</div>
                        <div className="text-lg font-semibold text-gray-800">
                          {mapping.researchTerm}
                        </div>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <div className={`w-3 h-3 rounded-full ${typeInfo.color} mb-1`}></div>
                        <div className="text-xs text-gray-500">{typeInfo.label}</div>
                        <div className="text-xl text-gray-300">↔</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-green-600 font-medium mb-1">管理术语</div>
                        <div className="text-lg font-semibold text-gray-800">
                          {mapping.managementTerm}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {mapping.domain}
                      </span>
                      <span
                        className={`px-2 py-1 rounded font-medium ${getConfidenceColor(
                          mapping.confidence
                        )}`}
                      >
                        置信度 {(mapping.confidence * 100).toFixed(0)}%
                      </span>
                      <span className="text-gray-500">
                        验证于 {mapping.lastVerified.toLocaleDateString("zh-CN")}
                      </span>
                      <span className="text-gray-400">
                        来源: {mapping.sources.join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleVerify(mapping.id)}
                      className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      验证
                    </button>
                    <button
                      onClick={() => handleDelete(mapping.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredMappings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              没有找到匹配的映射关系
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-6">添加新的语义映射</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  科研机构术语
                </label>
                <input
                  type="text"
                  value={newMapping.researchTerm}
                  onChange={(e) =>
                    setNewMapping({ ...newMapping, researchTerm: e.target.value })
                  }
                  placeholder="例如：鸟类迁徙停留地"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  保护区管理术语
                </label>
                <input
                  type="text"
                  value={newMapping.managementTerm}
                  onChange={(e) =>
                    setNewMapping({ ...newMapping, managementTerm: e.target.value })
                  }
                  placeholder="例如：候鸟补给站"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    映射类型
                  </label>
                  <select
                    value={newMapping.mappingType}
                    onChange={(e) =>
                      setNewMapping({
                        ...newMapping,
                        mappingType: e.target.value as SemanticMapping["mappingType"],
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    {mappingTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    所属领域
                  </label>
                  <select
                    value={newMapping.domain}
                    onChange={(e) =>
                      setNewMapping({ ...newMapping, domain: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    {domains.slice(1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  来源机构（可选）
                </label>
                <input
                  type="text"
                  value={newMapping.source}
                  onChange={(e) =>
                    setNewMapping({ ...newMapping, source: e.target.value })
                  }
                  placeholder="例如：中科院动物研究所"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddMapping}
                className="px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg font-medium transition-colors"
              >
                添加映射
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
