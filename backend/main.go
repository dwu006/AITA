package main

import (
	"os"
	"fmt"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/dwu006/aita/controller"
	"github.com/dwu006/aita/routes"
	"github.com/dwu006/aita/db"
	"github.com/joho/godotenv"
)


func main() {
	gin.SetMode(gin.ReleaseMode)

	err := godotenv.Load(".env")
	if err != nil {
		panic(err)
	}
	// fmt.Println("Client ID:", os.Getenv("REDDIT_CLIENT_ID"))
	// fmt.Println("Client Secret:", os.Getenv("REDDIT_CLIENT_SECRET"))
	// fmt.Println("Username:", os.Getenv("REDDIT_USERNAME"))
	// fmt.Println("Password:", os.Getenv("REDDIT_PASSWORD"))
	// fmt.Println("User Agent:", os.Getenv("REDDIT_USER_AGENT"))

	// Connect to the database first
	db.Connect(os.Getenv("MONGO_URI"))

	rc, err := controller.NewRedditController(
		os.Getenv("REDDIT_CLIENT_ID"),
		os.Getenv("REDDIT_CLIENT_SECRET"),
		os.Getenv("REDDIT_USERNAME"),
		os.Getenv("REDDIT_PASSWORD"),
		os.Getenv("REDDIT_USER_AGENT"),
	)
	if err != nil {
		panic(err)
	}

	// Initialize the UserController with a JWT secret
	jwtSecret := os.Getenv("JWT_SECRET")
	uc := controller.NewUserController(jwtSecret)

	router := gin.Default()

	// Enhanced CORS configuration
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	router.Use(cors.New(config))
	
	// Set trusted proxies
	router.SetTrustedProxies([]string{"127.0.0.1"})

	// Register routes
	routes.RegisterRedditRoutes(router, rc)
	routes.RegisterUserRoutes(router, uc)

	fmt.Println("Connected! Listening on http://localhost:8080")
	// Start the server
	router.Run(":8080")
}
