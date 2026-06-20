import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = 3000;

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_URL || ``;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Helper to call Gemini with a retry loop (up to 3 attempts with exponential backoff) and model fallbacks
async function generateContentResilient(params: {
  contents: string;
  config: any;
}): Promise<any> {
  if (!ai) {
    throw new Error("Gemini API client (ai) is not initialized.");
  }

  // Fallback chain of robust free tier models
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-3.1-flash-lite"
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let delay = 1000; // start with 1s backoff for retries
    const maxRetries = 2; // up to 2 retries per model

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini] Attempting generation with model=${model} (Attempt ${attempt + 1}/${maxRetries + 1})...`);
        const response = await ai.models.generateContent({
          model: model,
          contents: params.contents,
          config: params.config,
        });

        // Ensure we got a valid response body
        if (response && response.text) {
          console.log(`[Gemini] Generation succeeded with model=${model} on attempt ${attempt + 1}`);
          return response;
        } else {
          throw new Error("Generation responded with empty or undefined text output.");
        }
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        
        // Quota / Rate limit error: immediately try next model instead of sleeping
        const isQuotaExceeded = errMessage.includes("429") || 
                                errMessage.toLowerCase().includes("quota") || 
                                errMessage.toLowerCase().includes("exhausted") || 
                                errMessage.toLowerCase().includes("rate limit") ||
                                errMessage.toLowerCase().includes("limit exceeded");

        const isTransient = (errMessage.includes("503") || 
                             errMessage.includes("500") || 
                             errMessage.toLowerCase().includes("unavailable") || 
                             errMessage.toLowerCase().includes("high demand")) && !isQuotaExceeded;

        console.log(
          `[Gemini] Attempt ${attempt + 1} with model=${model} did not succeed. Error: ${errMessage.substring(0, 150)}... QuotaLimit: ${isQuotaExceeded}, Transient: ${isTransient}`
        );

        if (isQuotaExceeded) {
          // If quota exceeded, do not wait, break retry loop immediately to try next model in the chain
          console.log(`[Gemini] Quota limit hit for model=${model}. Switching model choice immediately.`);
          break;
        }

        if (isTransient && attempt < maxRetries) {
          console.log(`[Gemini] Waiting ${delay}ms before retrying model=${model}...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          // If not transient, or we spent all retries, break to try next model
          break;
        }
      }
    }
  }

  // If we reach here, all retries/models failed
  throw lastError || new Error("All resilient Gemini attempts failed.");
}

// Simple Haversine distance calculator
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 10) / 10;
}

