import type { WordData } from '../types/game';
import { CloudSave } from '../utils/CloudSave';
import { fallbackVocab } from './fallbackVocab';
import { japanPresentationVocab } from './japanPresentationVocab';

const VOCAB_CACHE_KEY = 'typing_rpg_vocab_cache';
const CORE_VOCAB_PRIORITY_TAG = 'listening-typing-core';

export class VocabManagerService {
  private vocabMap: Map<string, WordData> = new Map();
  private isLoaded: boolean = false;

  constructor() {}

  /**
   * 初始化並載入字彙
   * 載入順序: LocalStorage -> Fallback -> Cloud Fetch
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    // 1. 嘗試從 localStorage 載入快取
    const cached = localStorage.getItem(VOCAB_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as WordData[];
        const merged = this.withCoreVocabulary(parsed);
        this.setVocab(merged);
        localStorage.setItem(VOCAB_CACHE_KEY, JSON.stringify(merged));
        console.log(`[VocabManager] 已從快取載入 ${merged.length} 個單字`);
      } catch (e) {
        console.warn('[VocabManager] 快取解析失敗，使用 Fallback');
        this.setVocab(fallbackVocab);
      }
    } else {
      // 2. 若無快取，先用 Fallback 墊檔
      console.log(`[VocabManager] 無快取，使用 Fallback 載入 ${fallbackVocab.length} 個單字`);
      this.setVocab(fallbackVocab);
    }

    this.isLoaded = true;

    // 3. 在背景發起 Fetch 來更新單字庫
    this.syncFromCloud();
  }

  /**
   * 非同步從雲端更新字彙
   */
  private async syncFromCloud() {
    try {
      const data = await CloudSave.getVocab();
      if (data && data.vocab && data.vocab.length > 0) {
        const merged = this.withCoreVocabulary(data.vocab);
        this.setVocab(merged);
        localStorage.setItem(VOCAB_CACHE_KEY, JSON.stringify(merged));
        console.log(`[VocabManager] 雲端同步完成，更新了 ${merged.length} 個單字`);
      }
    } catch (e) {
      console.error('[VocabManager] 雲端同步失敗，保持現有單字庫', e);
    }
  }

  /**
   * 本地日本發表核心詞庫永遠置頂，避免雲端基礎字表覆蓋學習目標。
   */
  private withCoreVocabulary(words: WordData[]): WordData[] {
    const merged: WordData[] = [];
    const seen = new Set<string>();

    for (const word of japanPresentationVocab) {
      const key = word.word.trim().toLowerCase();
      if (!key || seen.has(key)) continue;

      merged.push({
        ...word,
        tags: word.tags?.includes(CORE_VOCAB_PRIORITY_TAG)
          ? word.tags
          : [...(word.tags || []), CORE_VOCAB_PRIORITY_TAG],
      });
      seen.add(key);
    }

    for (const word of words) {
      const key = word.word.trim().toLowerCase();
      if (!key || seen.has(key)) continue;

      merged.push(word);
      seen.add(key);
    }

    return merged;
  }

  /**
   * 將陣列轉換為 Map
   */
  private setVocab(words: WordData[]) {
    this.vocabMap.clear();
    words.forEach((word, index) => {
      // 確保沒有 ID 時，給予基於順序的臨時 ID，避免 Map 互相覆蓋
      if (!word.id) {
        word.id = `fallback_id_${index}`;
      }
      
      if (word.enabled) {
        this.vocabMap.set(word.id, word);
      }
    });
  }

  /**
   * 獲取所有啟用的單字
   */
  getAllWords(): WordData[] {
    return Array.from(this.vocabMap.values());
  }

  /**
   * 根據 ID 獲取特定單字
   */
  getWordById(id: string): WordData | undefined {
    return this.vocabMap.get(id);
  }

  /**
   * 獲取所有單字 ID 的 Set
   */
  getAllWordIds(): Set<string> {
    return new Set(this.vocabMap.keys());
  }
}

export const VocabManager = new VocabManagerService();
