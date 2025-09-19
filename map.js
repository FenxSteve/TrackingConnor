console.log('🗺️ map.js loading... v1.2.3');

class BeffMap {
    constructor() {
        this.map = null;
        this.shipMarker = null;
        this.homeMarker = null;
        this.distanceLine = null;
        this.shipTrail = null;
        this.historicalMarkers = [];
        this.init();
    }

    init() {
        // Initialize the map
        this.map = L.map('map').setView([45, 0], 4);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add home marker (SW8 4RU)
        this.homeMarker = L.marker([51.4816, -0.1297], {
            icon: this.createHomeIcon()
        }).addTo(this.map);

        this.homeMarker.bindPopup('<b>BEFF\'s Home</b><br>SW8 4RU, London<br>🏠 BEFF is here');

        // Initialize ship trail
        this.shipTrail = L.polyline([], {
            color: '#2196F3',
            weight: 3,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(this.map);
    }

    createHomeIcon() {
        return L.divIcon({
            html: '🏠',
            iconSize: [30, 30],
            className: 'home-icon',
            iconAnchor: [15, 15]
        });
    }

    createShipIcon(course = 0) {
        return L.divIcon({
            html: `<div style="transform: rotate(${course}deg); font-size: 24px;">🚢</div>`,
            iconSize: [30, 30],
            className: 'ship-icon',
            iconAnchor: [15, 15]
        });
    }

    updateShipPosition(shipData) {
        const shipLatLng = [shipData.latitude, shipData.longitude];

        // Remove existing ship marker
        if (this.shipMarker) {
            this.map.removeLayer(this.shipMarker);
        }

        // Add new ship marker with course heading
        this.shipMarker = L.marker(shipLatLng, {
            icon: this.createShipIcon(shipData.course)
        }).addTo(this.map);

        // Create popup with ship info
        const popupContent = `
            <div class="ship-popup">
                <b>🚢 RFA Tidespring</b><br>
                <strong>Connor is here!</strong><br>
                Speed: ${shipData.speed} knots<br>
                Course: ${shipData.course}°<br>
                Status: ${shipData.status}<br>
                <small>MMSI: ${shipData.mmsi}</small>
                ${shipData.source ? `<br><small>Source: ${shipData.source}</small>` : ''}
            </div>
        `;

        this.shipMarker.bindPopup(popupContent);

        // Update distance line
        this.updateDistanceLine(shipLatLng);

        // Add to ship trail
        this.addToTrail(shipLatLng);

        // Adjust map view to show both points
        this.fitMapToPoints();
    }

    updateDistanceLine(shipLatLng) {
        const homeLatLng = [51.4816, -0.1297];

        // Remove existing line
        if (this.distanceLine) {
            this.map.removeLayer(this.distanceLine);
        }

        // Create new distance line
        this.distanceLine = L.polyline([homeLatLng, shipLatLng], {
            color: '#FF5722',
            weight: 2,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(this.map);

        // Calculate and display distance
        const distance = beffTracker.getDistanceToBeff();
        if (distance) {
            const midpoint = [
                (homeLatLng[0] + shipLatLng[0]) / 2,
                (homeLatLng[1] + shipLatLng[1]) / 2
            ];

            const distanceMarker = L.marker(midpoint, {
                icon: L.divIcon({
                    html: `<div class="distance-label">${Math.round(distance)} miles to Connor</div>`,
                    className: 'distance-marker',
                    iconSize: [120, 20],
                    iconAnchor: [60, 10]
                })
            }).addTo(this.map);
        }
    }

    addToTrail(shipLatLng) {
        const trailPoints = this.shipTrail.getLatLngs();
        trailPoints.push(shipLatLng);

        // Keep only last 20 points for trail
        if (trailPoints.length > 20) {
            trailPoints.shift();
        }

        this.shipTrail.setLatLngs(trailPoints);
    }

    showHistoricalData(historicalData) {
        // Clear existing historical markers
        this.historicalMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.historicalMarkers = [];

        // Add historical points (show only every 5th point to avoid clutter)
        historicalData.forEach((point, index) => {
            if (index % 5 === 0) {
                const marker = L.circleMarker([point.latitude, point.longitude], {
                    radius: 3,
                    fillColor: '#4CAF50',
                    color: '#4CAF50',
                    weight: 1,
                    opacity: 0.6,
                    fillOpacity: 0.4
                });

                marker.bindPopup(`
                    <small>
                        ${new Date(point.timestamp).toLocaleString()}<br>
                        Distance: ${Math.round(point.distance)} miles<br>
                        Speed: ${point.speed} knots
                    </small>
                `);

                marker.addTo(this.map);
                this.historicalMarkers.push(marker);
            }
        });
    }

    fitMapToPoints() {
        if (this.shipMarker) {
            const group = new L.featureGroup([this.homeMarker, this.shipMarker]);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // Add nearest airport marker
    addAirportMarker(airport) {
        if (airport) {
            const airportMarker = L.marker([airport.lat, airport.lng], {
                icon: L.divIcon({
                    html: '✈️',
                    iconSize: [20, 20],
                    className: 'airport-icon',
                    iconAnchor: [10, 10]
                })
            }).addTo(this.map);

            airportMarker.bindPopup(`
                <b>✈️ Nearest Airport</b><br>
                ${airport.name} (${airport.code})<br>
                ${airport.city}<br>
                <small>${Math.round(airport.distance)} miles from ship</small>
            `);
        }
    }

    // Toggle historical view
    toggleHistoricalView() {
        const isVisible = this.historicalMarkers.length > 0;

        if (isVisible) {
            // Hide historical markers
            this.historicalMarkers.forEach(marker => {
                this.map.removeLayer(marker);
            });
            this.historicalMarkers = [];
        } else {
            // Show historical data
            this.showHistoricalData(beffTracker.historicalData);
        }

        return !isVisible;
    }
}

// Initialize the map
let beffMap;