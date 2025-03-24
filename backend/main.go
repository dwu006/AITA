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

	router := gin.Default()

	// Enable CORS
	router.Use(cors.Default())
	
	// Set trusted proxies
	router.SetTrustedProxies([]string{"127.0.0.1"})

	db.Connect(os.Getenv("MONGO_URI"))

	routes.RegisterRedditRoutes(router, rc)

	fmt.Println("Connected! Listening on http://localhost:8080")
	// Start the server
	router.Run(":8080")
}
