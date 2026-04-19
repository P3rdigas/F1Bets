export const RequestStatus = {
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    PENDING: 'PENDING'
} as const;

export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];