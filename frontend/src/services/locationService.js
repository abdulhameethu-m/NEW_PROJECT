function formatAddressParts(parts) {
  const city = parts?.city || parts?.town || parts?.village || parts?.suburb || parts?.county || "";
  const state = parts?.state || parts?.region || "";
  const country = parts?.country || "India";
  return [city, state, country].filter(Boolean).join(", ");
}

export function getCurrentPosition(options = {}) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error("geolocation_unsupported"));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
      ...options,
    });
  });
}

export async function reverseGeocodeCoordinates({ latitude, longitude }) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("reverse_geocode_failed");
  }

  const data = await response.json();

  return {
    formattedLabel: formatAddressParts(data?.address),
    address: {
      addressLine: [data?.address?.road, data?.address?.neighbourhood, data?.address?.suburb]
        .filter(Boolean)
        .join(", "),
      city: data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.county || "",
      state: data?.address?.state || data?.address?.region || "",
      pincode: data?.address?.postcode || "",
      country: data?.address?.country || "India",
      latitude,
      longitude,
    },
    raw: data,
  };
}

export async function getCurrentLocationAddress() {
  const position = await getCurrentPosition();
  return reverseGeocodeCoordinates({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
}
