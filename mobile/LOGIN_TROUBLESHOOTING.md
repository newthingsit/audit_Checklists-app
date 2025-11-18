# Login Troubleshooting Guide

## Common Issues and Solutions

### 1. Cannot Connect to Server

**Symptoms:**
- Login button shows loading spinner but never completes
- No error message appears
- App seems stuck

**Solutions:**

#### Check Backend Server
1. Make sure the backend server is running:
   ```bash
   cd backend
   npm start
   ```
   You should see: `Server running on port 5000`

#### Check IP Address
1. Find your computer's IP address:
   - **Windows:** `ipconfig` (look for IPv4 Address)
   - **Mac/Linux:** `ifconfig` or `ip addr`

2. Update `mobile/src/config/api.js` with your correct IP:
   ```javascript
   return 'http://YOUR_IP_ADDRESS:5000/api';
   ```

3. Current IP detected: **192.168.1.156**

#### Check Network Connection
1. **Physical Device:** Your phone and computer must be on the same Wi-Fi network
2. **Firewall:** Windows Firewall might be blocking port 5000
   - Allow Node.js through firewall
   - Or temporarily disable firewall for testing

#### Test API Connection
1. Open a browser on your phone
2. Go to: `http://YOUR_IP:5000/api/health`
3. You should see: `{"status":"OK","message":"Server is running"}`

### 2. Invalid Credentials

**Symptoms:**
- Error message: "Invalid credentials"
- Login fails even with correct email/password

**Solutions:**

1. **Check if user exists:**
   ```bash
   cd backend
   node scripts/verify-user.js
   ```

2. **Create a test user:**
   ```bash
   cd backend
   node scripts/create-default-user.js
   ```

3. **Default credentials (if using create-default-user.js):**
   - Email: `admin@example.com`
   - Password: `admin123`

### 3. CORS Errors

**Symptoms:**
- Network errors in console
- "CORS policy" errors

**Solutions:**

1. Check `backend/server.js` has CORS enabled:
   ```javascript
   app.use(cors());
   ```

2. Restart backend server after changes

### 4. API URL Configuration

**For Different Environments:**

- **Physical Device:** Use your computer's IP (e.g., `192.168.1.156`)
- **iOS Simulator:** Use `localhost` or `127.0.0.1`
- **Android Emulator:** Use `10.0.2.2`

Update in `mobile/src/config/api.js`:
```javascript
const getApiBaseUrl = () => {
  if (__DEV__) {
    // For physical device
    return 'http://192.168.1.156:5000/api';
    
    // For iOS Simulator
    // return 'http://localhost:5000/api';
    
    // For Android Emulator
    // return 'http://10.0.2.2:5000/api';
  }
  return 'https://your-production-api.com/api';
};
```

### 5. Debug Steps

1. **Check Console Logs:**
   - Open React Native Debugger
   - Look for error messages in console
   - Check network requests

2. **Test API Directly:**
   ```bash
   # Test login endpoint
   curl -X POST http://192.168.1.156:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123"}'
   ```

3. **Check Backend Logs:**
   - Look at backend terminal for error messages
   - Check if requests are reaching the server

### 6. Quick Fix Checklist

- [ ] Backend server is running on port 5000
- [ ] IP address in `api.js` matches your computer's IP
- [ ] Phone and computer are on same Wi-Fi network
- [ ] Firewall allows connections on port 5000
- [ ] User account exists in database
- [ ] CORS is enabled in backend
- [ ] Restart Expo after changing API config

### 7. Still Not Working?

1. **Clear Expo Cache:**
   ```bash
   cd mobile
   npx expo start --clear
   ```

2. **Check Backend Health:**
   - Visit `http://YOUR_IP:5000/api/health` in browser
   - Should return: `{"status":"OK","message":"Server is running"}`

3. **Verify Database:**
   ```bash
   cd backend
   node scripts/verify-user.js
   ```

4. **Check Network:**
   - Try accessing backend from phone browser
   - If it works in browser but not in app, it's an app configuration issue

## Updated API Config

The API config has been updated with your current IP: **192.168.1.156**

After updating the IP, restart Expo:
```bash
cd mobile
npx expo start --clear
```

Then reload the app on your device.

