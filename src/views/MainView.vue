<script setup lang="ts">
// Home page logic
    import { ref } from 'vue';
    import { signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser} from "firebase/auth";
    import { doc, runTransaction, serverTimestamp  } from "firebase/firestore";
    import { db, auth } from '../firebase.ts'
    import router from '../router/index.ts'

    //TODO: prevent SQL injection
    const isLogin = ref(true);
    const loginForm = ref({
        email: '',
        password: ''
    });
    const registerForm = ref({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        // avatar: null as File | null
    });

    const isLoggingIn = ref(false);
    const isRegistering = ref(false);

    // const onAvatarChange = (e: Event) => {
    //     const target = e.target as HTMLInputElement;
    //     registerForm.value.avatar = target.files?.[0] ?? null;
    // };

    const submitLogin = async () => {
        isLoggingIn.value = true;

        try {
            await signInWithEmailAndPassword(auth, loginForm.value.email, loginForm.value.password);
            alert("Login OK!");
            router.push({ name: 'Home' });
        } catch (error: any) {
            alert(error.message);
        } finally {
            isLoggingIn.value = false;
        }
    };

    const submitRegister = async () => {
        if (registerForm.value.password !== registerForm.value.confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        const username = registerForm.value.username.trim().toLowerCase();
        const email = registerForm.value.email.trim();
        const password = registerForm.value.password;

        isRegistering.value = true;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            const usernameRef = doc(db, 'usernames', username);
            const userRef = doc(db, 'users', uid);

            try {
                await runTransaction(db, async (transaction) => {
                    const usernameSnap = await transaction.get(usernameRef);

                    if (usernameSnap.exists()) {
                        throw new Error('Username already exists!');
                    }

                    transaction.set(usernameRef, {
                        user_id: uid,
                        created_at: serverTimestamp(),
                    });

                    transaction.set(userRef, {
                        avatar: null,
                        created_at: serverTimestamp(),
                        email: email,
                        username: username,
                    });
                });

                router.push({ name: 'Home' });
            } catch (error) {
                await deleteUser(userCredential.user);
                throw error;
            }
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
            alert('Email already in use!');
            return;
            }

            if (error.code === 'auth/invalid-email') {
            alert('Invalid email!');
            return;
            }

            if (error.code === 'auth/weak-password') {
            alert('Weak password!');
            return;
            }

            alert(error.message || 'Registration failed!');
        } finally {
            isRegistering.value = false;
        }
    };
</script>

<template>
    <div class="home">
        <div class="box">

            <div class="tab-switcher" :class="{ active: isLogin }">
                <button class="tab-btn" @click="isLogin = true">Login</button>
                <button class="tab-btn" @click="isLogin = false">Register</button>
            </div>

            <!-- Login Form (default) -->
            <form v-if="isLogin" class="auth-form" v-on:submit.prevent="submitLogin">
                <input v-model="loginForm.email" type="email" placeholder="Email" required />
                <input v-model="loginForm.password" type="password" placeholder="Password" required />
                <button type="submit" :disabled="isLoggingIn">
                    {{ isLoggingIn ? 'Logging in...' : 'Login' }}
                </button>
            </form>

            <!-- Register Form -->
            <form v-else class="auth-form" v-on:submit.prevent="submitRegister">
                <input v-model="registerForm.email" type="email" placeholder="Email" required />
                <input v-model="registerForm.username" type="text" placeholder="Username" required />
                <input v-model="registerForm.password" type="password" placeholder="Password" required />
                <input v-model="registerForm.confirmPassword" type="password" placeholder="Confirm Password" required />
                <!-- <input type="file" placeholder="Avatar" /> -->
                <button type="submit" :disabled="isRegistering">
                    {{ isRegistering ? 'Registering...' : 'Register' }}
                </button>
            </form>
        </div>
    </div>
</template>

<style scoped>
    .home {
        background-image: url('/images/home-hero.png'); 
        background-size: cover;
        min-height: 100vh;
        text-align: center;
        display: flex;
        align-items: center;
    }

    .box {
        height: 60vh;
        width: 30vw;
        background: rgba(255, 255, 255, 0.95);
        margin-left: 7.5vw;
        border-radius: 5%;
        box-shadow: 
            0 30px 60px rgba(0, 0, 0, 0.25),
            0 15px 30px rgba(0, 0, 0, 0.15);
        padding: 2rem;
        display: flex;
        flex-direction: column;
    }

    .tab-switcher {
        display: flex;
        margin-bottom: 2rem;
        border-radius: 50px;
        overflow: hidden;
        position: relative;
        background: var(--f1-dark-grey);
    }

    /* 🔥 Red diagonal overlay */
    .tab-switcher::before {
        content: "";
        position: absolute;
        inset: 0;
        background: var(--f1-red);
        clip-path: polygon(0 0, 50% 0, 65% 100%, 0% 100%);
        transition: clip-path 0.6s ease;
    }

    /* When register is active → move diagonal */
    .tab-switcher:not(.active)::before {
        clip-path: polygon(35% 0, 100% 0, 100% 100%, 50% 100%);
    }

    .tab-btn {
        flex: 1;
        padding: 1rem 0;
        border: none;
        background: transparent;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        z-index: 1;
        transition: color 0.4s ease;
        color: #aaa;
    }

    .tab-btn:first-child {
        color: white;
    }

    .tab-switcher:not(.active) .tab-btn:first-child {
        color: #aaa;
    }

    .tab-switcher:not(.active) .tab-btn:last-child {
        color: white;
    }

    .auth-form {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .auth-form input {
        padding: 1rem;
        border: 2px solid #e1e5e9;
        border-radius: 12px;
        font-size: 1rem;
        transition: all 0.3s ease;
    }

    .auth-form input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }

    .auth-form button {
        padding: 1.2rem;
        background: linear-gradient(135deg, #007bff, #0056b3);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .auth-form button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0,123,255,0.3);
    }
</style>