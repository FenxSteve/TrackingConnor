class BeffTrackerApp {
    constructor() {
        this.isLoading = false;
        this.autoRefreshInterval = null;
        this.init();
    }

    async init() {
        // Initialize map
        beffMap = new BeffMap();

        // Load initial data
        await this.updateAll();

        // Set up auto-refresh every 30 minutes
        this.startAutoRefresh();

        // Set up event listeners
        this.setupEventListeners();

        // Show historical data on map
        if (beffTracker.historicalData.length > 0) {
            beffMap.showHistoricalData(beffTracker.historicalData);
        }

        this.drawDistanceChart();
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

            // Update map
            beffMap.updateShipPosition(shipData);

            // Update dashboard
            await this.updateDashboard();

            // Update details
            await this.updateDetails();

            // Update chart
            this.drawDistanceChart();

            // Update status based on data source
            if (shipData.isLastKnown) {
                this.updateStatus('⚠️ Using estimated position • Real data unavailable', 'warning');
            } else {
                this.updateStatus(`Connected • Tracking Connor via ${shipData.source}`, 'connected');
            }

            // Update last refresh time
            document.getElementById('last-refresh').textContent = new Date().toLocaleTimeString();

        } catch (error) {
            console.error('Update failed:', error);
            this.updateStatus('Connection lost • Using last known position', 'warning');

            // Retry after 30 seconds
            setTimeout(() => this.updateAll(), 30000);
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

    drawDistanceChart() {
        const canvas = document.getElementById('distance-chart');
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (beffTracker.historicalData.length < 2) return;

        const data = beffTracker.historicalData.slice(-24); // Last 24 data points
        const maxDistance = Math.max(...data.map(d => d.distance));
        const minDistance = Math.min(...data.map(d => d.distance));

        // Set up chart dimensions
        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;

        // Draw grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvas.width - padding, y);
            ctx.stroke();
        }

        // Draw data line
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 3;
        ctx.beginPath();

        data.forEach((point, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const normalizedDistance = (point.distance - minDistance) / (maxDistance - minDistance);
            const y = padding + chartHeight - (normalizedDistance * chartHeight);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw data points
        ctx.fillStyle = '#2196F3';
        data.forEach((point, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const normalizedDistance = (point.distance - minDistance) / (maxDistance - minDistance);
            const y = padding + chartHeight - (normalizedDistance * chartHeight);

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw labels
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';

        // Y-axis labels
        for (let i = 0; i <= 5; i++) {
            const value = minDistance + ((maxDistance - minDistance) / 5) * (5 - i);
            const y = padding + (chartHeight / 5) * i;
            ctx.fillText(Math.round(value) + 'mi', padding - 10, y + 4);
        }

        // Chart title
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Distance to BEFF Over Time', canvas.width / 2, 20);
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new BeffTrackerApp();

    // Add some helpful tips to the console
    console.log(`
🚢 Connor Tracker Commands:
- Press 'R' to refresh tracking data
- Press 'H' to toggle historical view
- Click the header to manual refresh

Made with ❤️ for BEFF to track Connor
    `);
});