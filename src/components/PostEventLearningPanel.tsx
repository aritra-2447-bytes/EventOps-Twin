import React, { useState } from "react";
import { PostEventFeedback, PredictionData } from "../types";
import { Award, CheckCircle, HelpCircle, Save, Star } from "lucide-react";

interface PostEventLearningPanelProps {
  prediction: PredictionData | null;
  savedFeedback: PostEventFeedback[];
  onSaveFeedback: (feedback: PostEventFeedback) => void;
}

export default function PostEventLearningPanel({
  prediction,
  savedFeedback,
  onSaveFeedback
}: PostEventLearningPanelProps) {
  const [justResolvedId, setJustResolvedId] = useState<string | null>(null);
  const [justResolvedText, setJustResolvedText] = useState<string>("");

  // Form State
  const [clearanceMins, setClearanceMins] = useState<number>(
    prediction?.impact_predictions?.predicted_clearance_minutes || 45
  );
  const [roadClosure, setRoadClosure] = useState<boolean>(
    prediction?.impact_predictions?.closure_recommended || false
  );
  const [priority, setPriority] = useState<string>("high");
  const [manpower, setManpower] = useState<number>(
    prediction?.operational_recommendations?.manpower_recommendation || 3
  );
  const [accepted, setAccepted] = useState<boolean>(true);
  const [comment, setComment] = useState<string>("");
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Sync states on prediction change
  React.useEffect(() => {
    if (prediction) {
      setClearanceMins(prediction.impact_predictions?.predicted_clearance_minutes || 45);
      setRoadClosure(prediction.impact_predictions?.closure_recommended || false);
      setPriority("high");
      setManpower(prediction.operational_recommendations?.manpower_recommendation || 3);
      setAccepted(true);
      setComment("");
      setIsSaved(false);
      setJustResolvedId(null);
    }
  }, [prediction]);

  if (!prediction) {
    if (justResolvedId) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-emerald-800 rounded-xl bg-emerald-950/20 max-w-2xl mx-auto space-y-4 animate-fade-in">
          <CheckCircle className="w-12 h-12 text-emerald-400" />
          <div>
            <p className="text-emerald-400 font-bold text-sm uppercase font-mono tracking-wider">
              Feedback Loop Closed / Incident Resolved
            </p>
            <p className="text-[11px] text-zinc-500 font-mono mt-1">
              Case Identifier: <strong className="text-zinc-300 font-bold">{justResolvedId}</strong>
            </p>
          </div>
          <p className="text-zinc-300 text-xs mt-2 max-w-md font-mono leading-relaxed">
            This incident has been removed from the active map layers and batch registry.
            The actual clearance metrics and ground-truth comments have been indexed into our local feedback registry.
          </p>
          {justResolvedText && (
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded text-zinc-400 italic text-[11px] text-left max-w-md w-full font-mono">
              "{justResolvedText}"
            </div>
          )}
          <button
            onClick={() => setJustResolvedId(null)}
            className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-[11px] px-4 py-2 rounded-lg transition-colors cursor-pointer border border-emerald-500/30"
          >
            Acknowledge & Continue
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
        <HelpCircle className="w-10 h-10 text-zinc-600 mb-3" />
        <p className="text-zinc-400 font-medium text-sm">No Resolved Incident Selected</p>
        <p className="text-zinc-650 text-xs mt-1 max-w-sm">
          Please run a prediction or select a historical case from the active roster first to initiate operator feedback.
        </p>
      </div>
    );
  }

  const { event_id, post_event_learning } = prediction;
  const fields = post_event_learning?.feedback_fields || [
    "actual_clearance_minutes",
    "actual_road_closure",
    "actual_priority",
    "actual_manpower_used",
    "recommendation_accepted",
    "operator_comment"
  ];

  // Find if this event already has feedback
  const existingFeedback = savedFeedback.find((f) => f.event_id === event_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: PostEventFeedback = {
      event_id,
      actual_clearance_minutes: clearanceMins,
      actual_road_closure: roadClosure,
      actual_priority: priority,
      actual_manpower_used: manpower,
      recommendation_accepted: accepted,
      operator_comment: comment,
      timestamp: new Date().toISOString()
    };
    setJustResolvedId(event_id);
    setJustResolvedText(comment);
    onSaveFeedback(entry);
    setIsSaved(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Feedback Form */}
      <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 font-display">
              Post-Event Cognitive Feedback Loop
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">
              Capturing feedback for Event ID: <span className="text-zinc-300 font-bold">{event_id}</span>
            </p>
          </div>
          <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-blue-400 font-mono px-2 py-0.5 rounded">
            Manual Audit
          </span>
        </div>

        {isSaved && (
          <div className="bg-green-950/45 border border-green-800 p-3 rounded-lg text-xs text-green-400 font-mono flex items-center gap-1.5 animate-pulse">
            <CheckCircle className="w-4 h-4" />
            Case marked as RESOLVED and permanently removed from the active live roster. Feedback saved successfully.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.includes("actual_clearance_minutes") && (
              <div>
                <label className="block text-zinc-400 mb-1">Actual Clearance Time (minutes)</label>
                <input
                  type="number"
                  value={clearanceMins}
                  onChange={(e) => setClearanceMins(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            {fields.includes("actual_manpower_used") && (
              <div>
                <label className="block text-zinc-400 mb-1">Actual Manpower Deployed</label>
                <input
                  type="number"
                  value={manpower}
                  onChange={(e) => setManpower(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            {fields.includes("actual_priority") && (
              <div>
                <label className="block text-zinc-400 mb-1">Observed Severity Tier</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none"
                >
                  <option value="critical">Critical Impact</option>
                  <option value="high">High Squeeze</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low Routine</option>
                </select>
              </div>
            )}

            {fields.includes("recommendation_accepted") && (
              <div>
                <label className="block text-zinc-400 mb-1">ML Directives Accepted?</label>
                <select
                  value={accepted ? "yes" : "no"}
                  onChange={(e) => setAccepted(e.target.value === "yes")}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none"
                >
                  <option value="yes">Yes - Adhered Strictly</option>
                  <option value="no">No - Modified on Site</option>
                </select>
              </div>
            )}

            {fields.includes("actual_road_closure") && (
              <div className="sm:col-span-2 flex items-center gap-2 bg-zinc-950/60 p-2.5 rounded border border-zinc-800/80">
                <input
                  type="checkbox"
                  id="actual_road_closure"
                  checked={roadClosure}
                  onChange={(e) => setRoadClosure(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="actual_road_closure" className="text-zinc-350 cursor-pointer select-none">
                  A force closure of sector was actually instituted by ground team
                </label>
              </div>
            )}
          </div>

          {fields.includes("operator_comment") && (
            <div>
              <label className="block text-zinc-400 mb-1">Post-Incident Operator Comments</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Incident resolution context, crane delay notes, etc."
                className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-slate-950 font-bold py-2.5 px-3 rounded-lg cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" /> Save Feedback
          </button>
        </form>
        </div>

        {/* Existing local database registry */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-1 text-zinc-300 font-bold text-xs uppercase font-mono">
            <Star className="w-4 h-4 text-blue-400" /> Ground Feedback Store ({savedFeedback.length})
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {savedFeedback.length === 0 ? (
              <p className="text-[10px] text-zinc-500 font-mono italic">No archived historical operator feedback records stored.</p>
            ) : (
              [...savedFeedback].reverse().map((f, i) => (
                <div key={i} className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-lg text-[11px] font-mono space-y-1">
                  <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-900 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-400">{f.event_id}</span>
                      <span className="bg-green-950/80 border border-green-800 text-green-400 text-[8px] px-1 py-0.2 rounded font-sans uppercase font-bold">RESOLVED</span>
                    </div>
                    <span>{new Date(f.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-zinc-300">
                    <div>Act. Clearance: <strong>{f.actual_clearance_minutes}m</strong></div>
                    <div>Manpower: <strong>{f.actual_manpower_used}</strong></div>
                    <div>Rec Accepted: <strong>{f.recommendation_accepted ? "YES" : "NO"}</strong></div>
                    <div>Closure: <strong>{f.actual_road_closure ? "YES" : "NO"}</strong></div>
                  </div>
                  <p className="text-zinc-450 italic mt-1 border-t border-zinc-900 pt-1 text-[10px]">
                    "{f.operator_comment}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  );
}
