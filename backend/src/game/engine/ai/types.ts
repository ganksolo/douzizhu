export interface HeuristicResult {
    total: number;
    bombScore: number;       // 炸弹威力
    controlValue: number;    // 大牌控制力
    straightPotential: number; // 顺子连贯性
    riskLevel: number;       // 风险系数
}

export interface StrategyProfile {
    mode: "early" | "mid" | "late";
    shouldHoardBombs: boolean; // 是否囤积炸弹
    aggressiveLevel: number;   // 进攻欲望 (0-1)
}
