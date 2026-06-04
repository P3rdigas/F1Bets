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

    const isCreatingLeague = ref(false);
    const isAddingFriend = ref(false);

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

        isCreatingLeague.value = true;

        try {
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
        } finally {
            isCreatingLeague.value = false;
        }
    }

    const friendRequest = async () => {
        if (!user.value?.uid) {
            alert("Log in first!");
            return;
        }

        isAddingFriend.value = true;

        try {
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
        } finally {
            isAddingFriend.value = false;
            friendName.value = '';
        }
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
                        <h1>MY LEAGUES</h1>
                    </div>

                    <div class="home-left-box-content">
                        <Teleport to="body">
                            <Transition name="modal-fade">
                                <div v-if="showCreateModal" class="modal-overlay" @click.self="closeModal">
                                    <div class="create-league-modal">
                                        <div class="modal-top">
                                            <div>
                                                <h2>Create New League</h2>
                                                <p>Choose a league name and invite your friends to compete.</p>
                                            </div>
                                        </div>

                                        <div class="modal-body">
                                            <div class="form-group">
                                                <label for="league-name">League name</label>
                                                <input id="league-name" v-model="leagueName" type="text" placeholder="e.g. F1 League 2026" class="league-input"/>
                                            </div>

                                            <div class="form-group">
                                                <label>Invite friends</label>

                                                <div v-if="friends.length === 0" class="empty-friends">
                                                    You don’t have any friends to invite yet.
                                                </div>

                                                <div v-else class="friends-list">
                                                    <button
                                                        v-for="friend in friends"
                                                        :key="friend.id"
                                                        type="button"
                                                        class="friend-item"
                                                        :class="{ selected: selectedFriends.includes(friend.id) }"
                                                        @click="toggleFriend(friend.id)"
                                                    >
                                                        <span class="friend-name">{{ friend.username }}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="modal-actions">
                                            <button @click="closeModal" class="cancel" type="button">
                                                Cancel
                                            </button>

                                            <button
                                                @click="confirmCreateLeague"
                                                :disabled="isCreatingLeague || !leagueName.trim()"
                                                class="create"
                                                type="button"
                                            >
                                                {{ isCreatingLeague ? 'Creating...' : 'Create League' }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Transition>
                        </Teleport>

                        <div v-if="leagues.length === 0" class="no-leagues-wrapper">
                            <div class="no-leagues">
                                No leagues yet. Create or join one!
                            </div>
                        </div>

                        <div v-else class="home-leagues-list">
                            <div v-for="league in leagues" class="home-leagues" :key="league.id">
                                <RouterLink class="card" :to="{ name: 'League', params: { id: league.id }, query: { seasonYear: league.seasonYear } }">
                                    <!-- TODO: Add league image -->
                                    <div class="league-image">
                                        <!-- <img class="league-image" :src="league.imageUrl || 'https://via.placeholder.com/150x100?text=League+Image'" alt="League Image" /> -->
                                        <font-awesome-icon class="image" icon="fa-solid fa-trophy" />
                                    </div>

                                    <div class="content">
                                        <div class="content-text">
                                            <h3>{{ league.name }}</h3>
                                            <div class="league-info">
                                                <span>{{ league.seasonYear }} Season</span>
                                                <span>Created By: {{ league.ownerUsername }}</span>
                                                <span>{{ league.memberCount }} Members</span>
                                            </div>
                                        </div>

                                        <font-awesome-icon icon="fa-solid fa-angle-right" />
                                    </div>
                                </RouterLink>
                            </div>
                        </div>

                        <button @click="createLeague" class="create-league">
                            <font-awesome-icon icon="fa-solid fa-plus" />
                            Create League
                        </button>
                    </div>
                </div>
            </div>
            <div class="home-right">
                <div class="home-right-box">
                    <h1>Add Friend</h1>
                    <div class="home-right-box-form">
                        <form class="add-friend-form" v-on:submit.prevent="friendRequest">
                            <input v-model="friendName" type="text" placeholder="Username" required />
                            <button type="submit" :disabled="isAddingFriend">
                                {{ isAddingFriend ? 'Sending...' : 'Send' }}
                            </button>
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
        background-color: var(--f1-dark-grey);
        overflow: hidden;
    }

    .home-wrapper {
        flex: 1;
        display: flex;
        min-height: 0;
        align-items: stretch;
    }

    .home-left {
        width: 60%;
        display: flex;
        justify-content: center;
        min-height: 0;
    }

    .home-left-box {
        width: 95%;
        border-radius: 0.75rem;
        border: 2px solid var(--f1-light-grey);
        margin-top: 3vh;
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: 85vh; /* Navbar + NextEventDisplay */
        overflow: hidden;
    }

    .home-left-box-header {
        flex-shrink: 0;
        height: 10vh;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2px solid var(--f1-light-grey);
        padding: 2.5%;
        color: white;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-bold);
        font-size: 1.1rem;
        line-height: 1.5125rem;
    }

    .home-left-box-content {
        position: relative;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        padding: 1vh;
        overflow: hidden;
    }

    .no-leagues-wrapper {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .no-leagues {
        color: var(--f1-light-grey);
        font-family: var(--font-f1);
        font-weight: var(--font-f1-regular);
        font-size: 1rem;
    }

    .home-leagues-list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1vh;
        padding-right: 1%;

        scrollbar-width: thin;
        scrollbar-color: var(--f1-light-grey) transparent;
    }

    .home-leagues {
        width: 100%;
        color: white;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-regular);
        font-size: 1rem;
        flex-shrink: 0;
    }

    .home-leagues .card {
        width: 100%;
        height: 7.5vh;
        border: 2px solid var(--f1-light-grey);
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        padding: 0 1.5%;
        color: inherit;
        text-decoration: none;
    }

    .home-leagues .card:visited,
    .home-leagues .card:hover,
    .home-leagues .card:active {
        color: inherit;
        text-decoration: none;
    }

    .home-leagues .card:hover {
        border-color: var(--f1-red);
    }

    .home-leagues .card .league-image {
        height: 75%;
        aspect-ratio: 1 / 1;
        border: 1px solid var(--f1-light-grey);
        border-radius: 10%;
        display: flex;
        align-items: center;
        justify-content: center;
    }   

    .home-leagues .card .league-image .image {
        width: 75%;
        height: 75%;
    }

    .home-leagues .card .content {
        width: 100%;
        height: 75%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-left: 2.5%;
    }

    .home-leagues .card .content .content-text {
        height: 80%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .home-leagues .card .content .content-text h3 {
        font-size: 1rem;
    }

    .home-leagues .card .content .content-text .league-info {
        display: flex;
        align-items: center;
        font-size: 0.75rem;
        color: var(--f1-light-grey);
    }

    .league-info span {
        display: inline-flex;
        align-items: center;
    }

    .league-info span + span::before {
        content: "";
        width: 0.35rem;
        aspect-ratio: 1 / 1;
        border-radius: 50%;
        background-color: var(--f1-red);
        margin: 0 0.75rem;
    }

    .create-league {
        width: 100%;
        margin: 1rem auto 0 auto;
        padding: 1rem 0;
        border: 2px solid var(--f1-light-grey);
        border-radius: 0.5rem;
        background-color: transparent;
        color: white;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-bold);
        font-size: 1rem;
        cursor: pointer;
        flex-shrink: 0;
    }

    .create-league:hover {
        border-color: var(--f1-red);
        color: var(--f1-red);
    }

    .home-right {
        background-color: gold;
        width: 40%;
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

    .modal-overlay {
        position: fixed;
        inset: 0;
        background: linear-gradient(to bottom, rgba(var(--f1-dark-grey), 0.8), rgba(var(--f1-light-grey), 0.8));
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .create-league-modal {
        width: 35vw;
        height: 50vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background: var(--f1-dark-grey);
        border: 1px solid var(--f1-light-grey);
        border-radius: 2.5rem;
        box-shadow:
            0 30px 60px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(255, 255, 255, 0.04) inset;
        color: white;
    }

    .modal-top {
        flex-shrink: 0;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 3% 0 2% 5%;
    }

    .modal-top h2 {
        font-family: var(--font-f1);
        font-weight: var(--font-f1-bold);
        font-size: 1.75rem;
    }

    .modal-top p {
        margin-top: 2%;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-regular);
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.5);
    }

    .modal-body {
        flex: 1;
        padding: 2.5% 5%;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        overflow-y: auto;
        border-top: 1px solid var(--f1-light-grey);
        border-bottom: 1px solid var(--f1-light-grey);

        scrollbar-width: thin;
        scrollbar-color: var(--f1-light-grey) transparent;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .form-group label {
        font-family: var(--font-f1);
        font-weight: var(--font-f1-bold);
        font-size: 1rem;
    }

    .league-input {
        height: 5vh;
        padding: 0 1rem;
        border-radius: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.05);
        color: white;
        font-size: 1rem;
    }

    .league-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }

    .league-input:focus {
        outline: none;
        border-color: var(--f1-light-grey);
        box-shadow: 0 0 0 5px var(--f1-dark-grey);
    }

    .friends-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    .friend-item {
        height: 45px;
        padding: 0.75rem 1rem;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.05);
        color: white;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
    }

    .friend-item:hover {
        background: var(--f1-red-light);
    }

    .friend-item.selected {
        background: var(--f1-red);
    }

    .friend-name {
        font-family: var(--font-f1);
        font-weight: var(--font-f1-regular);
        font-size: 1rem;
    }

    .empty-friends {
        font-family: var(--font-f1);
        font-weight: var(--font-f1-regular);
        font-size: 1rem;
        color: white;
    }

    .modal-actions {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding: 2.5% 2.5%;
    }

    .cancel,
    .create {
        padding: 0.625rem;
        border-radius: 0.75rem;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-bold);
        font-size: 1.25rem;
        cursor: pointer;
    }

    .cancel {
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.05);
        color: white;
    }

    .cancel:hover {
        background: var(--f1-light-grey);
    }

    .create {
        border: none;
        background: var(--f1-red-light);
        color: white;
    }

    .create:hover:not(:disabled) {
        background: var(--f1-red);
    }

    .create:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        box-shadow: none;
    }

    .modal-fade-enter-active,
    .modal-fade-leave-active {
        transition: opacity 0.22s ease;
    }

    .modal-fade-enter-active .create-league-modal,
    .modal-fade-leave-active .create-league-modal {
        transition: transform 0.22s ease, opacity 0.22s ease;
    }

    .modal-fade-enter-from,
    .modal-fade-leave-to {
        opacity: 0;
    }

    .modal-fade-enter-from .create-league-modal,
    .modal-fade-leave-to .create-league-modal {
        transform: translateY(12px) scale(0.98);
        opacity: 0;
    }
</style>