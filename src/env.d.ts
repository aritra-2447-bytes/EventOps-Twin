/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL:"FAST_SERVER_API";
    readonly GEMINI_API_URL: "GEMIN_API";
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}