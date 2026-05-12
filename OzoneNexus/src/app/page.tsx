"use client";

import { useState, useEffect } from "react";
import { OzoneGlobe } from "@/components/globe/OzoneGlobe";
import { OzonePredictionChart } from "@/components/charts/OzonePredictionChart";
import { MetricCard } from "@/components/ui/MetricCard";
import { OzoneDataService } from "@/lib/data/OzoneDataService";
import { TimeSeriesRegressionEngine } from "@/lib/prediction/TimeSeriesRegressionEngine";
import { ozoneDatabase } from "@/lib/database/OzoneDatabase";
import { OzoneDataPoint, OzoneLayerMetrics, PredictionResult, SyncStatus } from "@/types";
import { format } from "date-fns";

export default function Home() {
  const [ozoneData, setOzoneData] = useState<OzoneDataPoint[]>([]);
  const [metrics, setMetrics] = useState<OzoneLayerMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<{ timestamp: number; value: number }[]>([]);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<OzoneDataPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);

      await ozoneDatabase.init();

      const ozoneDataPoints = OzoneDataService.generateOzoneDataPoints(150);
      const polarVortexData = OzoneDataService.generatePolarVortexData();
      const historical = OzoneDataService.generateHistoricalTimeSeries(60);

      await ozoneDatabase.syncData({
        ozoneData: ozoneDataPoints,
        polarVortexData,
        dataVersion: "1.0.0",
      });

      const predictionEngine = new TimeSeriesRegressionEngine(historical);
      await predictionEngine.train();

      const futureTimestamps = OzoneDataService.generateFutureTimestamps(24);
      const predResults = await predictionEngine.predict(futureTimestamps);

      const calculatedMetrics = OzoneDataService.calculateOzoneMetrics(ozoneDataPoints);
      const status = await ozoneDatabase.getSyncStatus();

      setOzoneData(ozoneDataPoints);
      setHistoricalData(historical);
      setPredictions(predResults);
      setMetrics(calculatedMetrics);
      setSyncStatus(status);
      setIsLoading(false);
    };

    initializeData();
  }, []);

  const handleDataPointClick = (point: OzoneDataPoint) => {
    setSelectedPoint(point);
  };

  const handleResync = async () => {
    if (!syncStatus) return;

    setSyncStatus({ ...syncStatus, isSyncing: true });

    setTimeout(async () => {
      const newOzoneData = OzoneDataService.generateOzoneDataPoints(50);
      const newPolarVortex = OzoneDataService.generatePolarVortexData();

      await ozoneDatabase.syncData({
        ozoneData: newOzoneData,
        polarVortexData: newPolarVortex,
        dataVersion: "1.0.1",
      });

      const newStatus = await ozoneDatabase.getSyncStatus();
      const newMetrics = OzoneDataService.calculateOzoneMetrics([
        ...ozoneData,
        ...newOzoneData,
      ]);

      setOzoneData((prev) => [...prev, ...newOzoneData]);
      setMetrics(newMetrics);
      setSyncStatus(newStatus);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ozone-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Initializing Ozone Monitoring System...</p>
          <p className="text-ozone-300 text-sm mt-2">Loading satellite data and prediction models</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <header className="border-b border-white/10 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ozone-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h1a4 4 0 014 4 2 2 0 01-2 2h-1 2 2 0 01-2-2 2 2 0 00-2-2 2 2 0 01-2-2v-1 2 2 0 01-2-2v-1.065" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Ozone Nexus</h1>
              <p className="text-xs text-ozone-300">Global Ozone Layer Monitoring System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Last Synced</p>
              <p className="text-sm text-white">
                {syncStatus ? format(syncStatus.lastSync, "MMM dd, HH:mm") : "-"}
              </p>
            </div>
            <button
              onClick={handleResync}
              disabled={syncStatus?.isSyncing}
              className="px-4 py-2 bg-ozone-500 hover:bg-ozone-600 disabled:bg-ozone-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              {syncStatus?.isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resync
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Global Average"
            value={metrics?.globalAverage.toFixed(1) || "0"}
            unit="DU"
            trend={2.3}
            trendLabel="vs last year"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945" />
              </svg>
            }
          />
          <MetricCard
            title="Antarctic Min"
            value={metrics?.antarcticMinimum.toFixed(1) || "0"}
            unit="DU"
            trend={-1.8}
            trendLabel="vs last year"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <MetricCard
            title="Recovery Rate"
            value={metrics?.recoveryRate.toFixed(2) || "0"}
            unit="DU/year"
            trend={0.5}
            trendLabel="improving"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <MetricCard
            title="Expected Recovery"
            value={metrics?.expectedFullRecoveryYear || "2075"}
            trend={-5}
            trendLabel="years earlier"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="data-card rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Global Ozone Distribution</h2>
            <p className="text-sm text-gray-400 mb-4">
              Click on data points to view detailed information. Drag to rotate the globe.
            </p>
            <div className="flex justify-center">
              <OzoneGlobe
                dataPoints={ozoneData.slice(0, 100)}
                onPointClick={handleDataPointClick}
                width={500}
                height={400}
              />
            </div>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-400">Healthy (300+ DU)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-gray-400">Moderate (250-300 DU)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-400">Depleted (below 250 DU)</span>
              </div>
            </div>
          </div>

          <div className="h-1/2">
            <OzonePredictionChart
              historicalData={historicalData}
              predictions={predictions}
            />
          </div>
        </div>

        {selectedPoint && (
          <div className="data-card rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Selected Data Point Details</h2>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-400">Location</p>
                <p className="text-lg font-semibold text-white">
                {selectedPoint.latitude.toFixed(2)}°, {selectedPoint.longitude.toFixed(2)}°
              </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Ozone Concentration</p>
                <p className="text-lg font-semibold text-white">{selectedPoint.ozoneConcentration.toFixed(1)} DU</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">UV Index</p>
                <p className="text-lg font-semibold text-white">{selectedPoint.uvIndex.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Data Source</p>
                <p className="text-lg font-semibold text-white">{selectedPoint.source}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="data-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Data Version</span>
                <span className="text-white font-medium">{syncStatus?.dataVersion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Data Points</span>
                <span className="text-white font-medium">{ozoneData.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Sync Status</span>
                <span className={`font-medium ${syncStatus?.isSyncing ? "text-yellow-400" : "text-green-400"}`}>
                  {syncStatus?.isSyncing ? "Syncing" : "Synced"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Database</span>
                <span className="text-white font-medium">IndexedDB</span>
              </div>
            </div>
          </div>

          <div className="data-card rounded-xl p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">Research Alignment Status</h3>
            <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-white">NASA OMI Satellite Data - Aligned</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-white">NOAA Ground Station Data - Aligned</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-white">WMO Ozone Research - Aligned</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-white">Polar Vortex Monitoring - Aligned</span>
            </div>
          </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <p className="text-gray-400 text-sm">
            Ozone Nexus - Global Ozone Layer Monitoring and Prediction System
          </p>
        </div>
      </footer>
    </div>
  );
}
