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
		// userRoutes.PUT("/profile", uc.UpdateProfile)
	}
}
