import { Request, Response, NextFunction } from 'express';
export interface ErrorReport {
    id: string;
    timestamp: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    stack?: string;
    request?: {
        method: string;
        url: string;
        headers: Record<string, any>;
        body?: any;
        user?: {
            id: string;
            username: string;
        };
    };
    context?: Record<string, any>;
    fingerprint: string;
}
export declare class ErrorTrackingService {
    private static instance;
    private errorCounts;
    private recentErrors;
    private maxRecentErrors;
    static getInstance(): ErrorTrackingService;
    trackError(error: Error, context?: {
        request?: Request;
        user?: {
            id: string;
            username: string;
        };
        additional?: Record<string, any>;
    }): string;
    trackWarning(message: string, context?: Record<string, any>): string;
    getErrorStats(timeRange?: '1h' | '24h' | '7d'): {
        total: number;
        byLevel: Record<string, number>;
        topErrors: {
            fingerprint: string;
            count: number;
            message: string;
            lastOccurrence: string | undefined;
        }[];
        timeRange: "7d" | "1h" | "24h";
    };
    getRecentErrors(limit?: number): ErrorReport[];
    getErrorById(id: string): ErrorReport | undefined;
    private generateErrorId;
    private generateFingerprint;
    private generateFingerprintFromMessage;
    private sanitizeHeaders;
    private sanitizeBody;
    private isCriticalError;
    private writeErrorToFile;
    private sendAlert;
}
export declare const errorTrackingMiddleware: (error: Error, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorTrackingService.d.ts.map