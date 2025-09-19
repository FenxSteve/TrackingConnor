# 🚢 Connor Tracker

A real-time ship tracking website for Connor aboard RFA Tidespring, designed to help BEFF stay connected across the waves.

## Features

- **DISTANCE TO CONNOR**: Real-time distance calculation from BEFF's home (SW8 4RU) to Connor's ship location
- **TIME TO CONNOR**: Door-to-door travel time for BEFF to reach Connor, including flights and connections
- **Interactive Map**: Live ship tracking with movement trail and distance visualization
- **Historical Data**: Track movements and distance changes over time
- **Real Flight Booking**: Direct links to book flights on Skyscanner, Google Flights, and Kayak
- **Auto-refresh**: Updates every 30 minutes automatically
- **Mobile Responsive**: Works perfectly on all devices

## How to Use

1. **View Live Tracking**: The dashboard shows current distance and travel time
2. **Interactive Map**: Click markers for detailed information
3. **Manual Refresh**: Click the header or press 'R' to refresh data
4. **Historical View**: Press 'H' to toggle historical tracking points
5. **Flight Info**: Check nearest airports and available flights

## Technical Details

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Mapping**: Leaflet.js with OpenStreetMap
- **Ship Tracking**: Multiple real AIS data sources (VesselFinder, AISHub, MyShipTracking)
- **Flight Booking**: Direct links to Skyscanner, Google Flights, Kayak with real pricing
- **Storage**: Browser localStorage for historical data
- **Hosting**: Netlify (free tier)

## Development

To run locally:
1. Clone the repository
2. Open `index.html` in a web browser
3. Or use a local server: `python -m http.server 8000`

## Deployment on Netlify

1. **GitHub Repository**:
   - Create a new repository on GitHub
   - Push all files to the repository

2. **Netlify Deployment**:
   - Go to [netlify.com](https://netlify.com)
   - Sign up/login with your GitHub account
   - Click "New site from Git"
   - Choose your repository
   - Build settings: Leave as default (static site)
   - Deploy!

3. **Custom Domain** (Optional):
   - In Netlify dashboard, go to Domain settings
   - Add your custom domain or use the free .netlify.app domain

## Keyboard Shortcuts

- `R` - Refresh tracking data
- `H` - Toggle historical view on map

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design

## Privacy & Data

- No personal data collected
- Ship positions are publicly available AIS data
- Historical data stored locally in your browser
- No tracking cookies or analytics

---

Made with ❤️ for BEFF to track Connor • Updates every 30 minutes
