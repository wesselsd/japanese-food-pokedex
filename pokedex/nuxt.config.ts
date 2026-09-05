export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  ssr: false,
  app: {
    head: {
      title: 'Japanese Food Pokedex',
      meta: [
        { name: 'description', content: 'Keep track of the Japanese foods you have tried.' },
        { name: 'theme-color', content: '#f7f3ec' }
      ]
    }
  }
})
