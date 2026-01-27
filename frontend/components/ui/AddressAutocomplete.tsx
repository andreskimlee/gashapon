"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
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

// Track if options have been set
let optionsSet = false;

function initializeLoader(apiKey: string) {
  if (!optionsSet) {
    setOptions({
      key: apiKey,
      v: "weekly",
    });
    optionsSet = true;
  }
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing your address...",
  className = "",
  disabled = false,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Places using official loader
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn("Google Places API key not configured");
      return;
    }

    const initPlaces = async () => {
      try {
        initializeLoader(apiKey);
        await importLibrary("places");
        
        // Create initial session token
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        setApiReady(true);
      } catch (error) {
        console.error("Failed to load Google Places library:", error);
      }
    };

    initPlaces();
  }, []);

  // Fetch predictions using the new API
  const fetchPredictions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 3) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    
    try {
      const request: google.maps.places.AutocompleteRequest = {
        input,
        includedPrimaryTypes: ["street_address", "subpremise", "premise"],
        includedRegionCodes: ["us", "ca", "gb", "au"],
        sessionToken: sessionTokenRef.current || undefined,
      };

      const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      
      setPredictions(suggestions.filter((s) => s.placePrediction));
      setShowDropdown(suggestions.length > 0);
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

  // Handle prediction selection
  const handleSelectPrediction = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!suggestion.placePrediction) return;
    
    setLoading(true);
    
    try {
      const place = suggestion.placePrediction.toPlace();
      
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
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
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
          {predictions.map((suggestion, index) => {
            const prediction = suggestion.placePrediction;
            if (!prediction) return null;
            
            return (
              <button
                key={prediction.placeId}
                type="button"
                onClick={() => handleSelectPrediction(suggestion)}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? "bg-pastel-pinkLight text-pastel-text"
                    : "hover:bg-pastel-sky/30 text-pastel-text"
                }`}
              >
                <div className="font-medium">
                  {prediction.mainText?.text || prediction.text.toString()}
                </div>
                {prediction.secondaryText && (
                  <div className="text-xs text-pastel-textLight">
                    {prediction.secondaryText.text}
                  </div>
                )}
              </button>
            );
          })}
          <div className="px-4 py-2 text-[10px] text-pastel-textLight border-t border-pastel-pink/20 bg-pastel-sky/10">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
