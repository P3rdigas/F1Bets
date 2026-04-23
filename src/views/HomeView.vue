<script setup lang="ts">
    import { ref } from 'vue';
    import { RouterLink } from "vue-router";
    import { collection, doc, getDoc, query, where, getDocs, limit , writeBatch, serverTimestamp } from "firebase/firestore";
    import { db } from '../firebase.ts'
    import { user } from '../composables/auth.ts';
    import { RequestStatus } from '../types/RequestStatus.ts';
    import Navbar from '../components/Navbar.vue';
    import NextEventDisplay from '../components/NextEventDisplay.vue';
    import { userLeagues } from '../composables/UserLeaguesListener.ts';
    import { userFriends } from '../composables/FriendsListener.ts';
    import { LeagueRoleType } from '../types/LeagueRoleType.ts';
    import { InviteType } from '../types/InviteType.ts';

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
        if (!user.value?.uid) return;

        const ownerId = user.value.uid;

        const ownerRef = doc(db, "users", ownerId);
        const ownerSnap = await getDoc(ownerRef);

        if (!ownerSnap.exists()) return;

        const ownerData = ownerSnap.data();
        const seasonYear = new Date().getFullYear();

        const leagueRef = doc(collection(db, "leagues"));
        const batch = writeBatch(db);

        batch.set(leagueRef, {
            season_year: seasonYear,
            name: leagueName.value,
            owner_id: ownerId,
            owner_username: ownerData.username,
            created_at: serverTimestamp(),
        });

        batch.set(doc(db, "leagues", leagueRef.id, "members", ownerId), {
            username: ownerData.username,
            role: LeagueRoleType.OWNER,
            total_points: 0,
            joined_at: serverTimestamp(),
        });

        batch.set(doc(db, "users", ownerId, "leagues", leagueRef.id), {
            league_name: leagueName.value,
            season_year: seasonYear,
            owner_id: ownerId,
            owner_username: ownerData.username,
            role: LeagueRoleType.OWNER,
            joined_at: serverTimestamp(),
        });

        for (const friendId of selectedFriends.value) {
            const friendRef = doc(db, "users", friendId);
            const friendSnap = await getDoc(friendRef);

            if (!friendSnap.exists()) continue;

            const friendData = friendSnap.data();

            const leagueInviteRef = doc(collection(db, "leagues", leagueRef.id, "invites"));
            const inviteId = leagueInviteRef.id;

            batch.set(leagueInviteRef, {
                league_id: leagueRef.id,
                receiver_id: friendId,
                receiver_username: friendData.username,
                status: RequestStatus.PENDING,
                created_at: serverTimestamp(),
                responded_at: null,
            });

            batch.set(doc(db, "users", friendId, "league_invites", inviteId), {
                league_id: leagueRef.id,
                league_name: leagueName.value,
                season_year: seasonYear,
                sender_id: ownerId,
                sender_username: ownerData.username,
                status: RequestStatus.PENDING,
                created_at: serverTimestamp(),
                responded_at: null,
            });
        }

        await batch.commit();
        closeModal();
    }

    const friendRequest = async () => {
        if (!user.value?.uid) {
            alert("Log in first!");
            return;
        }

        const currentUid = user.value.uid;

        const q = query(
            collection(db, "users"),
            where("username", "==", friendName.value),
            limit(1)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
            alert("Username not found!");
            return;
        }

        const targetDoc = snap.docs[0]!;
        const targetUid = targetDoc.id;

        if (targetUid === currentUid) {
            alert("You can't add yourself!");
            return;
        }

        const currentUserRef = doc(db, "users", currentUid);
        const currentUserSnap = await getDoc(currentUserRef);

        if (!currentUserSnap.exists()) return;

        const existingFriendRef = doc(db, "users", currentUid, "friends", targetUid);
        const existingFriendSnap = await getDoc(existingFriendRef);

        if (existingFriendSnap.exists()) {
            alert("You are already friends!");
            return;
        }

        const sentRequestsQ = query(
            collection(db, "users", currentUid, "friend_requests"),
            where("other_user_id", "==", targetUid),
            where("status", "==", RequestStatus.PENDING),
            limit(1)
        );

        const sentRequestsSnap = await getDocs(sentRequestsQ);

        if (!sentRequestsSnap.empty) {
            alert("Friend request already sent!");
            return;
        }

        const receivedRequestsQ = query(
            collection(db, "users", currentUid, "friend_requests"),
            where("other_user_id", "==", targetUid),
            where("direction", "==", InviteType.RECEIVED),
            where("status", "==", RequestStatus.PENDING),
            limit(1)
        );

        const receivedRequestsSnap = await getDocs(receivedRequestsQ);

        if (!receivedRequestsSnap.empty) {
            alert("This user already sent you a friend request!");
            return;
        }

        const targetData = targetDoc.data();
        const currentUserData = currentUserSnap.data();

        const senderRequestRef = doc(collection(db, "users", currentUid, "friend_requests"));
        const requestId = senderRequestRef.id;

        const receiverRequestRef = doc(db, "users", targetUid, "friend_requests", requestId);

        const batch = writeBatch(db);

        batch.set(senderRequestRef, {
            other_user_id: targetUid,
            other_username: targetData.username,
            direction: InviteType.SENT,
            status: RequestStatus.PENDING,
            created_at: serverTimestamp(),
            responded_at: null,
        });

        batch.set(receiverRequestRef, {
            other_user_id: currentUid,
            other_username: currentUserData.username,
            direction: InviteType.RECEIVED,
            status: RequestStatus.PENDING,
            created_at: serverTimestamp(),
            responded_at: null,
        });

        await batch.commit();
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

                    <div class="home-left-box-content">
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

                        <div v-else v-for="league in leagues" :key="league.id" class="league-card">
                            <RouterLink :to="{ name: 'League', params: { id: league.id }, query: { seasonYear: league.seasonYear } }">
                                <h4>{{ league.name }} - Season {{ league.seasonYear }} • {{ league.ownerUsername }}</h4>
                            </RouterLink>
                        </div>
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
        height: 50vh;
        background-color: white;
        border-radius: 2.5%;
        margin-top: 3vh;
        overflow-y: auto;
    }

    .home-left-box-header {
        width: 100%;
        height: 15%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: aqua;
    }

    .home-left-box-content {
        /* flex: 1; */
        overflow-y: auto;
        padding: 1vh;
    }

    .home-right {
        background-color: gold;
        width: 50%;
        display: flex;
        justify-content: center;
    }

    .home-right-box {
        width: 80%;
        height: 50vh;
        background-color: white;
        border-radius: 2.5%;
        margin-top: 3vh;
        overflow-y: auto;
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