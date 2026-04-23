import type { InviteType } from "../InviteType";

export interface FriendRequestFirestore {
    other_user_id: string;
    other_username: string;
    direction: InviteType;
}