import React from "react";
import { PredictionData } from "../types";
import { AlertCircle, Clock, ShieldAlert, Zap, Compass, Users, CheckSquare, Layers, Award } from "lucide-react";

interface ImpactDashboardPanelProps {
  prediction: PredictionData | null;
  predictionSource?: string;
}

export default function ImpactDashboardPanel({ prediction, predictionSource }: ImpactDashboardPanelProps) {
  if (!prediction) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
        <Compass className="w-10 h-10 text-slate-600 mb-3 animate-pulse" />
        <p className="text-slate-400 font-medium text-sm">No Active Prediction Loaded</p>
        <p className="text-slate-600 text-xs mt-1 max-w-sm">
          Please input an incident in the "Event Intake" section and run the "Prediction Machine" to generate official incident forecasts.
        </p>
      </div>
    );
  }

  const {
    event_id,
    impact_predictions,
    network_context,
    operational_recommendations,
    data_quality_context,
    night_shift_context,
    similar_event_memory
  } = prediction;


  const riskColorMap = {
    critical: { border: "border-red-900/60", text: "text-red-400", bg: "bg-red-950/40", badge: "bg-red-500 text-slate-950" },
    high: { border: "border-orange-900/60", text: "text-orange-400", bg: "bg-orange-950/40", badge: "bg-orange-500 text-slate-950" },
    medium: { border: "border-yellow-900/60", text: "text-yellow-400", bg: "bg-yellow-950/40", badge: "bg-yellow-500 text-slate-150" },
    low: { border: "border-green-900/60", text: "text-green-400", bg: "bg-green-950/40", badge: "bg-green-500 text-slate-950" },
    unknown: { border: "border-slate-800", text: "text-slate-400", bg: "bg-slate-900/40", badge: "bg-slate-700 text-slate-100" }
  };

  const riskStr = (impact_predictions?.impact_risk || "unknown").toLowerCase() as keyof typeof riskColorMap;
  const style = riskColorMap[riskStr] || riskColorMap.unknown;

  const finalScore = prediction?.impact_predictions?.final_impact_score ?? 0;
  const clearanceMins = prediction?.impact_predictions?.predicted_clearance_minutes ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Status */}
      <div className={`p-4 border ${style.border} ${style.bg} rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase bg-slate-900/80 px-2 py-0.5 rounded">
              Active Case: {event_id}
            </span>
            {night_shift_context?.night_shift_alert && (
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 flex items-center gap-1 animate-pulse">
                <Clock className="w-2.5 h-2.5" /> Night Shift Alert Active
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            Incident Gravity Index: <span className={style.text}>{riskStr.toUpperCase()} IMPACT RISK</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-normal">
            Status: Confirmed prediction registered successfully. Deployment workflows are authorized subject to operational HQ approval.
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-mono">FINANCIAL / TRAFFIC PENALTY</p>
            <p className="text-3xl font-bold text-white tracking-widest font-display">
              {finalScore.toFixed(1)}<span className="text-sm font-light text-slate-500">/10</span>
            </p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${style.badge} font-bold text-sm shadow-md`}>
            {riskStr.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Grid Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Clearance Bucket */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-2 relative overflow-hidden">
          <div className="absolute right-2 top-2 text-slate-700">
            <Clock className="w-8 h-8 opacity-20" />
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Predicted Clearance</p>
          <p className="text-xl font-bold text-white transition-all">
            {clearanceMins} <span className="text-xs font-normal text-slate-400">mins</span>
          </p>
          <div className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] w-fit font-mono">
            {impact_predictions?.predicted_clearance_time_bucket || "N/A Bucket"}
          </div>
        </div>

        {/* Card 2: Road Closure Risk */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-2 relative overflow-hidden">
          <div className="absolute right-2 top-2 text-slate-700">
            <ShieldAlert className="w-8 h-8 opacity-20" />
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Closure Recommendation</p>
          <p className="text-xl font-bold text-white">
            {impact_predictions?.closure_recommended ? "FORCE CLOSURE" : "KEEP FLOWING"}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            Prob: {((impact_predictions?.requires_road_closure_prob || 0) * 100).toFixed(0)}%
          </p>
        </div>

        {/* Card 3: Priority Prob */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-2 relative overflow-hidden">
          <div className="absolute right-2 top-2 text-slate-700">
            <Zap className="w-8 h-8 opacity-20" />
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">HQ Priority Index</p>
          <p className="text-xl font-bold text-white">
            {((impact_predictions?.priority_probability || 0) * 100).toFixed(0)}% <span className="text-xs font-normal text-slate-400">confidence</span>
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            Long-duration risk: {prediction?.impact_predictions?.long_duration_risk || "medium"}
          </p>
        </div>

        {/* Card 4: Network Impact */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-2 relative overflow-hidden">
          <div className="absolute right-2 top-2 text-slate-700">
            <Layers className="w-8 h-8 opacity-20" />
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Hotspot Grid Score</p>
          <p className="text-xl font-bold text-white">
            {(impact_predictions?.hotspot_score ?? 0).toFixed(1)}<span className="text-xs font-light text-slate-500">/10</span>
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            Network Spill score: {(impact_predictions?.network_compounding_score ?? 0).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Subsection: Network context & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 font-display flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Network Boundary Compound
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs text-slate-400">Bottleneck compounding factor:</span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {(network_context?.bottleneck_index ?? 0).toFixed(1)}x
              </span>
            </div>

            <div>
              <p className="text-[10px] font-mono text-slate-400 upper tracking-wider mb-2">Affected Secondary Junctions Cluster</p>
              <div className="flex flex-wrap gap-1.5">
                {(network_context?.affected_junctions || []).map((j, i) => (
                  <span key={i} className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded font-mono">
                    {j}
                  </span>
                ))}
              </div>
            </div>

            {similar_event_memory && (
              <div className="mt-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                <p className="text-[10px] font-mono text-slate-400 uppercase">Matched historical incidents in memory bank</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase">Similar Events</p>
                    <p className="text-xs font-bold text-slate-300">{similar_event_memory.similar_events_found ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase">Average historical clearance</p>
                    <p className="text-xs font-bold text-slate-300">{similar_event_memory.median_actual_ttr_minutes ?? 0} mins</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500 font-display flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Static Dispatch Directives
          </h3>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <p className="text-[9px] text-slate-400 uppercase">Recommended Traffic Staff</p>
                <p className="text-base font-bold text-slate-200">{operational_recommendations?.recommended_officers ?? 0} personnel</p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <p className="text-[9px] text-slate-400 uppercase">Barricading Level</p>
                <p className="text-base font-bold text-slate-200">{operational_recommendations?.barricading_detail ?? "None"}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Diversion Plan</p>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed">
                {operational_recommendations?.diversion_recommendation || "Maintain natural corridor streaming with local officers pacing."}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Operational Dispatch Requirements</p>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed">
                {
                  operational_recommendations?.dispatch_requirement &&
                  operational_recommendations.dispatch_requirement.length > 0
                      ? operational_recommendations.dispatch_requirement.join(", ")
                      : "Dispatch standard patrol unit."
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 pt-3 font-mono">
        <div>
          <span>Prediction pipeline source: </span>
          <span className="text-teal-400 font-bold">{predictionSource || "Smart Heuristic Engine"}</span>
        </div>
        <div className="flex gap-4 mt-2 sm:mt-0">
          <span>Data confidence: <strong className="text-slate-300">{(data_quality_context?.data_confidence ?? 100)}%</strong></span>
          <span>Matched cases: <strong className="text-slate-300">{(impact_predictions?.historical_confidence_score ?? 100)}%</strong></span>
        </div>
      </div>
    </div>
  );
}
