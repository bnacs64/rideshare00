import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePickupLocations } from '../hooks/usePickupLocations'
import { useOptIns } from '../hooks/useOptIns'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Alert, AlertDescription } from '../components/ui/alert'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CalendarDays
} from 'lucide-react'
import type { DayOfWeek } from '../types'

const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' }
]

interface ScheduledOptInFormData {
  day_of_week: DayOfWeek | ''
  start_time: string
  pickup_location_id: string
}

export const ScheduledOptInsPage: React.FC = () => {
  const { user } = useAuth()
  const { pickupLocations, loading: locationsLoading } = usePickupLocations()
  const { 
    scheduledOptIns, 
    loading, 
    submitting, 
    createScheduledOptIn, 
    updateScheduledOptIn, 
    deleteScheduledOptIn 
  } = useOptIns()
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingOptIn, setEditingOptIn] = useState<any>(null)
  const [formData, setFormData] = useState<ScheduledOptInFormData>({
    day_of_week: '',
    start_time: '',
    pickup_location_id: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const resetForm = () => {
    setFormData({
      day_of_week: '',
      start_time: '',
      pickup_location_id: ''
    })
    setErrors({})
    setEditingOptIn(null)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.day_of_week) {
      newErrors.day_of_week = 'Day of week is required'
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required'
    }

    if (!formData.pickup_location_id) {
      newErrors.pickup_location_id = 'Pickup location is required'
    }

    // Check for duplicate day
    if (formData.day_of_week && !editingOptIn) {
      const existingOptIn = scheduledOptIns.find(opt => opt.day_of_week === formData.day_of_week)
      if (existingOptIn) {
        newErrors.day_of_week = 'You already have a scheduled opt-in for this day'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      let result
      if (editingOptIn) {
        result = await updateScheduledOptIn(editingOptIn.id, {
          start_time: formData.start_time,
          pickup_location_id: formData.pickup_location_id
        })
      } else {
        result = await createScheduledOptIn({
          day_of_week: formData.day_of_week as DayOfWeek,
          start_time: formData.start_time,
          pickup_location_id: formData.pickup_location_id
        })
      }

      if (result.success) {
        setSubmitSuccess(true)
        setIsCreateModalOpen(false)
        resetForm()
        setTimeout(() => setSubmitSuccess(false), 3000)
      } else {
        setErrors({ submit: 'Failed to save scheduled opt-in. Please try again.' })
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    }
  }

  const handleEdit = (optIn: any) => {
    setEditingOptIn(optIn)
    setFormData({
      day_of_week: optIn.day_of_week,
      start_time: optIn.start_time,
      pickup_location_id: optIn.pickup_location_id
    })
    setIsCreateModalOpen(true)
  }

  const handleToggleActive = async (optIn: any) => {
    await updateScheduledOptIn(optIn.id, { is_active: !optIn.is_active })
  }

  const handleDelete = async (optIn: any) => {
    if (window.confirm(`Are you sure you want to delete the scheduled opt-in for ${optIn.day_of_week}?`)) {
      await deleteScheduledOptIn(optIn.id)
    }
  }

  const handleInputChange = (field: keyof ScheduledOptInFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const getPickupLocationName = (locationId: string): string => {
    const location = pickupLocations.find(loc => loc.id === locationId)
    return location ? location.name : 'Unknown Location'
  }

  if (loading || locationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Scheduled Opt-ins</h1>
                <p className="text-gray-600 mt-2">
                  Set up recurring weekly schedules for automatic ride opt-ins.
                </p>
              </div>
              
              <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
                setIsCreateModalOpen(open)
                if (!open) resetForm()
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingOptIn ? 'Edit Scheduled Opt-in' : 'Create Scheduled Opt-in'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Day of Week */}
                    <div className="space-y-2">
                      <Label htmlFor="day_of_week">Day of Week</Label>
                      <Select
                        value={formData.day_of_week}
                        onValueChange={(value) => handleInputChange('day_of_week', value)}
                        disabled={!!editingOptIn} // Can't change day when editing
                      >
                        <SelectTrigger className={errors.day_of_week ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.day_of_week && (
                        <p className="text-sm text-red-600">{errors.day_of_week}</p>
                      )}
                    </div>

                    {/* Start Time */}
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Preferred Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => handleInputChange('start_time', e.target.value)}
                        className={errors.start_time ? 'border-red-500' : ''}
                      />
                      {errors.start_time && (
                        <p className="text-sm text-red-600">{errors.start_time}</p>
                      )}
                    </div>

                    {/* Pickup Location */}
                    <div className="space-y-2">
                      <Label htmlFor="pickup_location_id">Pickup Location</Label>
                      <Select
                        value={formData.pickup_location_id}
                        onValueChange={(value) => handleInputChange('pickup_location_id', value)}
                      >
                        <SelectTrigger className={errors.pickup_location_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select pickup location" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickupLocations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3" />
                                <span>{location.name}</span>
                                {location.is_default && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Default</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.pickup_location_id && (
                        <p className="text-sm text-red-600">{errors.pickup_location_id}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    {errors.submit && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          {errors.submit}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="flex-1"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {editingOptIn ? 'Update' : 'Create'}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Success Message */}
          {submitSuccess && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Scheduled opt-in saved successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Scheduled Opt-ins List */}
          <div className="space-y-4">
            {scheduledOptIns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Opt-ins</h3>
                  <p className="text-gray-600 mb-6">
                    Create recurring schedules to automatically opt-in for rides on specific days.
                  </p>
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Schedule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              scheduledOptIns.map((optIn) => (
                <Card key={optIn.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-gray-500" />
                          <span className="font-medium">{optIn.day_of_week}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{formatTime(optIn.start_time)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {getPickupLocationName(optIn.pickup_location_id)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(optIn)}
                          className="flex items-center gap-1"
                        >
                          {optIn.is_active ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-green-600" />
                              <span className="text-green-600 text-sm">Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-400 text-sm">Inactive</span>
                            </>
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(optIn)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(optIn)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
