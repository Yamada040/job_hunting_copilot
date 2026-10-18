// Package platform は、ドメインに関係しない共通の部品（エラーの形式、ミドルウェア、ログ）を持つ。
package platform

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
	return &Error{Kind: KindConflict, Message: message}
}
