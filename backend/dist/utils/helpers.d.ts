export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
export declare const generateToken: (payload: object, expiresIn?: string) => string;
export declare const generateRefreshToken: (payload: object) => string;
export declare const verifyToken: (token: string) => any;
export declare const generateRandomString: (length?: number) => string;
export declare const getPaginationParams: (page?: string, limit?: string) => {
    page: number;
    limit: number;
    skip: number;
};
export declare const buildPaginationResponse: (data: any[], total: number, page: number, limit: number) => {
    data: any[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
};
//# sourceMappingURL=helpers.d.ts.map