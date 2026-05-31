import { Graphics, Text } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { SceneManager } from './SceneManager';
import { MainMenuScene } from './MainMenuScene';
import { VocabManager } from '../data/VocabManager';
import { PlayerState } from '../state/PlayerState';
import { SRSEngine } from '../system/SRSEngine';
import { UI_STYLE } from '../ui/UIStyle';
import { soundManager } from '../utils/SoundManager';
import { CloudSave } from '../utils/CloudSave';
import type { WordData } from '../types/game';
import type { WordSRSState } from '../types/srs';

export class WordListScene extends BaseScene {
  private overlayContainer: HTMLDivElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private srsEngine = new SRSEngine();
  
  // 記錄使用者在此頁面中暫存的優先級修改
  // key 為 wordId，value 為優先級 (1~5)
  private modifiedPriorities: Map<string, number> = new Map();

  async init(): Promise<void> {
    const { width, height } = SceneManager.getScreenSize();

    // 繪製純 PixiJS 黑色高對比背景，確保 Canvas 區域不會穿透
    const bg = new Graphics();
    bg.rect(0, 0, width, height);
    bg.fill({ color: 0x09090b });
    this.addChild(bg);

    const loadingText = new Text({
      text: '正在載入字彙資料庫...',
      style: {
        fill: 0xffffff,
        fontSize: 24,
        fontFamily: UI_STYLE.FONTS.MONO,
      }
    });
    loadingText.anchor.set(0.5);
    loadingText.x = width / 2;
    loadingText.y = height / 2;
    this.addChild(loadingText);
  }

  start(): void {
    const appElement = document.getElementById('app');
    if (!appElement) {
      console.error('[WordListScene] 找不到 #app 容器');
      SceneManager.switchScene(new MainMenuScene());
      return;
    }

    // 確保 #app 是相對定位，以便 Overlay 能夠正確 absolute 置中
    appElement.style.position = 'relative';

    // 1. 建立並注入 CSS 樣式
    this.injectStyles();

    // 2. 建立 Overlay 容器
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.className = 'word-list-overlay';
    appElement.appendChild(this.overlayContainer);

    // 3. 渲染主結構
    this.renderUI();
  }

