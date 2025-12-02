// seeker_ui/src/components/Map/ProvidersMap.jsx
import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'your_mapbox_token_here';

const ProvidersMap = ({ providers, onProviderSelect }) => {
  const [viewState, setViewState] = useState({
    longitude: 77.2090, // Default to India center
    latitude: 28.6139,
    zoom: 10
  });
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Get user's location for better default view
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setViewState({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          zoom: 12
        });
      });
    }
  }, []);

  return (
    <div className="providers-map" style={{ height: '500px', borderRadius: '8px' }}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {providers.map(provider => (
          <Marker
            key={provider._id}
            longitude={provider.address?.longitude || 77.2090}
            latitude={provider.address?.latitude || 28.6139}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedProvider(provider);
            }}
          >
            <div className="provider-marker">
              <span>🔧</span>
            </div>
          </Marker>
        ))}

        {selectedProvider && (
          <Popup
            longitude={selectedProvider.address?.longitude || 77.2090}
            latitude={selectedProvider.address?.latitude || 28.6139}
            anchor="top"
            onClose={() => setSelectedProvider(null)}
          >
            <div className="provider-popup">
              <h4>{selectedProvider.name}</h4>
              <p><strong>Skills:</strong> {selectedProvider.skills?.join(', ')}</p>
              <p><strong>Rate:</strong> ₹{selectedProvider.rate}/hr</p>
              <button 
                onClick={() => onProviderSelect(selectedProvider)}
                className="book-button"
              >
                Book Service
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default ProvidersMap;