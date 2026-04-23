// composables/useFriends.ts
import { ref, watchEffect, onBeforeUnmount } from 'vue';
import { collection, query, orderBy, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { user } from './auth.ts';
import type { Friend } from '../types/Friend.ts';

const friends = ref<Friend[]>([]);

let unsubscribeFriends: Unsubscribe | null = null;

function stopListeners() {
    if (unsubscribeFriends) {
        unsubscribeFriends();
        unsubscribeFriends = null;
    }

    friends.value = [];
}

function startListeners(currentUid: string) {
    const q = query(
        collection(db, 'users', currentUid, 'friends'),
        orderBy('username', 'asc')
    );

    unsubscribeFriends = onSnapshot(q, (snapshot) => {
        friends.value = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        return {
            id: docSnap.id,
            username: data.username,
        } as Friend;
        });
    });
}

export function userFriends() {
    watchEffect(() => {
        const current = user.value;
        stopListeners();

        if (current?.uid) {
            startListeners(current.uid);
        }
    });

    onBeforeUnmount(stopListeners);

    return { friends };
}
