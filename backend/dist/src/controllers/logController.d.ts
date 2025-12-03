import { Request, Response } from 'express';
export declare const queryLogs: (req: Request, res: Response) => Promise<void>;
export declare const getLogStats: (req: Request, res: Response) => Promise<void>;
export declare const getErrorLogs: (req: Request, res: Response) => Promise<void>;
export declare const getSecurityLogs: (req: Request, res: Response) => Promise<void>;
export declare const getPerformanceLogs: (req: Request, res: Response) => Promise<void>;
export declare const exportLogs: (req: Request, res: Response) => Promise<void>;
export declare const cleanupLogs: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=logController.d.ts.map