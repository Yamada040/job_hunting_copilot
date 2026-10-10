#!/bin/sh
# 秘密の値が入るファイルがコミットに含まれていたら止める。
# .gitignore だけでは git add -f や、ignore の無いブランチでの git add を防げないため。

blocked=$(printf '%s\n' "$@" | grep -E \
  -e '(^|/)\.env(\..+)?$' \
  -e '\.tfvars$' \
  -e '\.tfstate(\..+)?$' \
  -e '(^|/)tfplan$' \
  -e '\.tfplan$' \
  -e '(^|/)backend\.hcl$' \
  -e '(^|/)\.terraform/' \
  -e '(^|/)signing_keys\.json$' |
  grep -v -E '(^|/)\.env\.example$')

if [ -n "$blocked" ]; then
  echo "秘密の値が入るファイルはコミットできません:"
  printf '  %s\n' $blocked
  echo "意図せず追加した場合は git restore --staged <ファイル> で外してください"
  exit 1
fi
