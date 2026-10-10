package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

var startedAt = time.Now()

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":    "ok",
			"region":    os.Getenv("VERCEL_REGION"),
			"startedAt": startedAt.Format(time.RFC3339Nano),
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
