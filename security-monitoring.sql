-- Security monitoring queries
-- Run these periodically to monitor security events

-- Monitor failed login attempts
SELECT 
  created_at,
  raw_user_meta_data->>'email' as email,
  COUNT(*) as failed_attempts
FROM auth.audit_log_entries 
WHERE event_type = 'user_signedup_failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY created_at, email
HAVING COUNT(*) > 5;

-- Monitor unusual API usage
SELECT 
  created_at,
  event_type,
  COUNT(*) as event_count
FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY created_at, event_type
HAVING COUNT(*) > 100;

-- Monitor database access patterns
SELECT 
  schemaname,
  tablename,
  n_tup_ins + n_tup_upd + n_tup_del as total_changes
FROM pg_stat_user_tables 
WHERE n_tup_ins + n_tup_upd + n_tup_del > 1000;