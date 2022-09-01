<script setup>
const props = defineProps({
    title: String,
});
</script>

<template>
    <div class="mt-2 mb-4">
        <div v-if="title" class="title-bar my-2">
            <div class="stripe"></div>
            <h4>{{ props.title }}</h4>
            <div class="stripe"></div>
        </div>
        <div v-else class="stripe"></div>
        <slot />
    </div>
</template>

<style scoped lang="scss">
@import "scss/theme/blue.scss";

.title-bar {
    display: grid;
    grid-template-columns: 1em auto 1fr;
    align-items: center;
    gap: 1em;
}

.stripe {
    display: block;
    height: 1px;
    background-color: $brand-secondary;
}
</style>
