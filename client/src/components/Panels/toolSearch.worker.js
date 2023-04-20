/**
 * A Web Worker that isolates the Tool Search into its own thread
 */

import { searchToolsByKeys } from "./utilities";

onmessage = function ({ data }) {
    const { type, payload } = data;
    if (type === "searchToolsByKeys") {
        const { tools, keys, query } = payload;
        const { results, closestTerm } = searchToolsByKeys(tools, keys, query);
        // send the result back to the main thread
        self.postMessage({ type: "searchToolsByKeysResult", payload: results, query: query, closestTerm: closestTerm });
    } else if (type === "clearFilter") {
        self.postMessage({ type: "clearFilterResult" });
    } else if (type === "favoriteTools") {
        self.postMessage({ type: "favoriteToolsResult" });
    }
};
