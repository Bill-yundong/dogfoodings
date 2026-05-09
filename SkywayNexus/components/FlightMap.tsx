"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FlightState,
  FlightRoute,
  ConflictDetectionResult,
} from "@/lib/types";

interface FlightMapProps {
  flightStates: FlightState[];
  routes: FlightRoute[];
  conflicts: ConflictDetectionResult[];
  selectedFlightPlanId?: string;
  onFlightSelect?: (flightPlanId: string) => void;
}

export default function FlightMap({
  flightStates,
  routes,
  conflicts,
  selectedFlightPlanId,
  onFlightSelect,
}: FlightMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const conflictCirclesRef = useRef<Map<string, L.Circle>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return;

    const map = L.map(mapRef.current).setView([39.9042, 116.4074], 11);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(map);

    mapInstanceRef.current = map;
    initializedRef.current = true;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current.clear();
      polylinesRef.current.clear();
      conflictCirclesRef.current.clear();
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    for (const [routeId, polyline] of polylinesRef.current.entries()) {
      if (!routes.find((r) => r.id === routeId)) {
        mapInstanceRef.current.removeLayer(polyline);
        polylinesRef.current.delete(routeId);
      }
    }

    for (const route of routes) {
      const coords = route.waypoints.map((wp) => [
        wp.coordinate.lat,
        wp.coordinate.lng,
      ]) as [number, number][];

      const existingPolyline = polylinesRef.current.get(route.id);
      if (existingPolyline) {
        existingPolyline.setLatLngs(coords);
      } else {
        const color =
          route.routeType === "logistics"
            ? "#22c55e"
            : route.routeType === "commercial"
            ? "#3b82f6"
            : "#f59e0b";

        const polyline = L.polyline(coords, {
          color,
          weight: 3,
          opacity: 0.7,
          dashArray: "10, 10",
        }).addTo(mapInstanceRef.current);

        polylinesRef.current.set(route.id, polyline);
      }
    }
  }, [routes]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    for (const [conflictId, circle] of conflictCirclesRef.current.entries()) {
      if (!conflicts.find((c) => c.id === conflictId)) {
        mapInstanceRef.current.removeLayer(circle);
        conflictCirclesRef.current.delete(conflictId);
      }
    }

    for (const conflict of conflicts) {
      const existingCircle = conflictCirclesRef.current.get(conflict.id);

      const riskColor =
        conflict.riskLevel === "critical"
          ? "#ef4444"
          : conflict.riskLevel === "high"
          ? "#f97316"
          : conflict.riskLevel === "medium"
          ? "#eab308"
          : "#22c55e";

      const radius =
        conflict.riskLevel === "critical"
          ? 1000
          : conflict.riskLevel === "high"
          ? 750
          : conflict.riskLevel === "medium"
          ? 500
          : 250;

      if (existingCircle) {
        existingCircle.setLatLng([
          conflict.predictedLocation.lat,
          conflict.predictedLocation.lng,
        ]);
        existingCircle.setRadius(radius);
        existingCircle.setStyle({ color: riskColor, fillColor: riskColor });
      } else {
        const circle = L.circle(
          [conflict.predictedLocation.lat, conflict.predictedLocation.lng],
          {
            radius,
            color: riskColor,
            fillColor: riskColor,
            fillOpacity: 0.3,
            weight: 2,
          }
        ).addTo(mapInstanceRef.current);

        circle.bindPopup(
          `冲突: ${conflict.riskLevel}<br>预测时间: ${new Date(
            conflict.predictedTime
          ).toLocaleString()}`
        );

        conflictCirclesRef.current.set(conflict.id, circle);
      }
    }
  }, [conflicts]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    for (const [
      flightPlanId,
      marker,
    ] of markersRef.current.entries()) {
      if (!flightStates.find((s) => s.flightPlanId === flightPlanId)) {
        mapInstanceRef.current.removeLayer(marker);
        markersRef.current.delete(flightPlanId);
      }
    }

    for (const state of flightStates) {
      const isSelected = state.flightPlanId === selectedFlightPlanId;
      const existingMarker = markersRef.current.get(state.flightPlanId);

      if (existingMarker) {
        existingMarker.setLatLng([
          state.position.lat,
          state.position.lng,
        ]);

        const icon = createAircraftIcon(state.heading, isSelected);
        existingMarker.setIcon(icon);

        existingMarker.setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        const icon = createAircraftIcon(state.heading, isSelected);

        const marker = L.marker(
          [state.position.lat, state.position.lng],
          {
            icon,
            zIndexOffset: isSelected ? 1000 : 0,
          }
        ).addTo(mapInstanceRef.current);

        marker.bindPopup(
          `航班: ${state.flightPlanId.slice(0, 8)}<br>高度: ${Math.round(
            state.altitude
          )}m<br>速度: ${Math.round(state.speed)}km/h<br>航向: ${Math.round(
            state.heading
          )}°`
        );

        marker.on("click", () => {
          onFlightSelect?.(state.flightPlanId);
        });

        markersRef.current.set(state.flightPlanId, marker);
      }
    }
  }, [flightStates, selectedFlightPlanId, onFlightSelect]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}

function createAircraftIcon(
  heading: number,
  isSelected: boolean
) {
  const size = isSelected ? 32 : 24;
  const color = isSelected ? "#ef4444" : "#3b82f6";

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="${color}"
      stroke="white"
      stroke-width="1.5"
      transform="rotate(${heading}, 12, 12)"
    >
      <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" />
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
