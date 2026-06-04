import { ref, watchEffect, onBeforeUnmount } from 'vue';
import { collection, query, orderBy, onSnapshot, getCountFromServer, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { user } from './auth.ts';
import type { League } from '../types/League.ts';
import type { LeagueFirestore } from '../types/firestore/LeagueFirestore.ts';

const leagues = ref<League[]>([]);

let unsubscribeLeagues: Unsubscribe | null = null;

function stopLeagueListeners() {
    if (unsubscribeLeagues) {
        unsubscribeLeagues();
        unsubscribeLeagues = null;
    }

    leagues.value = [];
}

function startLeagueListeners(currentUid: string) {
    const q = query(
        collection(db, 'users', currentUid, 'leagues'),
        orderBy('joined_at', 'desc')
    );

    unsubscribeLeagues = onSnapshot(q, async (snapshot) => {
        const leagueList = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data() as LeagueFirestore;

                const membersRef = collection(db, 'leagues', docSnap.id, 'members');
                const memberCountSnap = await getCountFromServer(membersRef);

                return {
                    id: docSnap.id,
                    name: data.league_name,
                    seasonYear: data.season_year,
                    ownerUsername: data.owner_username,
                    memberCount: memberCountSnap.data().count,
                } as League;
            })
        );
        
        leagues.value = leagueList;
    });
}   

export function userLeagues() {
    watchEffect(() => {
        const current = user.value;
        stopLeagueListeners();

        if (current?.uid) {
            startLeagueListeners(current.uid);
        }
    });

    onBeforeUnmount(stopLeagueListeners);

    return { leagues };
}