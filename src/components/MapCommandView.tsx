import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { PoliceStation, PredictionData } from "../types";

// Pre-defined high-fidelity geographical polylines representing Bengaluru's key traffic corridors
const CORRIDOR_POLYLINES: Record<string, L.LatLngTuple[]> = {
  "Tumkur Road": [
    [13.0294, 77.5358], // Gorguntepalya
    [13.0331, 77.5190], // Peenya Metro
    [13.0402, 77.5165], // Jalahalli Cross
    [13.0441, 77.5133], // T Dasarahalli Metro
    [13.0483, 77.5050]  // 8th Mile Junction
  ],
  "Outer Ring Road": [
    [13.0358, 77.5978], // Hebbal Flyover
    [13.0353, 77.6189], // Nagawara Underpass
    [13.0345, 77.6258], // Veerannapalya
    [13.0245, 77.6415], // Hennur Junction
    [13.0180, 77.6475], // Kalyan Nagar
    [13.0118, 77.6508], // Banaswadi Underpass
    [13.0125, 77.6740], // Ramamurthy Nagar Bridge
    [13.0035, 77.6830], // Kasturi Nagar Junction
    [13.0078, 77.6952]  // KR Puram Hanging Bridge
  ],
  "Hosur Road": [
    [12.9172, 77.6225], // Silk Board
    [12.9028, 77.6231], // Bommanahalli Junction
    [12.8965, 77.6265], // Garvebhavipalya
    [12.8898, 77.6318], // Kudlu Gate
    [12.8792, 77.6405], // Singasandra
    [12.8682, 77.6521], // Hosa Road Junction
    [12.8482, 77.6801]  // Electronic City Toll Entry
  ],
  "Hosur Elevated Express": [
    [12.9172, 77.6225], // Silk Board CSB Flyover
    [12.9028, 77.6231], // Bommanahalli Elevated
    [12.8965, 77.6265], // Garvebhavipalya
    [12.8898, 77.6318], // Kudlu Gate Elevated
    [12.8792, 77.6405], // Singasandra Elevated
    [12.8682, 77.6521], // Hosa Road Elevated
    [12.8482, 77.6801]  // Electronic City Toll Exit
  ],
  "Koramangala Corridor": [
    [12.9340, 77.6245], // Sony World Signal Post
    [12.9318, 77.6185], // Koramangala Water Tank / 5th Block
    [12.9348, 77.6119], // Koramangala Forum Mall
    [12.9332, 77.6105]  // Koramangala Police Station Junction
  ],
  "ITPL Road": [
    [13.0078, 77.6952], // KR Puram Hanging Bridge
    [12.9925, 77.6948], // Mahadevapura
    [12.9950, 77.6965], // Decathlon/Phoenix Marketcity
    [12.9891, 77.7125], // Hoodi Junction
    [12.9782, 77.7185], // Graphite India Junction
    [12.9775, 77.7285], // ITPL Main Entrance
    [12.9692, 77.7501]  // Whitefield Main Circle
  ]
};

const getCorridorPolyline = (corridorName?: string): L.LatLngTuple[] | null => {
  if (!corridorName) return null;
  const normalized = corridorName.trim().toLowerCase();
  for (const [key, value] of Object.entries(CORRIDOR_POLYLINES)) {
    if (key.toLowerCase() === normalized) {
      return value;
    }
  }
  return null;
};

const getEventCorridorPath = (
  lat: number,
  lng: number,
  corridorName: string,
  endLat?: number,
  endLng?: number
): L.LatLngTuple[] => {
  // If we have a matching high-fidelity pre-defined corridor, use it
  const predefined = getCorridorPolyline(corridorName);
  if (predefined && predefined.length > 0) {
    return predefined;
  }

  // If we have a valid destination coordinate provided, draw a path from start to destination with a slight bend
  if (endLat && endLng && !isNaN(endLat) && !isNaN(endLng) && endLat !== 0 && endLng !== 0 && (lat !== endLat || lng !== endLng)) {
    const midLat = (lat + endLat) / 2 + 0.001;
    const midLng = (lng + endLng) / 2 - 0.001;
    return [
      [lat, lng],
      [midLat, midLng],
      [endLat, endLng]
    ];
  }

  // Fallback: Generate a localized road-segment vector based on named corridors or default flow direction
  const cleanName = (corridorName || "").toLowerCase();
  let deltaLat = 0.003;
  let deltaLng = 0.003;

  if (cleanName.includes("outer ring") || cleanName.includes("orr")) {
    deltaLat = -0.004;
    deltaLng = 0.004;
  } else if (cleanName.includes("tumkur") || cleanName.includes("peenya")) {
    deltaLat = 0.005;
    deltaLng = -0.002;
  } else if (cleanName.includes("hosur") || cleanName.includes("silk board")) {
    deltaLat = -0.005;
    deltaLng = 0.002;
  } else if (cleanName.includes("whitefield") || cleanName.includes("itpl")) {
    deltaLat = 0.001;
    deltaLng = 0.005;
  } else if (cleanName.includes("majestic") || cleanName.includes("kg road") || cleanName.includes("anand rao")) {
    deltaLat = 0.003;
    deltaLng = -0.003;
  }

  return [
    [lat, lng],
    [lat + deltaLat * 0.45, lng + deltaLng * 0.45],
    [lat + deltaLat, lng + deltaLng]
  ];
};

