import { Request, Response, NextFunction } from 'express';
export declare const handleValidationErrors: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateUserRegistration: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined) | import("express-validator").ValidationChain)[];
export declare const validateUserLogin: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined) | import("express-validator").ValidationChain)[];
//# sourceMappingURL=validation.d.ts.map