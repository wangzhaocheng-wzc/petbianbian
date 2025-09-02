import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, Gauge } from 'prom-client';
export declare const httpRequestsTotal: Counter<"route" | "method" | "status_code">;
export declare const httpRequestDuration: Histogram<"route" | "method" | "status_code">;
export declare const activeConnections: Gauge<string>;
export declare const databaseConnections: Gauge<string>;
export declare const errorRate: Counter<"type" | "endpoint">;
export declare const memoryUsage: Gauge<"type">;
export declare const cpuUsage: Gauge<string>;
export declare const monitoringMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const collectSystemMetrics: () => void;
export interface HealthCheck {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    uptime: number;
    version: string;
    services: {
        database: 'connected' | 'disconnected' | 'error';
        redis: 'connected' | 'disconnected' | 'error';
        fileSystem: 'accessible' | 'error';
    };
    metrics: {
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage: number;
        activeConnections: number;
        requestsPerMinute: number;
        errorRate: number;
    };
}
export declare class MonitoringService {
    private static instance;
    private requestCounts;
    private errorCounts;
    static getInstance(): MonitoringService;
    getMetrics(): Promise<string>;
    getHealthCheck(): Promise<HealthCheck>;
    recordRequest(endpoint: string): void;
    recordError(endpoint: string, error: Error): void;
    private getRequestsPerMinute;
    private getErrorRate;
    private cleanupOldData;
    getSystemInfo(): {
        platform: NodeJS.Platform;
        arch: string;
        nodeVersion: string;
        totalMemory: number;
        freeMemory: number;
        cpuCount: number;
        loadAverage: number[];
        uptime: number;
    };
}
//# sourceMappingURL=monitoringService.d.ts.map