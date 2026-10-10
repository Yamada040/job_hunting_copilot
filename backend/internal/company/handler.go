package company

import (
	"context"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

type Handler struct {
	Service *Service
}

func (h Handler) ListCompanies(ctx context.Context, req openapi.ListCompaniesRequestObject) (openapi.ListCompaniesResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	query := ""
	if req.Params.Q != nil {
		query = *req.Params.Q
	}
	rows, err := h.Service.List(ctx, userID, query)
	if err != nil {
		return nil, err
	}
	res := make(openapi.ListCompanies200JSONResponse, len(rows))
	for i, row := range rows {
		res[i] = ToAPI(row)
	}
	return res, nil
}

func (h Handler) CreateCompany(ctx context.Context, req openapi.CreateCompanyRequestObject) (openapi.CreateCompanyResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	row, reward, err := h.Service.Create(ctx, userID, Fields{
		Name:       &b.Name,
		Industry:   b.Industry,
		URL:        b.Url,
		MypageID:   b.MypageId,
		MypageURL:  b.MypageUrl,
		Memo:       b.Memo,
		Stage:      (*db.CompanyStage)(b.Stage),
		Favorite:   b.Favorite,
		Preference: b.Preference,
	})
	if err != nil {
		return nil, err
	}
	return openapi.CreateCompany201JSONResponse{Company: ToAPI(row), Xp: xp.ToAPI(reward)}, nil
}

func (h Handler) GetCompany(ctx context.Context, req openapi.GetCompanyRequestObject) (openapi.GetCompanyResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	row, err := h.Service.Get(ctx, userID, req.CompanyId)
	if err != nil {
		return nil, err
	}
	return openapi.GetCompany200JSONResponse(ToAPI(row)), nil
}

func (h Handler) UpdateCompany(ctx context.Context, req openapi.UpdateCompanyRequestObject) (openapi.UpdateCompanyResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	f := Fields{
		Name:          b.Name,
		Industry:      b.Industry,
		URL:           b.Url,
		MypageID:      b.MypageId,
		MypageURL:     b.MypageUrl,
		Memo:          b.Memo,
		Stage:         (*db.CompanyStage)(b.Stage),
		Favorite:      b.Favorite,
		SetPreference: b.Preference.IsSpecified(),
	}
	if b.Preference.IsSpecified() && !b.Preference.IsNull() {
		v := b.Preference.MustGet()
		f.Preference = &v
	}
	row, err := h.Service.Update(ctx, userID, req.CompanyId, f)
	if err != nil {
		return nil, err
	}
	return openapi.UpdateCompany200JSONResponse(ToAPI(row)), nil
}

func (h Handler) DeleteCompany(ctx context.Context, req openapi.DeleteCompanyRequestObject) (openapi.DeleteCompanyResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	if err := h.Service.Delete(ctx, userID, req.CompanyId); err != nil {
		return nil, err
	}
	return openapi.DeleteCompany204Response{}, nil
}

// ToAPI は、DBの企業をAPIの形にする。企業を含めて返す他の機能（ES・面接ログ）からも使う。
func ToAPI(row db.Company) openapi.Company {
	var preference *int
	if row.Preference != nil {
		v := int(*row.Preference)
		preference = &v
	}
	return openapi.Company{
		Id:         row.ID,
		Name:       row.Name,
		Industry:   row.Industry,
		Url:        row.Url,
		MypageId:   row.MypageID,
		MypageUrl:  row.MypageUrl,
		Memo:       row.Memo,
		Stage:      openapi.CompanyStage(row.Stage),
		Preference: preference,
		Favorite:   row.Favorite,
		AiResult:   row.AiResult,
		CreatedAt:  row.CreatedAt,
		UpdatedAt:  row.UpdatedAt,
	}
}
