# AI Tutor Backend API

A comprehensive backend API for an AI-powered online tutoring platform built with Express.js, TypeORM, PostgreSQL, Redis, and RabbitMQ. **Supports both Mobile and Web clients.**

## 🎯 Client Support

| Platform | Status | Auth Method |
|----------|--------|-------------|
| 📱 iOS | ✅ Supported | JWT (Header) |
| 📱 Android | ✅ Supported | JWT (Header) |
| 🌐 Web | ✅ Supported | JWT (Header + Cookie) |

## Tech Stack

- **Runtime:** Node.js (>=18)
- **Framework:** Express.js with TypeScript
- **Database:** PostgreSQL with TypeORM
- **Caching:** Redis (ioredis)
- **Message Queue:** RabbitMQ
- **AI Integration:** Claude API (Anthropic)
- **Push Notifications:** Firebase Cloud Messaging
- **Payment Gateway:** Razorpay
- **Real-time:** Socket.IO

## Features

- 🔐 **Authentication**
  - Phone OTP login
  - Email/Password login
  - Email OTP login (Web)
  - Google/Facebook OAuth
  - JWT tokens with refresh
  - Cookie-based sessions (Web)

- 📚 **Learning Management**
  - Multi-board curriculum support (CBSE, ICSE, State Boards)
  - Subject, Book, Chapter, Topic hierarchy
  - Content blocks for line-by-line teaching
  - AI-powered teaching sessions

- 🎯 **Assessment**
  - Quizzes with multiple question types
  - AI-generated questions
  - Detailed result analytics
  - Progress tracking

- 🤖 **AI Integration**
  - Teaching sessions with Claude AI
  - Doubt resolution (text/voice/image)
  - Study plan generation
  - Progress analysis

- 📈 **Gamification**
  - XP and leveling system
  - Achievement badges
  - Daily streaks
  - Leaderboards

- 💳 **Subscriptions**
  - Multiple plans
  - Razorpay payment integration
  - Coupon system

- 🌐 **Web Support**
  - Cookie-based authentication
  - CSRF protection (optional)
  - SPA fallback routing
  - WebSocket with cookie auth

## Prerequisites

- Node.js >= 18
- PostgreSQL 14+
- Redis 6+
- RabbitMQ 3.8+

## Installation

1. **Clone and install dependencies:**
   ```bash
   cd ai-tutor-app-BE
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up PostgreSQL:**
   ```bash
   # Create database
   createdb ai_tutor_db
   
   # Run migrations
   npm run migration:run
   
   # Seed initial data
   npm run seed
   ```

4. **Start services:**
   ```bash
   # Start Redis
   redis-server
   
   # Start RabbitMQ
   rabbitmq-server
   ```

5. **Run the application:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=ai_tutor_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# Web Configuration
WEB_ENABLED=true
COOKIE_SECRET=your-cookie-secret
COOKIE_DOMAIN=localhost
CSRF_ENABLED=false

# CORS (include both mobile and web origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:8081

# Claude AI
ANTHROPIC_API_KEY=your-api-key

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Razorpay
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
```

## API Endpoints

### Authentication
| Method | Endpoint | Description | Clients |
|--------|----------|-------------|---------|
| POST | /api/v1/auth/send-otp | Send OTP (phone/email) | All |
| POST | /api/v1/auth/verify-otp | Verify OTP | All |
| POST | /api/v1/auth/register | Register user | All |
| POST | /api/v1/auth/login | Login with OTP | All |
| POST | /api/v1/auth/login/password | Login with password | All |
| POST | /api/v1/auth/login/email | Login with email OTP | Web |
| POST | /api/v1/auth/refresh-token | Refresh token | All |
| GET | /api/v1/auth/check | Check auth status | Web |
| GET | /api/v1/auth/me | Get current user | All |
| POST | /api/v1/auth/logout | Logout | All |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/students | Create student |
| GET | /api/v1/students | Get all students |
| GET | /api/v1/students/:id | Get student |
| PUT | /api/v1/students/:id | Update student |
| GET | /api/v1/students/:id/progress | Get progress |

### Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/boards | Get boards |
| GET | /api/v1/subjects | Get subjects |
| GET | /api/v1/books | Get books |
| GET | /api/v1/chapters | Get chapters |
| GET | /api/v1/topics | Get topics |

### Learning
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/learning/session | Start session |
| PUT | /api/v1/learning/session/:id/end | End session |
| POST | /api/v1/learning/session/:id/message | Send message |

### Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/quizzes | Get quizzes |
| POST | /api/v1/quizzes/:id/attempt | Start attempt |
| POST | /api/v1/quizzes/attempts/:id/answer | Submit answer |
| PUT | /api/v1/quizzes/attempts/:id/submit | Submit quiz |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/subscriptions/plans | Get plans |
| POST | /api/v1/subscriptions | Create subscription |
| GET | /api/v1/subscriptions/active | Get active subscription |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/payments/create-order | Create order |
| POST | /api/v1/payments/verify | Verify payment |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/dashboard/stats | Get stats |
| GET | /api/v1/dashboard/today | Get today's plan |
| GET | /api/v1/dashboard/leaderboard | Get leaderboard |
| GET | /api/v1/dashboard/achievements | Get achievements |

## Web Integration

For detailed web integration guide, see [docs/WEB_INTEGRATION.md](docs/WEB_INTEGRATION.md).

### Quick Setup for Web Clients

```javascript
// API Client
const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  withCredentials: true, // Important for cookies!
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web'
  }
});

// Socket.IO
const socket = io('http://localhost:3000', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});
```

### Deploy Web App with Backend

Build your React/Vue/Angular app and copy to `/public`:

```bash
npm run build
cp -r build/* /path/to/ai-tutor-app-BE/public/
```

## Project Structure

```
src/
├── config/
│   ├── database.ts      # TypeORM configuration
│   ├── redis.ts         # Redis configuration
│   ├── rabbitmq.ts      # RabbitMQ configuration
│   └── index.ts         # App configuration
├── controllers/         # Route controllers
├── database/
│   ├── migrations/      # TypeORM migrations
│   └── seeds/           # Database seeders
├── entities/            # TypeORM entities
├── middlewares/
│   ├── auth.ts          # Authentication middleware
│   ├── clientDetection.ts # Client type detection
│   ├── encryption.ts    # E2E encryption
│   └── errorHandler.ts  # Error handling
├── routes/              # API routes
├── services/
│   ├── auth.service.ts
│   ├── ai.service.ts
│   └── notification.service.ts
├── types/               # TypeScript types
├── utils/
│   ├── logger.ts
│   └── helpers.ts
├── app.ts               # Express app
└── server.ts            # Server entry point
public/                  # Web app static files
```

## Database Migrations

```bash
# Generate migration
npm run migration:generate src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migrations
npm run migration:show
```

## Scripts

```bash
npm run dev          # Development with hot-reload
npm run build        # Build for production
npm start            # Start production server
npm run migration:run # Run database migrations
npm run seed         # Seed database
npm run lint         # Lint code
npm run test         # Run tests
```

## Socket.IO Events

### Client to Server
- `join` - Join user room
- `joinStudent` - Join student room
- `startSession` - Start learning session
- `endSession` - End learning session
- `typing` - Typing indicator
- `message` - Send chat message
- `joinDoubt` - Join doubt chat (Web)
- `joinQuiz` - Join quiz room
- `setStatus` - Set online status (Web)

### Server to Client
- `userTyping` - Typing indicator
- `newMessage` - New chat message
- `notification` - Push notification
- `sessionStarted` - Session started
- `sessionEnded` - Session ended

## License

MIT © KA Software
