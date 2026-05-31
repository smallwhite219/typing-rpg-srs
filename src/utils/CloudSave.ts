import type { PlayerData, WordData } from '../types/game';

// 預設的 GAS API URL 可以透過環境變數注入
const defaultGasUrl = import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbxB4qTwW3If-J4Uzv91MnMBPBFa7suNBVvho9R8mIcetamv03Bp04zk8HB67Td-NSZL/exec';

export interface CloudResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class CloudSaveService {
  private gasUrl: string;

  constructor(url: string = defaultGasUrl) {
    this.gasUrl = url;
  }

  setGasUrl(url: string) {
    this.gasUrl = url;
  }

  getGasUrl() {
    return this.gasUrl;
  }

  private async fetchApi<T>(action: string, payload: any = {}): Promise<CloudResponse<T>> {
    if (!this.gasUrl) {
      return { success: false, error: 'GAS_URL 未設定' };
    }

    try {
      const url = new URL(this.gasUrl);
      url.searchParams.append('action', action);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // GAS require text/plain to avoid CORS preflight issues sometimes
        },
        body: JSON.stringify(payload) // 移除外圍的 action，因為 Code.gs 目前是讀取 e.parameter.action
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (e: any) {
      console.error(`[CloudSave Request Error - ${action}]:`, e);
      return { success: false, error: e.message || 'Network error' };
    }
  }

  /**
   * 取得字彙庫
   */
  async getVocab(): Promise<{ vocab: WordData[] } | null> {
    const res = await this.fetchApi<{ vocab: WordData[] }>('GET_VOCAB');
    if (res.success && res.data) {
      return res.data;
    }
    console.error('getVocab failed:', res.error);
    return null;
  }

  /**
   * 登入驗證
   */
  async login(classId: string, pin: string): Promise<PlayerData | null> {
    const res = await this.fetchApi<{ player: PlayerData }>('LOGIN', { classId, pin });
    if (res.success && res.data) {
      return res.data.player;
    }
    console.error('login failed:', res.error);
    return null;
  }

  /**
   * 存檔
   */
  async savePlayer(player: PlayerData): Promise<boolean> {
    const res = await this.fetchApi<any>('SAVE_PLAYER', { player });
    if (res.success) {
      return true;
    }
    console.error('savePlayer failed:', res.error);
    return false;
  }

  /**
   * 取得排行榜
   */
  async getLeaderboard(): Promise<{ displayName: string, bestScore: number }[] | null> {
    const res = await this.fetchApi<{ leaderboard: { displayName: string, bestScore: number }[] }>('GET_LEADERBOARD');
    if (res.success && res.data) {
      return res.data.leaderboard;
    }
    console.error('getLeaderboard failed:', res.error);
    return null;
  }
}

export const CloudSave = new CloudSaveService();
