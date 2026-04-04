import { ref, watchEffect, onBeforeUnmount } from 'vue';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { user } from './auth.ts';
import type { League } from '../types/League.ts';

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
        collection(db, 'league_memberships'),
        where('user_id', '==', currentUid),
        orderBy('joined_at', 'desc')
    );

    unsubscribeLeagues = onSnapshot(q, async (snapshot) => {        
        const leaguesData = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const membershipData = docSnap.data();

                const leagueRef = doc(db, 'leagues', membershipData.league_id);
                const leagueSnap = await getDoc(leagueRef);
                
                if (leagueSnap.exists()){
                    const leagueData = leagueSnap.data();

                    return {
                        id: leagueSnap.id,
                        name: leagueData.name,
                        seasonYear: leagueData.season_year,
                        createdBy: leagueData.created_by,
                    } as League;
                };

                return undefined;
            })
        );

        leagues.value = leaguesData.filter((league): league is League => league !== undefined);
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