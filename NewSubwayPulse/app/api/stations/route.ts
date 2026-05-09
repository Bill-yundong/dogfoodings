import { NextResponse } from 'next/server'
import { getDataSyncService } from '@/lib/data-sync-service'

export async function GET() {
  const service = getDataSyncService()
  const stations = service.getStations()
  
  return NextResponse.json({
    success: true,
    data: stations,
    timestamp: Date.now()
  })
}
