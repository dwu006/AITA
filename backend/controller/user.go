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
	"go.mongodb.org/mongo-driver/mongo/options"
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

// UpdateUser updates a user's profile information
func (uc *UserController) UpdateUser(c *gin.Context) {
	// Get username from authenticated context
	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find the existing user
	var user User
	err := uc.collection.FindOne(context.Background(), bson.M{"username": username}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user"})
		return
	}

	// Parse form data - for multipart form with potential file upload
	if err := c.Request.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
		// If not multipart form, try binding JSON
		var updateData struct {
			Name            string `json:"name"`
			Username        string `json:"username"`
			CurrentPassword string `json:"current_password,omitempty"`
			NewPassword     string `json:"new_password,omitempty"`
		}

		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		// Continue with JSON data
		updateFields, validationError := validateAndPrepareUpdate(c, updateData.Name, updateData.Username, 
			updateData.CurrentPassword, updateData.NewPassword, "", user, uc)
		if validationError != nil {
			return // Error response already sent by validateAndPrepareUpdate
		}

		// Update user in database
		_, err = uc.collection.UpdateOne(
			context.Background(),
			bson.M{"username": username},
			bson.M{"$set": updateFields},
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
			return
		}

		// Fetch updated user data
		var updatedUser User
		err = uc.collection.FindOne(context.Background(), bson.M{"username": updateFields["username"]}).Decode(&updatedUser)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "User updated but failed to retrieve updated data"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "User updated successfully",
			"user": updatedUser,
		})
		return
	}

	// Process form fields
	name := c.PostForm("name")
	newUsername := c.PostForm("username")
	currentPassword := c.PostForm("current_password")
	newPassword := c.PostForm("new_password")

	// Process file if included
	profilePicURL := user.PFP // Default to current PFP
	file, _, err := c.Request.FormFile("profile_pic")
	if err == nil {
		defer file.Close()
		
		// In a real implementation, you would:
		// 1. Check file type (verify it's an image)
		// 2. Generate a unique filename
		// 3. Save to storage (filesystem, S3, etc.)
		// 4. Store the URL/path to the saved file

		// Here we're just creating a placeholder URL - in reality you'd save the file and return its actual URL
		profilePicURL = fmt.Sprintf("/uploads/%s-%d.jpg", newUsername, time.Now().Unix())
		
		// Example code for saving to local filesystem - uncomment if needed:
		/*
		uploadPath := "./uploads/"
		if err := os.MkdirAll(uploadPath, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
			return
		}
		
		dst, err := os.Create(fmt.Sprintf("%s%s", uploadPath, header.Filename))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}
		defer dst.Close()
		
		if _, err = io.Copy(dst, file); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}
		profilePicURL = fmt.Sprintf("/uploads/%s", header.Filename)
		*/
	}

	// Validate and prepare update
	updateFields, validationError := validateAndPrepareUpdate(c, name, newUsername, 
		currentPassword, newPassword, profilePicURL, user, uc)
	if validationError != nil {
		return // Error response already sent by validateAndPrepareUpdate
	}

	// Update user in database
	_, err = uc.collection.UpdateOne(
		context.Background(),
		bson.M{"username": username},
		bson.M{"$set": updateFields},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Fetch updated user data
	var updatedUser User
	err = uc.collection.FindOne(context.Background(), bson.M{"username": updateFields["username"]}).Decode(&updatedUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User updated but failed to retrieve updated data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User updated successfully",
		"user": updatedUser,
	})
}

