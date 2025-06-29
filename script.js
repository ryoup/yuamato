document.getElementById("uploadForm").addEventListener("submit", function(e) {
    e.preventDefault(); // ページリロードを防止

    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) {
        document.getElementById("result").innerHTML = `<p style="color: red;">画像を選択してください。</p>`;
        return;
    }

    // データリスト（変換用）の取得
    fetch("https://ryoup.github.io/siyuuuuuuu/data.csv?v=" + new Date().getTime())
        .then(response => response.text())
        .then(csvText => {
            const conversionTable = parseCSV(csvText);
            processImage(fileInput.files[0], conversionTable);
        })
        .catch(error => {
            document.getElementById("result").innerHTML = `<p style="color: red;">データリストの読み込みに失敗しました。</p>`;
        });
});

// CSVをパースしてオブジェクトに変換
function parseCSV(csvText) {
    const rows = csvText.trim().split("\n");
    let conversionTable = {};
    rows.forEach(row => {
        const [originalY, convertedValue] = row.split(",").map(Number);
        conversionTable[originalY] = convertedValue;
    });
    return conversionTable;
}

// 画像解析処理
function processImage(file, conversionTable) {
    const reader = new FileReader();

    reader.onload = function() {
        const img = new Image();
        img.onload = function() {
            // 画像サイズチェック
            if (img.width !== 1170 || img.height !== 2532) {
                document.getElementById("result").innerHTML = `<p style="color: red;">画像サイズが合っていません。</p>`;
                return;
            }

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);

            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;

            const xTargets = [235, 469, 704, 939]; // 検出するX座標
            let minYForX = {};
            let convertedValues = {};

            xTargets.forEach(x => {
                minYForX[x] = null;
                convertedValues[x] = "該当なし";
            });

            // 各X座標の最小Yを探索
            for (let y = 1400; y < img.height; y++) {
                for (let x of xTargets) {
                    if (x >= img.width) continue;

                    const index = (y * img.width + x) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];

                    if (r >= 220 && g <= 100 && b <= 100) {
                        if (minYForX[x] === null) {
                            let validY = y;
                            let isValid = true;

                            for (let checkY = y; checkY <= y + 20 && checkY < img.height; checkY++) {
                                const checkIndex = (checkY * img.width + x) * 4;
                                const checkG = data[checkIndex + 1];
                                const checkB = data[checkIndex + 2];

                                if (checkG > 100 || checkB > 100) {
                                    isValid = false;
                                    break;
                                }
                            }

                            if (isValid) {
                                minYForX[x] = y;
                            }
                        }
                    }
                }
            }

            // データリストで変換（該当なしの場合の処理を追加）
            xTargets.forEach(x => {
                let y = minYForX[x];
                if (y !== null) {
                    convertedValues[x] = conversionTable[y] || "該当なし";
                }

                // 該当なしなら Y の補正を試みる（ループはしない）
                if (convertedValues[x] === "該当なし" && y !== null) {
                    const indexMinus1 = ((y - 1) * img.width + x) * 4;
                    const rMinus1 = data[indexMinus1];
                    const gMinus1 = data[indexMinus1 + 1];
                    const bMinus1 = data[indexMinus1 + 2];

                    if (rMinus1 >= 220 && gMinus1 <= 115 && bMinus1 <= 115) {
                        y = y - 1; // Y を -1 にする
                    } else {
                        y = y + 1; // そうでなければ Y を +1 にする
                    }

                    convertedValues[x] = conversionTable[y] || "該当なし";
                }
            });

            // 出力は "1P: 数値", "2P: 数値", "3P: 数値", "4P: 数値"
            let resultsHTML = `<h2>解析結果</h2>`;
            resultsHTML += `<p>1P : ${convertedValues[235]}</p>`;
            resultsHTML += `<p>2P : ${convertedValues[469]}</p>`;
            resultsHTML += `<p>3P : ${convertedValues[704]}</p>`;
            resultsHTML += `<p>4P : ${convertedValues[939]}</p>`;

            document.getElementById("result").innerHTML = resultsHTML;
        };

        img.src = reader.result;
    };

    reader.readAsDataURL(file);
}
