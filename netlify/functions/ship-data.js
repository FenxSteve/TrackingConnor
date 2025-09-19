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

    // Try multiple real AIS data sources
    const dataSources = [
      {
        name: 'VesselFinder',
        url: `https://www.vesselfinder.com/api/pub/click/${MMSI}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.vesselfinder.com/'
        }
      },
      {
        name: 'MarineTraffic',
        url: `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${MMSI}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      },
      {
        name: 'AISHub',
        url: `http://data.aishub.net/ws.php?username=demo&format=1&output=json&mmsi=${MMSI}`,
        headers: {}
      }
    ];

    for (const source of dataSources) {
      try {
        console.log(`Trying ${source.name}...`);

        const response = await fetch(source.url, {
          method: 'GET',
          headers: source.headers
        });

        if (response.ok) {
          const data = await response.text();
          console.log(`${source.name} response:`, data.substring(0, 500));

          // Try to parse as JSON
          try {
            const jsonData = JSON.parse(data);

            // VesselFinder format
            if (jsonData.lat && jsonData.lon) {
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
                  source: source.name
                })
              };
            }

            // AISHub format
            if (jsonData[0] && jsonData[0].LATITUDE) {
              const ship = jsonData[0];
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
                  source: source.name
                })
              };
            }
          } catch (parseError) {
            console.log(`${source.name} returned non-JSON data, trying to extract...`);

            // Try to extract coordinates from HTML/text
            const latMatch = data.match(/latitude["\s:]+([+-]?\d+\.?\d*)/i);
            const lonMatch = data.match(/longitude["\s:]+([+-]?\d+\.?\d*)/i);
            const speedMatch = data.match(/speed["\s:]+([+-]?\d+\.?\d*)/i);

            if (latMatch && lonMatch) {
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                  mmsi: MMSI,
                  name: 'RFA TIDESPRING',
                  latitude: parseFloat(latMatch[1]),
                  longitude: parseFloat(lonMatch[1]),
                  speed: speedMatch ? parseFloat(speedMatch[1]) : 0,
                  course: 0,
                  status: 'At Sea',
                  timestamp: new Date().toISOString(),
                  source: source.name
                })
              };
            }
          }
        }
      } catch (error) {
        console.log(`${source.name} failed:`, error.message);
      }
    }

    // If all sources fail, try MyShipTracking
    try {
      console.log('Trying MyShipTracking as final attempt...');
      const response = await fetch(`https://www.myshiptracking.com/requests/ais-tracking/${MMSI}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.text();
        console.log('MyShipTracking response:', data.substring(0, 500));

        // Extract coordinates
        const latMatch = data.match(/lat["\s:]+([+-]?\d+\.?\d*)/i);
        const lonMatch = data.match(/lon[g]?["\s:]+([+-]?\d+\.?\d*)/i);

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
              source: 'MyShipTracking'
            })
          };
        }
      }
    } catch (error) {
      console.log('MyShipTracking failed:', error.message);
    }

    // All sources failed
    throw new Error('All AIS data sources failed');

  } catch (error) {
    console.error('Backend AIS fetch failed:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch real AIS data',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};