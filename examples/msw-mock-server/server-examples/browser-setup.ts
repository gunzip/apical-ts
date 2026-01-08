/* Example of using MSW in a browser environment */

import { setupWorker } from "msw/browser";
import { handlers } from "./mock-server-example.js";

/* Create worker with all handlers */
const worker = setupWorker(...handlers);

/* Start the worker */
export async function startMocking() {
  await worker.start({
    onUnhandledRequest: "warn",
  });

  console.log("🎭 MSW worker started in browser");
  console.log("   All matching requests will be intercepted");
}

/* Stop the worker */
export function stopMocking() {
  worker.stop();
  console.log("👋 MSW worker stopped");
}

/* Export worker for additional control */
export { worker };

/* Auto-start in development mode (uncomment if using Vite or similar) */
/*
if (import.meta.env?.DEV) {
  startMocking();
}
*/
