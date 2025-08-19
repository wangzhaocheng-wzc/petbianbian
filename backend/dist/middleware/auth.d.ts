import { Request, Response, NextFunction } from 'express';
declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            id: string;
            email: string;
        };
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map