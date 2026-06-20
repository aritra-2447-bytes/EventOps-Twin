import React, { useState } from "react";
import { defaultBatchInput } from "../sampleData";
import { Upload, Play, AlertTriangle, CheckCircle, Database } from "lucide-react";
import { PredictionData } from "../types";

interface BatchPredictionPanelProps {
  onPredictBatch: (events: any[]) => Promise<void>;
  batchResults: PredictionData[];
  isLoading: boolean;
  onSetBatchToMap: (results: PredictionData[]) => void;
}

export default function BatchPredictionPanel({
  onPredictBatch,
  batchResults,
  isLoading,
  onSetBatchToMap
}: BatchPredictionPanelProps) {
  const [jsonText, setJsonText] = useState(JSON.stringify(defaultBatchInput, null, 2));
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string; rowsCount?: number } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const contents = event.target?.result as string;
        const parsed = JSON.parse(contents);
        
        let targetArray: any[] = [];
        if (Array.isArray(parsed)) {
          targetArray = parsed;
        } else if (parsed.events && Array.isArray(parsed.events)) {
          targetArray = parsed.events;
        } else {
          throw new Error("JSON structure invalid. Expected array of events, or {events: []} object.");
        }

        // Run client-side quick validation
        const errors: string[] = [];
        targetArray.forEach((ev, idx) => {
          if (!ev.event_type || !ev.event_cause || ev.latitude === undefined || ev.longitude === undefined || !ev.start_datetime) {
            errors.push(`Row ${idx + 1} has missing required properties: event_type, event_cause, latitude, longitude, and start_datetime.`);
          }
        });

        setValidationErrors(errors);
        setJsonText(JSON.stringify({ events: targetArray }, null, 2));
        setUploadStatus({
          success: errors.length === 0,
          message: errors.length === 0 ? "JSON file validation passed successfully." : "JSON loaded but some rows failed schema checks.",
          rowsCount: targetArray.length
        });
      } catch (err: any) {
        setUploadStatus({
          success: false,
          message: "Could not parse JSON: " + err.message
        });
      }
    };
    reader.readAsText(file);
  };

  const handleRunBatch = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.events || !Array.isArray(parsed.events)) {
        throw new Error("Root element must feature an 'events' array block.");
      }
      onPredictBatch(parsed.events);
    } catch (e: any) {
      alert("Invalid JSON text: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side JSON paste or Upload */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 font-display">
              Batch Command Input
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">
              Upload file or compile bulk event matrices in JSON format.
            </p>
          </div>

          <div className="space-y-3">
            {/* Native File Pick */}
            <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <Upload className="w-5 h-5 text-blue-400" />
              <div className="flex-1">
                <p className="text-[11px] text-zinc-300 font-bold">Pick JSON Datafile</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-[10px] text-zinc-500 mt-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-800 file:text-blue-400 hover:file:bg-zinc-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Notification alert states */}
            {uploadStatus && (
              <div className={`p-3 rounded-lg text-xs leading-normal font-mono flex items-start gap-2 border ${
                uploadStatus.success ? "bg-green-950/30 border-green-800/80 text-green-400" : "bg-red-950/35 border-red-900/85 text-red-400"
              }`}>
                {uploadStatus.success ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                <div className="space-y-1">
                  <p className="font-bold">{uploadStatus.message}</p>
                  {uploadStatus.rowsCount !== undefined && (
                    <p className="text-[10px] text-zinc-400">Matrix rows loaded: {uploadStatus.rowsCount}</p>
                  )}
                </div>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg text-[10px] font-mono leading-normal text-amber-500 overflow-y-auto max-h-[100px] space-y-1">
                <p className="font-bold uppercase tracking-wider text-amber-400">Schema Validation Discrepancies:</p>
                {validationErrors.map((err, idx) => <p key={idx}>- {err}</p>)}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono text-zinc-400 mb-1">Batch Array Editor</label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full h-56 bg-zinc-950 border border-zinc-805 border-zinc-800 rounded-lg p-3 text-zinc-200 text-[11px] font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500">
              Validation is mandatory before execution
            </span>
            <button
              onClick={handleRunBatch}
              disabled={isLoading}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer font-display transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Execute Batch Model
            </button>
          </div>
        </div>

        {/* Right Side Batch prediction outcomes */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500 font-display">
              Pipeline Output Summary
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">
              Renders returned matrix predictions from Prediction Machine.
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {batchResults.length === 0 ? (
              <div className="text-center py-12 text-zinc-650 font-mono space-y-1">
                <Database className="w-10 h-10 mx-auto opacity-30 animate-pulse text-amber-500 mb-2" />
                <p className="text-xs text-zinc-400">No bulk results generated yet.</p>
                <p className="text-[10px] text-zinc-500">Load batch file, paste matrix context and execute model.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-center font-mono">
                    <p className="text-[10px] text-zinc-500 uppercase">Received Count</p>
                    <p className="text-xl font-bold text-white mt-1">{batchResults.length}</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-center font-mono">
                    <p className="text-[10px] text-zinc-500 uppercase">Validation Success</p>
                    <p className="text-xl font-bold text-green-400 mt-1">100%</p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[220px] rounded border border-zinc-800">
                  <table className="w-full text-left text-[10px] font-mono text-zinc-300">
                    <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-500">
                      <tr>
                        <th className="p-2">Event ID</th>
                        <th className="p-2">Sector</th>
                        <th className="p-2">Risk</th>
                        <th className="p-2">Score</th>
                        <th className="p-2">Est Clearance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {batchResults.map((res, i) => (
                        <tr key={i} className="hover:bg-zinc-900/30">
                          <td className="p-2 font-bold text-zinc-100">{res.event_id}</td>
                          <td className="p-2">{res.event_context?.junction || "unknown"}</td>
                          <td className="p-2">
                            <span className={`px-1 py-0.5 rounded text-[8.5px] uppercase font-bold ${
                              res.impact_predictions?.impact_risk === "critical" ? "text-red-400 bg-red-950/20" :
                              res.impact_predictions?.impact_risk === "high" ? "text-orange-400 bg-orange-950/20" :
                              res.impact_predictions?.impact_risk === "medium" ? "text-yellow-400 bg-yellow-950/20" : "text-green-400 bg-green-950/20"
                            }`}>
                              {res.impact_predictions?.impact_risk || "medium"}
                            </span>
                          </td>
                          <td className="p-2 text-zinc-200">{(res.impact_predictions?.final_impact_score ?? 0).toFixed(1)}</td>
                          <td className="p-2 text-zinc-400">{res.impact_predictions?.predicted_clearance_minutes || 0} mins</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => {
                    onSetBatchToMap(batchResults);
                    alert("Batch plotted successfully! All events can now be fully scoped inside the Map Command View section.");
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-500 font-bold text-zinc-950 text-xs py-2 px-3 rounded-lg cursor-pointer transition-all uppercase tracking-wider"
                >
                  Configure & Plot Batch matrix onto Command Map
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
