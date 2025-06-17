import { describe, it, expect } from 'vitest'
import { 
  calculateDistance, 
  isValidCoordinate, 
  formatCoordinates,
  getBoundingBox,
  isWithinRadius
} from '../coordinateUtils'

describe('coordinateUtils', () => {
  describe('calculateDistance', () => {
    it('calculates distance between two points correctly', () => {
      // Distance between Dhaka and Chittagong (approximately 242 km)
      const dhaka = [90.4125, 23.8103]
      const chittagong = [91.8313, 22.3569]
      
      const distance = calculateDistance(dhaka, chittagong)
      
      // Allow for some variance in calculation
      expect(distance).toBeGreaterThan(240000) // 240 km
      expect(distance).toBeLessThan(250000) // 250 km
    })

    it('returns 0 for same coordinates', () => {
      const point = [90.4125, 23.8103]
      const distance = calculateDistance(point, point)
      
      expect(distance).toBe(0)
    })

    it('handles edge cases with extreme coordinates', () => {
      const northPole = [0, 90]
      const southPole = [0, -90]
      
      const distance = calculateDistance(northPole, southPole)
      
      // Should be approximately half the Earth's circumference
      expect(distance).toBeGreaterThan(19000000) // 19,000 km
      expect(distance).toBeLessThan(21000000) // 21,000 km
    })
  })

  describe('isValidCoordinate', () => {
    it('validates correct coordinates', () => {
      expect(isValidCoordinate([90.4125, 23.8103])).toBe(true)
      expect(isValidCoordinate([0, 0])).toBe(true)
      expect(isValidCoordinate([-180, -90])).toBe(true)
      expect(isValidCoordinate([180, 90])).toBe(true)
    })

    it('rejects invalid coordinates', () => {
      expect(isValidCoordinate([181, 23.8103])).toBe(false) // longitude > 180
      expect(isValidCoordinate([90.4125, 91])).toBe(false) // latitude > 90
      expect(isValidCoordinate([-181, 23.8103])).toBe(false) // longitude < -180
      expect(isValidCoordinate([90.4125, -91])).toBe(false) // latitude < -90
      expect(isValidCoordinate([NaN, 23.8103])).toBe(false) // NaN longitude
      expect(isValidCoordinate([90.4125, NaN])).toBe(false) // NaN latitude
    })

    it('rejects non-array inputs', () => {
      expect(isValidCoordinate(null as any)).toBe(false)
      expect(isValidCoordinate(undefined as any)).toBe(false)
      expect(isValidCoordinate('90.4125,23.8103' as any)).toBe(false)
      expect(isValidCoordinate([90.4125] as any)).toBe(false) // missing latitude
    })
  })

  describe('formatCoordinates', () => {
    it('formats coordinates with default precision', () => {
      const formatted = formatCoordinates([90.4125, 23.8103])
      expect(formatted).toBe('90.4125, 23.8103')
    })

    it('formats coordinates with custom precision', () => {
      const formatted = formatCoordinates([90.4125, 23.8103], 2)
      expect(formatted).toBe('90.41, 23.81')
    })

    it('handles zero coordinates', () => {
      const formatted = formatCoordinates([0, 0])
      expect(formatted).toBe('0, 0')
    })

    it('handles negative coordinates', () => {
      const formatted = formatCoordinates([-90.4125, -23.8103])
      expect(formatted).toBe('-90.4125, -23.8103')
    })
  })

  describe('getBoundingBox', () => {
    it('calculates bounding box for a single point', () => {
      const center = [90.4125, 23.8103]
      const radius = 1000 // 1 km
      
      const bbox = getBoundingBox(center, radius)
      
      expect(bbox).toHaveProperty('north')
      expect(bbox).toHaveProperty('south')
      expect(bbox).toHaveProperty('east')
      expect(bbox).toHaveProperty('west')
      
      expect(bbox.north).toBeGreaterThan(center[1])
      expect(bbox.south).toBeLessThan(center[1])
      expect(bbox.east).toBeGreaterThan(center[0])
      expect(bbox.west).toBeLessThan(center[0])
    })

    it('creates larger bounding box for larger radius', () => {
      const center = [90.4125, 23.8103]
      const smallRadius = 1000
      const largeRadius = 5000
      
      const smallBbox = getBoundingBox(center, smallRadius)
      const largeBbox = getBoundingBox(center, largeRadius)
      
      expect(largeBbox.north).toBeGreaterThan(smallBbox.north)
      expect(largeBbox.south).toBeLessThan(smallBbox.south)
      expect(largeBbox.east).toBeGreaterThan(smallBbox.east)
      expect(largeBbox.west).toBeLessThan(smallBbox.west)
    })
  })

  describe('isWithinRadius', () => {
    it('returns true for points within radius', () => {
      const center = [90.4125, 23.8103]
      const nearbyPoint = [90.4135, 23.8113] // Very close point
      const radius = 1000 // 1 km
      
      expect(isWithinRadius(center, nearbyPoint, radius)).toBe(true)
    })

    it('returns false for points outside radius', () => {
      const center = [90.4125, 23.8103]
      const farPoint = [91.4125, 24.8103] // Much farther point
      const radius = 1000 // 1 km
      
      expect(isWithinRadius(center, farPoint, radius)).toBe(false)
    })

    it('returns true for same point', () => {
      const point = [90.4125, 23.8103]
      const radius = 1000
      
      expect(isWithinRadius(point, point, radius)).toBe(true)
    })
  })
})
