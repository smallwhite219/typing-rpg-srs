/**
 * Type 模組統一匯出
 */

export type {
  LearningStage,
  SRSRating,
  WordSRSState,
  WordSRSFullState,
  SM2Result,
  SRSConfig,
} from './srs';

export type {
  PartOfSpeech,
  CEFRLevel,
  WordData,
  PlayerSRSData,
  DailyQuotaState,
  DailyQuotaConfig,
  PlayerData,
  BattleResult,
  PromptType,
  PromptResult,
  TypingResult,
  ComboState,
  GameConfig,
} from './game';

export {
  DEFAULT_SRS_CONFIG,
} from './srs';

export {
  DEFAULT_DAILY_QUOTA,
  DEFAULT_GAME_CONFIG,
  DEFAULT_DAILY_QUOTA as DAILY_QUOTA_CONFIG,
  DEFAULT_GAME_CONFIG as GAME_CONFIG,
} from './game';
