<script setup lang="ts">
    import { ref } from 'vue';
    import { collection, addDoc, query, where, getDocs, limit , serverTimestamp } from "firebase/firestore";
    import { db } from '../firebase.ts'
    import { user } from '../composables/auth.ts';
    import { RequestStatus } from '../types/RequestStatus.ts';
    import Navbar from '../components/Navbar.vue';
    import NextEventDisplay from '../components/NextEventDisplay.vue';
    import { userLeagues } from '../composables/UserLeaguesListener.ts';
    import { userFriends } from '../composables/FriendsListener.ts';
    import { LeagueRoleType } from '../types/LeagueRoleType.ts';

    const { leagues } = userLeagues();
    const { friends } = userFriends();

    // Modal state
    const showCreateModal = ref(false);
    const leagueName = ref('');
    const selectedFriends = ref<string[]>([]);

    const friendName = ref('');

    const createLeague = () => {
        showCreateModal.value = true;
    }

    const toggleFriend = (friendId: string) => {
        const index = selectedFriends.value.indexOf(friendId);
        if (index > -1) {
            selectedFriends.value.splice(index, 1);
        } else {
            selectedFriends.value.push(friendId);
        }
    };

    const closeModal = () => {
        showCreateModal.value = false;
        leagueName.value = '';
        selectedFriends.value = [];
    };

    const confirmCreateLeague = async () => {
        // Create the league
        const leagueDocRef = await addDoc(collection(db, 'leagues'), {
            season_year: new Date().getFullYear(),
            name: leagueName.value,
            created_by: user.value?.uid,
            created_at: serverTimestamp()
        });

        // Add the owner to the league memberships
        await addDoc(collection(db, 'league_memberships'), {
            league_id: leagueDocRef.id,
            user_id: user.value?.uid,
            role: LeagueRoleType.OWNER,
            total_points: 0,
            joined_at: serverTimestamp()
        });

        // Send league invites to selected friends
        for (const friendId of selectedFriends.value) {
            await addDoc(collection(db, 'league_invites'), {
                created_at: serverTimestamp(),
                league_id: leagueDocRef.id,
                receiver_id: friendId,
                responded_at: null,
                sender_id: user.value?.uid,
                status: RequestStatus.PENDING
            });
        }    

        closeModal();
    }

    const friendRequest = async () => {
        if (!user.value) {
            alert("Log in first!");
            return;
        }

        const currentUid = user.value.uid;

        const q = query(
            collection(db, 'users'),
            where('username', '==', friendName.value),
            limit(1)
        );

        const snap = await getDocs(q);
            
        if (snap.empty) {
            alert("Username not found!");
            return;
            // throw new Error("Username not found!");
        }

        const targetUid = snap.docs[0]!.id;

        if (targetUid === currentUid) {
            alert("You can't add yourself!");
            return;
        }

        // TODO: optimize double checking
        const existingFriendQ1 = query(
            collection(db, 'friends'),
            where('sender_id', '==', currentUid),
            where('receiver_id', '==', targetUid),
            limit(1)
        );

        const existingFriendSnap1 = await getDocs(existingFriendQ1);

        if (!existingFriendSnap1.empty) {
            if (existingFriendSnap1.docs[0]!.data().status === RequestStatus.PENDING) {
                alert("Friend request already sent!");
                return;
            } else if (existingFriendSnap1.docs[0]!.data().status === RequestStatus.ACCEPTED) {
                alert("You are already friends!");
                return;
            }
        }

        const existingFriendQ2 = query(
            collection(db, 'friends'),
            where('sender_id', '==', targetUid),
            where('receiver_id', '==', currentUid),
            limit(1)
        );

        const existingFriendSnap2 = await getDocs(existingFriendQ2);

        if (!existingFriendSnap2.empty) {
            if (existingFriendSnap2.docs[0]!.data().status === RequestStatus.PENDING) {
                alert("Friend request already sent!");
                return;
            } else if (existingFriendSnap2.docs[0]!.data().status === RequestStatus.ACCEPTED) {
                alert("You are already friends!");
                return;
            }
        }

        // Add friend request
        await addDoc(collection(db, 'friends'), {
            created_at: serverTimestamp(),
            receiver_id: targetUid,
            responded_at: null,
            sender_id: currentUid,
            status: RequestStatus.PENDING,
        });
    }   