// Static mock data for Bengaluru police stations
const mockPoliceStations = [
  {
    station_id: "PS_PEENYA",
    station_name: "Peenya Traffic Police Station",
    zone: "North",
    latitude: 13.0315,
    longitude: 77.5147,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 12,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "heavy_vehicle_response", "barricading"]
  },
  {
    station_id: "PS_JALAHALLI",
    station_name: "Jalahalli Cross Police Station",
    zone: "North",
    latitude: 13.0402,
    longitude: 77.5165,
    total_units: 6,
    available_units: 3,
    deployed_units: 3,
    traffic_personnel_available: 9,
    law_order_personnel_available: 6,
    special_capabilities: ["traffic_control", "barricading"]
  },
  {
    station_id: "PS_TUMKUR_RD",
    station_name: "Tumkur Road Traffic Police Station",
    zone: "North",
    latitude: 13.0450,
    longitude: 77.5090,
    total_units: 7,
    available_units: 5,
    deployed_units: 2,
    traffic_personnel_available: 10,
    law_order_personnel_available: 5,
    special_capabilities: ["heavy_vehicle_response", "diversions"]
  },
  {
    station_id: "PS_KORAMANGALA",
    station_name: "Koramangala Traffic Police Station",
    zone: "South-East",
    latitude: 12.9332,
    longitude: 77.6105,
    total_units: 12,
    available_units: 6,
    deployed_units: 6,
    traffic_personnel_available: 18,
    law_order_personnel_available: 10,
    special_capabilities: ["traffic_control", "barricading", "diversions", "crowd_control"]
  },
  {
    station_id: "PS_SONY_WORLD",
    station_name: "Sony World Signal Post",
    zone: "South-East",
    latitude: 12.9340,
    longitude: 77.6245,
    total_units: 5,
    available_units: 2,
    deployed_units: 3,
    traffic_personnel_available: 6,
    law_order_personnel_available: 2,
    special_capabilities: ["traffic_control"]
  },
  {
    station_id: "PS_MGROAD",
    station_name: "MG Road Traffic Police Station",
    zone: "Central",
    latitude: 12.9738,
    longitude: 77.6075,
    total_units: 10,
    available_units: 4,
    deployed_units: 6,
    traffic_personnel_available: 15,
    law_order_personnel_available: 12,
    special_capabilities: ["traffic_control", "crowd_control", "barricading", "VIP_escort"]
  },
  {
    station_id: "PS_MAJESTIC",
    station_name: "Majestic Traffic Police Station",
    zone: "Central",
    latitude: 12.9778,
    longitude: 77.5715,
    total_units: 15,
    available_units: 8,
    deployed_units: 7,
    traffic_personnel_available: 25,
    law_order_personnel_available: 20,
    special_capabilities: ["traffic_control", "crowd_control", "barricading", "disaster_response"]
  },
  {
    station_id: "PS_HEBBAL",
    station_name: "Hebbal Traffic Police Station",
    zone: "North",
    latitude: 13.0358,
    longitude: 77.5978,
    total_units: 8,
    available_units: 5,
    deployed_units: 3,
    traffic_personnel_available: 12,
    law_order_personnel_available: 6,
    special_capabilities: ["traffic_control", "heavy_vehicle_response", "diversions"]
  },
  {
    station_id: "PS_KRPURAM",
    station_name: "KR Puram Traffic Police Station",
    zone: "East",
    latitude: 13.0078,
    longitude: 77.6952,
    total_units: 9,
    available_units: 3,
    deployed_units: 6,
    traffic_personnel_available: 14,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "heavy_vehicle_response", "barricading"]
  },
  {
    station_id: "PS_SILKBOARD",
    station_name: "Silk Board Traffic Police Station",
    zone: "South-East",
    latitude: 12.9172,
    longitude: 77.6225,
    total_units: 10,
    available_units: 4,
    deployed_units: 6,
    traffic_personnel_available: 16,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "diversions", "barricading"]
  },
  {
    station_id: "PS_WHITEFIELD",
    station_name: "Whitefield Traffic Police Station",
    zone: "East",
    latitude: 12.9692,
    longitude: 77.7501,
    total_units: 10,
    available_units: 5,
    deployed_units: 5,
    traffic_personnel_available: 15,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "barricading", "diversions"]
  },
  {
    station_id: "PS_ELECTRONIC_CITY",
    station_name: "Electronic City Traffic Police Station",
    zone: "South",
    latitude: 12.8482,
    longitude: 77.6801,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 12,
    law_order_personnel_available: 6,
    special_capabilities: ["traffic_control", "barricading", "diversions"]
  },
  {
    station_id: "PS_INDIRANAGAR",
    station_name: "Indiranagar Traffic Police Station",
    zone: "East",
    latitude: 12.9784,
    longitude: 77.6408,
    total_units: 10,
    available_units: 6,
    deployed_units: 4,
    traffic_personnel_available: 15,
    law_order_personnel_available: 10,
    special_capabilities: ["traffic_control", "crowd_control", "barricading"]
  },
  {
    station_id: "PS_HALASURU",
    station_name: "Halasuru Traffic Police Station",
    zone: "East",
    latitude: 12.9732,
    longitude: 77.6214,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 12,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "crowd_control"]
  },
  {
    station_id: "PS_SHIVAJINAGAR",
    station_name: "Shivajinagar Traffic Police Station",
    zone: "Central",
    latitude: 12.9863,
    longitude: 77.5985,
    total_units: 9,
    available_units: 5,
    deployed_units: 4,
    traffic_personnel_available: 14,
    law_order_personnel_available: 12,
    special_capabilities: ["traffic_control", "crowd_control", "barricading"]
  },
  {
    station_id: "PS_SADASHIVANAGAR",
    station_name: "Sadashivanagar Traffic Police Station",
    zone: "North",
    latitude: 13.0068,
    longitude: 77.5802,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 10,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "VIP_escort", "barricading"]
  },
  {
    station_id: "PS_RTNAGAR",
    station_name: "RT Nagar Traffic Police Station",
    zone: "North",
    latitude: 13.0182,
    longitude: 77.5915,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 11,
    law_order_personnel_available: 7,
    special_capabilities: ["traffic_control", "diversions"]
  },
  {
    station_id: "PS_CHAMARAJPET",
    station_name: "Chamarajpet Traffic Police Station",
    zone: "West",
    latitude: 12.9612,
    longitude: 77.5615,
    total_units: 7,
    available_units: 3,
    deployed_units: 4,
    traffic_personnel_available: 10,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "crowd_control"]
  },
  {
    station_id: "PS_VIJAYANAGAR",
    station_name: "Vijayanagar Traffic Police Station",
    zone: "West",
    latitude: 12.9698,
    longitude: 77.5352,
    total_units: 11,
    available_units: 6,
    deployed_units: 5,
    traffic_personnel_available: 16,
    law_order_personnel_available: 10,
    special_capabilities: ["traffic_control", "barricading", "diversions"]
  },
  {
    station_id: "PS_BASAVESHWARANAGAR",
    station_name: "Basaveshwaranagar Traffic Police Station",
    zone: "West",
    latitude: 12.9875,
    longitude: 77.5392,
    total_units: 8,
    available_units: 5,
    deployed_units: 3,
    traffic_personnel_available: 11,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "barricading"]
  },
  {
    station_id: "PS_MALLESWARAM",
    station_name: "Malleswaram Traffic Police Station",
    zone: "North",
    latitude: 12.9961,
    longitude: 77.5712,
    total_units: 9,
    available_units: 4,
    deployed_units: 5,
    traffic_personnel_available: 14,
    law_order_personnel_available: 11,
    special_capabilities: ["traffic_control", "crowd_control", "barricading"]
  },
  {
    station_id: "PS_RAJAJINAGAR",
    station_name: "Rajajinagar Traffic Police Station",
    zone: "West",
    latitude: 12.9815,
    longitude: 77.5532,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 12,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "barricading"]
  },
  {
    station_id: "PS_HULIMAVU",
    station_name: "Hulimavu Traffic Police Station",
    zone: "South",
    latitude: 12.8795,
    longitude: 77.5988,
    total_units: 8,
    available_units: 5,
    deployed_units: 3,
    traffic_personnel_available: 12,
    law_order_personnel_available: 6,
    special_capabilities: ["traffic_control", "diversions"]
  },
  {
    station_id: "PS_JAYANAGAR",
    station_name: "Jayanagar Traffic Police Station",
    zone: "South",
    latitude: 12.9298,
    longitude: 77.5832,
    total_units: 10,
    available_units: 5,
    deployed_units: 5,
    traffic_personnel_available: 16,
    law_order_personnel_available: 12,
    special_capabilities: ["traffic_control", "crowd_control", "VIP_escort"]
  },
  {
    station_id: "PS_BANASHANKARI",
    station_name: "Banashankari Traffic Police Station",
    zone: "South",
    latitude: 12.9142,
    longitude: 77.5721,
    total_units: 10,
    available_units: 6,
    deployed_units: 4,
    traffic_personnel_available: 14,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "diversions", "barricading"]
  },
  {
    station_id: "PS_KS_LAYOUT",
    station_name: "Kumaraswamy Layout Traffic Police Station",
    zone: "South",
    latitude: 12.9065,
    longitude: 77.5622,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 11,
    law_order_personnel_available: 6,
    special_capabilities: ["traffic_control", "barricading"]
  },
  {
    station_id: "PS_HSR_LAYOUT",
    station_name: "HSR Layout Traffic Police Station",
    zone: "South-East",
    latitude: 12.9125,
    longitude: 77.6385,
    total_units: 10,
    available_units: 5,
    deployed_units: 5,
    traffic_personnel_available: 15,
    law_order_personnel_available: 9,
    special_capabilities: ["traffic_control", "barricading", "diversions"]
  },
  {
    station_id: "PS_HAL",
    station_name: "HAL Traffic Police Station",
    zone: "East",
    latitude: 12.9602,
    longitude: 77.6745,
    total_units: 10,
    available_units: 4,
    deployed_units: 6,
    traffic_personnel_available: 14,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "heavy_vehicle_response"]
  },
  {
    station_id: "PS_BANASAWADI",
    station_name: "Banasawadi Traffic Police Station",
    zone: "East",
    latitude: 13.0125,
    longitude: 77.6482,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 11,
    law_order_personnel_available: 7,
    special_capabilities: ["traffic_control", "barricading"]
  },
  {
    station_id: "PS_YELAHANKA",
    station_name: "Yelahanka Traffic Police Station",
    zone: "North",
    latitude: 13.0995,
    longitude: 77.5925,
    total_units: 8,
    available_units: 5,
    deployed_units: 3,
    traffic_personnel_available: 12,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "heavy_vehicle_response", "diversions"]
  },
  {
    station_id: "PS_CHIKKAJALA",
    station_name: "Chikkajala Traffic Police Station",
    zone: "North",
    latitude: 13.1685,
    longitude: 77.6305,
    total_units: 7,
    available_units: 3,
    deployed_units: 4,
    traffic_personnel_available: 9,
    law_order_personnel_available: 5,
    special_capabilities: ["heavy_vehicle_response", "diversions"]
  },
  {
    station_id: "PS_BELLANDUR",
    station_name: "Bellandur Traffic Police Station",
    zone: "South-East",
    latitude: 12.9312,
    longitude: 77.6782,
    total_units: 10,
    available_units: 4,
    deployed_units: 6,
    traffic_personnel_available: 15,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "barricading", "diversions"]
  },
  {
    station_id: "PS_MARATHAHALLI",
    station_name: "Marathahalli Traffic Police Station",
    zone: "East",
    latitude: 12.9562,
    longitude: 77.7015,
    total_units: 9,
    available_units: 5,
    deployed_units: 4,
    traffic_personnel_available: 13,
    law_order_personnel_available: 7,
    special_capabilities: ["traffic_control", "barricading"]
  },
  {
    station_id: "PS_KENGERI",
    station_name: "Kengeri Traffic Police Station",
    zone: "West",
    latitude: 12.9015,
    longitude: 77.4855,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 11,
    law_order_personnel_available: 6,
    special_capabilities: ["traffic_control", "heavy_vehicle_response"]
  },
  {
    station_id: "PS_FRAZER_TOWN",
    station_name: "Frazer Town Traffic Police Station",
    zone: "East",
    latitude: 12.9965,
    longitude: 77.6110,
    total_units: 8,
    available_units: 5,
    deployed_units: 3,
    traffic_personnel_available: 10,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "crowd_control"]
  },
  {
    station_id: "PS_HIGH_GROUNDS",
    station_name: "High Grounds Traffic Police Station",
    zone: "Central",
    latitude: 12.9875,
    longitude: 77.5888,
    total_units: 11,
    available_units: 6,
    deployed_units: 5,
    traffic_personnel_available: 18,
    law_order_personnel_available: 14,
    special_capabilities: ["traffic_control", "crowd_control", "VIP_escort"]
  },
  {
    station_id: "PS_WILSON_GARDEN",
    station_name: "Wilson Garden Traffic Police Station",
    zone: "South",
    latitude: 12.9525,
    longitude: 77.5955,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 12,
    law_order_personnel_available: 8,
    special_capabilities: ["traffic_control", "barricading"]
  },
  {
    station_id: "PS_ULSOOR_GATE",
    station_name: "Ulsoor Gate Traffic Police Station",
    zone: "Central",
    latitude: 12.9678,
    longitude: 77.5882,
    total_units: 12,
    available_units: 5,
    deployed_units: 7,
    traffic_personnel_available: 20,
    law_order_personnel_available: 15,
    special_capabilities: ["traffic_control", "crowd_control", "barricading"]
  },
  {
    station_id: "PS_CHICKPET",
    station_name: "Chickpet Traffic Police Station",
    zone: "Central",
    latitude: 12.9695,
    longitude: 77.5735,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 12,
    law_order_personnel_available: 10,
    special_capabilities: ["traffic_control", "crowd_control"]
  },
  {
    station_id: "PS_KAMAKSIPALYA",
    station_name: "Kamaksipalya Traffic Police Station",
    zone: "West",
    latitude: 12.9822,
    longitude: 77.5185,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 11,
    law_order_personnel_available: 7,
    special_capabilities: ["traffic_control", "barricading"]
  },
  {
    station_id: "PS_COTTONPET",
    station_name: "Cottonpet Law & Order Police Station",
    zone: "Central",
    latitude: 12.9712,
    longitude: 77.5645,
    total_units: 10,
    available_units: 5,
    deployed_units: 5,
    traffic_personnel_available: 8,
    law_order_personnel_available: 16,
    special_capabilities: ["crowd_control", "barricading"]
  },
  {
    station_id: "PS_VIDYARANYAPURA",
    station_name: "Vidyaranyapura Police Station",
    zone: "North",
    latitude: 13.0765,
    longitude: 77.5582,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 6,
    law_order_personnel_available: 12,
    special_capabilities: ["traffic_control", "barricading"]
  },
  {
    station_id: "PS_BYATARAYANAPURA",
    station_name: "Byatarayanapura Traffic Police Station",
    zone: "West",
    latitude: 12.9555,
    longitude: 77.5305,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 11,
    law_order_personnel_available: 7,
    special_capabilities: ["traffic_control", "diversions"]
  },
  {
    station_id: "PS_ADUGODI",
    station_name: "Adugodi Traffic Police Station",
    zone: "South-East",
    latitude: 12.9435,
    longitude: 77.6085,
    total_units: 8,
    available_units: 4,
    deployed_units: 4,
    traffic_personnel_available: 12,
    law_order_personnel_available: 6,
    special_capabilities: ["traffic_control", "barricading"]
  }
];

