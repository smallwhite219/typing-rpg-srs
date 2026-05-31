/**
 * SRSEngine - SM-2 間隔重複演算法核心
 * 
 * 基於 SuperMemo-2 演算法，自動追蹤每個單字的學習狀態，
 * 智慧安排複習時機。
 */

import type {
  LearningStage,
  SRSRating,
  WordSRSState,
  WordSRSFullState,
  SM2Result,
  SRSConfig,
} from '../types/srs';
import { DEFAULT_SRS_CONFIG } from '../types/srs';

export class SRSEngine {
  private config: SRSConfig;

  constructor(config: SRSConfig = DEFAULT_SRS_CONFIG) {
    this.config = config;
  }

  /**
   * 建立新的單字 SRS 狀態（從未學過的單字）
   */
  createNewState(wordId: string): WordSRSFullState {
    const now = new Date().toISOString();
    return {
      wordId,
      ef: this.config.initialEaseFactor,
      iv: 0,
      rp: 0,
      nr: 0,
      fm: 'again',
      te: 0,
      cc: 0,
      lu: now,
      st: 'new',
    };
  }

  /**
   * 計算 SM-2 演算法結果
   * @param state 當前狀態
   * @param rating 用戶評分
   * @param isRetry 是否為重練（Again 重練）
   */
  calculate(state: WordSRSState, rating: SRSRating, isRetry: boolean = false): SM2Result {
    let { ef, iv, rp } = state;

    // 重練情況下，Good 和 Easy 降級為 Hard
    let effectiveRating = rating;
    if (isRetry && (rating === 'good' || rating === 'easy')) {
      effectiveRating = 'hard';
    }

    // 將評分轉換為數值 (0-3)
    const ratingValue = this.ratingToValue(effectiveRating);

    // 更新難易係數 (SM-2 公式)
    // EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
    ef = ef + (0.1 - (3 - ratingValue) * (0.08 + (3 - ratingValue) * 0.02));
    ef = Math.max(this.config.minEaseFactor, Math.min(this.config.maxEaseFactor, ef));

    // 更新重複次數和間隔
    if (effectiveRating === 'again') {
      // 答錯：重置
      rp = 0;
      iv = 1;
    } else {
      // 答對：增加
      rp += 1;
      if (rp === 1) {
        iv = 1;
      } else if (rp === 2) {
        iv = 6;
      } else {
        // iv = 前一間隔 * EF
        iv = Math.round(iv * ef);
      }
    }

    // 計算學習階段
    const stage = this.calculateStage(rp, ef);

    return {
      newEaseFactor: ef,
      newInterval: iv,
      newRepetitions: rp,
      nextReviewLevel: state.nr + iv, // 下次應出現的關卡編號
      stage,
    };
  }

  /**
   * 更新單字狀態
   * @param state 當前狀態（可為 null 表示新單字）
   * @param rating 用戶評分
   * @param isCorrect 是否正確
   * @param isRetry 是否為重練
   * @param currentLevel 當前關卡編號
   */
  updateState(
    state: WordSRSState | null,
    rating: SRSRating,
    isCorrect: boolean,
    isRetry: boolean = false,
    _currentLevel: number = 0
  ): WordSRSFullState {
    const now = new Date().toISOString();
    
    // 如果是新單字，建立初始狀態
    if (!state) {
      state = this.createNewState('').wordId ? this.createNewState('') : this.createNewState('');
    }

    // 計算 SM-2 結果
    const result = this.calculate(state, rating, isRetry);

    // 更新出現次數和正確次數
    const newTe = state.te + 1;
    const newCc = state.cc + (isCorrect ? 1 : 0);

    // 計算階段（考慮是否為新單字）
    let finalStage: LearningStage;
    if (state.te === 0) {
      // 第一次出現
      finalStage = isCorrect ? 'learning' : 'learning';
    } else {
      finalStage = result.stage;
    }

    return {
      wordId: 'wordId' in state ? (state as WordSRSFullState).wordId : '',
      ef: result.newEaseFactor,
      iv: result.newInterval,
      rp: result.newRepetitions,
      nr: result.nextReviewLevel,
      fm: rating,
      te: newTe,
      cc: newCc,
      lu: now,
      st: finalStage,
      pr: state.pr,
    };
  }

  /**
   * 計算學習階段
   */
  private calculateStage(repetitions: number, easeFactor: number): LearningStage {
    if (repetitions === 0) {
      return 'new';
    }
    
    if (repetitions >= this.config.masteryRepetitions && 
        easeFactor >= this.config.masteryEaseFactor) {
      return 'mastered';
    }
    
    if (repetitions >= 1) {
      return 'review';
    }
    
    return 'learning';
  }

  /**
   * 將評分轉換為數值
   */
  private ratingToValue(rating: SRSRating): number {
    switch (rating) {
      case 'again': return 0;
      case 'hard': return 1;
      case 'good': return 2;
      case 'easy': return 3;
    }
  }

  /**
   * 判斷單字是否應該出現（到期）
   * @param state 單字狀態
   * @param currentLevel 當前關卡編號
   */
  isDue(state: WordSRSState | null, _currentLevel: number): boolean {
    if (!state) return true; // 新單字永遠到期
    
    // 如果已經到期但還沒複習（nr <= currentLevel）
    return state.nr <= _currentLevel;
  }

  /**
   * 取得單字的學習階段
   */
  getStage(state: WordSRSState | null): LearningStage {
    if (!state) return 'new';
    
    return this.calculateStage(state.rp, state.ef);
  }

  /**
   * 計算熟悉度百分比 (0-100)
   */
  getFamiliarityPercentage(state: WordSRSState): number {
    if (state.te === 0) return 0;
    return Math.round((state.cc / state.te) * 100);
  }

  /**
   * 計算下次複習剩餘關卡數
   */
  getRemainingLevels(state: WordSRSState, currentLevel: number): number {
    return Math.max(0, state.nr - currentLevel);
  }
}
