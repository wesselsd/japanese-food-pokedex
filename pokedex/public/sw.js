const CATALOG_IMAGE_CACHE = 'catalog-images-v1'

function isCatalogImage(url) {
  return url.origin === self.location.origin
    && url.pathname.includes('/_nuxt/')
    && /_image\.[^/]+\.png$/.test(url.pathname)
}

async function cacheCatalogImage(request) {
  let cache

  try {
    cache = await caches.open(CATALOG_IMAGE_CACHE)
    const cached = await cache.match(request)
    if (cached) return cached
  } catch (error) {
    console.error('Unable to read the catalog image cache; using the network.', error)
  }

  const response = await fetch(request)
  if (!cache || !response.ok) return response

  try {
    await cache.put(request, response.clone())
  } catch (error) {
    console.error('Unable to cache catalog image.', error)
  }

  return response
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('catalog-images-') && cacheName !== CATALOG_IMAGE_CACHE)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
      .catch((error) => {
        console.error('Unable to clean up old catalog image caches.', error)
      })
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || request.destination !== 'image' || !isCatalogImage(new URL(request.url))) return

  event.respondWith(cacheCatalogImage(request))
})