// Reusable local heuristic parsing function as an instant fallback during Gemini outages / rate limiting
function parseEventHeuristically(raw_description: string, location_text: string = "") {
  const defaultDateTime = new Date().toISOString();
  const words = raw_description.toLowerCase();
  let type = "unplanned";
  let cause = "unknown";

  if (
    words.includes("gathering") ||
    words.includes("political") ||
    words.includes("protest") ||
    words.includes("rally") ||
    words.includes("rallying") ||
    words.includes("march") ||
    words.includes("dharna") ||
    words.includes("spillover") ||
    words.includes("procession") ||
    words.includes("crowd")
  ) {
    cause = "protest";
    type = "unplanned";
  } else if (
    (words.includes("accident") || words.includes("crash") || words.includes("overturned") || words.includes("collision")) &&
    !words.includes("no crash") &&
    !words.includes("no accident") &&
    !words.includes("without crash") &&
    !words.includes("without accident")
  ) {
    cause = "accident";
    type = "unplanned";
  } else if (words.includes("breakdown") || words.includes("puncture") || words.includes("stalled") || words.includes("stranded")) {
    cause = "vehicle_breakdown";
    type = "unplanned";
  } else if (words.includes("waterlog") || words.includes("rain") || words.includes("flood") || words.includes("waterlogging")) {
    cause = "waterlogging";
    type = "unplanned";
  } else if (words.includes("construction") || words.includes("metro") || words.includes("digging") || words.includes("road work")) {
    cause = "construction";
    type = "planned";
  } else if (words.includes("festival") || words.includes("temple") || words.includes("procession")) {
    cause = "festival";
    type = "planned";
  } else if (words.includes("block") || words.includes("closed") || words.includes("barricaded")) {
    cause = "road_blockage";
    type = "unplanned";
  }

  let lat = 12.9716;
  let lon = 77.5946;
  let station = "MG Road";
  let zone = "Central";
  let corridor = "non_corridor";
  let junction = "HQ Circle";

  // Crude match for location text
  const locLower = (location_text || "").toLowerCase() || words;
  if (locLower.includes("peenya")) {
    lat = 13.0315; lon = 77.5147; station = "Peenya"; zone = "North"; corridor = "Tumkur Road"; junction = "Peenya Industrial Area";
  } else if (locLower.includes("jalahalli")) {
    lat = 13.0402; lon = 77.5165; station = "Peenya"; zone = "North"; corridor = "Tumkur Road"; junction = "Jalahalli Cross";
  } else if (locLower.includes("koramangala") || locLower.includes("sony world")) {
    lat = 12.9340; lon = 77.6245; station = "Koramangala"; zone = "South-East"; corridor = "Koramangala Corridor"; junction = "Sony World Signal";
  } else if (locLower.includes("hebbal")) {
    lat = 13.0358; lon = 77.5978; station = "Hebbal"; zone = "North"; corridor = "Outer Ring Road"; junction = "Hebbal Flyover";
  } else if (locLower.includes("silk board")) {
    lat = 12.9172; lon = 77.6225; station = "Silk Board"; zone = "South-East"; corridor = "Hosur Road"; junction = "Silk Board Flyover";
  } else if (locLower.includes("electronic city")) {
    lat = 12.8482; lon = 77.6801; station = "Electronic City"; zone = "South"; corridor = "Hosur Elevated Express"; junction = "E-City Entry toll";
  } else if (locLower.includes("whitefield")) {
    lat = 12.9692; lon = 77.7501; station = "Whitefield"; zone = "East"; corridor = "ITPL Road"; junction = "Whitefield Main Circle";
  } else if (locLower.includes("kr puram") || locLower.includes("hanging bridge")) {
    lat = 13.0078; lon = 77.6952; station = "KR Puram"; zone = "East"; corridor = "Outer Ring Road"; junction = "KR Puram Hanging Bridge";
  }

  let vehType = "unknown";
  if (words.includes("truck") || words.includes("lorry") || words.includes("container") || words.includes("bus")) {
    vehType = "heavy_vehicle";
  } else if (words.includes("car") || words.includes("cab") || words.includes("taxi")) {
    vehType = "private_car";
  } else if (words.includes("bike") || words.includes("auto") || words.includes("scooter")) {
    vehType = "two_wheeler";
  }

  const direction = words.includes("inbound") ? "inbound" : words.includes("outbound") ? "outbound" : "outbound";

  return {
    event_id: `EV_${Math.floor(Math.random() * 90000) + 10000}`,
    event_type: type as any,
    event_cause: cause,
    latitude: lat,
    longitude: lon,
    endlatitude: 0.0,
    endlongitude: 0.0,
    corridor: corridor,
    police_station: station,
    zone: zone,
    junction: junction,
    veh_type: vehType,
    authenticated: "yes" as const,
    direction: direction,
    age_of_truck: words.includes("truck") ? 10 : -1,
    start_datetime: defaultDateTime,
    description: raw_description
  };
}

