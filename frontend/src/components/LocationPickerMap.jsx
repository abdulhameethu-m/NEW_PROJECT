import { useMemo, useRef, useState } from "react";
import { GoogleMap, LoadScript, MarkerF, StandaloneSearchBox } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "320px" };

export function LocationPickerMap({ apiKey, lat, lng, onChange }) {
  const center = useMemo(() => {
    const clat = Number.isFinite(lat) ? lat : 13.0827;
    const clng = Number.isFinite(lng) ? lng : 80.2707;
    return { lat: clat, lng: clng };
  }, [lat, lng]);

  const searchBoxRef = useRef(null);
  const [map, setMap] = useState(null);

  function setFromLatLng(pos) {
    onChange?.({ lat: pos.lat(), lng: pos.lng() });
  }

  function onPlacesChanged() {
    const sb = searchBoxRef.current;
    const places = sb?.getPlaces?.() || [];
    const place = places[0];
    const loc = place?.geometry?.location;
    if (!loc) return;
    if (map) map.panTo({ lat: loc.lat(), lng: loc.lng() });
    setFromLatLng(loc);
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={["places"]}>
      <div className="grid gap-3">
        <StandaloneSearchBox
          onLoad={(ref) => (searchBoxRef.current = ref)}
          onPlacesChanged={onPlacesChanged}
        >
          <input
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            placeholder="Search location (area, city, address)"
            type="text"
          />
        </StandaloneSearchBox>

        <div className="overflow-hidden rounded-xl border">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={14}
            onLoad={(m) => setMap(m)}
            onClick={(e) => {
              if (!e?.latLng) return;
              setFromLatLng(e.latLng);
            }}
            options={{
              streetViewControl: false,
              fullscreenControl: false,
              mapTypeControl: false,
            }}
          >
            <MarkerF
              position={center}
              draggable
              onDragEnd={(e) => {
                if (!e?.latLng) return;
                setFromLatLng(e.latLng);
              }}
            />
          </GoogleMap>
        </div>

        <div className="text-xs text-slate-500">
          Tip: click the map or drag the marker to set the exact location.
        </div>
      </div>
    </LoadScript>
  );
}

