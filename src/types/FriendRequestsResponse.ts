import type { InviteType } from "./InviteType";

export interface FriendRequestsResponse {
    id: string;
    otherUserId: string;
    otherUsername: string;
    type: InviteType;
}
