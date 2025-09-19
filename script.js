class BeffTrackerApp {
    constructor() {
        this.isLoading = false;
        this.autoRefreshInterval = null;
        this.init();
    }

    async init() {
        console.log('🚢 Connor Tracker initializing...');

        // Initialize map
        beffMap = new BeffMap();

        // Force immediate data load with detailed logging
        console.log('Starting immediate data load...');
        await this.updateAll();

        // Set up auto-refresh every 30 minutes
        this.startAutoRefresh();

        // Set up event listeners
        this.setupEventListeners();

        // Show historical data on map
        if (beffTracker.historicalData.length > 0) {
            beffMap.showHistoricalData(beffTracker.historicalData);
        }

        this.updateFunDistances();

        console.log('✅ Connor Tracker initialization complete');
    }

    setupEventListeners() {
        // Manual refresh on click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.header')) {
                this.updateAll();
            }
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                this.updateAll();
            }
            if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                beffMap.toggleHistoricalView();
            }
        });
    }

    async updateAll() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.updateStatus('Tracking Connor...', 'loading');

        try {
            // Get ship data
            const shipData = await beffTracker.getShipData();

            if (shipData) {
                // Update map
                beffMap.updateShipPosition(shipData);

                // Update dashboard
                await this.updateDashboard();

                // Update details
                await this.updateDetails();

                // Update fun distance measurements
                this.updateFunDistances();

                // Update status based on data source
                this.updateStatus(`✅ Connected • Live data from ${shipData.source}`, 'connected');

                // Update last refresh time
                document.getElementById('last-refresh').textContent = new Date().toLocaleTimeString();
            } else {
                throw new Error('No ship data received');
            }

        } catch (error) {
            console.error('Update failed:', error);
            this.updateStatus('❌ All AIS sources failed • Check console for details', 'error');

            // Retry after 2 minutes
            setTimeout(() => this.updateAll(), 120000);
        } finally {
            this.isLoading = false;
        }
    }

    async updateDashboard() {
        const distance = beffTracker.getDistanceToConnor();
        const travelTime = await beffTracker.getTravelTimeToConnor();

        // Update distance to BEFF
        if (distance) {
            document.getElementById('distance').textContent = Math.round(distance).toLocaleString();
        }

        // Update time to BEFF
        if (travelTime) {
            document.getElementById('travel-time').textContent = travelTime.formatted;
        }

        // Update ship speed
        if (beffTracker.shipData) {
            document.getElementById('ship-speed').textContent = beffTracker.shipData.speed;
        }

        // Update last seen
        if (beffTracker.lastUpdate) {
            const timeAgo = this.getTimeAgo(beffTracker.lastUpdate);
            document.getElementById('last-update').textContent = timeAgo;
        }
    }

    async updateDetails() {
        if (!beffTracker.shipData) return;

        // Update coordinates
        const coords = `${beffTracker.shipData.latitude.toFixed(4)}°, ${beffTracker.shipData.longitude.toFixed(4)}°`;
        document.getElementById('coordinates').textContent = coords;

        // Update location name
        const locationName = await beffTracker.getLocationName(
            beffTracker.shipData.latitude,
            beffTracker.shipData.longitude
        );
        document.getElementById('location-name').textContent = locationName;

        // Update nearest airport
        const airport = await beffTracker.getNearestAirport();
        if (airport) {
            document.getElementById('nearest-airport').textContent = `${airport.name} (${airport.code})`;
            document.getElementById('airport-distance').textContent = `${Math.round(airport.distance)} miles away`;

            // Add airport to map
            beffMap.addAirportMarker(airport);
        }

        // Update flight information with real booking links
        const flightInfo = await beffTracker.getFlightInfo();
        if (flightInfo) {
            // Create clickable flight links for BEFF to Connor
            const toConnorElement = document.getElementById('to-connor-flight');
            toConnorElement.innerHTML = `
                <a href="${flightInfo.toConnor.searchUrl}" target="_blank" class="flight-link">
                    ${flightInfo.toConnor.estimatedPrice} (${flightInfo.toConnor.duration})
                </a>
                <div class="flight-options">
                    <a href="${flightInfo.toConnor.googleUrl}" target="_blank">Google Flights</a> |
                    <a href="${flightInfo.toConnor.kayakUrl}" target="_blank">Kayak</a>
                </div>
            `;

            // Create clickable flight links for Connor to BEFF
            const fromConnorElement = document.getElementById('from-connor-flight');
            fromConnorElement.innerHTML = `
                <a href="${flightInfo.fromConnor.searchUrl}" target="_blank" class="flight-link">
                    ${flightInfo.fromConnor.estimatedPrice} (${flightInfo.fromConnor.duration})
                </a>
                <div class="flight-options">
                    <a href="${flightInfo.fromConnor.googleUrl}" target="_blank">Google Flights</a> |
                    <a href="${flightInfo.fromConnor.kayakUrl}" target="_blank">Kayak</a>
                </div>
            `;
        }
    }

    updateFunDistances() {
        const distance = beffTracker.getDistanceToConnor();
        if (!distance) {
            console.log('No distance available for fun calculations');
            return;
        }

        console.log('Distance to Connor:', distance, 'miles');
        const distanceInMeters = distance * 1609.34; // Convert miles to meters
        const distanceInKm = distance * 1.609344; // Convert miles to km

        // Fun distance calculations
        const calculations = {
            // 🦆 Rubber ducks (average 8cm each)
            rubberDucks: Math.round(distanceInMeters / 0.08),

            // 🏊‍♂️ Swimming at Olympic pace (2.1 m/s average)
            swimmingTime: this.formatTime(distanceInMeters / 2.1),

            // 🚶‍♂️ Walking at casual pace (1.4 m/s)
            walkingTime: this.formatTime(distanceInMeters / 1.4),

            // 🦅 Flying like an eagle (20 m/s average speed)
            birdTime: this.formatTime(distanceInMeters / 20),

            // 🐌 Garden snail pace (0.001 m/s)
            snailTime: this.formatTime(distanceInMeters / 0.001),

            // 🥦 Broccoli florets (average 3cm each)
            broccoliFlorets: Math.round(distanceInMeters / 0.03),

            // 🦘 Kangaroo hops (average 8m per hop)
            kangarooHops: Math.round(distanceInMeters / 8)
        };

        // Log all calculations for debugging
        console.log('Fun distance calculations:', calculations);

        // Update the DOM
        this.safeUpdateElement('rubber-ducks', calculations.rubberDucks.toLocaleString());
        this.safeUpdateElement('swimming-time', calculations.swimmingTime);
        this.safeUpdateElement('walking-time', calculations.walkingTime);
        this.safeUpdateElement('bird-time', calculations.birdTime);
        this.safeUpdateElement('snail-time', calculations.snailTime);
        this.safeUpdateElement('broccoli-florets', calculations.broccoliFlorets.toLocaleString());
        this.safeUpdateElement('kangaroo-hops', calculations.kangarooHops.toLocaleString());
    }

    formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)} seconds`;
        } else if (seconds < 3600) {
            const minutes = Math.round(seconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (seconds < 86400) {
            const hours = Math.round(seconds / 3600);
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (seconds < 31536000) {
            const days = Math.round(seconds / 86400);
            return `${days} day${days !== 1 ? 's' : ''}`;
        } else {
            const years = Math.round(seconds / 31536000);
            return `${years} year${years !== 1 ? 's' : ''}`;
        }
    }

    safeUpdateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`Updated ${id}: ${value}`);
        } else {
            console.error(`Element not found: ${id}`);
        }
    }

    updateStatus(message, type) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }

    startAutoRefresh() {
        // Refresh every 30 minutes
        this.autoRefreshInterval = setInterval(() => {
            this.updateAll();
        }, 30 * 60 * 1000);
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'Just now';

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;

        const days = Math.floor(hours / 24);
        return `${days}d`;
    }

    // Debug function - accessible from browser console
    async debugForceUpdate() {
        console.log('🔧 Force updating Connor tracker...');
        this.updateStatus('🔧 Manual debug update...', 'loading');
        await this.updateAll();
    }
}

// Make debug function globally accessible
window.debugConnorTracker = function() {
    if (window.connorTrackerApp) {
        window.connorTrackerApp.debugForceUpdate();
    } else {
        console.log('❌ Connor Tracker app not ready yet');
    }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, starting Connor Tracker v1.5.0 - Fun Distance Edition...');

    // Check if required classes exist
    if (typeof ConnorTracker === 'undefined') {
        console.error('❌ ConnorTracker class not found! Check api.js loading');
        return;
    }
    if (typeof BeffMap === 'undefined') {
        console.error('❌ BeffMap class not found! Check map.js loading');
        return;
    }

    console.log('✅ All classes loaded, initializing app...');

    try {
        const app = new BeffTrackerApp();
        window.connorTrackerApp = app; // Make accessible for debugging
        console.log('✅ App initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
    }

    // Add some helpful tips to the console
    console.log(`
🚢 Connor Tracker Commands:
- Press 'R' to refresh tracking data
- Press 'H' to toggle historical view
- Click the header to manual refresh

Made with ❤️ for BEFF to track Connor
    `);
});