interface MapCommandViewProps {
  activeEvent: PredictionData | null;
  batchEvents: PredictionData[];
  policeStations: PoliceStation[];
  mapTilerKey: string;
  selectedStationId?: string;
  onSelectStation?: (stationId: string) => void;
  layers: {
    activeEvent: boolean;
    policeStations: boolean;
    hotspots: boolean;
    criticalEvents: boolean;
    suggestedRadius: boolean;
  };
}

export default function MapCommandView({
  activeEvent,
  batchEvents,
  policeStations,
  mapTilerKey,
  selectedStationId,
  onSelectStation,
  layers
}: MapCommandViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  // Clear existing marker logic & re-init on change
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Coordinate center of Bengaluru
      const defaultLat = 12.9716;
      const defaultLng = 77.5946;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 12,
        zoomControl: true,
        attributionControl: false
      });

      // Show map in highly detailed and beautifully legible Standard OpenStreetMap Light Theme
      const lightOsmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      
      L.tileLayer(lightOsmUrl, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
      markerGroupRef.current = L.layerGroup().addTo(map);
    }
  }, [mapTilerKey]);

  // Handle marker plotting based on options & state
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    // Clean previous markers
    markerGroup.clearLayers();

    const bounds: L.LatLngTuple[] = [];

    // 1. Plot Active Event if valid & enabled
    if (layers.activeEvent && activeEvent) {
      const lat = Number(activeEvent.event_context?.latitude || (activeEvent as any).latitude || activeEvent.system_trace?.latitude || 12.9716);
      const lng = Number(activeEvent.event_context?.longitude || (activeEvent as any).longitude || activeEvent.system_trace?.longitude || 77.5946);
      const risk = (activeEvent.impact_predictions?.impact_risk || "medium").toLowerCase();
      
      const color = risk === "critical" ? "#ef4444" : risk === "high" ? "#f97316" : risk === "medium" ? "#eab308" : "#22c55e";

      if (!isNaN(lat) && !isNaN(lng)) {
        bounds.push([lat, lng]);

        // Draw animated/pulsing hotspot circle if critical/high and option active
        if (layers.hotspots && (risk === "critical" || risk === "high")) {
          const hotspotCircle = L.circle([lat, lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.12,
            radius: 800, // 800m core spot
            weight: 1
          });
          hotspotCircle.addTo(markerGroup);
        }

        // Draw physical closed-road polyline if closure is recommended
        const activeClosureRecommended = activeEvent.impact_predictions?.closure_recommended === true || 
                                         (activeEvent.impact_predictions?.requires_road_closure_prob && activeEvent.impact_predictions.requires_road_closure_prob > 0.4);
        
        if (activeClosureRecommended) {
          const corridorName = activeEvent.event_context?.corridor || activeEvent.event_context?.affected_corridor || "";
          let polylinePoints = getCorridorPolyline(corridorName);

          if (!polylinePoints && lat && lng) {
            // Draw a realistic local lane closure segment centered on the incident marker
            polylinePoints = [
              [lat - 0.0018, lng - 0.001],
              [lat, lng],
              [lat + 0.0018, lng + 0.001]
            ];
          }

          if (polylinePoints && polylinePoints.length > 0) {
            // High contrast outline to make it pop on dark theme
            L.polyline(polylinePoints, {
              color: "#020617",
              weight: 8,
              opacity: 0.9
            }).addTo(markerGroup);

            // Bright crimson flashing dashed physical route
            const routeLine = L.polyline(polylinePoints, {
              color: "#ef4444",
              weight: 4,
              opacity: 1.0,
              dashArray: "10, 10"
            }).addTo(markerGroup);

            // Bind clear persistent tooltip for road closure
            routeLine.bindTooltip(`🚫 ROAD CLOSED: ${corridorName || "Active Lane Segment"}`, {
              permanent: true,
              direction: "center",
              className: "border-0 shadow-lg text-red-400 font-extrabold bg-slate-950/95 border border-red-500/50 px-2 py-1 rounded text-[10px] font-mono animate-pulse tracking-wide"
            });

            // Put tactical physical barriers at the start and end of the closed segment
            if (polylinePoints.length >= 2) {
              const startPoint = polylinePoints[0];
              const endPoint = polylinePoints[polylinePoints.length - 1];

              const barrierHtml = `
                <div class="bg-amber-500 border-2 border-red-600 text-slate-950 font-black px-1.5 py-0.5 rounded text-[9px] font-mono shadow-md animate-bounce whitespace-nowrap uppercase tracking-wider leading-none">
                  🚧 BLOCK
                </div>
              `;
              const barrierIcon = L.divIcon({
                html: barrierHtml,
                className: "custom-barrier-marker",
                iconSize: [48, 16],
                iconAnchor: [24, 8]
              });

              L.marker(startPoint, { icon: barrierIcon }).addTo(markerGroup);
              L.marker(endPoint, { icon: barrierIcon }).addTo(markerGroup);
            }

            // Include closed road coordinates in viewport bounds
            polylinePoints.forEach(pt => bounds.push(pt));
          }
        }

        // Suggested deployment radius
        if (layers.suggestedRadius) {
          const suggestionCircle = L.circle([lat, lng], {
            color: "#60a5fa",
            fillColor: "#3b82f6",
            fillOpacity: 0.03,
            radius: 2500, // 2.5km dispatch radius
            weight: 1.5,
            dashArray: "4, 6"
          });
          suggestionCircle.addTo(markerGroup);
        }

        const corridorName = activeEvent.event_context?.corridor || activeEvent.event_context?.affected_corridor || "";
        const endLat = activeEvent.event_context?.endlatitude || (activeEvent as any).endlatitude;
        const endLng = activeEvent.event_context?.endlongitude || (activeEvent as any).endlongitude;
        const pathPoints = getEventCorridorPath(lat, lng, corridorName, endLat, endLng);

        const popupContent = `
          <div class="text-xs space-y-1.5 leading-relaxed overflow-hidden py-1 text-slate-900 font-sans">
            <div class="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
              <span class="font-bold text-slate-900 text-sm tracking-wide uppercase">${activeEvent.event_id}</span>
              <span class="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded uppercase text-white" style="background-color: ${color}">${risk}</span>
            </div>
            <p class="text-slate-800 font-medium"><strong class="text-slate-500 font-semibold">Cause:</strong> ${activeEvent.event_context?.raw_cause?.toUpperCase() || "UNKNOWN"}</p>
            <p class="text-slate-800 font-medium"><strong class="text-slate-500 font-semibold">Location:</strong> ${activeEvent.event_context?.junction || "N/A"} (${corridorName || "N/A"})</p>
            <p class="text-slate-700"><strong class="text-slate-500 font-semibold">Est. Clearance:</strong> ${activeEvent.impact_predictions?.predicted_clearance_minutes || 0} mins</p>
            <p class="text-slate-700"><strong class="text-slate-500 font-semibold">Manpower Rec:</strong> ${activeEvent.operational_recommendations?.recommended_officers || 0} officers</p>
            <p class="text-slate-700"><strong class="text-slate-500 font-semibold">Barricades:</strong> ${activeEvent.operational_recommendations?.barricading_detail || "N/A"}</p>
            <p class="text-slate-700"><strong class="text-slate-500 font-semibold">Diversions:</strong> ${activeEvent.operational_recommendations?.diversion_recommendation || "N/A"}</p>
            ${activeClosureRecommended ? '<p class="text-red-600 font-bold border-t border-slate-200 pt-1 mt-1 flex items-center gap-1">⚠️ HARD ROAD CLOSURE RECOMMENDED</p>' : ''}
          </div>
        `;

        // 1. Double layer high-craft Polyline representation representing exact affected road segment
        L.polyline(pathPoints, {
          color: color,
          weight: 12,
          opacity: 0.35
        }).addTo(markerGroup);

        const mainPolyline = L.polyline(pathPoints, {
          color: color,
          weight: 5,
          opacity: 0.95,
          dashArray: risk === "critical" || risk === "high" ? "8, 8" : undefined
        }).addTo(markerGroup);

        // Bind interactive popups and tooltip on the Polyline
        mainPolyline.bindPopup(popupContent).openPopup();
        
        mainPolyline.bindTooltip(`⚠️ ACTIVE CORRIDOR: ${corridorName || "Lane segment"} (${risk.toUpperCase()})`, {
          sticky: true,
          className: "text-[10px] font-mono bg-slate-950/95 text-slate-100 border border-slate-700/50 px-2 py-0.5 rounded leading-none shadow-md font-bold"
        });

        // Add coordinate endpoints of the corridor to bounds so map frames them too
        pathPoints.forEach(pt => bounds.push(pt));
      }
    }

    // 2. Plot Batch Events if active & enabled
    if (layers.criticalEvents && batchEvents && batchEvents.length > 0) {
      batchEvents.forEach(ev => {
        // Skip default active if already plotted with activeEvent
        if (activeEvent && ev.event_id === activeEvent.event_id && layers.activeEvent) return;

        const lat = Number(ev.event_context?.latitude || (ev as any).latitude || ev.system_trace?.latitude || 12.9716);
        const lng = Number(ev.event_context?.longitude || (ev as any).longitude || ev.system_trace?.longitude || 77.5946);
        const risk = (ev.impact_predictions?.impact_risk || "medium").toLowerCase();
        const color = risk === "critical" ? "#ef4444" : risk === "high" ? "#f97316" : risk === "medium" ? "#eab308" : "#22c55e";

        if (!isNaN(lat) && !isNaN(lng)) {
          bounds.push([lat, lng]);

          if (layers.hotspots && (risk === "critical" || risk === "high")) {
            L.circle([lat, lng], {
              color: color,
              fillColor: color,
              fillOpacity: 0.08,
              radius: 600,
              weight: 0.5
            }).addTo(markerGroup);
          }

          // Check road closure for batch items
          const batchClosureRecommended = ev.impact_predictions?.closure_recommended === true || 
                                           (ev.impact_predictions?.requires_road_closure_prob && ev.impact_predictions.requires_road_closure_prob > 0.4);

          if (batchClosureRecommended) {
            const corridorName = ev.event_context?.corridor || ev.event_context?.affected_corridor || "";
            let polylinePoints = getCorridorPolyline(corridorName);

            if (!polylinePoints && lat && lng) {
              polylinePoints = [
                [lat - 0.0018, lng - 0.001],
                [lat, lng],
                [lat + 0.0018, lng + 0.001]
              ];
            }

            if (polylinePoints && polylinePoints.length > 0) {
              // High contrast outline
              L.polyline(polylinePoints, {
                color: "#ffffff",
                weight: 8,
                opacity: 0.95
              }).addTo(markerGroup);

              // Orange-red dashed closure line
              L.polyline(polylinePoints, {
                color: "#e11d48",
                weight: 4,
                opacity: 0.95,
                dashArray: "8, 8"
              }).addTo(markerGroup);

              if (polylinePoints.length >= 2) {
                const startPoint = polylinePoints[0];
                const endPoint = polylinePoints[polylinePoints.length - 1];

                const barrierHtml = `
                  <div class="bg-amber-500 border border-red-700 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[8px] font-mono shadow-sm scale-90 whitespace-nowrap">
                    🚧 CLOSED
                  </div>
                `;
                const barrierIcon = L.divIcon({
                  html: barrierHtml,
                  className: "custom-barrier-marker-small",
                  iconSize: [40, 14],
                  iconAnchor: [20, 7]
                });

                L.marker(startPoint, { icon: barrierIcon }).addTo(markerGroup);
                L.marker(endPoint, { icon: barrierIcon }).addTo(markerGroup);
              }

              polylinePoints.forEach(pt => bounds.push(pt));
            }
          }

          // Draw the Polyline path for batch events
          const batchCorridorName = ev.event_context?.corridor || ev.event_context?.affected_corridor || "";
          const batchEndLat = ev.event_context?.endlatitude || (ev as any).endlatitude;
          const batchEndLng = ev.event_context?.endlongitude || (ev as any).endlongitude;
          const batchPathPoints = getEventCorridorPath(lat, lng, batchCorridorName, batchEndLat, batchEndLng);

          const popupContent = `
            <div class="text-xs space-y-1 leading-relaxed text-slate-900 font-sans">
              <div class="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span class="font-bold text-slate-900 uppercase">${ev.event_id}</span>
                <span class="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase text-white" style="background-color: ${color}">${risk}</span>
              </div>
              <p class="text-slate-800 font-medium"><strong class="text-slate-500 font-semibold">Cause:</strong> ${ev.event_context?.raw_cause?.toUpperCase() || 'UNKNOWN'}</p>
              <p class="text-slate-800"><strong class="text-slate-500 font-semibold">Sector:</strong> ${ev.event_context?.junction || 'unknown'}</p>
              <p class="text-slate-700"><strong class="text-slate-500 font-semibold">Risk Score:</strong> ${ev.impact_predictions?.final_impact_score || 0}/10</p>
              <p class="text-slate-700"><strong class="text-slate-500 font-semibold">Clearance:</strong> ${ev.impact_predictions?.predicted_clearance_minutes || 0}m</p>
              ${batchClosureRecommended ? '<p class="text-red-600 font-bold text-[9px] uppercase tracking-wider animate-pulse pt-0.5">⚠️ ROUTE BLOCKED</p>' : ''}
            </div>
          `;

          L.polyline(batchPathPoints, {
            color: color,
            weight: 9,
            opacity: 0.25
          }).addTo(markerGroup);

          const batchMainPolyline = L.polyline(batchPathPoints, {
            color: color,
            weight: 4,
            opacity: 0.85,
            dashArray: "6, 6"
          }).addTo(markerGroup);

          batchMainPolyline.bindPopup(popupContent);
          batchMainPolyline.bindTooltip(`⚠️ BATCH INCIDENT: ${ev.event_id} (${risk.toUpperCase()})`, {
            sticky: true,
            className: "text-[10px] font-mono bg-slate-900 text-slate-100 border border-slate-700 px-1.5 py-0.5 rounded leading-none shadow-md"
          });

          batchPathPoints.forEach(pt => bounds.push(pt));
        }
      });
    }

    // 3. Plot Police Stations if enabled
    if (layers.policeStations && policeStations && policeStations.length > 0) {
      policeStations.forEach(st => {
        const isSelected = selectedStationId === st.station_id;

        const stationSvg = `
          <div class="relative flex items-center justify-center">
            <div class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white border border-white">
              ${st.available_units}
            </div>
            <div class="flex h-7 w-7 items-center justify-center rounded-md border-2 ${
              isSelected ? "border-amber-500 bg-amber-50 text-amber-700 scale-110 shadow-md font-bold" : "border-blue-600 bg-white text-blue-600 shadow-sm"
            } transition-all duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>
        `;

        const stationIcon = L.divIcon({
          html: stationSvg,
          className: "custom-station-icon",
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const popupContent = `
          <div class="text-xs space-y-1 text-slate-900 font-sans">
            <h4 class="font-bold text-slate-900 text-sm border-b border-slate-200 pb-0.5">${st.station_name}</h4>
            <p class="text-slate-800"><strong class="text-slate-500 font-semibold">Zone:</strong> ${st.zone}</p>
            <p class="text-slate-800"><strong class="text-slate-500 font-semibold">Units Available:</strong> <span class="font-bold text-green-600">${st.available_units}</span> / ${st.total_units} total</p>
            <p class="text-slate-800"><strong class="text-slate-500 font-semibold">Traffic Staff:</strong> ${st.traffic_personnel_available}</p>
            <p class="text-slate-700"><strong class="text-slate-500 font-semibold">Capabilities:</strong> ${st.special_capabilities.map(c => c.replace('_', ' ')).join(', ')}</p>
          </div>
        `;

        const marker = L.marker([st.latitude, st.longitude], { icon: stationIcon })
          .addTo(markerGroup)
          .bindPopup(popupContent);

        marker.on('click', () => {
          if (onSelectStation) {
            onSelectStation(st.station_id);
          }
        });
      });
    }

    // Adjust map viewport to frame everything plotted automatically
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [activeEvent, batchEvents, policeStations, layers, selectedStationId]);

  return (
    <div className="relative w-full h-[380px] bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-xl">
      <div id="map-canvas" ref={mapContainerRef} className="w-full h-full z-10" />
      <div className="absolute bottom-3 left-3 z-30 bg-white/95 border border-slate-200 px-3 py-2 rounded-md shadow-lg text-[11px] font-mono grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
          <span className="text-slate-800 font-medium">Critical Congestion</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
          <span className="text-slate-800 font-medium">High Impact</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
          <span className="text-slate-800 font-medium">Medium Squeeze</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
          <span className="text-slate-800 font-medium">Routine / Low Risk</span>
        </div>
      </div>
    </div>
  );
}
