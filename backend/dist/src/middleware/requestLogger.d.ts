import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            startTime?: number;
            requestId?: string;
        }
    }
}
export declare const requestLoggerMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityLoggerMiddleware: (eventType: string, message: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const logDatabaseOperation: (operation: string, collection: string, query?: any, result?: any) => void;
export declare const logAPICall: (service: string, endpoint: string, method: string, responseTime: number, success: boolean) => void;
//# sourceMappingURL=requestLogger.d.ts.map