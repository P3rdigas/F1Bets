<script setup lang="ts">
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

    const acceptRequest = async () => {
        if (!user.value?.uid || !userProfile.value?.username) return;

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
    }

    const rejectRequest = async () => {
        if (!user.value?.uid) return;

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
    }
</script>

<template>
    <div class="invite">
        <div class="received">
            <p class="league-name">{{leagueName}}</p>
            <p class="owner-username">{{ownerUsername}}</p>
            <button class="accept" @click="acceptRequest">
                <font-awesome-icon icon="fa-solid fa-circle-check" style="color: rgb(99, 230, 190);"/>
            </button>
            <button class="reject" @click="rejectRequest">
                <font-awesome-icon icon="fa-solid fa-circle-xmark" style="color: rgb(228, 46, 46);"/>
            </button>   
        </div>    
    </div>
</template>

<style scoped>
    
</style>