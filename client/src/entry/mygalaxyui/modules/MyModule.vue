<template>
    <div id="columns">
        <div id="center">
            <div class="center-container">
                <router-view :key="$route.fullPath" />
            </div>
        </div>
    </div>
</template>
