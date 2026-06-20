import React, { useState, useEffect } from "react";
import { DispatchRecommendation, PoliceStation } from "../types";
import { Shield, MapPin, Send, CheckCircle, Navigation, Radio, PlusCircle, RefreshCw } from "lucide-react";

interface PoliceDeploymentPanelProps {
  recommendations: DispatchRecommendation[];
  stations: PoliceStation[];
  recommendedMessage: string;
  onUpdateAlertStatus: (stationId: string, currentStatus: string) => Promise<void>;
  onRequestBackup: (stationId: string) => void;
  isLoading: boolean;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: (enabled: boolean) => void;
  onManualRefresh?: () => Promise<void>;
}

export default function PoliceDeploymentPanel({
  recommendations,
  stations,
  recommendedMessage,
  onUpdateAlertStatus,
  onRequestBackup,
  isLoading,
  autoRefreshEnabled = false,
  onToggleAutoRefresh,
  onManualRefresh
}: PoliceDeploymentPanelProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Monitor timer and trigger polling every 30s
  useEffect(() => {
    if (!autoRefreshEnabled) {
      setTimeLeft(30);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleRefresh();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, onManualRefresh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onManualRefresh) {
      await onManualRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleManualRefreshClick = async () => {
    setTimeLeft(30);
    await handleRefresh();
  };

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
        <Shield className="w-10 h-10 text-zinc-650 text-zinc-600 mb-3" />
        <p className="text-zinc-400 font-medium text-sm">No Tactical Deployment Context</p>
        <p className="text-zinc-600 text-xs mt-1 max-w-sm">
          Please run a prediction machine forecast first to identify adjacent police units and authorize official dispatch recommendations.
        </p>
      </div>
    );
  }

  // Map state to colors/badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Alert Sent":
        return "bg-cyan-500/20 text-cyan-400 border border-cyan-800";
      case "Acknowledged":
        return "bg-indigo-500/20 text-indigo-400 border border-indigo-800 animate-pulse";
      case "Units Dispatched":
        return "bg-amber-500/20 text-amber-400 border border-amber-800";
      case "Arrived":
        return "bg-emerald-500/20 text-emerald-400 border border-emerald-800";
      case "Not Alerted":
      default:
        return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Recommended HQ Directive Warning */}
      <div className="bg-amber-950/20 border border-amber-900/50 p-4 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-amber-400">
          <Radio className="w-4 h-4 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider font-display">
            HQ Command Sourcing Advisory
          </h4>
        </div>
        <p className="text-xs text-zinc-350 leading-relaxed bg-zinc-950/80 p-3 rounded-lg border border-zinc-800">
          "{recommendedMessage}"
        </p>
        <p className="text-[10px] text-zinc-550 font-sans italic">
          *Important Governance Directive: Tactical station alert simulation requires human HQ supervisor authorization. Auto-deployment is strictly disabled.
        </p>
      </div>

      {/* Recommended Stations Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 border-zinc-800 pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 font-display flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" /> Adjacent Responding Sectors
          </h3>
          
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Auto refresh status info */}
            {autoRefreshEnabled && (
              <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Syncing in <strong className="text-emerald-400">{timeLeft}s</strong>
              </span>
            )}
            
            {/* Auto-Refresh Toggle Switch */}
            <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800">
              <span className="text-[9px] font-mono text-zinc-400 px-1 font-bold uppercase">Auto-Refresh (30s)</span>
              <button
                type="button"
                onClick={() => onToggleAutoRefresh?.(!autoRefreshEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoRefreshEnabled ? "bg-emerald-600" : "bg-zinc-800"
                }`}
                aria-label="Toggle auto-refresh polling Every 30 Seconds"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoRefreshEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefreshClick}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer"
              title="Poll Station Capacity Now"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((recommendation) => {
            // Find corresponding static details
            const stationDetails = stations.find((s) => s.station_id === recommendation.station_id);
            const currentStatus = recommendation.alert_status;

            return (
              <div
                key={recommendation.station_id}
                className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 space-y-4 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-250 text-zinc-200">
                        {recommendation.station_name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Distance: <strong>{recommendation.distance_km} km</strong> ({stationDetails?.zone} sector)</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadge(currentStatus)}`}>
                      {currentStatus}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-450 font-mono italic bg-zinc-950/50 p-2.5 rounded border border-zinc-800/50">
                    "Rank Match: {recommendation.reason}"
                  </p>

                  {/* Capabilities & Personnel */}
                  {stationDetails && (
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono bg-zinc-950/20 p-2 border border-zinc-800/40 rounded">
                      <div>
                        <span className="text-zinc-500">Available Units:</span>{" "}
                        <span className="text-zinc-200 font-bold">{stationDetails.available_units} / {stationDetails.total_units}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Tactical Staff:</span>{" "}
                        <span className="text-zinc-200 font-bold">{stationDetails.traffic_personnel_available}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-zinc-800/40">
                        <span className="text-zinc-500">Capabilities:</span>{" "}
                        <span className="text-blue-400 uppercase text-[9px] font-semibold">
                          {stationDetails.special_capabilities.join(", ").replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* State Controls Sequence */}
                <div className="border-t border-zinc-800 pt-3 flex flex-wrap gap-2 items-center justify-between">
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Recommended deployment:{" "}
                    <strong className="text-amber-500">{recommendation.recommended_dispatch_units} Units</strong>
                  </div>

                  <div className="flex gap-1.5">
                    {currentStatus === "Not Alerted" && (
                      <button
                        onClick={() => onUpdateAlertStatus(recommendation.station_id, "Not Alerted")}
                        disabled={isLoading}
                        className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Alert Station
                      </button>
                    )}

                    {currentStatus === "Alert Sent" && (
                      <button
                        onClick={() => onUpdateAlertStatus(recommendation.station_id, "Alert Sent")}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] py-1.5 px-3 rounded transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Radio className="w-3 h-3 animate-ping" /> Acknowledge Alert
                      </button>
                    )}

                    {currentStatus === "Acknowledged" && (
                      <button
                        onClick={() => onUpdateAlertStatus(recommendation.station_id, "Acknowledged")}
                        disabled={isLoading}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" /> Dispatch Units
                      </button>
                    )}

                    {currentStatus === "Units Dispatched" && (
                      <button
                        onClick={() => onUpdateAlertStatus(recommendation.station_id, "Units Dispatched")}
                        disabled={isLoading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Mark Arrived
                      </button>
                    )}

                    {currentStatus === "Arrived" && (
                      <span className="text-[10px] text-green-400 font-mono font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Sector Secured
                      </span>
                    )}

                    {/* Back-up deployment trigger */}
                    <button
                      onClick={() => onRequestBackup(recommendation.station_id)}
                      className="bg-zinc-800 hover:bg-zinc-750 text-rose-400 hover:text-rose-300 font-bold text-[10px] py-1.5 px-2 rounded transition-colors flex items-center gap-0.5"
                      title="Request additional backup squads"
                    >
                      <PlusCircle className="w-3 h-3" /> Backup
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
