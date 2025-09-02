import { Request, Response } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        email: string;
        type?: string;
        role?: string;
    };
}
/**
 * 获取多宠物对比分析
 */
export declare const getMultiPetComparison: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 获取宠物健康趋势对比
 */
export declare const getPetHealthTrends: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 获取用户所有宠物的基本信息（用于选择对比宠物）
 */
export declare const getPetsForComparison: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=comparisonController.d.ts.map