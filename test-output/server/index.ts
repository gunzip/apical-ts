/* Route imports for routes object */
import { route as getCatalogRoute } from "./getCatalog.js";

/* Server operation wrappers */
export { getCatalogWrapper } from "./getCatalog.js";

/* Re-export all handlers */
export type { getCatalogHandler } from "./getCatalog.js";

/* Routes object with all route functions */
export const routes = {
getCatalog: getCatalogRoute,
} as const;
