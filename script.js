// @ts-check

/**
 * BPM測定アプリのメインスクリプト
 */

// loadイベントを待つ
await new Promise(resolve => {
    if (document.readyState === 'loading') {
        window.addEventListener('load', resolve, { once: true });
    } else {
        resolve(undefined);
    }
});

console.log('アプリケーションが読み込まれました');

/**
 * スペースキーが押された瞬間のperformance.now()の一覧
 * @type {number[]}
 */
const spaceKeyTimestamps = [];

/**
 * 現在のタイムスタンプを記録する
 * @returns {void}
 */
function recordTimestamp() {
    const timestamp = performance.now();
    spaceKeyTimestamps.push(timestamp);
    console.log(`スペースキー押下: ${timestamp.toFixed(3)}ms (累計: ${spaceKeyTimestamps.length}回)`);
}

/**
 * 隣接要素との差の配列を作る
 * @param {number[]} arr - 数値の配列
 * @returns {number[]} 隣接要素の差分の配列
 */
function getDifferences(arr) {
    const differences = [];
    for (let i = 1; i < arr.length; i++) {
        differences.push(arr[i] - arr[i - 1]);
    }
    return differences;
}

/**
 * ミリ秒からBPMに変換する
 * @param {number} ms - ミリ秒（ビート間隔）
 * @returns {number} BPM値
 */
function msToBpm(ms) {
    return 60000 / ms;
}

/**
 * 配列を昇順に並び替えて、前半25%と後半25%の要素を削除した配列を返す
 * @param {number[]} arr - 数値の配列
 * @returns {number[]} 中央50%の要素からなる配列
 */
function getTrimmedMiddle(arr) {
    if (arr.length <= 2) {
        return [];
    }

    if (arr.length === 3) {
        const sorted = [...arr].sort((a, b) => a - b);
        return [sorted[1]];
    }

    const sorted = [...arr].sort((a, b) => a - b);
    const quarterSize = Math.floor(arr.length * 0.25);
    const startIndex = quarterSize;
    const endIndex = arr.length - quarterSize;

    return sorted.slice(startIndex, endIndex);
}

/**
 * BPMリストからBPMを推測する（平均値を計算）
 * @param {number[]} bpms - BPMの配列
 * @returns {number | null} 推測されたBPM値、空配列の場合はnull
 */
function guessBPM(bpms) {
    if (bpms.length === 0) {
        return null;
    }

    const sum = bpms.reduce((acc, bpm) => acc + bpm, 0);
    return sum / bpms.length;
}

/**
 * 記録されたタイムスタンプからBPMを計算して表示を更新する
 * @returns {void}
 */
function calcAndUpdate() {
    // DOM要素を取得
    const estimatedBpmElement = document.getElementById('estimated-bpm');
    const bpmDoubleElement = document.getElementById('bpm-double');
    const bpmHalfElement = document.getElementById('bpm-half');

    // 要素が存在しない場合は処理を中断
    if (!estimatedBpmElement || !bpmDoubleElement || !bpmHalfElement) {
        console.error('BPM表示要素が見つかりません');
        return;
    }

    // タイムスタンプが2個未満の場合は推測不可
    if (spaceKeyTimestamps.length < 2) {
        estimatedBpmElement.textContent = '--';
        bpmDoubleElement.textContent = '--';
        bpmHalfElement.textContent = '--';
        return;
    }

    // BPM計算の流れ: timestamps → differences → trimmed → bpms → guess
    const differences = getDifferences(spaceKeyTimestamps);
    const trimmedDifferences = getTrimmedMiddle(differences);

    // 外れ値除去後のデータが少ない場合は全データを使用
    const dataToUse = trimmedDifferences.length > 0 ? trimmedDifferences : differences;

    // 各差分をBPMに変換
    const bpms = dataToUse.map(ms => msToBpm(ms));

    // 推測BPMを計算
    const estimatedBpm = guessBPM(bpms);

    if (estimatedBpm === null) {
        estimatedBpmElement.textContent = '--';
        bpmDoubleElement.textContent = '--';
        bpmHalfElement.textContent = '--';
        return;
    }

    // 小数点以下3桁で表示（四捨五入）
    const formatBpm = (bpm) => bpm.toFixed(3);

    // 各BPM値を計算して表示
    estimatedBpmElement.textContent = formatBpm(estimatedBpm);
    bpmDoubleElement.textContent = formatBpm(estimatedBpm * 2);
    bpmHalfElement.textContent = formatBpm(estimatedBpm * 0.5);

    console.log(`BPM更新: ${formatBpm(estimatedBpm)} (データ数: ${dataToUse.length})`);
}

