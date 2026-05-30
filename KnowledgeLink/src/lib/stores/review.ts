import { writable, derived } from 'svelte/store'
import { reviewCardsRepo, reviewLogsRepo } from '$lib/db/repositories'
import { generateId } from '$lib/utils/id'
import { now, daysSince } from '$lib/utils/time'
import { scheduleReview, initializeCard, type CardState } from '$lib/engines/scheduler'
import { predictCognitiveLoad, classifyLoad, recommendSessionSize } from '$lib/engines/cognitive-load'

interface ReviewCard {
  id: string; noteId: string; nodeId: string; front: string; back: string;
  difficulty: number; stability: number; retrievability: number;
  nextReviewAt: number; reviewCount: number; lapseCount: number; easeFactor: number
}

interface ReviewLog {
  id: string; cardId: string; rating: number; cognitiveLoad: number;
  elapsedDays: number; scheduledDays: number; reviewedAt: number
}

function createReviewStore() {
  const { subscribe, set, update } = writable<ReviewCard[]>([])
  const sessionCards = writable<ReviewCard[]>([])
  const currentCardIndex = writable(0)
  const sessionActive = writable(false)

  const todayCards = derived({ subscribe }, (cards: ReviewCard[]) => {
    const t = now()
    return cards.filter(c => c.nextReviewAt <= t).sort((a, b) => a.nextReviewAt - b.nextReviewAt)
  })

  const totalCognitiveLoad = derived({ subscribe }, (cards: ReviewCard[]) => {
    const dueCards = cards.filter(c => c.nextReviewAt <= now())
    if (dueCards.length === 0) return 0
    return dueCards.reduce((sum, card) => {
      return sum + predictCognitiveLoad({
        difficulty: card.difficulty,
        daysSinceLastReview: card.nextReviewAt > 0 ? daysSince(card.nextReviewAt - card.stability * 86400000) : 30,
        relatedCardCount: dueCards.length
      })
    }, 0)
  })

  return {
    subscribe,
    todayCards,
    totalCognitiveLoad,
    sessionCards,
    currentCardIndex,
    sessionActive,
    async load() {
      const cards = await reviewCardsRepo.getAll() as ReviewCard[]
      set(cards)
    },
    async addCard(card: Omit<ReviewCard, 'id' | 'nextReviewAt' | 'reviewCount' | 'lapseCount' | 'easeFactor' | 'stability' | 'retrievability' | 'difficulty'>) {
      const init = initializeCard()
      const newCard: ReviewCard = {
        ...card, id: generateId(),
        difficulty: 5, stability: init.stability, retrievability: init.retrievability,
        easeFactor: init.easeFactor, nextReviewAt: now(), reviewCount: 0, lapseCount: 0
      }
      await reviewCardsRepo.add(newCard)
      update(cards => [...cards, newCard])
      return newCard
    },
    async rateCard(cardId: string, rating: number) {
      const all = await reviewCardsRepo.getAll() as ReviewCard[]
      const card = all.find(c => c.id === cardId)
      if (!card) return
      const t = now()
      const cardState: CardState = {
        difficulty: card.difficulty, stability: card.stability,
        retrievability: card.retrievability, easeFactor: card.easeFactor,
        reviewCount: card.reviewCount, lapseCount: card.lapseCount,
        lastReviewAt: card.nextReviewAt - card.stability * 86400000
      }
      const result = scheduleReview(cardState, rating, t)
      const cognitiveLoad = predictCognitiveLoad({
        difficulty: card.difficulty,
        daysSinceLastReview: cardState.lastReviewAt > 0 ? daysSince(cardState.lastReviewAt) : 30,
        relatedCardCount: 1
      })
      const updated: ReviewCard = {
        ...card, difficulty: rating < 3 ? Math.min(card.difficulty + 1, 10) : Math.max(card.difficulty - 0.5, 1),
        stability: result.newStability, retrievability: result.newRetrievability,
        easeFactor: result.newEaseFactor, nextReviewAt: result.nextReviewAt,
        reviewCount: card.reviewCount + 1, lapseCount: rating < 3 ? card.lapseCount + 1 : card.lapseCount
      }
      await reviewCardsRepo.put(updated)
      const log: ReviewLog = {
        id: generateId(), cardId, rating, cognitiveLoad,
        elapsedDays: Math.round((t - (cardState.lastReviewAt || t)) / 86400000),
        scheduledDays: result.interval, reviewedAt: t
      }
      await reviewLogsRepo.add(log)
      update(cards => cards.map(c => c.id === cardId ? updated : c))
    },
    startSession(cards: ReviewCard[]) {
      sessionCards.set(cards)
      currentCardIndex.set(0)
      sessionActive.set(true)
    },
    endSession() {
      sessionCards.set([])
      currentCardIndex.set(0)
      sessionActive.set(false)
    },
    getClassification(load: number) { return classifyLoad(load) },
    getRecommendSize(load: number) { return recommendSessionSize(load) }
  }
}

export const reviewStore = createReviewStore()
