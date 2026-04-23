import type { Timestamp } from "firebase/firestore";

export interface RaceFirestore {
    season: number;
    round: number;
    race_name: string;
    weekend_type: string;
    betting_open_at: Timestamp;
    betting_closes_at: Timestamp;
}