/**
 * 記録されたタイムスタンプをリセットし、表示を初期化する
 * @returns {void}
 */
function resetTimestamps() {
    // タイムスタンプ配列をクリア
    spaceKeyTimestamps.length = 0;

    // DOM要素を取得
    const estimatedBpmElement = document.getElementById('estimated-bpm');
    const bpmDoubleElement = document.getElementById('bpm-double');
    const bpmHalfElement = document.getElementById('bpm-half');

    // 表示を初期状態にリセット
    if (estimatedBpmElement) estimatedBpmElement.textContent = '--';
    if (bpmDoubleElement) bpmDoubleElement.textContent = '--';
    if (bpmHalfElement) bpmHalfElement.textContent = '--';

    console.log('タイムスタンプをリセットしました');
}

/**
 * 数値配列の最大値と最小値の差を求める
 * @param {number[]} arr - 数値の配列
 * @returns {number} 最大値と最小値の差（配列が空の場合は0）
 */
function getRange(arr) {
    if (arr.length === 0) {
        return 0;
    }

    const min = Math.min(...arr);
    const max = Math.max(...arr);

    return max - min;
}

/**
 * キャンバスにグラフを描画する
 * @returns {void}
 */
function drawGraph() {
    /** @type {HTMLCanvasElement | null} */
    const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('data-canvas'));
    if (!canvas) {
        console.error('キャンバス要素が見つかりません');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('2Dコンテキストを取得できません');
        return;
    }

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // グラフ描画処理を実行
    try {
        const imageBitmap = getGraph();
        if (imageBitmap) {
            // ImageBitmapをキャンバスに描画
            ctx.drawImage(imageBitmap, 0, 0);
        }
    } catch (error) {
        console.error('グラフ描画中にエラーが発生しました:', error);

        // エラーメッセージを表示
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '16px Ubuntu, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('描画エラー', canvas.width / 2, canvas.height / 2);
    }
}

/**
 * キャンバスに描くべき画像を生成する関数
 * @returns {ImageBitmap}
 */
