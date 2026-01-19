"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ParsedAddress {
  address: string; // Street address (e.g., "123 Main St Apt 4")
  city: string;
  state: string;
  zip: string;
  country: string;
  formattedAddress: string; // Full formatted address from Google
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: ParsedAddress) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Google Places API types
interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceDetails {
  address_components: AddressComponent[];
  formatted_address: string;
}

// Load Google Places script
let googleScriptLoaded = false;
let googleScriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (googleScriptLoaded) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (googleScriptLoading) {
      return;
    }

    googleScriptLoading = true;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      googleScriptLoaded = true;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

// Parse Google place result into structured address
function parseGooglePlace(place: PlaceDetails): ParsedAddress {
  const components = place.address_components;

  const getComponent = (types: string[]): string => {
    const component = components.find((c) =>
      types.some((t) => c.types.includes(t))
    );
    return component?.long_name || "";
  };

  const getComponentShort = (types: string[]): string => {
    const component = components.find((c) =>
      types.some((t) => c.types.includes(t))
    );
    return component?.short_name || "";
  };

  // Build street address from components
  const streetNumber = getComponent(["street_number"]);
  const route = getComponent(["route"]);
  const subpremise = getComponent(["subpremise"]); // Apt, Suite, etc.

  let address = "";
  if (streetNumber && route) {
    address = `${streetNumber} ${route}`;
  } else if (route) {
    address = route;
  }
  if (subpremise) {
    address += ` ${subpremise}`;
  }

  return {
    address,
    city: getComponent(["locality", "sublocality", "postal_town"]),
    state: getComponentShort(["administrative_area_level_1"]),
    zip: getComponent(["postal_code"]),
    country: getComponentShort(["country"]),
    formattedAddress: place.formatted_address,
  };
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing your address...",
  className = "",
  disabled = false,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Places
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn("Google Places API key not configured");
      return;
    }

    loadGooglePlacesScript(apiKey).then(() => {
      autocompleteService.current =
        new google.maps.places.AutocompleteService();
      // PlacesService requires a map or div element
      const dummyDiv = document.createElement("div");
      placesService.current = new google.maps.places.PlacesService(dummyDiv);
      setApiReady(true);
    });
  }, []);

  // Fetch predictions when input changes
  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteService.current || !input.trim() || input.length < 3) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    autocompleteService.current.getPlacePredictions(
      {
        input,
        types: ["address"],
        componentRestrictions: { country: ["us", "ca", "gb", "au"] }, // Limit to common shipping countries
      },
      (results, status) => {
        setLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results as unknown as PlacePrediction[]);
          setShowDropdown(true);
          setSelectedIndex(-1);
        } else {
          setPredictions([]);
        }
      }
    );
  }, []);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  };

  // Handle prediction selection
  const handleSelectPrediction = (prediction: PlacePrediction) => {
    if (!placesService.current) return;

    setLoading(true);
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["address_components", "formatted_address"],
      },
      (place, status) => {
        setLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const parsed = parseGooglePlace(place as unknown as PlaceDetails);
          onChange(parsed.address);
          onAddressSelect(parsed);
          setShowDropdown(false);
          setPredictions([]);
        }
      }
    );
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelectPrediction(predictions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fallback for when API is not available
  if (!apiReady) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-pastel-coral border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Predictions dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border-2 border-pastel-pink/30 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? "bg-pastel-pinkLight text-pastel-text"
                  : "hover:bg-pastel-sky/30 text-pastel-text"
              }`}
            >
              <div className="font-medium">
                {prediction.structured_formatting.main_text}
              </div>
              <div className="text-xs text-pastel-textLight">
                {prediction.structured_formatting.secondary_text}
              </div>
            </button>
          ))}
          <div className="px-4 py-2 text-[10px] text-pastel-textLight border-t border-pastel-pink/20 bg-pastel-sky/10">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