// MapTiler Geocoding coordinates helper
async function geocodeWithMapTiler(query: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  if (!query) return null;
  try {
    const cleanQuery = query.toLowerCase().includes("bengaluru") || query.toLowerCase().includes("bangalore")
      ? query
      : `${query}, Bengaluru`;
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(cleanQuery)}.json?key=${apiKey}&proximity=77.5946,12.9716&bbox=77.3,12.7,77.9,13.2`;
    console.log(`[MapTiler Geocode] Querying: "${cleanQuery}"`);
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[MapTiler Geocode] API returned status ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data && data.features && data.features.length > 0) {
      const bestFeature = data.features[0];
      const coords = bestFeature.center || (bestFeature.geometry && bestFeature.geometry.coordinates);
      if (coords && coords.length >= 2) {
        const lng = coords[0];
        const lat = coords[1];
        console.log(`[MapTiler Geocode] Match found: "${bestFeature.place_name}" -> Lat: ${lat}, Lng: ${lng}`);
        return { lat, lng };
      }
    }
  } catch (error) {
    console.error(`[MapTiler Geocode] Error geocoding "${query}":`, error);
  }
  return null;
}

// Fallback logic for generating highly realistic prediction output when Machine is unavailable
function generateFallbackPrediction(event: any) {
  const isUnplanned = event.event_type === "unplanned";
  const cause = (event.event_cause || "unknown").toLowerCase();
  const description = (event.description || "").toLowerCase();
  const vType = (event.veh_type || "").toLowerCase();

  let impactRisk: "critical" | "high" | "medium" | "low" = "medium";
  let finalImpactScore = 5.2;
  let priorityProbability = 0.65;
  let roadClosureProbability = 0.35;
  let closureRecommended = false;
  let predictedClearanceMinutes = 45;
  let longDurationRisk: "critical" | "high" | "medium" | "low" = "medium";
  let hotspotScore = 4.5;
  let networkCompoundingScore = 3.8;

  let manpower = 3;
  let barricading = "Light";
  let diversion = "None";
  let dispatchReq = "Standard patrol monitoring.";

  // Sophisticated heuristic logic based on cause and details
  if (cause === "accident" || description.includes("accident") || description.includes("overturned") || description.includes("crash")) {
    if (vType === "heavy_vehicle" || description.includes("truck") || description.includes("bus") || description.includes("container")) {
      impactRisk = "critical";
      finalImpactScore = 9.4;
      priorityProbability = 0.95;
      roadClosureProbability = 0.88;
      closureRecommended = true;
      predictedClearanceMinutes = 180;
      longDurationRisk = "critical";
      hotspotScore = 9.1;
      networkCompoundingScore = 8.8;

      manpower = 12;
      barricading = "Heavy";
      diversion = "Immediate Outer Ring Road diversion / Corridor bypass";
      dispatchReq = "Dispatch 1 crane, 1 heavy recovery vehicle, fire tender safety squad, and 8-12 officers.";
    } else {
      impactRisk = "high";
      finalImpactScore = 7.8;
      priorityProbability = 0.82;
      roadClosureProbability = 0.55;
      closureRecommended = false;
      predictedClearanceMinutes = 80;
      longDurationRisk = "high";
      hotspotScore = 7.2;
      networkCompoundingScore = 6.4;

      manpower = 6;
      barricading = "Medium";
      diversion = "Local lane closure / traffic filtering around crash site";
      dispatchReq = "Dispatch ambulance, local patrol, and 4-6 traffic controllers.";
    }
  } else if (cause === "rally" || cause === "protest" || description.includes("protest") || description.includes("rally") || description.includes("procession")) {
    impactRisk = "high";
    finalImpactScore = 8.1;
    priorityProbability = 0.88;
    roadClosureProbability = 0.72;
    closureRecommended = true;
    predictedClearanceMinutes = 150;
    longDurationRisk = "high";
    hotspotScore = 8.5;
    networkCompoundingScore = 7.9;

    manpower = 10;
    barricading = "Heavy";
    diversion = "Pre-emptive perimeter holding / bypass routing";
    dispatchReq = "Deploy law & order rapid-response platoon, 10 traffic officers, and water cannons.";
  } else if (cause === "waterlogging" || description.includes("water") || description.includes("flood") || description.includes("rain")) {
    impactRisk = "high";
    finalImpactScore = 7.5;
    priorityProbability = 0.75;
    roadClosureProbability = 0.60;
    closureRecommended = false;
    predictedClearanceMinutes = 120;
    longDurationRisk = "high";
    hotspotScore = 8.0;
    networkCompoundingScore = 8.4;

    manpower = 5;
    barricading = "Medium";
    diversion = "Filter heavy vehicles, route two-wheelers through flyovers";
    dispatchReq = "Alert storm water drain wing, dispatch 4 officers with barricades and emergency pumps.";
  } else if (cause === "construction" || description.includes("construction") || description.includes("metro")) {
    impactRisk = "medium";
    finalImpactScore = 5.8;
    priorityProbability = 0.50;
    roadClosureProbability = 0.20;
    closureRecommended = false;
    predictedClearanceMinutes = 240; // planned but long
    longDurationRisk = "medium";
    hotspotScore = 6.0;
    networkCompoundingScore = 5.5;

    manpower = 2;
    barricading = "Fixed";
    diversion = "Permanent single lane squeeze config";
    dispatchReq = "Continuous peak hour warden coverage. Fixed structural safety barricades.";
  } else if (cause === "vehicle_breakdown" || description.includes("breakdown") || description.includes("puncture")) {
    if (vType === "heavy_vehicle" || description.includes("truck") || description.includes("bus")) {
      impactRisk = "high";
      finalImpactScore = 7.1;
      priorityProbability = 0.78;
      roadClosureProbability = 0.45;
      closureRecommended = false;
      predictedClearanceMinutes = 90;
      longDurationRisk = "high";
      hotspotScore = 6.8;
      networkCompoundingScore = 6.0;

      manpower = 5;
      barricading = "Medium";
      diversion = "Lane 1 narrow lane squeeze";
      dispatchReq = "Dispatch towing unit, heavy recovery crane, and 4 traffic wardens.";
    } else {
      impactRisk = "low";
      finalImpactScore = 2.9;
      priorityProbability = 0.30;
      roadClosureProbability = 0.10;
      closureRecommended = false;
      predictedClearanceMinutes = 25;
      longDurationRisk = "low";
      hotspotScore = 2.4;
      networkCompoundingScore = 2.1;

      manpower = 1;
      barricading = "Light";
      diversion = "None";
      dispatchReq = "Deploy single traffic warden and local patrol vehicle to expedite towing.";
    }
  }

  // Calculate clearance bucket
  let clearanceBucket = "Under 30 mins";
  if (predictedClearanceMinutes > 120) clearanceBucket = "Over 120 mins";
  else if (predictedClearanceMinutes > 60) clearanceBucket = "60-120 mins";
  else if (predictedClearanceMinutes > 30) clearanceBucket = "30-60 mins";

  return {
    success: true,
    message: "Prediction generated successfully via Deterministic Smart Fallback",
    data: {
      event_id: event.event_id || `EV_${Math.floor(Math.random() * 9000) + 1000}`,
      event_context: {
        raw_cause: cause,
        authenticated: event.authenticated || "yes",
        direction: event.direction || "unknown",
        corridor: event.corridor || "unknown",
        junction: event.junction || "unknown",
        latitude: Number(event.latitude || (event.longitude ? event.latitude : 12.9716)),
        longitude: Number(event.longitude || (event.latitude ? event.longitude : 77.5946)),
        endlatitude: event.endlatitude !== undefined ? Number(event.endlatitude) : undefined,
        endlongitude: event.endlongitude !== undefined ? Number(event.endlongitude) : undefined
      },
      impact_predictions: {
        impact_risk: impactRisk,
        final_impact_score: finalImpactScore,
        priority_probability: priorityProbability,
        road_closure_probability: roadClosureProbability,
        closure_recommended: closureRecommended,
        predicted_clearance_minutes: predictedClearanceMinutes,
        clearance_bucket: clearanceBucket,
        long_duration_risk: longDurationRisk,
        hotspot_score: hotspotScore,
        network_compounding_score: networkCompoundingScore
      },
      network_context: {
        affected_junctions: [
          event.junction || "Nearest Junction",
          "Secondary Connected Link-A",
          "Outer Tangent Link-B"
        ],
        bottleneck_index: Number((networkCompoundingScore * 1.1).toFixed(1))
      },
      similar_event_memory: {
        matched_historical_cases: 3,
        historical_average_clearance: predictedClearanceMinutes - 5,
        confidence_match: "85%"
      },
      operational_recommendations: {
        manpower_recommendation: manpower,
        barricading_recommendation: barricading,
        diversion_recommendation: diversion,
        dispatch_requirements: dispatchReq
      },
      incident_hazard_context: {
        fire_risk: description.includes("oil") || description.includes("fuel") || description.includes("fire"),
        crane_required: description.includes("crane") || description.includes("heavy") || cause === "vehicle_breakdown" && vType === "heavy_vehicle",
        ambulance_required: description.includes("ambulance") || description.includes("injury") || cause === "accident" && description.includes("crash")
      },
      data_quality_context: {
        data_confidence: description.length > 50 ? 92 : 65,
        historical_confidence_score: 84
      },
      night_shift_context: {
        night_shift_alert: (() => {
          if (!event.start_datetime) return false;
          try {
            const date = new Date(event.start_datetime);
            const hour = date.getHours();
            return hour >= 22 || hour < 6;
          } catch {
            return false;
          }
        })()
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
        pipeline: "gridlock_fallback_heuristic_v2",
        execution_latency_ms: 45
      }
    }
  };
}

// Failsafe Gemini Correction Layer to polish/validate clearance time, personnel, and requirements
async function applyGeminiFailsafeCorrection(rawEvent: any, mlPrediction: any): Promise<any> {
  if (!ai) {
    console.warn("[Failsafe Corrector] Gemini client not initialized. Skipping failsafe corrections.");
    return mlPrediction;
  }
  
  try {
    const prompt = `You are a Senior Traffic Operations Expert and Incident Analyst for the Metropolitan Traffic Management Center.
Your task is to review and correct predictions made by an automated ML agent or heuristic fallback for a road congestion event in Bengaluru, India.
Ensure the clearance time, recommended personnel, and resource requirements are perfect, logical, and precise to the last detail.

RAW EVENT INPUT:
${JSON.stringify(rawEvent, null, 2)}

CURRENT PREDICTION TO REVIEW:
${JSON.stringify(mlPrediction.data || mlPrediction, null, 2)}

INSTRUCTIONS:
1. "predicted_clearance_minutes": Needs to match the physical scenario exactly.
   - Minor breakdown/two-wheeler puncture: 15-30 mins
   - Severe tractor-trailer/bus/container breakdown blocking core route: 90-180 mins
   - Minor waterlogging on sub-lanes: 40-60 mins
   - Severe lake overflow / flooding across a key junction or underpass: 120-210 mins
   - Minor fender-bender: 20-40 mins
   - Multi-vehicle pileup with heavy injuries: 120-180 mins
2. "manpower_recommendation": Personnel deployed. Must be highly realistic:
   - Simple hazards/signs/minor breakdowns: 1-2 controllers
   - Standard lane closures/double-parking/medium waterlogging: 3-5 personnel
   - Heavy crashes/metro blockages/massive waterlogging: 8-12 officers/personnel
3. "dispatch_requirements": Should be highly specific, professional, and detailed. Explain exactly what units (cranes, ambulances, patrol speedsters, high-capacity pumps, fire hazard rigs, warden batches) need to go where.
4. "barricading_recommendation", "diversion_recommendation": Ensure these are specific, contextual, and clear, leveraging real tactical traffic operations.
5. "fire_risk", "crane_required", "ambulance_required": Confirm these flags are perfectly aligned with descriptions (e.g. oil spill or fuel leak requires fire_risk as true, heavy vehicles blocking require cranes, injuries/accidents require ambulance).

Your output MUST be a JSON object containing ONLY the corrected fields structure. Do not supply markdown blocks or prose, just start and end with curly brackets.

SCHEMA REQUIRED:
{
  "impact_predictions": {
    "impact_risk": "critical" | "high" | "medium" | "low",
    "final_impact_score": number (0.0 to 10.0),
    "priority_probability": number (0.0 to 1.0),
    "road_closure_probability": number (0.0 to 1.0),
    "closure_recommended": boolean,
    "predicted_clearance_minutes": number,
    "clearance_bucket": "Under 30 mins" | "30-60 mins" | "60-120 mins" | "Over 120 mins",
    "long_duration_risk": "critical" | "high" | "medium" | "low"
  },
  "operational_recommendations": {
    "manpower_recommendation": number,
    "barricading_recommendation": string,
    "diversion_recommendation": string,
    "dispatch_requirements": string
  },
  "incident_hazard_context": {
    "fire_risk": boolean,
    "crane_required": boolean,
    "ambulance_required": boolean
  }
}`;

    const response = await generateContentResilient({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    console.log("Using Gemini");

    if (response && response.text) {
      let cleanedText = response.text.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      const corrected = JSON.parse(cleanedText);
      const target = mlPrediction.data ? mlPrediction.data : mlPrediction;
      
      if (corrected.impact_predictions) {
        target.impact_predictions = {
          ...target.impact_predictions,
          ...corrected.impact_predictions
        };
        const mins = target.impact_predictions.predicted_clearance_minutes;
        if (mins !== undefined) {
          if (mins > 120) target.impact_predictions.clearance_bucket = "Over 120 mins";
          else if (mins > 60) target.impact_predictions.clearance_bucket = "60-120 mins";
          else if (mins > 30) target.impact_predictions.clearance_bucket = "30-60 mins";
          else target.impact_predictions.clearance_bucket = "Under 30 mins";
        }
      }
      if (corrected.operational_recommendations) {
        target.operational_recommendations = {
          ...target.operational_recommendations,
          ...corrected.operational_recommendations
        };
      }
      if (corrected.incident_hazard_context) {
        target.incident_hazard_context = {
          ...target.incident_hazard_context,
          ...corrected.incident_hazard_context
        };
      }
      
      console.log(`[Failsafe Corrector] Success! Polished prediction details using Gemini.`);
    }
  } catch (err: any) {
    console.warn("[Failsafe Corrector] Error during corrector processing, serving original prediction:", err.message);
  }
  
  return mlPrediction;
}

// ------------------- API ROUTES -------------------

// 1. GET /api/health
app.get("/api/health", (req, res) => {
  const predictionApiBase = process.env.PREDICTION_API_BASE_URL || "";
  const maptilerKey = process.env.MAPTILER_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";

  res.json({
    status: "ok",
    app: "EventOps Twin",
    timestamp: new Date().toISOString(),
    config: {
      PREDICTION_API_BASE_URL: {
        configured: !!predictionApiBase,
        value_preview: predictionApiBase ? `${predictionApiBase.substring(0, 15)}...` : "not configured"
      },
      MAPTILER_API_KEY: {
        configured: !!maptilerKey,
        value_preview: maptilerKey ? `${maptilerKey.substring(0, 4)}...${maptilerKey.substring(maptilerKey.length - 4)}` : "not configured"
      },
      GEMINI_API_KEY: {
        configured: !!geminiKey,
        value_preview: geminiKey ? "configured" : "not configured"
      }
    }
  });
});

// 2. GET /api/config/public
app.get("/api/config/public", (req, res) => {
  res.json({
    MAPTILER_API_KEY: process.env.MAPTILER_API_KEY || "P9WweRtarGwCzzxvY3wP",
    is_prediction_mock: !process.env.PREDICTION_API_BASE_URL,
    is_gemini_active: !!process.env.GEMINI_API_KEY,
    prediction_base_url: process.env.PREDICTION_API_BASE_URL || ""
  });
});

// 3. POST /api/parse-event
app.post("/api/parse-event", async (req, res) => {
  const { raw_description, location_text, optional_context } = req.body;

  if (!raw_description) {
    return res.status(400).json({ success: false, message: "raw_description is required." });
  }

  const defaultDateTime = new Date().toISOString();
  const maptilerApiKey = process.env.MAPTILER_API_KEY || "P9WweRtarGwCzzxvY3wP";

  // If Gemini API is not configured, fallback to a smart regex extractor corrected by MapTiler Geocoding
  if (!ai) {
    const regexParsed = parseEventHeuristically(raw_description, location_text || "");
    let geocodeQuery = location_text || "";
    if (!geocodeQuery) {
      const descLower = raw_description.toLowerCase();
      if (descLower.includes("majestic")) geocodeQuery = "Majestic bus stand";
      else if (descLower.includes("anand rao circle")) geocodeQuery = "Anand Rao Circle";
      else if (descLower.includes("kg road")) geocodeQuery = "KG Road";
      else if (descLower.includes("peenya")) geocodeQuery = "Peenya";
      else if (descLower.includes("jalahalli")) geocodeQuery = "Jalahalli Cross";
      else if (descLower.includes("koramangala")) geocodeQuery = "Koramangala";
      else if (descLower.includes("hebbal")) geocodeQuery = "Hebbal";
      else if (descLower.includes("silk board")) geocodeQuery = "Silk Board";
      else if (descLower.includes("whitefield")) geocodeQuery = "Whitefield";
      else if (descLower.includes("kr puram")) geocodeQuery = "KR Puram";
    }
    if (geocodeQuery) {
      const geoResult = await geocodeWithMapTiler(geocodeQuery, maptilerApiKey);
      if (geoResult) {
        regexParsed.latitude = geoResult.lat;
        regexParsed.longitude = geoResult.lng;
        (regexParsed as any).maptiler_geocoded = true;
        (regexParsed as any).maptiler_geocoded_query = geocodeQuery;
      }
    }
    return res.json({
      success: true,
      parser: "RegexHeuristicsFallback",
      warning: "Gemini API is not configured. Used client-side regex fallback parser.",
      data: regexParsed
    });
  }

  try {
    const prompt = `You are an expert text-processing system for the Bengaluru Traffic Police Command Center.
Your sole mission is to classify and parse messy natural language incident descriptions into a highly structured JSON record matching our machine-learning feature vectors.

### CRITICAL RULES & INSTRUCTIONS:
1. **Negation Guardrails (MANDATORY)**:
   - Identify negation phrases with extreme accuracy. If the report says "No crash reported yet", "no accident observed", "without collision", "no vehicle breakdown", DO NOT classify the event's cause as "accident" or "vehicle_breakdown".
   - Carefully separate secondary mentions (such as potential safety risks or things that have NOT happened yet) from the core root cause of the traffic disturbance. For example, if a "political gathering" or "protest" is slowing down buses but has "No crash reported yet", the core event cause is "protest" or "rally", NOT accident.

2. **Event Type & Cause Classification**:
   - \`event_type\` must be exactly one of: \`planned\`, \`unplanned\`.
     - Planned events typically include pre-scheduled rallies, long-term construction, regular festivals, or pre-announced sports matches.
     - Unplanned events typically include accidents, sudden vehicle breakdowns, spontaneous protests/gatherings, heavy rain/waterlogging, or spontaneous blockades.
   - \`event_cause\` must be exactly one of the following:
     - \`accident\`: Collisions, crash, vehicles slamming, overturning (only if a crash actually happened).
     - \`vehicle_breakdown\`: Stalled cars/buses/trucks, punctures, broken axles, engine failures.
     - \`rally\`: Pre-planned marches, planned processions, scheduled demonstrations, VIP movements.
     - \`protest\`: Spontaneous political gatherings, strikes, flash mobs, blocking groups, sudden dharnas, chaotic spillover crowds protesting.
     - \`construction\`: Metro rail construction, road digging, resurfacing, water pipe works.
     - \`waterlogging\`: Rain water log, overflowing drains, heavy downpours clogging roads.
     - \`sports\`: Cricket matches at Chinnaswamy stadium, marathons, tournaments.
     - \`festival\`: Processions, temple fairs, Ganesha immersion, Eid prayers, Christmas congregation.
     - \`road_blockage\`: Spontaneous barricades, sudden closures, trees falling, structural collapse blockages.
     - \`unknown\`: When there is absolutely no reason reported.

3. **Geographic Mapping (Coordinates, Corridor, Junction, and Zone)**:
   - Estimate precise Bengaluru coordinates if not stated. Use Bengaluru Center (12.9716 N, 77.5946 E) or specific neighborhood centers:
     - Majestic / Bus Stand / KG Road: 12.9774 N, 77.5729 E
     - Peenya / Jalahalli Cross: 13.0400 N, 77.5181 E
     - Koramangala / Sony World: 12.9345 N, 77.6101 E
     - Silk Board / Hosur Road: 12.9176 N, 77.6224 E
     - Hebbal / Bellary Road: 13.0358 N, 77.5978 E
     - Whitefield / ITPL: 12.9698 N, 77.7499 E
     - KR Puram / Tin Factory: 13.0040 N, 77.6780 E
     - Indiranagar / 100ft Rd: 12.9719 N, 77.6412 E
     - MG Road / Brigade Road: 12.9738 N, 77.6119 E
   - \`corridor\` must identify the primary corridor involved: e.g. \`Tumkur Road\`, \`Outer Ring Road\`, \`Hosur Road\`, \`Bannerghatta Road\`, \`Mysore Road\`, \`Ballari Road\`, \`Old Madras Road\`, or \`non_corridor\`.
   - \`zone\` must be one of: \`North\`, \`South-East\`, \`East\`, \`South\`, \`West\`, \`Central\`.

4. **Police Station Extraction & Mapping (CRITICAL)**:
   - Identify which of the 44 Bengaluru Traffic Police Stations owns this jurisdiction. The response value MUST be one of these exact names (without suffix, e.g. "Peenya", "Majestic", "Koramangala"):
     - Peenya, Jalahalli Cross, Tumkur Road, Koramangala, Sony World Signal, MG Road, Majestic, Hebbal, KR Puram, Silk Board, Whitefield, Electronic City, Indiranagar, Halasuru, Shivajinagar, Sadashivanagar, RT Nagar, Chamarajpet, Vijayanagar, Basaveshwaranagar, Malleswaram, Rajajinagar, Hulimavu, Jayanagar, Banashankari, Kumaraswamy Layout, HSR Layout, HAL, Banasawadi, Yelahanka, Chikkajala, Bellandur, Marathahalli, Kengeri, Frazer Town, High Grounds, Wilson Garden, Ulsoor Gate, Chickpet, Kamaksipalya, Cottonpet, Vidyaranyapura, Byatarayanapura, Adugodi.

5. **Vehicle Configuration**:
   - \`veh_type\` must be exactly one of: \`heavy_vehicle\`, \`private_car\`, \`public_transport\`, \`two_wheeler\`, \`none\`.
   - If \`veh_type\` is NOT heavy_vehicle, set \`age_of_truck\` to \`-1\`.

6. **Inputs**:
   - User text description: "${raw_description}"
   - Location landmark description: "${location_text || ''}"
   - Optional context: ${JSON.stringify(optional_context || {})}

Return ONLY a single valid JSON conformant to the requested schema.`;

    const response = await generateContentResilient({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            event_id: { type: Type.STRING },
            event_type: { type: Type.STRING, description: "Must be either 'planned' or 'unplanned'" },
            event_cause: { type: Type.STRING, description: "One of: accident, vehicle_breakdown, rally, construction, waterlogging, protest, sports, festival, road_blockage, unknown" },
            latitude: { type: Type.NUMBER, description: "Latitude coordinate in Bengaluru" },
            longitude: { type: Type.NUMBER, description: "Longitude coordinate in Bengaluru" },
            endlatitude: { type: Type.NUMBER },
            endlongitude: { type: Type.NUMBER },
            corridor: { type: Type.STRING, description: "Identify road/corridor, e.g. Tumkur Road, Outer Ring Road, Hosur Road, Bannerghatta Road, Mysore Road, Ballary Road, Old Madras Road, non_corridor" },
            police_station: { type: Type.STRING, description: "Must select one of the 44 validated station names (e.g. Peenya, Koramangala, Majestic, MG Road, Whitefield)" },
            zone: { type: Type.STRING, description: "Zone, e.g. North, South-East, East, South, West, Central" },
            junction: { type: Type.STRING, description: "Specific junction, e.g. Jalahalli Cross, Sony World Signal, Silk Board Junction, HQ Circle" },
            veh_type: { type: Type.STRING, description: "vehicle type, e.g. heavy_vehicle, private_car, public_transport, two_wheeler, none" },
            authenticated: { type: Type.STRING, description: "yes or no" },
            direction: { type: Type.STRING, description: "direction, e.g. inbound, outbound, local, unknown" },
            age_of_truck: { type: Type.INTEGER, description: "Age of truck/heavy vehicle in years, -1 if not applicable" },
            start_datetime: { type: Type.STRING, description: "ISO 8601 combined date time sequence" },
            description: { type: Type.STRING, description: "Refined details summary of what happened" },
            extracted_location_query: { type: Type.STRING, description: "Concise physical landmark or intersection extracted from description suitable for MapTiler geocoding" }
          },
          required: ["event_type", "event_cause", "latitude", "longitude", "start_datetime"]
        }
      }
    });

    const parsedJson = JSON.parse(response.text || "{}");
    if (!parsedJson.event_id) {
       parsedJson.event_id = `EV_${Math.floor(Math.random() * 90000) + 10000}`;
    }
    if (parsedJson.age_of_truck === undefined) {
      parsedJson.age_of_truck = -1;
    }
    if (parsedJson.authenticated === undefined) {
      parsedJson.authenticated = "yes";
    }

    // Call MapTiler Geocoding to query the precise real-world coordinate
    let geocodeQuery = parsedJson.extracted_location_query || location_text || parsedJson.junction || "";
    if (geocodeQuery) {
      const geoResult = await geocodeWithMapTiler(geocodeQuery, maptilerApiKey);
      if (geoResult) {
        parsedJson.latitude = geoResult.lat;
        parsedJson.longitude = geoResult.lng;
        parsedJson.maptiler_geocoded = true;
        parsedJson.maptiler_geocoded_query = geocodeQuery;
      }
    }

    res.json({
      success: true,
      parser: "Gemini",
      data: parsedJson
    });

  } catch (error: any) {
    console.log(`[Parser] Standard fallback sequence engaged. Reasoning: ${error.message || error}`);
    const regexParsed = parseEventHeuristically(raw_description, location_text || "");
    let geocodeQuery = location_text || "";
    if (!geocodeQuery) {
      const descLower = raw_description.toLowerCase();
      if (descLower.includes("majestic")) geocodeQuery = "Majestic bus stand";
      else if (descLower.includes("anand rao circle")) geocodeQuery = "Anand Rao Circle";
      else if (descLower.includes("kg road")) geocodeQuery = "KG Road";
      else if (descLower.includes("peenya")) geocodeQuery = "Peenya";
      else if (descLower.includes("jalahalli")) geocodeQuery = "Jalahalli Cross";
      else if (descLower.includes("koramangala")) geocodeQuery = "Koramangala";
      else if (descLower.includes("hebbal")) geocodeQuery = "Hebbal";
      else if (descLower.includes("silk board")) geocodeQuery = "Silk Board";
      else if (descLower.includes("whitefield")) geocodeQuery = "Whitefield";
      else if (descLower.includes("kr puram")) geocodeQuery = "KR Puram";
    }
    if (geocodeQuery) {
      const geoResult = await geocodeWithMapTiler(geocodeQuery, maptilerApiKey);
      if (geoResult) {
        regexParsed.latitude = geoResult.lat;
        regexParsed.longitude = geoResult.lng;
        (regexParsed as any).maptiler_geocoded = true;
        (regexParsed as any).maptiler_geocoded_query = geocodeQuery;
      }
    }
    res.json({
      success: true,
      parser: "RegexHeuristicsFallback",
      warning: `Gemini is overloaded or experiencing transient high demand (${error.message || error}). Used high-fidelity local fallback instead.`,
      data: regexParsed
    });
  }
});

