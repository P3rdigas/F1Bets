<script setup lang="ts">
    import { computed } from 'vue';
    import dial from '../../assets/clocks/tag-heuer/2026/dial.webp';
    import hourHand from '../../assets/clocks/tag-heuer/2026/hours.webp';
    import minuteHand from '../../assets/clocks/tag-heuer/2026/minutes.webp';
    import secondHand from '../../assets/clocks/tag-heuer/2026/seconds.webp';

    const now = new Date();

    const secondsNow = now.getSeconds();
    const minuteSecondsNow = now.getMinutes() * 60 + now.getSeconds();
    const hourSecondsNow = (now.getHours() % 12) * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const hourDelay = computed(() => `-${hourSecondsNow}s`);
    const minuteDelay = computed(() => `-${minuteSecondsNow}s`);
    const secondDelay = computed(() => `-${secondsNow}s`);
</script>

<template>
    <span class="clock-tag">
        <img class="clock-layer" alt="Tag Heuer clock" :src="dial"/>
        <img class="clock-layer hand-hour" role="presentation" :src="hourHand" :style="{ animationDelay: hourDelay }"/>
        <img class="clock-layer hand-minute" role="presentation" :src="minuteHand" :style="{ animationDelay: minuteDelay }"/>
        <img class="clock-layer hand-second" role="presentation" :src="secondHand" :style="{ animationDelay: secondDelay }"/>
    </span>
</template>

<style scoped>
    .clock-tag {
        display: block;
        position: relative;
        height: 75%;
        aspect-ratio: 1 / 1;
        overflow: hidden;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .clock-layer {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }

    .hand-hour {
        animation: spin 43200s linear infinite;
    }

    .hand-minute {
        animation: spin 3600s linear infinite;
    }

    .hand-second {
        animation: spin 60s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
</style>