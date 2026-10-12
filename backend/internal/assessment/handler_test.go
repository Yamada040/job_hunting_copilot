package assessment

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNotAnsweredIsOKWithNull(t *testing.T) {
	for name, visit := range map[string]func(http.ResponseWriter) error{
		"aptitude":      notAnswered{}.VisitGetAptitudeResultResponse,
		"self analysis": notAnswered{}.VisitGetSelfAnalysisResultResponse,
	} {
		rec := httptest.NewRecorder()
		if err := visit(rec); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if rec.Code != http.StatusOK || rec.Body.String() != "null\n" || rec.Header().Get("Content-Type") != "application/json" {
			t.Errorf("%s: status %d, body %q; want 200 with a JSON null", name, rec.Code, rec.Body.String())
		}
	}
}
