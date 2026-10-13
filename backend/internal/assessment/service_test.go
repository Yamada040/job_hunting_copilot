package assessment

import (
	"errors"
	"strings"
	"testing"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai/aitest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

func assertKind(t *testing.T, err error, kind platform.Kind) {
	t.Helper()
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != kind {
		t.Fatalf("error = %v, want kind %v", err, kind)
	}
}

func TestAptitudeFlow(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	fake := &aitest.Fake{Reply: "診断結果"}
	s := NewAptitudeService(pool, xp.NewService(), fake, ratelimit.NewLimiter())

	if before, err := s.Get(t.Context(), userID); err != nil || before != nil {
		t.Fatalf("Get before answering = %v, %v; want nil without an error", before, err)
	}

	answers := openapi.AptitudeAnswers{Interests: []string{"IT", "教育"}, Strengths: []string{}, Values: []string{}, Enjoy: "ものづくり"}
	result, reward, err := s.Submit(t.Context(), userID, answers)
	if err != nil {
		t.Fatalf("Submit: %v", err)
	}
	if result.Answers.Enjoy != "ものづくり" || reward.Awarded != 15 {
		t.Errorf("result = %+v, reward = %+v; want answers saved and 15 XP", result, reward)
	}

	if saved, err := s.Get(t.Context(), userID); err != nil || saved == nil || saved.Answers.Enjoy != "ものづくり" {
		t.Errorf("Get after answering = %v, %v; want the saved answers", saved, err)
	}

	_, _, err = s.Submit(t.Context(), userID, answers)
	assertKind(t, err, platform.KindConflict)

	diagnosed, err := s.Diagnose(t.Context(), userID)
	if err != nil {
		t.Fatalf("Diagnose: %v", err)
	}
	if diagnosed.AIResult == nil || *diagnosed.AIResult != "診断結果" {
		t.Errorf("ai result = %v, want saved", diagnosed.AIResult)
	}
	for _, want := range []string{"興味のある領域: IT, 教育", "好きな業務/没頭できること: ものづくり", "誇りに思う達成: 未記入"} {
		if !strings.Contains(fake.Inputs[0], want) {
			t.Errorf("AI input %q does not contain %q", fake.Inputs[0], want)
		}
	}

	_, err = s.Diagnose(t.Context(), userID)
	assertKind(t, err, platform.KindConflict)
	if len(fake.Inputs) != 1 {
		t.Errorf("AI was called %d times, want once", len(fake.Inputs))
	}
}

func TestSelfAnalysisIsSeparateFromAptitude(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	x := xp.NewService()
	fake := &aitest.Fake{Reply: "分析結果"}
	aptitude := NewAptitudeService(pool, x, fake, ratelimit.NewLimiter())
	self := NewSelfAnalysisService(pool, x, fake, ratelimit.NewLimiter())
	if _, _, err := aptitude.Submit(t.Context(), userID, openapi.AptitudeAnswers{Interests: []string{}, Strengths: []string{}, Values: []string{}}); err != nil {
		t.Fatalf("aptitude Submit: %v", err)
	}

	result, reward, err := self.Submit(t.Context(), userID, openapi.SelfAnalysisAnswers{Strengths: "粘り強さ"})
	if err != nil {
		t.Fatalf("self-analysis Submit: %v", err)
	}
	if result.Answers.Strengths != "粘り強さ" || reward.Awarded != 15 || reward.Total != 30 {
		t.Errorf("result = %+v, reward = %+v; want its own first-time XP", result, reward)
	}
	if _, err := self.Diagnose(t.Context(), userID); err != nil {
		t.Fatalf("Diagnose: %v", err)
	}
	if !strings.Contains(fake.Inputs[0], "強み: 粘り強さ") {
		t.Errorf("AI input = %q, want the self-analysis answers", fake.Inputs[0])
	}
}
