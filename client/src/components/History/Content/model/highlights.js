/**
 * Specifies highlighted items in the history listing. The `highlight` property is passed to
 * the content item component and can be used to modify its appearance.
 */
import axios from "axios";
import { prependPath } from "utils/redirect";
import { deepeach } from "utils/utils";

/** Local cache for parameter requests */
const paramStash = new Map();

/** Performs request to obtain dataset parameters */
async function getDatasetParameters(datasetId, jobId) {
    if (!paramStash.has(datasetId)) {
        const url = jobId
            ? `api/jobs/${jobId}/parameters_display`
            : `api/datasets/${datasetId}/parameters_display?hda_ldda=hda`;
        const { data } = await axios.get(prependPath(url));
        paramStash.set(datasetId, data);
    }
    return paramStash.get(datasetId);
}

/** Returns item key */
function getKey(details) {
    if (details.id && details.src) {
        const historyContentType = details.src == "hda" ? "dataset" : "dataset_collection";
        return `${details.id}-${historyContentType}`;
    }
    return null;
}

/** Returns highlighting details */
export async function getHighlights(item) {
    const highlights = {};
    const { outputs, parameters } = await getDatasetParameters(item.id, item.job_source_id);
    deepeach(parameters, (details) => {
        const key = getKey(details);
        if (key) {
            highlights[key] = "input";
        }
    });
    deepeach(outputs, (details) => {
        const key = getKey(details);
        if (key) {
            highlights[key] = "output";
        }
    });
    return highlights;
}
