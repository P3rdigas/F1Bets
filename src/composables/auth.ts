import { ref, readonly } from 'vue';
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../firebase";

export const user = ref<User | null>(null);
export const authReady = ref(false);

let resolveAuth: (user: User | null) => void;

export const authPromise = new Promise<User | null>((resolve) => {
  resolveAuth = resolve;
});

onAuthStateChanged(auth, (firebaseUser) => {
  user.value = firebaseUser;
  authReady.value = true;
  resolveAuth(firebaseUser);
});

export function useAuth() {
  return {
    user: readonly(user),
    authReady: readonly(authReady),
    authPromise,
  };
}