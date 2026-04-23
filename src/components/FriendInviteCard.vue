<script setup lang="ts">
    import { getDoc, doc, writeBatch, serverTimestamp } from "firebase/firestore";
    import { db } from '../firebase.ts';
    import { user } from '../composables/auth.ts';
    import { InviteType } from '../types/InviteType.ts';
    import { RequestStatus } from '../types/RequestStatus.ts';

    const props = defineProps<{
        id: string;
        otherUserId: string;
        otherUsername: string;
        type: InviteType;
    }>();

    const acceptRequest = async () => {
        if (!user.value?.uid) return;

        const currentUid = user.value.uid;
        const otherUserId = props.otherUserId;

        const currentUserRef = doc(db, "users", currentUid);
        const currentUserSnap = await getDoc(currentUserRef);

        if (!currentUserSnap.exists()) return;

        const currentUserData = currentUserSnap.data();

        const receivedRequestRef = doc(db, "users", currentUid, "friend_requests", props.id);
        const sentRequestRef = doc(db, "users", otherUserId, "friend_requests", props.id);

        const myFriendRef = doc(db, "users", currentUid, "friends", otherUserId);
        const otherFriendRef = doc(db, "users", otherUserId, "friends", currentUid);

        const batch = writeBatch(db);

        batch.update(receivedRequestRef, {
            status: RequestStatus.ACCEPTED,
            responded_at: serverTimestamp(),
        });

        batch.update(sentRequestRef, {
            status: RequestStatus.ACCEPTED,
            responded_at: serverTimestamp(),
        });

        batch.set(myFriendRef, {
            user_id: props.otherUserId,
            username: props.otherUsername,
            created_at: serverTimestamp(),
        });

        batch.set(otherFriendRef, {
            user_id: currentUid,
            username: currentUserData.username,
            created_at: serverTimestamp(),
        });

        await batch.commit();
    }

    const rejectRequest = async () => {
        if (!user.value?.uid) return;

        const currentUid = user.value.uid;
        const otherUserId = props.otherUserId;

        const receivedRequestRef = doc(db, "users", currentUid, "friend_requests", props.id);
        const sentRequestRef = doc(db, "users", otherUserId, "friend_requests", props.id);

        const batch = writeBatch(db);

        batch.update(receivedRequestRef, {
            status: RequestStatus.REJECTED,
            responded_at: serverTimestamp(),
        });

        batch.update(sentRequestRef, {
            status: RequestStatus.REJECTED,
            responded_at: serverTimestamp(),
        });

        await batch.commit();
    }
</script>

<template>
    <div class="invite">
        <div v-if="type === InviteType.SENT" class="sent">
            <p class="username">{{otherUsername}}</p>
            <p class="pending">Pending...</p>
        </div>
        <div v-else class="received">
            <p class="username">{{otherUsername}}</p>
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