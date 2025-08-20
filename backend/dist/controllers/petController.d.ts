import { Request, Response } from 'express';
export declare const getPets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPetById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createPet: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updatePet: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deletePet: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=petController.d.ts.map