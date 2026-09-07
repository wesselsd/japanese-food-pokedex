export type RatedCheckin = {
  foodId: string
  rating: number
}

export function highestRating(checkins: RatedCheckin[], foodId: string) {
  const ratings = checkins.filter((checkin) => checkin.foodId === foodId).map((checkin) => checkin.rating)
  return ratings.length ? Math.max(...ratings) : 0
}

export function ratingStars(rating: number) {
  const normalizedRating = Math.max(0, Math.min(5, Math.round(rating)))
  return `${'★'.repeat(normalizedRating)}${'☆'.repeat(5 - normalizedRating)}`
}
