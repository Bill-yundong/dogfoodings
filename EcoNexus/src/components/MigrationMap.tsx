"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { MigrationPath } from "@/types";
import { formatDistance, format } from "date-fns";

const birdIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzE2NURGRiIvPjxwYXRoIGQ9Ik0xMCAxNkwxNiAxMEwyMiAxNkwxNiAyMkwxMCAxNloiIGZpbGw9IndoaXRlIi8+PC9zdmc+",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const habitatIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzBGQzZDMiIvPjxwYXRoIGQ9Ik0xMiA2TDEwIDEwSDZMOCAxMkw2IDE2SDEwTDEyIDIwTDE0IDE2SDE4TDE2IDEyTDE4IDEwSDE0TDEyIDZaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const mockMigrationPaths: MigrationPath[] = [
  {
    id: "path-1",
    birdId: "bird-001",
    birdSpecies: "丹顶鹤",
    locations: [
      { latitude: 46.8, longitude: 132.5, timestamp: new Date("2024-03-01") },
      { latitude: 43.0, longitude: 131.0, timestamp: new Date("2024-03-05") },
      { latitude: 40.0, longitude: 124.0, timestamp: new Date("2024-03-10") },
      { latitude: 37.5, longitude: 118.0, timestamp: new Date("2024-03-15") },
      { latitude: 32.0, longitude: 120.5, timestamp: new Date("2024-03-20") },
    ],
    startDate: new Date("2024-03-01"),
    endDate: new Date("2024-03-20"),
    distance: 1850,
    status: "completed",
  },
  {
    id: "path-2",
    birdId: "bird-002",
    birdSpecies: "东方白鹳",
    locations: [
      { latitude: 51.5, longitude: 127.3, timestamp: new Date("2024-03-02") },
      { latitude: 48.0, longitude: 126.0, timestamp: new Date("2024-03-07") },
      { latitude: 42.0, longitude: 123.5, timestamp: new Date("2024-03-12") },
      { latitude: 38.5, longitude: 121.0, timestamp: new Date("2024-03-18") },
      { latitude: 31.0, longitude: 121.5, timestamp: new Date("2024-03-25") },
    ],
    startDate: new Date("2024-03-02"),
    distance: 2100,
    status: "active",
  },
  {
    id: "path-3",
    birdId: "bird-003",
    birdSpecies: "大天鹅",
    locations: [
      { latitude: 55.0, longitude: 85.0, timestamp: new Date("2024-02-20") },
      { latitude: 50.0, longitude: 80.0, timestamp: new Date("2024-02-28") },
      { latitude: 45.0, longitude: 85.0, timestamp: new Date("2024-03-05") },
      { latitude: 40.0, longitude: 90.0, timestamp: new Date("2024-03-12") },
      { latitude: 35.0, longitude: 100.0, timestamp: new Date("2024-03-20") },
      { latitude: 30.0, longitude: 105.0, timestamp: new Date("2024-03-28") },
    ],
    startDate: new Date("2024-02-20"),
    distance: 3200,
    status: "active",
  },
];

const habitatSites = [
  { id: "hab-1", name: "盐城湿地保护区", latitude: 33.5, longitude: 120.5, quality: 92 },
  { id: "hab-2", name: "崇明东滩湿地", latitude: 31.5, longitude: 121.8, quality: 88 },
  { id: "hab-3", name: "扎龙自然保护区", latitude: 46.8, longitude: 124.3, quality: 95 },
  { id: "hab-4", name: "向海自然保护区", latitude: 44.8, longitude: 122.3, quality: 85 },
];

const pathColors = ["#165DFF", "#722ED1", "#F53F3F", "#0FC6C2"];

export default function MigrationMap() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载迁徙路径数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b">
          <h2 className="text-xl font-bold text-gray-800">全球候鸟迁徙路径实时监控</h2>
          <p className="text-sm text-gray-600">基于卫星追踪与地面观测站数据融合</p>
        </div>
        <div className="h-[600px]">
          <MapContainer
            center={[40, 110]}
            zoom={4}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mockMigrationPaths.map((path, idx) => (
              <div key={path.id}>
                <Polyline
                  positions={path.locations.map((loc) => [
                    loc.latitude,
                    loc.longitude,
                  ])}
                  color={pathColors[idx % pathColors.length]}
                  weight={selectedPath === path.id ? 5 : 3}
                  opacity={selectedPath === path.id ? 1 : 0.7}
                  dashArray={path.status === "active" ? "10, 5" : undefined}
                  eventHandlers={{
                    click: () => setSelectedPath(path.id),
                  }}
                />
                {path.locations.map((loc, locIdx) => (
                  <Marker
                    key={`${path.id}-${locIdx}`}
                    position={[loc.latitude, loc.longitude]}
                    icon={birdIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold">{path.birdSpecies}</p>
                        <p>编号: {path.birdId}</p>
                        <p>时间: {format(loc.timestamp, "yyyy-MM-dd")}</p>
                        <p>
                          坐标: {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </div>
            ))}
            {habitatSites.map((site) => (
              <Marker
                key={site.id}
                position={[site.latitude, site.longitude]}
                icon={habitatIcon}
              >
                <Tooltip>
                  <div className="text-sm">
                    <p className="font-bold">{site.name}</p>
                    <p>栖息地质量: {site.quality}/100</p>
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="font-bold text-gray-800 mb-4">追踪中的候鸟</h3>
          <div className="space-y-3">
            {mockMigrationPaths.map((path, idx) => (
              <div
                key={path.id}
                onClick={() => setSelectedPath(path.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                  selectedPath === path.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: pathColors[idx % pathColors.length] }}
                  ></div>
                  <div className="flex-1">
                    <p className="font-medium">{path.birdSpecies}</p>
                    <p className="text-xs text-gray-500">{path.birdId}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      path.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {path.status === "active" ? "迁徙中" : "已完成"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  已飞行 {path.distance} km · {path.locations.length} 个观测点
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="font-bold text-gray-800 mb-4">图例</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span>候鸟位置标记</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary"></div>
              <span>栖息地站点</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-primary"></div>
              <span>已完成路径</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 border-t-2 border-dashed border-primary"></div>
              <span>进行中路径</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
