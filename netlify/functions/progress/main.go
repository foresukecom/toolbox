package main

import (
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"
)

func handler(w http.ResponseWriter, r *http.Request) {
	// レスポンスのContent-Typeをプレーンテキストに設定
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")

	// 日本標準時 (JST) のロケーションを取得
	jst, err := time.LoadLocation("Asia/Tokyo")
	if err != nil {
		jst = time.FixedZone("JST", 9*3600)
	}

	// 現在日時 (JST)
	now := time.Now().In(jst)

	// 現在の年の開始と次年の開始を計算
	currentYear := now.Year()
	startOfYear := time.Date(currentYear, time.January, 1, 0, 0, 0, 0, jst)
	startOfNextYear := time.Date(currentYear+1, time.January, 1, 0, 0, 0, 0, jst)

	// 経過割合を計算（0〜1の範囲にクランプ）
	totalSeconds := startOfNextYear.Sub(startOfYear).Seconds()
	elapsedSeconds := now.Sub(startOfYear).Seconds()
	fraction := elapsedSeconds / totalSeconds
	if fraction < 0 {
		fraction = 0
	} else if fraction > 1 {
		fraction = 1
	}
	percentage := fraction * 100

	// プログレスバー（50文字）の生成
	barWidth := 50
	filled := int(math.Round(fraction * float64(barWidth)))
	if filled > barWidth {
		filled = barWidth
	}
	bar := fmt.Sprintf("[%s%s]", strings.Repeat("=", filled), strings.Repeat(" ", barWidth-filled))

	// 日時、割合、プログレスバーを出力
	output := fmt.Sprintf("%s  %.2f%%\n%s",
		now.Format("2006-01-02 15:04:05 MST"),
		percentage,
		bar)
	fmt.Fprint(w, output)
}

func main() {
	http.HandleFunc("/", handler)
	http.ListenAndServe(":8080", nil)
}
