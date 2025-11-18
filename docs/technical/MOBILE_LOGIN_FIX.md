# Mobile App Login Fix

## Problem
Getting "Invalid credentials" when trying to login from Expo Go app on physical device.

## Root Cause
The mobile app was using `localhost:5000` which doesn't work on physical devices. On a physical device, `localhost` refers to the device itself, not your computer.

## Solution Applied

### ✅ 1. Created Centralized API Config
- Created `mobile/src/config/api.js` with your computer's IP: `192.168.1.100`
- All screens now import from this centralized config

### ✅ 2. Updated All API URLs
Updated these files to use the centralized config:
- `mobile/src/context/AuthContext.js`
- `mobile/src/screens/DashboardScreen.js`
- `mobile/src/screens/AuditHistoryScreen.js`
- `mobile/src/screens/ChecklistsScreen.js`
- `mobile/src/screens/AuditFormScreen.js`
- `mobile/src/screens/AuditDetailScreen.js`

### ✅ 3. Backend Server Configuration
- Updated backend to listen on `0.0.0.0` (all network interfaces)
- This allows connections from your phone on the same network

## Your Computer's IP Address
**IP Address:** `192.168.1.100`

This is already configured in `mobile/src/config/api.js`.

## Next Steps

### 1. Restart Expo
```bash
cd mobile
npx expo start --clear
```

### 2. Scan QR Code Again
- Close Expo Go completely on your phone
- Reopen Expo Go
- Scan the new QR code

### 3. Try Login
Use these credentials:
- **Email:** `admin@example.com`
- **Password:** `admin123`

## If Your IP Address Changes

If your computer's IP address changes (e.g., connecting to different Wi-Fi):

1. Find your new IP:
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address"

2. Update `mobile/src/config/api.js`:
   ```javascript
   return 'http://YOUR_NEW_IP:5000/api';
   ```

3. Restart Expo:
   ```bash
   npx expo start --clear
   ```

## Troubleshooting

### Still Getting "Invalid credentials"?

1. **Check Backend is Running**
   - Look at backend terminal
   - Should see: "Server running on port 5000"

2. **Test API from Phone Browser**
   - Open browser on phone
   - Go to: `http://192.168.1.100:5000/api/health`
   - Should see: `{"status":"OK","message":"Server is running"}`

3. **Check Network**
   - Phone and computer must be on same Wi-Fi network
   - Check firewall allows port 5000

4. **Check Backend Logs**
   - Look at backend terminal when you try to login
   - Should see login attempts logged

5. **Verify User Exists**
   ```bash
   cd backend
   node scripts/verify-user.js
   ```

### Connection Refused?

1. **Windows Firewall**
   - Allow Node.js through firewall
   - Or temporarily disable firewall to test

2. **Check IP Address**
   - Make sure IP in `mobile/src/config/api.js` matches your computer's IP
   - Run `ipconfig` to verify

3. **Backend Not Running**
   - Make sure backend server is running
   - Check port 5000 is not in use

## Alternative: Use Tunnel

If network issues persist, you can use Expo's tunnel:
```bash
npx expo start --tunnel
```

This creates a public URL that works from anywhere, but may be slower.

