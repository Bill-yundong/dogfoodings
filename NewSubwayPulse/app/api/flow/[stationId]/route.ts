import { NextResponse } from 'next/server'
import { getDataSyncService } from '@/lib/data-sync-service'

export async function GET(
  request: Request,
  { params }: { params: { stationId: string } }
) {
  const service = getDataSyncService()
  const flow = service.getFlowData(params.stationId)
  const predictions = service.getPredictions(params.stationId)
  const station = service.getStation(params.stationId)

  if (!flow || !station) {
    return NextResponse.json({
      success: false,
      error: 'Station not found',
      stationId: params.stationId
    }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      station,
      flow,
      predictions
    },
    timestamp: Date.now()
  })
}
