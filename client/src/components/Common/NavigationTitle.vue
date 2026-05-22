<script setup lang="ts">
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

interface Props {
    /** Icon shown before the title text. */
    icon: IconDefinition;
    /** Plain title text. Use the `title` slot instead when richer content is needed. */
    title?: string;
    /** Optional `data-description` for the heading wrapper (test hook). */
    headingDescription?: string;
}

defineProps<Props>();
</script>

<template>
    <div class="bg-secondary px-2 py-1 rounded d-flex flex-gapx-1 justify-content-between">
        <div class="py-1 d-flex flex-wrap align-items-center flex-gapx-1" :data-description="headingDescription">
            <slot name="before-icon" />
            <FontAwesomeIcon :icon="icon" fixed-width />
            <slot name="title">
                <b>{{ title }}</b>
            </slot>
        </div>
        <div class="d-flex flex-gapx-1 align-self-baseline">
            <slot name="actions" />
        </div>
    </div>
</template>
