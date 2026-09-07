import { describe, expect, it } from 'vitest'
import { highestRating, ratingStars } from '../domain/checkins'

describe('check-in domain rules', () => {
  it('finds the highest rating for a food', () => {
    const checkins = [
      { foodId: 'ramen', rating: 2 },
      { foodId: 'sushi', rating: 5 },
      { foodId: 'ramen', rating: 4 }
    ]

    expect(highestRating(checkins, 'ramen')).toBe(4)
    expect(highestRating(checkins, 'missing')).toBe(0)
  })

  it('formats ratings as five stars', () => {
    expect(ratingStars(3)).toBe('★★★☆☆')
    expect(ratingStars(0)).toBe('☆☆☆☆☆')
    expect(ratingStars(7)).toBe('★★★★★')
  })
})
