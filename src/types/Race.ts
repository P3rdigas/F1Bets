import type { Timestamp } from "firebase/firestore";

export interface Race {
    season: string;
    round: number;
    raceName: string;
    weekendType: string;
    bettingOpensAt: Timestamp;
    bettingClosesAt: Timestamp;
}