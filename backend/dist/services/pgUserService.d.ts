type UserAggregate = {
    id: string;
    username: string;
    email: string;
    avatar?: string | null;
    role: 'user' | 'admin' | 'moderator';
    profile: {
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
        location?: string | null;
        bio?: string | null;
    };
    preferences: {
        notifications: boolean;
        emailUpdates: boolean;
        language: string;
    };
    stats: {
        totalAnalysis: number;
        totalPosts: number;
        reputation: number;
    };
    isActive: boolean;
    isVerified: boolean;
    lastLoginAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
};
export declare const getUserByEmail: (email: string) => Promise<UserAggregate | null>;
export declare const getUserAuthByEmail: (email: string) => Promise<{
    agg: UserAggregate;
    passwordHash: string;
} | null>;
export declare const getUserById: (id: string) => Promise<UserAggregate | null>;
export declare const usernameExists: (username: string) => Promise<boolean>;
export declare const emailExists: (email: string) => Promise<boolean>;
export declare const createUser: (params: {
    username: string;
    email: string;
    password: string;
}) => Promise<UserAggregate>;
export declare const comparePassword: (raw: string, hash: string) => Promise<boolean>;
export declare const updateLastLoginById: (userId: string, date: Date) => Promise<void>;
export declare const recordRefreshTokenById: (userId: string, token: string, expiresAt: Date) => Promise<void>;
export {};
//# sourceMappingURL=pgUserService.d.ts.map