// Package dbtest は、実際の Postgres（ローカルや CI の supabase start）を使うテストの補助を提供する。
package dbtest

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect は、TEST_DATABASE_URL のDBにつなぐ。
// 手元で DB を立ち上げていないときはテストを飛ばすが、CI では飛ばさずに失敗させる（DBのテストが黙って実行されなくなるのを防ぐ）。
func Connect(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		if os.Getenv("CI") != "" {
			t.Fatal("TEST_DATABASE_URL is required in CI")
		}
		t.Skip("TEST_DATABASE_URL is not set; run `supabase start` and set it to run database tests")
	}
	pool, err := pgxpool.New(t.Context(), url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

// CreateUser は、Supabase Auth のユーザーを1人作り、テストの終わりに削除する。
// アプリのテーブルは auth.users を on delete cascade で参照しているので、そのユーザーのデータもまとめて消える。
func CreateUser(t *testing.T, pool *pgxpool.Pool) uuid.UUID {
	t.Helper()
	id := uuid.New()
	if _, err := pool.Exec(t.Context(), `insert into auth.users (id, email) values ($1, $2)`, id, id.String()+"@example.test"); err != nil {
		t.Fatalf("create user: %v", err)
	}
	t.Cleanup(func() {
		// t.Context() はクリーンアップの時点で取り消されているため使わない
		if _, err := pool.Exec(context.Background(), `delete from auth.users where id = $1`, id); err != nil {
			t.Errorf("delete user: %v", err)
		}
	})
	return id
}
