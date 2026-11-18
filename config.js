// One application, two isolated deployment environments. The Workshop host is intentionally offline from live Supabase.
const isElflympicsWorkshop = /(^|\\.)elflympics-workshop-2026\\.pages\\.dev$/i.test(location.hostname);
window.ELFLYMPICS_CONFIG = Object.freeze(isElflympicsWorkshop ? {
  environment:"workshop", supabaseUrl:"", publishableKey:""
} : {
  environment:"live",
  supabaseUrl:"https://jdijlpxqxiuanyyfflkh.supabase.co",
  publishableKey:"sb_publishable_5-yqZzWPHnuoZVPh0IW6LA_Wsa9Fvqv"
});
