import { ref, watchEffect, onBeforeUnmount } from 'vue';
import { collection, query, where, orderBy, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { user } from './auth.ts';
import type { LeagueInvitesResponse } from '../types/LeagueInvitesResponse.ts';
import { RequestStatus } from '../types/RequestStatus.ts';
import type { LeagueInviteFirestore } from '../types/firestore/LeagueInviteFirestore.ts';

const leagueInvites = ref<LeagueInvitesResponse[]>([]);

let unsubscribeLeagueInvites: Unsubscribe | null = null;

function stopLeagueListeners() {
    if (unsubscribeLeagueInvites) {
        unsubscribeLeagueInvites();
        unsubscribeLeagueInvites = null;
    }

    leagueInvites.value = [];
}

function startLeagueInviteListener(currentUid: string) {
    const q = query(
            collection(db, 'users', currentUid, 'league_invites'),
            where('status', '==', RequestStatus.PENDING),
            orderBy('created_at', 'desc')
    );

    unsubscribeLeagueInvites = onSnapshot(q, (snapshot) => {
        leagueInvites.value = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as LeagueInviteFirestore;

            return {
                id: docSnap.id,
                leagueId: data.league_id,
                leagueSeasonYear: data.season_year,
                leagueName: data.league_name,
                senderId: data.sender_id,
                senderUsername: data.sender_username,
            } as LeagueInvitesResponse;
        });
    });
}

export function userLeagueInvites() {
    watchEffect(() => {
        const current = user.value;
        stopLeagueListeners();

        if (current?.uid) {
            startLeagueInviteListener(current.uid);
        }
    });

    onBeforeUnmount(stopLeagueListeners);

    return { leagueInvites };
}