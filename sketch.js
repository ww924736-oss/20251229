let idleSprite;   // 待機用精靈（資料夾 2 的 all.png）
let runSprite;    // 走/跑動作（資料夾 1 的 all.png）
let jumpSprite;   // 起跳動作（資料夾 3 的 all.png）
let crouchSprite; // 蹲下動作（資料夾 4 的 all.png）
let bgImage;      // 背景圖片（背景資料夾的 1.jpg）
let npc1Sprite;   // 提問者1 的圖片
let npc3Sprite;   // 新增：提問者3 的圖片
let npc3Loaded = false;
let npc3LoadError = false;
const NPC1_W = 224; // 原始寬
const NPC1_H = 155; // 原始高
let npc1WorldX;    // 提問者1 的世界座標 X

// NPC 與題庫狀態
let npcs = [];
let questionBank = {};
let activeNPC = null;
let activeQuestion = null;
let dialogVisible = false;
let hintVisible = false;
const NPC_PROXIMITY = 100;

let npc1Touched = false;

// 幀切換延遲
const IDLE_FRAME_DELAY = 12;
const RUN_FRAME_DELAY = 20;

// 精靈幀參數
const IDLE_IMAGE_TOTAL_W = 111;
const IDLE_IMAGE_TOTAL_H = 50;
const IDLE_TOTAL_FRAMES = 4;
const IDLE_FRAME_W = IDLE_IMAGE_TOTAL_W / IDLE_TOTAL_FRAMES;
const IDLE_FRAME_H = IDLE_IMAGE_TOTAL_H;

const RUN_IMAGE_TOTAL_W = 235;
const RUN_IMAGE_TOTAL_H = 51;
const RUN_TOTAL_FRAMES = 6;
const RUN_FRAME_W = RUN_IMAGE_TOTAL_W / RUN_TOTAL_FRAMES;
const RUN_FRAME_H = RUN_IMAGE_TOTAL_H;

const JUMP_IMAGE_TOTAL_W = 235;
const JUMP_IMAGE_TOTAL_H = 53;
const JUMP_TOTAL_FRAMES = 6;
const JUMP_FRAME_W = JUMP_IMAGE_TOTAL_W / JUMP_TOTAL_FRAMES;
const JUMP_FRAME_H = JUMP_IMAGE_TOTAL_H;

const CROUCH_IMAGE_TOTAL_W = 183;
const CROUCH_IMAGE_TOTAL_H = 49;
const CROUCH_TOTAL_FRAMES = 4;
const CROUCH_FRAME_W = CROUCH_IMAGE_TOTAL_W / CROUCH_TOTAL_FRAMES;
const CROUCH_FRAME_H = CROUCH_IMAGE_TOTAL_H;

// 跳躍參數
let isJumping = false;
let vy = 0;
const GRAVITY = 0.35;
const JUMP_V = -12;
const LAND_HOLD_FRAMES = 6;
let landHoldCounter = 0;

// 位置與背景偏移
let playerX;
let playerY;
let groundY;
let bgOffset = 0;

// 題庫 UI 狀態
let activeQuizNPC = null;        // 顯示題目的 NPC id
let currentOptionRects = [];     // 可點選選項區域
let showTryGiveUp = false;
let tryRect = null;
let giveUpRect = null;

// 新增：答題視覺化（選項被選中時標示）狀態
let showCorrectVisual = false;
let correctVisualStart = 0;
let correctVisualEnd = 0; // millis() 到期時間
let correctNpc = null;
let correctSelectedIndex = -1;
const CORRECT_VISUAL_DURATION = 2000; // ms
const CORRECT_SCALE = 1.12; // 放大倍率
const CORRECT_SHAKE_AMPLITUDE = 6;    // 搖晃幅度（像素）
const CORRECT_SHAKE_FREQ = 4;         // 搖晃頻率（Hz）

