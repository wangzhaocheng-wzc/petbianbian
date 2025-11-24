type RewriteReason = 'port_rewrite' | 'relative_to_absolute' | 'uploads_prefix_added' | 'protocol_normalized' | 'none' | 'invalid';
export interface PreviewChange {
    model: string;
    docId: string;
    field: string;
    original: string;
    resolved: string;
    reason: RewriteReason;
}
export interface GovernancePreviewResult {
    startedAt: number;
    finishedAt: number;
    durationMs: number;
    summary: {
        totalCandidates: number;
        byModel: Record<string, number>;
        byReason: Record<string, number>;
    };
    sampleChanges: PreviewChange[];
}
export interface GovernanceExecuteResult extends GovernancePreviewResult {
    updatedCount: number;
    failedCount: number;
    failures: Array<{
        model: string;
        docId: string;
        field: string;
        error: string;
    }>;
    reportFile?: string;
    modelDurationsMs?: Record<string, number>;
}
export declare class ImageUrlGovernanceService {
    static previewAll(limitPerModel?: number): Promise<{
        jobId: string;
        result: GovernancePreviewResult;
    }>;
    static getPreview(jobId: string): GovernancePreviewResult | null;
    static execute(jobId: string): Promise<GovernanceExecuteResult>;
}
export declare function startGovernanceReportScheduler(): void;
export {};
//# sourceMappingURL=imageUrlGovernanceService.d.ts.map