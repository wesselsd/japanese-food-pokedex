export default defineNuxtPlugin(() => {
  if (import.meta.dev) return

  if (!('serviceWorker' in navigator)) {
    console.info('Service workers are unavailable; catalog image caching is disabled.')
    return
  }

  const config = useRuntimeConfig()
  const baseURL = config.app.baseURL.endsWith('/') ? config.app.baseURL : `${config.app.baseURL}/`
  const scriptURL = new URL('sw.js', `${window.location.origin}${baseURL}`).toString()

  navigator.serviceWorker.register(scriptURL, { scope: baseURL }).catch((error) => {
    console.error('Unable to register catalog image caching.', error)
  })
})
