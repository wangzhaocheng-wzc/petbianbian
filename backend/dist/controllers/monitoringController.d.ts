import { Request, Response } from 'express';
export declare const getHealthCheck: (req: Request, res: Response) => Promise<void>;
export declare const getMetrics: (req: Request, res: Response) => Promise<void>;
export declare const getSystemInfo: (req: Request, res: Response) => void;
export declare const getRealtimeStats: (req: Request, res: Response) => Promise<void>;
export declare const getErrorStats: (req: Request, res: Response) => void;
export declare const getPerformanceStats: (req: Request, res: Response) => void;
//# sourceMappingURL=monitoringController.d.ts.map