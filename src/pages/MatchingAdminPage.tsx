import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBackgroundMatching } from '../hooks/useBackgroundMatching'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Play,
  BarChart3,
  Clock,
  Zap,
  TrendingUp,
  Activity,
  Calendar,
  RefreshCw
} from 'lucide-react'

export const MatchingAdminPage: React.FC = () => {
  const { 
    loading, 
    error, 
    jobHistory, 
    matchingStats,
    triggerImmediateMatching,
    getJobHistory,
    getMatchingStats,
    initializeSchedules,
    clearError
  } = useBackgroundMatching()

  const [triggerLoading, setTriggerLoading] = useState<string | null>(null)

  useEffect(() => {
    getJobHistory()
    getMatchingStats()
  }, [getJobHistory, getMatchingStats])

  const handleTriggerMatching = async (type: 'daily' | 'optimization') => {
    setTriggerLoading(type)
    try {
      const result = await triggerImmediateMatching(type)
      if (result.success) {
        // Refresh stats after successful trigger
        await getMatchingStats()
      }
    } finally {
      setTriggerLoading(null)
    }
  }

  const handleInitializeSchedules = async () => {
    setTriggerLoading('init')
    try {
      await initializeSchedules()
    } finally {
      setTriggerLoading(null)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'RUNNING':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
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
              <Button variant="outline" size="sm" onClick={() => { getJobHistory(); getMatchingStats(); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Matching Administration</h1>
            <p className="text-gray-600 mt-2">
              Monitor and manage the AI matching system and background processes.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
                <Button variant="ghost" size="sm" onClick={clearError} className="ml-2">
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Daily Matching</h3>
                    <p className="text-sm text-gray-600">Run matching for today & tomorrow</p>
                  </div>
                  <Button
                    onClick={() => handleTriggerMatching('daily')}
                    disabled={triggerLoading === 'daily'}
                  >
                    {triggerLoading === 'daily' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Optimization</h3>
                    <p className="text-sm text-gray-600">Optimize existing matches</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleTriggerMatching('optimization')}
                    disabled={triggerLoading === 'optimization'}
                  >
                    {triggerLoading === 'optimization' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Initialize</h3>
                    <p className="text-sm text-gray-600">Set up matching schedules</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleInitializeSchedules}
                    disabled={triggerLoading === 'init'}
                  >
                    {triggerLoading === 'init' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Cards */}
          {matchingStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                      <p className="text-2xl font-bold text-gray-900">{matchingStats.totalJobs}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">
                        {matchingStats.totalJobs > 0 
                          ? Math.round((matchingStats.successfulJobs / matchingStats.totalJobs) * 100)
                          : 0}%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Rides Created</p>
                      <p className="text-2xl font-bold text-purple-600">{matchingStats.totalRidesCreated}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.round(matchingStats.averageConfidence)}%
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs for detailed views */}
          <Tabs defaultValue="jobs" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="jobs">Job History</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            {/* Job History */}
            <TabsContent value="jobs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Matching Jobs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : jobHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs yet</h3>
                      <p className="text-gray-600">Matching jobs will appear here when they run.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobHistory.map((job) => (
                        <div key={job.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{job.job_type || 'Unknown'}</span>
                              {getStatusBadge(job.status)}
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDate(job.created_at)}
                            </span>
                          </div>
                          
                          {job.results && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              <strong>Results:</strong> {JSON.stringify(job.results, null, 2)}
                            </div>
                          )}
                          
                          {job.error_message && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800">
                              <strong>Error:</strong> {job.error_message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Statistics */}
            <TabsContent value="stats" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Daily Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {matchingStats?.dailyBreakdown ? (
                    <div className="space-y-3">
                      {matchingStats.dailyBreakdown.map((day: any) => (
                        <div key={day.date} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">{day.date}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span>Created: {day.ridesCreated}</span>
                            <span className="text-green-600">Confirmed: {day.confirmed}</span>
                            <span className="text-red-600">Cancelled: {day.cancelled}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No statistics available yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
