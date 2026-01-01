# Firebase Cloud Messaging (FCM) V1 API Setup Guide

This guide explains how to set up Firebase Cloud Messaging for push notifications in the AI Tutor backend.

## Prerequisites

- Firebase project created at [Firebase Console](https://console.firebase.google.com/)
- Node.js backend project set up

## Step 1: Enable FCM V1 API

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Click on **Cloud Messaging** tab
5. Ensure **Firebase Cloud Messaging API (V1)** is **Enabled**

## Step 2: Generate Service Account Key

1. In Firebase Console, go to **Project Settings**
2. Click on **Service Accounts** tab
3. Click **"Generate new private key"**
4. A JSON file will be downloaded

The JSON file looks like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

## Step 3: Configure Environment Variables

Copy values from the JSON file to your `.env`:

```env
# Firebase Project ID (from "project_id")
FIREBASE_PROJECT_ID=your-project-id

# Firebase Client Email (from "client_email")
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Firebase Private Key (from "private_key")
# IMPORTANT: Keep the entire key including BEGIN and END markers
# Replace actual newlines with \n
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"

# Sender ID from Cloud Messaging tab
FIREBASE_SENDER_ID=599635702008
```

### Private Key Formatting

The private key in the JSON file contains literal newlines. In the `.env` file:

**Option 1**: Replace newlines with `\n`:
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

**Option 2**: Use the JSON file directly:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json
```

## Step 4: Verify Configuration

After setting up, start your server and check the logs:

```bash
npm run dev
```

You should see:
```
✅ Firebase Admin SDK initialized successfully
```

### Test FCM Status

```bash
curl -X GET http://localhost:3000/api/v1/notifications/fcm-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 5: Android App Configuration

### 1. Add google-services.json

1. In Firebase Console, go to **Project Settings**
2. Under **Your apps**, click **Add app** > **Android**
3. Register your app with package name
4. Download `google-services.json`
5. Place it in `android/app/google-services.json`

### 2. Create Notification Channels

Android requires notification channels. Create them in your React Native app:

```typescript
// NotificationService.ts
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

export const createNotificationChannels = async () => {
  await notifee.createChannel({
    id: 'ai_tutor_default',
    name: 'General Notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  await notifee.createChannel({
    id: 'ai_tutor_reminders',
    name: 'Study Reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  await notifee.createChannel({
    id: 'ai_tutor_achievements',
    name: 'Achievements',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  await notifee.createChannel({
    id: 'ai_tutor_streak',
    name: 'Streak Alerts',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
};
```

### 3. Register FCM Token

```typescript
import messaging from '@react-native-firebase/messaging';

export const registerFCMToken = async (authToken: string) => {
  // Request permission
  const authStatus = await messaging().requestPermission();
  const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED;

  if (enabled) {
    // Get FCM token
    const fcmToken = await messaging().getToken();
    
    // Send to backend
    await fetch('http://your-api.com/api/v1/auth/fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fcmToken }),
    });
  }
};
```

## API Endpoints

### Send to Specific User
```bash
POST /api/v1/notifications/send
{
  "userId": "user-uuid",
  "title": "Hello!",
  "message": "This is a test notification",
  "type": "system",
  "data": { "screen": "Dashboard" }
}
```

### Send to Topic
```bash
POST /api/v1/notifications/send-to-topic
{
  "topic": "all_users",
  "title": "Announcement",
  "body": "New features available!"
}
```

### Send Broadcast
```bash
POST /api/v1/notifications/broadcast
{
  "title": "🎉 New Update!",
  "body": "Check out the new features"
}
```

### Subscribe to Topics
```bash
POST /api/v1/notifications/subscribe
{
  "topics": ["promotions", "updates"]
}
```

### Test Notification
```bash
POST /api/v1/notifications/test
```

## Topic Naming Convention

| Topic | Description |
|-------|-------------|
| `all_users` | All app users |
| `board_cbse` | CBSE board students |
| `board_icse` | ICSE board students |
| `class_10` | Class 10 students |
| `student_{id}` | Specific student |

## Troubleshooting

### Common Errors

1. **"Firebase not initialized"**
   - Check if environment variables are set correctly
   - Verify private key format

2. **"Token not registered"**
   - The app was uninstalled from the device
   - Token expired - request a new one

3. **"Invalid registration token"**
   - Malformed FCM token
   - Token from different Firebase project

### Debug Logging

Enable debug mode:
```env
LOG_LEVEL=debug
```

Check server logs for detailed FCM responses.

## Security Considerations

1. **Never expose service account credentials** in client-side code
2. Keep the private key secure and never commit to git
3. Use environment variables or secret management
4. Rotate service account keys periodically

## References

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [FCM V1 API](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
- [Firebase Console](https://console.firebase.google.com/)