// AddPostToHistory adds a post and its judgment to the user's history
func (uc *UserController) AddPostToHistory(c *gin.Context) {
	// Extract username from JWT
	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not logged in"})
		return
	}

	// Parse request body
	var req struct {
		PostID   string `json:"post_id" binding:"required"`
		Judgment string `json:"judgment" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	// Validate judgment (must be YTA or NTA)
	if req.Judgment != "YTA" && req.Judgment != "NTA" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Judgment must be either 'YTA' or 'NTA'"})
		return
	}

	// Fetch the user
	var user User
	err := uc.collection.FindOne(
		context.Background(),
		bson.M{"username": username},
	).Decode(&user)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user", "details": err.Error()})
		return
	}

	// Initialize post history map if it doesn't exist
	if user.PostHistory == nil {
		user.PostHistory = make(map[string]string)
	}

	// Add the post to history
	user.PostHistory[req.PostID] = req.Judgment

	// Update NumPosts count
	user.NumPosts = len(user.PostHistory)

	// Update streak information
	today := time.Now().Truncate(24 * time.Hour)
	
	// Check if already swiped today
	alreadySwipedToday := false
	for _, date := range user.StreakDates {
		if date.Truncate(24 * time.Hour).Equal(today) {
			alreadySwipedToday = true
			break
		}
	}
	
	// If not swiped today, add to streak
	if !alreadySwipedToday {
		user.StreakDates = append(user.StreakDates, today)
		
		// Check if streak is continuous by looking at yesterday
		yesterday := today.Add(-24 * time.Hour)
		hadSwipeYesterday := false
		
		for _, date := range user.StreakDates {
			if date.Truncate(24 * time.Hour).Equal(yesterday) {
				hadSwipeYesterday = true
				break
			}
		}
		
		if hadSwipeYesterday || len(user.StreakDates) == 1 {
			// Either this is the first swipe ever or we swiped yesterday too
			user.StreakCount++
		} else {
			// Streak broken
			user.StreakCount = 1
		}
	}

	// Limit streak dates history to last 30 days to keep the array size manageable
	if len(user.StreakDates) > 30 {
		user.StreakDates = user.StreakDates[len(user.StreakDates)-30:]
	}

	// Update the user in the database
	update := bson.M{
		"$set": bson.M{
			"post_history":  user.PostHistory,
			"num_posts":     user.NumPosts,
			"streak_dates":  user.StreakDates,
			"streak_count":  user.StreakCount,
		},
	}

	_, err = uc.collection.UpdateOne(
		context.Background(),
		bson.M{"username": username},
		update,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user history", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Post added to history",
		"num_posts": user.NumPosts,
		"streak_count": user.StreakCount,
	})
}

// GetLeaderboard retrieves user rankings sorted by specified criteria
func (uc *UserController) GetLeaderboard(c *gin.Context) {
	// Get the sort criteria from query parameter
	sortBy := c.DefaultQuery("sort", "overall")
	
	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	// Find all users (excluding password field)
	cursor, err := uc.collection.Find(
		ctx,
		bson.M{}, // No filter, get all users
		options.Find().SetProjection(bson.M{
			"username": 1,
			"name": 1,
			"num_posts": 1,
			"accuracy": 1,
			"pfp": 1,
			"_id": 1,
		}),
	)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users", "details": err.Error()})
		return
	}
	defer cursor.Close(ctx)
	
	// Decode all users
	var users []User
	if err := cursor.All(ctx, &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode users", "details": err.Error()})
		return
	}
	
	// Sort users based on criteria
	switch sortBy {
	case "accuracy":
		// Sort by accuracy (highest first)
		for i := 0; i < len(users)-1; i++ {
			for j := i + 1; j < len(users); j++ {
				if users[i].Accuracy < users[j].Accuracy {
					users[i], users[j] = users[j], users[i]
				}
			}
		}
	case "num_posts":
		// Sort by number of posts judged (highest first)
		for i := 0; i < len(users)-1; i++ {
			for j := i + 1; j < len(users); j++ {
				if users[i].NumPosts < users[j].NumPosts {
					users[i], users[j] = users[j], users[i]
				}
			}
		}
	default: // "overall" or any other value
		// Sort by a weighted combination of accuracy and posts
		for i := 0; i < len(users)-1; i++ {
			for j := i + 1; j < len(users); j++ {
				// Calculate overall score (70% accuracy, 30% posts)
				scoreI := users[i].Accuracy*0.7 + float64(users[i].NumPosts)*0.3/5
				scoreJ := users[j].Accuracy*0.7 + float64(users[j].NumPosts)*0.3/5
				if scoreI < scoreJ {
					users[i], users[j] = users[j], users[i]
				}
			}
		}
	}
	
	// Limit to top 50 users for performance
	if len(users) > 50 {
		users = users[:50]
	}
	
	c.JSON(http.StatusOK, users)
}

// UpdateUserStats updates a user's stats such as accuracy and post count
func (uc *UserController) UpdateUserStats(c *gin.Context) {
	// Get username from JWT
	username := c.GetString("username")
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body with optional fields
	type UpdateStatsRequest struct {
		NumPosts         *int     `json:"num_posts,omitempty"`
		Accuracy         *float64 `json:"accuracy,omitempty"`
		CorrectJudgments *int     `json:"correct_judgments,omitempty"`
	}

	var req UpdateStatsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Verify at least one field is provided
	if req.NumPosts == nil && req.Accuracy == nil && req.CorrectJudgments == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one field to update must be provided"})
		return
	}

	// Find the user
	var user User
	err := uc.collection.FindOne(
		context.Background(),
		bson.M{"username": username},
	).Decode(&user)

	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Build update object only with provided fields
	updateFields := bson.M{}
	
	if req.NumPosts != nil {
		updateFields["num_posts"] = *req.NumPosts
	}
	
	if req.Accuracy != nil {
		updateFields["accuracy"] = *req.Accuracy
	}
	
	// Create update document
	update := bson.M{
		"$set": updateFields,
	}

	// Perform update
	_, err = uc.collection.UpdateOne(
		context.Background(),
		bson.M{"username": username},
		update,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update stats"})
		return
	}

	// Only update favorite category if we have post history
	if req.NumPosts != nil && user.PostHistory != nil && len(user.PostHistory) > 0 {
		categoryMap := make(map[string]int)
		
		// This is a simplification. In a real app, you'd track categories per post
		// Here we're just updating the fav_category field if we have post history data
		for _, judgment := range user.PostHistory {
			if judgment != "" {
				categoryMap[judgment]++
			}
		}
		
		// Find most frequent category
		var maxCount int
		var favCategory string
		for cat, count := range categoryMap {
			if count > maxCount {
				maxCount = count
				favCategory = cat
			}
		}
		
		if favCategory != "" {
			_, err = uc.collection.UpdateOne(
				context.Background(),
				bson.M{"username": username},
				bson.M{"$set": bson.M{"fav_category": favCategory}},
			)
			
			if err != nil {
				// Just log the error but continue
				fmt.Println("Failed to update favorite category:", err)
			}
		}
	}

	// Build response with updated fields
	response := gin.H{"message": "Stats updated successfully"}
	if req.NumPosts != nil {
		response["num_posts"] = *req.NumPosts
	}
	if req.Accuracy != nil {
		response["accuracy"] = *req.Accuracy
	}
	
	c.JSON(http.StatusOK, response)
}

// Helper function to validate and prepare user update
func validateAndPrepareUpdate(c *gin.Context, name, newUsername, currentPassword, newPassword, profilePicURL string, user User, uc *UserController) (bson.M, error) {
	updateFields := bson.M{}

	// Validate required fields
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return nil, errors.New("name is required")
	}
	updateFields["name"] = name

	// If username changed, verify it's unique
	if newUsername != "" && newUsername != user.Username {
		// Check if new username is already taken
		var existingUser User
		err := uc.collection.FindOne(
			context.Background(),
			bson.M{"username": newUsername},
		).Decode(&existingUser)

		if err == nil {
			// Username already exists
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username already taken"})
			return nil, errors.New("username already taken")
		} else if !errors.Is(err, mongo.ErrNoDocuments) {
			// Database error
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return nil, errors.New("database error")
		}

		updateFields["username"] = newUsername
	} else if newUsername == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
		return nil, errors.New("username is required")
	} else {
		updateFields["username"] = user.Username
	}

	// Handle password update if provided
	if newPassword != "" {
		if currentPassword == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Current password is required to update password"})
			return nil, errors.New("current password required")
		}

		// Verify current password
		err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
			return nil, errors.New("incorrect current password")
		}

		// Hash new password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return nil, errors.New("failed to hash password")
		}

		updateFields["password"] = string(hashedPassword)
	}

	// Update profile picture if provided
	if profilePicURL != "" && profilePicURL != user.PFP {
		updateFields["pfp"] = profilePicURL
	}

	return updateFields, nil
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
