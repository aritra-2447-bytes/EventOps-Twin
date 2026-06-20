import React, { useState } from "react";
import { PredictionData, SingleEventInput } from "../types";
import { 
  Copy, 
  Download, 
  FileJson, 
  Check, 
  UploadCloud, 
  ArrowRight, 
  Cpu, 
  Terminal, 
  Sparkles,
  Layers,
  MapPin
} from "lucide-react";

interface CommandJsonPanelProps {
  structuredData: SingleEventInput;
  prediction: PredictionData | null;
  onSetCustomPrediction: (prediction: PredictionData) => void;
}

export default function CommandJsonPanel({ 
  structuredData, 
  prediction, 
  onSetCustomPrediction 
}: CommandJsonPanelProps) {
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [manualJsonText, setManualJsonText] = useState("");
  const [alertState, setAlertState] = useState<{ success: boolean; msg: string } | null>(null);

  // Copy structured event input JSON (intended for the external model)
  const handleCopyInput = () => {
    navigator.clipboard.writeText(JSON.stringify(structuredData, null, 2));
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  // Download structured event input JSON file
  const handleDownloadInput = () => {
    const filename = `event_ops_input_${structuredData.event_id || "EXTRACTED"}.json`;
    const blob = new Blob([JSON.stringify(structuredData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy live/active prediction output JSON
  const handleCopyOutput = () => {
    if (!prediction) return;
    navigator.clipboard.writeText(JSON.stringify(prediction, null, 2));
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  // Download active prediction output JSON file
  const handleDownloadOutput = () => {
    if (!prediction) return;
    const blob = new Blob([JSON.stringify(prediction, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `event_ops_twin_prediction_${prediction.event_id || "TEST"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyCustomJson = () => {
    try {
      const parsedRaw = JSON.parse(manualJsonText);
      
      // Unwrap if envelope success: true, data: {...} is used
      let parsed = parsedRaw;
      if (parsedRaw && parsedRaw.data && typeof parsedRaw.data === "object") {
        parsed = parsedRaw.data;
      }
      
      // Basic structure validation
      if (!parsed.event_id) {
        throw new Error("Missing required field: 'event_id'.");
      }
      
      // Normalize impact_predictions block
      const rawImpact = parsed.impact_predictions || {};
      const normalImpactRisk = rawImpact.impact_risk 
        ? rawImpact.impact_risk.toString().toLowerCase() 
        : "medium";

      const normalizedImpact: any = {
        impact_risk: (["critical", "high", "medium", "low"].includes(normalImpactRisk) 
          ? normalImpactRisk 
          : "medium") as any,
        final_impact_score: typeof rawImpact.final_impact_score === "number" 
          ? rawImpact.final_impact_score 
          : (typeof rawImpact.base_impact_score === "number" ? rawImpact.base_impact_score : 5.0),
        priority_probability: typeof rawImpact.priority_probability === "number" 
          ? rawImpact.priority_probability 
          : 0.5,
        road_closure_probability: typeof rawImpact.requires_road_closure_prob === "number"
          ? rawImpact.requires_road_closure_prob
          : (typeof rawImpact.model_full_road_closure_probability === "number"
            ? rawImpact.model_full_road_closure_probability
            : (typeof rawImpact.road_closure_probability === "number" ? rawImpact.road_closure_probability : 0.1)),
        closure_recommended: typeof rawImpact.closure_recommended === "boolean" 
          ? rawImpact.closure_recommended 
          : false,
        predicted_clearance_minutes: typeof rawImpact.predicted_clearance_minutes === "number"
          ? rawImpact.predicted_clearance_minutes
          : 60,
        clearance_bucket: rawImpact.predicted_clearance_time_bucket || rawImpact.clearance_bucket || "30-60 mins",
        long_duration_risk: (rawImpact.long_duration_risk === true || rawImpact.long_duration_risk === "high" || rawImpact.long_duration_risk === "critical")
          ? "high"
          : "medium",
        hotspot_score: typeof rawImpact.hotspot_score === "number" ? rawImpact.hotspot_score : 0.5,
        network_compounding_score: typeof rawImpact.network_compounding_score === "number" ? rawImpact.network_compounding_score : 0.2,
      };

      // Normalize operational_recommendations block
      const rawOps = parsed.operational_recommendations || {};
      const dispatchReq = Array.isArray(rawOps.dispatch_requirement)
        ? rawOps.dispatch_requirement.join(", ")
        : (rawOps.dispatch_requirements || "Deploy tactical dispatch unit.");

      const normalizedOps: any = {
        manpower_recommendation: typeof rawOps.recommended_officers === "number"
          ? rawOps.recommended_officers
          : (typeof rawOps.manpower_recommendation === "number" ? rawOps.manpower_recommendation : 4),
        barricading_recommendation: rawOps.barricading_level || rawOps.barricading_recommendation || "Medium",
        diversion_recommendation: rawOps.diversion_type || rawOps.diversion_recommendation || "No immediate diversion required",
        dispatch_requirements: dispatchReq,
      };

      // Create stable fully aligned PredictionData
      const finalPayload: PredictionData = {
        event_id: parsed.event_id,
        event_context: parsed.event_context || {},
        impact_predictions: normalizedImpact,
        network_context: {
          affected_junctions: Array.isArray(parsed.network_context?.affected_junctions)
            ? parsed.network_context.affected_junctions
            : ["Primary Link"],
          bottleneck_index: typeof parsed.network_context?.bottleneck_index === "number"
            ? parsed.network_context.bottleneck_index
            : 4.0,
        },
        similar_event_memory: parsed.similar_event_memory || {},
        operational_recommendations: normalizedOps,
        incident_hazard_context: parsed.incident_hazard_context || {},
        data_quality_context: {
          data_confidence: typeof parsed.data_quality_context?.data_confidence === "number"
            ? parsed.data_quality_context.data_confidence
            : (parsed.data_quality_context?.data_confidence === "High" ? 95 : 75),
          historical_confidence_score: typeof parsed.data_quality_context?.historical_confidence_score === "number"
            ? parsed.data_quality_context.historical_confidence_score
            : 80,
        },
        night_shift_context: {
          night_shift_alert: typeof parsed.night_shift_context?.night_shift_alert === "boolean"
            ? parsed.night_shift_context.night_shift_alert
            : false,
        },
        post_event_learning: {
          feedback_fields: Array.isArray(parsed.post_event_learning?.feedback_fields)
            ? parsed.post_event_learning.feedback_fields
            : ["actual_clearance_minutes", "actual_manpower_used", "recommendation_accepted", "operator_comment"],
        },
        system_trace: parsed.system_trace || parsedRaw.system_trace || {},
      };
      
      // Reinject timestamp/source tracking for audit trace
      (finalPayload as any).dashboard_runtime = {
        prediction_source: "Synced Local Model Notebook Paste Injection",
        parsed_at: new Date().toISOString()
      };
      
      onSetCustomPrediction(finalPayload);
      setAlertState({ 
        success: true, 
        msg: `Custom prediction JSON for Case [${finalPayload.event_id}] successfully loaded and aligned to state context!` 
      });
      setTimeout(() => setAlertState(null), 5000);
    } catch (e: any) {
      setAlertState({ 
        success: false, 
        msg: "Parsing error: " + e.message 
      });
    }
  };

  // Easily prefill an exact blueprint format of prediction output
  const handlePrefillTemplate = () => {
    const template: PredictionData = {
      event_id: structuredData.event_id || "SAMPLE_001",
      event_context: {
        raw_cause: structuredData.event_cause || "accident",
        authenticated: structuredData.authenticated || "yes",
        direction: structuredData.direction || "outbound",
        corridor: structuredData.corridor || "Tumkur Road",
        junction: structuredData.junction || "Peenya Industrial Area"
      },
      impact_predictions: {
        impact_risk: "high",
        final_impact_score: 7.9,
        priority_probability: 0.85,
        road_closure_probability: 0.60,
        closure_recommended: false,
        predicted_clearance_minutes: 90,
        clearance_bucket: "60-120 mins",
        long_duration_risk: "high",
        hotspot_score: 7.5,
        network_compounding_score: 6.8
      },
      network_context: {
        affected_junctions: [
          structuredData.junction || "Primary Junction",
          "Secondary Ring Bypass Link",
          "Outer Tangent Diverter"
        ],
        bottleneck_index: 7.4
      },
      similar_event_memory: {
        matched_historical_cases: 4,
        historical_average_clearance: 85,
        confidence_match: "90%"
      },
      operational_recommendations: {
        manpower_recommendation: 6,
        barricading_recommendation: "Medium",
        diversion_recommendation: `Divert heavy vehicles away from ${structuredData.corridor || "main corridor"}`,
        dispatch_requirements: `Emergency squad to coordinate detour routing. Deploy 6 traffic officers.`
      },
      incident_hazard_context: {
        fire_risk: false,
        crane_required: true,
        ambulance_required: false
      },
      data_quality_context: {
        data_confidence: 95,
        historical_confidence_score: 88
      },
      night_shift_context: {
        night_shift_alert: false
      },
      post_event_learning: {
        feedback_fields: [
          "actual_clearance_minutes",
          "actual_road_closure",
          "actual_priority",
          "actual_manpower_used",
          "recommendation_accepted",
          "operator_comment"
        ]
      },
      system_trace: {
        pipeline: "external_notebook_inference_v1",
        execution_latency_ms: 12
      }
    };
    setManualJsonText(JSON.stringify(template, null, 2));
  };

  return (
    <div className="space-y-6">
      {/* Step Guided Pipeline Banner */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-zinc-800 pb-2">
          <Cpu className="w-4.5 h-4.5 text-blue-400" />
          External Model Connection Sequence (`The_Model.ipynb`)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
          
          <div className="bg-zinc-950/80 p-3.5 border border-zinc-800/60 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded font-mono uppercase">
                Step 1
              </span>
              <span className="text-zinc-600 font-bold font-mono">APP &rarr; LOCAL</span>
            </div>
            <h4 className="font-bold text-zinc-300">Copy Parsed Event Input</h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Retrieve high-fidelity structured variables matching the incident's physical parameters.
            </p>
          </div>

          <div className="bg-zinc-905 bg-zinc-950/80 p-3.5 border border-zinc-800/60 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded font-mono uppercase">
                Step 2
              </span>
              <span className="text-zinc-600 font-bold font-mono">NOTEBOOK ML</span>
            </div>
            <h4 className="font-bold text-zinc-300">Run Local Model Code</h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Feed the input JSON into your offline ML pipeline (`The_Model.ipynb`) to compute indicators.
            </p>
          </div>

          <div className="bg-zinc-950/80 p-3.5 border border-zinc-800/60 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded font-mono uppercase">
                Step 3
              </span>
              <span className="text-zinc-600 font-bold font-mono">LOCAL &rarr; APP</span>
            </div>
            <h4 className="font-bold text-zinc-300">Paste Generated Prediction</h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Inject the prediction results back here to populate maps, dashboards, and police dispatches.
            </p>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VIEW & COPY STEP 1: EVENT INPUT DATA */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 font-display flex items-center gap-1.5">
                <Terminal className="w-4 h-4" /> 1. Sourced Event Input JSON
              </h3>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
                Model Input Spec
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Copy this payload representing the parsed physical parameters of the incident to run on your local ML model.
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-4 mt-2">
            <div className="relative bg-zinc-950 p-4 border border-zinc-805 border-zinc-805 rounded-lg max-h-[320px] overflow-auto flex-1">
              <pre className="text-[10px] text-zinc-300 font-mono select-all leading-normal whitespace-pre-wrap">
                {JSON.stringify(structuredData, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2 border-t border-zinc-800 pt-3">
              <button
                onClick={handleCopyInput}
                className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold py-2.5 px-3 rounded-lg cursor-pointer transition-colors"
              >
                {copiedInput ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedInput ? "Copied to Clipboard" : "Copy Input Payload"}
              </button>
              <button
                onClick={handleDownloadInput}
                className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold py-2.5 px-3 rounded-lg cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Input JSON
              </button>
            </div>
          </div>
        </div>

        {/* APPLY STEP 3: MANUALLY INJECT MODEL OUTPUT PREDICTIONS */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500 font-display flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4" /> 2. Inject Local Model Output
              </h3>
              <button
                onClick={handlePrefillTemplate}
                className="text-[10px] border border-zinc-850 bg-zinc-950 hover:bg-zinc-800 text-amber-500 px-2.5 py-0.5 rounded cursor-pointer font-mono font-bold transition-all text-right"
                title="Loads a complete schema template for active variables"
              >
                Prefill Blueprint Template
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Paste the prediction JSON computed by your notebook (`The_Model.ipynb`). This serves as input to populate our active results dashboard.
            </p>
          </div>

          {alertState && (
            <div className={`p-3 rounded-lg text-xs leading-normal font-mono border ${
              alertState.success ? "bg-green-950/30 border-green-800/80 text-green-400" : "bg-red-950/35 border-red-900/85 text-red-400"
            }`}>
              {alertState.msg}
            </div>
          )}

          <div className="flex-1 flex flex-col justify-between space-y-4 mt-2">
            <div className="space-y-1 flex-1 flex flex-col">
              <textarea
                value={manualJsonText}
                onChange={(e) => setManualJsonText(e.target.value)}
                placeholder={`e.g. {\n  "event_id": "${structuredData.event_id}",\n  "impact_predictions": {\n    "impact_risk": "high",\n    "final_impact_score": 7.9,\n    "predicted_clearance_minutes": 90,\n    "closure_recommended": false\n  },\n  "operational_recommendations": {\n    "manpower_recommendation": 6,\n    "barricading_recommendation": "Medium"\n  }\n}`}
                className="w-full flex-1 min-h-[220px] max-h-[320px] bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <button
              onClick={handleApplyCustomJson}
              disabled={!manualJsonText.trim()}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-slate-950 font-bold text-xs py-2.5 px-3 rounded-lg cursor-pointer transition-colors uppercase tracking-wider font-mono"
            >
              Apply Pasted ML Output Into App State
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIVE CONTAINER CURRENT STATE TRACKING */}
      {prediction && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-display flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5" /> Live Rendered Prediction Output (JSON View)
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">
              The currently active predictions that are populating the map and analytics panels.
            </p>
          </div>

          <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg max-h-[240px] overflow-auto">
            <pre className="text-[10px] text-zinc-400 font-mono select-all leading-normal">
              {JSON.stringify(prediction, null, 2)}
            </pre>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyOutput}
              className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer transition-colors font-mono"
            >
              {copiedOutput ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedOutput ? "Copied Current Output" : "Copy Live Predictions JSON"}
            </button>
            <button
              onClick={handleDownloadOutput}
              className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer transition-colors font-mono"
            >
              <Download className="w-3.5 h-3.5" />
              Download Live Predictions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