// 新增：答題成功顯示狀態（持續 3 秒）與儲存最後題目框位置
let showCorrectMessage = false;
let correctMessageEnd = 0; // millis() 到期時間
let lastBoxX = 0, lastBoxYbottom = 0, lastBoxW = 0, lastBoxH = 0;

function tryLoadNpc3(paths, i = 0) {
  if (i >= paths.length) {
    console.error('npc3: all attempts failed');
    npc3LoadError = true;
    return;
  }
  const p = paths[i];
  console.log('tryLoadNpc3 -> trying:', p);
  // 先用 fetch 檢查並取得 blob（可看 404 / CORS 等錯誤）
  fetch(p).then(res => {
    if (!res.ok) throw new Error('fetch status ' + res.status);
    return res.blob();
  }).then(blob => {
    const blobUrl = URL.createObjectURL(blob);
    loadImage(blobUrl,
      img => {
        npc3Sprite = img;
        npc3Loaded = true;
        console.log('loaded: npc3Sprite via fetch:', p);
        URL.revokeObjectURL(blobUrl);
      },
      err => {
        console.error('npc3 load from blob failed:', p, err);
        URL.revokeObjectURL(blobUrl);
        tryLoadNpc3(paths, i + 1);
      }
    );
  }).catch(err => {
    console.warn('tryLoadNpc3 fetch failed for', p, err);
    tryLoadNpc3(paths, i + 1);
  });
}

