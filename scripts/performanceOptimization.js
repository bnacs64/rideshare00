#!/usr/bin/env node

/**
 * Performance Optimization Script for NSU Commute PWA
 * This script analyzes and optimizes application performance
 */

import { config } from 'dotenv'
import { writeFileSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

// Load environment variables
config()

async function runPerformanceOptimization() {
  console.log('⚡ NSU Commute PWA - Performance Optimization')
  console.log('=' .repeat(50))
  
  try {
    console.log('\n🔍 Analyzing application performance...')
    
    // 1. Analyze bundle size
    await analyzeBundleSize()
    
    // 2. Check for performance optimizations
    await checkPerformanceOptimizations()
    
    // 3. Generate performance recommendations
    generatePerformanceRecommendations()
    
    // 4. Create monitoring configuration
    createPerformanceMonitoring()
    
    // 5. Generate caching strategies
    generateCachingStrategies()
    
    console.log('\n✅ Performance optimization analysis completed!')
    console.log('\n📋 Next steps:')
    console.log('   1. Review generated performance recommendations')
    console.log('   2. Implement suggested optimizations')
    console.log('   3. Set up performance monitoring')
    console.log('   4. Test performance improvements')
    
  } catch (error) {
    console.error('❌ Performance optimization failed:', error.message)
    process.exit(1)
  }
}

async function analyzeBundleSize() {
  console.log('\n📦 Analyzing bundle size...')
  
  try {
    // Check if dist folder exists
    const distPath = 'dist'
    let totalSize = 0
    let fileCount = 0
    
    try {
      const distStats = statSync(distPath)
      if (distStats.isDirectory()) {
        console.log('   ✅ Build output found')
        // Note: In a real implementation, you'd recursively analyze the dist folder
        console.log('   📊 Bundle analysis requires build completion')
      }
    } catch (err) {
      console.log('   ⚠️  No build output found - run "npm run build" first')
    }
    
    // Analyze package.json dependencies
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    const dependencies = Object.keys(packageJson.dependencies || {})
    const devDependencies = Object.keys(packageJson.devDependencies || {})
    
    console.log(`   📊 Production dependencies: ${dependencies.length}`)
    console.log(`   📊 Development dependencies: ${devDependencies.length}`)
    
    // Check for heavy dependencies
    const heavyDependencies = [
      '@google/generative-ai',
      'react-leaflet',
      'leaflet',
      '@supabase/supabase-js'
    ]
    
    const foundHeavy = dependencies.filter(dep => 
      heavyDependencies.some(heavy => dep.includes(heavy))
    )
    
    if (foundHeavy.length > 0) {
      console.log(`   ⚠️  Heavy dependencies detected: ${foundHeavy.join(', ')}`)
      console.log('   💡 Consider code splitting for these dependencies')
    }
    
  } catch (error) {
    console.log('   ❌ Bundle analysis error:', error.message)
  }
}

async function checkPerformanceOptimizations() {
  console.log('\n⚡ Checking performance optimizations...')
  
  // Check Vite configuration
  try {
    const viteConfig = readFileSync('vite.config.ts', 'utf8')
    
    if (viteConfig.includes('splitVendorChunkPlugin')) {
      console.log('   ✅ Vendor chunk splitting enabled')
    } else {
      console.log('   ⚠️  Vendor chunk splitting not configured')
    }
    
    if (viteConfig.includes('VitePWA')) {
      console.log('   ✅ PWA optimization enabled')
    } else {
      console.log('   ⚠️  PWA optimization not found')
    }
    
    if (viteConfig.includes('rollupOptions')) {
      console.log('   ✅ Rollup optimization configured')
    } else {
      console.log('   ⚠️  Rollup optimization not configured')
    }
    
  } catch (error) {
    console.log('   ❌ Vite config analysis error:', error.message)
  }
  
  // Check for lazy loading
  console.log('\n🔄 Checking for lazy loading implementation...')
  
  try {
    const appTsx = readFileSync('src/App.tsx', 'utf8')
    
    if (appTsx.includes('React.lazy') || appTsx.includes('lazy(')) {
      console.log('   ✅ React lazy loading implemented')
    } else {
      console.log('   ⚠️  React lazy loading not found')
    }
    
    if (appTsx.includes('Suspense')) {
      console.log('   ✅ React Suspense configured')
    } else {
      console.log('   ⚠️  React Suspense not found')
    }
    
  } catch (error) {
    console.log('   ❌ App.tsx analysis error:', error.message)
  }
}

function generatePerformanceRecommendations() {
  console.log('\n📝 Generating performance recommendations...')
  
  const recommendations = `
# NSU Commute PWA - Performance Optimization Recommendations

## 🚀 High Priority Optimizations

### 1. Code Splitting & Lazy Loading
- Implement React.lazy() for route-based code splitting
- Add Suspense boundaries for better loading states
- Split vendor chunks for better caching

\`\`\`typescript
// Example: Lazy load pages
const HomePage = React.lazy(() => import('./pages/HomePage'))
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'))

// Wrap with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
  </Routes>
</Suspense>
\`\`\`

### 2. Bundle Optimization
- Configure Rollup for optimal chunking
- Enable tree shaking for unused code elimination
- Implement dynamic imports for heavy libraries

\`\`\`typescript
// vite.config.ts optimizations
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          maps: ['leaflet', 'react-leaflet'],
          ai: ['@google/generative-ai']
        }
      }
    }
  }
})
\`\`\`

### 3. Image & Asset Optimization
- Implement WebP format with fallbacks
- Add responsive image loading
- Optimize SVG icons and illustrations

### 4. Caching Strategies
- Implement service worker caching
- Configure HTTP caching headers
- Use React Query for API response caching

## 🎯 Medium Priority Optimizations

### 1. Database Query Optimization
- Implement query result caching
- Use database indexes for frequent queries
- Optimize Supabase RLS policies

### 2. API Performance
- Implement request debouncing
- Add response compression
- Use GraphQL subscriptions for real-time data

### 3. UI Performance
- Implement virtual scrolling for large lists
- Use React.memo for expensive components
- Optimize re-renders with useMemo and useCallback

## 📊 Performance Monitoring

### 1. Core Web Vitals
- Largest Contentful Paint (LCP) < 2.5s
- First Input Delay (FID) < 100ms
- Cumulative Layout Shift (CLS) < 0.1

### 2. Custom Metrics
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Bundle size tracking

### 3. Monitoring Tools
- Google PageSpeed Insights
- Lighthouse CI
- Web Vitals extension

## 🔧 Implementation Checklist

- [ ] Implement route-based code splitting
- [ ] Configure optimal bundle chunking
- [ ] Add image optimization
- [ ] Set up performance monitoring
- [ ] Implement caching strategies
- [ ] Optimize database queries
- [ ] Add loading states and skeletons
- [ ] Configure service worker caching

## 📈 Expected Performance Gains

- **Bundle Size**: 30-50% reduction
- **Load Time**: 40-60% improvement
- **Time to Interactive**: 50-70% improvement
- **Lighthouse Score**: 90+ target
`
  
  console.log('   ✅ Performance recommendations generated')
  console.log('   📁 Save to: performance-recommendations.md')
  
  writeFileSync('performance-recommendations.md', recommendations.trim())
}

function createPerformanceMonitoring() {
  console.log('\n📊 Creating performance monitoring configuration...')
  
  const monitoringConfig = `
// Performance Monitoring Configuration
// Add this to your main application file

// Web Vitals monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log('Performance Metric:', metric)
  
  // Example: Send to Google Analytics
  // gtag('event', metric.name, {
  //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
  //   event_category: 'Web Vitals',
  //   event_label: metric.id,
  //   non_interaction: true,
  // })
}

// Monitor Core Web Vitals
getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)

// Custom performance monitoring
export function trackPageLoad(pageName) {
  const startTime = performance.now()
  
  return () => {
    const endTime = performance.now()
    const loadTime = endTime - startTime
    
    sendToAnalytics({
      name: 'page_load_time',
      value: loadTime,
      page: pageName
    })
  }
}

// Bundle size monitoring
export function trackBundleSize() {
  if ('connection' in navigator) {
    const connection = navigator.connection
    sendToAnalytics({
      name: 'connection_type',
      value: connection.effectiveType,
      downlink: connection.downlink
    })
  }
}
`
  
  console.log('   ✅ Performance monitoring configuration generated')
  console.log('   📁 Save to: performance-monitoring.js')
  
  writeFileSync('performance-monitoring.js', monitoringConfig.trim())
}

function generateCachingStrategies() {
  console.log('\n🗄️  Generating caching strategies...')
  
  const cachingConfig = `
# Caching Strategies for NSU Commute PWA

## 1. Service Worker Caching (PWA)

\`\`\`javascript
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
\`\`\`

## 2. HTTP Caching Headers

\`\`\`nginx
# nginx.conf - HTTP caching configuration
location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location ~* \\.(html)$ {
  expires 5m;
  add_header Cache-Control "public, must-revalidate";
}
\`\`\`

## 3. API Response Caching

\`\`\`typescript
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
\`\`\`

## 4. Browser Storage Caching

\`\`\`typescript
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
\`\`\`
`
  
  console.log('   ✅ Caching strategies generated')
  console.log('   📁 Save to: caching-strategies.md')
  
  writeFileSync('caching-strategies.md', cachingConfig.trim())
}

// Run the performance optimization
runPerformanceOptimization()
