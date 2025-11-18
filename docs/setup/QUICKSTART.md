# Quick Start Guide

Get the Restaurant Audit & Checklist App running in 5 minutes!

## Step 1: Backend Setup

```bash
cd backend
npm install
mkdir data
npm start
```

The backend will run on `http://localhost:5000`

## Step 2: Web App Setup

Open a new terminal:

```bash
cd web
npm install
npm start
```

The web app will open at `http://localhost:3000`

## Step 3: Mobile App Setup (Optional)

Open another terminal:

```bash
cd mobile
npm install
```

**Important**: Update the API URL in `mobile/src/context/AuthContext.js`:
- For Android emulator: Change to `http://10.0.2.2:5000/api`
- For iOS simulator: Keep as `http://localhost:5000/api`
- For physical device: Change to `http://YOUR_COMPUTER_IP:5000/api`

Then start:
```bash
npm start
```

Scan the QR code with Expo Go app on your device.

## First Use

1. Open the web app at `http://localhost:3000`
2. Click "Sign Up" to create an account
3. Login with your credentials
4. You'll see the default "Restaurant Safety & Compliance" template
5. Click "Start Audit" to begin your first audit!

## Default Account

No default account is created. You must register first.

## Troubleshooting

### Backend won't start
- Make sure port 5000 is not in use
- Check that Node.js is installed: `node --version`
- Ensure the `data` directory exists in the backend folder

### Web app can't connect to backend
- Verify backend is running on port 5000
- Check browser console for errors
- Ensure proxy is set correctly in `web/package.json`

### Mobile app can't connect
- Verify your computer and device are on the same network
- Check the API URL in `AuthContext.js`
- For physical devices, use your computer's IP address (not localhost)
- Make sure backend allows CORS from your device

### Database errors
- Delete `backend/data/audit.db` and restart the server
- The database will be recreated automatically

## Next Steps

- Customize checklist templates
- Add more audit categories
- Configure production settings
- Deploy to production servers

Happy auditing! 🍽️✅

