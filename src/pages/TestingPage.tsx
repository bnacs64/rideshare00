import React from 'react'
import { SignupFlowTester } from '../components/testing/SignupFlowTester'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export const TestingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">NSU Commute Testing Suite</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive testing tools for user signup, authentication, and profile creation flows.
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Testing Overview</CardTitle>
              <CardDescription>
                This testing suite helps you programmatically test the user signup and authentication flow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">What gets tested:</h3>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Supabase connection and diagnostics</li>
                    <li>• User authentication (signup/signin)</li>
                    <li>• Profile creation and data persistence</li>
                    <li>• Database operations and timeouts</li>
                    <li>• Error handling and recovery</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Test scenarios:</h3>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Single user signup flow</li>
                    <li>• Multiple users in parallel</li>
                    <li>• Stress testing with rapid creation</li>
                    <li>• Connection timeout handling</li>
                    <li>• Profile creation edge cases</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <SignupFlowTester />

          <Card>
            <CardHeader>
              <CardTitle>Test Users</CardTitle>
              <CardDescription>
                Predefined test users that will be used for testing. These can be safely created and deleted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium">Test User 1</h4>
                    <p className="text-sm text-gray-600">test1@northsouth.edu</p>
                    <p className="text-sm text-gray-600">Role: RIDER</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium">Test User 2</h4>
                    <p className="text-sm text-gray-600">test2@northsouth.edu</p>
                    <p className="text-sm text-gray-600">Role: DRIVER</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium">Test User 3</h4>
                    <p className="text-sm text-gray-600">test3@northsouth.edu</p>
                    <p className="text-sm text-gray-600">Role: RIDER</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Note:</strong> All test users use the password "TestPassword123!" and are configured with Dhaka coordinates.</p>
                  <p>Stress test users are created with emails like stresstest1@northsouth.edu, stresstest2@northsouth.edu, etc.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
              <CardDescription>
                Common issues and solutions when testing the signup flow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-600">Timeout Errors</h4>
                  <p className="text-sm text-gray-600">
                    If you see "Session fetch timeout" or "Profile creation timeout" errors:
                  </p>
                  <ul className="text-sm text-gray-600 ml-4 mt-1">
                    <li>• Check your internet connection</li>
                    <li>• Verify Supabase service status</li>
                    <li>• Run diagnostics to check connection health</li>
                    <li>• Try increasing timeout values in the code</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-yellow-600">Database Errors</h4>
                  <p className="text-sm text-gray-600">
                    If you see database-related errors:
                  </p>
                  <ul className="text-sm text-gray-600 ml-4 mt-1">
                    <li>• Check if users table exists and has correct schema</li>
                    <li>• Verify RLS policies allow user creation</li>
                    <li>• Ensure service role key has proper permissions</li>
                    <li>• Check for duplicate key violations</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-600">Authentication Errors</h4>
                  <p className="text-sm text-gray-600">
                    If signup/signin fails:
                  </p>
                  <ul className="text-sm text-gray-600 ml-4 mt-1">
                    <li>• Verify email confirmations are disabled in Supabase</li>
                    <li>• Check if email domain validation is properly bypassed</li>
                    <li>• Ensure auth settings allow new signups</li>
                    <li>• Verify environment variables are correct</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
