# Caching Strategies for NSU Commute PWA

## 1. Service Worker Caching (PWA)

```javascript
// sw.js - Service Worker caching strategy
const CACHE_NAME = 'nsu-commute-v1'
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
]

// Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

// Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  )
})
```

## 2. HTTP Caching Headers

```nginx
# nginx.conf - HTTP caching configuration
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location ~* \.(html)$ {
  expires 5m;
  add_header Cache-Control "public, must-revalidate";
}
```

## 3. API Response Caching

```typescript
// React Query configuration for API caching
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false
    }
  }
})
```

## 4. Browser Storage Caching

```typescript
// Local storage caching utility
class CacheManager {
  static set(key: string, data: any, ttl: number = 3600000) {
    const item = {
      data,
      timestamp: Date.now(),
      ttl
    }
    localStorage.setItem(key, JSON.stringify(item))
  }
  
  static get(key: string) {
    const item = localStorage.getItem(key)
    if (!item) return null
    
    const parsed = JSON.parse(item)
    if (Date.now() - parsed.timestamp > parsed.ttl) {
      localStorage.removeItem(key)
      return null
    }
    
    return parsed.data
  }
}
```