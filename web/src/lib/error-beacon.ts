/** Sends one browser error to /api/client-errors without blocking the page. */
export function sendErrorBeacon(e: { message: string; stack?: string; digest?: string }) {
  try {
    const data = JSON.stringify({ message: e.message.slice(0, 500), stack: e.stack?.slice(0, 4000), path: location.pathname, digest: e.digest });
    navigator.sendBeacon("/api/client-errors", new Blob([data], { type: "application/json" }));
  } catch { /* reporting must never break the page */ }
}

/* Inline in the root layout (no extra download): uncaught errors and rejected promises, at most
   5 per page view. Errors caught by React error pages are sent by those pages instead. */
export const ERROR_BEACON_SCRIPT = `(function(){var n=0;function s(m,st){if(n++>4)return;try{navigator.sendBeacon("/api/client-errors",new Blob([JSON.stringify({message:String(m).slice(0,500),stack:String(st||"").slice(0,4000),path:location.pathname})],{type:"application/json"}))}catch(e){}}addEventListener("error",function(e){if(e.error||e.message)s(e.message,e.error&&e.error.stack)});addEventListener("unhandledrejection",function(e){var r=e.reason;s(r&&r.message||r,r&&r.stack)})})();`;
