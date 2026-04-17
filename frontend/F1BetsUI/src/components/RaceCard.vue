<script setup lang="ts">
    import { computed, ref, Teleport } from 'vue'
    import type { Race } from '../types/Race.ts';

    const props = defineProps<{
        race: Race
        drivers: any[]
    }>();

    // console.log('RaceCard props:', props.drivers);

    const now = ref(Date.now());
    const showBetModal = ref(false);
    const raceToBet = ref<Race | null>(null);
    const sprintPole = ref<string | null>(null);
    const sprintFirst = ref<string | null>(null);
    const sprintSecond = ref<string | null>(null);
    const sprintThird = ref<string | null>(null);
    const racePole = ref<string | null>(null);
    const raceFirst = ref<string | null>(null);
    const raceSecond = ref<string | null>(null);
    const raceThird = ref<string | null>(null);    

    setInterval(() => {
        now.value = Date.now()
    }, 60000);

    const openBetModal = (race: Race) => {
        showBetModal.value = true;
        raceToBet.value = race;
    };

    const closeBetModal = () => {
        showBetModal.value = false;
        raceToBet.value = null;
        sprintPole.value = null;
        sprintFirst.value = null;
        sprintSecond.value = null;
        sprintThird.value = null;
        racePole.value = null;
        raceFirst.value = null;
        raceSecond.value = null;
        raceThird.value = null;
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
</script>

<template>
    <Teleport to="body">
        <div v-if="showBetModal" class="modal-overlay" @click.self="closeBetModal">
            <div class="modal-content">
                <form>
                    <div v-if="raceToBet !== null && isSprintWeekend(raceToBet)">
                        <h2>Sprint Bet</h2>
                        <label for="sprintPole">Sprint Pole:</label>
                        <select required v-model="sprintPole" name="sprintPole">
                            <option v-for="driver in drivers" :value="driver.value">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="sprintFirst">Sprint First:</label>
                        <select required v-model="sprintFirst" name="sprintFirst">
                            <option v-for="driver in drivers" :value="driver.value">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="sprintSecond">Sprint Second:</label>
                        <select required v-model="sprintSecond" name="sprintSecond">
                            <option v-for="driver in drivers" :value="driver.value">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="sprintThird">Sprint Third:</label>
                        <select required v-model="sprintThird" name="sprintThird">
                            <option v-for="driver in drivers" :value="driver.value">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <h2>Race Bet</h2>
                        <label for="racePole">Race Pole:</label>
                        <select required v-model="racePole" name="racePole">
                            <option v-for="driver in drivers" :value="driver.value">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="raceFirst">Race First:</label>
                        <select required v-model="raceFirst" name="raceFirst">
                            <option v-for="driver in drivers" :value="driver.value">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="raceSecond">Race Second:</label>
                        <select required v-model="raceSecond" name="raceSecond">
                            <option v-for="driver in drivers" :value="driver.value">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                        <label for="raceThird">Race Third:</label>
                        <select required v-model="raceThird" name="raceThird">
                            <option v-for="driver in drivers" :value="driver.value">
                                {{ driver.givenName }} {{ driver.familyName }}
                            </option>
                        </select>
                    </div>
                    <button type="submit">Place Bet</button>
                    <button @click="closeBetModal">Cancel</button>
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