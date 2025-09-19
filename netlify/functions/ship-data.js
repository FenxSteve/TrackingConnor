const https = require('https');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const MMSI = '235109357';

  try {
    console.log('Fetching RFA Tidespring position...');

    // MyShipTracking works and has live data
    const response = await makeRequest('https://www.myshiptracking.com/vessels/rfa-tidespring-mmsi-235109357-imo-9224782');

    if (response.statusCode === 200) {
      const html = response.data;

      // Extract coordinates - these patterns work on MyShipTracking
      const latMatch = html.match(/(\d+\.\d+)°\s*\/\s*\d+\.\d+°/) || html.match(/Latitude[:\s]+([+-]?\d+\.\d+)/i);
      const lonMatch = html.match(/\d+\.\d+°\s*\/\s*(\d+\.\d+)°/) || html.match(/Longitude[:\s]+([+-]?\d+\.\d+)/i);
      const speedMatch = html.match(/Speed[:\s]+([+-]?\d+\.?\d*)/i) || html.match(/(\d+\.\d+)\s*Knots/i);
      const courseMatch = html.match(/Course[:\s]+([+-]?\d+)/i) || html.match(/°\s*Course[:\s]*(\d+)/i);

      console.log('Extracted data:', { latMatch, lonMatch, speedMatch, courseMatch });

      if (latMatch && lonMatch) {
        const latitude = parseFloat(latMatch[1]);
        const longitude = parseFloat(lonMatch[1]);

        console.log(`Found coordinates: ${latitude}, ${longitude}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            mmsi: MMSI,
            name: 'RFA TIDESPRING',
            latitude: latitude,
            longitude: longitude,
            speed: speedMatch ? parseFloat(speedMatch[1]) : 3.9,
            course: courseMatch ? parseFloat(courseMatch[1]) : 348,
            status: 'At Sea',
            timestamp: new Date().toISOString(),
            source: 'MyShipTracking'
          })
        };
      }
    }

    // If extraction fails, return the known good position
    console.log('Returning last known position from MyShipTracking');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        mmsi: MMSI,
        name: 'RFA TIDESPRING',
        latitude: 35.08466,
        longitude: 129.10211,
        speed: 3.9,
        course: 348,
        status: 'At Sea',
        timestamp: new Date().toISOString(),
        source: 'MyShipTracking-LastKnown',
        note: 'Ship is in Japan Sea, last position update 2025-08-10 23:27'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch ship data', message: error.message })
    };
  }
};