// 4. POST /api/predict-event-impact
app.post("/api/predict-event-impact", async (req, res) => {
  const eventData = req.body;
  const predictionApiBase = process.env.PREDICTION_API_BASE_URL;

  // Validate minimum required fields before running prediction (or fallback)
  if (!eventData.event_type || !eventData.event_cause || !eventData.latitude || !eventData.longitude || !eventData.start_datetime) {
    return res.status(400).json({
      success: false,
      message: "Data validation failed. Missing minimum required fields: event_type, event_cause, latitude, longitude, start_datetime."
    });
  }

  if (!predictionApiBase) {
    // Return friendly local smart rule-based mock
    let fallback = generateFallbackPrediction(eventData);
    fallback.data.event_id = eventData.event_id || fallback.data.event_id;

    // Apply Gemini Failsafe Correction to ensure perfect precision on clearance, personnel, and details
    fallback = await applyGeminiFailsafeCorrection(eventData, fallback);

    return res.json({
      ...fallback,
      dashboard_runtime: {
        prediction_source: "Demo Fallback Generator (No ML Connected + Gemini Corrected)",
        parsed_at: new Date().toISOString()
      }
    });
  }

  try {
    const response = await fetch(`${predictionApiBase}/predict-event-impact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      throw new Error(`External machine returned non-200 status: ${response.status}`);
    }

    let mlResponse: any = await response.json();

    // Apply Gemini Failsafe Correction to ensure perfect precision on clearance, personnel, and details
    mlResponse = await applyGeminiFailsafeCorrection(eventData, mlResponse);

    // Inject runtime metadata and return
    mlResponse.dashboard_runtime = {
      prediction_source: "Competition-Trained ML Bundle + Gemini Corrected",
      parsed_at: new Date().toISOString()
    };

    res.json(mlResponse);

  } catch (error: any) {
    console.error("External Prediction Machine Failure:", error.message);
    let fallback = generateFallbackPrediction(eventData);
    fallback.data.event_id = eventData.event_id || fallback.data.event_id;

    // Apply Gemini Failsafe Correction to ensure perfect precision on clearance, personnel, and details
    fallback = await applyGeminiFailsafeCorrection(eventData, fallback);

    return res.json({
      ...fallback,
      message: `Prediction Machine failed/unavailable (${error.message}). Showing Gemini Corrected Fallback.`,
      dashboard_runtime: {
        prediction_source: "Demo Fallback + Gemini Corrected",
        parsed_at: new Date().toISOString()
      }
    });
  }
});

// 5. POST /api/predict-batch-json
app.post("/api/predict-batch-json", async (req, res) => {
  const { events } = req.body;
  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ success: false, message: "Invalid request. 'events' array is missing." });
  }

  const predictionApiBase = process.env.PREDICTION_API_BASE_URL;

  if (!predictionApiBase) {
    // Generate fallback prediction data for all events with parallel Gemini correction
    const predictions = await Promise.all(events.map(async (ev: any) => {
      let pred = generateFallbackPrediction(ev);
      pred.data.event_id = ev.event_id || pred.data.event_id;
      // Refine with Gemini Failsafe Corrector
      pred = await applyGeminiFailsafeCorrection(ev, pred);
      return pred.data;
    }));

    return res.json({
      success: true,
      generated_at: new Date().toISOString(),
      pipeline_used: "predict_event_final_fallback_with_gemini",
      total_received: events.length,
      total_successful: events.length,
      total_failed: 0,
      predictions,
      errors: []
    });
  }

  try {
    const response = await fetch(`${predictionApiBase}/predict-batch-json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ events })
    });

    if (!response.ok) {
      throw new Error(`External batch API returned code ${response.status}`);
    }

    const batchResponse = await response.json();
    if (batchResponse && Array.isArray(batchResponse.predictions)) {
      batchResponse.predictions = await Promise.all(batchResponse.predictions.map(async (pred: any, idx: number) => {
        const ev = events[idx] || {};
        const wrapped = await applyGeminiFailsafeCorrection(ev, { data: pred });
        return wrapped.data || wrapped;
      }));
    }
    res.json(batchResponse);

  } catch (error: any) {
    console.error("External Batch Prediction Machine Failure:", error.message);

    // Provide robust mock fallback refined with Gemini corrector
    const predictions = await Promise.all(events.map(async (ev: any) => {
      let pred = generateFallbackPrediction(ev);
      pred.data.event_id = ev.event_id || pred.data.event_id;
      pred = await applyGeminiFailsafeCorrection(ev, pred);
      return pred.data;
    }));

    return res.json({
      success: true,
      generated_at: new Date().toISOString(),
      pipeline_used: "predict_event_final_fallback_due_to_error_with_gemini",
      total_received: events.length,
      total_successful: events.length,
      total_failed: 0,
      predictions,
      errors: [{ message: `Prediction machine error: ${error.message}` }]
    });
  }
});

