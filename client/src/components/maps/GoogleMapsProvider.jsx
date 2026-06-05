import React from 'react';
import { LoadScript } from '@react-google-maps/api';

const LIBRARIES = ['places', 'geometry', 'drawing'];

export default function GoogleMapsProvider({ children }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Google Maps API Key Missing</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Please add a valid VITE_GOOGLE_MAPS_KEY to your client/.env file to use map features.
        </p>
      </div>
    );
  }

  const LoadingFallback = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading Map Services...</p>
    </div>
  );

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={LIBRARIES}
      loadingElement={<LoadingFallback />}
      preventGoogleFontsLoading={true}
    >
      {children}
    </LoadScript>
  );
}
