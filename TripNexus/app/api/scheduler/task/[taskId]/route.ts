import { NextRequest, NextResponse } from 'next/server';

const taskStore = (globalThis as any)._taskStore || new Map();
(globalThis as any)._taskStore = taskStore;

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params;
  const task = taskStore.get(taskId);
  
  if (!task) {
    return NextResponse.json(
      {
        success: false,
        error: '任务不存在',
      },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      progressMessage: task.progressMessage,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      result: task.result,
      error: task.error,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params;
  const task = taskStore.get(taskId);
  
  if (!task) {
    return NextResponse.json(
      {
        success: false,
        error: '任务不存在',
      },
      { status: 404 }
    );
  }
  
  if (task.status === 'running' || task.status === 'queued') {
    task.status = 'cancelled';
    taskStore.set(taskId, task);
    
    return NextResponse.json({
      success: true,
      message: '任务已取消',
      data: {
        taskId,
        status: 'cancelled',
      },
    });
  }
  
  taskStore.delete(taskId);
  
  return NextResponse.json({
    success: true,
    message: '任务已删除',
  });
}
