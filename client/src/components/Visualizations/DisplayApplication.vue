<script setup>
import { urlData } from "utils/url";
import { DatasetProvider } from "components/providers";
import { defineProps, onMounted } from "vue";
const props = defineProps({
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
});
async function getCreateLink() {
    const params = new URLSearchParams({
        app_name: props.appName,
        dataset_id: props.datasetId,
        link_name: props.linkName,
    });
    const buildUrl = `/api/display_applications/create_link?${params.toString()}`;
    const data = await urlData({ url: buildUrl });
    console.log(data);
}
onMounted(() => {
    getCreateLink();
});
</script>
<template>
    <div>
        {{ appName }}
        {{ datasetId }}
        {{ linkName }}
    </div>
</template>
