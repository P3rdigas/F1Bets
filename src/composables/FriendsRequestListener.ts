import { ref, computed, onBeforeUnmount, watchEffect } from 'vue';
import { collection, query, where, orderBy, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { user } from './auth.ts';
import { InviteType } from '../types/InviteType.ts';
import { RequestStatus } from '../types/RequestStatus.ts';
import type { FriendRequestsResponse } from '../types/FriendRequestsResponse.ts';
import type { FriendRequestFirestore } from '../types/firestore/FriendRequestFirestore.ts';

const friendRequests = ref<FriendRequestsResponse[]>([]);

const receivedRequests = computed(() =>
    friendRequests.value.filter(req => req.type === InviteType.RECEIVED)
);

const sentRequests = computed(() =>
    friendRequests.value.filter(req => req.type === InviteType.SENT)
);

let unsubscribeRequests: Unsubscribe | null = null;

function stopListeners() {
    if (unsubscribeRequests) {
        unsubscribeRequests();
        unsubscribeRequests = null;
    }

    friendRequests.value = [];
}

function startListener(currentUid: string) {
    const q = query(
        collection(db, 'users', currentUid, 'friend_requests'),
        where('status', '==', RequestStatus.PENDING),
        orderBy('other_username', 'asc'),
    );

    unsubscribeRequests = onSnapshot(q, (snapshot) => {
        friendRequests.value = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as FriendRequestFirestore;

        return {
            id: docSnap.id,
            otherUserId: data.other_user_id,
            otherUsername: data.other_username,
            type: data.direction,
        } as FriendRequestsResponse;
        });
    });
}

export function userFriendRequests() {
    watchEffect(() => {
        const current = user.value;
        stopListeners();

        if (current?.uid) {
            startListener(current.uid);
        }
    });

    onBeforeUnmount(stopListeners);

    return {
        friendRequests,
        receivedRequests,
        sentRequests,
    };
}
