const https = require('https');
const http = require('http');

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        ...options.headers
      }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Try Sinay API for real AIS data (500 free calls per month)
async function trySinayAPI(mmsi) {
  try {
    console.log('Trying Sinay API...');
    const response = await makeRequest(`https://api.sinay.ai/api/v1/vessels/${mmsi}`);

    if (response.statusCode === 200) {
      const jsonData = JSON.parse(response.data);

      if (jsonData.position && jsonData.position.latitude && jsonData.position.longitude) {
        console.log('Sinay API returned valid data');
        return {
          mmsi: mmsi,
          name: jsonData.name || 'RFA TIDESPRING',
          latitude: parseFloat(jsonData.position.latitude),
          longitude: parseFloat(jsonData.position.longitude),
          speed: parseFloat(jsonData.speed) || 0,
          course: parseFloat(jsonData.course) || 0,
          status: jsonData.status || 'At Sea',
          timestamp: new Date().toISOString(),
          source: 'Sinay'
        };
      }
    }
  } catch (error) {
    console.log('Sinay API failed:', error.message);
  }
  return null;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const MMSI = '235109357'; // RFA Tidespring

  try {
    console.log('🚢 Fetching real AIS data for MMSI:', MMSI);

    // First: Try Sinay API (500 free calls per month)
    const sinayData = await trySinayAPI(MMSI);
    if (sinayData) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sinayData)
      };
    }

    // Try VesselFinder API
    try {
      console.log('Trying VesselFinder...');
      const response = await makeRequest(`https://www.vesselfinder.com/api/pub/click/${MMSI}`);

      if (response.statusCode === 200) {
        console.log('VesselFinder response received');

        try {
          const jsonData = JSON.parse(response.data);
          if (jsonData.lat && jsonData.lon) {
            console.log('VesselFinder data parsed successfully');
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                mmsi: MMSI,
                name: 'RFA TIDESPRING',
                latitude: parseFloat(jsonData.lat),
                longitude: parseFloat(jsonData.lon),
                speed: parseFloat(jsonData.speed) || 0,
                course: parseFloat(jsonData.course) || 0,
                status: jsonData.status || 'At Sea',
                timestamp: new Date().toISOString(),
                source: 'VesselFinder'
              })
            };
          }
        } catch (parseError) {
          console.log('VesselFinder returned non-JSON, trying regex extraction...');

          // Try to extract coordinates from response
          const latMatch = response.data.match(/lat["\s:]+([+-]?\d+\.?\d*)/i);
          const lonMatch = response.data.match(/lon[g]?["\s:]+([+-]?\d+\.?\d*)/i);

          if (latMatch && lonMatch) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                mmsi: MMSI,
                name: 'RFA TIDESPRING',
                latitude: parseFloat(latMatch[1]),
                longitude: parseFloat(lonMatch[1]),
                speed: 0,
                course: 0,
                status: 'At Sea',
                timestamp: new Date().toISOString(),
                source: 'VesselFinder-Extracted'
              })
            };
          }
        }
      }
    } catch (error) {
      console.log('VesselFinder failed:', error.message);
    }

    // Try AISHub API (HTTP to avoid SSL issues)
    try {
      console.log('Trying AISHub...');
      const response = await makeRequest(`http://data.aishub.net/ws.php?username=demo&format=1&output=json&mmsi=${MMSI}`);

      if (response.statusCode === 200) {
        console.log('AISHub response received');

        try {
          const jsonData = JSON.parse(response.data);
          if (jsonData[0] && jsonData[0].LATITUDE) {
            const ship = jsonData[0];
            console.log('AISHub data parsed successfully');
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                mmsi: MMSI,
                name: 'RFA TIDESPRING',
                latitude: parseFloat(ship.LATITUDE),
                longitude: parseFloat(ship.LONGITUDE),
                speed: parseFloat(ship.SOG) || 0,
                course: parseFloat(ship.COG) || 0,
                status: 'At Sea',
                timestamp: new Date().toISOString(),
                source: 'AISHub'
              })
            };
          }
        } catch (parseError) {
          console.log('AISHub parse error:', parseError.message);
        }
      }
    } catch (error) {
      console.log('AISHub failed:', error.message);
    }

    // Try multiple AIS APIs with different approaches
    const additionalSources = [
      {
        name: 'VesselTracker',
        url: `https://www.vesseltracker.com/en/Ships/${MMSI}.html`
      },
      {
        name: 'FleetMon',
        url: `https://www.fleetmon.com/vessels/${MMSI}`
      },
      {
        name: 'MarineTraffic-API',
        url: `https://services.marinetraffic.com/api/exportvessels/v:3/protocol:jsono/mmsi:${MMSI}/timespan:20`
      }
    ];

    for (const source of additionalSources) {
      try {
        console.log(`Trying ${source.name}...`);
        const response = await makeRequest(source.url);

        if (response.statusCode === 200) {
          console.log(`${source.name} response received`);

          // Extract coordinates using multiple regex patterns
          const patterns = [
            /latitude["\s:]+([+-]?\d+\.?\d*)/i,
            /lat["\s:]+([+-]?\d+\.?\d*)/i,
            /"lat"[:\s]*([+-]?\d+\.?\d*)/i,
            /position[^}]*lat[^}]*?([+-]?\d+\.?\d*)/i
          ];

          const lonPatterns = [
            /longitude["\s:]+([+-]?\d+\.?\d*)/i,
            /lon[g]?["\s:]+([+-]?\d+\.?\d*)/i,
            /"lon"[:\s]*([+-]?\d+\.?\d*)/i,
            /position[^}]*lon[^}]*?([+-]?\d+\.?\d*)/i
          ];

          let lat = null, lon = null;

          for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match) {
              lat = parseFloat(match[1]);
              break;
            }
          }

          for (const pattern of lonPatterns) {
            const match = response.data.match(pattern);
            if (match) {
              lon = parseFloat(match[1]);
              break;
            }
          }

          if (lat && lon && lat !== 0 && lon !== 0) {
            console.log(`Found coordinates from ${source.name}: ${lat}, ${lon}`);
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                mmsi: MMSI,
                name: 'RFA TIDESPRING',
                latitude: lat,
                longitude: lon,
                speed: 0,
                course: 0,
                status: 'At Sea',
                timestamp: new Date().toISOString(),
                source: source.name
              })
            };
          }
        }
      } catch (error) {
        console.log(`${source.name} failed:`, error.message);
      }
    }

    // All APIs failed - return error instead of fake data
    console.log('All AIS data sources failed');

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'No live AIS data available',
        message: 'All real-time ship tracking sources failed to return current position',
        mmsi: MMSI,
        timestamp: new Date().toISOString(),
        attempted_sources: ['VesselFinder', 'AISHub', 'VesselTracker', 'FleetMon', 'MarineTraffic']
      })
    };

  } catch (error) {
    console.error('Backend error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch AIS data',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};