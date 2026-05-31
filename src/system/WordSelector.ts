/**
 * WordSelector - 優先級選字系統
 * 
 * 根據 SRS 狀態、每日配額和學習階段，智慧選擇優先出現的單字。
 * 
 * 優先級規則：
 * 1. 到期複習單字（nr <= currentLevel）優先於新單字
 * 2. 熟悉度低的單字優先
 * 3. 間隔越久的單字優先
 * 4. 新單字在未達配額時補充
 */

import type { WordData, PlayerSRSData, WordSRSState, LearningStage } from '../types';
import { SRSEngine } from './SRSEngine';

/** 選字結果 */
export interface SelectionResult {
  /** 選中的單字 */
  word: WordData;
  /** 學習階段 */
  stage: LearningStage;
  /** 優先級分數（越高越優先） */
  priorityScore: number;
}

export class WordSelector {
  private srsEngine: SRSEngine;

  constructor() {
    this.srsEngine = new SRSEngine();
  }

  /**
   * 為戰鬥選擇單字
   * @param allWords 所有可用單字
   * @param srsData 玩家 SRS 資料
   * @param currentLevel 當前關卡編號
   * @param batchSize 需要選擇的單字數量
   * @param newQuotaRemaining 新單字剩餘配額
   * @param reviewQuotaRemaining 複習剩餘配額
   */
  selectForBattle(
    allWords: WordData[],
    srsData: PlayerSRSData,
    currentLevel: number,
    batchSize: number = 5,
    newQuotaRemaining: number = 5,
    reviewQuotaRemaining: number = 10
  ): SelectionResult[] {
    const candidates: SelectionResult[] = [];

    // 為每個單字計算優先級
    for (const word of allWords) {
      if (!word.enabled) continue;

      const state = srsData[word.id] || null;
      const stage = this.srsEngine.getStage(state);
      const isDue = this.srsEngine.isDue(state, currentLevel);
      const priorityScore = this.calculatePriorityScore(word, state, stage, currentLevel);

      // 過濾不符合資格的單字
      if (!this.isEligible(word, state, stage, isDue, newQuotaRemaining, reviewQuotaRemaining)) {
        continue;
      }

      candidates.push({
        word,
        stage,
        priorityScore,
      });
    }

    // 依優先級排序
    candidates.sort((a, b) => b.priorityScore - a.priorityScore);

    // 選擇前 N 個
    return candidates.slice(0, batchSize);
  }

  /**
   * 計算優先級分數
   */
  private calculatePriorityScore(
    word: WordData,
    state: WordSRSState | null,
    stage: LearningStage,
    currentLevel: number
  ): number {
    const isCoreTravelWord = word.tags?.some(tag =>
      ['japan-trip', 'conference', 'talper-presentation', 'listening-typing-core'].includes(tag.toLowerCase().trim())
    ) || false;

    // 1. 取得優先出現等級 (1~5)，預設研討會+旅遊為 3，其它基礎單字為 2
    const priorityLevel = state?.pr ?? (isCoreTravelWord ? 3 : 2);

    // 2. 取得自評加成分數：重壓(again)=4, 困難(hard)=3, 熟悉(good)=2, 簡單(easy)=1。新單字預設為 4
    let ratingVal = 4;
    if (state && state.fm) {
      switch (state.fm) {
        case 'again':
          ratingVal = 4;
          break;
        case 'hard':
          ratingVal = 3;
          break;
        case 'good':
          ratingVal = 2;
          break;
        case 'easy':
          ratingVal = 1;
          break;
      }
    }

    // 3. 計算優先分數 (1~20)
    const priorityScoreVal = priorityLevel * ratingVal;

    // 4. 主要排序分數以優先分數為核心 (擴大差距，確保高優先分數一定先出現)
    let score = priorityScoreVal * 100;

    // 5. 結合 SRS 微調 (0~99)，在相同優先分數時發揮 SRS 排程微調作用
    if (state) {
      const isDue = state.nr <= currentLevel;
      if (isDue) {
        score += 50; // 到期基本分
        const overdue = currentLevel - state.nr;
        score += Math.min(overdue * 2, 30); // 逾期微調 (最高 30)
        
        const familiarity = this.srsEngine.getFamiliarityPercentage(state);
        score += (100 - familiarity) * 0.15; // 熟悉度微調 (最高 15)
      }
      
      // 學習階段微調
      switch (stage) {
        case 'learning':
          score += 4;
          break;
        case 'review':
          score += 2;
          break;
        case 'mastered':
          score += 0;
          break;
      }
    } else {
      // 新單字微調加分
      score += 40;
    }

    return score;
  }

  /**
   * 檢查單字是否符合資格
   */
  private isEligible(
    _word: WordData,
    state: WordSRSState | null,
    _stage: LearningStage,
    _isDue: boolean,
    newQuotaRemaining: number,
    reviewQuotaRemaining: number
  ): boolean {
    if (!state || state.te === 0) {
      // 新單字：檢查配額
      return newQuotaRemaining > 0;
    }

    if (_isDue) {
      // 到期複習單字：檢查配額
      return reviewQuotaRemaining > 0;
    }

    // 未到期單字：不選
    return false;
  }

  /**
   * 為戰後評分選擇單字（該關所有單字）
   */
  selectForReview(
    battleWords: WordData[],
    srsData: PlayerSRSData
  ): { word: WordData; stage: LearningStage }[] {
    return battleWords.map(word => ({
      word,
      stage: this.srsEngine.getStage(srsData[word.id] || null),
    }));
  }

  /**
   * 計算各學習階段的單字比例
   */
  calculateStageRatios(
    selectedWords: SelectionResult[]
  ): Record<LearningStage, number> {
    const ratios: Record<LearningStage, number> = {
      new: 0,
      learning: 0,
      review: 0,
      mastered: 0,
    };

    const total = selectedWords.length;
    if (total === 0) return ratios;

    for (const result of selectedWords) {
      ratios[result.stage] += 1;
    }

    // 轉換為比例
    (Object.keys(ratios) as LearningStage[]).forEach(stage => {
      ratios[stage] = ratios[stage] / total;
    });

    return ratios;
  }
}
