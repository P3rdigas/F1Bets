import { ref, readonly, watch } from 'vue';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import { user, authReady } from './auth';

type CurrentUserProfile = {
    username: string;
    avatar?: string | null;
    };

const userProfile = ref<CurrentUserProfile | null>(null);
const profileReady = ref(false);
const profileError = ref<Error | null>(null);

let unsubscribeProfile: Unsubscribe | null = null;

function stopProfileListener() {
    if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
    }

    userProfile.value = null;
    profileError.value = null;
}

watch(
    [user, authReady],
    ([currentUser, isAuthReady]) => {
        stopProfileListener();
        profileReady.value = false;

        if (!isAuthReady) {
            return;
        }

        if (!currentUser?.uid) {
            profileReady.value = true;
            return;
        }

        const userRef = doc(db, 'users', currentUser.uid);

        unsubscribeProfile = onSnapshot(
            userRef, 
            (snapshot) => {
                userProfile.value = snapshot.exists() ? (snapshot.data() as CurrentUserProfile) : null;

                profileError.value = null;
                profileReady.value = true;
            },
            (error) => {
                userProfile.value = null;
                profileError.value = error as Error;
                profileReady.value = true;
            }
        );
    },
    { immediate: true }
);

export function useCurrentUserProfile() {
  return {
    userProfile: readonly(userProfile),
    profileReady: readonly(profileReady),
    profileError: readonly(profileError),
  };
}