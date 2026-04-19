<script setup lang="ts">
    import { computed } from 'vue';
    import { signOut } from 'firebase/auth';
    import { auth } from '../firebase.ts';
    import router from '../router/index.ts';
    import { userFriendRequests } from '../composables/FriendsRequestListener.ts';
    import FriendInviteCard from './FriendInviteCard.vue';
    import LeagueInviteCard from './LeagueInviteCard.vue';
    import { InviteType } from '../types/InviteType.ts';
    import { userLeagueRequests } from '../composables/LeagueRequestListener.ts';

    const { receivedRequests, sentRequests } = userFriendRequests();
    const { leagueInvites } = userLeagueRequests();

    // Computed para badges
    const leagueCount = computed(() => leagueInvites.value.length);
    const totalFriendInvites = computed(() => receivedRequests.value.length + sentRequests.value.length);

    const logout = async () => {
        try {
            await signOut(auth);
            router.push({ name: 'Main' });
        } catch (error) {
            console.error('Logout error:', error);
        }
    } 
</script>

<template>
    <div class="navbar-wrapper">
        <!-- TODO: PUT NEXT CODE WITH BETTER CSS -->
        <div class="invites-section">
            <div class="dropdown-container">
                <button class="invite-button league-button">
                    <font-awesome-icon icon="fa-solid fa-inbox" />
                    <span v-if="leagueCount > 0" class="badge">{{ leagueCount }}</span>
                </button>
                
                <div class="dropdown league-dropdown">
                <div v-if="leagueInvites.length === 0" class="empty-state">
                    No league invites
                </div>
                <LeagueInviteCard 
                    v-for="invite in leagueInvites"
                    v-bind="invite"
                />
                </div>
            </div>

            
            <div class="dropdown-container">
                <button class="invite-button friend-button">
                <font-awesome-icon icon="fa-solid fa-user-group" />
                <span v-if="totalFriendInvites > 0" class="badge">{{ totalFriendInvites }}</span>
                </button>
                
                <div class="dropdown friend-dropdown">
                <div v-if="receivedRequests.length === 0 && sentRequests.length === 0" class="empty-state">
                    No friend requests
                </div>
                
                
                <div v-if="sentRequests.length" class="request-section">
                    <h4>Sent</h4>
                    <FriendInviteCard 
                    v-for="req in sentRequests" 
                    :key="req.id"
                    :id="req.id"
                    :username="req.username"
                    :type="InviteType.SENT"
                    />
                </div>

                
                <div v-if="receivedRequests.length" class="request-section">
                    <h4>Received</h4>
                    <FriendInviteCard 
                    v-for="req in receivedRequests" 
                    :key="req.id"
                    :id="req.id"
                    :username="req.username"
                    :type="InviteType.RECEIVED"
                    />
                </div>
                </div>
            </div>
        </div>    
        <button class="logout" @click="logout">Logout</button>
    </div>
</template>

<style scoped>
    .navbar-wrapper {
        background-color: blue;
        width: 100vw;
        height: 5vh;
        display: flex;
        align-items: center;
        justify-content: flex-end;
    }

    .navbar-wrapper button {
        margin-right: 1vw;
        cursor: pointer;
    }

    .invites-section {
        display: flex;
        gap: 0.5rem;
    }

    .dropdown-container {
        position: relative;
        display: inline-block;
    }

    .dropdown-container:hover .dropdown {
        display: block;
    }

    .invite-button {
        background: rgba(255,255,255,0.2);
        color: white;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 12px;
        padding: 8px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
    }

    .invite-button:hover {
        background: rgba(255,255,255,0.3);
        border-color: rgba(255,255,255,0.5);
        transform: translateY(-2px);
    }

    .badge {
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
    }

    .dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        min-width: 350px;
        max-height: 400px;
        overflow-y: auto;
        z-index: 1000;
        border: 1px solid #e5e7eb;
        /* margin-top: 8px; */  
        display: none;
    }

    .league-dropdown {
        right: -50px;
    }

    .friend-dropdown {
        right: 0;
    }

    .request-section {
        padding: 16px;
        border-bottom: 1px solid #f3f4f6;
    }

    .request-section:last-child {
        border-bottom: none;
    }

    .request-section h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #6b7280;
        font-weight: 600;
    }

    .empty-state {
        padding: 24px;
        text-align: center;
        color: #6b7280;
        font-style: italic;
    }

    .logout {
        background: rgba(239,68,68,0.2);
        color: white;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 12px;
        padding: 8px 16px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .logout:hover {
        background: rgba(239,68,68,0.4);
    }
</style>