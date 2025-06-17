# NSU Commute PWA - Production Deployment Guide

This guide covers the complete production deployment process for the NSU Commute PWA.

## 🚀 Deployment Status

### ✅ Completed
- [x] Edge Functions deployed to Supabase production
- [x] Telegram webhook configured
- [x] Database schema deployed
- [x] Basic functionality tested

### 🔄 In Progress
- [ ] Production environment variables configuration
- [ ] Cron jobs setup for automated matching
- [ ] Production security hardening
- [ ] Performance optimization

## 📋 Pre-Deployment Checklist

### Environment Variables
Ensure all required environment variables are set in production:

#### Required for Frontend (.env.production)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://fwshmucplaqqtpkzqbvb.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# API Keys
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# App Configuration
VITE_APP_URL=https://your-production-domain.com
VITE_NSU_EMAIL_DOMAIN=@northsouth.edu
VITE_BYPASS_EMAIL_VALIDATION=false
```

#### Required for Edge Functions (Supabase Secrets)
```bash
# Set these in Supabase Dashboard > Settings > Edge Functions
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## 🔧 Production Configuration Steps

### 1. Configure Supabase Secrets
Run these commands to set Edge Function secrets:

```bash
# Set Gemini API key
npx supabase secrets set GEMINI_API_KEY=your_gemini_api_key

# Set Telegram bot token
npx supabase secrets set TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Set Google Maps API key
npx supabase secrets set GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 2. Set up Cron Jobs
Configure automated matching in Supabase Dashboard:

```sql
-- Daily matching at 6 AM and 6 PM
SELECT cron.schedule('daily-matching-morning', '0 6 * * *', 
  'SELECT net.http_post(url:=''https://fwshmucplaqqtpkzqbvb.supabase.co/functions/v1/daily-matching'', 
  headers:=''{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'', 
  body:=''{"date": "' || CURRENT_DATE || '"}''::jsonb) as request_id;'
);

SELECT cron.schedule('daily-matching-evening', '0 18 * * *', 
  'SELECT net.http_post(url:=''https://fwshmucplaqqtpkzqbvb.supabase.co/functions/v1/daily-matching'', 
  headers:=''{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'', 
  body:=''{"date": "' || CURRENT_DATE || '"}''::jsonb) as request_id;'
);

-- Scheduled opt-ins at midnight
SELECT cron.schedule('scheduled-opt-ins', '0 0 * * *', 
  'SELECT net.http_post(url:=''https://fwshmucplaqqtpkzqbvb.supabase.co/functions/v1/scheduled-opt-ins'', 
  headers:=''{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'', 
  body:=''{}''::jsonb) as request_id;'
);

-- Cleanup expired data daily at 2 AM
SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 
  'SELECT net.http_post(url:=''https://fwshmucplaqqtpkzqbvb.supabase.co/functions/v1/cleanup-expired-data'', 
  headers:=''{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'', 
  body:=''{}''::jsonb) as request_id;'
);
```

### 3. Frontend Deployment
Deploy to your preferred hosting platform:

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Netlify Deployment
```bash
# Build for production
npm run build

# Deploy dist folder to Netlify
```

### 4. Domain Configuration
- Set up custom domain
- Configure SSL certificate
- Update CORS settings in Supabase
- Update auth redirect URLs

## 🔒 Security Configuration

### Database Security
- [x] Row Level Security (RLS) enabled on all tables
- [x] Proper authentication policies
- [x] Service role key secured

### API Security
- [ ] Rate limiting configured
- [ ] API key rotation schedule
- [ ] CORS properly configured

### Application Security
- [ ] Content Security Policy (CSP)
- [ ] HTTPS enforcement
- [ ] Secure headers configuration

## 📊 Monitoring & Logging

### Supabase Monitoring
- Edge Function logs
- Database performance metrics
- API usage statistics

### Application Monitoring
- Error tracking (Sentry recommended)
- Performance monitoring
- User analytics

## 🧪 Production Testing

### Functional Testing
- [ ] User registration/login
- [ ] Profile creation
- [ ] Opt-in creation
- [ ] Matching system
- [ ] Notifications
- [ ] Telegram bot integration

### Performance Testing
- [ ] Load testing
- [ ] Database query optimization
- [ ] Edge Function performance
- [ ] Frontend bundle size

## 🚨 Troubleshooting

### Common Issues
1. **Edge Functions not responding**: Check Supabase secrets and logs
2. **Telegram notifications not working**: Verify webhook URL and bot token
3. **Matching not working**: Check Gemini API key and quota
4. **Database errors**: Verify RLS policies and permissions

### Debug Commands
```bash
# Check Edge Function logs
npx supabase functions logs daily-matching

# Test Edge Function locally
npx supabase functions serve

# Check cron job status
SELECT * FROM cron.job;
```

## 📞 Support

For deployment issues:
1. Check Supabase Dashboard logs
2. Review Edge Function responses
3. Verify all environment variables
4. Test individual components

## 🎯 Next Steps After Deployment

1. Monitor system performance
2. Set up automated backups
3. Configure monitoring alerts
4. Plan scaling strategy
5. User acceptance testing
