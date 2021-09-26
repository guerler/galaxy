import axios from "axios";
import { SingleQueryProvider } from "components/providers/SingleQueryProvider";
import { rethrowSimple } from "utils/simple-error";

async function datasetCollectionDetails({ url }) {
    try {
        const { data } = await axios.get(url);
        return data;
    } catch (e) {
        rethrowSimple(e);
    }
}

export const DatasetCollectionDetails = SingleQueryProvider(datasetCollectionDetails);
