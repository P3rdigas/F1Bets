export const InviteType = {
    SENT: 'SENT',
    RECEIVED: 'RECEIVED'
} as const;

export type InviteType = typeof InviteType[keyof typeof InviteType];