function preload() {
  idleSprite = loadImage('2/all.png',
    img => console.log('loaded: idleSprite'),
    e => console.error('idleSprite load error', e)
  );
  runSprite = loadImage('1/all.png',
    img => console.log('loaded: runSprite'),
    e => console.error('runSprite load error', e)
  );
  jumpSprite = loadImage('3/all.png',
    img => console.log('loaded: jumpSprite'),
    e => console.error('jumpSprite load error', e)
  );
  crouchSprite = loadImage('4/all.png',
    img => console.log('loaded: crouchSprite'),
    e => console.error('crouchSprite load error', e)
  );
  bgImage = loadImage('背景/1.jpg',
    img => console.log('loaded: bgImage 背景/1.jpg'),
    e => console.error('bgImage load error', e)
  );
  npc1Sprite = loadImage('提問者1/5.png',
    img => console.log('loaded: npc1Sprite 提問者1/5.png'),
    e => console.error('npc1Sprite load error', e)
  );

  // 嘗試從伺服器根路徑載入（Live Server 的 root）
  loadImage('/提問者3/000333.png',  
    img => { npc3Sprite = img; npc3Loaded = true; console.log('loaded: npc3Sprite /提問者3/99.png'); },
    err1 => {
      // 再試相對路徑
      loadImage('提問者3/99.png',
        img2 => { npc3Sprite = img2; npc3Loaded = true; console.log('loaded: npc3Sprite 提問者3/99.png'); },
        err2 => {
          console.warn('載入 提問者3/99.png 也失敗，會使用 fallback 或方塊顯示', err2);
          // 最後啟動你的 fetch fallback
          tryLoadNpc3([
            '提問者3/4.png',
            '提問者3/5.png',
            '提問者3/all.png',
            '/Users/Bonnie/Downloads/20251118/提問者3/4.png',
            '/Users/Bonnie/Downloads/20251118/提問者3/5.png',
            '/Users/Bonnie/Downloads/20251118/提問者3/all.png'
          ]);
        }
      );
    }
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noSmooth();
  playerX = width / 2;
  groundY = height * 0.6;
  playerY = groundY;
  npc1WorldX = width * 0.15;

  // 初始化 NPC 位置與狀態
  npcs = [
    { id: 'q1', name: '提問者1', x: width * 0.15, y: groundY, done: false },
    { id: 'q2', name: '提問者2', x: width * 0.5, y: groundY, done: false },
    { id: 'q3', name: '提問者3', x: width * 0.85, y: groundY, done: false }
  ];

  // 依你的題目直接建立 questionBank（每個 NPC 負責兩題）
  questionBank = {
    q1: [
      { q: '紅綠燈的「停」是什麼顏色？', options: ['紅色','綠色','黃色'], answer: 0, hint: '停是紅色' },
      { q: '一星期總共有幾天？', options: ['5 天','7 天','10 天'], answer: 1, hint: '七天' }
    ],
    q2: [
      { q: '冰塊放進熱水裡會變成什麼？', options: ['水','石頭','氣球'], answer: 0, hint: '冰會融化成水' },
      { q: '太陽通常是從哪個方向升起？', options: ['西方','南方','東方'], answer: 2, hint: '東方' }
    ],
    q3: [
      { q: '廚房裡用來切菜的工具是什麼？', options: ['筷子','菜刀','湯匙'], answer: 1, hint: '切菜用刀' },
      { q: '口渴的時候喝什麼最健康？', options: ['白開水','膠水','墨水'], answer: 0, hint: '白開水' }
    ]
  };
}

function draw() {
  background(0);
  const moveSpeed = 4;
  const movingRight = keyIsDown(RIGHT_ARROW);
  const movingLeft = keyIsDown(LEFT_ARROW);
  const movingDown = keyIsDown(DOWN_ARROW);

  if (movingRight) bgOffset += moveSpeed;
  else if (movingLeft) bgOffset -= moveSpeed;

  // 背景三張平鋪
  if (bgImage) {
    let bx = (-bgOffset) % width;
    if (bx > 0) bx -= width;
    image(bgImage, bx - width, 0, width, height);
    image(bgImage, bx, 0, width, height);
    image(bgImage, bx + width, 0, width, height);
  } else {
    background('#333');
  }

  // 計算玩家 sprite 狀態
  let img = idleSprite;
  let fw = IDLE_FRAME_W;
  let fh = IDLE_FRAME_H;
  let tf = IDLE_TOTAL_FRAMES;
  let flipped = false;

  if (keyIsDown(UP_ARROW) && !isJumping) {
    isJumping = true;
    vy = JUMP_V;
  }

  if (movingDown && crouchSprite) {
    img = crouchSprite; fw = CROUCH_FRAME_W; fh = CROUCH_FRAME_H; tf = CROUCH_TOTAL_FRAMES;
    if (movingLeft) flipped = true;
  } else if (movingRight && runSprite) {
    img = runSprite; fw = RUN_FRAME_W; fh = RUN_FRAME_H; tf = RUN_TOTAL_FRAMES;
  } else if (movingLeft && runSprite) {
    img = runSprite; fw = RUN_FRAME_W; fh = RUN_FRAME_H; tf = RUN_TOTAL_FRAMES; flipped = true;
  }

  if (isJumping && jumpSprite) {
    img = jumpSprite; fw = JUMP_FRAME_W; fh = JUMP_FRAME_H; tf = JUMP_TOTAL_FRAMES;
    vy += GRAVITY;
    playerY += vy;
    if (playerY >= groundY) { playerY = groundY; vy = 0; isJumping = false; landHoldCounter = LAND_HOLD_FRAMES; }
  }

  let frameIdx = 0;
  let frameSx = 0;
  let frameSy = 0;
  if (landHoldCounter > 0 && jumpSprite) {
    frameIdx = JUMP_TOTAL_FRAMES - 1;
    frameSx = Math.round(frameIdx * fw);
    landHoldCounter--;
  } else {
    const frameDelay = isJumping ? RUN_FRAME_DELAY : ((movingLeft || movingRight) ? RUN_FRAME_DELAY : IDLE_FRAME_DELAY);
    frameIdx = floor(frameCount / frameDelay) % tf;
    frameSx = Math.round(frameIdx * fw);
  }

  const SCALE = 4;
  const drawW = fw * SCALE;
  const drawH = fh * SCALE;

  // 繪製 NPC 與偵測碰撞，並在該 NPC 右上方顯示題目小框（若有題目）
  const idleDrawW = IDLE_FRAME_W * SCALE;
  const idleDrawH = IDLE_FRAME_H * SCALE;
  let touchingAny = null;
  let touchingAnyCenterY = 0;
  let touchingAnySx = 0;

  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];
    const sx = npc.x - bgOffset;

    // 計算每個 NPC 的 centerY（q1 可能有 bobbing）
    let centerY = groundY - idleDrawH / 2;
    if (npc.id === 'q1') {
      const bobAmp = 6;
      const bobSpeed = 0.12;
      const npcIdle = !(dialogVisible && activeNPC === 'q1');
      const bobOffset = (npcIdle && !npc1Touched) ? Math.sin(frameCount * bobSpeed) * bobAmp : 0;
      centerY += bobOffset;
      if (npc1Sprite) {
        imageMode(CENTER);
        image(npc1Sprite, sx, centerY, idleDrawW, idleDrawH);
        imageMode(CORNER);
      }
    } else if (npc.id === 'q3') {
      // 提問者3：若已成功載入 npc3Sprite，使用圖片並維持長寬比縮放到與方塊相同可視區域；否則顯示方塊（fallback）
      if (npc3Sprite) {
        imageMode(CENTER);
        // 保持圖片長寬比，最大填滿 idleDrawW x idleDrawH 的區域
        const imgW = npc3Sprite.width || idleDrawW;
        const imgH = npc3Sprite.height || idleDrawH;
        const scaleFactor = Math.min(idleDrawW / imgW, idleDrawH / imgH);
        const drawW3 = imgW * scaleFactor;
        const drawH3 = imgH * scaleFactor;
        image(npc3Sprite, sx, centerY, drawW3, drawH3);
        imageMode(CORNER);
      } else {
        // fallback：方塊表示（並在 console 提醒）
        push();
        fill(150, 180, 200);
        rectMode(CENTER);
        rect(sx, centerY, idleDrawW, idleDrawH, 6);
        fill(255);
        textAlign(CENTER, BOTTOM);
        textSize(12);
        text(npc.name, sx, centerY - idleDrawH / 2 - 8);
        pop();
        if (!npc3Loaded && !npc3LoadError) {
          console.warn('npc3Sprite 尚未載入：請確認檔案 /提問者3/99.png 已放在專案根並由 Live Server 提供（大小寫需相符）');
        }
      }
    } else {
      // 其他 NPC 以方塊表示
      push();
      fill(180, 120, 140);
      rectMode(CENTER);
      rect(sx, centerY, idleDrawW, idleDrawH, 6);
      fill(255);
      textAlign(CENTER, BOTTOM);
      textSize(12);
      text(npc.name, sx, centerY - idleDrawH / 2 - 8);
      pop();
    }

    // 碰撞檢查（矩形）
    const playerScreenX = width / 2;
    const playerLeft = playerScreenX - drawW / 2;
    const playerRight = playerScreenX + drawW / 2;
    const playerTop = playerY - drawH / 2;
    const playerBottom = playerY + drawH / 2;

    const npcLeft = sx - idleDrawW / 2;
    const npcRight = sx + idleDrawW / 2;
    const npcTop = centerY - idleDrawH / 2;
    const npcBottom = centerY + idleDrawH / 2;

    const touching = !(playerRight < npcLeft || playerLeft > npcRight || playerBottom < npcTop || playerTop > npcBottom);

    if (touching && !npc.done) {
      if (!touchingAny) {
        touchingAny = npc;
        touchingAnyCenterY = centerY;
        touchingAnySx = sx;
      }
    }
  }

  // 清除先前的選項若沒碰到 NPC
  currentOptionRects = [];
  activeQuizNPC = null;
  if (touchingAny) {
    const nid = touchingAny.id;
    const poolForNpc = questionBank[nid] || [];
    if (poolForNpc.length > 0) {
      activeQuizNPC = nid;
      const qobj = poolForNpc[0];

      // 在該 NPC 右上方畫小框（避免超出畫面）
      const boxW = min(360, width * 0.45);
      const boxH = 140;
      let boxX = touchingAnySx + idleDrawW / 2 + 12;
      let boxYbottom = touchingAnyCenterY - idleDrawH / 2 - 8 + boxH; // boxYbottom 表示框的底部 y (方便定位)
      // 若超出右邊，改放到左側
      if (boxX + boxW > width - 8) {
        boxX = touchingAnySx - idleDrawW / 2 - 12 - boxW;
      }
      // 若到上方超出，改放在 NPC 右下
      let yTop = boxYbottom - boxH;
      if (yTop < 8) {
        yTop = touchingAnyCenterY + idleDrawH / 2 + 8;
        boxYbottom = yTop + boxH;
      }

      // 繪製小題目框
      push();
      rectMode(CORNER);
      fill(0, 180);
      noStroke();
      rect(boxX, boxYbottom - boxH, boxW, boxH, 8);
      stroke(255, 200);
      noFill();
      rect(boxX, boxYbottom - boxH, boxW, boxH, 8);
      noStroke();
      fill(255);
      textAlign(LEFT, TOP);
      textSize(14);
      text(qobj.q, boxX + 10, boxYbottom - boxH + 8, boxW - 20);
      pop();

      // 畫選項（垂直排列）
      const opts = qobj.options;
      const optCount = opts.length;
      const optH = Math.min(40, (boxH - 44) / optCount);
      const optStartY = boxYbottom - boxH + 36;
      for (let i = 0; i < optCount; i++) {
        const ox = boxX + 10;
        const oy = optStartY + i * (optH + 6);
        const ow = boxW - 20;

        // 若正在顯示答對視覺化（且是對應 NPC），對正確被選的選項做放大與變色
        if (showCorrectVisual && correctNpc === nid && i === correctSelectedIndex) {
          const scale = CORRECT_SCALE;
          const cw = ow * scale;
          const ch = optH * scale;
          const cx = ox + ow / 2;
          const cy = oy + optH / 2;
          const drawX = cx - cw / 2;
          const drawY = cy - ch / 2;

          // 低透明綠底
          push();
          rectMode(CORNER);
          fill(34, 180, 60, 120);
          rect(drawX, drawY, cw, ch, 8);
          // 畫邊框
          noFill();
          stroke(255, 200);
          rect(drawX, drawY, cw, ch, 8);
          noStroke();
          // 文字放大
          fill(255);
          textSize(16 * scale);
          textAlign(LEFT, CENTER);
          text(opts[i], drawX + 12, drawY + ch / 2, cw - 24);
          // 打勾符號（右側）
          textAlign(CENTER, CENTER);
          textSize(20 * scale);
          fill(255);
          text('✓', drawX + cw - 20, drawY + ch / 2);
          pop();
          // 儲存可點擊區域（仍使用原始區域判定）
          currentOptionRects.push({ x: ox, y: oy, w: ow, h: optH, index: i, npcId: nid });
        } else {
          // 普通選項
          push();
          rectMode(CORNER);
          fill(80);
          rect(ox, oy, ow, optH, 6);
          fill(255);
          textSize(14);
          textAlign(LEFT, CENTER);
          text(opts[i], ox + 8, oy + optH / 2, ow - 16);
          pop();
          currentOptionRects.push({ x: ox, y: oy, w: ow, h: optH, index: i, npcId: nid });
        }
      }
      showTryGiveUp = false; // 每次碰到題目先隱藏錯誤選單
    } else {
      // 該 NPC 任務完成
      activeQuizNPC = null;
      currentOptionRects = [];
    }
  }

  // 繪製玩家於畫面底部（固定）
  const staticPlayerY = groundY - drawH / 2;
  if (flipped) {
    push();
    translate(width / 2, staticPlayerY);
    scale(-1, 1);
    image(img, -drawW / 2, -drawH / 2, drawW, drawH, frameSx, frameSy, fw, fh);
    pop();
  } else {
    image(img, (width - drawW) / 2, staticPlayerY, drawW, drawH, frameSx, frameSy, fw, fh);
  }

  // 若 showTryGiveUp，畫兩個按鈕（再試一次 / 放棄）
  if (showTryGiveUp) {
    const btnW = 160, btnH = 48, gap = 24;
    const totalW = btnW * 2 + gap;
    const baseX = (width - totalW) / 2;
    const baseY = height - 120;
    tryRect = { x: baseX, y: baseY, w: btnW, h: btnH };
    giveUpRect = { x: baseX + btnW + gap, y: baseY, w: btnW, h: btnH };
    push();
    rectMode(CORNER);
    fill(40);
    rect(tryRect.x, tryRect.y, tryRect.w, tryRect.h, 6);
    rect(giveUpRect.x, giveUpRect.y, giveUpRect.w, giveUpRect.h, 6);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('再試一次', tryRect.x + tryRect.w / 2, tryRect.y + tryRect.h / 2);
    text('放棄答題', giveUpRect.x + giveUpRect.w / 2, giveUpRect.y + giveUpRect.h / 2);
    pop();
  }
  
  // 若正在顯示答對視覺化，檢查期限，期限到後真正移除題目並清除狀態
  if (showCorrectVisual && millis() >= correctVisualEnd) {
    if (correctNpc) {
      const pool = questionBank[correctNpc];
      if (pool && pool.length > 0) {
        pool.shift(); // 移除已答對的題目
        if (pool.length === 0) {
          const npcobj = npcs.find(n => n.id === correctNpc);
          if (npcobj) npcobj.done = true;
        }
      }
    }
    // 清除視覺化狀態與選項
    showCorrectVisual = false;
    correctNpc = null;
    correctSelectedIndex = -1;
    activeQuizNPC = null;
    currentOptionRects = [];
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  groundY = height * 0.6;
  if (!isJumping) playerY = groundY;
  playerX = width / 2;
}

