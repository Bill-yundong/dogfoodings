import { Component, createEffect, onCleanup, onMount } from 'solid-js';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AppStore } from '../store';
import { HydrantStatus } from '../types';

interface HydrantMapProps {
  store: AppStore;
  mapContainerId: string;
}

const STATUS_COLORS: Record<HydrantStatus, string> = {
  [HydrantStatus.NORMAL]: '#22c55e',
  [HydrantStatus.LOW_PRESSURE]: '#f59e0b',
  [HydrantStatus.CRITICAL]: '#ef4444',
  [HydrantStatus.OFFLINE]: '#6b7280',
  [HydrantStatus.MAINTENANCE]: '#8b5cf6',
};

export const HydrantMap: Component<HydrantMapProps> = (props) => {
  let mapContainer: HTMLElement | undefined;
  let map: maplibregl.Map | undefined;

  const { state, actions } = props.store;

  const updateMarkers = () => {
    if (!map) return;

    const markers = document.querySelectorAll('.hydrant-marker');
    markers.forEach((m) => m.remove());

    state.hydrants.forEach((hydrant) => {
      const el = document.createElement('div');
      el.className = 'hydrant-marker';
      el.style.backgroundColor = STATUS_COLORS[hydrant.status];
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      el.addEventListener('click', () => {
        actions.selectHydrant(hydrant.id);
      });

      new maplibregl.Marker(el)
        .setLngLat([hydrant.position.lng, hydrant.position.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `
            <div style="min-width: 200px;">
              <strong>${hydrant.name}</strong><br/>
              编号: ${hydrant.code}<br/>
              状态: ${hydrant.status}<br/>
              区域: ${hydrant.region}<br/>
              地址: ${hydrant.address}
            </div>
          `
          )
        )
        .addTo(map!);
    });
  };

  onMount(() => {
    if (!mapContainer) return;

    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [116.4, 39.9],
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      updateMarkers();
    });
  });

  createEffect(() => {
    if (state.hydrants.length > 0 && map?.loaded()) {
      updateMarkers();
    }
  });

  onCleanup(() => {
    if (map) {
      map.remove();
    }
  });

  return (
    <div id={props.mapContainerId} ref={mapContainer} class="map-container" />
  );
};
