package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/dwu006/aita/controller"
)

// RegisterUserRoutes sets up all user-related routes
func RegisterUserRoutes(router *gin.Engine, uc *controller.UserController) {
	// Public routes (no authentication required)
	authRoutes := router.Group("/api/auth")
	{
		authRoutes.POST("/register", uc.Register)
		authRoutes.POST("/login", uc.Login)
		authRoutes.POST("/logout", uc.Logout)
	}

	// Protected routes (authentication required)
	// Example of how to use the middleware for protected routes
	userRoutes := router.Group("/api/user")
	userRoutes.Use(uc.AuthMiddleware())
	{
		// Add protected user routes here when needed
		// For example:
		userRoutes.GET("/profile", uc.FetchUser)
		userRoutes.PUT("/update", uc.UpdateUser)
		userRoutes.POST("/post-history", uc.AddPostToHistory) // Add post to user's history
		userRoutes.POST("/update-stats", uc.UpdateUserStats)  // Update user's accuracy stats
	}

	// Leaderboard routes - protected by auth middleware
	leaderboardRoutes := router.Group("/api/users")
	leaderboardRoutes.Use(uc.AuthMiddleware())
	{
		leaderboardRoutes.GET("/leaderboard", uc.GetLeaderboard) // Get user rankings
	}
}
