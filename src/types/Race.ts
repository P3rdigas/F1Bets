import type { Timestamp } from "firebase/firestore";

export interface Race {
    season: number;
    round: number;
    raceName: string;
    weekendType: string;
    bettingOpensAt: Timestamp;
    bettingClosesAt: Timestamp;
}