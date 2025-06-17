import { supabase } from './supabase'
import { matchingService } from './matchingService'

export interface MatchingSchedule {
  id: string
  name: string
  description: string
  cron_expression: string
  is_active: boolean
  last_run: string | null
  next_run: string | null
  created_at: string
  updated_at: string
}

export interface MatchingJob {
  id: string
  schedule_id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  started_at: string | null
  completed_at: string | null
  results: any
  error_message: string | null
  created_at: string
}

export const backgroundMatchingService = {
  /**
   * Initialize background matching schedules
   */
  async initializeSchedules(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if schedules already exist
      const { data: existingSchedules, error: checkError } = await supabase
        .from('matching_schedules')
        .select('id, name')

      // If table doesn't exist, that's okay - the migration will create it
      if (checkError && checkError.code === '42P01') {
        console.log('matching_schedules table does not exist yet - migration needed')
        return { success: false, error: 'matching_schedules table does not exist. Please run the migration first.' }
      }

      const defaultSchedules = [
        {
          name: 'morning-matching',
          description: 'Run matching every morning at 6 AM for today and tomorrow',
          cron_expression: '0 6 * * *',
          is_active: true
        },
        {
          name: 'evening-matching',
          description: 'Run matching every evening at 8 PM for tomorrow',
          cron_expression: '0 20 * * *',
          is_active: true
        },
        {
          name: 'hourly-optimization',
          description: 'Optimize existing matches every hour during peak times',
          cron_expression: '0 6-22 * * *',
          is_active: false // Disabled by default
        }
      ]

      // Create schedules that don't exist
      for (const schedule of defaultSchedules) {
        const exists = existingSchedules?.some(s => s.name === schedule.name)
        if (!exists) {
          await supabase
            .from('matching_schedules')
            .insert(schedule)
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error initializing matching schedules:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  /**
   * Run daily matching for specified dates
   */
  async runDailyMatching(dates: string[]): Promise<{ 
    success: boolean; 
    results: any[]; 
    error?: string 
  }> {
    try {
      const results = []

      for (const date of dates) {
        console.log(`Running daily matching for ${date}`)
        
        const result = await matchingService.runDailyMatching(date)
        results.push({
          date,
          matchesCreated: result.matchesCreated,
          error: result.error
        })

        // Small delay between dates to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      return { success: true, results }
    } catch (error) {
      console.error('Error in runDailyMatching:', error)
      return { 
        success: false, 
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  /**
   * Run optimization for existing pending matches
   */
  async runMatchOptimization(): Promise<{ 
    success: boolean; 
    optimized: number; 
    error?: string 
  }> {
    try {
      // Get all pending matches from the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: pendingRides, error } = await supabase
        .from('matched_rides')
        .select('id, commute_date')
        .eq('status', 'PENDING_CONFIRMATION')
        .gte('created_at', yesterday)

      if (error) {
        throw new Error(`Failed to fetch pending rides: ${error.message}`)
      }

      if (!pendingRides || pendingRides.length === 0) {
        return { success: true, optimized: 0 }
      }

      let optimized = 0

      // For each pending ride, check if we can find better matches
      for (const ride of pendingRides) {
        try {
          // Get participants who haven't responded
          const { data: participants } = await supabase
            .from('ride_participants')
            .select('daily_opt_in_id, status')
            .eq('matched_ride_id', ride.id)
            .eq('status', 'PENDING')

          if (participants && participants.length > 0) {
            // Try to find alternative matches for non-responsive participants
            for (const participant of participants) {
              const { matches } = await matchingService.findMatches(participant.daily_opt_in_id)
              
              // If we find better matches (higher confidence), we could suggest alternatives
              // For now, just log the optimization opportunity
              if (matches.length > 0) {
                const bestMatch = matches[0]
                console.log(`Optimization opportunity found for ride ${ride.id}: ${bestMatch.confidence}% confidence`)
                optimized++
              }
            }
          }
        } catch (error) {
          console.error(`Error optimizing ride ${ride.id}:`, error)
        }
      }

      return { success: true, optimized }
    } catch (error) {
      console.error('Error in runMatchOptimization:', error)
      return { 
        success: false, 
        optimized: 0,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  /**
   * Create a matching job record
   */
  async createMatchingJob(scheduleId: string, type: string): Promise<{ job: MatchingJob | null; error?: string }> {
    try {
      const { data: job, error } = await supabase
        .from('matching_jobs')
        .insert({
          schedule_id: scheduleId,
          status: 'PENDING',
          job_type: type,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating matching job:', error)
        return { job: null, error: error.message }
      }

      return { job }
    } catch (error) {
      console.error('Error in createMatchingJob:', error)
      return { 
        job: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  /**
   * Update matching job status
   */
  async updateMatchingJob(
    jobId: string, 
    status: 'RUNNING' | 'COMPLETED' | 'FAILED',
    results?: any,
    errorMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'COMPLETED' || status === 'FAILED') {
        updateData.completed_at = new Date().toISOString()
      }

      if (results) {
        updateData.results = results
      }

      if (errorMessage) {
        updateData.error_message = errorMessage
      }

      const { error } = await supabase
        .from('matching_jobs')
        .update(updateData)
        .eq('id', jobId)

      if (error) {
        console.error('Error updating matching job:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in updateMatchingJob:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  /**
   * Get matching job history
   */
  async getMatchingJobHistory(limit: number = 50): Promise<{ jobs: MatchingJob[]; error?: string }> {
    try {
      const { data: jobs, error } = await supabase
        .from('matching_jobs')
        .select(`
          *,
          matching_schedules (
            name,
            description
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching matching job history:', error)
        return { jobs: [], error: error.message }
      }

      return { jobs: jobs || [] }
    } catch (error) {
      console.error('Error in getMatchingJobHistory:', error)
      return { 
        jobs: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  /**
   * Manual trigger for immediate matching
   */
  async triggerImmediateMatching(type: 'daily' | 'optimization' = 'daily'): Promise<{ 
    success: boolean; 
    jobId?: string; 
    error?: string 
  }> {
    try {
      // Create a manual job record
      const { job, error: jobError } = await this.createMatchingJob('manual', type)
      
      if (jobError || !job) {
        return { success: false, error: jobError }
      }

      // Update job status to running
      await this.updateMatchingJob(job.id, 'RUNNING')

      let results: any = {}

      try {
        if (type === 'daily') {
          // Run matching for today and tomorrow
          const today = new Date().toISOString().split('T')[0]
          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          
          const matchingResults = await this.runDailyMatching([today, tomorrow])
          results = matchingResults.results
        } else {
          // Run optimization
          const optimizationResults = await this.runMatchOptimization()
          results = { optimized: optimizationResults.optimized }
        }

        // Update job as completed
        await this.updateMatchingJob(job.id, 'COMPLETED', results)

        return { success: true, jobId: job.id }
      } catch (error) {
        // Update job as failed
        await this.updateMatchingJob(
          job.id, 
          'FAILED', 
          null, 
          error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
      }
    } catch (error) {
      console.error('Error in triggerImmediateMatching:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  /**
   * Get matching statistics
   */
  async getMatchingStats(days: number = 7): Promise<{ 
    stats: any; 
    error?: string 
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const [jobsResult, ridesResult] = await Promise.all([
        supabase
          .from('matching_jobs')
          .select('status, results, created_at')
          .gte('created_at', startDate),
        supabase
          .from('matched_rides')
          .select('status, ai_confidence_score, created_at')
          .gte('created_at', startDate)
      ])

      if (jobsResult.error || ridesResult.error) {
        throw new Error('Failed to fetch matching statistics')
      }

      const jobs = jobsResult.data || []
      const rides = ridesResult.data || []

      const stats = {
        totalJobs: jobs.length,
        successfulJobs: jobs.filter(j => j.status === 'COMPLETED').length,
        failedJobs: jobs.filter(j => j.status === 'FAILED').length,
        totalRidesCreated: rides.length,
        confirmedRides: rides.filter(r => r.status === 'CONFIRMED').length,
        cancelledRides: rides.filter(r => r.status === 'CANCELLED').length,
        averageConfidence: rides.length > 0 
          ? rides.reduce((sum, r) => sum + (r.ai_confidence_score || 0), 0) / rides.length 
          : 0,
        dailyBreakdown: this.calculateDailyBreakdown(rides, days)
      }

      return { stats }
    } catch (error) {
      console.error('Error in getMatchingStats:', error)
      return { 
        stats: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  /**
   * Calculate daily breakdown of matching activity
   */
  calculateDailyBreakdown(rides: any[], days: number): any[] {
    const breakdown = []
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayRides = rides.filter(r => r.created_at.startsWith(dateStr))
      
      breakdown.unshift({
        date: dateStr,
        ridesCreated: dayRides.length,
        confirmed: dayRides.filter(r => r.status === 'CONFIRMED').length,
        cancelled: dayRides.filter(r => r.status === 'CANCELLED').length
      })
    }
    
    return breakdown
  }
}
