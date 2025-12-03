import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const createReport: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getReports: (req: AuthRequest, res: Response) => Promise<void>;
export declare const processReport: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUserReports: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createModerationRule: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getModerationRules: (req: Request, res: Response) => Promise<void>;
export declare const updateModerationRule: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteModerationRule: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getModerationStats: (req: Request, res: Response) => Promise<void>;
export declare const getPendingContent: (req: AuthRequest, res: Response) => Promise<void>;
export declare const moderateDecision: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const batchModerate: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUserViolationStats: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const testContentModeration: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=moderationController.d.ts.map