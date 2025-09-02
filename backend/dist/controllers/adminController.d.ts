import { Request, Response } from 'express';
export declare const getUsers: (req: Request, res: Response) => Promise<void>;
export declare const activateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deactivateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const verifyUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const unverifyUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const promoteUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const demoteUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSystemStats: (req: Request, res: Response) => Promise<void>;
export declare const getPosts: (req: Request, res: Response) => Promise<void>;
export declare const getComments: (req: Request, res: Response) => Promise<void>;
export declare const moderatePost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const moderateComment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=adminController.d.ts.map