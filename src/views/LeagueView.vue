<script setup lang="ts">
    import { useRoute } from 'vue-router'
    import { ref, onMounted } from 'vue'
    import { doc, getDoc, getDocs, collection, query, orderBy } from 'firebase/firestore';
    import { db } from '../firebase.ts';
    import type { DriverStanding } from '../types/DriverStanding.ts';
    import type { ConstructorStanding } from '../types/ConstructorStanding.ts';
    import type { Race } from '../types/Race.ts';
    import type { Driver } from '../types/Driver.ts';
    import type { League } from '../types/League.ts';
    import type { DriverStandingFirestore } from '../types/firestore/DriverStandingFirestore.ts';
    import type { ConstructorStandingFirestore } from '../types/firestore/ConstructorStandingFirestore.ts';
    import type { RaceFirestore } from '../types/firestore/RaceFirestore.ts';
    import type { DriverFirestore } from '../types/firestore/DriverFirestore.ts';
    import Navbar from '../components/Navbar.vue';
    import NextEventDisplay from '../components/NextEventDisplay.vue';
    import RaceCard from '../components/RaceCard.vue';

    const route = useRoute();
    const leagueId = route.params.id as string;

    const league = ref<League | null>(null);
    const seasonYear = ref<number>();
    const driversStandings = ref<DriverStanding[]>([]);
    const constructorsStandings = ref<ConstructorStanding[]>([]);
    const races = ref<Race[]>([]);
    const drivers = ref<Driver[]>([]);

    async function loadData() {
        if (!leagueId) return;

        try {
            const leagueRef = doc(db, 'leagues', leagueId);
            const leagueSnap = await getDoc(leagueRef);

            if (!leagueSnap.exists()) {
                throw new Error('League not found');
            }

            const leagueData = leagueSnap.data();
            seasonYear.value = Number(leagueData.season_year);

            league.value = {
                id: leagueSnap.id,
                name: leagueData.name,
                seasonYear: leagueData.season_year,
                ownerId: leagueData.owner_id,
                ownerUsername: leagueData.owner_username,
            };

            // TODO: Get members of the league

            const driversQ = query(
                collection(db, 'f1_seasons', String(seasonYear.value), 'drivers'),
                orderBy('given_name', 'asc')
            )

            const racesQ = query(
                collection(db, 'f1_seasons', String(seasonYear.value), 'races'),
                orderBy('round', 'asc')
            );

            const driverStandingsQ = query(
                collection(db, 'f1_seasons', String(seasonYear.value), 'driver_standings'),
                orderBy('position', 'asc')
            );

            const constructorStandingsQ = query(
                collection(db, 'f1_seasons', String(seasonYear.value), 'constructor_standings'),
                orderBy('position', 'asc')
            );

            const [driversSnap, racesSnap, driverStandingsSnap, constructorStandingsSnap,] = await Promise.all([
                getDocs(driversQ),
                getDocs(racesQ),
                getDocs(driverStandingsQ),
                getDocs(constructorStandingsQ),
            ]);

            drivers.value = driversSnap.docs.map(docSnap => {
                const data = docSnap.data() as DriverFirestore;

                return {
                    driverId: data.driver_id,
                    givenName: data.given_name,
                    familyName: data.family_name,
                } as Driver;
            });

            races.value = racesSnap.docs.map(docSnap => {
                const data = docSnap.data() as RaceFirestore;

                return {
                    season: seasonYear.value,
                    round: data.round,
                    raceName: data.race_name,
                    weekendType: data.weekend_type,
                    bettingOpensAt: data.betting_open_at,
                    bettingClosesAt: data.betting_closes_at
                } as Race;
            });
            
            driversStandings.value = driverStandingsSnap.docs.map(docSnap => {
                const data = docSnap.data() as DriverStandingFirestore;

                return {
                    Driver: {
                        driverId: data.driver.driver_id,
                        givenName: data.driver.given_name,
                        familyName: data.driver.family_name,
                    },
                    position: data.position,
                    points: data.points,
                } as DriverStanding;
            });

            constructorsStandings.value = constructorStandingsSnap.docs.map(docSnap => {
                const data = docSnap.data() as ConstructorStandingFirestore;

                return {
                    Constructor: {
                        constructorId: data.constructor.constructor_id,
                        name: data.constructor.name,
                    },
                    position: data.position,
                    points: data.points,
                } as ConstructorStanding;
            });

        } catch (err) {
            console.error('Error loading F1 data:', err);
        }
    }

    onMounted(() => {
        loadData()
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
                    <div v-if="races.length && league">
                        <h3>Calendar Season ({{ seasonYear }})</h3>
                        <div v-for="item in races" :key="item.round">
                            <RaceCard :race="item" :drivers="drivers" :league="league"/>
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