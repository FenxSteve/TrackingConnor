# Getting Real AIS Data for Connor Tracker

## Current Status
The tracker is currently using CORS proxies and fallback data due to browser security restrictions. For real-time tracking, you have several options:

## Option 1: Free AIS Data Sources (Recommended)

### VesselFinder
1. Go to [VesselFinder.com](https://www.vesselfinder.com)
2. Search for "RFA TIDESPRING" or MMSI "235109357"
3. The tracker will attempt to scrape this data via CORS proxy

### MarineTraffic
1. Visit [MarineTraffic.com](https://www.marinetraffic.com/en/ais/details/ships/mmsi:235109357)
2. The tracker attempts to extract position data from this source

## Option 2: Manual Position Updates

If automatic tracking isn't working, you can manually update Connor's position:

1. Find RFA Tidespring on any ship tracking website
2. Note the latitude and longitude
3. Update the `getManualTrackingFallback()` function in `api.js` with current coordinates

```javascript
// Example: Update with real coordinates
return {
    mmsi: this.RFA_TIDESPRING_MMSI,
    name: 'RFA TIDESPRING',
    latitude: 50.8041,  // Replace with real lat
    longitude: -1.4040, // Replace with real lng
    speed: 12,          // Replace with real speed
    course: 180,        // Replace with real heading
    timestamp: new Date().toISOString(),
    status: '✅ Manually updated position',
    source: 'Manual update',
    isLastKnown: false
};
```

## Option 3: Backend Service (Most Reliable)

For production use, create a simple backend service:

1. **Node.js Backend**: Create a server that:
   - Fetches AIS data from APIs (no CORS restrictions)
   - Serves clean JSON data to your frontend
   - Can use AISStream.io WebSocket connection

2. **Deploy Backend**: Use free services like:
   - Vercel Functions
   - Netlify Functions
   - Railway.app
   - Render.com

## Option 4: Real-time WebSocket (Advanced)

For truly real-time tracking:

1. Sign up at [AISStream.io](https://aisstream.io) (free)
2. Get API key
3. Create backend WebSocket connection
4. Filter for MMSI: 235109357 (RFA Tidespring)

## Current Fallback Behavior

The tracker currently:
1. ✅ Tries multiple AIS data sources via CORS proxies
2. ✅ Uses intelligent fallback positions based on typical RFA operations
3. ✅ Shows clear status indicators when using estimated data
4. ✅ Provides real flight booking links regardless of ship data source

## Testing the Tracker

The tracker works best when:
- Deployed to a real domain (CORS proxies work better)
- Used with recent browser (modern fetch API support)
- Connor's ship is broadcasting AIS data (military vessels sometimes turn off AIS)

## Need Help?

If you need real-time tracking, I can help you set up a simple backend service that will provide reliable AIS data without browser restrictions.