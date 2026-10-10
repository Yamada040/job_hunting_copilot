package platform

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// サーバーレスでは関数のインスタンスが増えるたびに接続を張るため、1インスタンスあたりの接続数は小さく抑える
const maxConns = 4

// OpenDB は、Postgres への接続プールを作る。接続は最初の問い合わせのときに張られる。
// 起動時に接続を確かめないのは、DBが一時的に落ちているだけでサーバー全体が起動できなくなるのを避けるため（DBの状態は /v1/health で見る）。
// 本番では Supabase の接続プーラー（Supavisor のトランザクションモード）を通す前提にしている。
func OpenDB(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	cfg.MaxConns = maxConns
	// トランザクションモードのプーラーでは、同じ接続が別のクライアントに渡るため、名前付きのプリペアドステートメントを残せない。
	// 名前なしのステートメントで実行する QueryExecModeExec を使う（simple protocol は型の扱いが緩くなるので選ばない）。
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	return pool, nil
}
