import { Request, Response, NextFunction } from 'express';
declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            userId: string;
            email: string;
            type?: string;
            role?: string;
        };
    }
}
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        type?: string;
        role?: string;
    };
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRefreshToken: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.d.ts.map