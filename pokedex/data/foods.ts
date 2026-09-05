export type Food = {
  id: string
  number: string
  name: string
  japaneseName: string
  category: string
  description: string
  emoji: string
  color: string
}

export const foods: Food[] = [
  { id: 'ramen', number: '001', name: 'Ramen', japaneseName: 'ラーメン', category: 'Noodles', description: 'A comforting bowl of noodles in a rich, savoury broth.', emoji: '🍜', color: '#e8c4a5' },
  { id: 'sushi', number: '002', name: 'Sushi', japaneseName: '寿司', category: 'Seafood', description: 'Vinegared rice paired with fresh fish, vegetables, or egg.', emoji: '🍣', color: '#f1c1b3' },
  { id: 'okonomiyaki', number: '003', name: 'Okonomiyaki', japaneseName: 'お好み焼き', category: 'Street food', description: 'A savoury cabbage pancake topped with sauce and bonito.', emoji: '🥞', color: '#d4c49e' },
  { id: 'onigiri', number: '004', name: 'Onigiri', japaneseName: 'おにぎり', category: 'Snacks', description: 'Hand-shaped rice triangles, often wrapped in crisp nori.', emoji: '🍙', color: '#c6d8bd' },
  { id: 'takoyaki', number: '005', name: 'Takoyaki', japaneseName: 'たこ焼き', category: 'Street food', description: 'Golden batter balls filled with tender pieces of octopus.', emoji: '🐙', color: '#e4bf9b' },
  { id: 'matcha', number: '006', name: 'Matcha parfait', japaneseName: '抹茶パフェ', category: 'Sweets', description: 'Layered green tea dessert with cream, jelly, and mochi.', emoji: '🍵', color: '#c4d0ad' }
]
