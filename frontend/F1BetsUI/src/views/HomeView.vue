<script setup lang="ts">
    import { signOut } from 'firebase/auth';
    import { auth } from '../firebase.ts';
    import router from '../router/index.ts';

    const signout = async () => {
        try {
            await signOut(auth);
            router.push({ name: 'Main' });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
</script>

<template>
    <div>
        <button @click="signout">Sign Out</button>
    </div>
</template>

<style scoped>
</style>