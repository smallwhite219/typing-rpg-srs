/**
 * SRS 間隔重複系統型別定義
 * 基於 SM-2 演算法
 */

/** 學習階段 */
export type LearningStage = 'new' | 'learning' | 'review' | 'mastered';

/** SRS 評分 */
export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

/** 單字 SRS 狀態（縮寫版本，用於儲存） */
export interface WordSRSState {
  /** easeFactor - 難易係數 (1.3 ~ 3.0) */
  ef: number;
  /** interval - 下次複習間隔（關卡數） */
  iv: number;
  /** repetitions - 連續答對次數 */
  rp: number;
  /** nextReviewLevel - 下次應出現的關卡編號 */
  nr: number;
  /** familiarity - 最新評分 */
  fm: SRSRating;
  /** totalEncounters - 總出現次數 */
  te: number;
  /** correctCount - 總正確次數 */
  cc: number;
  /** lastUpdated - 最後更新時間 */
  lu: string;
  /** stage - 學習階段 */
  st: LearningStage;
}

/** 單字 SRS 狀態（完整版本，用於邏輯處理） */
export interface WordSRSFullState extends WordSRSState {
  wordId: string;
}

/** SM-2 演算法結果 */
export interface SM2Result {
  /** 新的難易係數 */
  newEaseFactor: number;
  /** 新的間隔 */
  newInterval: number;
  /** 新的重複次數 */
  newRepetitions: number;
  /** 下次複習的關卡編號 */
  nextReviewLevel: number;
  /** 學習階段 */
  stage: LearningStage;
}

/** SRS 配置 */
export interface SRSConfig {
  /** 初始難易係數 */
  initialEaseFactor: number;
  /** 最小難易係數 */
  minEaseFactor: number;
  /** 最大難易係數 */
  maxEaseFactor: number;
  /** 精熟所需連續答對次數 */
  masteryRepetitions: number;
  /** 精熟所需難易係數 */
  masteryEaseFactor: number;
}

/** 預設 SRS 配置 */
export const DEFAULT_SRS_CONFIG: SRSConfig = {
  initialEaseFactor: 2.5,
  minEaseFactor: 1.3,
  maxEaseFactor: 3.0,
  masteryRepetitions: 4,
  masteryEaseFactor: 2.5,
};
