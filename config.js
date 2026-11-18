// One application, two isolated deployment environments. Workshop NEVER uses production Supabase.
const isElflympicsWorkshop = location.hostname === "elflympics-workshop-2026.pages.dev" || location.hostname.endsWith(".elflympics-workshop-2026.pages.dev");
window.ELFLYMPICS_CONFIG = Object.freeze(isElflympicsWorkshop ? {
  environment: "workshop", supabaseUrl: "", publishableKey: ""
} : {
  environment: "live",
  supabaseUrl: "https://jdijlpxqxiuanyyfflkh.supabase.co",
  publishableKey: "sb_publishable_5-yqZzWPHnuoZVPh0IW6LA_Wsa9Fvqv"
});
