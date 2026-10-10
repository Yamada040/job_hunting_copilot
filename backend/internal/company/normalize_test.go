package company

import "testing"

func TestNormalizeTreatsVariantsAsTheSameCompany(t *testing.T) {
	cases := []struct {
		a, b string
	}{
		{"株式会社サンプル", "サンプル"},
		{"サンプル株式会社", "サンプル"},
		{"(株)サンプル", "サンプル"},
		{"（株）サンプル", "サンプル"},
		{"㈱サンプル", "サンプル"},
		{"サンプル　ホールディングス", "サンプルホールディングス"},
		{"ＡＢＣ商事", "abc商事"},
		{"ｻﾝﾌﾟﾙ", "サンプル"},
	}
	for _, c := range cases {
		if Normalize(c.a) != Normalize(c.b) {
			t.Errorf("Normalize(%q) = %q, Normalize(%q) = %q, want equal", c.a, Normalize(c.a), c.b, Normalize(c.b))
		}
	}
}

func TestNormalizeKeepsDifferentCompaniesApart(t *testing.T) {
	if Normalize("サンプル") == Normalize("サンプル商事") {
		t.Error("different company names were treated as the same")
	}
}
