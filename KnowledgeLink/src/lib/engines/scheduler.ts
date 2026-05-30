export interface CardState {
	difficulty: number
	stability: number
	retrievability: number
	easeFactor: number
	reviewCount: number
	lapseCount: number
	lastReviewAt: number
}

export interface ScheduleResult {
	nextReviewAt: number
	newStability: number
	newRetrievability: number
	newEaseFactor: number
	interval: number
}

export function scheduleReview(card: CardState, rating: number, now: number): ScheduleResult {
	const desiredRetention = 0.85
	const decay = -0.5
	const elapsedDays = Math.max((now - card.lastReviewAt) / 86400000, 0.01)
	const newEaseFactor = Math.max(0.1, card.easeFactor + 0.08 * (rating - 3))
	const newStability = rating >= 3
		? card.stability * (1 + newEaseFactor * (rating - 3))
		: Math.max(0.1, card.stability * 0.5)
	const newRetrievability = Math.pow(1 + elapsedDays / (newStability * 9), -1)
	const interval = Math.max(1, Math.round(newStability * 9 * Math.pow(desiredRetention / (1 - desiredRetention), 1 / decay) - elapsedDays))
	const nextReviewAt = now + interval * 86400000
	return { nextReviewAt, newStability, newRetrievability, newEaseFactor, interval }
}

export function initializeCard(): CardState {
	return { difficulty: 5, stability: 1, retrievability: 1, easeFactor: 0.5, reviewCount: 0, lapseCount: 0, lastReviewAt: 0 }
}

export function calculateRetrievability(stability: number, elapsedDays: number): number {
	return Math.pow(1 + elapsedDays / (stability * 9), -1)
}
