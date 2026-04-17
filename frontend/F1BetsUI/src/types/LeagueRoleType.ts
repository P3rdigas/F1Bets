export const LeagueRoleType = {
    OWNER: 'OWNER',
    MEMBER: 'MEMBER'
} as const;

export type LeagueRoleType = typeof LeagueRoleType[keyof typeof LeagueRoleType];