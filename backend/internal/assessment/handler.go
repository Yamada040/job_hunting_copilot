package assessment

import (
	"context"
	"net/http"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

type Handler struct {
	Aptitude     *Service[openapi.AptitudeAnswers]
	SelfAnalysis *Service[openapi.SelfAnalysisAnswers]
}

func (h Handler) GetAptitudeResult(ctx context.Context, _ openapi.GetAptitudeResultRequestObject) (openapi.GetAptitudeResultResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	r, err := h.Aptitude.Get(ctx, userID)
	if err != nil {
		return nil, err
	}
	if r == nil {
		return notAnswered{}, nil
	}
	return openapi.GetAptitudeResult200JSONResponse(aptitudeToAPI(*r)), nil
}

func (h Handler) SubmitAptitudeAnswers(ctx context.Context, req openapi.SubmitAptitudeAnswersRequestObject) (openapi.SubmitAptitudeAnswersResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	r, reward, err := h.Aptitude.Submit(ctx, userID, req.Body.Answers)
	if err != nil {
		return nil, err
	}
	return openapi.SubmitAptitudeAnswers201JSONResponse{Result: aptitudeToAPI(r), Xp: xp.ToAPI(reward)}, nil
}

func (h Handler) DiagnoseAptitude(ctx context.Context, _ openapi.DiagnoseAptitudeRequestObject) (openapi.DiagnoseAptitudeResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	r, err := h.Aptitude.Diagnose(ctx, userID)
	if err != nil {
		return nil, err
	}
	return openapi.DiagnoseAptitude200JSONResponse(aptitudeToAPI(r)), nil
}

func (h Handler) GetSelfAnalysisResult(ctx context.Context, _ openapi.GetSelfAnalysisResultRequestObject) (openapi.GetSelfAnalysisResultResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	r, err := h.SelfAnalysis.Get(ctx, userID)
	if err != nil {
		return nil, err
	}
	if r == nil {
		return notAnswered{}, nil
	}
	return openapi.GetSelfAnalysisResult200JSONResponse(selfAnalysisToAPI(*r)), nil
}

func (h Handler) SubmitSelfAnalysisAnswers(ctx context.Context, req openapi.SubmitSelfAnalysisAnswersRequestObject) (openapi.SubmitSelfAnalysisAnswersResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	r, reward, err := h.SelfAnalysis.Submit(ctx, userID, req.Body.Answers)
	if err != nil {
		return nil, err
	}
	return openapi.SubmitSelfAnalysisAnswers201JSONResponse{Result: selfAnalysisToAPI(r), Xp: xp.ToAPI(reward)}, nil
}

func (h Handler) AnalyzeSelf(ctx context.Context, _ openapi.AnalyzeSelfRequestObject) (openapi.AnalyzeSelfResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	r, err := h.SelfAnalysis.Diagnose(ctx, userID)
	if err != nil {
		return nil, err
	}
	return openapi.AnalyzeSelf200JSONResponse(selfAnalysisToAPI(r)), nil
}

func aptitudeToAPI(r Result[openapi.AptitudeAnswers]) openapi.AptitudeResult {
	return openapi.AptitudeResult{Id: r.ID, Answers: r.Answers, AiResult: r.AIResult, CreatedAt: r.CreatedAt}
}

func selfAnalysisToAPI(r Result[openapi.SelfAnalysisAnswers]) openapi.SelfAnalysisResult {
	return openapi.SelfAnalysisResult{Id: r.ID, Answers: r.Answers, AiResult: r.AIResult, CreatedAt: r.CreatedAt}
}

// notAnswered は、まだ回答していないときの 200 と null。生成された 200 の型は null を表せないので、ここで書く。
type notAnswered struct{}

func (notAnswered) VisitGetAptitudeResultResponse(w http.ResponseWriter) error { return writeNull(w) }

func (notAnswered) VisitGetSelfAnalysisResultResponse(w http.ResponseWriter) error {
	return writeNull(w)
}

func writeNull(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, err := w.Write([]byte("null\n"))
	return err
}
