package profile

import (
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
)

func ptr(s string) *string { return &s }

func TestGetCreatesMissingProfile(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	repo := NewRepository(pool)

	p, err := repo.Get(t.Context(), userID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if p.ID != userID || p.XP != 0 || p.Level != 1 || p.FullName != nil {
		t.Errorf("profile = %+v, want a new empty profile with XP 0 and level 1", p)
	}

	again, err := repo.Get(t.Context(), userID)
	if err != nil {
		t.Fatalf("second Get: %v", err)
	}
	if again.ID != userID {
		t.Errorf("second Get returned %s, want the same profile", again.ID)
	}
}

func TestUpdateChangesOnlyGivenFields(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	repo := NewRepository(pool)
	if _, err := repo.Update(t.Context(), userID, Update{FullName: ptr("山田太郎"), University: ptr("東京大学")}); err != nil {
		t.Fatalf("first Update: %v", err)
	}

	p, err := repo.Update(t.Context(), userID, Update{Faculty: ptr("工学部"), University: ptr("")})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}

	if p.FullName == nil || *p.FullName != "山田太郎" {
		t.Errorf("FullName = %v, want it kept as 山田太郎", p.FullName)
	}
	if p.Faculty == nil || *p.Faculty != "工学部" {
		t.Errorf("Faculty = %v, want 工学部", p.Faculty)
	}
	if p.University != nil {
		t.Errorf("University = %v, want cleared by an empty string", *p.University)
	}
}

func TestUpdateDoesNotTouchOtherUsers(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)
	repo := NewRepository(pool)
	if _, err := repo.Update(t.Context(), bob, Update{FullName: ptr("ボブ")}); err != nil {
		t.Fatalf("Update bob: %v", err)
	}

	if _, err := repo.Update(t.Context(), alice, Update{FullName: ptr("アリス")}); err != nil {
		t.Fatalf("Update alice: %v", err)
	}

	p, err := repo.Get(t.Context(), bob)
	if err != nil {
		t.Fatalf("Get bob: %v", err)
	}
	if p.FullName == nil || *p.FullName != "ボブ" {
		t.Errorf("bob's FullName = %v, want ボブ", p.FullName)
	}
}

// userTable は、auth.users を参照する public のテーブル。
type userTable struct {
	name, column string
	cascade      bool
}

func userTables(t *testing.T, pool *pgxpool.Pool) []userTable {
	t.Helper()
	rows, err := pool.Query(t.Context(), `
		select c.conrelid::regclass::text, a.attname, c.confdeltype = 'c'
		from pg_constraint c
		join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
		where c.contype = 'f' and c.confrelid = 'auth.users'::regclass
		  and c.connamespace = 'public'::regnamespace`)
	if err != nil {
		t.Fatalf("list tables: %v", err)
	}
	tables, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (userTable, error) {
		var u userTable
		err := row.Scan(&u.name, &u.column, &u.cascade)
		return u, err
	})
	if err != nil {
		t.Fatalf("scan tables: %v", err)
	}
	if len(tables) == 0 {
		t.Fatal("no table references auth.users, want the app tables")
	}
	return tables
}

// countRows は、テーブルごとに、そのユーザーの行の数を返す。
func countRows(t *testing.T, pool *pgxpool.Pool, tables []userTable, userID uuid.UUID) map[string]int {
	t.Helper()
	counts := make(map[string]int, len(tables))
	for _, table := range tables {
		var n int
		query := fmt.Sprintf("select count(*) from %s where %s = $1", table.name, pgx.Identifier{table.column}.Sanitize())
		if err := pool.QueryRow(t.Context(), query, userID).Scan(&n); err != nil {
			t.Fatalf("count %s: %v", table.name, err)
		}
		counts[table.name] = n
	}
	return counts
}

// seed は、企業・ES・添削・面接ログ・予定・購読URL・XPの記録など、ユーザーのデータを一通り作る。
func seed(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID) {
	t.Helper()
	statements := []string{
		`insert into profiles (id, full_name) values ($1, '山田太郎')`,
		`insert into companies (user_id, name, normalized_name) values ($1, '株式会社テスト', 'テスト')`,
		`insert into es_entries (user_id, company_id) select $1, id from companies where user_id = $1`,
		`insert into es_reviews (user_id, es_entry_id, ai_result) select $1, id, '{}' from es_entries where user_id = $1`,
		`insert into interview_logs (user_id, company_id) select $1, id from companies where user_id = $1`,
		`insert into calendar_events (user_id, title, date) values ($1, '説明会', current_date)`,
		`insert into calendar_feeds (user_id, token_hash) values ($1, uuid_send($1))`,
		`insert into xp_logs (user_id, action, xp) values ($1, 'company_new', 5)`,
	}
	for _, s := range statements {
		if _, err := pool.Exec(t.Context(), s, userID); err != nil {
			t.Fatalf("seed %q: %v", s, err)
		}
	}
}

func TestDeleteRemovesUserAndAllData(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)
	seed(t, pool, alice)
	seed(t, pool, bob)
	tables := userTables(t, pool)
	bobBefore := countRows(t, pool, tables, bob)

	if err := NewRepository(pool).Delete(t.Context(), alice); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	var users int
	if err := pool.QueryRow(t.Context(), `select count(*) from auth.users where id = $1`, alice).Scan(&users); err != nil {
		t.Fatalf("count users: %v", err)
	}
	if users != 0 {
		t.Error("alice is still in auth.users, want her deleted")
	}
	for table, n := range countRows(t, pool, tables, alice) {
		if n != 0 {
			t.Errorf("%s has %d rows of alice, want all deleted", table, n)
		}
	}
	for table, n := range countRows(t, pool, tables, bob) {
		if n != bobBefore[table] {
			t.Errorf("%s has %d rows of bob, want %d kept", table, n, bobBefore[table])
		}
	}
}

// 参照が on delete cascade でないテーブルを足すと、退会してもそのデータが残るか、退会そのものが失敗する
func TestEveryUserTableIsDeletedWithUser(t *testing.T) {
	pool := dbtest.Connect(t)

	for _, table := range userTables(t, pool) {
		if !table.cascade {
			t.Errorf("%s.%s references auth.users without on delete cascade", table.name, table.column)
		}
	}
}
