package contact

import "mime"

// 件名の改行などでヘッダーを壊されないよう、件名は必ず B エンコーディングで送る
var mimeEncoder = mime.BEncoding
