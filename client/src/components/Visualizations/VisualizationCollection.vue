<script setup lang="ts">
import { BAlert } from "bootstrap-vue";
import { onMounted, ref } from "vue";

const props = defineProps<{
    collectionId: string;
    name: string;
    height?: number;
}>();

const errorMessage = ref("");

async function populateSelection() {
    console.log(props);
}

onMounted(() => populateSelection());
</script>

<template>
    <div v-if="errorMessage">
        <BAlert v-if="errorMessage" variant="danger" show>{{ errorMessage }}</BAlert>
    </div>
    <div v-else>
        VisualizationCollection
    </div>
</template>
