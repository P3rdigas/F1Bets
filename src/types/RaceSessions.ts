import type { Timestamp } from 'firebase/firestore';

export interface RaceSessions {
    fpStartAt: Timestamp | null;
    spStartAt: Timestamp | null;
    tpStartAt: Timestamp | null;
    qStartAt: Timestamp | null;
    rStartAt: Timestamp | null;
    sqStartAt: Timestamp | null;
    sStartAt: Timestamp | null;
}