import { toast } from 'react-hot-toast';

export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }),
      (err) => {
        // Default to Delhi if location denied
        console.warn('Location denied, using default');
        toast('📍 Using default location. Please allow location access for better service', { icon: '📍' });
        resolve({ lat: 28.6139, lng: 77.2090 });
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  });
};