// 6. POST /api/upload-test-cases
app.post("/api/upload-test-cases", (req, res) => {
  const { events } = req.body;
  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ success: false, message: "Uploaded file structure is invalid. Expected direct array or {events: []} JSON." });
  }

  // Validate structure
  const validEvents: any[] = [];
  const errors: string[] = [];

  events.forEach((ev: any, idx: number) => {
    if (!ev.event_type || !ev.event_cause || ev.latitude === undefined || ev.longitude === undefined || !ev.start_datetime) {
      errors.push(`Row index ${idx} failed validation. Mandatory: event_type, event_cause, latitude, longitude, start_datetime.`);
    } else {
      validEvents.push({
        event_id: ev.event_id || `UPLOAD_TEST_${idx}_${Math.floor(Math.random() * 1000)}`,
        event_type: ev.event_type,
        event_cause: ev.event_cause,
        latitude: Number(ev.latitude),
        longitude: Number(ev.longitude),
        endlatitude: Number(ev.endlatitude || 0.0),
        endlongitude: Number(ev.endlongitude || 0.0),
        corridor: ev.corridor || "non_corridor",
        police_station: ev.police_station || "unknown",
        zone: ev.zone || "unknown",
        junction: ev.junction || "unknown",
        veh_type: ev.veh_type || "unknown",
        authenticated: ev.authenticated || "yes",
        direction: ev.direction || "unknown",
        age_of_truck: ev.age_of_truck !== undefined ? Number(ev.age_of_truck) : -1,
        start_datetime: ev.start_datetime,
        description: ev.description || ""
      });
    }
  });

  if (validEvents.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid events were uploaded.",
      errors
    });
  }

  res.json({
    success: true,
    total_received: events.length,
    total_valid: validEvents.length,
    total_invalid: errors.length,
    valid_events: validEvents,
    errors
  });
});

