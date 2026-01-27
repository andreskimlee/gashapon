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

// Prediction type for the new API
interface PlacePrediction {
  placeId: string;
  text: { text: string };
  mainText: { text: string };
  secondaryText: { text: string };
  toPlace: () => google.maps.places.Place;
}

// Load Google Maps script with the new importLibrary approach
let googleScriptLoaded = false;
let googleScriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
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

    // Use the new loader approach
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.onload = () => {
      googleScriptLoaded = true;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
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
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Places (New)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn("Google Places API key not configured");
      return;
    }

    loadGoogleMapsScript(apiKey).then(async () => {
      try {
        // Import the places library using the new approach
        await google.maps.importLibrary("places");
        // Create initial session token
        const { AutocompleteSessionToken } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        sessionTokenRef.current = new AutocompleteSessionToken();
        setApiReady(true);
      } catch (error) {
        console.error("Failed to load Google Places library:", error);
      }
    });
  }, []);

  // Fetch predictions when input changes using the new API
  const fetchPredictions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 3) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    
    try {
      const { AutocompleteSuggestion } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      
      const request: google.maps.places.AutocompleteRequest = {
        input,
        includedPrimaryTypes: ["street_address", "subpremise", "premise"],
        includedRegionCodes: ["us", "ca", "gb", "au"], // Limit to common shipping countries
        sessionToken: sessionTokenRef.current || undefined,
      };

      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      
      // Map to our prediction format
      const mappedPredictions: PlacePrediction[] = suggestions
        .filter((s) => s.placePrediction)
        .map((s) => ({
          placeId: s.placePrediction!.placeId,
          text: { text: s.placePrediction!.text.toString() },
          mainText: { text: s.placePrediction!.mainText?.text || s.placePrediction!.text.toString() },
          secondaryText: { text: s.placePrediction!.secondaryText?.text || "" },
          toPlace: () => s.placePrediction!.toPlace(),
        }));

      setPredictions(mappedPredictions);
      setShowDropdown(mappedPredictions.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Autocomplete error:", error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
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

  // Handle prediction selection using the new API
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setLoading(true);
    
    try {
      const place = prediction.toPlace();
      
      // Fetch the fields we need
      await place.fetchFields({
        fields: ["addressComponents", "formattedAddress"],
      });

      const components = place.addressComponents || [];
      
      const getComponent = (types: string[]): string => {
        const component = components.find((c) =>
          types.some((t) => c.types.includes(t))
        );
        return component?.longText || "";
      };

      const getComponentShort = (types: string[]): string => {
        const component = components.find((c) =>
          types.some((t) => c.types.includes(t))
        );
        return component?.shortText || "";
      };

      // Build street address from components
      const streetNumber = getComponent(["street_number"]);
      const route = getComponent(["route"]);
      const subpremise = getComponent(["subpremise"]);

      let address = "";
      if (streetNumber && route) {
        address = `${streetNumber} ${route}`;
      } else if (route) {
        address = route;
      }
      if (subpremise) {
        address += ` ${subpremise}`;
      }

      const parsed: ParsedAddress = {
        address,
        city: getComponent(["locality", "sublocality", "postal_town"]),
        state: getComponentShort(["administrative_area_level_1"]),
        zip: getComponent(["postal_code"]),
        country: getComponentShort(["country"]),
        formattedAddress: place.formattedAddress || "",
      };

      onChange(parsed.address);
      onAddressSelect(parsed);
      setShowDropdown(false);
      setPredictions([]);

      // Create a new session token for the next session
      const { AutocompleteSessionToken } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      sessionTokenRef.current = new AutocompleteSessionToken();
    } catch (error) {
      console.error("Failed to fetch place details:", error);
    } finally {
      setLoading(false);
    }
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
              key={prediction.placeId}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? "bg-pastel-pinkLight text-pastel-text"
                  : "hover:bg-pastel-sky/30 text-pastel-text"
              }`}
            >
              <div className="font-medium">
                {prediction.mainText.text}
              </div>
              <div className="text-xs text-pastel-textLight">
                {prediction.secondaryText.text}
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
