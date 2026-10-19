package db_test

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
)

func TestDatabaseRejectsLinkToOtherUsersRow(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)

	var companyID, entryID, questionID uuid.UUID
	if err := pool.QueryRow(t.Context(),
		`insert into companies (user_id, name, normalized_name) values ($1, 'サンプル', 'サンプル') returning id`, alice).Scan(&companyID); err != nil {
		t.Fatalf("insert company: %v", err)
	}
	if err := pool.QueryRow(t.Context(),
		`insert into es_entries (user_id, company_id, title) values ($1, $2, 'ES') returning id`, alice, companyID).Scan(&entryID); err != nil {
		t.Fatalf("insert es: %v", err)
	}
	if err := pool.QueryRow(t.Context(),
		`insert into webtest_questions (user_id, title, body, answer) values ($1, '問題', '本文', 'A') returning id`, alice).Scan(&questionID); err != nil {
		t.Fatalf("insert question: %v", err)
	}

	tests := []struct {
		name string
		sql  string
		ref  uuid.UUID
	}{
		{"es_entries", `insert into es_entries (user_id, company_id, title) values ($1, $2, 'ES')`, companyID},
		{"interview_logs", `insert into interview_logs (user_id, company_id) values ($1, $2)`, companyID},
		{"calendar_events", `insert into calendar_events (user_id, company_id, title, date) values ($1, $2, '予定', '2026-11-01')`, companyID},
		{"es_reviews", `insert into es_reviews (user_id, es_entry_id, ai_result) values ($1, $2, '{}')`, entryID},
		{"webtest_attempts", `insert into webtest_attempts (user_id, question_id) values ($1, $2)`, questionID},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := pool.Exec(t.Context(), tt.sql, bob, tt.ref)

			var pgErr *pgconn.PgError
			if !errors.As(err, &pgErr) || pgErr.Code != "23503" {
				t.Fatalf("insert bob's row linked to alice's: err = %v, want a foreign key violation", err)
			}
			if _, err := pool.Exec(t.Context(), tt.sql, alice, tt.ref); err != nil {
				t.Errorf("insert alice's own row: %v", err)
			}
		})
	}
}

func TestDatabaseAllowsEventWithoutCompany(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)

	if _, err := pool.Exec(t.Context(),
		`insert into calendar_events (user_id, title, date) values ($1, '予定', '2026-11-01')`, userID); err != nil {
		t.Errorf("insert event without a company: %v", err)
	}
}
