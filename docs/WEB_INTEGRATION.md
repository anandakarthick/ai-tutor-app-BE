# AI Tutor Backend - Web Integration Guide

This document explains how to integrate a web application with the AI Tutor backend API.

## Overview

The AI Tutor backend now supports both **mobile** and **web** clients with the following features:

| Feature | Mobile | Web |
|---------|--------|-----|
| JWT Authentication | ✅ Header-based | ✅ Header + Cookie-based |
| Session Management | ✅ | ✅ |
| Real-time (Socket.IO) | ✅ | ✅ |
| E2E Encryption | ✅ Required | ⚡ Optional |
| Push Notifications | ✅ FCM | ⚡ Web Push (planned) |
| CSRF Protection | ❌ N/A | ✅ Available |

## Quick Start

### 1. Configure CORS Origins

Add your web app's URL to the allowed origins in `.env`:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173,https://your-web-app.com
```

### 2. Enable Web Support

```env
WEB_ENABLED=true
COOKIE_SECRET=your-secure-cookie-secret
```

### 3. Start the Server

```bash
npm run dev
```

The server will now accept requests from both mobile and web clients.

## Authentication

### Client Type Detection

The server automatically detects client type via:

1. `X-Client-Type` header (preferred)
2. User-Agent analysis

**Recommended:** Always send the `X-Client-Type` header:

```javascript
// Web client
headers: {
  'X-Client-Type': 'web',
  'X-Client-Version': '1.0.0'
}

// Mobile client
headers: {
  'X-Client-Type': 'android', // or 'ios'
  'X-Client-Version': '1.0.0'
}
```

### Web Authentication (Cookie-based)

For web clients, the server automatically sets HTTP-only cookies on login:

```javascript
// Login request
const response = await fetch('/api/v1/auth/login/password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web'
  },
  credentials: 'include', // Important for cookies!
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

// Cookies are automatically set:
// - access_token (HttpOnly, 24h expiry)
// - refresh_token (HttpOnly, 30d expiry)
```

### Subsequent Requests

```javascript
// Cookies are automatically sent with requests
const response = await fetch('/api/v1/dashboard/stats', {
  method: 'GET',
  headers: {
    'X-Client-Type': 'web'
  },
  credentials: 'include' // Always include this!
});
```

### Token Refresh

```javascript
// For web clients, refresh token is read from cookie automatically
const response = await fetch('/api/v1/auth/refresh-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web'
  },
  credentials: 'include'
  // No need to send refreshToken in body for web clients
});
```

### Check Authentication Status

```javascript
const response = await fetch('/api/v1/auth/check', {
  method: 'GET',
  headers: {
    'X-Client-Type': 'web'
  },
  credentials: 'include'
});

const data = await response.json();
// { success: true, data: { authenticated: true, user: {...} } }
```

### Logout

```javascript
const response = await fetch('/api/v1/auth/logout', {
  method: 'POST',
  headers: {
    'X-Client-Type': 'web'
  },
  credentials: 'include'
});
// Cookies are automatically cleared
```

## Socket.IO Integration

### Connection Setup

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  // Authentication
  auth: {
    token: accessToken // Optional if using cookies
  },
  // Or via query parameter
  query: {
    token: accessToken
  },
  // Transport settings
  transports: ['websocket', 'polling'],
  // Credentials for cookie-based auth
  withCredentials: true,
  // Custom headers
  extraHeaders: {
    'X-Client-Type': 'web'
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Available Events

```javascript
// Join user room (for notifications)
socket.emit('join', userId);

// Join student room
socket.emit('joinStudent', studentId);

// Learning session
socket.emit('startSession', { studentId, topicId, sessionId });
socket.emit('endSession', sessionId);
socket.emit('typing', { sessionId, isTyping: true });
socket.emit('message', { sessionId, message: {...} });

// Doubt chat
socket.emit('joinDoubt', doubtId);
socket.emit('leaveDoubt', doubtId);
socket.emit('doubtMessage', { doubtId, message: {...} });

// Quiz events
socket.emit('joinQuiz', quizId);
socket.emit('leaveQuiz', quizId);
socket.emit('quizAnswer', { quizId, answer: {...} });

// Status
socket.emit('setStatus', 'online'); // or 'away', 'busy'

// Health check
socket.emit('ping');
socket.on('pong', (data) => console.log('Latency:', Date.now() - data.timestamp));
```

### Listening for Events

```javascript
// Notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});

// Chat messages
socket.on('newMessage', (message) => {
  console.log('New message:', message);
});

// Typing indicator
socket.on('userTyping', ({ sessionId, isTyping }) => {
  console.log('User typing:', isTyping);
});

// Session events
socket.on('sessionStarted', (data) => {
  console.log('Session started:', data);
});

