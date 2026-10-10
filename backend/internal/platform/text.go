package platform

import (
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

// TrimPtr は、文字列の前後の空白を取り除く。nil（項目が送られていない）はそのまま nil を返す。
func TrimPtr(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	return &t
}

// EmptyToNil は、空文字を nil（DBの null）にする。画面で欄を空にしたら「未入力」として保存するため。
func EmptyToNil(s *string) *string {
	if s == nil || *s == "" {
		return nil
	}
	return s
}

// IsUniqueViolation は、DBのユニーク制約に違反したエラーかどうかを返す。
func IsUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// Required は、必須の項目が空だったときのエラーを作る。
func Required(field, label string) *Error {
	return &Error{
		Kind:    KindInvalid,
		Message: "入力内容に誤りがあります",
		Fields:  []FieldError{{Field: field, Message: label + "を入力してください"}},
	}
}
