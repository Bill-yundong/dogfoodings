"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Aircraft,
  FlightPlan,
  FlightRoute,
  FlightState,
  ConflictDetectionResult,
  BlackBoxSnapshot,
} from "@/lib/types";
import { generateInitialMockData, updateFlightState } from "@/lib/mockData";
import { dbService } from "@/lib/indexeddb";
import { semanticAlignmentService } from "@/lib/semanticAlignment";
import { conflictDetectionEngine } from "@/lib/conflictDetection";
import FlightMap from "@/components/FlightMap";
import ControlPanel from "@/components/ControlPanel";

export default function SkywayNexusApp() {
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [flightPlans, setFlightPlans] = useState<FlightPlan[]>([]);
  const [routes, setRoutes] = useState<FlightRoute[]>([]);
  const [flightStates, setFlightStates] = useState<FlightState[]>([]);
  const [conflicts, setConflicts] = useState<ConflictDetectionResult[]>([]);
  const [latestSnapshots, setLatestSnapshots] = useState<
    Map<string, BlackBoxSnapshot>
  >(new Map());
  const [selectedFlightPlanId, setSelectedFlightPlanId] = useState<
    string | undefined
  >();
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [semanticAlignmentInfo, setSemanticAlignmentInfo] = useState<{
    source: string;
    target: string;
    confidence: number;
    alignedFields: string[];
  } | null>(null);

  const simulationIntervalRef = useRef<number | null>(null);

  const initializeData = useCallback(async () => {
    await dbService.init();

    const storedPlans = await dbService.getFlightPlans();
    const storedRoutes = await dbService.getFlightRoutes();
    const storedAircraft = await dbService.getAircraft();

    if (
      storedPlans.length > 0 &&
      storedRoutes.length > 0 &&
      storedAircraft.length > 0
    ) {
      setFlightPlans(storedPlans);
      setRoutes(storedRoutes);
      setAircraftList(storedAircraft);

      const activePlans = storedPlans.filter((p) => p.status === "active");
      const states: FlightState[] = [];

      for (const plan of activePlans) {
        const latestSnapshot = await dbService.getLatestBlackBoxSnapshot(
          plan.id
        );
        if (latestSnapshot) {
          states.push(latestSnapshot.flightState);

          const snapshots = await dbService.getBlackBoxSnapshots(plan.id);
          if (snapshots.length > 0) {
            setLatestSnapshots((prev) => {
              const newMap = new Map(prev);
              newMap.set(plan.id, snapshots[snapshots.length - 1]);
              return newMap;
            });
          }
        }
      }

      setFlightStates(states);
    } else {
      const mockData = generateInitialMockData();
      setFlightPlans(mockData.flightPlans);
      setRoutes(mockData.routes);
      setAircraftList(mockData.aircraft);
      setFlightStates(mockData.flightStates);

      for (const route of mockData.routes) {
        await dbService.saveFlightRoute(route);
      }

      for (const aircraft of mockData.aircraft) {
        await dbService.saveAircraft(aircraft);
      }

      for (const plan of mockData.flightPlans) {
        await dbService.saveFlightPlan(plan);
      }

      for (const state of mockData.flightStates) {
        const snapshot: BlackBoxSnapshot = {
          id: uuidv4(),
          flightPlanId: state.flightPlanId,
          snapshotTime: Date.now(),
          flightState: state,
          weatherData: {
            timestamp: Date.now(),
            temperature: 20 + Math.random() * 10,
            humidity: 40 + Math.random() * 30,
            windSpeed: Math.random() * 20,
            windDirection: Math.random() * 360,
            visibility: 10,
            cloudBase: 2000 + Math.random() * 3000,
            precipitation: "none",
          },
          systemAlerts: [],
        };

        await dbService.saveBlackBoxSnapshot(snapshot);
        setLatestSnapshots((prev) => {
          const newMap = new Map(prev);
          newMap.set(state.flightPlanId, snapshot);
          return newMap;
        });
      }
    }

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    initializeData();

    conflictDetectionEngine.addConflictListener((conflict) => {
      console.log("Conflict detected:", conflict);
      dbService.saveConflict(conflict);
      setConflicts((prev) => [...prev, conflict]);
    });

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      conflictDetectionEngine.stop();
    };
  }, [initializeData]);

  useEffect(() => {
    if (selectedFlightPlanId) {
      const plan = flightPlans.find((p) => p.id === selectedFlightPlanId);
      if (plan) {
        const aligned = semanticAlignmentService.alignFlightPlan(
          plan,
          "operator",
          "caac"
        );
        setSemanticAlignmentInfo({
          source: "运营系统",
          target: "民航监管系统",
          confidence: aligned.alignmentConfidence,
          alignedFields: aligned.alignedFields,
        });
      }
    } else {
      setSemanticAlignmentInfo(null);
    }
  }, [selectedFlightPlanId, flightPlans]);

  const handleToggleSimulation = useCallback(() => {
    if (isSimulationRunning) {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      conflictDetectionEngine.stop();
      setIsSimulationRunning(false);
    } else {
      for (const route of routes) {
        conflictDetectionEngine.updateFlightRoute(route);
      }

      for (const plan of flightPlans) {
        conflictDetectionEngine.updateFlightPlan(plan);
      }

      for (const state of flightStates) {
        conflictDetectionEngine.updateFlightState(state);
      }

      conflictDetectionEngine.start();

      simulationIntervalRef.current = window.setInterval(async () => {
        setFlightStates((prevStates) => {
          const updatedStates: FlightState[] = [];

          for (const state of prevStates) {
            const route = routes.find((r) =>
              flightPlans.some(
                (p) => p.id === state.flightPlanId && p.routeId === r.id
              )
            );

            if (route) {
              const newState = updateFlightState(state, route);
              updatedStates.push(newState);
              conflictDetectionEngine.updateFlightState(newState);

              const snapshot: BlackBoxSnapshot = {
                id: uuidv4(),
                flightPlanId: newState.flightPlanId,
                snapshotTime: Date.now(),
                flightState: newState,
                weatherData: {
                  timestamp: Date.now(),
                  temperature: 20 + Math.random() * 10,
                  humidity: 40 + Math.random() * 30,
                  windSpeed: Math.random() * 20,
                  windDirection: Math.random() * 360,
                  visibility: 10,
                  cloudBase: 2000 + Math.random() * 3000,
                  precipitation: "none",
                },
              };

              dbService.saveBlackBoxSnapshot(snapshot);
              dbService.deleteOldBlackBoxSnapshots(newState.flightPlanId, 100);

              setLatestSnapshots((prev) => {
                const newMap = new Map(prev);
                newMap.set(newState.flightPlanId, snapshot);
                return newMap;
              });
            } else {
              updatedStates.push(state);
            }
          }

          return updatedStates;
        });
      }, 2000);

      setIsSimulationRunning(true);
    }
  }, [isSimulationRunning, routes, flightPlans, flightStates]);

  const handleGenerateConflict = useCallback(() => {
    if (flightStates.length < 2) {
      alert("需要至少两个活跃航班才能生成冲突");
      return;
    }

    const [state1, state2] = flightStates;

    const midpoint = {
      lat: (state1.position.lat + state2.position.lat) / 2,
      lng: (state1.position.lng + state2.position.lng) / 2,
      altitude: (state1.altitude + state2.altitude) / 2,
    };

    const conflict: ConflictDetectionResult = {
      id: uuidv4(),
      timestamp: Date.now(),
      flightPlanId1: state1.flightPlanId,
      flightPlanId2: state2.flightPlanId,
      predictedTime: Date.now() + 60000,
      predictedLocation: midpoint,
      horizontalDistance: 2 + Math.random() * 2,
      verticalDistance: 100 + Math.random() * 100,
      riskLevel: Math.random() > 0.5 ? "high" : "critical",
      status: "detected",
    };

    dbService.saveConflict(conflict);
    setConflicts((prev) => [...prev, conflict]);

    setTimeout(() => {
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflict.id ? { ...c, status: "resolved" } : c
        )
      );
    }, 10000);
  }, [flightStates]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">
            正在初始化 SkywayNexus...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-gray-100 dark:bg-gray-900">
      <ControlPanel
        aircraftList={aircraftList}
        flightPlans={flightPlans}
        routes={routes}
        flightStates={flightStates}
        conflicts={conflicts}
        selectedFlightPlanId={selectedFlightPlanId}
        onFlightSelect={setSelectedFlightPlanId}
        latestSnapshots={latestSnapshots}
        isSimulationRunning={isSimulationRunning}
        onToggleSimulation={handleToggleSimulation}
        onGenerateConflict={handleGenerateConflict}
        semanticAlignmentInfo={semanticAlignmentInfo}
      />
      <div className="flex-1 h-full relative">
        <FlightMap
          flightStates={flightStates}
          routes={routes}
          conflicts={conflicts}
          selectedFlightPlanId={selectedFlightPlanId}
          onFlightSelect={setSelectedFlightPlanId}
        />
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            图例
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">
                商业航班
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-green-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">
                物流航班
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-yellow-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">
                私人飞行
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 opacity-30 border-2 border-red-500"></div>
              <span className="text-gray-600 dark:text-gray-400">
                冲突区域
              </span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            系统状态
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 dark:text-gray-400">
                活跃航班
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {flightStates.length}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 dark:text-gray-400">
                告警数量
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {conflicts.filter((c) => c.status !== "resolved").length}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 dark:text-gray-400">
                模拟状态
              </span>
              <span
                className={`font-medium ${
                  isSimulationRunning
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {isSimulationRunning ? "运行中" : "已停止"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
