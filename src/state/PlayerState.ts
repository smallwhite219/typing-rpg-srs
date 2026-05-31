import type { PlayerData, PlayerSRSData, BattleResult } from '../types/game';
import { CloudSave } from '../utils/CloudSave';
import { DailyQuota } from '../system/DailyQuota';
import { DEFAULT_DAILY_QUOTA } from '../types/game';

const PLAYER_CACHE_KEY = 'typing_rpg_player_state';

class PlayerStateService {
  private player: PlayerData | null = null;
  private dailyQuotaSystem: DailyQuota | null = null;

  constructor() {}

  /**
   * 初始化：嘗試從 localStorage 恢復登入狀態
   */
  async initialize(): Promise<boolean> {
    const cached = localStorage.getItem(PLAYER_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as PlayerData;
        this.setPlayer(parsed);
        // 背景同步最新資料
        this.syncFromCloud();
        return true;
      } catch (e) {
        console.warn('[PlayerState] 快取還原失敗');
        localStorage.removeItem(PLAYER_CACHE_KEY);
      }
    }
    return false;
  }

  /**
   * 登入
   */
  async login(classId: string, pin: string): Promise<boolean> {
    const playerData = await CloudSave.login(classId, pin);
    if (playerData) {
      this.setPlayer(playerData);
      return true;
    }
    return false;
  }

  /**
   * 登出
   */
  logout() {
    this.player = null;
    this.dailyQuotaSystem = null;
    localStorage.removeItem(PLAYER_CACHE_KEY);
  }

  /**
   * 設定內部狀態與對應子系統
   */
  private setPlayer(data: PlayerData) {
    this.player = data;
    this.dailyQuotaSystem = DailyQuota.fromState(data.dailyQuota, DEFAULT_DAILY_QUOTA);
    localStorage.setItem(PLAYER_CACHE_KEY, JSON.stringify(this.player));
  }

  /**
   * 取得當前玩家資料
   */
  getPlayer(): PlayerData | null {
    return this.player;
  }

  /**
   * 是否已登入
   */
  isLoggedIn(): boolean {
    return this.player !== null;
  }

  /**
   * 從雲端取得最新狀態
   */
  private async syncFromCloud() {
    if (!this.player) return;
    const freshData = await CloudSave.login(this.player.classId, this.player.pin);
    if (freshData) {
      this.setPlayer(freshData);
      console.log('[PlayerState] 背景同步最新玩家結構成功');
    }
  }

  /**
   * 觸發存檔至雲端，並更新快取
   */
  async save(): Promise<boolean> {
    if (!this.player) return false;
    
    // 更新 quota 狀態
    if (this.dailyQuotaSystem) {
      this.player.dailyQuota = this.dailyQuotaSystem.getState();
    }
    
    this.player.lastUpdated = new Date().toISOString();
    localStorage.setItem(PLAYER_CACHE_KEY, JSON.stringify(this.player));

    const success = await CloudSave.savePlayer(this.player);
    if (!success) {
      console.warn('[PlayerState] 雲端存檔失敗，保留本地快取等候下次覆寫');
    }
    return success;
  }

  /**
   * 更新戰鬥進度與 SRS 資料
   */
  updateProgress(
    srsDataUpdates: PlayerSRSData,
    scoreAdded: number,
    result: BattleResult
  ) {
    if (!this.player) return;

    // 合併 SRS 資料
    this.player.srsData = {
      ...this.player.srsData,
      ...srsDataUpdates
    };

    // 更新分數與關卡
    this.player.totalScore += scoreAdded;
    if (scoreAdded > this.player.bestScore) {
      this.player.bestScore = scoreAdded;
    }

    if (result === 'victory') {
      this.player.currentLevel += 1;
    }
    
    // 雖然更新了進度，但需呼叫 save() 才會同步儲存
  }

  /**
   * 取得每日配額系統實體
   */
  getDailyQuota(): DailyQuota | null {
    return this.dailyQuotaSystem;
  }
}

export const PlayerState = new PlayerStateService();
