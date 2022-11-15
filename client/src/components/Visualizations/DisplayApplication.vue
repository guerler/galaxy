<template>
    <div>
        {{ appName }}
        {{ datasetId }}
        {{ linkName }}
    </div>
</template>
<script>
import { DatasetProvider } from "components/providers";
export default {
    components: {
        DatasetProvider,
    },
    props: {
        appName: {
            type: String,
            required: true,
        },
        datasetId: {
            type: String,
            required: true,
        },
        linkName: {
            type: String,
            required: true,
        },
    },
};
</script>