function getGraph() {
    /**
     * ヒストグラムの階級数
     * @type {number}
     */
    const HISTOGRAM_BINS = 80;

    // spaceKeyTimestampsの隣接要素の差を取得
    const differences = getDifferences(spaceKeyTimestamps);

    // 差分をBPMに変換
    const bpms = differences.map(ms => msToBpm(ms));

    // ヒストグラムの範囲を計算（最小値から最大値）
    let binStart, binWidth;
    if (bpms.length === 0) {
        // データがない場合はデフォルト範囲
        binStart = 0;
        binWidth = 1;
    } else {
        // BPMの最小値と最大値を取得
        const minBpm = Math.min(...bpms);
        const maxBpm = Math.max(...bpms);

        // 少し余裕を持たせるため、範囲を5%拡張
        const range = maxBpm - minBpm;
        const padding = range * 0.05;

        binStart = minBpm - padding;
        const binEnd = maxBpm + padding;

        // 階級幅を計算
        binWidth = (binEnd - binStart) / HISTOGRAM_BINS;
    }

    // 階級ごとの度数を表す配列
    const histogram = new Array(HISTOGRAM_BINS).fill(0);

    // 各BPM値をどの階級に属するかを計算
    bpms.forEach(bpm => {
        // どの階級に属するかを計算
        const binIndex = Math.floor((bpm - binStart) / binWidth);

        // 範囲内の場合のみカウント
        if (binIndex >= 0 && binIndex < HISTOGRAM_BINS) {
            histogram[binIndex]++;
        }
    });

    // OffscreenCanvasを作成
    const offscreenCanvas = new OffscreenCanvas(500, 200);
    const ctx = offscreenCanvas.getContext('2d');

    if (!ctx) {
        // @ts-ignore
        return null;
    }

    // 背景をクリア（透明）
    ctx.clearRect(0, 0, 500, 200);

    // ヒストグラムの最大値を求める
    const maxFrequency = Math.max(...histogram);

    // 各階級の幅（500px / 40階級）
    const barWidth = 500 / HISTOGRAM_BINS;

    // ヒストグラムを描画
    ctx.fillStyle = 'rgba(74, 144, 226, 0.8)';
    ctx.strokeStyle = 'rgba(74, 144, 226, 1)';
    ctx.lineWidth = 1;

    for (let i = 0; i < HISTOGRAM_BINS; i++) {
        const frequency = histogram[i];

        if (frequency > 0) {
            // 長方形の高さを計算（最大180px、下20px開ける）
            const barHeight = maxFrequency > 0 ? (180 * (frequency / maxFrequency)) : 0;

            // 長方形の位置
            const x = i * barWidth;
            const y = 200 - 20 - barHeight; // 下20px開けて上から描画

            // 長方形を描画
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.strokeRect(x, y, barWidth, barHeight);
        }
    }    // 推測BPMの位置に線を描画
    if (bpms.length > 0) {
        // HTML要素から推測BPM値を取得
        const estimatedBpmElement = document.getElementById('estimated-bpm');
        const guessedBpm = estimatedBpmElement ? parseFloat(estimatedBpmElement.textContent || '0') : null;

        // デバッグ用のログ出力
        console.log('guessedBpm:', guessedBpm);

        // 推測BPMがnullでなく、ヒストグラムの範囲内にある場合のみ描画
        if (guessedBpm !== null && !isNaN(guessedBpm) && guessedBpm >= binStart && guessedBpm <= (binStart + binWidth * HISTOGRAM_BINS)) {
            // 推測BPMのx座標を計算
            const lineX = ((guessedBpm - binStart) / binWidth) * barWidth;

            // 線を描画（赤色、太さ2px）
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lineX, 20); // 上端（y=20）から
            ctx.lineTo(lineX, 200 - 20); // 下端（y=180）まで
            ctx.stroke();

            // 線の下に推測BPM値をテキストで表示
            ctx.fillStyle = 'rgba(220, 20, 60, 1)'; // クリムゾン
            ctx.font = '10px Ubuntu, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`推測 : ${guessedBpm.toFixed(3)}`, lineX, 200);
        }

        // BPMの中央値の位置に線を描画
        const sortedBpms = [...bpms].sort((a, b) => a - b);
        const medianBpm = sortedBpms.length % 2 === 0
            ? (sortedBpms[sortedBpms.length / 2 - 1] + sortedBpms[sortedBpms.length / 2]) / 2
            : sortedBpms[Math.floor(sortedBpms.length / 2)];

        // 中央値がヒストグラムの範囲内にある場合のみ描画
        if (medianBpm >= binStart && medianBpm <= (binStart + binWidth * HISTOGRAM_BINS)) {
            // 中央値のx座標を計算
            const medianLineX = ((medianBpm - binStart) / binWidth) * barWidth;

            // 線を描画（青色、太さ2px）
            ctx.strokeStyle = 'rgba(100, 149, 237, 0.9)'; // コーンフラワーブルー
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(medianLineX, 20); // 上端（y=20）から
            ctx.lineTo(medianLineX, 200 - 20); // 下端（y=180）まで
            ctx.stroke();

            // 線の下に中央値をテキストで表示
            ctx.fillStyle = 'rgba(34, 139, 34, 1)'; // フォレストグリーン
            ctx.font = '10px Ubuntu, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`中央 : ${medianBpm.toFixed(3)}`, medianLineX, 190); // 推測BPMより少し上に
        }
    }

    // ImageBitmapを作成して返す
    // @ts-ignore
    return offscreenCanvas.transferToImageBitmap();
}

// キーボードイベントリスナーを登録
document.addEventListener('keydown', (event) => {
    // スペースキーが押された場合
    if (event.code === 'Space') {
        // デフォルトの動作（ページスクロール等）を防止
        event.preventDefault();

        // タイムスタンプを記録
        recordTimestamp();

        // BPM計算・表示更新
        calcAndUpdate();

        // ヒストグラムを描画
        drawGraph();
    }

    // Xキーが押された場合（リセット）
    if (event.code === 'KeyX') {
        // デフォルトの動作を防止
        event.preventDefault();

        // タイムスタンプをリセット
        resetTimestamps();
    }
});

// instructions要素のクリック/タップイベントリスナーを登録
const instructionsElement = document.getElementById('instructions');
if (instructionsElement) {
    instructionsElement.addEventListener('click', () => {
        // スペースキー押下と同じ処理を実行
        recordTimestamp();
        calcAndUpdate();
        drawGraph();
    });

    // タッチデバイス対応
    instructionsElement.addEventListener('touchend', (event) => {
        // デフォルトのタッチ動作を防止（ダブルタップズームなど）
        event.preventDefault();

        // スペースキー押下と同じ処理を実行
        recordTimestamp();
        calcAndUpdate();
        drawGraph();
    });
}

// モジュールとして認識させるためのexport
export { spaceKeyTimestamps };
