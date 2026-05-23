import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CalendarMapper } from '@/lib/mappers/calendar-mapper';
import type { Trip, DailyItinerary } from '@/lib/types';

const exportRequestSchema = z.object({
  trip: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  dailyItineraries: z.array(
    z.object({
      date: z.string(),
      activities: z.array(
        z.object({
          id: z.string(),
          locationName: z.string(),
          address: z.string().optional(),
          startTime: z.string(),
          endTime: z.string(),
          type: z.enum(['travel', 'visit', 'meal', 'rest']),
          notes: z.string().optional(),
          coordinates: z.object({
            lat: z.number(),
            lng: z.number(),
          }).optional(),
        })
      ),
    })
  ),
  format: z.enum(['ical', 'google', 'outlook']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = exportRequestSchema.parse(body);
    
    const trip: Trip = {
      ...validated.trip,
      startDate: validated.trip.startDate,
      endDate: validated.trip.endDate,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: 'anonymous',
      transportMode: 'driving',
      locations: [],
      tspResult: {
        id: 'temp',
        optimalPath: [],
        optimizedOrder: [],
        totalDistance: 0,
        totalDuration: 0,
        totalTime: 0,
        totalCost: 0,
        segments: [],
        routeLegs: [],
        dailyItineraries: validated.dailyItineraries.map(d => ({
          ...d,
          id: d.date,
          locations: [],
          startTime: d.activities[0]?.startTime || '09:00',
          endTime: d.activities[d.activities.length - 1]?.endTime || '18:00',
          totalDistance: 0,
          totalDuration: 0,
          summary: '',
          activities: d.activities.map(a => ({
            ...a,
            duration: 60,
          })),
        })),
        algorithmUsed: 'nearest_neighbor',
        fitnessScore: 0,
        alternativePaths: [],
      },
    };
    
    const calendarMapper = new CalendarMapper();
    const events = calendarMapper.mapTripToEvents(trip);
    
    const format = validated.format || 'ical';
    
    if (format === 'google') {
      const googleUrls = events.map(event => ({
        eventId: event.id,
        url: calendarMapper.getGoogleCalendarUrl(trip),
      }));
      
      return NextResponse.json({
        success: true,
        data: {
          format: 'google',
          count: events.length,
          urls: googleUrls,
        },
      });
    }
    
    const icalContent = calendarMapper.generateICalContent(trip);
    const filename = `${trip.name.replace(/\s+/g, '_')}_${Date.now()}.ics`;
    
    const response = new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Filename': filename,
        'X-Event-Count': events.length.toString(),
      },
    });
    
    return response;
    
  } catch (error) {
    console.error('[API] iCal 导出失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '参数验证失败',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '日历导出失败',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      supportedFormats: [
        { id: 'ical', name: 'iCal (.ics)', description: '通用日历格式，支持 Apple Calendar、Outlook 等' },
        { id: 'google', name: 'Google Calendar', description: '生成 Google Calendar 添加链接' },
        { id: 'outlook', name: 'Outlook', description: '生成 Outlook 日历添加链接' },
      ],
      eventTypes: [
        { id: 'travel', name: '交通', icon: 'car' },
        { id: 'visit', name: '游览', icon: 'map-pin' },
        { id: 'meal', name: '用餐', icon: 'utensils' },
        { id: 'rest', name: '休息', icon: 'hotel' },
      ],
    },
  });
}
