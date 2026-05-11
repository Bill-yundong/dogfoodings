'use client';

import { useEffect, useState } from 'react';
import { LightPollutionMap } from '@/components/LightPollutionMap';
import { AlignmentStatus } from '@/components/AlignmentStatus';
import { Building, LightSource, SimulationResult, AlignmentData } from '@/lib/types';
import { runLightPollutionSimulation } from '@/lib/rayTracer';
import { dbManager } from '@/lib/indexedDB';
import { dataAlignmentService } from '@/lib/dataAlignment';
import { sampleBuildings, sampleLightSources, sampleMaterials } from '@/lib/sampleData';

export default function Home() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [lightSources, setLightSources] = useState<LightSource[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [alignments, setAlignments] = useState<AlignmentData[]>([]);
  const [alignmentReport, setAlignmentReport] = useState({
    total: 0,
    aligned: 0,
    conflicts: 0,
    pending: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const gridSize = 100;

  useEffect(() => {
    const initializeData = async () => {
      try {
        const existingBuildings = await dbManager.getAllBuildings();
        const existingMaterials = await dbManager.getAllMaterials();

        if (existingMaterials.length === 0) {
          for (const material of sampleMaterials) {
            await dbManager.saveMaterial(material);
          }
        }

        if (existingBuildings.length === 0) {
          for (const building of sampleBuildings) {
            await dbManager.saveBuilding(building);
          }
          setBuildings(sampleBuildings);
        } else {
          setBuildings(existingBuildings);
        }

        setLightSources(sampleLightSources);

        const savedAlignments = await dbManager.getAllAlignments();
        setAlignments(savedAlignments);

        const report = await dataAlignmentService.getAlignmentReport();
        setAlignmentReport(report);

        setIsInitialized(true);
      } catch (error) {
        console.error('初始化数据失败:', error);
        setBuildings(sampleBuildings);
        setLightSources(sampleLightSources);
        setIsInitialized(true);
      }
    };

    initializeData();
  }, []);

  const runSimulation = async () => {
    if (buildings.length === 0 || lightSources.length === 0) {
      alert('请先初始化建筑物和光源数据');
      return;
    }

    setIsLoading(true);
    try {
      const result = await runLightPollutionSimulation(
        buildings,
        lightSources,
        { gridSize, maxReflections: 5, rayCount: 500, attenuationRate: 0.05 }
      );
      setSimulationResult(result);
    } catch (error) {
      console.error('模拟失败:', error);
      alert('模拟失败，请检查控制台');
    } finally {
      setIsLoading(false);
    }
  };

  const runAlignment = async () => {
    if (buildings.length === 0) {
      alert('请先初始化建筑物数据');
      return;
    }

    setIsLoading(true);
    try {
      const epaDataMap = new Map();
      const planningDataMap = new Map();

      for (const building of buildings) {
        const baseReflectivity = building.facadeMaterial.reflectivity;
        const epaVariation = (Math.random() - 0.5) * 0.2;
        const planningVariation = (Math.random() - 0.5) * 0.2;

        epaDataMap.set(building.id, {
          buildingId: building.id,
          measuredReflectivity: Math.max(
            0.05,
            Math.min(0.95, baseReflectivity + epaVariation)
          ),
          measurementDate: new Date().toISOString(),
          confidence: 0.7 + Math.random() * 0.3,
        });

        planningDataMap.set(building.id, {
          buildingId: building.id,
          approvedReflectivity: Math.max(
            0.05,
            Math.min(0.95, baseReflectivity + planningVariation)
          ),
          approvalDate: new Date().toISOString(),
          materialSpecification: building.facadeMaterial.name,
        });
      }

      const newAlignments = await dataAlignmentService.batchAlignBuildings(
        buildings,
        epaDataMap,
        planningDataMap
      );

      setAlignments(newAlignments);
      const report = await dataAlignmentService.getAlignmentReport();
      setAlignmentReport(report);

      const updatedBuildings = await dbManager.getAllBuildings();
      setBuildings(updatedBuildings);
    } catch (error) {
      console.error('对齐失败:', error);
      alert('数据对齐失败，请检查控制台');
    } finally {
      setIsLoading(false);
    }
  };

  const resetData = async () => {
    try {
      for (const building of sampleBuildings) {
        await dbManager.saveBuilding(building);
      }
      setBuildings(sampleBuildings);
      setSimulationResult(null);
    } catch (error) {
      console.error('重置数据失败:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            LightLogic - 城市光污染分布建模系统
          </h1>
          <p className="text-gray-400">
            基于 Next.js 的城市光污染分布建模系统，实现反射亮度数据在环保局与规划设计系统间的动态对齐
          </p>
        </header>

        {!isInitialized ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-xl">初始化数据中...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  光污染分布地图
                </h2>
                <LightPollutionMap
                  buildings={buildings}
                  lightSources={lightSources}
                  simulationResult={simulationResult}
                  gridSize={gridSize}
                />

                {simulationResult && (
                  <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      模拟结果统计
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">总光强</div>
                        <div className="text-white font-bold">
                          {simulationResult.totalIntensity.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">热点数量</div>
                        <div className="text-white font-bold">
                          {simulationResult.hotspots.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">最大光强</div>
                        <div className="text-white font-bold">
                          {simulationResult.hotspots.length > 0
                            ? simulationResult.hotspots[0].intensity.toFixed(2)
                            : '0.00'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  操作面板
                </h2>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={runSimulation}
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
                  >
                    {isLoading ? '运行中...' : '运行光污染模拟'}
                  </button>
                  <button
                    onClick={runAlignment}
                    disabled={isLoading}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
                  >
                    执行数据对齐
                  </button>
                  <button
                    onClick={resetData}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    重置数据
                  </button>
                </div>
              </div>

              <div className="mt-6 bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  建筑物列表
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">名称</th>
                        <th className="text-left py-2">位置</th>
                        <th className="text-left py-2">材料</th>
                        <th className="text-left py-2">反射系数</th>
                        <th className="text-left py-2">楼层</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildings.map((building) => (
                        <tr
                          key={building.id}
                          className="border-b border-gray-700 text-white"
                        >
                          <td className="py-2">{building.name}</td>
                          <td className="py-2">
                            ({building.x}, {building.y})
                          </td>
                          <td className="py-2">
                            {building.facadeMaterial.name}
                          </td>
                          <td className="py-2">
                            {building.facadeMaterial.reflectivity.toFixed(2)}
                          </td>
                          <td className="py-2">{building.floors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <AlignmentStatus
                alignments={alignments}
                report={alignmentReport}
              />

              <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="text-xl font-bold text-white mb-4">
                  光源列表
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {lightSources.map((source) => (
                    <div
                      key={source.id}
                      className="bg-gray-700 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-white font-medium">
                          {source.type === 'streetlight'
                            ? '路灯'
                            : source.type === 'building'
                            ? '建筑照明'
                            : '广告灯'}
                        </div>
                        <div className="text-yellow-400 text-sm">
                          强度: {source.intensity.toFixed(1)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        位置: ({source.x}, {source.y}) | 波长: {source.wavelength}nm
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="text-xl font-bold text-white mb-4">
                  系统说明
                </h2>
                <div className="text-sm text-gray-300 space-y-2">
                  <p>
                    <strong className="text-white">功能说明:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>使用异步光学追踪算法模拟光辐射强度</li>
                    <li>利用 IndexedDB 存储建筑物反射系数库</li>
                    <li>实现环保局与规划系统数据动态对齐</li>
                    <li>可视化展示城市光污染分布情况</li>
                  </ul>
                  <p className="mt-4">
                    <strong className="text-white">使用方法:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>点击"运行光污染模拟"查看光污染分布</li>
                    <li>点击"执行数据对齐"进行数据一致性检查</li>
                    <li>查看右侧对齐状态面板了解详情</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