// 點擊處理（替換整個 mousePressed 函式）
function mousePressed() {
  // 若沒題目亦沒錯誤按鈕，忽略
  if (!activeQuizNPC && currentOptionRects.length === 0 && !showTryGiveUp) return;

  // 處理「再試一次 / 放棄」按鈕
  if (showTryGiveUp) {
    if (tryRect && mouseX >= tryRect.x && mouseX <= tryRect.x + tryRect.w && mouseY >= tryRect.y && mouseY <= tryRect.y + tryRect.h) {
      showTryGiveUp = false;
      return;
    }
    if (giveUpRect && mouseX >= giveUpRect.x && mouseX <= giveUpRect.x + giveUpRect.w && mouseY >= giveUpRect.y && mouseY <= giveUpRect.y + giveUpRect.h) {
      const pool = questionBank[activeQuizNPC];
      if (pool && pool.length > 0) pool.shift();
      showTryGiveUp = false;
      if (!pool || pool.length === 0) {
        const npc = npcs.find(n => n.id === activeQuizNPC);
        if (npc) npc.done = true;
        activeQuizNPC = null;
      }
      return;
    }
  }

  // 檢查是否點到選項
  for (let rect of currentOptionRects) {
    if (mouseX >= rect.x && mouseX <= rect.x + rect.w && mouseY >= rect.y && mouseY <= rect.y + rect.h) {
      // 若已在顯示正確視覺化，忽略點擊
      if (showCorrectVisual) return;

      const idx = rect.index;
      const nid = rect.npcId;
      const qobj = questionBank[nid] && questionBank[nid][0];
      if (!qobj) return;

      if (idx === qobj.answer) {
        // 答對：啟動視覺化（放大 + 搖晃 + 打勾），到期時由 draw() 真正移除題目
        showCorrectVisual = true;
        correctVisualStart = millis();
        correctVisualEnd = correctVisualStart + CORRECT_VISUAL_DURATION;
        correctNpc = nid;
        correctSelectedIndex = idx;
        // 保留 currentOptionRects 直到視覺化結束
      } else {
        // 答錯：顯示再試/放棄
        showTryGiveUp = true;
      }
      return;
    }
  }
}
