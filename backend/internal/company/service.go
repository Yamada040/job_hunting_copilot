// Package company は、就活の中心になる「企業」を扱う。ES・面接ログ・カレンダーの予定は企業にひも付く（docs/backend-design.md 3章）。
package company

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

// Fields は、企業の登録・更新で受け取る項目。nil の項目は、登録では未入力、更新では変更しないことを表す。
type Fields struct {
	Name      *string
	Industry  *string
	URL       *string
	MypageID  *string
	MypageURL *string
	Memo      *string
	Stage     *db.CompanyStage
	Favorite  *bool
	// SetPreference が true のときだけ Preference を書き換える。Preference が nil なら未設定に戻す
	SetPreference bool
	Preference    *int
}

type Service struct {
	pool *pgxpool.Pool
	xp   *xp.Service
}

func NewService(pool *pgxpool.Pool, xp *xp.Service) *Service {
	return &Service{pool: pool, xp: xp}
}

// List は、ユーザーの企業を更新日時の新しい順に返す。query を渡すと、正規化した企業名の部分一致で絞り込む。
func (s *Service) List(ctx context.Context, userID uuid.UUID, query string) ([]db.Company, error) {
	var normalized *string
	if n := Normalize(query); n != "" {
		normalized = &n
	}
	rows, err := db.New(s.pool).ListCompanies(ctx, db.ListCompaniesParams{UserID: userID, Query: normalized})
	if err != nil {
		return nil, fmt.Errorf("list companies: %w", err)
	}
	return rows, nil
}

func (s *Service) Get(ctx context.Context, userID, id uuid.UUID) (db.Company, error) {
	row, err := db.New(s.pool).GetCompany(ctx, db.GetCompanyParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return db.Company{}, notFound()
	}
	if err != nil {
		return db.Company{}, fmt.Errorf("get company: %w", err)
	}
	return row, nil
}

// Create は、企業を登録してXPを付与する。登録と付与は1つのトランザクションで行う。
func (s *Service) Create(ctx context.Context, userID uuid.UUID, f Fields) (db.Company, xp.Result, error) {
	f = trimFields(f)
	if f.Name == nil || *f.Name == "" {
		return db.Company{}, xp.Result{}, platform.Required("name", "企業名")
	}
	stage := db.CompanyStageNotEntered
	if f.Stage != nil {
		stage = *f.Stage
	}

	var (
		row    db.Company
		reward xp.Result
	)
	err := platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		var err error
		row, err = q.CreateCompany(ctx, db.CreateCompanyParams{
			UserID:         userID,
			Name:           *f.Name,
			NormalizedName: Normalize(*f.Name),
			Industry:       platform.EmptyToNil(f.Industry),
			Url:            platform.EmptyToNil(f.URL),
			MypageID:       platform.EmptyToNil(f.MypageID),
			MypageUrl:      platform.EmptyToNil(f.MypageURL),
			Memo:           platform.EmptyToNil(f.Memo),
			Stage:          stage,
			Preference:     toSmallint(f.Preference),
			Favorite:       f.Favorite != nil && *f.Favorite,
		})
		if err != nil {
			return err
		}
		reward, err = s.xp.Award(ctx, q, userID, db.XpActionCompanyNew, &row.ID)
		return err
	})
	if platform.IsUniqueViolation(err) {
		return db.Company{}, xp.Result{}, duplicated()
	}
	if err != nil {
		return db.Company{}, xp.Result{}, fmt.Errorf("create company: %w", err)
	}
	return row, reward, nil
}

// Update は、f のうち送られた項目だけを書き換える。
func (s *Service) Update(ctx context.Context, userID, id uuid.UUID, f Fields) (db.Company, error) {
	f = trimFields(f)
	if f.Name != nil && *f.Name == "" {
		return db.Company{}, platform.Required("name", "企業名")
	}
	params := db.UpdateCompanyParams{
		ID:            id,
		UserID:        userID,
		SetName:       f.Name != nil,
		SetIndustry:   f.Industry != nil,
		Industry:      platform.EmptyToNil(f.Industry),
		SetUrl:        f.URL != nil,
		Url:           platform.EmptyToNil(f.URL),
		SetMypageID:   f.MypageID != nil,
		MypageID:      platform.EmptyToNil(f.MypageID),
		SetMypageUrl:  f.MypageURL != nil,
		MypageUrl:     platform.EmptyToNil(f.MypageURL),
		SetMemo:       f.Memo != nil,
		Memo:          platform.EmptyToNil(f.Memo),
		SetStage:      f.Stage != nil,
		Stage:         f.Stage,
		SetPreference: f.SetPreference,
		Preference:    toSmallint(f.Preference),
		SetFavorite:   f.Favorite != nil,
	}
	if f.Name != nil {
		params.Name = *f.Name
		params.NormalizedName = Normalize(*f.Name)
	}
	if f.Favorite != nil {
		params.Favorite = *f.Favorite
	}

	row, err := db.New(s.pool).UpdateCompany(ctx, params)
	if errors.Is(err, pgx.ErrNoRows) {
		return db.Company{}, notFound()
	}
	if platform.IsUniqueViolation(err) {
		return db.Company{}, duplicated()
	}
	if err != nil {
		return db.Company{}, fmt.Errorf("update company: %w", err)
	}
	return row, nil
}

// Delete は、企業を削除する。ひも付くES・面接ログ・予定は、DBの on delete cascade で一緒に消える。
func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	n, err := db.New(s.pool).DeleteCompany(ctx, db.DeleteCompanyParams{ID: id, UserID: userID})
	if err != nil {
		return fmt.Errorf("delete company: %w", err)
	}
	if n == 0 {
		return notFound()
	}
	return nil
}

func trimFields(f Fields) Fields {
	f.Name = platform.TrimPtr(f.Name)
	f.Industry = platform.TrimPtr(f.Industry)
	f.URL = platform.TrimPtr(f.URL)
	f.MypageID = platform.TrimPtr(f.MypageID)
	f.MypageURL = platform.TrimPtr(f.MypageURL)
	f.Memo = platform.TrimPtr(f.Memo)
	return f
}

func toSmallint(v *int) *int16 {
	if v == nil {
		return nil
	}
	n := int16(*v)
	return &n
}

// 他のユーザーの企業も、存在しない企業と同じく 404 にする（存在するかどうかを他人に知られないため）
func notFound() *platform.Error {
	return &platform.Error{Kind: platform.KindNotFound, Message: "企業が見つかりません"}
}

func duplicated() *platform.Error {
	return &platform.Error{
		Kind:    platform.KindConflict,
		Message: "同じ名前の企業がすでに登録されています",
		Fields:  []platform.FieldError{{Field: "name", Message: "同じ名前の企業がすでに登録されています"}},
	}
}

// EnsureOwned は、ESや面接ログを企業にひも付ける前に、その企業が本人のものかを確かめる。
// 他人の企業IDを指定された場合も「存在しない企業」として扱い、ひも付けさせない（ひも付けると企業名が見えてしまうため）。
// q には、ひも付ける操作と同じトランザクションのものを渡す。
func EnsureOwned(ctx context.Context, q *db.Queries, userID, companyID uuid.UUID) error {
	ok, err := q.CompanyExists(ctx, db.CompanyExistsParams{ID: companyID, UserID: userID})
	if err != nil {
		return fmt.Errorf("check company: %w", err)
	}
	if !ok {
		return &platform.Error{
			Kind:    platform.KindInvalid,
			Message: "入力内容に誤りがあります",
			Fields:  []platform.FieldError{{Field: "companyId", Message: "企業が見つかりません"}},
		}
	}
	return nil
}
