import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { LocationManager } from '../components/location/LocationManager'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Alert, AlertDescription } from '../components/ui/alert'
import { User, Settings, MapPin, LogOut } from 'lucide-react'
import type { DriverDetails } from '../types'

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, signOut } = useAuth()

  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    telegram_user_id: user?.telegram_user_id || '',
    default_role: user?.default_role || 'RIDER',
    driver_details: user?.driver_details || null
  })

  if (!user) {
    return <LoadingSpinner message="Loading profile..." />
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDriverDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      driver_details: {
        ...prev.driver_details,
        [name]: name === 'capacity' ? parseInt(value) || 1 : value
      } as DriverDetails
    }))
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await updateProfile({
        ...formData,
        telegram_user_id: typeof formData.telegram_user_id === 'string'
          ? parseInt(formData.telegram_user_id) || null
          : formData.telegram_user_id
      })

      if (error) {
        setError(error.message || 'Failed to update profile')
      } else {
        setSuccess('Profile updated successfully!')
        setEditing(false)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setFormData({
      full_name: user.full_name,
      telegram_user_id: user.telegram_user_id || '',
      default_role: user.default_role,
      driver_details: user.driver_details || null
    })
    setEditing(false)
    setError('')
  }

  // Get home location coordinates for map display
  const getHomeLocationCoords = (): [number, number] | undefined => {
    if (user?.home_location_coords) {
      // Convert from PostGIS format [lng, lat] to [lat, lng] for display
      return [user.home_location_coords[1], user.home_location_coords[0]]
    }
    return undefined
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link to="/dashboard" className="flex items-center gap-2">
                  ← Back to Dashboard
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <User className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Profile</h1>
              </div>
            </div>
            <Button variant="destructive" onClick={signOut} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Success/Error Messages */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Profile Information */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                {!editing && (
                  <Button onClick={() => setEditing(true)} className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  {editing ? (
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-sm text-foreground">{user.full_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telegram_user_id">Telegram User ID</Label>
                  {editing ? (
                    <div className="space-y-1">
                      <Input
                        id="telegram_user_id"
                        name="telegram_user_id"
                        value={formData.telegram_user_id}
                        onChange={handleInputChange}
                        placeholder="e.g., 123456789"
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your Telegram ID by messaging @userinfobot on Telegram
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground">
                      {user.telegram_user_id || 'Not set - required for ride notifications'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_role">Default Role</Label>
                  {editing ? (
                    <Select
                      value={formData.default_role}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, default_role: value as 'DRIVER' | 'RIDER' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RIDER">Rider</SelectItem>
                        <SelectItem value="DRIVER">Driver</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-foreground">
                      {user.default_role === 'DRIVER' ? 'Driver' : 'Rider'}
                    </p>
                  )}
                </div>

                {(editing ? formData.default_role === 'DRIVER' : user.default_role === 'DRIVER') && (
                  <div className="space-y-4 border-t pt-6">
                    <h4 className="text-lg font-medium text-foreground">Driver Details</h4>

                    <div className="space-y-2">
                      <Label htmlFor="car_model">Car Model</Label>
                      {editing ? (
                        <Input
                          id="car_model"
                          name="car_model"
                          value={formData.driver_details?.car_model || ''}
                          onChange={handleDriverDetailsChange}
                          placeholder="e.g., Toyota Axio"
                        />
                      ) : (
                        <p className="text-sm text-foreground">{user.driver_details?.car_model || 'Not specified'}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="capacity">Passenger Capacity</Label>
                      {editing ? (
                        <Select
                          value={String(formData.driver_details?.capacity || 1)}
                          onValueChange={(value) => handleDriverDetailsChange({ target: { name: 'capacity', value } } as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                              <SelectItem key={num} value={String(num)}>
                                {num} passenger{num > 1 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-foreground">
                          {user.driver_details?.capacity || 1} passenger{(user.driver_details?.capacity || 1) > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {editing && (
                  <div className="flex space-x-4 pt-6">
                    <Button onClick={handleSaveProfile} disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Management */}
          <LocationManager
            homeLocation={getHomeLocationCoords()}
            showMap={true}
            showAddButton={true}
          />
        </div>
      </main>
    </div>
  )
}
