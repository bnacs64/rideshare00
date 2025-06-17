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