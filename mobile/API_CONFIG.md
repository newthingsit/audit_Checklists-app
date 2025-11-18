# Mobile App API Configuration

## Issue
Getting "Invalid credentials" when trying to login from Expo Go app.

## Problem
The mobile app is trying to connect to `localhost:5000`, but when running on a physical device, `localhost` refers to the device itself, not your computer.

## Solution

### Step 1: Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually Wi-Fi or Ethernet).

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```

### Step 2: Update API URL in Mobile App

Edit `mobile/src/context/AuthContext.js`:

```javascript
const API_BASE_URL = 'http://YOUR_IP_ADDRESS:5000/api';
```

Replace `YOUR_IP_ADDRESS` with your computer's IP (e.g., `192.168.1.100`).

### Step 3: Ensure Backend Allows CORS

The backend should already be configured to allow CORS, but verify in `backend/server.js`:
```javascript
app.use(cors());
```

### Step 4: Verify Network Connection

1. **Same Network:** Your phone and computer must be on the same Wi-Fi network
2. **Firewall:** Make sure Windows Firewall allows connections on port 5000
3. **Backend Running:** Verify backend is running on port 5000

### Step 5: Restart Expo

After changing the API URL:
```bash
cd mobile
npx expo start --clear
```

Then scan the QR code again.

## Quick Test

To test if the API is accessible from your device:
1. Open a browser on your phone
2. Go to: `http://YOUR_IP_ADDRESS:5000/api/health`
3. You should see: `{"status":"OK","message":"Server is running"}`

If this doesn't work, check:
- Firewall settings
- Network connectivity
- IP address is correct

## Common IP Addresses

- **192.168.x.x** - Most home networks
- **10.0.2.2** - Android emulator (special address)
- **localhost** - iOS simulator only

## Troubleshooting

### Still Getting "Invalid credentials"?
1. Check backend terminal for login attempts
2. Verify the API URL is correct
3. Test API directly from phone browser
4. Check backend CORS configuration
5. Verify user exists: `node backend/scripts/verify-user.js`

### Connection Refused?
- Check firewall allows port 5000
- Verify backend is running
- Ensure same Wi-Fi network
- Try disabling firewall temporarily to test

