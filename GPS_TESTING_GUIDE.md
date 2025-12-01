# 📍 GPS Location Tagging - Testing Guide

## ✅ Implementation Complete!

All GPS location features have been fully integrated into the application.

---

## 🗄️ Database Changes

### **Audits Table** - GPS Location Columns Added:
- `gps_latitude` (DECIMAL/REAL) - Latitude where audit was started
- `gps_longitude` (DECIMAL/REAL) - Longitude where audit was started
- `gps_accuracy` (FLOAT/REAL) - GPS accuracy in meters
- `gps_timestamp` (DATETIME) - When location was captured
- `location_verified` (BOOLEAN/BIT) - Whether auditor was verified at store location

### **Locations Table** - GPS Coordinates Added:
- `latitude` (DECIMAL/REAL) - Store's latitude coordinate
- `longitude` (DECIMAL/REAL) - Store's longitude coordinate

**Migration Status:** ✅ Automatically applied on next server restart

---

## 📱 Mobile App Testing

### **1. Test Location Capture**

1. **Start the mobile app:**
   ```bash
   cd mobile
   npx expo start
   ```

2. **Grant location permissions** when prompted

3. **Create a new audit:**
   - Select a template
   - Select a store
   - Tap **"📍 Capture Your Location"** button
   - Verify coordinates are displayed

### **2. Test Location Verification**

1. **Add GPS coordinates to a store** (via web app):
   - Go to Stores page
   - Edit a store
   - Add latitude/longitude (or use "Use My Current Location")
   - Save

2. **Start an audit at that store:**
   - Select the store with GPS coordinates
   - Capture your location
   - **Location Verification** panel should appear
   - If you're within 500m: ✅ "Location Verified"
   - If you're too far: ⚠️ Shows distance and allows override

### **3. Test GPS Display in Audit History**

1. **Complete an audit** with GPS captured
2. **View audit details:**
   - Should show GPS coordinates
   - Should show reverse-geocoded address
   - Should show "Open in Maps" button
   - Should show verification badge if verified

3. **Check audit history list:**
   - Should show 📍 icon for audits with GPS
   - Should show ✅ icon if location was verified

---

## 🌐 Web App Testing

### **1. Add GPS Coordinates to Stores**

1. **Navigate to Stores page**
2. **Click "Add Store" or edit existing store**
3. **Scroll to "GPS Coordinates" section**
4. **Option A - Manual Entry:**
   - Enter latitude (e.g., `28.6139`)
   - Enter longitude (e.g., `77.2090`)
5. **Option B - Auto-Capture:**
   - Click **"Use My Current Location"** button
   - Browser will request location permission
   - Coordinates auto-filled
6. **Click "View on Google Maps"** to verify
7. **Save store**

### **2. Verify GPS in Store Cards**

- Stores with GPS coordinates show **"GPS Verified"** badge
- Green location icon indicates GPS is configured

---

## 🧪 GPS Simulation (Expo/React Native)

### **Option 1: iOS Simulator**

1. **Open iOS Simulator**
2. **Go to:** Features → Location → Custom Location
3. **Enter coordinates:**
   - Latitude: `28.6139`
   - Longitude: `77.2090`
4. **Set location** - App will use this as current location

### **Option 2: Android Emulator**

1. **Open Android Emulator**
2. **Use ADB to set location:**
   ```bash
   adb emu geo fix 77.2090 28.6139
   ```
   (Note: ADB uses longitude first, then latitude)

### **Option 3: Physical Device**

1. **Enable Developer Options** on Android
2. **Use "Mock Location" apps** (e.g., "Fake GPS Location")
3. **Set custom coordinates**

### **Option 4: Expo Location Mock (Development)**

Add to your test file:
```javascript
import * as Location from 'expo-location';

// Mock location for testing
Location.setGoogleApiKey('YOUR_API_KEY'); // Optional
// Then use Location.getCurrentPositionAsync() - it will use device/simulator location
```

---

## 📊 Test Scenarios

### **Scenario 1: Location Verified ✅**
1. Store has GPS: `28.6139, 77.2090`
2. Auditor captures location: `28.6140, 77.2091` (within 500m)
3. **Expected:** Green "Location Verified" message

### **Scenario 2: Location Too Far ⚠️**
1. Store has GPS: `28.6139, 77.2090`
2. Auditor captures location: `28.7000, 77.3000` (10km away)
3. **Expected:** Warning with distance, option to continue anyway

### **Scenario 3: No Store GPS**
1. Store has no GPS coordinates
2. Auditor captures location
3. **Expected:** Location captured, no verification shown

### **Scenario 4: Permission Denied**
1. Deny location permission
2. Try to capture location
3. **Expected:** Alert with option to open settings

---

## 🔧 Troubleshooting

### **Issue: Location not capturing**
- ✅ Check location permissions are granted
- ✅ Ensure GPS is enabled on device
- ✅ Try "Use My Current Location" in web app first

### **Issue: Verification not working**
- ✅ Ensure store has latitude AND longitude set
- ✅ Check coordinates are valid decimal degrees
- ✅ Verify max distance setting (default: 500m)

### **Issue: Address not showing**
- ✅ Reverse geocoding requires internet connection
- ✅ Check device has network access
- ✅ Coordinates will still be saved even if address fails

---

## 📝 Example Test Data

### **Delhi, India Store:**
```
Latitude: 28.6139
Longitude: 77.2090
Address: Connaught Place, New Delhi
```

### **Mumbai, India Store:**
```
Latitude: 19.0760
Longitude: 72.8777
Address: Bandra, Mumbai
```

### **Test Coordinates (Near Delhi):**
```
Latitude: 28.6140
Longitude: 77.2091
Distance: ~100m (should verify ✅)
```

---

## ✅ Checklist

- [ ] Database columns added (auto-migrated)
- [ ] Mobile app captures location
- [ ] Mobile app verifies location
- [ ] Web app allows adding GPS to stores
- [ ] Web app shows GPS badge on stores
- [ ] Audit details show GPS information
- [ ] Audit history shows GPS indicator
- [ ] "Open in Maps" works correctly
- [ ] Location verification works within 500m
- [ ] Location verification warns if too far

---

## 🎉 Success Criteria

✅ **GPS Location Tagging is fully functional when:**
1. Auditors can capture location when starting audits
2. Location verification works if store has GPS coordinates
3. GPS data is saved with audits
4. GPS data is displayed in audit history and details
5. Admins can add GPS coordinates to stores via web app
6. All GPS features work on both iOS and Android

---

**Last Updated:** 2025-11-26
**Version:** 1.7.0