socket.on('sessionEnded', (data) => {
  console.log('Session ended:', data);
});
```

## E2E Encryption (Optional for Web)

Web clients can optionally use E2E encryption by including the `X-Encryption-Enabled` header:

```javascript
// Without encryption (recommended for web)
const response = await fetch('/api/v1/...', {
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web'
  }
});

// With encryption (if needed)
const response = await fetch('/api/v1/...', {
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web',
    'X-Encryption-Enabled': 'true',
    'X-Client-Public-Key': clientPublicKey
  }
});
```

## API Endpoints

All existing endpoints work with both mobile and web clients:

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/send-otp | Send OTP (phone or email) |
| POST | /api/v1/auth/verify-otp | Verify OTP |
| POST | /api/v1/auth/register | Register new user |
| POST | /api/v1/auth/login | Login with OTP |
| POST | /api/v1/auth/login/password | Login with password |
| POST | /api/v1/auth/login/email | Login with email OTP |
| POST | /api/v1/auth/refresh-token | Refresh tokens |
| GET | /api/v1/auth/check | Check auth status |
| GET | /api/v1/auth/me | Get current user |
| POST | /api/v1/auth/logout | Logout |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/dashboard/stats | Get user stats |
| GET | /api/v1/dashboard/today | Get today's plan |
| GET | /api/v1/dashboard/leaderboard | Get leaderboard |
| GET | /api/v1/dashboard/achievements | Get achievements |

### Content & Learning
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/boards | Get all boards |
| GET | /api/v1/subjects | Get subjects |
| GET | /api/v1/books | Get books |
| GET | /api/v1/chapters | Get chapters |
| GET | /api/v1/topics | Get topics |
| POST | /api/v1/learning/session | Start learning session |
| POST | /api/v1/doubts | Create doubt |

### Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/quizzes | Get quizzes |
| POST | /api/v1/quizzes/:id/attempt | Start quiz attempt |
| POST | /api/v1/quizzes/attempts/:id/answer | Submit answer |
| PUT | /api/v1/quizzes/attempts/:id/submit | Submit quiz |

## Deploying Web App

### Option 1: Serve from Backend

Build your React/Vue/Angular app and copy the build files to `/public`:

```bash
# In your web app directory
npm run build

# Copy build to backend
cp -r build/* ../ai-tutor-app-BE/public/
```

The backend will automatically serve these files and handle SPA routing.

### Option 2: Separate Deployment

Deploy your web app separately (Vercel, Netlify, etc.) and configure:

1. Update `CORS_ORIGINS` with your production URL
2. Update `COOKIE_DOMAIN` if using cookies
3. Configure your web app to use the API URL

## Security Considerations

### Production Checklist

- [ ] Use HTTPS in production
- [ ] Set `COOKIE_SECURE=true` for production
- [ ] Configure proper `COOKIE_DOMAIN`
- [ ] Enable CSRF protection if needed (`CSRF_ENABLED=true`)
- [ ] Limit `CORS_ORIGINS` to specific domains
- [ ] Use strong secrets for `JWT_SECRET`, `COOKIE_SECRET`

### Cookie Security

Cookies are configured with:
- `HttpOnly`: Prevents JavaScript access
- `Secure`: HTTPS only (in production)
- `SameSite`: 'lax' for CSRF protection
- `Path`: '/' (available site-wide)

## Troubleshooting

### CORS Errors

```
Access to fetch at 'http://localhost:3000/api/v1/...' has been blocked by CORS policy
```

**Solution:** Add your web app origin to `CORS_ORIGINS` in `.env`

### Cookies Not Being Set

1. Ensure `credentials: 'include'` in fetch requests
2. Check that the origin is in `CORS_ORIGINS`
3. For development, `withCredentials: true` in axios

### Socket.IO Connection Issues

1. Ensure `transports: ['websocket', 'polling']`
2. Add `withCredentials: true` for cookie auth
3. Check that the origin is allowed in Socket.IO CORS config

## Example: React Web App Setup

```javascript
// src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web',
    'X-Client-Version': '1.0.0'
  }
});

// Response interceptor for token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      try {
        await api.post('/auth/refresh-token');
        return api.request(error.config);
      } catch (refreshError) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

```javascript
// src/socket.js
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3000', {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  extraHeaders: {
    'X-Client-Type': 'web'
  },
  autoConnect: false // Connect manually after login
});

export default socket;
```

## Next Steps

1. Create a web frontend (React, Vue, Next.js, etc.)
2. Implement the authentication flow
3. Build the dashboard and learning screens
4. Add real-time features with Socket.IO
5. Deploy to production

For questions or issues, check the main README.md or create an issue on GitHub.
