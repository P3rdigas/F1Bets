<script setup lang="ts">
    import { computed, ref } from 'vue'
    import type { Race } from '../types/Race.ts';
    import type { RaceSprint } from '../types/RaceSprint.ts';

    const props = defineProps<{
        race: Race | RaceSprint
    }>();

    const now = ref(Date.now());

    setInterval(() => {
        now.value = Date.now()
    }, 60000);

    const raceTiming = computed(() => {
        const dateStr = props.race.FirstPractice.date;
        const timeStr = props.race.FirstPractice.time;

        const practiceDate = new Date(`${dateStr}T${timeStr}`);
        const deadline = practiceDate.getTime() - (60 * 60 * 1000); // 1 hour before first practice

        const diff = deadline - now.value;

        const canBet = diff > 0;

        let timeLeft: string | null = null;

        if (canBet) {
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
            canBet,
            timeLeft
        };
    });
</script>

<template>
    <div class="race-card" :class="{locked: !raceTiming.canBet}">
        <h4>{{ race.round }}.  {{ race.raceName }}</h4>
        
        <div v-if="raceTiming.canBet">
            <button>Bet</button>
            <span>{{ raceTiming.timeLeft }}</span>
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
}

.race-card {
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
</style>