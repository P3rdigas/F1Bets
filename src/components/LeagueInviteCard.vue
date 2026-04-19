<script setup lang="ts">
    import { doc, collection, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
    import { db } from '../firebase.ts'
    import { user } from '../composables/auth.ts';
    import { RequestStatus } from '../types/RequestStatus.ts';
    import { LeagueRoleType } from '../types/LeagueRoleType.ts';

    const props = defineProps<{
        id: string;
        leagueId: string;
        name: string;
        username: string;
    }>();

    const acceptRequest = async () => {
        await updateDoc(doc(collection(db, 'league_invites'), props.id), {
            status: RequestStatus.ACCEPTED,
            responded_at: serverTimestamp(),
        });

        // Add membership
        await addDoc(collection(db, 'league_memberships'), {
            league_id: props.leagueId,
            user_id: user.value?.uid,
            role: LeagueRoleType.MEMBER,
            total_points: 0,
            joined_at: serverTimestamp()
        });
    }

    const rejectRequest = async () => {
        await updateDoc(doc(collection(db, 'league_invites'), props.id), {
            status: RequestStatus.REJECTED,
            responded_at: serverTimestamp(),
        });
    }
</script>

<template>
    <div class="invite">
        <div class="received">
            <p class="league-name">{{name}}</p>
            <p class="username">{{username}}</p>
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