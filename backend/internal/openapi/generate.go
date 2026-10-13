// Package openapi は api/openapi.yaml から生成したサーバーのインターフェースと型を持つ。
package openapi

//go:generate go tool oapi-codegen -config ../../api/oapi-codegen.yaml ../../api/openapi.yaml
