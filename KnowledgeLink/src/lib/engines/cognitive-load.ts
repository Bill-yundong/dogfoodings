export function predictCognitiveLoad(params: { difficulty: number; daysSinceLastReview: number; relatedCardCount: number }): number {
	const baseLoad = 0.5
	const difficultyFactor = 1 + (params.difficulty / 10)
	const recencyFactor = 1 / (1 + params.daysSinceLastReview * 0.1)
	const densityFactor = 1 + (params.relatedCardCount / 20)
	return Math.min(baseLoad * difficultyFactor * recencyFactor * densityFactor, 3.0)
}

export function classifyLoad(load: number): 'low' | 'medium' | 'high' {
	if (load < 0.8) return 'low'
	if (load < 1.5) return 'medium'
	return 'high'
}

export function recommendSessionSize(totalLoad: number): number {
	return Math.max(5, Math.floor(30 / Math.max(totalLoad, 0.1)))
}
