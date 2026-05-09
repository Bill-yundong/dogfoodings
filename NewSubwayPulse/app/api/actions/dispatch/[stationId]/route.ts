import { NextResponse } from 'next/server'
import { getDataSyncService } from '@/lib/data-sync-service'

export async function GET(
  request: Request,
  { params }: { params: { stationId: string } }
) {
  const service = getDataSyncService()
  const actions = service.getDispatchActions(params.stationId)

  return NextResponse.json({
    success: true,
    data: actions,
    timestamp: Date.now()
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: { stationId: string } }
) {
  try {
    const body = await request.json()
    const { actionId, status } = body

    if (!actionId || !status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: actionId or status'
      }, { status: 400 })
    }

    const service = getDataSyncService()
    const updated = service.updateDispatchAction(actionId, status)

    if (!updated) {
      return NextResponse.json({
        success: false,
        error: 'Action not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { actionId, status },
      timestamp: Date.now()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Invalid request body'
    }, { status: 400 })
  }
}
