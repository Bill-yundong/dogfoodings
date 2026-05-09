import { NextResponse } from 'next/server'
import { getDataSyncService } from '@/lib/data-sync-service'

export async function POST(
  request: Request,
  { params }: { params: { stationId: string } }
) {
  const service = getDataSyncService()
  const snapshot = service.createSnapshot(params.stationId)

  if (!snapshot) {
    return NextResponse.json({
      success: false,
      error: 'Station not found',
      stationId: params.stationId
    }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: snapshot,
    timestamp: Date.now()
  })
}
