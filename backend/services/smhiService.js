const axios = require('axios');

// SMHI Open Data API
const SMHI_BASE_URL = 'https://opendata-download-metfcst.smhi.se/api';
const SMHI_HISTORICAL_URL = 'https://opendata-download-metobs.smhi.se/api';

/**
 * Get current temperature for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<number>} Temperature in Celsius
 */
async function getCurrentTemperature(lat = 59.3293, lon = 18.0686) { // Default: Stockholm
  try {
    const response = await axios.get(`${SMHI_BASE_URL}/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`);

    if (response.data && response.data.timeSeries && response.data.timeSeries.length > 0) {
      const currentForecast = response.data.timeSeries[0];
      const tempParam = currentForecast.parameters.find(p => p.name === 't');

      if (tempParam && tempParam.values && tempParam.values.length > 0) {
        return tempParam.values[0];
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching temperature from SMHI:', error.message);
    return null;
  }
}

/**
 * Get temperature forecast for the next 10 days
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Array>} Array of {date, temperature}
 */
async function getTemperatureForecast(lat = 59.3293, lon = 18.0686) {
  try {
    const response = await axios.get(`${SMHI_BASE_URL}/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`);

    if (response.data && response.data.timeSeries) {
      const forecast = [];
      const dailyTemps = {};

      response.data.timeSeries.forEach(entry => {
        const date = new Date(entry.validTime);
        const dateKey = date.toISOString().split('T')[0];
        const tempParam = entry.parameters.find(p => p.name === 't');

        if (tempParam && tempParam.values && tempParam.values.length > 0) {
          const temp = tempParam.values[0];

          if (!dailyTemps[dateKey]) {
            dailyTemps[dateKey] = [];
          }
          dailyTemps[dateKey].push(temp);
        }
      });

      // Calculate daily average temperature
      Object.keys(dailyTemps).forEach(date => {
        const temps = dailyTemps[date];
        const avgTemp = temps.reduce((sum, t) => sum + t, 0) / temps.length;
        forecast.push({
          date,
          temperature: Math.round(avgTemp * 10) / 10
        });
      });

      return forecast;
    }

    return [];
  } catch (error) {
    console.error('Error fetching forecast from SMHI:', error.message);
    return [];
  }
}

/**
 * Calculate accumulated temperature (degree days)
 * Used to predict when hay will reach warm threshold
 * @param {Array} forecast - Array of {date, temperature}
 * @returns {Array} Array of {date, accumulatedTemp}
 */
function calculateAccumulatedTemperature(forecast) {
  let accumulated = 0;
  return forecast.map(day => {
    accumulated += Math.max(day.temperature, 0); // Only count positive temperatures
    return {
      date: day.date,
      temperature: day.temperature,
      accumulatedTemp: Math.round(accumulated * 10) / 10
    };
  });
}

/**
 * Predict warm date based on historical data and temperature forecast
 * @param {Date} openedDate - When the bale was opened
 * @param {Array} historicalBales - Previous bales with warmDate and warmTemperature
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Prediction with date and confidence
 */
async function predictWarmDate(openedDate, historicalBales = [], lat = 59.3293, lon = 18.0686) {
  try {
    // Get temperature forecast
    const forecast = await getTemperatureForecast(lat, lon);
    if (forecast.length === 0) {
      return null;
    }

    // Calculate accumulated temperature
    const accumulated = calculateAccumulatedTemperature(forecast);

    // Analyze historical data to find threshold
    let avgDegreesDaysToWarm = 150; // Default threshold (based on hay storage research)

    if (historicalBales.length > 0) {
      const validBales = historicalBales.filter(b => b.openedDate && b.warmDate && b.warmTemperature);

      if (validBales.length > 0) {
        // In production, you would calculate actual degree days from historical weather data
        // For now, we estimate based on days and average temperatures
        const avgDays = validBales.reduce((sum, b) => {
          const days = Math.abs(new Date(b.warmDate) - new Date(b.openedDate)) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / validBales.length;

        const avgTemp = validBales.reduce((sum, b) => sum + (b.warmTemperature || 15), 0) / validBales.length;
        avgDegreesDaysToWarm = avgDays * avgTemp;
      }
    }

    // Find when accumulated temperature exceeds threshold
    for (let i = 0; i < accumulated.length; i++) {
      if (accumulated[i].accumulatedTemp >= avgDegreesDaysToWarm) {
        return {
          predictedDate: accumulated[i].date,
          confidence: validBales.length > 0 ? 'medium' : 'low',
          daysFromNow: i + 1,
          basedOnSamples: validBales.length,
          thresholdDegreeDays: Math.round(avgDegreesDaysToWarm)
        };
      }
    }

    // If threshold not reached within forecast period
    return {
      predictedDate: null,
      confidence: 'low',
      message: 'Temperature threshold not expected within 10-day forecast',
      basedOnSamples: validBales.length,
      thresholdDegreeDays: Math.round(avgDegreesDaysToWarm)
    };
  } catch (error) {
    console.error('Error predicting warm date:', error.message);
    return null;
  }
}

module.exports = {
  getCurrentTemperature,
  getTemperatureForecast,
  predictWarmDate,
  calculateAccumulatedTemperature
};
