import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getPosts: (req: Request, res: Response) => Promise<void>;
export declare const getPost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createPost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updatePost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deletePost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const toggleLikePost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getComments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createComment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const toggleLikeComment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteComment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=communityController.d.ts.map