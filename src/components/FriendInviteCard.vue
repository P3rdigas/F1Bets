<script setup lang="ts">
    import { doc, collection, updateDoc, serverTimestamp } from "firebase/firestore";
    import { db } from '../firebase.ts'
    import { InviteType } from '../types/InviteType.ts'
    import { RequestStatus } from '../types/RequestStatus.ts';

    const props = defineProps<{
        id: string;
        username: string;
        type: InviteType;
    }>();

    const acceptRequest = async () => {
        await updateDoc(doc(collection(db, 'friends'), props.id), {
            status: RequestStatus.ACCEPTED,
            responded_at: serverTimestamp(),
        });
    }

    const rejectRequest = async () => {
        await updateDoc(doc(collection(db, 'friends'), props.id), {
            status: RequestStatus.REJECTED,
            responded_at: serverTimestamp(),
        });
    }
</script>

<template>
    <div class="invite">
        <div v-if="type === InviteType.SENT" class="sent">
            <p class="username">{{username}}</p>
            <p class="pending">Pending...</p>
        </div>
        <div v-else class="received">
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