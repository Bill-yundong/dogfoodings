import { formatDateTime, generateId } from '@/lib/utils/helpers';
import { Trip, Location, CalendarEvent, DailyItinerary } from '@/lib/types';
import { addMinutes, parseISO } from 'date-fns';

export interface CalendarSyncConfig {
  provider: 'google' | 'outlook' | 'apple' | 'generic';
  reminderMinutes: number;
  includeTravelTime: boolean;
  color?: string;
}

export class CalendarMapper {
  private config: CalendarSyncConfig;

  constructor(config: Partial<CalendarSyncConfig> = {}) {
    this.config = {
      provider: 'generic',
      reminderMinutes: 30,
      includeTravelTime: true,
      ...config,
    };
  }

  mapTripToEvents(trip: Trip): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    if (!trip.tspResult) return events;

    for (const dayItinerary of trip.tspResult.dailyItineraries) {
      const dayEvents = this.mapDailyItineraryToEvents(dayItinerary, trip.id);
      events.push(...dayEvents);
    }

    if (this.config.includeTravelTime) {
      const travelEvents = this.mapSegmentsToEvents(trip);
      events.push(...travelEvents);
    }

    return events;
  }

  private mapDailyItineraryToEvents(
    itinerary: DailyItinerary,
    tripId: string
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    let currentTime = this.parseDateTime(itinerary.date, itinerary.startTime);

    for (let i = 0; i < itinerary.locations.length; i++) {
      const location = itinerary.locations[i];

      if (i > 0 && itinerary.locations[i - 1]) {
        const prevLoc = itinerary.locations[i - 1];
        const segment = this.findSegment(prevLoc, location, tripId);
        if (segment) {
          currentTime = addMinutes(currentTime, segment.duration);
        }
      }

      const endTime = addMinutes(currentTime, location.duration);

      const startStr = currentTime.toISOString();
      const endStr = endTime.toISOString();
      events.push({
        id: generateId(),
        locationId: location.id,
        externalId: '',
        provider: this.config.provider,
        title: `📍 ${location.name}`,
        summary: `📍 ${location.name}`,
        description: `参观 ${location.name}，地址：${location.address}`,
        start: startStr,
        end: endStr,
        location: location.address,
        startTime: startStr,
        endTime: endStr,
        status: 'confirmed',
      });

      currentTime = endTime;
    }

    return events;
  }

  private mapSegmentsToEvents(trip: Trip): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    if (!trip.tspResult) return events;

    for (const segment of trip.tspResult.segments) {
      const startStr = new Date().toISOString();
      const endStr = new Date().toISOString();
      events.push({
        id: generateId(),
        externalId: '',
        provider: this.config.provider,
        title: `🚗 前往 ${segment.to.name}`,
        summary: `🚗 前往 ${segment.to.name}`,
        description: `从 ${segment.from.name} 前往 ${segment.to.name}，距离 ${(segment.distance / 1000).toFixed(1)} km`,
        start: startStr,
        end: endStr,
        location: segment.to.address,
        startTime: startStr,
        endTime: endStr,
        status: 'confirmed',
      });
    }

    return events;
  }

  private findSegment(
    from: Location,
    to: Location,
    tripId: string
  ): { duration: number; distance: number } | null {
    return { duration: 30, distance: 10 };
  }

  private parseDateTime(date: string, time: string): Date {
    return parseISO(`${date}T${time}`);
  }

  mapEventsToLocations(events: CalendarEvent[]): Location[] {
    return events
      .filter(e => e.locationId)
      .map(e => ({
        id: e.locationId!,
        name: e.title.replace(/^📍 /, ''),
        address: '',
        coordinates: { lat: 0, lng: 0 },
        duration: Math.max(
          30,
          Math.round(
            (parseISO(e.endTime).getTime() - parseISO(e.startTime).getTime()) / 60000
          )
        ),
        priority: 2,
      }));
  }

  detectConflicts(events: CalendarEvent[], existingEvents: CalendarEvent[]): CalendarEvent[] {
    const conflicts: CalendarEvent[] = [];

    for (const event of events) {
      const eventStart = parseISO(event.startTime).getTime();
      const eventEnd = parseISO(event.endTime).getTime();

      for (const existing of existingEvents) {
        if (existing.id === event.id) continue;

        const existingStart = parseISO(existing.startTime).getTime();
        const existingEnd = parseISO(existing.endTime).getTime();

        if (
          (eventStart >= existingStart && eventStart < existingEnd) ||
          (eventEnd > existingStart && eventEnd <= existingEnd) ||
          (eventStart <= existingStart && eventEnd >= existingEnd)
        ) {
          conflicts.push(event);
          break;
        }
      }
    }

    return conflicts;
  }

  generateICalContent(trip: Trip): string {
    const events = this.mapTripToEvents(trip);
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TripNexus//CN',
      'CALSCALE:GREGORIAN',
    ];

    for (const event of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}@tripnexus.app`);
      lines.push(`DTSTAMP:${this.formatICalDate(new Date())}`);
      lines.push(`DTSTART:${this.formatICalDate(parseISO(event.startTime))}`);
      lines.push(`DTEND:${this.formatICalDate(parseISO(event.endTime))}`);
      lines.push(`SUMMARY:${event.title}`);
      lines.push(`VALARM:TRIGGER:-PT${this.config.reminderMinutes}M`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  private formatICalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  }

  downloadICal(trip: Trip, filename: string = 'trip.ics'): void {
    if (typeof window === 'undefined') return;

    const content = this.generateICalContent(trip);
    const blob = new Blob([content], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getGoogleCalendarUrl(trip: Trip): string {
    if (!trip.tspResult || trip.tspResult.dailyItineraries.length === 0) return '';

    const firstDay = trip.tspResult.dailyItineraries[0];
    const lastDay = trip.tspResult.dailyItineraries[trip.tspResult.dailyItineraries.length - 1];

    const start = this.parseDateTime(firstDay.date, firstDay.startTime);
    const end = this.parseDateTime(lastDay.date, lastDay.endTime);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: trip.name,
      dates: `${this.formatICalDate(start)}/${this.formatICalDate(end)}`,
      details: `TripNexus 智能行程规划\n${trip.locations.map(l => l.name).join(' → ')}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
}

export const createCalendarMapper = (
  config?: Partial<CalendarSyncConfig>
): CalendarMapper => {
  return new CalendarMapper(config);
};

export default CalendarMapper;
