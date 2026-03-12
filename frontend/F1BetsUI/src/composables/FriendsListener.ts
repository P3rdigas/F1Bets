// composables/useFriends.ts
import { ref, watchEffect, onBeforeUnmount } from 'vue';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, type Unsubscribe, QuerySnapshot } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { user } from './auth.ts';
import type { Friend } from '../types/Friend.ts';
import { RequestStatus } from '../types/RequestStatus.ts';

const friends = ref<Friend[]>([]);

let unsubscribeReceived: Unsubscribe | null = null;
let unsubscribeSent: Unsubscribe | null = null;


function stopListeners() {
  if (unsubscribeReceived) {
    unsubscribeReceived();
    unsubscribeReceived = null;
  }

  if (unsubscribeSent) {
    unsubscribeSent();
    unsubscribeSent = null;
  }

  friends.value = [];
}

function startListeners(currentUid: string) {
    const baseCol = collection(db, 'friends');

    // Friends that SENT requests to me and were ACCEPTED
    const acceptedReceivedQ = query(
        baseCol,
        where('receiver_id', '==', currentUid),
        where('status', '==', RequestStatus.ACCEPTED),
        orderBy('created_at', 'desc')
    );

    unsubscribeReceived = onSnapshot(acceptedReceivedQ, async (snapshot) => {
        const receivedFriends = await processFriendsSnapshot(snapshot, currentUid);
        updateFriendsList(receivedFriends);
    });

    // Friends that I SENT requests to and were ACCEPTED
    const acceptedSentQ = query(
        baseCol,
        where('sender_id', '==', currentUid),
        where('status', '==', RequestStatus.ACCEPTED),
        orderBy('created_at', 'desc')
    );

    unsubscribeSent = onSnapshot(acceptedSentQ, async (snapshot) => {
        const sentFriends = await processFriendsSnapshot(snapshot, currentUid);
        updateFriendsList(sentFriends);
    });
}

const processFriendsSnapshot = async (snapshot: QuerySnapshot, currentUid: string) => {
    return Promise.all(
        snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const friendId = data.sender_id === currentUid ? data.receiver_id : data.sender_id;
            
            const friendSnap = await getDoc(doc(db, 'users', friendId));
            
            if (friendSnap.exists()) {
                const friendData = friendSnap.data();
                return {
                    id: friendId,
                    username: friendData.username,
                } as Friend;
            }

            return undefined;
        })
    ).then(friendsData => friendsData.filter((friend): friend is Friend => friend !== undefined));
};

const updateFriendsList = (newFriends: Friend[]) => {
    const uniqueFriends = newFriends.filter(newFriend => !friends.value.some(existing => existing.id === newFriend.id));
    
    friends.value.push(...uniqueFriends);
};

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
