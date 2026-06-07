/**
 * PromptGenerator - 出題引擎
 * 
 * 根據學習階段產生單字或句子題目。
 * 
 * 出題規則：
 * - 新學階段：100% 單字
 * - 學習中：80% 單字，20% 句子
 * - 複習階段：50% 單字，50% 句子
 * - 精熟階段：20% 單字，80% 句子
 * 
 * 時限計算：
 * - 單字：字元數 × 1.5 秒
 * - 句子：字元數 × 1.5 秒
 */

import type { WordData, PromptResult, GameConfig, LearningStage } from '../types';
import { GAME_CONFIG as DEFAULT_GAME_CONFIG } from '../types';
import { normalizeTypingText } from '../utils/textNormalization';

export class PromptGenerator {
  private config: GameConfig;

  constructor(config: GameConfig = DEFAULT_GAME_CONFIG) {
    this.config = config;
  }

  /**
   * 產生題目
   * @param word 單字資料
   * @param stage 學習階段
   * @param forceType 強制指定出題類型（用於重練）
   */
  generatePrompt(
    word: WordData,
    stage: LearningStage,
    forceType?: 'word' | 'sentence'
  ): PromptResult {
    // 決定出題類型
    const promptType = forceType || this.determinePromptType(stage);

    // 產生題目
    if (promptType === 'word') {
      return this.generateWordPrompt(word, stage);
    } else {
      return this.generateSentencePrompt(word, stage);
    }
  }

  /**
   * 根據學習階段決定出題類型
   */
  private determinePromptType(stage: LearningStage): 'word' | 'sentence' {
    const ratios = (this.config.promptRatios as any)[stage];
    const random = Math.random();
    
    if (random < ratios.word) {
      return 'word';
    }
    return 'sentence';
  }

  /**
   * 產生單字題目
   */
  private generateWordPrompt(word: WordData, stage: LearningStage): PromptResult {
    const timeLimit = word.word.length * this.config.wordTimeFactor[stage];

    return {
      type: 'word',
      targetText: word.word,
      hintText: word.definition,
      timeLimit,
      wordId: word.id,
    };
  }

  /**
   * 產生句子題目
   */
  private generateSentencePrompt(word: WordData, stage: LearningStage): PromptResult {
    // 如果有例句，使用例句；否則使用單字本身
    const sentence = word.exampleSentence || word.word;
    const hint = word.exampleTranslation || word.definition;
    const timeLimit = sentence.length * this.config.sentenceTimeFactor[stage];

    return {
      type: 'sentence',
      targetText: sentence,
      hintText: hint,
      timeLimit,
      wordId: word.id,
    };
  }

  /**
   * 檢查打字結果是否正確
   * @param prompt 題目
   * @param input 用戶輸入
   */
  checkTyping(prompt: PromptResult, input: string): {
    isCorrect: boolean;
    accuracy: number;
    typedLength: number;
    errorCount: number;
  } {
    const target = normalizeTypingText(prompt.targetText);
    const normalizedInput = normalizeTypingText(input);
    const typedLength = input.length;
    
    // 計算錯誤數
    let errorCount = 0;
    const compareLength = Math.min(target.length, normalizedInput.length);
    
    for (let i = 0; i < compareLength; i++) {
      if (normalizedInput[i] !== target[i]) {
        errorCount++;
      }
    }
    
    // 長度差異也算錯誤
    if (normalizedInput.length < target.length) {
      errorCount += target.length - normalizedInput.length;
    }
    
    // 計算正確率
    const accuracy = target.length > 0 
      ? Math.max(0, 1 - errorCount / target.length) 
      : 0;

    // 判定是否正確
    let isCorrect: boolean;
    if (prompt.type === 'word') {
      // 單字：必須完全正確
      isCorrect = normalizedInput === target;
    } else {
      // 句子：正確率 >= 80% 算通過
      isCorrect = accuracy >= this.config.sentencePassAccuracy;
    }

    return {
      isCorrect,
      accuracy,
      typedLength,
      errorCount,
    };
  }

  /**
   * 計算 Combo 傷害加成
   * @param comboCount 當前 Combo 數
   */
  calculateComboDamage(comboCount: number): { bonus: number; rating: string } {
    const bonuses = this.config.comboDamageBonuses;
    
    // 找出符合的最高門檻
    let bonus = 0;
    let rating = '';
    
    if (comboCount >= 20) {
      bonus = bonuses[20];
      rating = 'PERFECT!';
    } else if (comboCount >= 15) {
      bonus = bonuses[15];
      rating = 'Excellent!';
    } else if (comboCount >= 10) {
      bonus = bonuses[10];
      rating = 'Great!';
    } else if (comboCount >= 5) {
      bonus = bonuses[5];
      rating = 'Good!';
    }

    return { bonus, rating };
  }

  /**
   * 計算句子完美獎勵（Combo +2）
   */
  isSentencePerfect(accuracy: number): boolean {
    return accuracy === 1.0;
  }
}
