import React from 'react';
import { LoadScript } from '@react-google-maps/api';

const LIBRARIES = ['places', 'geometry', 'drawing', 'marker'];

export default function GoogleMapsProvider({ children }) {
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const apiKey = envKey || '';

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
