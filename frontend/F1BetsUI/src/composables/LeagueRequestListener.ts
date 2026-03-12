import { ref, watchEffect, onBeforeUnmount } from 'vue';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { user } from './auth.ts';
import type { LeagueRequestsResponse } from '../types/LeagueRequestResponse.ts';
import { RequestStatus } from '../types/RequestStatus.ts';

const leagueInvites = ref<LeagueRequestsResponse[]>([]);

let unsubscribeLeagueInvites: Unsubscribe | null = null;

function stopLeagueListeners() {
    if (unsubscribeLeagueInvites) {
        unsubscribeLeagueInvites();
        unsubscribeLeagueInvites = null;
    }

    leagueInvites.value = [];
}

function startLeagueListeners(currentUid: string) {
    const q = query(
        collection(db, 'league_invites'),
        where('receiver_id', '==', currentUid),
        where('status', '==', RequestStatus.PENDING),
        orderBy('created_at', 'desc')
    );

    unsubscribeLeagueInvites = onSnapshot(q, async (snapshot) => {        
        const invitesData = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const inviteData = docSnap.data();

                const leagueRef = doc(db, 'leagues', inviteData.league_id);
                const leagueSnap = await getDoc(leagueRef);

                const userRef = doc(db, 'users', inviteData.sender_id);
                const userSnap = await getDoc(userRef);

                if (leagueSnap.exists() && userSnap.exists()){
                    const leagueData = leagueSnap.data();
                    const userData = userSnap.data();

                    return {
                        id: docSnap.id,
                        leagueId: inviteData.league_id,
                        name: leagueData.name,
                        username: userData.username
                    } as LeagueRequestsResponse;
                };

                return undefined;
            })
        );

        leagueInvites.value = invitesData.filter((invite): invite is LeagueRequestsResponse => invite !== undefined);
    });
}

export function userLeagueRequests() {
    watchEffect(() => {
        const current = user.value;
        stopLeagueListeners();

        if (current?.uid) {
            startLeagueListeners(current.uid);
        }
    });

    onBeforeUnmount(stopLeagueListeners);

    return { leagueInvites };
}