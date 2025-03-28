package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/dwu006/aita/api"
	"math/rand"
)

// RegisterGeminiRoutes sets up all Gemini AI-related routes
func RegisterGeminiRoutes(router *gin.Engine, gc *api.GeminiController) {
	geminiRoutes := router.Group("/api/gemini")
	{
		// Route to generate AI responses for YTA/NTA judgments
		geminiRoutes.POST("/generate", func(c *gin.Context) {
			// Parse request body
			var requestBody struct {
				Input string `json:"input" binding:"required"`
			}
			
			if err := c.ShouldBindJSON(&requestBody); err != nil {
				c.JSON(400, gin.H{"error": "Invalid request format", "details": err.Error()})
				return
			}
			
			// Generate YTA/NTA judgment with explanation
			ytaPrompt := "Based on the following AITA (Am I The Asshole) post, determine if the poster is YTA (You're The Asshole) or NTA (Not The Asshole). Format your response exactly like this: 'YTA' or 'NTA' followed by a period, then your A 1-2 sentence reason and explanation. Example: 'YTA. You should have communicated better.' or 'NTA. You were reasonable in this situation.'\n\nPost content: " + requestBody.Input
			
			response, err := gc.GenerateResponse(ytaPrompt)
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to generate response", "details": err.Error()})
				return
			}
			
			// Return the generated response
			c.JSON(200, gin.H{
				"judgment": response,
			})
		})

		// Add a route to specifically generate TLDRs for posts
		geminiRoutes.POST("/tldr", func(c *gin.Context) {
			// Parse request body
			var requestBody struct {
				PostContent string `json:"post_content" binding:"required"`
			}
			
			if err := c.ShouldBindJSON(&requestBody); err != nil {
				c.JSON(400, gin.H{"error": "Invalid request format", "details": err.Error()})
				return
			}
			
			// Create a prompt specifically for generating a TLDR
			tldrPrompt := "Generate a ONE SENTENCE ONLY BRIEF AND CONCISE TLDR (Too Long; Didn't Read) summary of this post: " + requestBody.PostContent
			
			// Generate response using Gemini
			response, err := gc.GenerateResponse(tldrPrompt)
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to generate TLDR", "details": err.Error()})
				return
			}
			
			// Return the generated TLDR
			c.JSON(200, gin.H{
				"tldr": response,
			})
		})

		// Add a route to analyze comments for YTA/NTA percentages
		geminiRoutes.POST("/analyze-comments", func(c *gin.Context) {
			// Parse request body
			var requestBody struct {
				PostID string `json:"post_id" binding:"required"`
			}
			
			if err := c.ShouldBindJSON(&requestBody); err != nil {
				c.JSON(400, gin.H{"error": "Invalid request format", "details": err.Error()})
				return
			}
			
			// In a production environment, you would fetch actual comments for the post
			// For demo purposes, we'll create a more consistent count of comments
			ytaCount := rand.Intn(10) + 5  // Between 5-14 comments
			ntaCount := rand.Intn(10) + 5  // Between 5-14 comments
			
			// Return the counts
			c.JSON(200, gin.H{
				"yta_count": ytaCount,
				"nta_count": ntaCount,
				"total_count": ytaCount + ntaCount,
			})
		})

		// Add a route to generate tags for a post
		geminiRoutes.POST("/generate-tags", func(c *gin.Context) {
			// Parse request body
			var requestBody struct {
				Content string `json:"content" binding:"required"`
			}
			
			if err := c.ShouldBindJSON(&requestBody); err != nil {
				c.JSON(400, gin.H{"error": "Invalid request format", "details": err.Error()})
				return
			}
			
			// Create a prompt for generating tags
			tagsPrompt := "Given the following text, choose 1-2 relevant category tags from this list ONLY: [Relationships, Work, Money, Roommates, Friends, School, Weddings, Parenting, In-Laws, Public, Revenge, Neighbors]. Format your response as a JSON array of strings, e.g. [\"Relationships\", \"Friends\"]. Don't include any other text in your response. Again only from the list. Here's the content: " + requestBody.Content
			
			// Generate response using Gemini
			response, err := gc.GenerateResponse(tagsPrompt)
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to generate tags", "details": err.Error()})
				return
			}
			
			// Return the generated tags
			c.JSON(200, gin.H{
				"tags": response,
			})
		})
	}
}