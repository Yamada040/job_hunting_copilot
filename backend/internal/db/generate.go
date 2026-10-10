// Package db は、internal/db/queries の SQL から sqlc が生成した、型付きの問い合わせ関数を持つ。
package db

//go:generate sqlc generate -f ../../sqlc.yaml
