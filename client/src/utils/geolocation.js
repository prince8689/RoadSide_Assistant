// ============================================
// GEOLOCATION UTILITIES
// ============================================

/**
 * Gets the user's current location via HTML5 Geolocation API
 * @returns {Promise<{ lat: number, lng: number, accuracy: number }>}
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            reject('Location permission denied. Please enable location access.');
            break;
          case 2: // POSITION_UNAVAILABLE
            reject('Location unavailable. Please check GPS.');
            break;
          case 3: // TIMEOUT
            reject('Location request timed out. Please try again.');
            break;
          default:
            reject('An unknown error occurred while fetching location.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  });
};

/**
 * Watches the user's location via HTML5 Geolocation API
 * @param {Function} callback - Called with { lat, lng, accuracy, timestamp } on update
 * @param {Function} errorCallback - Called with error message on error
 * @returns {number} watchId - Used to stop watching
 */
export const watchLocation = (callback, errorCallback) => {
  if (!navigator.geolocation) {
    if (errorCallback) errorCallback('Geolocation is not supported by your browser.');
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      let errorMessage = 'An unknown error occurred while watching location.';
      switch (error.code) {
        case 1:
          errorMessage = 'Location permission denied. Please enable location access.';
          break;
        case 2:
          errorMessage = 'Location unavailable. Please check GPS.';
          break;
        case 3:
          errorMessage = 'Location request timed out. Please try again.';
          break;
      }
      if (errorCallback) errorCallback(errorMessage);
    },
    { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
  );
};

/**
 * Stops watching the user's location
 * @param {number} watchId - ID returned by watchLocation
 */
export const stopWatchingLocation = (watchId) => {
  if (navigator.geolocation && watchId !== null && watchId !== undefined) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Calculates distance between two coordinates in km using the Haversine formula
 * @param {number} lat1 
 * @param {number} lng1 
 * @param {number} lat2 
 * @param {number} lng2 
 * @returns {number} Distance in kilometers rounded to 1 decimal place
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(1));
};

/**
 * Converts coordinates to formatted address using OpenStreetMap Nominatim API
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<string>} Formatted address or raw coordinates
 */
export const getAddressFromCoords = async (lat, lng) => {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Error fetching address:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

/**
 * Converts formatted address to coordinates using Google Maps Geocoding API
 * @param {string} address 
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export const getCoordsFromAddress = async (address) => {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') return null;
    
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return null;
  }
};
