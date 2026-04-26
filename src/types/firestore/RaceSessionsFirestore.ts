import type { Timestamp } from 'firebase/firestore';

export interface RaceSessionsFirestore {
    fp_start_at: Timestamp | null;
    sp_start_at: Timestamp | null;
    tp_start_at: Timestamp | null;
    q_start_at: Timestamp | null;
    r_start_at: Timestamp | null;
    sq_start_at: Timestamp | null;
    s_start_at: Timestamp | null;
}