<script setup lang="ts">
    import { useRoute } from 'vue-router'
    import { ref, onMounted } from 'vue'
    import type { DriverStanding } from '../types/DriverStanding.ts'
    import type { ConstructorStanding } from '../types/ConstructorStanding.ts'
    import type { Race } from '../types/Race.ts'
    import type { RaceSprint } from '../types/RaceSprint.ts'
    import Navbar from '../components/Navbar.vue';
    import NextEventDisplay from '../components/NextEventDisplay.vue';
    import RaceCard from '../components/RaceCard.vue'

    const route = useRoute();

    const seasonYear = route.query.seasonYear as string;

    const driversStandings = ref<DriverStanding[]>([]);
    const constructorsStandings = ref<ConstructorStanding[]>([]);
    const races = ref<(Race | RaceSprint)[]>([]);

    async function loadStandings() {
        // try {
        //     const res = await fetch(
        //         `https://api.jolpi.ca/ergast/f1/${seasonYear}/driverstandings.json`
        //     );

        //     if (!res.ok) {
        //         throw new Error('Failed to fetch driver standings');
        //     } 
        //     const drivers = await res.json();
        //     driversStandings.value = drivers.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
        // } catch (error) {
        //     console.error('Driver standings error:', error)
        //     driversStandings.value = []
        // }

        const driversResp = await fetch(
            `https://api.jolpi.ca/ergast/f1/${seasonYear}/driverstandings.json`
        );

        const drivers = await driversResp.json();
        driversStandings.value = drivers.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];

        const constructorsResp = await fetch(
            `https://api.jolpi.ca/ergast/f1/${seasonYear}/constructorstandings.json`
        );

        const constructors = await constructorsResp.json();
        constructorsStandings.value = constructors.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];

        const racesResp = await fetch(
            `https://api.jolpi.ca/ergast/f1/${seasonYear}/races.json`
        );

        const racesData = await racesResp.json();
        races.value = racesData.MRData.RaceTable.Races ?? [];
    }

    onMounted(() => {
        loadStandings()
    })
</script>

<template>
    <div class="league-page">
        <Navbar />
        <NextEventDisplay />

        <div class="league-wrapper">
            <div class="league-left">
                <div class="league-left-box">
                    <div v-if="driversStandings.length">
                        <h3>Driver Standings ({{ seasonYear }})</h3>
                        <div v-for="item in driversStandings" :key="item.Driver.driverId">
                            {{ item.position }}. {{ item.Driver.givenName }} {{ item.Driver.familyName }} – {{ item.points }} pts
                        </div>
                    </div>

                    <div v-if="constructorsStandings.length">
                        <h3>Constructor Standings ({{ seasonYear }})</h3>
                        <div v-for="item in constructorsStandings" :key="item.Constructor.constructorId">
                            {{ item.position }}. {{ item.Constructor.name }} – {{ item.points }} pts
                        </div>
                    </div>
                </div>
            </div>

            <div class="league-right">
                <div class="league-right-box">
                    <div v-if="races.length">
                        <h3>Calendar Season ({{ seasonYear }})</h3>
                        <div v-for="item in races" :key="item.round">
                            <RaceCard :race="item" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .league-page {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .league-wrapper {
        flex: 1;
        display: flex;
    }

    .league-left {
        background-color: brown;
        width: 50%;
        display: flex;
        justify-content: center;
    }

    .league-left-box {
        width: 80%;
        height: 80vh;
        background-color: white;
        border-radius: 2.5%;
        margin-top: 3vh;
        overflow-y: auto;
        padding: 3vh;
    }

    .league-right {
        background-color: gold;
        width: 50%;
        display: flex;
        justify-content: center;
    }

    .league-right-box {
        width: 80%;
        height: 80vh;
        background-color: white;
        border-radius: 2.5%;
        margin-top: 3vh;
        overflow-y: auto;
        padding: 3vh;
    }
</style>