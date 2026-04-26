<script setup lang="ts">
    import { ref, computed, onMounted, onUnmounted } from 'vue';
    import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
    import { db } from '../firebase.ts';
    import tzLookup from 'tz-lookup';
    import type { Race } from '../types/Race.ts';
    import type { RaceFirestore } from '../types/firestore/RaceFirestore.ts';
    import { getFlagSrc } from '../utils/flags.ts';
    import TagHeuer2026 from './clocks/TagHeuer2026.vue';

    type SessionKey = keyof Race['sessions'];

    const sessionLabelMap: Record<SessionKey, string> = {
        fpStartAt: 'FP1',
        spStartAt: 'SPR',
        tpStartAt: 'FP2',
        qStartAt: 'Q',
        rStartAt: 'R',
        sqStartAt: 'SQ',
        sStartAt: 'SPR',
    };

    const now = ref(new Date());
    const races = ref<Race[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    let timer: number | undefined;

    const updateNow = () => {
        now.value = new Date();
    }

    const localTime = computed(() =>
        now.value.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            hourCycle: 'h23',
        })
    );

    const currentSeason = computed(() => now.value.getFullYear())

    async function fetchSeasonRaces(season: number): Promise<Race[]> {
        const q = query(
            collection(db, 'f1_seasons', String(season), 'races'),
            orderBy('round', 'asc')
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as RaceFirestore;

            return {
                season: data.season,
                round: data.round,
                raceName: data.race_name,
                weekendType: data.weekend_type,
                bettingOpensAt: data.betting_open_at,
                bettingClosesAt: data.betting_closes_at,
                sessions: {
                    fpStartAt: data.sessions.fp_start_at,
                    spStartAt: data.sessions.sp_start_at,
                    tpStartAt: data.sessions.tp_start_at,
                    qStartAt: data.sessions.q_start_at,
                    rStartAt: data.sessions.r_start_at,
                    sqStartAt: data.sessions.sq_start_at,
                    sStartAt: data.sessions.s_start_at,
                },
                circuit: {
                    circuitId: data.circuit.circuit_id,
                    circuitName: data.circuit.circuit_name,
                    country: data.circuit.country,
                    lat: data.circuit.lat,
                    locality: data.circuit.locality,
                    long: data.circuit.long,
                    url: data.circuit.url,
                },
            } as Race;
        })
    }

    async function loadRaces() {
        try {
            loading.value = true;
            error.value = null;
            races.value = await fetchSeasonRaces(currentSeason.value);
        } catch (err) {
            error.value = 'Error loading the current season races.';
            console.error(err);
        } finally {
            loading.value = false;
        }
    }

    const nextRaceData = computed(() => {
        const currentMillis = now.value.getTime();

        const candidates = races.value.map((race) => {
            const entries = Object.entries(race.sessions) as [SessionKey, Timestamp | null | undefined][];

            const futureSessions = entries
                .filter(([, timestamp]) => timestamp != null)
                .map(([sessionKey, timestamp]) => ({
                    sessionKey,
                    startAt: timestamp as Timestamp,
                    millis: (timestamp as Timestamp).toMillis(),
                }))
                .filter((session) => session.millis > currentMillis)
                .sort((a, b) => a.millis - b.millis);

            const nextFutureSession = futureSessions[0];

            if (!nextFutureSession) return null;

            return {
                race,
                nextSessionKey: nextFutureSession.sessionKey,
                nextSessionStartAt: nextFutureSession.startAt,
                nextSessionMillis: nextFutureSession.millis,
            }
        }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.nextSessionMillis - b.nextSessionMillis);

        return candidates[0] ?? null;
    });

    const trackTimezone = computed(() => {
        const lat = nextRaceData.value?.race.circuit.lat;
        const long = nextRaceData.value?.race.circuit.long;

        if (!lat || !long) return null;

        const parsedLat = Number(lat);
        const parsedLong = Number(long);

        if (Number.isNaN(parsedLat) || Number.isNaN(parsedLong)) return null;

        try {
            return tzLookup(parsedLat, parsedLong);
        } catch {
            return null;
        }
    });

    const trackTime = computed(() => {
        const tz = trackTimezone.value;
        if (!tz) return '--:--';

        return new Intl.DateTimeFormat(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            hourCycle: 'h23',
            timeZone: tz,
        }).format(now.value);
    });

    const roundNumber = computed(() => {
        const round = nextRaceData.value?.race.round;
        return round ? `R${String(round).padStart(2, '0')}` : '--';
    });

    const roundDate = computed(() => {
        const race = nextRaceData.value?.race;
        if (!race) return '--';

        const allDates = Object.values(race.sessions)
            .filter((timestamp): timestamp is Timestamp => timestamp != null)
            .map((timestamp) => timestamp.toDate())
            .sort((a, b) => a.getTime() - b.getTime());

        const start = allDates[0];
        const end = allDates[allDates.length - 1];

        if (!start || !end) return '--';

        const startDay = String(start.getDate()).padStart(2, '0');
        const endDay = String(end.getDate()).padStart(2, '0');

        const startMonth = start.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
        const endMonth = end.toLocaleString('en-GB', { month: 'short' }).toUpperCase();

        if (startMonth === endMonth) {
            return `${startDay} – ${endDay} ${startMonth}`;
        }

        return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
    });

    const circuitFlagSrc = computed(() => {
        return getFlagSrc(nextRaceData.value?.race.circuit.country);
    });

    const roundLocality = computed(() => nextRaceData.value?.race.circuit.locality ?? '--');

    const nextSessionLabel = computed(() => {
        const key = nextRaceData.value?.nextSessionKey;
        if (!key) return '--';

        return sessionLabelMap[key];
    });

    const timeUntilNextSession = computed(() => {
        const startAt = nextRaceData.value?.nextSessionStartAt;
        if (!startAt) return '--';

        const diffMs = startAt.toMillis() - now.value.getTime();

        if (diffMs <= 0) return 'LIVE';

        const totalSeconds = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (days > 0) {
            return `${String(days).padStart(2, '0')}D${String(hours).padStart(2, '0')}h`;
        }

        if (hours > 0) {
            return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}m`;
        }

        return `${String(minutes).padStart(2, '0')}m${String(seconds).padStart(2, '0')}s`;
    });

    onMounted(() => {
        updateNow();
        timer = window.setInterval(updateNow, 1000);
        loadRaces();
    });

    onUnmounted(() => {
        if (timer) clearInterval(timer);
    });
</script>

<template>
    <div class="ned-wrapper">
        <div class="ned-left">
            <div class="ned-l-top">
                <p>{{ roundNumber }} | {{ roundDate }}</p>
            </div>
            <div class="ned-l-bottom">
                <img class="ned-flag" :src="circuitFlagSrc">
                <p>{{ roundLocality }} - {{ nextSessionLabel }}  {{ timeUntilNextSession }}</p>
            </div>
        </div>
        <div class="ned-right">
            <div class="ned-r-left">
                <p>
                    <span>MY TIME</span>
                    <span>{{ localTime }}</span>
                </p>
                <p>
                    <span>TRACK TIME</span>
                    <span>{{ trackTime }}</span>
                </p>
            </div>
            <div class="ned-r-right">
                <TagHeuer2026 />
            </div>
        </div>
    </div>
</template>

<style scoped>
    .ned-wrapper {
        width: 100vw;
        min-height: 6.25vh;
        display: flex;
        border-top: 1px solid #5f5f5f;
        border-bottom: 1px solid #5f5f5f;
        color: white;

        --ned-padding: 2.5vw;
    }

    .ned-left {
        width: 50%;
        padding: 0.5vh var(--ned-padding);
    }

    .ned-l-top {
        height: 50%;
        width: 100%;
        display: flex;
        align-items: center;
    }

    .ned-l-top p {
        font-family: var(--font-khinterference);
        font-weight: var(--font-khinterference-regular);
        font-size: 0.75rem;
        line-height: 0.75rem;
        letter-spacing: 0;
    }

    .ned-l-bottom {
        height: 50%;
        width: 100%;
        display: flex;
        align-items: center;
    }

    .ned-flag {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        object-fit: cover;
        object-position: center;
        transform: scale(1.18);
    }

    .ned-l-bottom p {
        margin-left: 0.5vw;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-regular);
        font-size: 1.1rem;
        line-height: 1.5125rem;
        letter-spacing: 0;
    }

    .ned-right {
        width: 50%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-inline: var(--ned-padding);
    }

    .ned-r-left {
        /* width: 80%; */
        height: 100%;
        /* background-color: purple; */
        display: flex;
        flex-direction: column;
        justify-content: center;
        font-weight: var(--font-f1-bold);
        font-size: 0.75rem;
        letter-spacing: 0.1rem;
    }

    .ned-r-left p {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1vw;
        margin-right: 0.5vw;
        
        
        font-family: var(--font-stilu);
        font-weight: var(--font-stilu-bold);
        letter-spacing: -0.005rem;
    }

    .ned-r-left p:first-child {
        font-size: .75rem;
        line-height: 0.5rem;
        margin-bottom: 0.35vh;
    }

    .ned-r-left p:last-child {
        color: grey;
        font-weight: var(--font-stilu-regular);
        font-size: .75rem;
        line-height: 0.5rem;
        margin-top: 0.35vh;
    }

    .ned-r-right {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>