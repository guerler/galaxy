<script setup lang="ts">
import { library } from "@fortawesome/fontawesome-svg-core";
import { faList } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, onMounted, ref } from "vue";

import { invocationCountsFetcher } from "@/api/workflows";
import { useUserStore } from "@/stores/userStore";
import localize from "@/utils/localization";

library.add(faList);

interface Props {
    workflow: any;
}

const userStore = useUserStore();

const props = defineProps<Props>();

const count = ref<number>(0);
const failed = ref<number>(0);
const loaded = ref<boolean>(false);

const tooltipWithCount = computed(() => {
    const tooltip = "View workflow invocations";
    const ownedByUser = props.workflow.owner === userStore.currentUser?.username;
    if (ownedByUser && failed.value > 0) {
        return localize(`${tooltip} (${failed.value} runs failed)`);
    }
    return localize(tooltip);
});

async function initCounts() {
    const { data } = await invocationCountsFetcher({ workflow_id: props.workflow.id });
    loaded.value = true;
    console.log(data);
    let allCounts = 0;
    for (const stateCount of Object.values(data)) {
        if (stateCount) {
            allCounts += stateCount;
        }
    }
    count.value = allCounts;
    if (data.failed) {
        failed.value = data.failed;
    }
}

onMounted(initCounts);
</script>

<template>
    <div class="workflow-invocations-count d-flex align-items-center flex-gapx-1">
        <BBadge v-if="loaded && count === 0" pill class="list-view">
            <span>never run</span>
        </BBadge>
        <BBadge
            v-else-if="loaded && count > 0"
            v-b-tooltip.hover.noninteractive
            pill
            :title="tooltipWithCount"
            class="outline-badge cursor-pointer list-view"
            :to="`/workflows/${props.workflow.id}/invocations`">
            <FontAwesomeIcon :icon="faList" fixed-width />

            <span>
                workflow runs:
                {{ count }}
            </span>
        </BBadge>
        <BButton
            v-else
            v-b-tooltip.hover.noninteractive
            :title="localize('View workflow invocations')"
            class="inline-icon-button"
            variant="link"
            size="sm"
            :to="`/workflows/${props.workflow.id}/invocations`">
            <FontAwesomeIcon :icon="faList" fixed-width />
        </BButton>
    </div>
</template>
