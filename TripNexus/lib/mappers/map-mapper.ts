import { Location, PathSegment, Coordinates, MapBounds as CoreMapBounds } from '@/lib/types';
import { calculateDistance } from '@/lib/utils/helpers';

export interface MapBounds extends CoreMapBounds {
  northeast: Coordinates;
  southwest: Coordinates;
  center: Coordinates;
  zoom: number;
}

export interface MapMarker {
  id: string;
  position: Coordinates;
  title: string;
  label?: string;
  icon?: string;
  color?: string;
  location: Location;
}

export interface MapPolyline {
  id: string;
  points: Coordinates[];
  color: string;
  weight: number;
  opacity: number;
  segment: PathSegment;
}

export class MapMapper {
  private defaultColor: string = '#3E92CC';
  private highlightColor: string = '#FF6B35';
  private visitedColor: string = '#10B981';

  constructor() {}

  calculateBounds(locations: Location[], padding: number = 0.1): MapBounds {
    if (locations.length === 0) {
      return {
        northeast: { lat: 0, lng: 0 },
        southwest: { lat: 0, lng: 0 },
        center: { lat: 0, lng: 0 },
        zoom: 10,
        north: 0,
        south: 0,
        east: 0,
        west: 0,
        maxLat: 0,
        minLat: 0,
        maxLng: 0,
        minLng: 0,
      };
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const loc of locations) {
      minLat = Math.min(minLat, loc.coordinates.lat);
      maxLat = Math.max(maxLat, loc.coordinates.lat);
      minLng = Math.min(minLng, loc.coordinates.lng);
      maxLng = Math.max(maxLng, loc.coordinates.lng);
    }

    const latPadding = (maxLat - minLat) * padding;
    const lngPadding = (maxLng - minLng) * padding;

    const northeast = {
      lat: maxLat + latPadding,
      lng: maxLng + lngPadding,
    };
    const southwest = {
      lat: minLat - latPadding,
      lng: minLng - lngPadding,
    };
    const center = {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    };

    const latDiff = northeast.lat - southwest.lat;
    const lngDiff = northeast.lng - southwest.lng;
    const maxDiff = Math.max(latDiff, lngDiff);
    const zoom = Math.floor(14 - Math.log2(maxDiff / 0.5));

    return { 
      northeast, 
      southwest, 
      center, 
      zoom: Math.max(3, Math.min(18, zoom)),
      north: northeast.lat,
      south: southwest.lat,
      east: northeast.lng,
      west: southwest.lng,
      maxLat,
      minLat,
      maxLng,
      minLng,
    };
  }

  createMarkers(
    locations: Location[],
    highlightIndex?: number,
    visitedIndices: number[] = []
  ): MapMarker[] {
    return locations.map((loc, index) => {
      let color = this.defaultColor;
      let label = String(index + 1);

      if (visitedIndices.includes(index)) {
        color = this.visitedColor;
      }
      if (index === highlightIndex) {
        color = this.highlightColor;
      }

      return {
        id: loc.id,
        position: loc.coordinates,
        title: loc.name,
        label,
        color,
        location: loc,
      };
    });
  }

  createPolylines(
    segments: PathSegment[],
    animate: boolean = true
  ): MapPolyline[] {
    return segments.map(segment => ({
      id: segment.id,
      points: this.decodePolyline(segment.polyline, segment.from.coordinates, segment.to.coordinates),
      color: this.defaultColor,
      weight: 4,
      opacity: animate ? 0 : 0.8,
      segment,
    }));
  }

  decodePolyline(
    encoded: string,
    from: Coordinates,
    to: Coordinates
  ): Coordinates[] {
    try {
      const points = JSON.parse(atob(encoded));
      if (Array.isArray(points) && points.length >= 2) {
        return points as Coordinates[];
      }
    } catch {
    }

    const midLat = (from.lat + to.lat) / 2;
    const midLng = (from.lng + to.lng) / 2;
    
    const distance = calculateDistance(from, to);
    const offset = distance * 0.1;
    const perpLat = -(to.lng - from.lng) * offset / Math.max(distance, 0.1);
    const perpLng = (to.lat - from.lat) * offset / Math.max(distance, 0.1);

    return [
      from,
      { lat: midLat + perpLat, lng: midLng + perpLng },
      to,
    ];
  }

  encodePolyline(points: Coordinates[]): string {
    return btoa(JSON.stringify(points));
  }

  generateStaticMapUrl(
    locations: Location[],
    width: number = 600,
    height: number = 400
  ): string {
    const bounds = this.calculateBounds(locations);
    const markers = locations.map((loc, i) => 
      `color:0x${i === 0 ? '10B981' : i === locations.length - 1 ? 'EF4444' : '3E92CC'}|label:${i + 1}|${loc.coordinates.lat},${loc.coordinates.lng}`
    ).join('&');

    const path = locations.map(loc => `${loc.coordinates.lat},${loc.coordinates.lng}`).join('|');

    return `https://maps.googleapis.com/maps/api/staticmap?center=${bounds.center.lat},${bounds.center.lng}&zoom=${bounds.zoom}&size=${width}x${height}&maptype=roadmap&markers=${markers}&path=color:0x3E92CC80|weight:4|${path}`;
  }

  getDirectionsUrl(from: Location, to: Location, mode: string = 'driving'): string {
    const params = new URLSearchParams({
      origin: `${from.coordinates.lat},${from.coordinates.lng}`,
      destination: `${to.coordinates.lat},${to.coordinates.lng}`,
      travelmode: mode.toUpperCase(),
    });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  getLocationSearchUrl(query: string): string {
    const params = new URLSearchParams({ query });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }

  getShareUrl(locations: Location[], name: string): string {
    const data = btoa(JSON.stringify({
      name,
      locations: locations.map(l => ({
        n: l.name,
        a: l.address,
        c: l.coordinates,
      })),
    }));
    return `${window.location.origin}/share?d=${data}`;
  }

  parseShareUrl(data: string): { name: string; locations: Location[] } | null {
    try {
      const decoded = JSON.parse(atob(data));
      return {
        name: decoded.name,
        locations: decoded.locations.map((l: { n: string; a: string; c: Coordinates }) => ({
          id: crypto.randomUUID(),
          name: l.n,
          address: l.a,
          coordinates: l.c,
          duration: 60,
          priority: 2,
        })),
      };
    } catch {
      return null;
    }
  }

  calculateElevationGain(points: Coordinates[]): number {
    return 0;
  }

  generateHeatmapData(locations: Location[]): { location: Coordinates; weight: number }[] {
    return locations.map(loc => ({
      location: loc.coordinates,
      weight: loc.priority === 1 ? 1 : loc.priority === 2 ? 0.7 : 0.4,
    }));
  }

  setColors(defaultColor: string, highlightColor: string, visitedColor: string): void {
    this.defaultColor = defaultColor;
    this.highlightColor = highlightColor;
    this.visitedColor = visitedColor;
  }
}

export const createMapMapper = (): MapMapper => {
  return new MapMapper();
};

export default MapMapper;
