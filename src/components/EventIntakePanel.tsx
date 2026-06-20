import React, { useState } from "react";
import { SingleEventInput } from "../types";
import { sampleCriticalEvent, sampleRoutineEvent, sampleGhostEvent } from "../sampleData";
import { Play, Sparkles, FileCode, CheckCircle, RefreshCw, Copy, Check } from "lucide-react";

interface EventIntakePanelProps {
  onParse: (raw: string, loc: string) => Promise<void>;
  onPredict: (data: SingleEventInput) => Promise<void>;
  isParsing: boolean;
  isPredicting: boolean;
  onSetStructuredData: (data: SingleEventInput) => void;
  structuredData: SingleEventInput;
}

export default function EventIntakePanel({
  onParse,
  onPredict,
  isParsing,
  isPredicting,
  onSetStructuredData,
  structuredData
}: EventIntakePanelProps) {
  const [rawText, setRawText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [jsonText, setJsonText] = useState(JSON.stringify(structuredData, null, 2));
  const [isManualEditActive, setIsManualEditActive] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  const performGeocoding = async (queryText: string) => {
    if (!queryText || !queryText.trim()) return;
    setIsGeocoding(true);
    setGeocodingError(null);
    try {
      const apiKey = (import.meta as any).env?.VITE_MAPTILER_API_KEY || "P9WweRtarGwCzzxvY3wP";
      const cleanQuery = queryText.toLowerCase().includes("bengaluru") || queryText.toLowerCase().includes("bangalore")
        ? queryText
        : `${queryText}, Bengaluru`;
      
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(cleanQuery)}.json?key=${apiKey}&proximity=77.5946,12.9716&bbox=77.3,12.7,77.9,13.2`;
      console.log(`[Client MapTiler Geocode] Querying: "${cleanQuery}"`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API returned status ${res.status}`);
      }
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        const bestFeature = data.features[0];
        const coords = bestFeature.center || (bestFeature.geometry && bestFeature.geometry.coordinates);
        if (coords && coords.length >= 2) {
          const lng = coords[0];
          const lat = coords[1];
          const updated = {
            ...structuredData,
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6)),
            maptiler_geocoded: true,
            maptiler_geocoded_query: queryText
          };
          onSetStructuredData(updated);
          console.log(`[Client MapTiler Geocode] Updated coordinates: Lat ${lat}, Lng ${lng} for "${queryText}"`);
        } else {
          setGeocodingError("Coordinates not resolved from feature center.");
        }
      } else {
        setGeocodingError("Landmark not found inside Bengaluru.");
      }
    } catch (err: any) {
      console.error("[Geocoding Error]", err);
      setGeocodingError(err?.message || "Failed to resolve coordinates.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCopyInput = () => {
    navigator.clipboard.writeText(JSON.stringify(structuredData, null, 2));
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  // Synchronize local JSON text when structuredData updates
  React.useEffect(() => {
    setJsonText(JSON.stringify(structuredData, null, 2));
  }, [structuredData]);

  const loadSample = (type: "critical" | "routine" | "ghost") => {
    let sample: SingleEventInput;
    if (type === "critical") {
      sample = sampleCriticalEvent;
      setRawText(sampleCriticalEvent.description);
      setLocationText(`${sampleCriticalEvent.junction}, ${sampleCriticalEvent.corridor}`);
    } else if (type === "routine") {
      sample = sampleRoutineEvent;
      setRawText(sampleRoutineEvent.description);
      setLocationText(`${sampleRoutineEvent.junction}, ${sampleRoutineEvent.corridor}`);
    } else {
      sample = sampleGhostEvent;
      setRawText(sampleGhostEvent.description || "Unconfirmed alert report");
      setLocationText(sampleGhostEvent.corridor);
    }
    onSetStructuredData(sample);
  };

  const handleFieldChange = (key: keyof SingleEventInput, val: any) => {
    const updated = {
      ...structuredData,
      [key]: val
    };
    onSetStructuredData(updated);
  };

  const handleJsonSubmit = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onSetStructuredData(parsed);
      setIsManualEditActive(false);
    } catch (e: any) {
      alert("Invalid JSON format. Please repair schema syntax: " + e.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Raw intake step */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 font-display">
            1. Raw Incident Description
          </h3>
          <span className="text-[10px] bg-zinc-850 text-zinc-400 px-2 py-0.5 rounded font-mono">
            Command Intake
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Messy Operational Feed description
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. Multi-axle truck overturned at Tumkur Road blocking lanes, huge backup forming at Peenya..."
              className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center justify-between">
              <span>Location Landmark / Intersection</span>
              {isGeocoding && (
                <span className="text-[10px] text-blue-400 font-mono flex items-center gap-1 animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> resolving...
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                onBlur={() => performGeocoding(locationText)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    performGeocoding(locationText);
                  }
                }}
                placeholder="e.g. Majestic bus stand, Peenya Jalahalli Cross corner"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => performGeocoding(locationText)}
                disabled={isGeocoding || !locationText.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-slate-100 disabled:border-zinc-800 text-[11px] font-mono font-bold px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border border-blue-700/50"
                title="Geocode using MapTiler Geocoding API"
              >
                {isGeocoding ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-950" />
                ) : (
                  <Sparkles className="w-3 h-3 text-slate-950" />
                )}
                <span className="text-slate-950">Geocode</span>
              </button>
            </div>
            {geocodingError && (
              <p className="text-[10px] text-red-400 font-mono mt-1 flex items-center gap-1 animate-fade-in">
                ⚠️ {geocodingError}
              </p>
            )}
            {!geocodingError && structuredData.maptiler_geocoded && (
              <p className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1.5 animate-fade-in bg-emerald-950/20 border border-emerald-900/30 rounded py-1 px-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span>
                  Exact lock: <strong className="text-zinc-100">Lat {structuredData.latitude.toFixed(4)}, Lng {structuredData.longitude.toFixed(4)}</strong> for "{structuredData.maptiler_geocoded_query}"
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => onParse(rawText, locationText)}
            disabled={isParsing || !rawText.trim()}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-805 disabled:bg-zinc-800 disabled:text-zinc-500 text-slate-950 font-bold text-xs py-2.5 px-3 rounded-lg transition-colors cursor-pointer"
          >
            {isParsing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Parse with Gemini
          </button>
        </div>

        <div className="border-t border-zinc-800/80 pt-4 space-y-2">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Inject Command Presets
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => loadSample("critical")}
              className="bg-red-950/40 hover:bg-red-950/70 border border-red-900/50 text-red-400 text-[10px] font-bold py-1.5 px-2 rounded transition-all cursor-pointer"
            >
              Preset: Critical
            </button>
            <button
              onClick={() => loadSample("routine")}
              className="bg-yellow-950/40 hover:bg-yellow-950/70 border border-yellow-900/50 text-yellow-500 text-[10px] font-bold py-1.5 px-2 rounded transition-all cursor-pointer"
            >
              Preset: Routine
            </button>
            <button
              onClick={() => loadSample("ghost")}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold py-1.5 px-2 rounded transition-all cursor-pointer"
            >
              Preset: Weak Data
            </button>
          </div>
        </div>
      </div>

      {/* Structured parsing & override step */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-400 font-display">
            2. Structured Event Input Params
          </h3>
          <button
            onClick={() => setIsManualEditActive(!isManualEditActive)}
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" />
            {isManualEditActive ? "Form Entry" : "Raw JSON Editor"}
          </button>
        </div>

        {isManualEditActive ? (
          <div className="flex-1 flex flex-col space-y-3">
            <label className="text-[11px] text-zinc-400 font-mono">
              Raw ML Model Input Specifier JSON:
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[220px]"
            />
            <button
              onClick={handleJsonSubmit}
              className="bg-orange-600 hover:bg-orange-500 text-black font-bold text-xs py-1.5 px-3 rounded self-end transition-all cursor-pointer"
            >
              Apply JSON Changes
            </button>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto max-h-[350px] pr-1">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Event ID</label>
              <input
                type="text"
                value={structuredData.event_id}
                onChange={(e) => handleFieldChange("event_id", e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Type</label>
              <select
                value={structuredData.event_type}
                onChange={(e) => handleFieldChange("event_type", e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              >
                <option value="unplanned">Unplanned</option>
                <option value="planned">Planned</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Event Cause</label>
              <input
                type="text"
                value={structuredData.event_cause}
                onChange={(e) => handleFieldChange("event_cause", e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Primary Corridor</label>
              <input
                type="text"
                value={structuredData.corridor}
                onChange={(e) => handleFieldChange("corridor", e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={structuredData.latitude}
                onChange={(e) => handleFieldChange("latitude", parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={structuredData.longitude}
                onChange={(e) => handleFieldChange("longitude", parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            {structuredData.maptiler_geocoded && (
              <div className="col-span-2 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 rounded-lg p-2.5 flex items-center gap-2 text-[11px] font-mono">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Map Coordinated via MapTiler geocoder for <strong className="text-zinc-100">"{structuredData.maptiler_geocoded_query}"</strong>
                </span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Zone</label>
              <input
                type="text"
                value={structuredData.zone}
                onChange={(e) => handleFieldChange("zone", e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Intersection/Junction</label>
              <input
                type="text"
                value={structuredData.junction}
                onChange={(e) => handleFieldChange("junction", e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Police Sector</label>
              <input
                type="text"
                value={structuredData.police_station}
                onChange={(e) => handleFieldChange("police_station", e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Vehicle Category</label>
              <input
                type="text"
                value={structuredData.veh_type}
                onChange={(e) => handleFieldChange("veh_type", e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Direction</label>
              <input
                type="text"
                value={structuredData.direction}
                onChange={(e) => handleFieldChange("direction", e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-mono">Age of Truck (years)</label>
              <input
                type="number"
                value={structuredData.age_of_truck}
                onChange={(e) => handleFieldChange("age_of_truck", parseInt(e.target.value) || -1)}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded p-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-2 justify-between items-center bg-zinc-900/20 px-1 font-sans">
          <button
            type="button"
            onClick={handleCopyInput}
            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold py-2 px-3 rounded-lg cursor-pointer transition-colors border border-zinc-700/60"
            title="Copy structured input JSON for your offline notebook model"
          >
            {copiedInput ? <Check className="w-3.5 h-3.5 text-green-400 font-bold" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedInput ? "Copied Input JSON" : "Copy for Local Model"}
          </button>
          <button
            onClick={() => onPredict(structuredData)}
            disabled={isPredicting}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-colors"
          >
            {isPredicting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run Prediction Machine
          </button>
        </div>
      </div>
    </div>
  );
}
