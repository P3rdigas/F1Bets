<script setup lang="ts">
    import { ref } from 'vue';
    import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
    import { db } from '../firebase.ts'
    import { user } from '../composables/auth.ts';
    import { RequestStatus } from '../types/RequestStatus.ts';
    import { LeagueRoleType } from '../types/LeagueRoleType.ts';
    import { useCurrentUserProfile } from '../composables/CurrentUserProfile.ts';

    const { userProfile } = useCurrentUserProfile();

    const props = defineProps<{
        id: string;
        leagueId: string;
        leagueSeasonYear: number;
        leagueName: string;
        ownerUsername: string;
        ownerId: string;
    }>();

    const isResponding = ref(false);

    const acceptRequest = async () => {
        if (!user.value?.uid || !userProfile.value?.username) return;

        isResponding.value = true;

        try {
            const userId = user.value.uid;

            const leagueInviteRef = doc(db, "leagues", props.leagueId, "invites", props.id);
            const userInviteRef = doc(db, "users", userId, "league_invites", props.id);
            const leagueMemberRef = doc(db, "leagues", props.leagueId, "members", userId);
            const userLeagueRef = doc(db, "users", userId, "leagues", props.leagueId);

            const batch = writeBatch(db);

            batch.update(leagueInviteRef, {
                status: RequestStatus.ACCEPTED,
                responded_at: serverTimestamp(),
            });

            batch.update(userInviteRef, {
                status: RequestStatus.ACCEPTED,
                responded_at: serverTimestamp(),
            });

            batch.set(leagueMemberRef, {
                username: userProfile.value.username,
                role: LeagueRoleType.MEMBER,
                total_points: 0,
                joined_at: serverTimestamp(),
            });

            batch.set(userLeagueRef, {
                league_name: props.leagueName,
                season_year: props.leagueSeasonYear,
                owner_id: props.ownerId,
                owner_username: props.ownerUsername,
                role: LeagueRoleType.MEMBER,
                joined_at: serverTimestamp(),
            });

            await batch.commit();
        } finally {
            isResponding.value = false;
        }
    }

    const rejectRequest = async () => {
        if (!user.value?.uid) return;

        isResponding.value = true;

        try {
            const userId = user.value.uid;

            const leagueInviteRef = doc(db, "leagues", props.leagueId, "invites", props.id);
            const userInviteRef = doc(db, "users", userId, "league_invites", props.id);

            const batch = writeBatch(db);

            batch.update(leagueInviteRef, {
                status: RequestStatus.REJECTED,
                responded_at: serverTimestamp(),
            });

            batch.update(userInviteRef, {
                status: RequestStatus.REJECTED,
                responded_at: serverTimestamp(),
            });

            await batch.commit();
        } finally {
            isResponding.value = false;
        }
    }
</script>

<template>
    <div class="invite">
        <span>● {{leagueName}} - {{ownerUsername}}</span>

        <div class="actions">
            <button :disabled="isResponding" @click="acceptRequest">
                <font-awesome-icon icon="fa-solid fa-check" />
            </button>
            <button :disabled="isResponding" @click="rejectRequest">
                <font-awesome-icon icon="fa-solid fa-xmark" />
            </button>
        </div>
    </div>
</template>

<style scoped>

    .invite {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 2rem;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-bold);
        font-size: 0.65rem;
        color: white;
        gap: 0.5rem;
    }

    .invite span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin-left: auto;
    }

    .invite button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        color: var(--f1-light-grey);
        background: transparent;
        border: 1px solid var(--f1-light-grey);
        border-radius: 999px;
        cursor: pointer;
    }

    .invite button:hover:not(:disabled) {
        color: var(--f1-red);
        border-color: var(--f1-red);
    }

    .invite button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
</style>