/**
 * 遊戲核心型別定義
 */

import type { LearningStage, WordSRSState } from './srs';

/** 詞性 */
export type PartOfSpeech = 'n.' | 'v.' | 'adj.' | 'adv.' | 'prep.' | 'conj.' | 'interj.' | 'pron.' | 'det.' | 'v.phr.';

/** CEFR 等級 */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** 單字資料 */
export interface WordData {
  /** 唯一識別碼 */
  id: string;
  /** 英文單字 */
  word: string;
  /** 詞性 */
  partOfSpeech: PartOfSpeech;
  /** 中文定義 */
  definition: string;
  /** 英文例句 */
  exampleSentence?: string;
  /** 例句中文翻譯 */
  exampleTranslation?: string;
  /** 搭配詞 */
  collocations?: string[];
  /** CEFR 等級 */
  level?: CEFRLevel;
  /** 主題標籤 */
  tags?: string[];
  /** 圖片網址 */
  imageUrl?: string;
  /** 是否啟用 */
  enabled: boolean;
}

/** 玩家 SRS 資料（Key 為 wordId） */
export type PlayerSRSData = Record<string, WordSRSState>;

/** 每日配額狀態 */
export interface DailyQuotaState {
  /** 日期 (YYYY-MM-DD) */
  date: string;
  /** 已學習新單字數 */
  learnedNew: number;
  /** 已複習單字數 */
  reviewed: number;
}

/** 每日配額配置 */
export interface DailyQuotaConfig {
  /** 每日最多學習新單字 */
  newPerDay: number;
  /** 每日最多複習到期單字 */
  reviewPerDay: number;
}

/** 預設每日配額配置 */
export const DEFAULT_DAILY_QUOTA: DailyQuotaConfig = {
  newPerDay: 5,
  reviewPerDay: 10,
};

/** 玩家資料 */
export interface PlayerData {
  /** 班級座號（主鍵） */
  classId: string;
  /** 四碼密碼 */
  pin: string;
  /** 顯示名稱 */
  displayName: string;
  /** 目前遊戲關卡 */
  currentLevel: number;
  /** 累積總分 */
  totalScore: number;
  /** 最高分 */
  bestScore: number;
  /** 最近遊玩模式 */
  gameMode: 'srs' | 'practice' | 'endless';
  /** SRS 狀態 */
  srsData: PlayerSRSData;
  /** 今日配額 */
  dailyQuota: DailyQuotaState;
  /** 最後更新時間 */
  lastUpdated: string;
}

/** 戰鬥結果 */
export type BattleResult = 'victory' | 'defeat' | 'escaped';

/** 出題類型 */
export type PromptType = 'word' | 'sentence';

/** 出題結果 */
export interface PromptResult {
  /** 出題類型 */
  type: PromptType;
  /** 目標文字（單字或句子） */
  targetText: string;
  /** 提示文字（中文定義或翻譯） */
  hintText: string;
  /** 時限（秒） */
  timeLimit: number;
  /** 來源單字 ID */
  wordId: string;
}

/** 打字結果 */
export interface TypingResult {
  /** 是否正確 */
  isCorrect: boolean;
  /** 正確率 (0-1) */
  accuracy: number;
  /** 輸入字元數 */
  typedLength: number;
  /** 錯誤字元數 */
  errorCount: number;
  /** 用時（秒） */
  timeUsed: number;
}

/** Combo 狀態 */
export interface ComboState {
  /** 當前 Combo 數 */
  count: number;
  /** 最高 Combo 數 */
  maxCount: number;
  /** 傷害加成比例 (0-1) */
  damageBonus: number;
  /** Combo 評語 */
  rating: string;
}

/** 遊戲配置 */
export interface GameConfig {
  /** 單字時限係數（秒/字元） */
  wordTimeFactor: Record<LearningStage, number>;
  /** 句子時限係數（秒/字元） */
  sentenceTimeFactor: Record<LearningStage, number>;
  /** 句子通過正確率門檻 */
  sentencePassAccuracy: number;
  /** Combo 傷害加成配置 */
  comboDamageBonuses: Record<number, number>;
  /** 出題比例配置 */
  promptRatios: Record<LearningStage, { word: number; sentence: number }>;
}

/** 預設遊戲配置 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  wordTimeFactor: {
    new: 2.0,       // 新學: 給予充裕時間 (2.0s / char)
    learning: 1.5,  // 學習中: 正常速度 (1.5s / char)
    review: 1.2,    // 複習中: 稍快 (1.2s / char)
    mastered: 0.8,  // 精熟: 極快 (0.8s / char)
  },
  sentenceTimeFactor: {
    new: 2.0,
    learning: 1.5,
    review: 1.2,
    mastered: 0.8,
  },
  sentencePassAccuracy: 0.8,
  comboDamageBonuses: {
    5: 0,    // Good!
    10: 0.1, // Great! (+10%)
    15: 0.2, // Excellent! (+20%)
    20: 0.5, // PERFECT! (+50%)
  },
  promptRatios: {
    new: { word: 1, sentence: 0 },
    learning: { word: 0.8, sentence: 0.2 },
    review: { word: 0.5, sentence: 0.5 },
    mastered: { word: 0.2, sentence: 0.8 },
  },
};
