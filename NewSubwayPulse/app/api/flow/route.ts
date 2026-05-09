import { NextResponse } from 'next/server'
import { getDataSyncService } from '@/lib/data-sync-service'

export async function GET() {
  const service = getDataSyncService()
  const flowMap = service.getAllFlowData()
  const stations = service.getStations()

  const data = stations.map(station => {
    const flow = flowMap.get(station.id)
    const predictions = service.getPredictions(station.id)
    return {
      station,
      flow,
      predictions
    }
  })

  return NextResponse.json({
    success: true,
    data,
    timestamp: Date.now()
  })
}
