import React, { useState, useEffect } from "react";
import { 
  SingleEventInput, 
  PredictionData, 
  PoliceStation, 
  DispatchRecommendation,
  PostEventFeedback 
} from "./types";
import EventIntakePanel from "./components/EventIntakePanel";
import ImpactDashboardPanel from "./components/ImpactDashboardPanel";
import MapCommandView from "./components/MapCommandView";
import PoliceDeploymentPanel from "./components/PoliceDeploymentPanel";
import CriticalEventsPanel from "./components/CriticalEventsPanel";
import BatchPredictionPanel from "./components/BatchPredictionPanel";
import CommandJsonPanel from "./components/CommandJsonPanel";
import PostEventLearningPanel from "./components/PostEventLearningPanel";

import { 
  ShieldAlert, 
  Activity, 
  Server, 
  Cpu, 
  Smartphone, 
  Layers, 
  AlertTriangle, 
  CheckCircle,
  Clock, 
  FileCode, 
  Map, 
  Send,
  Database,
  Sliders,
  Sparkles,
  Info
} from "lucide-react";

export default function App() {
  // Sidebar tab selector state
  const [activeTab, setActiveTab] = useState<
    "intake" | "dashboard" | "map" | "deployment" | "roster" | "batch" | "command_json" | "post_event"
  >("intake");

  // Core state storage matching requirements
  const [structuredData, setStructuredData] = useState<SingleEventInput>({
    event_id: "EV_INIT_881",
    event_type: "unplanned",
    event_cause: "vehicle_breakdown",
    latitude: 12.9716,
    longitude: 77.5946,
    endlatitude: 0.0,
    endlongitude: 0.0,
    corridor: "non_corridor",
    police_station: "unknown",
    zone: "unknown",
    junction: "unknown",
    veh_type: "unknown",
    authenticated: "yes",
    direction: "unknown",
    age_of_truck: -1,
    start_datetime: new Date().toISOString(),
    description: "Please enter or load an incident to start"
  });

  // Current calculated prediction response matching real schemas
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  
  // List of current compile multiple predictions (includes both loaded and batch cases)
  const [batchResults, setBatchResults] = useState<PredictionData[]>([]);

  // List of static responder stations
  const [policeStations, setPoliceStations] = useState<PoliceStation[]>([]);

  // Sorted nearby deployment scoring results
  const [dispatchRecommendations, setDispatchRecommendations] = useState<DispatchRecommendation[]>([]);
  const [recommendedMessage, setRecommendedMessage] = useState("");

  // Captured ground feedback loops list saved inside local state
  const [savedFeedback, setSavedFeedback] = useState<PostEventFeedback[]>([]);

  // Config parameters & health tracking
  const [mapTilerKey, setMapTilerKey] = useState("");
  const [isApiConnecting, setIsApiConnecting] = useState(false);
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [isPredictionMachineOffline, setIsPredictionMachineOffline] = useState(false);

  // Status flags
  const [isParsing, setIsParsing] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);

  // Map Filter Options
  const [mapLayers, setMapLayers] = useState({
    activeEvent: true,
    policeStations: true,
    hotspots: true,
    criticalEvents: true,
    suggestedRadius: true
  });

  const [selectedStationId, setSelectedStationId] = useState<string | undefined>(undefined);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

    const API_BASE = import.meta.env.VITE_API_URL;

  // Initialize and load station data and public configs on start
  useEffect(() => {
    async function loadConfigAndStations() {
      try {
        setIsApiConnecting(true);
        
        // 1. Fetch public configs
        const configRes = await fetch("/api/config/public");
        if (configRes.ok) {
          const config = await configRes.json();
          setMapTilerKey(config.MAPTILER_API_KEY);
          setIsPredictionMachineOffline(config.is_prediction_mock);
        }

        // 2. Fetch system health
        const healthRes = await fetch("/api/health");
        if (healthRes.ok) {
          const health = await healthRes.json();
          setHealthInfo(health);
        }

        // 3. Fetch static police stations data
        const stationsRes = await fetch("/api/police-stations");
        if (stationsRes.ok) {
          const stations = await stationsRes.json();
          setPoliceStations(stations);
        }
      } catch (err) {
        console.error("Initialization check failed. Fallbacks loaded.", err);
      } finally {
        setIsApiConnecting(false);
      }
    }

    loadConfigAndStations();

    // Retrieve local feedback if any exists
    const localLocalStr = localStorage.getItem("event_ops_feedback");
    if (localLocalStr) {
      try {
        setSavedFeedback(JSON.parse(localLocalStr));
      } catch {}
    }
  }, []);

  // Update dispatch list whenever active prediction changes or static units get updated
  useEffect(() => {
    if (prediction && policeStations.length > 0) {
      calculateDispatchRecommendations(prediction);
    }
  }, [prediction, policeStations]);

  // Handle active-event prediction calculate trigger
  const calculateDispatchRecommendations = async (pred: PredictionData) => {
    try {
      const response = await fetch("/api/dispatch/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prediction: pred, stations: policeStations })
      });
      if (response.ok) {
        const data = await response.json();
        setDispatchRecommendations(data.nearest_stations || []);
        setRecommendedMessage(data.recommended_message || "");
      }
    } catch (e) {
      console.error("Dispatch compute check failed:", e);
    }
  };

  // 1. Parsing action: MESSY TEXT to STRUCTURED INPUT
  const handleParseEvent = async (raw: string, loc: string) => {
    setIsParsing(true);
    try {
      const response = await fetch(`${API_BASE}/parse-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_description: raw, location_text: loc })
      });

      if (!response.ok) throw new Error("Parser server failed");
      const res = await response.json();
      if (res) {
        setStructuredData(res);
      }
    } catch (error: any) {
      alert("Failed extracting structured event variables: " + error.message);
    } finally {
      setIsParsing(false);
    }
  };

  // 2. Prediction action: STRUCTURED INPUT to SEVERITY & IMPACT INDICATORS
  const handlePredictEvent = async (data: SingleEventInput) => {
    setIsPredicting(true);
    try {
      const response = await fetch(`${API_BASE}/predict-event-impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      console.log(response);
        if (!response.ok) throw new Error("Core prediction machine process error");
      const res = await response.json();
      console.log(res);
      if (res) {
        setPrediction(res);
        
        // Auto add to live compilation list so they show up on search maps immediately
        const exists = batchResults.some(ev => ev.event_id === res.event_id);
        if (!exists) {
          setBatchResults(prev => [res, ...prev]);
        } else {
          setBatchResults(prev => prev.map(ev => ev.event_id === res.event_id ? res : ev));
        }

        // Auto change tab to Dashboard so operator sees outputs instantly!
        setActiveTab("dashboard");
      }
    } catch (error: any) {
      alert("Prediction dispatch failed: " + error.message);
    } finally {
      setIsPredicting(false);
    }
  };

  // 3. Batch prediction action
  const handlePredictBatch = async (eventsList: any[]) => {
    setIsPredicting(true);
    try {
      const response = await fetch(`${API_BASE}/predict-event-impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: eventsList })
      });

      if (!response.ok) throw new Error("Batch process failed");
      const res = await response.json();

      if (res) {
        // Append all predictions to results registry
        setBatchResults(res);
      }
    } catch (error: any) {
      alert("Batch execution failed: " + error.message);
    } finally {
      setIsPredicting(false);
    }
  };

  // Direct manual setting of custom pasted ML prediction
  const handleSetCustomPrediction = (customPred: PredictionData) => {
    setPrediction(customPred);
    // Add to lists
    const exists = batchResults.some(ev => ev.event_id === customPred.event_id);
    if (!exists) {
      setBatchResults(prev => [customPred, ...prev]);
    } else {
      setBatchResults(prev => prev.map(ev => ev.event_id === customPred.event_id ? customPred : ev));
    }
    setActiveTab("dashboard");
  };

  // 4. Update Simulated Alert Status Sequence
  // Not Alerted -> Alert Sent -> Acknowledged -> Units Dispatched -> Arrived
  const handleUpdateAlertStatus = async (stationId: string, currentStatus: string) => {
    if (!prediction) return;
    try {
      const response = await fetch("/api/dispatch/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station_id: stationId,
          event_id: prediction.event_id,
          current_status: currentStatus,
          human_approved: true
        })
      });

      if (response.ok) {
        const res = await response.json();
        
        // Update recommended alert lists
        setDispatchRecommendations(prev =>
          prev.map(rec =>
            rec.station_id === stationId ? { ...rec, alert_status: res.alert_status as any } : rec
          )
        );

        // Update corresponding police station's available/deployed metrics in real-time inside app!
        if (res.alert_status === "Units Dispatched") {
          setPoliceStations(prev =>
            prev.map(st => {
              if (st.station_id === stationId) {
                const rec = dispatchRecommendations.find(r => r.station_id === stationId);
                const dispVal = rec ? rec.recommended_dispatch_units : 1;
                return {
                  ...st,
                  available_units: Math.max(0, st.available_units - dispVal),
                  deployed_units: st.deployed_units + dispVal
                };
              }
              return st;
            })
          );
        }
      }
    } catch (e) {
      console.error("Alert state modification error:", e);
    }
  };

  // 5. Request extra backup reinforcements
  const handleRequestBackup = (stationId: string) => {
    setPoliceStations(prev =>
      prev.map(st => {
        if (st.station_id === stationId) {
          return {
            ...st,
            available_units: st.available_units + 2, // backup elements sent
            total_units: st.total_units + 2
          };
        }
        return st;
      })
    );

    // Update recomendation units
    setDispatchRecommendations(prev =>
      prev.map(rec => {
        if (rec.station_id === stationId) {
          return {
            ...rec,
            recommended_dispatch_units: rec.recommended_dispatch_units + 1,
            reason: "REINFORCED: Requested secondary emergency backups."
          };
        }
        return rec;
      })
    );

    alert("Requested emergency backup reinforcements for the station area.");
  };

  // 5.5 Live Poll Refresh of responder structures
  const handleRefreshStations = async () => {
    try {
      const response = await fetch("/api/police-stations");
      if (response.ok) {
        const stations = await response.json();
        setPoliceStations(stations);
      }
    } catch (err) {
      console.error("Auto-fetch tactical station capacity metrics failed:", err);
    }
  };

  // 6. Save operator comments locally
  const handleSaveFeedback = (feedback: PostEventFeedback) => {
    const resolvedFeedback: PostEventFeedback = {
      ...feedback,
      status: "RESOLVED",
      resolved: true
    };
    const updated = [resolvedFeedback, ...savedFeedback];
    setSavedFeedback(updated);
    localStorage.setItem("event_ops_feedback", JSON.stringify(updated));

    // Remove the resolved event from live active queue (batchResults)
    setBatchResults(prev => prev.filter(ev => ev.event_id !== feedback.event_id));

    // Clear active selection if it is the resolved event
    if (prediction && prediction.event_id === feedback.event_id) {
      setPrediction(null);
    }
  };


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 animate-fade-in">
      
      {/* 1. Header Banner */}
      <header className="bg-zinc-900/80 border-b border-zinc-800 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-45 backdrop-blur-md">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <h1 className="text-xl font-bold font-display tracking-tighter text-white uppercase">
              THE GRID
            </h1>
          </div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
            EventOps Twin: Congestion Prediction and Deployment command center
          </p>
        </div>

        {/* Central Configuration status widget details */}
        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
          <div className="bg-zinc-905 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-zinc-400">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Prototype Engine: <strong className="text-blue-400">ONLINE</strong></span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-zinc-400">
            <Cpu className="w-3.5 h-3.5 text-orange-400" />
            <span>Prediction Model Sourcing:</span>
            {!isPredictionMachineOffline ? (
              <span className="text-orange-400 font-bold">Prediction Machine ML</span>
            ) : (
              <span className="text-neutral-400 font-bold">Demo Heuristics Fallback</span>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-zinc-400">
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gemini API:</span>
            {healthInfo?.config?.GEMINI_API_KEY?.configured ? (
              <span className="text-emerald-400 font-bold">Active (Parsing Only)</span>
            ) : (
              <span className="text-zinc-500 font-bold">Local Extraction Form</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Core Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* 2. Left Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 p-4 space-y-2 flex-shrink-0 flex flex-col justify-between">
          <div className="space-y-4">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 py-1.5 border-b border-zinc-800/55">
              Operations
            </p>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("intake")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium cursor-pointer transition-colors ${
                  activeTab === "intake"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0 text-blue-500" />
                Event Intake
              </button>

              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium cursor-pointer transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4 shrink-0 text-red-500" />
                Impact Dashboard
              </button>

              <button
                onClick={() => setActiveTab("map")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium cursor-pointer transition-colors ${
                  activeTab === "map"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Map className="w-4 h-4 shrink-0 text-zinc-400" />
                Map Command View
              </button>

              <button
                onClick={() => setActiveTab("deployment")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium cursor-pointer transition-colors ${
                  activeTab === "deployment"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Send className="w-4 h-4 shrink-0 text-emerald-500" />
                Police Deployment
              </button>

              <button
                onClick={() => setActiveTab("roster")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium cursor-pointer transition-colors ${
                  activeTab === "roster"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-orange-500" />
                Critical Events
              </button>

              <button
                onClick={() => setActiveTab("batch")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium cursor-pointer transition-colors ${
                  activeTab === "batch"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Database className="w-4 h-4 shrink-0 text-purple-400" />
                Batch Prediction
              </button>

              <button
                onClick={() => setActiveTab("command_json")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium cursor-pointer transition-colors ${
                  activeTab === "command_json"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <FileCode className="w-4 h-4 shrink-0 text-cyan-400" />
                Command JSON
              </button>

              <button
                onClick={() => setActiveTab("post_event")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium cursor-pointer transition-colors ${
                  activeTab === "post_event"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Clock className="w-4 h-4 shrink-0 text-yellow-400" />
                Post-Event Info
              </button>
            </nav>
          </div>

          <div className="pt-6 border-t border-zinc-805 border-zinc-800 mt-6 space-y-3">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3">
              HQ Live Roster
            </p>
            <div className="px-3 space-y-2 text-[10px] font-mono">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Active Track:</span>
                <span className="text-white font-bold">{batchResults.length} events</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Total Stations:</span>
                <span className="text-white font-bold">{policeStations.length} channels</span>
              </div>
            </div>
          </div>
        </aside>

        {/* 3. Main Dynamic Panel Area */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-full">
          
          {/* Sourcing warning banner if ML endpoint offline */}
          {isPredictionMachineOffline && (
            <div className="bg-yellow-950/10 border border-yellow-900/40 p-3.5 rounded-xl text-yellow-500 text-xs font-mono flex items-start gap-2.5">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 animate-pulse mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">PREDICTION MACHINE ENDPOINT (FastAPI) NOT DETECTED</p>
                <p className="text-[11px] text-yellow-600/90 leading-relaxed">
                  Prediction Machine unavailable. Showing demo fallback JSON. This is not an active ML prediction. To bind your competition-trained model bundle completely, set the <span className="text-amber-500 font-bold">PREDICTION_API_BASE_URL</span> environment variable.
                </p>
              </div>
            </div>
          )}

          {/* DYNAMIC VIEW ROUTING */}
          {activeTab === "intake" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold font-display uppercase tracking-wider text-zinc-100">
                  Command-Center Intake Gateway
                </h2>
                <p className="text-xs text-zinc-500">
                  Submit conversational incident feeds or paste exact parameter settings to route to the outer Prediction matrix.
                </p>
              </div>
              
              <EventIntakePanel
                onParse={handleParseEvent}
                onPredict={handlePredictEvent}
                isParsing={isParsing}
                isPredicting={isPredicting}
                structuredData={structuredData}
                onSetStructuredData={setStructuredData}
              />
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold font-display uppercase tracking-wider text-zinc-100">
                  Operational Impact Dashboard
                </h2>
                <p className="text-xs text-zinc-500">
                  Analyze clearance, road block recommendations and gravity scores computed by the Prediction Machine.
                </p>
              </div>

              <ImpactDashboardPanel 
                prediction={prediction} 
                predictionSource={prediction?.dashboard_runtime?.prediction_source}
              />
            </div>
          )}

          {activeTab === "map" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold font-display uppercase tracking-wider text-zinc-100">
                  Bengaluru Command Map View
                </h2>
                <p className="text-xs text-zinc-500">
                  Geospatial visualization of traffic bottlenecks, deployment areas, and active hot spots.
                </p>
              </div>

              {/* Map Config Layer togglers */}
              <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="layer-active"
                    checked={mapLayers.activeEvent}
                    onChange={(e) => setMapLayers({ ...mapLayers, activeEvent: e.target.checked })}
                    className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="layer-active" className="text-zinc-300">Active Case</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="layer-stations"
                    checked={mapLayers.policeStations}
                    onChange={(e) => setMapLayers({ ...mapLayers, policeStations: e.target.checked })}
                    className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="layer-stations" className="text-zinc-300">Police Stations</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="layer-hotspots"
                    checked={mapLayers.hotspots}
                    onChange={(e) => setMapLayers({ ...mapLayers, hotspots: e.target.checked })}
                    className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="layer-hotspots" className="text-zinc-300">Hotspot Circles</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="layer-critical"
                    checked={mapLayers.criticalEvents}
                    onChange={(e) => setMapLayers({ ...mapLayers, criticalEvents: e.target.checked })}
                    className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="layer-critical" className="text-zinc-300">Roster Incidents</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="layer-radius"
                    checked={mapLayers.suggestedRadius}
                    onChange={(e) => setMapLayers({ ...mapLayers, suggestedRadius: e.target.checked })}
                    className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="layer-radius" className="text-zinc-300">Deployment Squeeze Radius</label>
                </div>
              </div>

              <MapCommandView
                activeEvent={prediction}
                batchEvents={batchResults}
                policeStations={policeStations}
                mapTilerKey={mapTilerKey}
                selectedStationId={selectedStationId}
                onSelectStation={setSelectedStationId}
                layers={mapLayers}
              />
            </div>
          )}

          {activeTab === "deployment" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold font-display uppercase tracking-wider text-zinc-100">
                  Incident Deployment Command
                </h2>
                <p className="text-xs text-zinc-500">
                  Verify nearby stations and authorize simulated tactical deployments in peak zones.
                </p>
              </div>

              <PoliceDeploymentPanel
                recommendations={dispatchRecommendations}
                stations={policeStations}
                recommendedMessage={recommendedMessage}
                onUpdateAlertStatus={handleUpdateAlertStatus}
                onRequestBackup={handleRequestBackup}
                isLoading={false}
                autoRefreshEnabled={autoRefreshEnabled}
                onToggleAutoRefresh={setAutoRefreshEnabled}
                onManualRefresh={handleRefreshStations}
              />
            </div>
          )}

          {activeTab === "roster" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold font-display uppercase tracking-wider text-zinc-100">
                  Live Incident Queue
                </h2>
                <p className="text-xs text-zinc-500">
                  Roster of active congestion inputs and prediction records.
                </p>
              </div>

              <CriticalEventsPanel
                allPredictions={batchResults}
                onSelectEvent={(pred) => {
                  setPrediction(pred);
                  setActiveTab("dashboard");
                }}
                selectedEventId={prediction?.event_id}
              />
            </div>
          )}

          {activeTab === "batch" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold font-display uppercase tracking-wider text-zinc-100">
                  Batch Predictions Pipeline
                </h2>
                <p className="text-xs text-zinc-500">
                  Evaluate bulk data cases and plot them collectively onto the spatial basemap.
                </p>
              </div>

              <BatchPredictionPanel
                onPredictBatch={handlePredictBatch}
                batchResults={batchResults}
                isLoading={isPredicting}
                onSetBatchToMap={(results) => {
                  // batchResults already synced, nothing extra strictly needed except alerting map layers
                  setMapLayers(prev => ({ ...prev, criticalEvents: true }));
                }}
              />
            </div>
          )}

          {activeTab === "command_json" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold font-display uppercase tracking-wider text-zinc-100">
                  Command JSON Gateway
                </h2>
                <p className="text-xs text-zinc-500">
                  Inspect raw ML JSON outputs or paste prediction data blocks manually to mock the outer forecast.
                </p>
              </div>

              <CommandJsonPanel
                structuredData={structuredData}
                prediction={prediction}
                onSetCustomPrediction={handleSetCustomPrediction}
              />
            </div>
          )}

          {activeTab === "post_event" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold font-display uppercase tracking-wider text-zinc-100">
                  Post-Event Learning Loop
                </h2>
                <p className="text-xs text-zinc-500">
                  Analyze actual ground metrics to retrain prediction models in future cycles.
                </p>
              </div>

              <PostEventLearningPanel
                prediction={prediction}
                savedFeedback={savedFeedback}
                onSaveFeedback={handleSaveFeedback}
              />
            </div>
          )}

        </main>
      </div>

      {/* Footer credits bar */}
      <footer className="bg-zinc-950 border-t border-zinc-800 py-3.5 px-6 text-center text-[10px] text-zinc-500 font-mono flex flex-col md:flex-row justify-between items-center gap-2">
        <div>EventOps Twin Command Center dashboard prototype &bull; Bengaluru sector, India</div>
        <div className="text-zinc-500">Flipkart Gridlock Round 2 Compliance Shield Secured</div>
      </footer>

    </div>
  );
}
