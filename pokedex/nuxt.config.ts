export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  ssr: false,
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      supabaseUrl: '',
      supabaseAnonKey: ''
    }
  },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'Japanese Food Pokedex',
      link: [{ rel: 'icon', type: 'image/x-icon', href: `${process.env.NUXT_APP_BASE_URL || '/'}sushi.ico` }],
      meta: [
        { name: 'description', content: 'Keep track of the Japanese foods you have tried.' },
        { name: 'theme-color', content: '#f7f3ec' }
      ]
    }
  }
})