  stop(): void {
    // 移除 HTML Overlay 與 CSS 樣式，防止殘留
    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private injectStyles() {
    this.styleElement = document.createElement('style');
    this.styleElement.innerHTML = `
      .word-list-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 1024px;
        height: 768px;
        background-color: #09090b;
        color: #f4f4f5;
        font-family: 'Microsoft JhengHei', sans-serif;
        padding: 24px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        z-index: 100;
      }

      /* 頂部標題 */
      .word-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        border-bottom: 2px solid #ef4444;
        padding-bottom: 12px;
      }
      .word-list-header h2 {
        font-size: 28px;
        font-weight: bold;
        color: #ef4444;
        margin: 0;
        letter-spacing: 1px;
      }
      .word-list-header .subtitle {
        font-size: 14px;
        color: #a1a1aa;
      }

      /* 篩選與搜尋欄 */
      .filter-bar {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
        align-items: center;
      }
      .search-input {
        flex: 1;
        background-color: #18181b;
        border: 2px solid #3f3f46;
        border-radius: 6px;
        color: #ffffff;
        padding: 8px 12px;
        font-size: 15px;
        outline: none;
      }
      .search-input:focus {
        border-color: #8b5cf6;
      }
      .filter-select {
        background-color: #18181b;
        border: 2px solid #3f3f46;
        border-radius: 6px;
        color: #ffffff;
        padding: 8px 12px;
        font-size: 15px;
        outline: none;
        cursor: pointer;
      }
      .filter-select:focus {
        border-color: #8b5cf6;
      }

      /* 表格區域 */
      .table-container {
        flex: 1;
        overflow-y: auto;
        border: 2px solid #27272a;
        border-radius: 8px;
        background-color: #18181b;
        margin-bottom: 16px;
      }
      .word-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }
      .word-table th, .word-table td {
        padding: 12px 16px;
        border-bottom: 1px solid #27272a;
      }
      .word-table th {
        background-color: #27272a;
        color: #ffffff;
        font-weight: bold;
        position: sticky;
        top: 0;
        z-index: 10;
        font-size: 15px;
      }
      .word-table tr:hover {
        background-color: #202024;
      }

      /* 詞彙標籤樣式 */
      .tag-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        margin-right: 4px;
      }
      .tag-badge.core {
        background-color: #7c3aed;
        color: #ffffff;
      }
      .tag-badge.basic {
        background-color: #4b5563;
        color: #ffffff;
      }

      /* 學習狀態樣式 */
      .status-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 99px;
        font-size: 12px;
        font-weight: bold;
      }
      .status-badge.new { background-color: #3b82f6; color: #ffffff; }
      .status-badge.learning { background-color: #f59e0b; color: #ffffff; }
      .status-badge.review { background-color: #8b5cf6; color: #ffffff; }
      .status-badge.mastered { background-color: #10b981; color: #ffffff; }

      /* 優先度按鈕群組 */
      .priority-group {
        display: flex;
        gap: 4px;
      }
      .priority-btn {
        width: 28px;
        height: 28px;
        border: 1px solid #52525b;
        background-color: #27272a;
        color: #a1a1aa;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .priority-btn:hover {
        border-color: #ef4444;
        color: #ffffff;
      }
      .priority-btn.active {
        background-color: #ef4444;
        border-color: #ef4444;
        color: #ffffff;
        box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
      }

      /* 優先分數 */
      .priority-score {
        font-family: monospace;
        font-weight: bold;
        font-size: 16px;
        color: #eab308;
      }
      .priority-score.modified {
        color: #f97316;
        position: relative;
      }
      .priority-score.modified::after {
        content: '*';
        color: #f97316;
        font-weight: bold;
        margin-left: 2px;
      }

      /* 底部按鈕區 */
      .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .save-btn, .back-btn {
        padding: 12px 24px;
        font-size: 16px;
        font-weight: bold;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: transform 0.1s ease, opacity 0.15s ease;
      }
      .save-btn:active, .back-btn:active {
        transform: scale(0.97);
      }
      .save-btn {
        background-color: #10b981;
        color: #ffffff;
      }
      .save-btn:hover {
        background-color: #059669;
      }
      .back-btn {
        background-color: #3f3f46;
        color: #ffffff;
        border: 2px solid #52525b;
      }
      .back-btn:hover {
        background-color: #52525b;
      }

      /* 通知視窗 */
      .toast {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #10b981;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      .toast.show {
        opacity: 1;
      }
    `;
    document.head.appendChild(this.styleElement);
  }

  private renderUI() {
    if (!this.overlayContainer) return;

    this.overlayContainer.innerHTML = `
      <div class="word-list-header">
        <div>
          <h2>單字庫出現權重管理</h2>
          <span class="subtitle">優先分數 = 優先等級 (1~5) × 戰後自評 (重壓4, 困難3, 熟悉2, 簡單1，新單字預設4)；數值越大越優先出題。</span>
        </div>
        <div id="toast-container" class="toast">設定已成功同步至雲端存檔！</div>
      </div>

      <div class="filter-bar">
        <input type="text" id="search-box" class="search-input" placeholder="搜尋單字拼寫、詞性或中文定義..." />
        
        <select id="type-filter" class="filter-select">
          <option value="all">所有分類</option>
          <option value="core">研討會與旅遊單字 (預設優先度 3)</option>
          <option value="basic">其它基礎單字 (預設優先度 2)</option>
        </select>

        <select id="status-filter" class="filter-select">
          <option value="all">所有學習狀態</option>
          <option value="new">🆕 新單字 (Unseen)</option>
          <option value="learning">🟡 學習中 (Learning)</option>
          <option value="review">🟣 複習中 (Review)</option>
          <option value="mastered">🟢 已精熟 (Mastered)</option>
        </select>
      </div>

      <div class="table-container">
        <table class="word-table">
          <thead>
            <tr>
              <th style="width: 15%">英文單字</th>
              <th style="width: 8%">詞性</th>
              <th style="width: 25%">中文定義</th>
              <th style="width: 15%">分類標籤</th>
              <th style="width: 12%">學習狀態</th>
              <th style="width: 15%">設定優先等級</th>
              <th style="width: 10%">優先分數</th>
            </tr>
          </thead>
          <tbody id="vocab-table-body">
            <!-- 動態插入單字列表 -->
          </tbody>
        </table>
      </div>

      <div class="action-bar">
        <button id="btn-back-menu" class="back-btn">◀ 返回主選單 (ESC)</button>
        <div>
          <span id="unsaved-indicator" style="margin-right: 16px; color: #f97316; font-size: 14px; display: none;">* 有未儲存的優先級變更</span>
          <button id="btn-save-settings" class="save-btn">💾 儲存設定</button>
        </div>
      </div>
    `;

    // 註冊事件監聽
    const searchBox = document.getElementById('search-box') as HTMLInputElement;
    const typeFilter = document.getElementById('type-filter') as HTMLSelectElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    const btnBack = document.getElementById('btn-back-menu') as HTMLButtonElement;
    const btnSave = document.getElementById('btn-save-settings') as HTMLButtonElement;

    const updateList = () => {
      this.populateTable(searchBox.value, typeFilter.value, statusFilter.value);
    };

    searchBox.addEventListener('input', updateList);
    typeFilter.addEventListener('change', updateList);
    statusFilter.addEventListener('change', updateList);

    btnBack.addEventListener('click', () => {
      soundManager.playHit();
      SceneManager.switchScene(new MainMenuScene());
    });

    btnSave.addEventListener('click', () => {
      this.saveChanges();
    });

    // ESC 鍵返回主選單
    const escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundManager.playHit();
        window.removeEventListener('keydown', escListener);
        SceneManager.switchScene(new MainMenuScene());
      }
    };
    window.addEventListener('keydown', escListener);

