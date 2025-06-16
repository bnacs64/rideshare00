# NSU Commute - AI-Powered Ride Sharing for NSU Students

A Progressive Web App (PWA) that provides intelligent, AI-powered ride-sharing exclusively for North South University students. The system uses Google Gemini 1.5 Pro for smart matching, Uber API for route optimization, and Telegram for notifications.

## 🚀 Features

- **AI-Powered Matching**: Automatic ride matching using Google Gemini 1.5 Pro
- **Real-time Optimization**: Route optimization via Uber API
- **University Exclusive**: NSU email verification required
- **Flexible Pickup**: Multiple pickup locations with map integration
- **Scheduled Rides**: Automatic daily opt-ins
- **Cost Sharing**: Fair and transparent cost calculation
- **Telegram Integration**: Ride notifications and confirmations
- **PWA Ready**: Installable on mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + PostGIS)
- **Authentication**: Supabase Auth
- **AI**: Google Gemini 1.5 Pro
- **Maps/Routes**: Uber API
- **Notifications**: Telegram Bot
- **PWA**: Vite PWA Plugin + Workbox

## 📋 Prerequisites

- Node.js 18+ and pnpm 8+
- Supabase account
- Google Cloud account (for Gemini API)
- Uber Developer account
- Telegram Bot Token

## 🔧 Installation

1. **Install pnpm** (if not already installed):
   ```bash
   npm install -g pnpm
   ```

2. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd nsu-commute
   pnpm install
   ```

3. **Environment Setup**:
   ```bash
   cp .env.example .env
   ```

   Fill in your API keys in `.env`:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_UBER_CLIENT_ID=your_uber_client_id
   VITE_UBER_CLIENT_SECRET=your_uber_client_secret
   VITE_TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   VITE_RESEND_API_KEY=your_resend_api_key
   ```

4. **Database Setup** (see Supabase Setup section below)

5. **Run Development Server**:
   ```bash
   pnpm dev
   ```

## 🗄️ Supabase Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key to `.env`

### 2. Enable PostGIS Extension
Run in Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 3. Database Schema
Execute the SQL schema provided in `/docs/database-schema.sql`

### 4. Row Level Security (RLS)
The schema includes RLS policies for data security.

## 🤖 API Integrations

### Google Gemini 1.5 Pro
1. Create a Google Cloud project
2. Enable the Gemini API
3. Create an API key
4. Add to `.env` as `VITE_GEMINI_API_KEY`

### Uber API
1. Register at [developer.uber.com](https://developer.uber.com)
2. Create an app
3. Get Client ID and Secret
4. Add to `.env`

### Telegram Bot
1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get the bot token
3. Add to `.env` as `VITE_TELEGRAM_BOT_TOKEN`

## 📱 PWA Features

- Offline capability
- Push notifications
- App-like experience
- Auto-updates

## 🏗️ Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── contexts/      # React contexts (Auth, etc.)
├── services/      # API services (Supabase, Gemini, etc.)
├── hooks/         # Custom React hooks
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## 🔐 Security

- University email verification
- Row Level Security (RLS) in Supabase
- Secure API key management
- HTTPS enforcement

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Add environment variables
3. Deploy

### Manual Build
```bash
pnpm build
pnpm preview
```

## 📖 Usage

1. **Registration**: Sign up with NSU email
2. **Profile Setup**: Set role (Driver/Rider), home location, pickup points
3. **Opt-in**: Daily manual opt-in or scheduled automatic opt-ins
4. **Matching**: AI automatically creates optimal ride groups
5. **Confirmation**: Receive Telegram notifications and confirm rides
6. **Ride**: Meet at pickup location and commute together

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@nsucommute.com or create an issue in the repository.

---

**Built with ❤️ for North South University students**
