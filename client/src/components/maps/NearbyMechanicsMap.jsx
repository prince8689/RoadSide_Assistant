import React, { useCallback, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { FiPhoneCall, FiAlertCircle } from 'react-icons/fi';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  fullscreenControl: true,
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e8ff" }] }
  ],
  mapId: "ROADSIDE_MAP_ID"
};

export default function NearbyMechanicsMap({ 
  userLocation, 
  mechanics = [], 
  onMechanicSelect, 
  selectedMechanic,
  height = "400px",
  showUserMarker = true
}) {
  const [map, setMap] = useState(null);
  const [dynamicMetrics, setDynamicMetrics] = useState({});

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    // Optionally fit bounds here if there are mechanics
  }, []);

  const handleLocateMe = () => {
    if (map && userLocation) {
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      map.setZoom(13);
    }
  };

  React.useEffect(() => {
    if (mechanics.length > 0 && userLocation && window.google) {
      const service = new window.google.maps.DistanceMatrixService();
      const destinations = mechanics.map(m => ({
        lat: parseFloat(m.latitude),
        lng: parseFloat(m.longitude)
      }));

      service.getDistanceMatrix(
        {
          origins: [{ lat: userLocation.lat, lng: userLocation.lng }],
          destinations: destinations,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (status === window.google.maps.DistanceMatrixStatus.OK) {
            const results = response.rows[0].elements;
            const newMetrics = {};
            mechanics.forEach((mech, index) => {
              if (results[index].status === 'OK') {
                newMetrics[mech.mechanic_id || mech.id] = {
                  distanceText: results[index].distance.text,
                  durationText: results[index].duration.text
                };
              }
            });
            setDynamicMetrics(newMetrics);
          }
        }
      );
    }
  }, [mechanics, userLocation]);

  const getMarkerColor = (mechanic) => {
    return mechanic.is_on_duty ? '#DC3545' : '#FF8A00';
  };

  const markersRef = React.useRef([]);

  // Manage AdvancedMarkerElements
  React.useEffect(() => {
    if (!map || !window.google?.maps?.marker) return;

    // Clear old markers first
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];

    // Create new markers
    mechanics.forEach(mechanic => {
      const pinElement = new window.google.maps.marker.PinElement({
        background: getMarkerColor(mechanic),
        borderColor: '#FFFFFF',
        glyphColor: '#FFFFFF',
      });

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: {
          lat: parseFloat(mechanic.latitude), 
          lng: parseFloat(mechanic.longitude)
        },
        content: pinElement.element,
        title: mechanic.name
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onMechanicSelect) onMechanicSelect(mechanic);
      });

      markersRef.current.push(marker);
    });

    // Cleanup on unmount or dependency change
    return () => {
      markersRef.current.forEach(marker => {
        if (marker) marker.map = null;
      });
      markersRef.current = [];
    };
  }, [map, mechanics, onMechanicSelect]);

  const userMarkerIcon = {
    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
    fillColor: '#007BFF',
    fillOpacity: 1,
    strokeWeight: 3,
    strokeColor: '#FFFFFF',
    scale: 8,
  };

  if (!userLocation) {
    return (
      <div style={{ height }} className="bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-gray-500 text-center px-4">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
          <p>Waiting for location...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="relative rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={{ lat: userLocation.lat, lng: userLocation.lng }}
        zoom={13}
        options={mapOptions}
        onLoad={onLoad}
      >
        {/* User Location Marker */}
        {showUserMarker && (
          <Marker 
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            icon={userMarkerIcon}
            title="You are here"
            zIndex={10}
          />
        )}
        
        {/* User Accuracy Circle */}
        {showUserMarker && (
          <Circle
            center={{ lat: userLocation.lat, lng: userLocation.lng }}
            radius={200} // 200m accuracy radius representation
            options={{
              fillColor: '#007BFF',
              fillOpacity: 0.1,
              strokeColor: '#007BFF',
              strokeOpacity: 0.3,
              strokeWeight: 1,
            }}
          />
        )}

        {/* Mechanic Markers are managed via useEffect with AdvancedMarkerElement */}

        {/* InfoWindow for selected mechanic */}
        {selectedMechanic && (
          <InfoWindow
            position={{ 
              lat: parseFloat(selectedMechanic.latitude), 
              lng: parseFloat(selectedMechanic.longitude) 
            }}
            onCloseClick={() => onMechanicSelect(null)}
          >
            <div className="p-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {selectedMechanic.name ? selectedMechanic.name.charAt(0).toUpperCase() : 'M'}
                </div>
                <div>
                  <h4 className="font-bold text-sm m-0 text-gray-900">{selectedMechanic.name}</h4>
                  <div className="flex items-center text-xs text-yellow-500">
                    {'★'.repeat(Math.round(selectedMechanic.average_rating || 0))}
                    <span className="text-gray-400 ml-1">({selectedMechanic.total_reviews || 0})</span>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-600 mb-3 space-y-1">
                <p>📍 {dynamicMetrics[selectedMechanic.mechanic_id || selectedMechanic.id]?.distanceText || selectedMechanic.distanceText || `${selectedMechanic.distance_km} km away`}</p>
                <p>⏱️ {dynamicMetrics[selectedMechanic.mechanic_id || selectedMechanic.id]?.durationText || selectedMechanic.estimatedArrival || 'Unknown ETA'}</p>
              </div>
              
              <div className="flex gap-2">
                <a 
                  href={`tel:${selectedMechanic.phone}`}
                  className="flex-1 bg-green-500 text-white p-2 rounded-lg flex items-center justify-center"
                  title="Call"
                >
                  <FiPhoneCall size={14} />
                </a>
                <button 
                  onClick={() => onMechanicSelect(selectedMechanic)}
                  className="flex-[3] bg-primary text-white p-2 rounded-lg text-xs font-bold"
                >
                  Request
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Locate Me Button */}
      <button 
        onClick={handleLocateMe}
        className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-primary hover:bg-gray-50 transition-colors z-[0]"
        title="Locate Me"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
      </button>
      
      {/* Pulse Animation Styles */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
