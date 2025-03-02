import React, { useState, useRef } from 'react';
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  Autocomplete,
} from '@react-google-maps/api';
import {
  Box,
  Button,
  TextField,
  Typography,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '15px',
};

const defaultCenter = {
  lat: 37.7749,
  lng: -122.4194,
};

interface LocationStorageFormat {
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timezone: string;
}

const LocationAccess = () => {
  const [selectedLocation, setSelectedLocation] =
    useState<LocationStorageFormat | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'hybrid' | 'terrain'>(
    'hybrid'
  );

  const searchBoxRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isMobile = useMediaQuery('(max-width:600px)');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY!,
    libraries: ['places'],
  });

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const latitude = event.latLng.lat();
      const longitude = event.latLng.lng();

      const fallbackLocation: LocationStorageFormat = {
        name: 'Manual Selection',
        latitude,
        longitude,
        altitude: 122,
        timezone: 'Unknown',
      };

      setSelectedLocation(fallbackLocation);

      if (mapRef.current) {
        mapRef.current.panTo(event.latLng);
      }
    }
  };

  const handleSearchLoad = (autocomplete: google.maps.places.Autocomplete) => {
    searchBoxRef.current = autocomplete;
  };

  const handleSearchPlaceChange = () => {
    if (searchBoxRef.current) {
      const place = searchBoxRef.current.getPlace();
      if (place?.geometry?.location) {
        const latitude = place.geometry.location.lat();
        const longitude = place.geometry.location.lng();
        const name = place.formatted_address || place.name || 'Selected Place';

        const locationData: LocationStorageFormat = {
          name,
          latitude,
          longitude,
          altitude: 122,
          timezone: 'Europe/Zagreb',
        };

        setSelectedLocation(locationData);

        if (mapRef.current) {
          mapRef.current.panTo({ lat: latitude, lng: longitude });
        }
      }
    }
  };

  const handleEnterPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && inputRef.current) {
      const searchValue = inputRef.current.value;
      const geocoder = new google.maps.Geocoder();

      geocoder.geocode({ address: searchValue }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const latitude = results[0].geometry.location.lat();
          const longitude = results[0].geometry.location.lng();

          const locationData: LocationStorageFormat = {
            name: results[0].formatted_address || 'Searched Place',
            latitude,
            longitude,
            altitude: 122,
            timezone: 'Europe/Zagreb',
          };

          setSelectedLocation(locationData);

          if (mapRef.current) {
            mapRef.current.panTo({ lat: latitude, lng: longitude });
          }
        } else {
          alert('Location not found. Please enter a valid address.');
        }
      });
    }
  };

  const saveLocation = () => {
    if (selectedLocation) {
      localStorage.setItem('userLocation', JSON.stringify(selectedLocation));
      localStorage.getItem('devices')
        ? (window.location.href = '/home')
        : (window.location.href = '/form');
    } else {
      alert('Please select a location first.');
    }
  };

  if (!isLoaded) return <p>Loading...</p>;

  return (
    <Box
      sx={{
        width: { xs: '90%', sm: '80%', md: '600px' },
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: { xs: 1, sm: 2 },
        minHeight: '100vh',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          sx={{ fontWeight: 'bold' }}
        >
          Location Access
        </Typography>
        <Typography
          variant={isMobile ? 'body2' : 'body1'}
          sx={{ color: 'gray' }}
        >
          Enter your location to receive personalized energy-saving
          recommendations.
        </Typography>
      </Box>

      {/* Search Bar */}
      <Autocomplete
        onLoad={handleSearchLoad}
        onPlaceChanged={handleSearchPlaceChange}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search location"
          inputRef={inputRef}
          onKeyDown={handleEnterPress}
          InputProps={{
            style: {
              width: isMobile ? '330px' : '600px',
              borderRadius: '25px',
              backgroundColor: '#222',
              color: '#fff',
              padding: isMobile ? '5px 5px' : '10px 10px',
            },
            startAdornment: (
              <InputAdornment
                position="start"
                sx={{ color: '#fff', marginLeft: '8px' }}
              >
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Autocomplete>

      {/* Map Type Toggle */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F2F2F2',
          borderRadius: '15px',
          padding: '5px',
          width: '100%',
        }}
      >
        {['satellite', 'hybrid', 'terrain'].map((type, index) => (
          <Button
            key={type}
            variant="text"
            color="inherit"
            onClick={() =>
              setMapType(type as 'satellite' | 'hybrid' | 'terrain')
            }
            sx={{
              flex: 1,
              textTransform: 'none',
              padding: mapType === type ? '12px 20px' : '10px 15px',
              borderRadius: mapType === type ? '10px' : '0',
              backgroundColor: mapType === type ? '#222' : 'transparent',
              color: mapType === type ? '#fff' : '#000',
              fontWeight: mapType === type ? 'bold' : 'normal',
              ':hover': {
                backgroundColor: mapType === type ? '#333' : 'transparent',
              },
              borderLeft: index === 1 ? '1px solid #000' : 'none',
              borderRight: index === 1 ? '1px solid #000' : 'none',
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        ))}
      </Box>

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={
          selectedLocation
            ? {
                lat: selectedLocation.latitude,
                lng: selectedLocation.longitude,
              }
            : defaultCenter
        }
        zoom={10}
        mapTypeId={mapType}
        onClick={handleMapClick}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: false,
        }}
      >
        {selectedLocation && (
          <Marker
            position={{
              lat: selectedLocation.latitude,
              lng: selectedLocation.longitude,
            }}
          />
        )}
      </GoogleMap>

      {/* Continue Button */}
      <Box
        sx={{
          width: '100%',
          textAlign: 'right',
          paddingBottom: isMobile ? '100px' : '250px',
          marginTop: 'auto',
        }}
      >
        <Button
          variant="contained"
          sx={{
            backgroundColor: '#000',
            color: 'white',
            textTransform: 'none',
            padding: isMobile ? '12px 15px' : '14px 25px',
            fontSize: isMobile ? '14px' : '16px',
            borderRadius: '10px',
            ':hover': { backgroundColor: '#333' },
          }}
          onClick={saveLocation}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
};

export default LocationAccess;