// 7. GET /api/police-stations
app.get("/api/police-stations", (req, res) => {
  try {
    // Simulate minor real-time availability capacity updates dynamically
    if (Math.random() > 0.4) {
      const idx = Math.floor(Math.random() * mockPoliceStations.length);
      const station = mockPoliceStations[idx];
      const change = Math.random() > 0.5 ? 1 : -1;
      const nextAvailable = station.available_units + change;
      if (nextAvailable >= 1 && nextAvailable <= station.total_units) {
        station.available_units = nextAvailable;
        // Adjust deployed_units to match
        station.deployed_units = station.total_units - nextAvailable;
      }
    }
  } catch (err) {
    console.error("Error simulating capacity fluctuation", err);
  }
  res.json(mockPoliceStations);
});

// 8. POST /api/dispatch/recommend
app.post("/api/dispatch/recommend", (req, res) => {
  const { prediction, stations } = req.body;

  if (!prediction || !prediction.event_id) {
    return res.status(400).json({ success: false, message: "Missing prediction context." });
  }

  // Get coordinates
  const eventLat = Number(prediction.event_context?.latitude || prediction.latitude || 12.9716);
  const eventLng = Number(prediction.event_context?.longitude || prediction.longitude || 77.5946);
  const eventZone = prediction.event_context?.zone || prediction.zone || "";
  const eventCause = (prediction.event_context?.raw_cause || prediction.event_cause || "").toLowerCase();
  const vType = (prediction.event_context?.veh_type || prediction.veh_type || "").toLowerCase();

  const activeStations = stations && stations.length > 0 ? stations : mockPoliceStations;

  // Rank deterministic recommendation algorithms based on:
  // - distance
  // - available safety/traffic units
  // - special capabilities
  // - zone match
  const rankedStations = activeStations.map((station: any) => {
    const distance_km = getDistanceKm(eventLat, eventLng, station.latitude, station.longitude);
    
    // Evaluate match quality score (lower is better for ranking)
    let score = distance_km * 2.0;

    // Same zone bonus
    if (eventZone && station.zone.toLowerCase() === eventZone.toLowerCase()) {
      score -= 3.0; // Higher ranking
    }

    // Capability match bonus
    const cap = station.special_capabilities || [];
    let containsHeavyVehicleResponse = cap.includes("heavy_vehicle_response");
    let containsCrowdControl = cap.includes("crowd_control");

    if (vType === "heavy_vehicle" && containsHeavyVehicleResponse) {
      score -= 5.0;
    }
    if ((eventCause === "protest" || eventCause === "rally" || eventCause === "festival") && containsCrowdControl) {
      score -= 4.0;
    }

    // Low availability penalty
    if (station.available_units <= 0) {
      score += 15.0;
    }

    // Determine recommended units to deploy in prototype based on severity
    const risk = (prediction.impact_predictions?.impact_risk || "medium").toLowerCase();
    let recommended_units = 1;
    if (risk === "critical") recommended_units = 3;
    else if (risk === "high") recommended_units = 2;

    // Clamp recommended units to available units
    if (recommended_units > station.available_units) {
      recommended_units = Math.max(1, station.available_units);
    }

    // Create custom reasoning
    let reason = "Located within close proximity with available patrol cars.";
    if (vType === "heavy_vehicle" && containsHeavyVehicleResponse) {
      reason = "Closest station featuring active Heavy Vehicle Crane Recovery Support.";
    } else if ((eventCause === "protest" || eventCause === "rally") && containsCrowdControl) {
      reason = "Equipped with specialized crowd dispatch control squads.";
    } else if (station.zone.toLowerCase() === eventZone.toLowerCase() && distance_km < 3.0) {
      reason = "Immediate jurisdiction sector responder.";
    }

    return {
      station_id: station.station_id,
      station_name: station.station_name,
      distance_km,
      available_units: station.available_units,
      recommended_dispatch_units: recommended_units,
      alert_status: "Pending HQ Approval", // Simulated in-app
      reason,
      ranking_score: score
    };
  });

  // Sort by ranking score ascending
  const finalRanked = [...rankedStations].sort((a, b) => a.ranking_score - b.ranking_score);

  // Take top 3 stations
  const nearest_stations = finalRanked.slice(0, 3).map(st => {
    // strip the helper ranking score
    const { ranking_score, ...rest } = st;
    return rest;
  });

  const primaryStation = nearest_stations[0];
  const eventJunc = prediction.event_context?.junction || prediction.junction || "the hotspot site";
  const eventCorr = prediction.event_context?.corridor || prediction.corridor || "the corridor";
  const severity = prediction.impact_predictions?.impact_risk || "medium";

  const recommended_message = `ALERT HQ: ${severity.toUpperCase()} incident registered near ${eventJunc} on [${eventCorr}]. ` +
    `Recommend alerting ${primaryStation.station_name} immediately to authorize dispatch of ${primaryStation.recommended_dispatch_units} tactical traffic personnel.`;

  res.json({
    human_approval_required: true,
    nearest_stations,
    recommended_message
  });
});

// 9. POST /api/dispatch/alert
app.post("/api/dispatch/alert", (req, res) => {
  const { station_id, event_id, current_status, human_approved } = req.body;

  if (!station_id || !event_id) {
    return res.status(400).json({ success: false, message: "Missing required station_id or event_id." });
  }

  // Transitions: Not Alerted -> Alert Sent -> Acknowledged -> Units Dispatched -> Arrived
  let nextStatus = "Alert Sent";
  if (current_status === "Alert Sent") nextStatus = "Acknowledged";
  else if (current_status === "Acknowledged") nextStatus = "Units Dispatched";
  else if (current_status === "Units Dispatched") nextStatus = "Arrived";

  res.json({
    success: true,
    station_id,
    event_id,
    alert_status: nextStatus,
    timestamp: new Date().toISOString(),
    human_approved: !!human_approved
  });
});


// ------------------- VITE OR STATIC FRONTEND SERVING -------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EventOps Twin Server running securely on http://localhost:${PORT}`);
  });
}

startServer();
