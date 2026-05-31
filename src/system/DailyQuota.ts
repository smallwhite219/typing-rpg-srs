/**
 * DailyQuota - 每日學習配額系統
 * 
 * 管理每日學習進度，確保玩家養成持續學習的習慣。
 * 
 * 配額規則：
 * - 每日最多學習新單字：newPerDay (預設 5)
 * - 每日最多複習到期單字：reviewPerDay (預設 10)
 * - 以「關卡數」計算間隔，玩越多關越多單字到期
 */

import type { DailyQuotaState, DailyQuotaConfig, PlayerSRSData } from '../types';
import { DAILY_QUOTA_CONFIG as DEFAULT_DAILY_QUOTA } from '../types';

export class DailyQuota {
  private config: DailyQuotaConfig;
  private state: DailyQuotaState;

  constructor(
    config: DailyQuotaConfig = DEFAULT_DAILY_QUOTA,
    initialState?: DailyQuotaState
  ) {
    this.config = config;
    this.state = initialState || this.createInitialState();
  }

  /**
   * 建立初始狀態
   */
  private createInitialState(): DailyQuotaState {
    const today = this.getTodayString();
    return {
      date: today,
      learnedNew: 0,
      reviewed: 0,
    };
  }

  /**
   * 取得今日日期字串 (YYYY-MM-DD)
   */
  private getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 檢查並更新日期（跨日時呼叫）
   */
  checkAndUpdateDate(): boolean {
    const today = this.getTodayString();
    if (this.state.date !== today) {
      // 日期已變更，重置配額
      this.state = {
        date: today,
        learnedNew: 0,
        reviewed: 0,
      };
      return true;
    }
    return false;
  }

  /**
   * 增加已學習新單字數
   * @returns 是否成功增加（未超過配額）
   */
  incrementLearnedNew(): boolean {
    this.checkAndUpdateDate();
    if (this.state.learnedNew >= this.config.newPerDay) {
      return false;
    }
    this.state.learnedNew += 1;
    return true;
  }

  /**
   * 增加已複習單字數
   * @returns 是否成功增加（未超過配額）
   */
  incrementReviewed(): boolean {
    this.checkAndUpdateDate();
    if (this.state.reviewed >= this.config.reviewPerDay) {
      return false;
    }
    this.state.reviewed += 1;
    return true;
  }

  /**
   * 檢查是否可以學習新單字
   */
  canLearnNew(): boolean {
    this.checkAndUpdateDate();
    return this.state.learnedNew < this.config.newPerDay;
  }

  /**
   * 檢查是否可以複習
   */
  canReview(): boolean {
    this.checkAndUpdateDate();
    return this.state.reviewed < this.config.reviewPerDay;
  }

  /**
   * 取得新單字剩餘配額
   */
  getRemainingNewQuota(): number {
    this.checkAndUpdateDate();
    return Math.max(0, this.config.newPerDay - this.state.learnedNew);
  }

  /**
   * 取得複習剩餘配額
   */
  getRemainingReviewQuota(): number {
    this.checkAndUpdateDate();
    return Math.max(0, this.config.reviewPerDay - this.state.reviewed);
  }

  /**
   * 取得今日進度
   */
  getProgress(): {
    newLearned: number;
    newTotal: number;
    reviewLearned: number;
    reviewTotal: number;
    totalProgress: number;
    totalTarget: number;
    percentage: number;
  } {
    this.checkAndUpdateDate();
    const totalProgress = this.state.learnedNew + this.state.reviewed;
    const totalTarget = this.config.newPerDay + this.config.reviewPerDay;
    
    return {
      newLearned: this.state.learnedNew,
      newTotal: this.config.newPerDay,
      reviewLearned: this.state.reviewed,
      reviewTotal: this.config.reviewPerDay,
      totalProgress,
      totalTarget,
      percentage: Math.round((totalProgress / totalTarget) * 100),
    };
  }

  /**
   * 取得配額狀態（用於儲存）
   */
  getState(): DailyQuotaState {
    this.checkAndUpdateDate();
    return { ...this.state };
  }

  /**
   * 從儲存狀態還原
   */
  static fromState(
    state: DailyQuotaState,
    config: DailyQuotaConfig = DEFAULT_DAILY_QUOTA
  ): DailyQuota {
    const quota = new DailyQuota(config, state);
    quota.checkAndUpdateDate();
    return quota;
  }

  /**
   * 計算今日應學習的單字（從 SRS 資料篩選）
   * @param srsData 玩家 SRS 資料
   * @param currentLevel 當前關卡編號
   * @param allWordIds 所有可用單字 ID
   */
  calculateDueWords(
    srsData: PlayerSRSData,
    currentLevel: number,
    allWordIds: Set<string>
  ): {
    newWords: string[];
    reviewWords: string[];
  } {
    this.checkAndUpdateDate();

    const newWords: string[] = [];
    const reviewWords: string[] = [];

    // 篩選新單字（從未出現過的）
    for (const wordId of allWordIds) {
      const state = srsData[wordId];
      
      if (!state || state.te === 0) {
        // 新單字
        if (newWords.length < this.config.newPerDay) {
          newWords.push(wordId);
        }
      } else if (state.nr <= currentLevel) {
        // 到期複習單字
        if (reviewWords.length < this.config.reviewPerDay) {
          reviewWords.push(wordId);
        }
      }
    }

    return { newWords, reviewWords };
  }
}
