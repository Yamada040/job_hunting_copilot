// Package platform は、ドメインに関係しない共通の部品（エラーの形式、ミドルウェア、ログ）を持つ。
package platform

import "time"

// Kind は、ドメインのエラーが利用者から見てどういう失敗かを表す。HTTPのステータスへの対応は problem.go の1か所で決める。
type Kind int

const (
	KindInvalid Kind = iota + 1
	KindUnauthorized
	KindForbidden
	KindNotFound
	KindConflict
	KindRateLimited
	KindUnavailable
)

// Error.Code に指定する、原因ごとのコード。コードを足したら openapi.yaml の Problem.code の説明も直す。
const (
	CodeResourceLimitReached = "resource_limit_reached" // 1人あたりの件数の上限に達した（409）
	CodeAlreadyExists        = "already_exists"         // 同じものがすでにある（409）
	CodeAlreadyDone          = "already_done"           // 1回だけの操作をすでに行った（409）
	CodeDailyLimitReached    = "daily_limit_reached"    // 1日の回数・利用料の上限に達した。日本時間の翌日まで待つ（429）
)

// FieldError は、入力チェックで項目ごとに見つかった問題を表す。
type FieldError struct {
	Field   string
	Message string
}

// Error は、service が返すドメインのエラー。Message は利用者にそのまま見せる日本語にする。
type Error struct {
	Kind    Kind
	Message string
	Fields  []FieldError
	// Code は、Kind が決めるコードより細かく原因を区別したいときだけ指定する。空なら Kind のコードを使う。
	// 画面が原因ごとに表示を変えられるようにするためで、HTTPのステータスは変わらない。
	Code string
	// RetryAfter は、再試行できるまでの待ち時間。0 でなければ Retry-After ヘッダーに秒数で出す。
	RetryAfter time.Duration
}

func (e *Error) Error() string {
	return e.Message
}

// CheckLimit は、1人あたりの件数が上限に達していれば、message を伝えるエラーを返す。
// 数えてから作るまでの間に同時に作られると数件超えうるが、行をロックして厳密にはしない。
// 上限はスクリプトでの量産からDBの容量を守るためのもので、数件の超過は害にならないため。
func CheckLimit(count int64, limit int, message string) error {
	if count < int64(limit) {
		return nil
	}
	return &Error{Kind: KindConflict, Code: CodeResourceLimitReached, Message: message}
}
