import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { cn } from '../../lib/utils'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export interface BaseMapProps {
  center?: [number, number]
  zoom?: number
  height?: string
  className?: string
  children?: React.ReactNode
  onClick?: (lat: number, lng: number) => void
}

// Component to handle map click events
function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  const map = useMap()
  
  useEffect(() => {
    if (!onClick) return
    
    const handleClick = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng)
    }
    
    map.on('click', handleClick)
    
    return () => {
      map.off('click', handleClick)
    }
  }, [map, onClick])
  
  return null
}

export const BaseMap: React.FC<BaseMapProps> = ({
  center = [23.8103, 90.4125], // Default to Dhaka, Bangladesh
  zoom = 13,
  height = '400px',
  className,
  children,
  onClick
}) => {
  return (
    <div className={cn('relative rounded-lg overflow-hidden border border-border', className)} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onClick && <MapClickHandler onClick={onClick} />}
        {children}
      </MapContainer>
    </div>
  )
}

// Custom marker component with better styling
export interface MapMarkerProps {
  position: [number, number]
  title?: string
  description?: string
  icon?: 'default' | 'home' | 'pickup' | 'destination'
  onClick?: () => void
}

export const MapMarker: React.FC<MapMarkerProps> = ({
  position,
  title,
  description,
  icon = 'default',
  onClick
}) => {
  // Create custom icons for different marker types
  const getIcon = (type: string) => {
    const iconConfig = {
      iconSize: [25, 41] as [number, number],
      iconAnchor: [12, 41] as [number, number],
      popupAnchor: [1, -34] as [number, number],
      shadowSize: [41, 41] as [number, number],
    }

    switch (type) {
      case 'home':
        return L.divIcon({
          ...iconConfig,
          className: 'custom-marker home-marker',
          html: `<div class="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                   <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                     <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                   </svg>
                 </div>`
        })
      case 'pickup':
        return L.divIcon({
          ...iconConfig,
          className: 'custom-marker pickup-marker',
          html: `<div class="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                   <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                     <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                   </svg>
                 </div>`
        })
      case 'destination':
        return L.divIcon({
          ...iconConfig,
          className: 'custom-marker destination-marker',
          html: `<div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                   <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                     <path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd"/>
                   </svg>
                 </div>`
        })
      default:
        return new L.Icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          ...iconConfig
        })
    }
  }

  return (
    <Marker 
      position={position} 
      icon={getIcon(icon)}
      eventHandlers={onClick ? { click: onClick } : undefined}
    >
      {(title || description) && (
        <Popup>
          <div className="p-2">
            {title && <h3 className="font-semibold text-sm">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
        </Popup>
      )}
    </Marker>
  )
}
