import type { Timestamp } from "firebase/firestore";
import type { RaceSessions } from "./RaceSessions.ts";
import type { Circuit } from "./firestore/Circuit.ts";

export interface Race {
    season: number;
    round: number;
    raceName: string;
    weekendType: string;
    bettingOpensAt: Timestamp;
    bettingClosesAt: Timestamp;
    sessions: RaceSessions;
    circuit: Circuit
}