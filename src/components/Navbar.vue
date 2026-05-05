<script setup lang="ts">
    import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
    import { signOut } from 'firebase/auth';
    import { auth } from '../firebase.ts';
    import router from '../router/index.ts';
    import { userFriendRequests } from '../composables/FriendsRequestListener.ts';
    import FriendInviteCard from './FriendInviteCard.vue';
    import LeagueInviteCard from './LeagueInviteCard.vue';
    import { userLeagueInvites } from '../composables/LeagueInvitesListener.ts';

    const { friendRequests, receivedRequests, sentRequests } = userFriendRequests();
    const { leagueInvites } = userLeagueInvites();

    // Computed para badges
    const leagueInvitesCount = computed(() => leagueInvites.value.length);
    const friendInvitesCount = computed(() => friendRequests.value.length);

    const isLoggingOut = ref(false);

    const openDropdown = ref<'league' | 'friend' | null>(null);

    const toggleDropdown = (type: 'league' | 'friend') => {
        openDropdown.value = openDropdown.value === type ? null : type;
    };

    const closeDropdown = () => {
        openDropdown.value = null;
    };

    const leagueDropdownRef = ref<HTMLElement | null>(null);
    const friendDropdownRef = ref<HTMLElement | null>(null);

    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;

        const clickedInsideLeague = leagueDropdownRef.value?.contains(target) ?? false;
        const clickedInsideFriend = friendDropdownRef.value?.contains(target) ?? false;

        if (!clickedInsideLeague && !clickedInsideFriend) {
            closeDropdown();
        }
    };

    onMounted(() => {
        document.addEventListener('click', handleClickOutside);
    });

    onBeforeUnmount(() => {
        document.removeEventListener('click', handleClickOutside);
    });

    const logout = async () => {
        isLoggingOut.value = true;

        try {
            await signOut(auth);
            router.push({ name: 'Main' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            isLoggingOut.value = false;
        }
    } 
</script>

<template>
    <div class="navbar-wrapper">
        <div class="invites-section">
            <div ref="leagueDropdownRef" class="invite-menu">
                <button class="invite-button" title="League Invites" @click.stop="toggleDropdown('league')">
                    <font-awesome-icon class="nav-icon" icon="fa-solid fa-flag-checkered" />
                    <span v-if="leagueInvitesCount > 0" class="badge">{{ leagueInvitesCount > 99 ? '99+' : leagueInvitesCount }}</span>
                </button>
                
                <div v-if="openDropdown === 'league'" class="dropdown league-dropdown" @click.stop>
                    <div class="dropdown-header">
                        <h4>League invites</h4>
                        <button class="close-dropdown" @click="closeDropdown">
                            <font-awesome-icon icon="fa-solid fa-xmark" class="nav-icon"/>
                        </button>
                    </div>
                    <div v-if="leagueInvites.length === 0" class="empty-state">
                        No league invites
                    </div>
                    <LeagueInviteCard 
                        v-for="invite in leagueInvites"
                        :key="invite.id"
                        :id="invite.id"
                        :leagueId="invite.leagueId"
                        :leagueSeasonYear="invite.leagueSeasonYear"
                        :leagueName="invite.leagueName"
                        :owner-id="invite.senderId"
                        :owner-username="invite.senderUsername"
                    />
                </div>
            </div>

            <div ref="friendDropdownRef" class="invite-menu">
                <button class="invite-button" title="Friend Requests" @click.stop="toggleDropdown('friend')">
                    <font-awesome-icon class="nav-icon" icon="fa-solid fa-user-group" />
                    <span v-if="friendInvitesCount > 0" class="badge"> {{ friendInvitesCount > 99 ? '99+' : friendInvitesCount }}</span>
                </button>
                
                <div v-if="openDropdown === 'friend'" class="dropdown friend-dropdown" @click.stop>
                    <div class="dropdown-header">
                        <h4>Friend requests</h4>
                        <button class="close-dropdown" @click="closeDropdown">
                            <font-awesome-icon icon="fa-solid fa-xmark" class="nav-icon"/>
                        </button>
                    </div>

                    <div v-if="friendInvitesCount === 0" class="empty-state">
                        No friend requests
                    </div>
                    
                    <div v-if="sentRequests.length" class="request-section">
                        <h4>Sent</h4>
                        <FriendInviteCard 
                        v-for="req in sentRequests" 
                        :key="req.id"
                        :id=req.id
                        :otherUserId=req.otherUserId
                        :otherUsername=req.otherUsername
                        :type=req.type
                        />
                    </div>

                    <div v-if="receivedRequests.length" class="request-section">
                        <h4>Received</h4>
                        <FriendInviteCard 
                        v-for="req in receivedRequests" 
                        :key="req.id"
                        :id=req.id
                        :otherUserId=req.otherUserId
                        :otherUsername=req.otherUsername
                        :type=req.type
                        />
                    </div>
                </div>
            </div>
        </div>    
        <button :disabled="isLoggingOut" class="logout" title="Logout" @click="logout">
            <font-awesome-icon class="nav-icon" icon="fa-solid fa-arrow-right-from-bracket" rotation=180 />
        </button>
    </div>
</template>

<style scoped>
    .navbar-wrapper {
        width: 100vw;
        height: 5vh;
        display: flex;
        align-items: center;
        justify-content: flex-end;

        --nav-padding: 2vw;
    }

    .invites-section {
        display: flex;
        gap: var(--nav-padding);
    }

    .invite-menu {
        position: relative;
        display: inline-block;
    }

    .invite-button {
        position: relative;
        background: transparent;
        border: none;
    }

    .nav-icon {
        width: 20px;
        height: 20px;
        color: var(--f1-light-grey);
        background: transparent;
        cursor: pointer;
    }

    .nav-icon:hover {
        color: var(--f1-red);
    }

    .badge {
        position: absolute;
        top: 0;
        right: 0;
        transform: translate(90%, -30%);
        min-width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 5px;
        background: var(--f1-red);
        color: white;
        border-radius: 999px;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-bold);
        font-size: 11px;
        white-space: nowrap;
        box-sizing: border-box;
        z-index: 999;
    }

    .dropdown {
        position: absolute;
        background: var(--f1-dark-grey);
        box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        min-width: 350px;
        max-width: 500px;
        max-height: 400px;
        overflow: auto;
        z-index: 999;
        border: 2px solid var(--f1-light-grey);
        margin-top: 8px;
    }

    .dropdown-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 3.5% 5%;
        border-bottom: 1px solid var(--f1-light-grey);
    }

    .dropdown-header h4 {
        font-family: var(--font-khinterference);
        font-weight: var(--font-khinterference-regular);
        color: white;
    }

    .close-dropdown {
        background: transparent;
        border: none;
        cursor: pointer;
    }

    .league-dropdown {
        right: 0;
    }

    .league-dropdown :deep(.invite) {
        padding: 12px 16px;
    }

    .league-dropdown :deep(.invite:last-child) {
        border-bottom: none;
    }

    .friend-dropdown {
        right: 0;
    }

    .request-section {
        padding: 16px;
        border-bottom: 1px solid var(--f1-light-grey);
    }

    .request-section:last-child {
        border-bottom: none;
    }

    .request-section h4 {
        margin-bottom: 12px;
        font-family: var(--font-khinterference);
        font-weight: var(--font-khinterference-regular);
        font-size: 0.85rem;
        color: white;
    }

    .empty-state {
        padding: var(--nav-padding);
        text-align: center;
        font-family: var(--font-f1);
        font-weight: var(--font-f1-regular);
        color: white;
    }

    .logout {
        background: transparent;
        border: none;
        margin-left: var(--nav-padding);
        margin-right: 1vw;
    }
</style>