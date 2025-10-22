import { Pool } from 'pg';
export declare const getPostgresPool: () => Promise<Pool>;
export declare const connectPostgres: () => Promise<void>;
export declare const getPostgresStatus: () => Promise<"connected" | "disconnected">;
//# sourceMappingURL=postgres.d.ts.map