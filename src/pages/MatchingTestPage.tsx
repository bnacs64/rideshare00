import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMatching } from '../hooks/useMatching'
import { useOptIns } from '../hooks/useOptIns'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Brain,
  Users,
  MapPin,
  Clock,
  Car,
  Zap
} from 'lucide-react'

export const MatchingTestPage: React.FC = () => {
  const { 
    loading, 
    error, 
    matches, 
    testGeminiConnection, 
    findMatches, 
    createRideFromMatch,
    clearError,
    clearMatches
  } = useMatching()
  
  const { upcomingOptIns } = useOptIns()
  
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [selectedOptIn, setSelectedOptIn] = useState<string>('')
  const [testResults, setTestResults] = useState<any>(null)

  const handleTestConnection = async () => {
    setConnectionStatus('testing')
    clearError()
    
    const result = await testGeminiConnection()
    
    if (result.success) {
      setConnectionStatus('success')
    } else {
      setConnectionStatus('error')
    }
  }

  const handleFindMatches = async () => {
    if (!selectedOptIn) return
    
    clearError()
    clearMatches()
    
    const result = await findMatches(selectedOptIn)
    setTestResults(result)
  }

  const handleCreateRide = async (match: any) => {
    if (!selectedOptIn) return
    
    const selectedOptInData = upcomingOptIns.find(opt => opt.id === selectedOptIn)
    if (!selectedOptInData) return
    
    const result = await createRideFromMatch(match, selectedOptInData.commute_date)
    
    if (result.success) {
      alert('Ride created successfully!')
    }
  }

  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
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
            <h1 className="text-3xl font-bold text-gray-900">AI Matching Test</h1>
            <p className="text-gray-600 mt-2">
              Test the Gemini AI integration and matching functionality.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Tests */}
            <div className="space-y-6">
              {/* Connection Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Gemini AI Connection Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Test the connection to Google Gemini 1.5 Pro API.
                  </p>
                  
                  <Button 
                    onClick={handleTestConnection}
                    disabled={connectionStatus === 'testing'}
                    className="w-full"
                  >
                    {connectionStatus === 'testing' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  
                  {connectionStatus === 'success' && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        ✅ Gemini AI connection successful!
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {connectionStatus === 'error' && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        ❌ Gemini AI connection failed. Check your API key.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Matching Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Matching Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Test AI matching with your upcoming opt-ins.
                  </p>
                  
                  {upcomingOptIns.length === 0 ? (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        No upcoming opt-ins found. Create an opt-in first to test matching.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Opt-in to Test
                        </label>
                        <select
                          value={selectedOptIn}
                          onChange={(e) => setSelectedOptIn(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select an opt-in...</option>
                          {upcomingOptIns.map((optIn) => (
                            <option key={optIn.id} value={optIn.id}>
                              {optIn.commute_date} - {formatTime(optIn.time_window_start)} to {formatTime(optIn.time_window_end)}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <Button 
                        onClick={handleFindMatches}
                        disabled={!selectedOptIn || loading}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Finding Matches...
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4 mr-2" />
                            Find AI Matches
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              {/* Matching Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Matching Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  )}
                  
                  {!loading && matches.length === 0 && !testResults && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No matching results yet. Run a test to see results.</p>
                    </div>
                  )}
                  
                  {!loading && matches.length === 0 && testResults && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        No matches found. Try creating more opt-ins or adjusting time windows.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {matches.length > 0 && (
                    <div className="space-y-4">
                      {matches.map((match, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                match.confidence >= 80 ? 'bg-green-500' : 
                                match.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              <span className="font-medium">
                                Match {index + 1} - {match.confidence}% Confidence
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleCreateRide(match)}
                              disabled={loading}
                            >
                              Create Ride
                            </Button>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{match.reasoning}</p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span>{match.participants.length} participants</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span>~{match.route_optimization.estimated_total_time} minutes</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <Car className="w-4 h-4 text-gray-500" />
                              <span>৳{match.route_optimization.estimated_cost_per_person} per person</span>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t">
                            <h4 className="text-sm font-medium mb-2">Participants:</h4>
                            <div className="space-y-1">
                              {match.participants.map((participant, pIndex) => (
                                <div key={pIndex} className="flex items-center gap-2 text-sm">
                                  <div className={`w-2 h-2 rounded-full ${
                                    participant.role === 'DRIVER' ? 'bg-blue-500' : 'bg-green-500'
                                  }`} />
                                  <span className="font-medium">{participant.role}</span>
                                  <MapPin className="w-3 h-3 text-gray-400" />
                                  <span className="text-gray-600">{participant.pickup_location.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
