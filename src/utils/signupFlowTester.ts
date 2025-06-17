import { 
  createTestUser, 
  testUserSignIn, 
  testFetchUserProfile, 
  cleanupTestUsers, 
  TEST_USERS,
  type TestResult,
  type TestUser 
} from './userTestingUtils'
import { runDiagnostics } from './testConnection'

export interface SignupFlowTestResult {
  testName: string
  success: boolean
  error?: string
  duration: number
  steps: {
    [stepName: string]: TestResult
  }
}

/**
 * Test the complete signup flow for a single user
 */
export const testCompleteSignupFlow = async (testUser: TestUser): Promise<SignupFlowTestResult> => {
  const startTime = Date.now()
  const result: SignupFlowTestResult = {
    testName: `Complete Signup Flow - ${testUser.email}`,
    success: false,
    duration: 0,
    steps: {}
  }
  
  try {
    console.log(`🧪 Testing complete signup flow for: ${testUser.email}`)
    
    // Step 1: Create user (signup + profile creation)
    console.log('📝 Step 1: Creating user account and profile...')
    const createResult = await createTestUser(testUser, 15000) // 15 second timeout
    result.steps.createUser = createResult
    
    if (!createResult.success) {
      result.error = `User creation failed: ${createResult.error}`
      result.duration = Date.now() - startTime
      return result
    }
    
    console.log('✅ Step 1 completed successfully')
    
    // Step 2: Test signin
    console.log('🔐 Step 2: Testing user signin...')
    const signInResult = await testUserSignIn(testUser.email, testUser.password, 10000)
    result.steps.signIn = signInResult
    
    if (!signInResult.success) {
      result.error = `Signin failed: ${signInResult.error}`
      result.duration = Date.now() - startTime
      return result
    }
    
    console.log('✅ Step 2 completed successfully')
    
    // Step 3: Test profile fetch
    console.log('👤 Step 3: Testing profile fetch...')
    const userId = createResult.data?.authUser?.id
    if (!userId) {
      result.error = 'No user ID available for profile fetch test'
      result.duration = Date.now() - startTime
      return result
    }
    
    const profileResult = await testFetchUserProfile(userId, 10000)
    result.steps.fetchProfile = profileResult
    
    if (!profileResult.success) {
      result.error = `Profile fetch failed: ${profileResult.error}`
      result.duration = Date.now() - startTime
      return result
    }
    
    console.log('✅ Step 3 completed successfully')
    
    // All steps passed
    result.success = true
    result.duration = Date.now() - startTime
    
    console.log(`🎉 Complete signup flow test passed for ${testUser.email} in ${result.duration}ms`)
    
    return result
    
  } catch (error) {
    console.error('💥 Signup flow test failed:', error)
    result.error = error instanceof Error ? error.message : 'Unknown error'
    result.duration = Date.now() - startTime
    return result
  }
}

/**
 * Test multiple users in parallel
 */
export const testMultipleUsersSignupFlow = async (users: TestUser[] = TEST_USERS): Promise<SignupFlowTestResult[]> => {
  console.log(`🧪 Testing signup flow for ${users.length} users in parallel...`)
  
  const promises = users.map(user => testCompleteSignupFlow(user))
  const results = await Promise.all(promises)
  
  const successCount = results.filter(r => r.success).length
  const failureCount = results.length - successCount
  
  console.log(`📊 Parallel test results: ${successCount} passed, ${failureCount} failed`)
  
  return results
}

/**
 * Test signup flow with connection diagnostics
 */
export const testSignupFlowWithDiagnostics = async (testUser: TestUser): Promise<{
  diagnostics: any
  signupFlow: SignupFlowTestResult
}> => {
  console.log('🔍 Running pre-test diagnostics...')
  const diagnostics = await runDiagnostics()
  
  console.log('🧪 Running signup flow test...')
  const signupFlow = await testCompleteSignupFlow(testUser)
  
  return {
    diagnostics,
    signupFlow
  }
}

/**
 * Stress test: Create multiple users rapidly
 */
export const stressTestSignupFlow = async (
  userCount: number = 5, 
  delayBetweenUsers: number = 1000
): Promise<SignupFlowTestResult[]> => {
  console.log(`⚡ Stress testing signup flow with ${userCount} users...`)
  
  const results: SignupFlowTestResult[] = []
  
  for (let i = 0; i < userCount; i++) {
    const testUser: TestUser = {
      email: `stresstest${i + 1}@northsouth.edu`,
      password: 'TestPassword123!',
      fullName: `Stress Test User ${i + 1}`,
      defaultRole: i % 2 === 0 ? 'RIDER' : 'DRIVER',
      homeLocationCoords: [90.4125, 23.8103],
      homeLocationAddress: 'Dhaka, Bangladesh',
      driverDetails: i % 2 === 1 ? {
        license_number: `STRESS${i + 1}`,
        vehicle_make: 'Toyota',
        vehicle_model: 'Corolla',
        vehicle_year: 2020,
        vehicle_color: 'White',
        vehicle_plate: `STRESS-${i + 1}`,
        max_passengers: 4
      } : null
    }
    
    console.log(`🧪 Creating stress test user ${i + 1}/${userCount}...`)
    const result = await testCompleteSignupFlow(testUser)
    results.push(result)
    
    // Add delay between users to avoid overwhelming the system
    if (i < userCount - 1 && delayBetweenUsers > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenUsers))
    }
  }
  
  const successCount = results.filter(r => r.success).length
  const failureCount = results.length - successCount
  
  console.log(`📊 Stress test results: ${successCount} passed, ${failureCount} failed`)
  
  return results
}

/**
 * Generate a comprehensive test report
 */
export const generateTestReport = (results: SignupFlowTestResult[]): string => {
  const successCount = results.filter(r => r.success).length
  const failureCount = results.length - successCount
  const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
  
  let report = `
📊 SIGNUP FLOW TEST REPORT
========================

Summary:
- Total Tests: ${results.length}
- Passed: ${successCount}
- Failed: ${failureCount}
- Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%
- Average Duration: ${averageDuration.toFixed(0)}ms

Detailed Results:
`
  
  results.forEach((result, index) => {
    report += `
${index + 1}. ${result.testName}
   Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}
   Duration: ${result.duration}ms
   ${result.error ? `Error: ${result.error}` : ''}
   
   Steps:
`
    
    Object.entries(result.steps).forEach(([stepName, stepResult]) => {
      report += `   - ${stepName}: ${stepResult.success ? '✅' : '❌'} (${stepResult.duration}ms)${stepResult.error ? ` - ${stepResult.error}` : ''}\n`
    })
  })
  
  return report
}

/**
 * Run all tests and generate report
 */
export const runAllSignupTests = async (): Promise<string> => {
  console.log('🚀 Running comprehensive signup flow tests...')
  
  // Test 1: Individual user tests
  console.log('\n📝 Test 1: Individual user signup flows...')
  const individualResults = await testMultipleUsersSignupFlow(TEST_USERS.slice(0, 2)) // Test first 2 users
  
  // Test 2: Stress test
  console.log('\n⚡ Test 2: Stress test with rapid user creation...')
  const stressResults = await stressTestSignupFlow(3, 500) // 3 users with 500ms delay
  
  // Combine results
  const allResults = [...individualResults, ...stressResults]
  
  // Generate report
  const report = generateTestReport(allResults)
  
  console.log(report)
  
  // Cleanup stress test users
  const stressTestEmails = stressResults.map((_, i) => `stresstest${i + 1}@northsouth.edu`)
  await cleanupTestUsers(stressTestEmails)
  
  return report
}
