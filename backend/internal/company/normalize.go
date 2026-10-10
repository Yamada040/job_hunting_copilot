package company

import (
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// 法人格の表記揺れ。NFKC で「㈱」「（株）」は「(株)」に揃うので、ここでは揃った後の形だけを並べる
var legalForms = []string{"株式会社", "(株)"}

// Normalize は、表記揺れを除いた企業名を返す。この値が同じ企業は同じ企業とみなし、ユーザーごとに重複を許さない。
// 全角・半角の違い（NFKC）、法人格（株式会社・(株)・㈱）、空白、英字の大文字・小文字を無視する。
// 「NTTデータ」と「エヌ・ティ・ティ・データ」のような略称・読みの違いは扱わない（docs/backend-design.md 3章）。
func Normalize(name string) string {
	s := norm.NFKC.String(name)
	for _, form := range legalForms {
		s = strings.ReplaceAll(s, form, "")
	}
	s = strings.Map(func(r rune) rune {
		if unicode.IsSpace(r) {
			return -1
		}
		return unicode.ToLower(r)
	}, s)
	return s
}