</script>

<template>
    <div class="home-page">
        <Navbar />
        <NextEventDisplay />
        <div class="home-wrapper">
            <div class="home-left">
                <div class="home-left-box">
                    <div class="home-left-box-header">
                        <h1>Leagues</h1>
                        <button @click="createLeague">Create League</button>
                    </div>

                    <!-- TODO: Just a concept, implement final version -->
                    <Teleport to="body">
                        <div v-if="showCreateModal" class="modal-overlay" @click.self="closeModal">
                            <div class="create-league-modal">
                            <h2>Criar Nova Liga</h2>
                            
                            <input 
                                v-model="leagueName" 
                                placeholder="Nome da Liga (ex: Liga F1 2026)"
                                class="league-input"
                            />
                            
                            <!-- TODO: If no friends send a message -->
                            <div class="friends-section">
                                <label>Convidar Amigos:</label>
                                <div class="friends-list">
                                <div 
                                    v-for="friend in friends" 
                                    :key="friend.id"
                                    class="friend-item"
                                    :class="{ selected: selectedFriends.includes(friend.id) }"
                                    @click="toggleFriend(friend.id)"
                                >
                                    {{ friend.username }}
                                </div>
                                </div>
                            </div>
                            
                            <div class="modal-actions">
                                <button @click="closeModal" class="cancel">Cancelar</button>
                                <button @click="confirmCreateLeague" :disabled="!leagueName.trim()" class="create">
                                Criar Liga
                                </button>
                            </div>
                            </div>
                        </div>
                    </Teleport>

                    <div v-if="leagues.length === 0" class="no-leagues">
                        No leagues yet. Create or join one!
                    </div>

                    <div v-else v-for="league in leagues" class="league-card">
                        <router-link :to="`/league/${league.id}`">
                            <h3>{{ league.name }}</h3>
                            <p>Season {{ league.seasonYear }} • {{ league.createdBy }}</p>
                        </router-link>
                    </div>
                </div>
            </div>
            <div class="home-right">
                <div class="home-right-box">
                    <h1>Add Friend</h1>
                    <div class="home-right-box-form">
                        <form class="add-friend-form" v-on:submit.prevent="friendRequest">
                            <input v-model="friendName" type="text" placeholder="Username" required />
                            <button type="submit">Send</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .home-page {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .home-wrapper {
        flex: 1;
        background-color: aqua;
        display: flex;
    }

    .home-left {
        background-color: brown;
        width: 50%;
        display: flex;
        justify-content: center;
    }

    .home-left-box {
        width: 80%;
        height: 50%;
        background-color: white;
        border-radius: 2.5%;
        margin-top: 3vh;
    }

    .home-left-box-header {
        width: 100%;
        height: 15%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: aqua;
    }

    .home-right {
        background-color: gold;
        width: 50%;
        display: flex;
        justify-content: center;
    }

    .home-right-box {
        width: 80%;
        height: 50%;
        background-color: white;
        border-radius: 2.5%;
        margin-top: 3vh;
    }

    /* TODO: It's just concept, implement final version*/
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .create-league-modal {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }

    .league-input {
        width: 100%;
        padding: 12px;
        border: 2px solid #e5e5e5;
        border-radius: 8px;
        font-size: 16px;
        margin-bottom: 1rem;
    }

    .friends-section {
        margin-bottom: 1.5rem;
    }

    .friends-list {
        max-height: 200px;
        overflow-y: auto;
        border: 2px solid #e5e5e5;
        border-radius: 8px;
        padding: 8px;
    }

    .friend-item {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.2s;
    }

    .friend-item:hover {
        background: #f5f5f5;
    }

    .friend-item.selected {
        background: #3b82f6;
        color: white;
    }

    .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }

    .create {
        background: #10b981;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
    }

    .cancel {
        background: #6b7280;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
    }

    .cancel:hover, .create:hover:not(:disabled) {
        opacity: 0.9;
    }
</style>