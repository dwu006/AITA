package api

import (
	"context"
	"fmt"
	"os"

	"google.golang.org/api/option"
	"github.com/google/generative-ai-go/genai"
)

type GeminiController struct {
	client *genai.Client
	model  *genai.GenerativeModel
}

func NewGeminiController() (*GeminiController, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	if err != nil {
		return nil, err
	}

	model := client.GenerativeModel("gemini-2.0-flash")

	return &GeminiController{
		client: client,
		model:  model,
	}, nil
}

func (gc *GeminiController) GenerateResponse(input string) (string, error) {
	ctx := context.Background()

	// Dummy prompt for now, you can customize this later
	prompt := "Given the following tasks, complete them: " + input

	resp, err := gc.model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", err
	}

	// Assuming the response has at least one text part
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		// Try to extract the text content
		part := resp.Candidates[0].Content.Parts[0]
		// Simply convert to string directly - the safest approach without knowing the exact type
		return fmt.Sprintf("%v", part), nil
	}

	return "", nil
}

func (gc *GeminiController) Close() {
	gc.client.Close()
}
