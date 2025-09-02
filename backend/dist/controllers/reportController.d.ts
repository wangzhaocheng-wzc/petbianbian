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
 * 获取健康报告数据
 */
export declare const getHealthReportData: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 生成并下载PDF健康报告
 */
export declare const downloadHealthReportPDF: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 生成并保存PDF健康报告
 */
export declare const generateHealthReportPDF: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=reportController.d.ts.map