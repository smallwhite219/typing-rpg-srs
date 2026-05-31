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
    let score = 0;
    const isCoreTravelWord = word.tags?.some(tag =>
      ['japan-trip', 'conference', 'talper-presentation', 'listening-typing-core'].includes(tag)
    ) || false;

    if (!state) {
      // 新單字：基礎分數
      score = 100;
    } else {
      // 到期單字：基礎分數 + 間隔加成
      const isDue = state.nr <= currentLevel;
      if (isDue) {
        score = 200;

        // 逾期越久，分數越高
        const overdue = currentLevel - state.nr;
        score += Math.min(overdue * 10, 50);

        // 熟悉度越低，分數越高
        const familiarity = this.srsEngine.getFamiliarityPercentage(state);
        score += (100 - familiarity) * 0.5;
      } else {
        // 未到期單字：低分數
        score = 10;
      }

      // 學習階段加成
      switch (stage) {
        case 'learning':
          score += 30;
          break;
        case 'review':
          score += 15;
          break;
        case 'mastered':
          score += 5;
          break;
      }
    }

    if (isCoreTravelWord) {
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
