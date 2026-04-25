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

        const username = registerForm.value.username.trim();
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

    const beforeEnter = (el: Element) => {
        const element = el as HTMLElement;
        element.style.height = '0';
        element.style.opacity = '0';
    };

    const enter = (el: Element) => {
        const element = el as HTMLElement;

        element.style.transition = 'height 0.35s ease, opacity 0.25s ease, transform 0.25s ease';
        element.style.height = element.scrollHeight + 'px';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    };

    const afterEnter = (el: Element) => {
        const element = el as HTMLElement;
        element.style.height = 'auto';
    };

    const beforeLeave = (el: Element) => {
        const element = el as HTMLElement;
        element.style.height = element.scrollHeight + 'px';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    };

    const leave = (el: Element) => {
        const element = el as HTMLElement;
        void element.offsetHeight;
        element.style.transition = 'height 0.3s ease, opacity 0.2s ease, transform 0.2s ease';
        element.style.height = '0';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-8px)';
    };
</script>

<template>
    <div class="main">
        <div class="main-box">
            <div class="main-header">
                <h1>Welcome to F1 Bets</h1>
                <p>Sign in or create an account to manage your podium picks and compete with friends</p>
            </div>

            <div class="switch-button">
                <span class="active" :style="{ left: isLogin ? '0' : '50%' }"></span>

                <button type="button" class="switch-button-case left" :class="{ 'active-case': isLogin }" @click="isLogin = true">
                    LOGIN
                </button>

                <button type="button" class="switch-button-case right" :class="{ 'active-case': !isLogin }" @click="isLogin = false">
                    REGISTER
                </button>
            </div>

            <Transition
                name="form-height"
                mode="out-in"
                @before-enter="beforeEnter"
                @enter="enter"
                @after-enter="afterEnter"
                @before-leave="beforeLeave"
                @leave="leave"
            >
                <!-- Login Form (default) -->
                <form v-if="isLogin" class="auth-form" v-on:submit.prevent="submitLogin">
                    <input v-model="loginForm.email" type="email" placeholder="Email" required />
                    <input v-model="loginForm.password" type="password" placeholder="Password" required />
                    <button type="submit" :disabled="isLoggingIn">
                        {{ isLoggingIn ? 'LOGGING IN...' : 'LOGIN' }}
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
                        {{ isRegistering ? 'REGISTERING...' : 'REGISTER' }}
                    </button>
                </form>
            </Transition>
        </div>
    </div>
</template>

<style scoped>
    .main {
        position: relative;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        text-align: center;
        padding-right: 7.5vw;
    }

    .main::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url('/images/home-hero.png'); 
        background-size: cover;
        background-repeat: no-repeat;
        background-position: 90% 0%;
        transform: scaleX(-1);
        transform-origin: center;
        z-index: 0;
    }

    .main-box {
        position: relative;
        z-index: 1;
        width: 30vw;
        min-height: 35vh;
        height: auto;
        background: rgba(214, 206, 198, 0.5);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 5%;
        box-shadow: 
            0 30px 60px rgba(0, 0, 0, 0.25),
            0 15px 30px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding-bottom: 2.5%;
    }

    .main-header {
        width: 65%;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 5%;
    }

    .main-header h1 {
        padding-bottom: 7.5%;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-bold);
        font-size: clamp(2rem, 2.2vw, 2.8rem);
        line-height: 1;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: #f9f7f4;
        text-shadow:
            0 2px 6px rgba(0, 0, 0, 0.5),
            0 0 1px rgba(0, 0, 0, 0.5);
    }

    .main-header p {
        font-family: var(--font-f1);
        font-weight: var(--font-f1-regular);
        font-size: 0.9rem;
        line-height: 1.45;
        color: var(--f1-dark-grey);
    }

    .switch-button {
        width: 65%;
        height: 48px;
        position: relative;
        display: flex;
        align-items: center;
        background-color: var(--f1-dark-grey);
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 2rem;
    }

    .switch-button .active {
        position: absolute;
        inset: 0 auto 0 0;
        width: 50%;
        height: 100%;
        background: var(--f1-red);
        border-radius: inherit;
        transition: left 0.3s ease;
        z-index: 0;
        box-shadow: 0 0 0 1px var(--f1-red) inset;
    }

    .switch-button-case {
        flex: 1;
        height: 100%;
        border: none;
        background: transparent;
        color: white;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        position: relative;
        z-index: 1;
        transition: color 0.3s ease;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-bold);
        letter-spacing: 0.01em;
    }

    .switch-button-case:focus {
        outline: none;
    }

    .switch-button-case.left.active-case,
    .switch-button-case.right.active-case {
        color: white;
    }

    .switch-button-case.left:not(.active-case),
    .switch-button-case.right:not(.active-case) {
        color: rgba(255, 255, 255, 0.7);
    }

    .switch-button-case.left:not(.active-case):hover,
    .switch-button-case.right:not(.active-case):hover {
        color: rgba(255, 255, 255, 0.95);
    }

    .auth-form {
        display: flex;
        flex-direction: column;
        width: 65%;
        gap: 1rem;
    }

    .auth-form input {
        padding: 1rem;
        border: 2px solid #e1e5e9;
        border-radius: 12px;
        transition: all 0.3s ease;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-regular);
    }

    .auth-form input:focus {
        outline: none;
        border-color: var(--f1-dark-grey);
        box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }

    .auth-form button {
        padding: 1.2rem;
        background: linear-gradient(135deg, var(--f1-red-light) 0%, var(--f1-red) 45%, var(--f1-red-dark) 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-family: var(--font-f1);
        font-size: 1.25rem;
        font-weight: var(--font-f1-bold);
        letter-spacing: 0.01em;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .auth-form button:hover {
        box-shadow: 0 10px 20px rgba(255, 24, 1, 0.3);
    }

    .form-height-enter-active,
    .form-height-leave-active {
        overflow: hidden;
    }
</style>