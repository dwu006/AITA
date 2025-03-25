package controller

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/dwu006/aita/db"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// User represents the user model stored in the database
type User struct {
	Username    string            `json:"username" bson:"username"`
	Name        string            `json:"name" bson:"name"`
	Password    string            `json:"-" bson:"password"` // Password is not included in JSON responses
	CreatedAt   time.Time         `json:"created_at" bson:"created_at"`
	NumPosts    int               `json:"num_posts" bson:"num_posts"`
	FavCategory string            `json:"fav_category" bson:"fav_category"`
	Accuracy    float64           `json:"accuracy" bson:"accuracy"`
	PFP         string            `json:"pfp" bson:"pfp"` // URL or base64 encoded image
	PostHistory map[string]string `json:"post_history" bson:"post_history"` // Map of post_id to judgment
	StreakDates []time.Time       `json:"streak_dates" bson:"streak_dates"`
	StreakCount int               `json:"streak_count" bson:"streak_count"`
}

// UserLogin represents the login request body
type UserLogin struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// UserRegister represents the registration request body
type UserRegister struct {
	Username string `json:"username" binding:"required"`
	Name     string `json:"name" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// UserController handles user-related operations
type UserController struct {
	collection *mongo.Collection
	jwtSecret  []byte
}

// NewUserController creates a new UserController instance
func NewUserController(jwtSecret string) *UserController {
	return &UserController{
		collection: db.GetDB().Collection("users"),
		jwtSecret:  []byte(jwtSecret),
	}
}

// Register creates a new user account
func (uc *UserController) Register(c *gin.Context) {
	var userRegister UserRegister

	if err := c.ShouldBindJSON(&userRegister); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	// Check if username already exists
	var existingUser User
	err := uc.collection.FindOne(
		context.Background(),
		bson.M{"username": userRegister.Username},
	).Decode(&existingUser)

	if err == nil {
		// User already exists
		c.JSON(400, gin.H{"error": "Username already taken"})
		return
	} else if !errors.Is(err, mongo.ErrNoDocuments) {
		// Database error
		c.JSON(500, gin.H{"error": "Database error"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(userRegister.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create new user
	newUser := User{
		Username:  userRegister.Username,
		Name:      userRegister.Name,
		Password:  string(hashedPassword),
		CreatedAt: time.Now(),
		NumPosts:  0,
		FavCategory: "",
		Accuracy:  0.0,
		PFP: "https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg",
		PostHistory: make(map[string]string),
		StreakDates: []time.Time{},
		StreakCount: 0,
	}

	_, err = uc.collection.InsertOne(context.Background(), newUser)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create user"})
		return
	}

	// Generate JWT token
	token, err := uc.generateToken(newUser.Username)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(201, gin.H{
		"message": "User registered successfully",
		"token":   token,
		"user": gin.H{
			"username":   newUser.Username,
			"name":       newUser.Name,
			"created_at": newUser.CreatedAt,
			"num_posts":  newUser.NumPosts,
			"fav_category":  newUser.FavCategory,
			"accuracy":  newUser.Accuracy,
			"pfp":  newUser.PFP,
			"post_history":  newUser.PostHistory,
			"streak_dates":  newUser.StreakDates,
			"streak_count":  newUser.StreakCount,
		},
	})
}

// Login authenticates a user and returns a JWT token
func (uc *UserController) Login(c *gin.Context) {
	var userLogin UserLogin

	if err := c.ShouldBindJSON(&userLogin); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	// Find user by username
	var user User
	err := uc.collection.FindOne(
		context.Background(),
		bson.M{"username": userLogin.Username},
	).Decode(&user)

	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.JSON(401, gin.H{"error": "Invalid username or password"})
			return
		}
		c.JSON(500, gin.H{"error": "Database error"})
		return
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(userLogin.Password))
	if err != nil {
		c.JSON(401, gin.H{"error": "Invalid username or password"})
		return
	}

	// Generate JWT token
	token, err := uc.generateToken(user.Username)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(200, gin.H{
		"message": "Login successful",
		"token":   token,
		"user": gin.H{
			"username":   user.Username,
			"name":       user.Name,
			"created_at": user.CreatedAt,
			"num_posts":  user.NumPosts,
			"fav_category":  user.FavCategory,
			"accuracy":  user.Accuracy,
			"pfp":  user.PFP,
			"post_history":  user.PostHistory,
			"streak_dates":  user.StreakDates,
			"streak_count":  user.StreakCount,
		},
	})
}

// Logout handles user logout
func (uc *UserController) Logout(c *gin.Context) {
	// In a stateless JWT implementation, the actual logout happens client-side
	// by removing the token, but we'll return a success message anyway
	c.JSON(200, gin.H{
		"message": "Logout successful",
	})
}

// FetchUser retrieves the user data for the currently authenticated user
func (uc *UserController) FetchUser(c *gin.Context) {
	// Get the username from the authenticated context
	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	// Find the user in the database
	var user User
	err := uc.collection.FindOne(
		context.Background(),
		bson.M{"username": username},
	).Decode(&user)

	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch user data",
		})
		return
	}

	// Return the user data
	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"username":     user.Username,
			"name":         user.Name,
			"created_at":   user.CreatedAt,
			"num_posts":    user.NumPosts,
			"fav_category": user.FavCategory,
			"accuracy":     user.Accuracy,
			"pfp":          user.PFP,
			"post_history": user.PostHistory,
			"streak_dates": user.StreakDates,
			"streak_count": user.StreakCount,
		},
	})
}

// generateToken creates a new JWT token for a user
func (uc *UserController) generateToken(username string) (string, error) {
	// Create the JWT claims
	claims := jwt.MapClaims{
		"username": username,
		"exp":      time.Now().Add(time.Hour * 24 * 7).Unix(), // Token expires in 7 days
	}

	// Create token with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Generate encoded token
	tokenString, err := token.SignedString(uc.jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// AuthMiddleware is a Gin middleware to verify JWT tokens
func (uc *UserController) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(401, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		// Extract the token from the Bearer token
		tokenString := ""
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		} else {
			c.JSON(401, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		// Parse and validate the token
		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			// Validate the signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return uc.jwtSecret, nil
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Check if token is valid
		if token.Valid {
			// Set the username in the context
			username, ok := claims["username"].(string)
			if !ok {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
				c.Abort()
				return
			}
			c.Set("username", username)
			c.Next()
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}
	}
}
