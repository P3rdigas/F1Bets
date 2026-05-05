<script setup lang="ts">
    import { ref } from 'vue';
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

    const isResponding = ref(false);

    const acceptRequest = async () => {
        if (!user.value?.uid) return;

        isResponding.value = true;

        try {
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
        } finally {
            isResponding.value = false;
        }
    }

    const rejectRequest = async () => {
        if (!user.value?.uid) return;

        isResponding.value = true;

        try {
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
        } finally {
            isResponding.value = false;
        }
    }
</script>

<template>
    <div class="invite">
        <div v-if="type === InviteType.SENT" class="sent">
            <span>● {{otherUsername}} - Pending...</span>
        </div>
        <div v-else class="received">
            <span>● {{otherUsername}}</span>

            <div class="actions">
                <button :disabled="isResponding" @click="acceptRequest">
                    <font-awesome-icon icon="fa-solid fa-check" />
                </button>
                <button :disabled="isResponding" @click="rejectRequest">
                    <font-awesome-icon icon="fa-solid fa-xmark" />
                </button>
            </div>
        </div>    
    </div>
</template>

<style scoped>

    .invite {
        width: 100%;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-bold);
        font-size: 0.65rem;
        color: white;
    }

    .sent,
    .received {
        display: flex;
        align-items: center;
        width: 100%;
        min-height: 2rem;
    }

    .received {
        justify-content: space-between;
    }

    .received .actions {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin-left: auto;
    }

    .received button {
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

    .received button:hover {
        color: var(--f1-red);
        border-color: var(--f1-red);
    }

    .received button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
</style>