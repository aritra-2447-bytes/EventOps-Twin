import React from "react";
import { PredictionData } from "../types";
import { ListFilter, MapPin, AlertCircle, Clock, ShieldCheck } from "lucide-react";

interface CriticalEventsPanelProps {
  allPredictions: PredictionData[];
  onSelectEvent: (pred: PredictionData) => void;
  selectedEventId?: string;
}

export default function CriticalEventsPanel({
  allPredictions,
  onSelectEvent,
  selectedEventId
}: CriticalEventsPanelProps) {
  
  // Sort by severity helper
  const severityScore = (risk: string) => {
    switch ((risk || "").toLowerCase()) {
      case "critical": return 4;
      case "high": return 3;
      case "medium": return 2;
      case "low": return 1;
      default: return 0;
    }
  };

  const sortedList = [...allPredictions].sort((a, b) => {
    const scoreDiff = severityScore(b.impact_predictions?.impact_risk) - severityScore(a.impact_predictions?.impact_risk);
    if (scoreDiff !== 0) return scoreDiff;
    // secondary filter by final impact score
    return (b.impact_predictions?.final_impact_score ?? 0) - (a.impact_predictions?.final_impact_score ?? 0);
  });

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 font-display">
            Bengaluru Roster: Live Incident Queue
          </h3>
          <p className="text-[11px] text-zinc-500 font-mono">
            Active command registry sorted in descending order of severity risk.
          </p>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
          <ListFilter className="w-3.5 h-3.5" /> Ordered Queue ({sortedList.length})
        </span>
      </div>

      {sortedList.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 font-mono italic">
          No live incident records currently compiled in system registry.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 font-mono">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400">
                <th className="p-3">Event ID</th>
                <th className="p-3">Cause / Squeeze Type</th>
                <th className="p-3">Sector Location</th>
                <th className="p-3 text-center">Severity</th>
                <th className="p-3 text-center">Gravity Index</th>
                <th className="p-3 text-center">Closure Rec</th>
                <th className="p-3 text-center">Clearance</th>
                <th className="p-3 text-center">Long Dur Risk</th>
                <th className="p-3 text-center">T-Rec</th>
                <th className="p-3 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {sortedList.map((pred) => {
                const isSelected = selectedEventId === pred.event_id;
                const risk = (pred.impact_predictions?.impact_risk || "medium").toLowerCase();

                const riskColor = 
                  risk === "critical" ? "text-red-400 bg-red-950/30 border border-red-900/50" :
                  risk === "high" ? "text-orange-400 bg-orange-950/20 border border-orange-900/30" :
                  risk === "medium" ? "text-yellow-400 bg-yellow-950/10 border border-yellow-905" :
                  "text-green-400 bg-green-950/20 border border-green-900/30";

                return (
                  <tr
                    key={pred.event_id}
                    className={`transition-all ${
                      isSelected ? "bg-zinc-900/80 text-white font-semibold" : "hover:bg-zinc-900/10"
                    }`}
                  >
                    <td className="p-3 font-bold text-zinc-100">{pred.event_id}</td>
                    <td className="p-3 capitalize">
                      {pred.event_context?.raw_cause || "breakdown"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span>{pred.event_context?.junction || "Junction"}</span>
                        <span className="text-[10px] text-zinc-500">{pred.event_context?.corridor || "Corridor"}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold inline-block ${riskColor}`}>
                        {risk}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-zinc-200">
                      {(pred.impact_predictions?.final_impact_score ?? 0).toFixed(1)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={pred.impact_predictions?.closure_recommended ? "text-red-400" : "text-zinc-500"}>
                        {pred.impact_predictions?.closure_recommended ? "CLOSED RECOMMENDED" : "NORMAL CHANNEL"}
                      </span>
                    </td>
                    <td className="p-3 text-center text-zinc-400">
                      {pred.impact_predictions?.predicted_clearance_minutes || 0} mins
                    </td>
                    <td className="p-3 text-center capitalize text-zinc-400">
                      {pred.impact_predictions?.long_duration_risk || "medium"}
                    </td>
                    <td className="p-3 text-center text-emerald-405 text-emerald-400 font-bold">
                      {pred.operational_recommendations?.manpower_recommendation || 0} officers
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onSelectEvent(pred)}
                        className={`text-[10px] py-1 px-2.5 rounded transition-all cursor-pointer font-bold uppercase ${
                          isSelected ? "bg-amber-500 text-zinc-950" : "bg-zinc-805 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        Scope Incident
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
