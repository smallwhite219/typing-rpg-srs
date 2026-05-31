/**
 * Typing RPG × SRS - Google Apps Script Backend
 * 
 * 部署指引：
 * 1. 建立 Google Sheets
 * 2. 建立兩個工作表：'Vocabulary' 與 'Players'
 * 3. 前往 擴充功能 > Apps Script，貼上此程式碼
 * 4. 點擊 部署 > 新增部署作業 > 選擇「網頁應用程式」
 * 5. 權限設定為「所有人」
 */

const SHEET_VOCAB = 'Vocabulary';
const SHEET_PLAYERS = 'Players';

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    const action = e.parameter.action;
    let payload = {};

    if (method === 'POST' && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    let responseData = {};

    switch (action) {
      case 'GET_VOCAB':
        responseData = getVocab();
        break;
      case 'LOGIN':
        responseData = loginUser(payload);
        break;
      case 'SAVE_PLAYER':
        responseData = savePlayer(payload);
        break;
      case 'GET_LEADERBOARD':
        responseData = getLeaderboard();
        break;
      default:
        return createErrorResponse('Invalid action');
    }

    return createSuccessResponse(responseData);
  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

/**
 * 取得 Vocabulary 清單中設定啟用 (enabled=true) 的單字
 */
function getVocab() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VOCAB);
  if (!sheet) throw new Error(`找不到工作表: ${SHEET_VOCAB}`);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const vocabList = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = parseVocabRow(headers, row);
    
    // 只回傳啟用的詞彙 (處理 TRUE 或 'TRUE' 格式字串)
    if (item.enabled) {
      vocabList.push(item);
    }
  }

  return { vocab: vocabList };
}

function parseVocabRow(headers, row) {
  return {
    id: String(row[0] || ''),
    word: String(row[1] || ''),
    partOfSpeech: String(row[2] || ''),
    definition: String(row[3] || ''),
    exampleSentence: String(row[4] || ''),
    exampleTranslation: String(row[5] || ''),
    collocations: row[6] ? String(row[6]).split(',').map(s => s.trim()) : [],
    level: String(row[7] || ''),
    tags: row[8] ? String(row[8]).split(',').map(s => s.trim()) : [],
    imageUrl: String(row[9] || ''),
    enabled: String(row[10]).toUpperCase() === 'TRUE' || row[10] === true
  };
}

/**
 * 驗證 class_id 與 pin 並回傳玩家資料
 */
function loginUser(payload) {
  const { classId, pin } = payload;
  if (!classId || !pin) throw new Error('Missing credentials');

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PLAYERS);
  if (!sheet) throw new Error(`找不到工作表: ${SHEET_PLAYERS}`);

  const data = sheet.getDataRange().getValues();
  const headers = data[0]; // 可以用來參考或者動態對位

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowClassId = String(row[0]);
    const rowPin = String(row[1]);

    if (rowClassId === String(classId) && rowPin === String(pin)) {
      return {
        player: parsePlayerRow(row)
      };
    }
  }

  throw new Error('Invalid class_id or pin');
}

/**
 * 儲存玩家進度資料
 */
function savePlayer(payload) {
  const { player } = payload;
  if (!player || !player.classId) throw new Error('Missing player data');

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PLAYERS);
  if (!sheet) throw new Error(`找不到工作表: ${SHEET_PLAYERS}`);

  const data = sheet.getDataRange().getValues();
  const nowStr = new Date().toISOString();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowClassId = String(row[0]);
    const rowPin = String(row[1]);

    // 確保也有 pin 來作為驗證
    if (rowClassId === String(player.classId) && rowPin === String(player.pin)) {
      // 覆寫更新：這裡必須比對 PlayerData 的欄位對應
      // D(3) current_level, E(4) total_score, F(5) best_score, G(6) game_mode, H(7) srs_data, I(8) last_updated, J(9) daily_quota
      
      const rowIndex = i + 1; // getRange base 是 1-indexed
      sheet.getRange(rowIndex, 4).setValue(player.currentLevel || 1); // D
      sheet.getRange(rowIndex, 5).setValue(player.totalScore || 0); // E
      sheet.getRange(rowIndex, 6).setValue(player.bestScore || 0); // F
      sheet.getRange(rowIndex, 7).setValue(player.gameMode || 'srs'); // G
      sheet.getRange(rowIndex, 8).setValue(JSON.stringify(player.srsData || {})); // H
      sheet.getRange(rowIndex, 9).setValue(nowStr); // I
      sheet.getRange(rowIndex, 10).setValue(JSON.stringify(player.dailyQuota || {})); // J

      player.lastUpdated = nowStr;
      return { success: true, player };
    }
  }

  throw new Error('Player not found or authentication failed for saving');
}

/**
 * 取得前十名高分排行榜
 */
function getLeaderboard() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PLAYERS);
  if (!sheet) throw new Error(`找不到工作表: ${SHEET_PLAYERS}`);

  const data = sheet.getDataRange().getValues();
  let players = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const displayName = String(row[2]);
    const bestScore = Number(row[5]) || 0;

    if (displayName) {
      players.push({ displayName, bestScore });
    }
  }

  // 排序並取前十
  players.sort((a, b) => b.bestScore - a.bestScore);
  return { leaderboard: players.slice(0, 10) };
}

function parsePlayerRow(row) {
  return {
    classId: String(row[0]),
    pin: String(row[1]),
    displayName: String(row[2]),
    currentLevel: Number(row[3]) || 1,
    totalScore: Number(row[4]) || 0,
    bestScore: Number(row[5]) || 0,
    gameMode: String(row[6]) || 'srs',
    srsData: row[7] ? JSON.parse(String(row[7])) : {},
    lastUpdated: String(row[8] || new Date().toISOString()),
    dailyQuota: row[9] ? JSON.parse(String(row[9])) : {}
  };
}

/**
 * 產生成功回應
 */
function createSuccessResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: data
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * 產生錯誤回應
 */
function createErrorResponse(errorMessage) {
  const output = ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: errorMessage
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
