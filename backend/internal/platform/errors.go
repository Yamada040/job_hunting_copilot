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
