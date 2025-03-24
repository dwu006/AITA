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
	Username string    `json:"username" bson:"username"`
	Password string    `json:"-" bson:"password"` // Password is not included in JSON responses
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
}

// UserLogin represents the login request body
type UserLogin struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// UserRegister represents the registration request body
type UserRegister struct {
	Username string `json:"username" binding:"required"`
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
		Password:  string(hashedPassword),
		CreatedAt: time.Now(),
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
			"created_at": newUser.CreatedAt,
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
			"created_at": user.CreatedAt,
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
