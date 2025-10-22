export declare const ensureUser: (user: any, options?: {
    refreshToken?: string;
    refreshExpiresAt?: Date;
}) => Promise<void>;
export declare const updateLastLogin: (userExternalId: string, date: Date) => Promise<void>;
export declare const recordRefreshToken: (userExternalId: string, token: string, expiresAt: Date) => Promise<void>;
export declare const revokeToken: (token: string, userExternalId?: string) => Promise<void>;
export declare const isTokenRevoked: (token: string) => Promise<boolean>;
export declare const upsertPet: (ownerExternalId: string, pet: any) => Promise<void>;
export declare const deactivatePet: (petExternalId: string) => Promise<void>;
export declare const upsertPoopRecord: (userExternalId: string, petExternalId: string, record: any) => Promise<void>;
export declare const deletePoopRecord: (recordExternalId: string) => Promise<void>;
//# sourceMappingURL=pgSyncService.d.ts.map