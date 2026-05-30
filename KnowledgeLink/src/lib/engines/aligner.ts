export type EntityType = 'book' | 'note' | 'reviewCard' | 'knowledgeNode'

export type Operation = 'create' | 'update' | 'delete'

export interface AlignmentEvent {
	id: string
	source: EntityType
	target: EntityType
	entityId: string
	operation: Operation
	payload: Record<string, any>
	timestamp: number
}

export class IncrementalAligner {
	private eventQueue: AlignmentEvent[] = []
	private handlers: Map<string, (event: AlignmentEvent) => Promise<void>> = new Map()

	registerHandler(key: string, handler: (event: AlignmentEvent) => Promise<void>): void {
		this.handlers.set(key, handler)
	}

	emit(source: EntityType, target: EntityType, entityId: string, operation: Operation, payload: Record<string, any>): void {
		const event: AlignmentEvent = {
			id: crypto.randomUUID(),
			source,
			target,
			entityId,
			operation,
			payload,
			timestamp: Date.now()
		}
		this.eventQueue.push(event)
		this.processQueue()
	}

	private processQueue(): void {
		if (this.eventQueue.length === 0) return
		const event = this.eventQueue.shift()!
		const handlerKey = `${event.source}->${event.target}`
		const handler = this.handlers.get(handlerKey)
		if (handler) {
			handler(event).then(() => {
				this.processQueue()
			})
		} else {
			this.processQueue()
		}
	}

	getPendingCount(): number {
		return this.eventQueue.length
	}
}
