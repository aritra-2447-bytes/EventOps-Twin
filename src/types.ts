export interface SingleEventInput {
  event_id: string;
  event_type: "planned" | "unplanned";
  event_cause: string;
  latitude: number;
  longitude: number;
  endlatitude?: number;
  endlongitude?: number;
  corridor: string;
  police_station: string;
  zone: string;
  junction: string;
  veh_type: string;
  authenticated: "yes" | "no";
  direction: string;
  age_of_truck?: number;
  start_datetime: string;
  description: string;
  maptiler_geocoded?: boolean;
  maptiler_geocoded_query?: string;
}
export interface SimilarEvent {
  id: string;

  event_type: string;
  event_cause: string;

  corridor: string;
  police_station: string;
  junction: string;

  veh_type: string;
  vehicle_group: string;

  priority: string;

  requires_road_closure: boolean;

  ttr_minutes: number | null;
  ttr_bucket: string;

  time_window: string;

  distance_km: number;
  similarity_score: number;
}

export interface SimilarEventMemory {
  similar_events_found: number;
  high_priority_ratio: number;
  closure_ratio: number;
  median_actual_ttr_minutes: number;
  dominant_vehicle_group: string;
  nearest_known_junction: string;
  median_concurrent_corridor_events: number;
  top_similar_events: SimilarEvent[];
}

export interface ImpactPredictions {
  priority_probability: number;
  requires_road_closure_prob: number;
  closure_threshold_used: number;
  closure_recommended: boolean;
  predicted_clearance_minutes: number;
  predicted_clearance_time_bucket: string;
  ttr_bucket_confidence: number;
  long_duration_probability: number;
  long_duration_threshold_used: number;
  long_duration_risk: boolean;
  long_duration_minutes_threshold: number;
  hotspot_score: number;
  network_compounding_score: number;
  base_impact_score: number;
  final_impact_score: number;
  impact_risk: string;
  historical_confidence_score: number;
  raw_model_impact_score: number;
  operational_floor_score: number;
  operational_guardrail_applied: boolean;
  operational_guardrail_reasons: string[];
  hazard_floor_score: number;
  incident_hazard_override_applied: boolean;
  incident_hazard_override_reasons: string[];
  model_full_road_closure_probability: number;
  operational_lane_closure_required: boolean;
  closure_recommendation_source: string;
  data_quality_guardrail_applied: boolean;
  night_shift_guardrail_applied: boolean;
}

export interface NetworkContext {
  affected_junctions: string[];
  concurrent_corridor_events: number;
  concurrent_source: string;
  event_spread_km: number;
  compounding_gridlock_flag: boolean;
  compounding_reason: string;
  bottleneck_index: number;
}

export interface OperationalRecommendations {
  response_intensity: string;
  recommended_officers: number;
  barricading_level: string;
  barricading_detail: string;
  diversion_type: string;
  dispatch_requirement: string[];
  control_unit: string;
  diversion_recommendation: string;
  affected_corridor: string;
  timeline: {
    time: string;
    action: string;
  }[];
}

export interface DataQualityContext {
  data_quality_score: number;
  data_confidence: string;
  ghost_event_flag: boolean;
  missing_or_weak_fields: string[];
  data_quality_notes: string[];
  action_required: boolean;
  required_dispatcher_updates: string[];
}

export interface NightShiftContext {
  time_window: string;
  requires_tow_or_recovery: boolean;
  night_shift_alert: boolean;
  dispatch_latency_risk: string;
  night_shift_note: string;
}
export interface PostEventLearningSchema {
  historical_anomaly_flag: boolean;
  historical_anomaly_reason: string;
  feedback_required: boolean;
  feedback_fields: string[];
}

export interface IncidentHazardContext {
  hazard_score: number;
  hazard_severity: string;
  hazard_flags: {
    overturned_vehicle: boolean;
    lane_blockage: boolean;
    oil_or_fuel_leak: boolean;
    crane_required: boolean;
    tow_required: boolean;
    fire_risk: boolean;
    injury_or_medical: boolean;
    multi_axle_or_heavy: boolean;
    immediate_action: boolean;
    traffic_backup: boolean;
    critical_location: boolean;
    mechanical_immobility: boolean;
    tree_or_debris_blockage: boolean;
  };
  blocked_lanes_estimate: number;
  operational_lane_closure_required: boolean;
  hazard_reasons: string[];
}

export interface PredictionData {
  event_id: string;
  event_context: Record<string, any>;
  impact_predictions: ImpactPredictions;
  network_context: NetworkContext;
  similar_event_memory: SimilarEventMemory;
  operational_recommendations: OperationalRecommendations;
  incident_hazard_context: IncidentHazardContext;
  data_quality_context: DataQualityContext;
  night_shift_context: NightShiftContext;
  post_event_learning: PostEventLearningSchema;
  system_trace: Record<string, any>;
}

export interface PredictionMachineResponse {
  success: boolean;
  message: string;
  data: PredictionData;
  dashboard_runtime?: {
    prediction_source: string;
    parsed_at: string;
  };
}

export interface BatchPredictionInput {
  events: SingleEventInput[];
}

export interface BatchPredictionResponse {
  success: boolean;
  generated_at: string;
  pipeline_used: string;
  total_received: number;
  total_successful: number;
  total_failed: number;
  predictions: PredictionData[];
  errors: any[];
}

export interface PoliceStation {
  station_id: string;
  station_name: string;
  zone: string;
  latitude: number;
  longitude: number;
  total_units: number;
  available_units: number;
  deployed_units: number;
  traffic_personnel_available: number;
  law_order_personnel_available: number;
  special_capabilities: string[];
}

export interface DispatchRecommendation {
  station_id: string;
  station_name: string;
  distance_km: number;
  available_units: number;
  recommended_dispatch_units: number;
  alert_status: "Not Alerted" | "Alert Sent" | "Acknowledged" | "Units Dispatched" | "Arrived";
  reason: string;
}

export interface DispatchResponse {
  human_approval_required: boolean;
  nearest_stations: DispatchRecommendation[];
  recommended_message: string;
}

export interface PostEventFeedback {
  event_id: string;
  actual_clearance_minutes: number;
  actual_road_closure: boolean;
  actual_priority: string;
  actual_manpower_used: number;
  recommendation_accepted: boolean;
  operator_comment: string;
  timestamp: string;
  status?: string;
  resolved?: boolean;
}