    // 初次載入列表
    updateList();
  }

  private populateTable(searchQuery: string, typeFilter: string, statusFilter: string) {
    const tableBody = document.getElementById('vocab-table-body');
    if (!tableBody) return;

    const allWords = VocabManager.getAllWords();
    const player = PlayerState.getPlayer();
    const srsData = player?.srsData || {};
    const query = searchQuery.trim().toLowerCase();

    // 過濾單字
    const filteredWords = allWords.filter(word => {
      // 1. 搜尋關鍵字過濾 (單字、定義、詞性)
      const matchesQuery = 
        word.word.toLowerCase().includes(query) || 
        word.definition.toLowerCase().includes(query) ||
        word.partOfSpeech.toLowerCase().includes(query);
      if (!matchesQuery) return false;

      // 2. 核心/基礎分類過濾
      const isCoreTravelWord = word.tags?.some(tag =>
        ['japan-trip', 'conference', 'talper-presentation', 'listening-typing-core'].includes(tag.toLowerCase().trim())
      ) || false;

      if (typeFilter === 'core' && !isCoreTravelWord) return false;
      if (typeFilter === 'basic' && isCoreTravelWord) return false;

      // 3. 學習狀態過濾
      const state = srsData[word.id] || null;
      const stage = this.srsEngine.getStage(state);
      if (statusFilter !== 'all' && stage !== statusFilter) return false;

      return true;
    });

    // 排序：有被修改過優先級的排在前面，接著以優先分數排序
    filteredWords.sort((a, b) => {
      const aModified = this.modifiedPriorities.has(a.id) ? 1 : 0;
      const bModified = this.modifiedPriorities.has(b.id) ? 1 : 0;
      if (aModified !== bModified) {
        return bModified - aModified;
      }
      
      // 以優先分數降序排列
      const aScore = this.getPriorityScore(a, srsData[a.id]);
      const bScore = this.getPriorityScore(b, srsData[b.id]);
      return bScore - aScore;
    });

    if (filteredWords.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: #71717a; padding: 32px;">沒有符合篩選條件的單字</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = '';

    filteredWords.forEach(word => {
      const state = srsData[word.id] || null;
      const isCore = word.tags?.some(tag =>
        ['japan-trip', 'conference', 'talper-presentation', 'listening-typing-core'].includes(tag.toLowerCase().trim())
      ) || false;

      // 當前優先度等級 (1~5)
      const currentPr = this.modifiedPriorities.get(word.id) ?? state?.pr ?? (isCore ? 3 : 2);
      const isModified = this.modifiedPriorities.has(word.id);

      // 自評評分與加成
      let ratingStr = '未學習';
      let ratingFactor = 4; // 預設加成 4
      if (state && state.fm) {
        switch (state.fm) {
          case 'again':
            ratingStr = '重壓 (x4)';
            ratingFactor = 4;
            break;
          case 'hard':
            ratingStr = '困難 (x3)';
            ratingFactor = 3;
            break;
          case 'good':
            ratingStr = '熟悉 (x2)';
            ratingFactor = 2;
            break;
          case 'easy':
            ratingStr = '簡單 (x1)';
            ratingFactor = 1;
            break;
        }
      }

      // 計算優先分數
      const priorityScore = currentPr * ratingFactor;

      // 學習階段對應 badge
      const stage = this.srsEngine.getStage(state);
      let stageBadge = `<span class="status-badge new">新單字</span>`;
      if (stage === 'learning') stageBadge = `<span class="status-badge learning">學習中</span>`;
      if (stage === 'review') stageBadge = `<span class="status-badge review">複習中</span>`;
      if (stage === 'mastered') stageBadge = `<span class="status-badge mastered">已精熟</span>`;

      // 渲染一列
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: bold; font-size: 16px; color: #ffffff;">${word.word}</td>
        <td style="color: #a1a1aa; font-family: monospace;">${word.partOfSpeech}</td>
        <td>${word.definition}</td>
        <td>
          ${isCore ? '<span class="tag-badge core">研討會與旅遊</span>' : '<span class="tag-badge basic">基礎單字</span>'}
        </td>
        <td>${stageBadge}</td>
        <td>
          <div class="priority-group">
            ${[1, 2, 3, 4, 5].map(lvl => `
              <button class="priority-btn ${lvl === currentPr ? 'active' : ''}" data-word-id="${word.id}" data-level="${lvl}">
                ${lvl}
              </button>
            `).join('')}
          </div>
        </td>
        <td>
          <span class="priority-score ${isModified ? 'modified' : ''}" id="score-${word.id}">
            ${priorityScore}
          </span>
          <span style="font-size: 11px; color: #a1a1aa; display: block; margin-top: 2px;">
            ${ratingStr}
          </span>
        </td>
      `;

      // 為優先度按鈕綁定事件
      const buttons = tr.querySelectorAll('.priority-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLButtonElement;
          const wordId = target.getAttribute('data-word-id')!;
          const selectedLvl = parseInt(target.getAttribute('data-level')!, 10);
          
          soundManager.playType();
          this.setWordPriority(wordId, selectedLvl, word, state);
        });
      });

      tableBody.appendChild(tr);
    });
  }

  /**
   * 取得單字的優先分數
   */
  private getPriorityScore(word: WordData, state: WordSRSState | null): number {
    const isCore = word.tags?.some(tag =>
      ['japan-trip', 'conference', 'talper-presentation', 'listening-typing-core'].includes(tag.toLowerCase().trim())
    ) || false;

    const currentPr = this.modifiedPriorities.get(word.id) ?? state?.pr ?? (isCore ? 3 : 2);
    
    let ratingFactor = 4;
    if (state && state.fm) {
      switch (state.fm) {
        case 'again': ratingFactor = 4; break;
        case 'hard': ratingFactor = 3; break;
        case 'good': ratingFactor = 2; break;
        case 'easy': ratingFactor = 1; break;
      }
    }
    return currentPr * ratingFactor;
  }

  /**
   * 使用者在 UI 上設定優先級
   */
  private setWordPriority(wordId: string, level: number, word: WordData, state: WordSRSState | null) {
    const isCore = word.tags?.some(tag =>
      ['japan-trip', 'conference', 'talper-presentation', 'listening-typing-core'].includes(tag.toLowerCase().trim())
    ) || false;

    const defaultLvl = isCore ? 3 : 2;

    if (level === defaultLvl && (!state || state.pr === undefined)) {
      // 如果設回預設值，且原本也沒有 pr 紀錄，可從 map 中移除
      this.modifiedPriorities.delete(wordId);
    } else if (state && state.pr === level) {
      // 設回原本狀態的 pr，亦可從 map 中移除
      this.modifiedPriorities.delete(wordId);
    } else {
      // 否則寫入變更 map
      this.modifiedPriorities.set(wordId, level);
    }

    // 更新未儲存變更提示
    const indicator = document.getElementById('unsaved-indicator');
    if (indicator) {
      indicator.style.display = this.modifiedPriorities.size > 0 ? 'inline' : 'none';
    }

    // 局部更新該列 UI (以避免整張表重新 Populate 導致失去焦點與捲動位置)
    const priorityGroup = document.querySelector(`[data-word-id="${wordId}"]`)?.parentElement;
    if (priorityGroup) {
      const btns = priorityGroup.querySelectorAll('.priority-btn');
      btns.forEach(btn => {
        const btnLvl = parseInt(btn.getAttribute('data-level')!, 10);
        if (btnLvl === level) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // 更新優先分數顯示
    const scoreSpan = document.getElementById(`score-${wordId}`);
    if (scoreSpan) {
      let ratingFactor = 4;
      if (state && state.fm) {
        switch (state.fm) {
          case 'again': ratingFactor = 4; break;
          case 'hard': ratingFactor = 3; break;
          case 'good': ratingFactor = 2; break;
          case 'easy': ratingFactor = 1; break;
        }
      }
      scoreSpan.textContent = (level * ratingFactor).toString();
      
      const isModifiedNow = this.modifiedPriorities.has(wordId);
      if (isModifiedNow) {
        scoreSpan.classList.add('modified');
      } else {
        scoreSpan.classList.remove('modified');
      }
    }
  }

  /**
   * 儲存設定至雲端與本地
   */
  private async saveChanges() {
    if (this.modifiedPriorities.size === 0) return;

    const player = PlayerState.getPlayer();
    if (!player) return;

    soundManager.playHit();

    // 將所有變更寫入 srsData
    this.modifiedPriorities.forEach((level, wordId) => {
      let state = player.srsData[wordId];
      if (!state) {
        // 新單字，尚未出現在 srsData 中，呼叫 srsEngine 進行初始化
        state = this.srsEngine.createNewState(wordId);
      }
      // 更新優先等級
      state.pr = level;
      player.srsData[wordId] = state;
    });

    const btnSave = document.getElementById('btn-save-settings') as HTMLButtonElement;
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = '💾 儲存中...';
    }

    // 同步至本地快取與雲端 Google Sheets
    const success = await CloudSave.savePlayer(player);

    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = '💾 儲存設定';
    }

    if (success) {
      // 清空變更暫存
      this.modifiedPriorities.clear();
      const indicator = document.getElementById('unsaved-indicator');
      if (indicator) indicator.style.display = 'none';

      // 移除所有分數上的 modified 標記
      const modifiedScores = document.querySelectorAll('.priority-score.modified');
      modifiedScores.forEach(el => el.classList.remove('modified'));

      // 顯示 Toast 成功通知
      const toast = document.getElementById('toast-container');
      if (toast) {
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
        }, 2000);
      }
    } else {
      alert('儲存失敗，請檢查網路連線。已經為您保留本地快取。');
    }
  }
}
