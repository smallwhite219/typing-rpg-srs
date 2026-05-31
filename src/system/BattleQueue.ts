/**
 * BattleQueue - 戰鬥佇列系統
 * 
 * 管理戰鬥中的單字佇列，處理 Again 重練機制。
 * 
 * 規則：
 * - 打錯的單字插入佇列尾端（強制重練）
 * - 最大重練次數：2 次
 * - 超過最大重練次數：標記 again，排程至下一關
 * - 重練成功：Combo 恢復到 1
 * - 重練失敗：Combo 歸零
 */

import type { WordData } from '../types/game';

/** 佇列項目 */
export interface QueueItem {
  /** 單字資料 */
  word: WordData;
  /** 已嘗試次數 */
  attempts: number;
  /** 是否為重練（之前打錯） */
  isRetry: boolean;
  /** 重練成功標記 */
  retrySuccess: boolean;
}

/** 戰鬥結果統計 */
export interface BattleStats {
  /** 總單字數 */
  totalWords: number;
  /** 正確數 */
  correctCount: number;
  /** 錯誤數 */
  errorCount: number;
  /** 重練成功數 */
  retrySuccessCount: number;
  /** 最大 Combo */
  maxCombo: number;
}

export class BattleQueue {
  private queue: QueueItem[] = [];
  private processedItems: QueueItem[] = [];
  private maxRetryAttempts: number = 2;

  constructor(words: WordData[], maxRetryAttempts: number = 2) {
    this.maxRetryAttempts = maxRetryAttempts;
    this.queue = words.map(word => ({
      word,
      attempts: 0,
      isRetry: false,
      retrySuccess: false,
    }));
  }

  /**
   * 取得下一個待處理的單字
   */
  peek(): QueueItem | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /**
   * 出隊（單字正確完成）
   */
  dequeue(): QueueItem | null {
    const item = this.queue.shift();
    if (item) {
      this.processedItems.push(item);
    }
    return item ?? null;
  }

  /**
   * 處理錯誤：將單字插入佇列尾端（重練）
   * @returns 是否成功插入重練（false 表示已達最大重練次數）
   */
  handleError(item: QueueItem): boolean {
    item.attempts += 1;

    if (item.attempts >= this.maxRetryAttempts) {
      // 已達最大重練次數，不再重練
      item.isRetry = false;
      this.processedItems.push(item);
      return false;
    }

    // 插入佇列尾端，標記為重練
    item.isRetry = true;
    item.retrySuccess = false;
    this.queue.push(item);
    return true;
  }

  /**
   * 標記重練成功
   */
  markRetrySuccess(item: QueueItem) {
    item.retrySuccess = true;
  }

  /**
   * 檢查佇列是否已清空
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 取得佇列大小
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * 取得剩餘單字數（含重練）
   */
  remainingCount(): number {
    return this.queue.length;
  }

  /**
   * 取得已處理單字數
   */
  processedCount(): number {
    return this.processedItems.length;
  }

  /**
   * 取得戰鬥統計
   */
  getStats(): BattleStats {
    const totalWords = this.processedItems.length;
    const correctCount = this.processedItems.filter(
      item => item.attempts === 0 || item.retrySuccess
    ).length;
    const errorCount = totalWords - correctCount;
    const retrySuccessCount = this.processedItems.filter(
      item => item.retrySuccess
    ).length;

    // 計算最大 Combo（需要外部追蹤，這裡只回傳基礎統計）
    const maxCombo = 0; // 由外部 CombatScene 追蹤

    return {
      totalWords,
      correctCount,
      errorCount,
      retrySuccessCount,
      maxCombo,
    };
  }

  /**
   * 取得所有已處理的單字（用於戰後評分）
   */
  getProcessedItems(): QueueItem[] {
    return [...this.processedItems];
  }

  /**
   * 取得需要 Again 評分的單字（重練失敗的）
   */
  getAgainWords(): QueueItem[] {
    return this.processedItems.filter(item => 
      item.attempts >= this.maxRetryAttempts && !item.retrySuccess
    );
  }

  /**
   * 取得重練成功的單字
   */
  getRetrySuccessWords(): QueueItem[] {
    return this.processedItems.filter(item => item.retrySuccess);
  }

  /**
   * 取得正常通過的單字
   */
  getNormalPassWords(): QueueItem[] {
    return this.processedItems.filter(item => 
      item.attempts === 0 && !item.isRetry
    );
  }

  /**
   * 序列化為 SRS 更新資料
   * @returns Map<wordId, { isRetry: boolean, retrySuccess: boolean, rating: SRSRating }>
   */
  serializeForSRS(): Map<string, { isRetry: boolean; retrySuccess: boolean }> {
    const result = new Map<string, { isRetry: boolean; retrySuccess: boolean }>();
    
    for (const item of this.processedItems) {
      result.set(item.word.id, {
        isRetry: item.isRetry,
        retrySuccess: item.retrySuccess,
      });
    }
    
    return result;
  }
}
