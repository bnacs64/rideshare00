import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Badge } from '../ui/badge'
import {
  testCompleteSignupFlow,
  testMultipleUsersSignupFlow,
  stressTestSignupFlow,
  runAllSignupTests,
  generateTestReport,
  type SignupFlowTestResult
} from '../../utils/signupFlowTester'
import { TEST_USERS, cleanupTestUsers } from '../../utils/userTestingUtils'
import { runDiagnostics } from '../../utils/testConnection'
import {
  EmailValidationManager,
  type EmailValidationStatus,
  getEmailStatusMessage
} from '../../utils/emailValidationManager'

export const SignupFlowTester: React.FC = () => {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<SignupFlowTestResult[]>([])
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [emailValidationStatus, setEmailValidationStatus] = useState<EmailValidationStatus | null>(null)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const clearLogs = () => {
    setLogs([])
    setResults([])
    setDiagnostics(null)
    setEmailValidationStatus(null)
  }

  const checkEmailValidationStatus = async () => {
    setTesting(true)
    addLog('Checking email validation status...')

    try {
      const status = await EmailValidationManager.getStatus()
      setEmailValidationStatus(status)

      if (status) {
        const message = status.bypass_enabled
          ? `🔓 Email validation bypass is ENABLED. Domains: ${status.allowed_domains.join(', ')}`
          : `🔒 Email validation is ENFORCED. Domains: ${status.allowed_domains.join(', ')}`
        addLog(message)
      } else {
        addLog('❌ Could not retrieve email validation status')
      }
    } catch (error) {
      addLog(`❌ Error checking email validation status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  const enableEmailBypass = async () => {
    setTesting(true)
    addLog('Enabling email validation bypass...')

    try {
      const result = await EmailValidationManager.setupTesting()
      if (result.success) {
        addLog('✅ Email validation bypass enabled for testing')
        await checkEmailValidationStatus()
      } else {
        addLog(`❌ Failed to enable bypass: ${result.error}`)
      }
    } catch (error) {
      addLog(`❌ Error enabling bypass: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  const disableEmailBypass = async () => {
    setTesting(true)
    addLog('Disabling email validation bypass...')

    try {
      const result = await EmailValidationManager.setupProduction()
      if (result.success) {
        addLog('✅ Email validation bypass disabled (production mode)')
        await checkEmailValidationStatus()
      } else {
        addLog(`❌ Failed to disable bypass: ${result.error}`)
      }
    } catch (error) {
      addLog(`❌ Error disabling bypass: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  const runDiagnosticsTest = async () => {
    setTesting(true)
    addLog('Running Supabase diagnostics...')
    
    try {
      const diagnosticsResult = await runDiagnostics()
      setDiagnostics(diagnosticsResult)
      addLog(`Diagnostics completed: Connection ${diagnosticsResult.connection ? 'OK' : 'FAILED'}, Tables ${diagnosticsResult.tables ? 'OK' : 'FAILED'}`)
    } catch (error) {
      addLog(`Diagnostics failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  const testSingleUser = async () => {
    setTesting(true)
    addLog('Testing single user signup flow...')
    
    try {
      const result = await testCompleteSignupFlow(TEST_USERS[0])
      setResults([result])
      addLog(`Single user test ${result.success ? 'PASSED' : 'FAILED'} in ${result.duration}ms`)
      if (result.error) {
        addLog(`Error: ${result.error}`)
      }
    } catch (error) {
      addLog(`Single user test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  const testMultipleUsers = async () => {
    setTesting(true)
    addLog('Testing multiple users signup flow...')
    
    try {
      const results = await testMultipleUsersSignupFlow(TEST_USERS.slice(0, 2))
      setResults(results)
      const successCount = results.filter(r => r.success).length
      addLog(`Multiple users test: ${successCount}/${results.length} passed`)
    } catch (error) {
      addLog(`Multiple users test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  const testStressTest = async () => {
    setTesting(true)
    addLog('Running stress test...')
    
    try {
      const results = await stressTestSignupFlow(3, 1000)
      setResults(results)
      const successCount = results.filter(r => r.success).length
      addLog(`Stress test: ${successCount}/${results.length} passed`)
    } catch (error) {
      addLog(`Stress test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  const runAllTests = async () => {
    setTesting(true)
    addLog('Running comprehensive test suite...')
    
    try {
      const report = await runAllSignupTests()
      addLog('All tests completed. Check console for detailed report.')
      console.log(report)
    } catch (error) {
      addLog(`Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  const cleanupUsers = async () => {
    setTesting(true)
    addLog('Cleaning up test users...')
    
    try {
      const testEmails = TEST_USERS.map(u => u.email)
      const stressEmails = Array.from({ length: 5 }, (_, i) => `stresstest${i + 1}@northsouth.edu`)
      await cleanupTestUsers([...testEmails, ...stressEmails])
      addLog('Test users cleaned up successfully')
    } catch (error) {
      addLog(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  const getStepStatusBadge = (success: boolean) => (
    <Badge variant={success ? "default" : "destructive"}>
      {success ? "✅ PASS" : "❌ FAIL"}
    </Badge>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Signup Flow Testing Suite</CardTitle>
          <CardDescription>
            Test the complete user signup and profile creation flow with various scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              onClick={runDiagnosticsTest}
              disabled={testing}
              variant="outline"
            >
              Run Diagnostics
            </Button>
            <Button
              onClick={checkEmailValidationStatus}
              disabled={testing}
              variant="outline"
            >
              Check Email Status
            </Button>
            <Button
              onClick={enableEmailBypass}
              disabled={testing}
              variant="secondary"
            >
              Enable Bypass
            </Button>
            <Button
              onClick={disableEmailBypass}
              disabled={testing}
              variant="secondary"
            >
              Disable Bypass
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              onClick={testSingleUser}
              disabled={testing}
            >
              Test Single User
            </Button>
            <Button
              onClick={testMultipleUsers}
              disabled={testing}
            >
              Test Multiple Users
            </Button>
            <Button
              onClick={testStressTest}
              disabled={testing}
              variant="secondary"
            >
              Stress Test
            </Button>
            <Button
              onClick={runAllTests}
              disabled={testing}
            >
              Run All Tests
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={cleanupUsers}
              disabled={testing}
              variant="destructive"
              className="w-full"
            >
              Cleanup Test Users
            </Button>
            <Button
              onClick={clearLogs}
              disabled={testing}
              variant="outline"
              className="w-full"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostics Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Connection:</span>
                {getStepStatusBadge(diagnostics.connection)}
              </div>
              <div className="flex items-center gap-2">
                <span>Database Tables:</span>
                {getStepStatusBadge(diagnostics.tables)}
                {diagnostics.tableError && (
                  <span className="text-sm text-red-600">({diagnostics.tableError})</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {emailValidationStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Email Validation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Bypass Enabled:</span>
                {getStepStatusBadge(emailValidationStatus.bypass_enabled)}
                <span className="text-sm text-gray-600">
                  {emailValidationStatus.bypass_enabled ? '(Testing Mode)' : '(Production Mode)'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="font-medium">Allowed Domains:</span>
                <div className="flex flex-wrap gap-1">
                  {emailValidationStatus.allowed_domains.map((domain, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {domain}
                    </Badge>
                  ))}
                </div>
              </div>
              {emailValidationStatus.updated_at && (
                <div className="text-sm text-gray-500">
                  Last updated: {new Date(emailValidationStatus.updated_at).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{result.testName}</h4>
                    {getStepStatusBadge(result.success)}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    Duration: {result.duration}ms
                  </div>
                  
                  {result.error && (
                    <Alert className="mb-2">
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-1">
                    <h5 className="font-medium text-sm">Steps:</h5>
                    {Object.entries(result.steps).map(([stepName, stepResult]) => (
                      <div key={stepName} className="flex items-center gap-2 text-sm">
                        <span className="capitalize">{stepName}:</span>
                        {getStepStatusBadge(stepResult.success)}
                        <span className="text-gray-500">({stepResult.duration}ms)</span>
                        {stepResult.error && (
                          <span className="text-red-600 text-xs">- {stepResult.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">
                {logs.join('\n')}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
