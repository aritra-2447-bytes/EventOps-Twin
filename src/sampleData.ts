import { SingleEventInput } from "./types";

export const sampleCriticalEvent: SingleEventInput = {
  event_id: "TEST_001_CRITICAL",
  event_type: "unplanned",
  event_cause: "accident",
  latitude: 13.0400041,
  longitude: 77.5180991,
  endlatitude: 0.0,
  endlongitude: 0.0,
  corridor: "Tumkur Road",
  police_station: "Peenya",
  zone: "North",
  junction: "Jalahalli Cross",
  veh_type: "heavy_vehicle",
  authenticated: "yes",
  direction: "outbound",
  age_of_truck: 12,
  start_datetime: "2026-06-18T18:30:00Z",
  description: "Multi-axle truck carrying cement bags overturned at Jalahalli Cross junction. Smashed lane divider. Massive concrete chunks and oil leakage spanning three out of four lanes outbound. Crane and ambulance required immediately, hazard potential is high."
};

export const sampleRoutineEvent: SingleEventInput = {
  event_id: "TEST_002_ROUTINE",
  event_type: "unplanned",
  event_cause: "vehicle_breakdown",
  latitude: 12.9279,
  longitude: 77.6271,
  endlatitude: 0.0,
  endlongitude: 0.0,
  corridor: "non_corridor",
  police_station: "Koramangala",
  zone: "South-East",
  junction: "Sony World Signal",
  veh_type: "private_car",
  authenticated: "yes",
  direction: "inbound",
  age_of_truck: -1,
  start_datetime: "2026-06-18T13:30:00Z",
  description: "A private sedan has broken down on the left curve of Sony World Signal. Minor bottleneck created but vehicles can filter cleanly. Driver waiting for towing logistics, no injuries."
};

export const sampleGhostEvent: SingleEventInput = {
  event_id: "TEST_003_GHOST",
  event_type: "unplanned",
  event_cause: "unknown",
  latitude: 12.9716,
  longitude: 77.5946,
  endlatitude: 0.0,
  endlongitude: 0.0,
  corridor: "unknown",
  police_station: "unknown",
  zone: "unknown",
  junction: "unknown",
  veh_type: "unknown",
  authenticated: "no",
  direction: "unknown",
  age_of_truck: -1,
  start_datetime: "2026-06-18T18:30:00Z",
  description: "Weak or conflicting anonymous reporting of potential minor roadblock. No vehicle detail, unconfirmed location on core corridor link."
};

// Default setup cases for batch view JSON editor
export const defaultBatchInput = {
  events: [
    {
      event_id: "BATCH_EV_001",
      event_type: "unplanned",
      event_cause: "accident",
      latitude: 13.0400041,
      longitude: 77.5180991,
      endlatitude: 0.0,
      endlongitude: 0.0,
      corridor: "Tumkur Road",
      police_station: "Peenya",
      zone: "North",
      junction: "Jalahalli Cross",
      veh_type: "heavy_vehicle",
      authenticated: "yes",
      direction: "outbound",
      age_of_truck: 12,
      start_datetime: "2026-06-18T02:15:00Z",
      description: "HGV overturned blocking three lanes. Fire risk from leaking fuel, ambulance and heavy recovery crane required immediately."
    },
    {
      event_id: "BATCH_EV_002",
      event_type: "unplanned",
      event_cause: "vehicle_breakdown",
      latitude: 12.9279,
      longitude: 77.6271,
      endlatitude: 0.0,
      endlongitude: 0.0,
      corridor: "non_corridor",
      police_station: "Koramangala",
      zone: "South-East",
      junction: "Sony World Signal",
      veh_type: "private_car",
      authenticated: "yes",
      direction: "inbound",
      age_of_truck: -1,
      start_datetime: "2026-04-15T13:30:00Z",
      description: "Minor breakdown on the left side. Driver waiting for local mechanic."
    },
    {
      event_id: "BATCH_EV_003",
      event_type: "unplanned",
      event_cause: "unknown",
      latitude: 12.9716,
      longitude: 77.5946,
      corridor: "unknown",
      police_station: "unknown",
      zone: "unknown",
      junction: "unknown",
      veh_type: "unknown",
      authenticated: "no",
      direction: "unknown",
      age_of_truck: -1,
      start_datetime: "2026-06-18T18:30:00Z",
      description: ""
    }
  ]
};
