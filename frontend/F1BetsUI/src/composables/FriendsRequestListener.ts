import { ref, onBeforeUnmount, watchEffect } from 'vue';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { user } from './auth.ts';
import { RequestStatus } from '../types/RequestStatus.ts';
import type { FriendRequestsResponse } from '../types/FriendRequestsResponse.ts';

const receivedRequests = ref<FriendRequestsResponse[]>([]);
const sentRequests = ref<FriendRequestsResponse[]>([]);

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

  receivedRequests.value = [];
  sentRequests.value = [];
}

// TODO: Refactor code like in FriendsListener to avoid duplication
function startListeners(currentUid: string) {
  const baseCol = collection(db, 'friends');

  const receivedQ = query(
    baseCol,
    where('receiver_id', '==', currentUid),
    where('status', '==', RequestStatus.PENDING),
    orderBy('created_at', 'desc'),
  );

  unsubscribeReceived = onSnapshot(receivedQ, async (snapshot) => {  
    const requests = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const userRef = doc(db, 'users', data.sender_id);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          return {
            id: docSnap.id,
            username: userSnap.data().username as string,
          } as FriendRequestsResponse;
        }

        return undefined;
      })
    );

    receivedRequests.value = requests.filter((req): req is FriendRequestsResponse => req !== undefined);;
  });

  const sentQ = query(
    baseCol,
    where('sender_id', '==', currentUid),
    where('status', '==', RequestStatus.PENDING),
    orderBy('created_at', 'desc'),
  );

  unsubscribeSent = onSnapshot(sentQ, async (snapshot) => {
    const requests = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const userRef = doc(db, 'users', data.receiver_id);
        const userSnap = await getDoc(userRef);
       
        if (userSnap.exists()) {
          return {
            id: docSnap.id,
            username: userSnap.data().username as string,
          } as FriendRequestsResponse;
        }

        return undefined;
      })
    );
    
    sentRequests.value = requests.filter((req): req is FriendRequestsResponse => req !== undefined);
  });
}

export function userFriendRequests() {
  watchEffect(() => {
    const current = user.value;
    stopListeners();

    if (current?.uid) {
      startListeners(current.uid);
    }
  });

  onBeforeUnmount(() => {
    stopListeners();
  });

  return {
    receivedRequests,
    sentRequests,
  };
}
