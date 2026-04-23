<script setup lang="ts">
    import { computed, ref, Teleport } from 'vue'
    import { doc, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
    import { db } from "../firebase.ts";
    import { useAuth } from '../composables/auth.ts'
    import type { Race } from '../types/Race.ts';
    import type { League } from '../types/League.ts';
import type { Driver } from '../types/Driver.ts';

    const props = defineProps<{
        race: Race;
        drivers: Driver[];
        league: League;
    }>();

    const { user, authReady } = useAuth();

    const now = ref(Date.now());
    const showBetModal = ref(false);
    const showExtraPointsModal = ref(false);
    const raceSelected = ref<Race | null>(null);
    const sprintPole = ref<string | null>(null);
    const sprintFirst = ref<string | null>(null);
    const sprintSecond = ref<string | null>(null);
    const sprintThird = ref<string | null>(null);
    const racePole = ref<string | null>(null);
    const raceFirst = ref<string | null>(null);
    const raceSecond = ref<string | null>(null);
    const raceThird = ref<string | null>(null);
        
    const isOwner = computed(() => {
        return user.value?.uid === props.league.ownerId;
    });

    setInterval(() => {
        now.value = Date.now()
    }, 60000);

    function resetBetForm() {
        sprintPole.value = null;
        sprintFirst.value = null;
        sprintSecond.value = null;
        sprintThird.value = null;
        racePole.value = null;
        raceFirst.value = null;
        raceSecond.value = null;
        raceThird.value = null;
    }

    const openBetModal = async (race: Race) => {
        showBetModal.value = true;
        raceSelected.value = race;

        // Get the user bet if already made one 
        resetBetForm();

        if (!authReady.value || !user.value) return;

        const userId = user.value.uid;
        const raceId = `race_${race.round}`;
        const entryRef = doc(db, "leagues", props.league.id, "bets", raceId, "entries", userId);
        const entrySnap = await getDoc(entryRef);

        if (!entrySnap.exists()) return;

        const data = entrySnap.data();

        sprintPole.value = data.sprint?.pole ?? null;
        sprintFirst.value = data.sprint?.first ?? null;
        sprintSecond.value = data.sprint?.second ?? null;
        sprintThird.value = data.sprint?.third ?? null;

        racePole.value = data.race?.pole ?? null;
        raceFirst.value = data.race?.first ?? null;
        raceSecond.value = data.race?.second ?? null;
        raceThird.value = data.race?.third ?? null;
    };

    const closeBetModal = () => {
        showBetModal.value = false;
        raceSelected.value = null;
        resetBetForm();
    };

    const openExtraPointsModal = (race: Race) => {
        showExtraPointsModal.value = true;
        raceSelected.value = race;
    };

    const closeExtraPointsModal = () => {
        showExtraPointsModal.value = false;
        raceSelected.value = null;

    };

    const raceTiming = computed(() => {
        const opensAt = props.race.bettingOpensAt?.toMillis?.() ?? null;
        const closesAt = props.race.bettingClosesAt?.toMillis?.() ?? null;

        if (!opensAt || !closesAt) {
            return {
                expired:false,
                canBet: false,
                timeLeft: null,
            };
        }

        const expired = now.value > closesAt;
        const canBet = now.value >= opensAt && now.value < closesAt;

        let timeLeft: string | null = null;

        if (!expired) {
            const targetTime = canBet ? closesAt : opensAt;
            const diff = targetTime - now.value;

            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            const remainingHours = hours % 24;
            const remainingMinutes = minutes % 60;

            if (days > 0) {
                timeLeft = `${days}d ${remainingHours}h`;
            } else if (hours > 0) {
                timeLeft = `${hours}h ${remainingMinutes}m`;
            } else {
                timeLeft = `${remainingMinutes}m`;
            }
        }

        return {
            expired,
            canBet,
            timeLeft
        };
    });

    function isSprintWeekend(race: Race) {
        return race.weekendType === 'sprint';
    }

    function hasDuplicates(values: Array<string | null>) {
        const filledValues = values.filter((value): value is string => !!value);
        return new Set(filledValues).size !== filledValues.length;
    }

    const handleSubmitBet = async () => {
        if (!raceSelected.value) return;

        const racePodiumHasDuplicates = hasDuplicates([
            raceFirst.value,
            raceSecond.value,
            raceThird.value,
        ]);

        if (racePodiumHasDuplicates) {
            alert("Race - First, second and third places must have different drivers.");
            return;
        }

        if (isSprintWeekend(raceSelected.value)) {
            const sprintPodiumHasDuplicates = hasDuplicates([
                sprintFirst.value,
                sprintSecond.value,
                sprintThird.value,
            ]);

            if (sprintPodiumHasDuplicates) {
                alert("Sprint - First, second and third places must have different drivers.");
                return;
            }
        }

        await submitBet(props.league.id, raceSelected.value);
        closeBetModal();
    };

    async function submitBet(leagueId: string, race: Race) {
        if (!authReady.value || !user.value) return;

        const userId = user.value.uid;

        const raceId = `race_${race.round}`;

        const raceBetRef = doc(db, "leagues", leagueId, "bets", raceId);
        const raceBetSnap = await getDoc(raceBetRef);
        
        if(!raceBetSnap.exists()) {
            await setDoc(raceBetRef, {
                season: race.season,
                round: race.round,
                race_name: race.raceName,
                weekend_type: race.weekendType,
                score_calculated_at: null,
                mvp_user_id: null,
            });
        }

        const entryRef = doc(db, "leagues", leagueId, "bets", raceId, "entries", userId);
        const entrySnap = await getDoc(entryRef);

        if (!entrySnap.exists()) {
            await setDoc(entryRef, {
                submitted_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                sprint: race.weekendType === "sprint" ? {
                    pole: sprintPole.value,
                    first: sprintFirst.value,
                    second: sprintSecond.value,
                    third: sprintThird.value,
                } : null,
                race: {
                    pole: racePole.value,
                    first: raceFirst.value,
                    second: raceSecond.value,
                    third: raceThird.value,
                },
                points: {
                    score: 0,
                    last_calculated_at: null
                }
            });
        } else {
            await setDoc(entryRef, {
                updated_at: serverTimestamp(),
                sprint: race.weekendType === "sprint" ? {
                    pole: sprintPole.value,
                    first: sprintFirst.value,
                    second: sprintSecond.value,
                    third: sprintThird.value,
                } : null,
                race: {
                    pole: racePole.value,
                    first: raceFirst.value,
                    second: raceSecond.value,
                    third: raceThird.value,
                }
            }, { merge: true });
        }
    }

    const handleSubmitExtraPoints = async () => {
        if (!raceSelected.value) return;

        closeExtraPointsModal();
    }
</script>

<template>
    <Teleport to="body">
        <div v-if="showBetModal" class="modal-overlay" @click.self="closeBetModal">
            <div class="modal-content">
                <form v-on:submit.prevent="handleSubmitBet">
                    <div v-if="raceSelected !== null && isSprintWeekend(raceSelected)">
                        <h2>Sprint Bet</h2>
                        <label for="sprintPole">Sprint Pole:</label>
                        <select required v-model="sprintPole" name="sprintPole">
                            <option disabled value="">Select driver</option>
                            <option v-for="driver in drivers" :key="driver.driverId" :value="driver.driverId">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="sprintFirst">Sprint First:</label>
                        <select required v-model="sprintFirst" name="sprintFirst">
                            <option disabled value="">Select driver</option>
                            <option v-for="driver in drivers" :key="driver.driverId" :value="driver.driverId">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="sprintSecond">Sprint Second:</label>
                        <select required v-model="sprintSecond" name="sprintSecond">
                            <option disabled value="">Select driver</option>
                            <option v-for="driver in drivers" :key="driver.driverId" :value="driver.driverId">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="sprintThird">Sprint Third:</label>
                        <select required v-model="sprintThird" name="sprintThird">
                            <option disabled value="">Select driver</option>
                            <option v-for="driver in drivers" :key="driver.driverId" :value="driver.driverId">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <h2>Race Bet</h2>
                        <label for="racePole">Race Pole:</label>
                        <select required v-model="racePole" name="racePole">
                            <option disabled value="">Select driver</option>
                            <option v-for="driver in drivers" :key="driver.driverId" :value="driver.driverId">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="raceFirst">Race First:</label>
                        <select required v-model="raceFirst" name="raceFirst">
                            <option disabled value="">Select driver</option>
                            <option v-for="driver in drivers" :key="driver.driverId" :value="driver.driverId">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="raceSecond">Race Second:</label>
                        <select required v-model="raceSecond" name="raceSecond">
                            <option disabled value="">Select driver</option>
                            <option v-for="driver in drivers" :key="driver.driverId" :value="driver.driverId">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="raceThird">Race Third:</label>
                        <select required v-model="raceThird" name="raceThird">
                            <option disabled value="">Select driver</option>
                            <option v-for="driver in drivers" :key="driver.driverId" :value="driver.driverId">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                    </div>
                    <button type="submit">Place Bet</button>
                    <button @click="closeBetModal">Cancel</button>
                </form>
            </div>
        </div>

        <div v-else-if="showExtraPointsModal" class="modal-overlay" @click="closeExtraPointsModal">
            <div class="modal-content">
                <form v-on:submit.prevent="handleSubmitExtraPoints">
                    <h2>Extra Points</h2>
                    <!-- <select required v-model="racePole" name="racePole">
                            <option disabled value="">Select driver</option>
                            <option v-for="driver in drivers" :key="driver.driverId" :value="driver.driverId">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                    </select> -->
                    <button type="submit">Ok</button>
                    <button @click="closeExtraPointsModal">Close</button>
                </form>
            </div>
        </div>
    </Teleport>

    <div class="race-card" :class="{locked: raceTiming.expired}">
        <h4>{{ race.round }}.  {{ race.raceName }}</h4>
        
        <div v-if="!raceTiming.expired">
            <div v-if="raceTiming.canBet">
                <button @click="openBetModal(race)">Bet</button>
                <span>Closes in: {{ raceTiming.timeLeft }}</span>
            </div>
            <div v-else>
                <span>Opens in: {{ raceTiming.timeLeft }}</span>
            </div>            
        </div>

        <div v-else>
            <font-awesome-icon icon="fa-solid fa-star" style="color: rgb(255, 212, 59);" />
            <span>NAME</span>
            <div v-if="isOwner">
                <button @click="openExtraPointsModal(race)">
                    <font-awesome-icon icon="fa-solid fa-plus" style="color: rgb(31, 31, 31);" />
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.race-card {
    padding: 16px;
    border-radius: 10px;
    margin-bottom: 12px;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background-color: #e5e5e5;
}

.race-card.locked {
    background-color: #a0a0a0;
    opacity: 0.85;
}

.race-card h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.race-card button {
    align-self: flex-start;
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    background-color: #2d7ef7;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.race-card button:hover {
    background-color: #1b5fd1;
}

.race-card span {
    font-weight: 500;
    margin-left: 6px;
}

.race-card:not(.locked):hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}
</style>