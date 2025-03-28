package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"strings"
	"time"
	
	"golang.org/x/oauth2"
)

type RedditController struct {
	client *http.Client
}

func NewRedditController(clientID, clientSecret, username, password, userAgent string) (*RedditController, error) {
	config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Endpoint: oauth2.Endpoint{
			TokenURL: "https://www.reddit.com/api/v1/access_token",
		},
	}

	ctx := context.WithValue(context.Background(), oauth2.HTTPClient, &http.Client{
		Timeout: time.Second * 10,
	})

	// Add retry logic with exponential backoff
	var token *oauth2.Token
	var err error
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		token, err = config.PasswordCredentialsToken(ctx, username, password)
		if err == nil {
			break // Success, exit retry loop
		}
		
		if i == maxRetries-1 {
			return nil, fmt.Errorf("failed to get token after %d attempts: %v", maxRetries, err)
		}
		
		// Check if the error is due to rate limiting (429)
		if errMsg := err.Error(); len(errMsg) >= 3 && errMsg[:3] == "429" {
			// Calculate backoff with jitter to avoid thundering herd
			backoffSeconds := math.Pow(2, float64(i)) + rand.Float64()
			backoffDuration := time.Duration(backoffSeconds * float64(time.Second))
			
			fmt.Printf("Rate limited by Reddit. Retrying in %.2f seconds (attempt %d/%d)...\n", 
				backoffSeconds, i+1, maxRetries)
			time.Sleep(backoffDuration)
			continue
		}
		
		// For non-rate-limit errors, just return the error
		return nil, fmt.Errorf("failed to get token: %v", err)
	}

	client := config.Client(ctx, token)
	client.Transport = &userAgentTransport{
		userAgent: userAgent,
		base:      client.Transport,
	}

	return &RedditController{client: client}, nil
}

type userAgentTransport struct {
	userAgent string
	base      http.RoundTripper
}

func (t *userAgentTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Set("User-Agent", t.userAgent)
	return t.base.RoundTrip(req)
}

type Post struct {
    Title       string   `json:"title"`
    URL         string   `json:"url"`
    Score       int      `json:"score"`
    CreatedUTC  float64  `json:"created_utc"`
    Author      string   `json:"author"`
    NumComments int      `json:"num_comments"`
    SelfText    string   `json:"selftext"`
    Comments    []string `json:"comments"`
    PostID      string   `json:"id"`
    IsSelf      bool     `json:"is_self"`
}

func (rc *RedditController) GetSubredditPosts(subreddit string, limit int, timeFilter string) ([]Post, error) {
    validTimeFilters := map[string]bool{
        "hour": true, "day": true, "week": true, 
        "month": true, "year": true, "all": true,
    }
    if !validTimeFilters[timeFilter] {
        return nil, fmt.Errorf("invalid time filter: %s", timeFilter)
    }

    // Request more posts than needed to account for filtering
    apiLimit := limit + 5

    url := fmt.Sprintf("https://oauth.reddit.com/r/%s/top?limit=%d&t=%s&raw_json=1", 
        subreddit, apiLimit, timeFilter)

    resp, err := rc.client.Get(url)
    if err != nil {
        return nil, fmt.Errorf("request failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("reddit API error %d", resp.StatusCode)
    }

    var response struct {
        Data struct {
            Children []struct {
                Data Post `json:"data"`
            } `json:"children"`
        } `json:"data"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
        return nil, fmt.Errorf("failed to decode response: %w", err)
    }

    // Filter out open forum posts and limit to exact count requested
    filteredChildren := make([]struct {
        Data Post `json:"data"`
    }, 0, len(response.Data.Children))
    for _, child := range response.Data.Children {
        // Skip posts that contain open forum identifiers
        if strings.Contains(strings.ToLower(child.Data.Title), "open forum") || 
           strings.Contains(strings.ToLower(child.Data.Title), "monthly discussion") {
            continue
        }
        
        // Only include self posts (text posts)
        if !child.Data.IsSelf {
            continue
        }
        
        filteredChildren = append(filteredChildren, child)
        
        // Stop if we have enough posts
        if len(filteredChildren) >= limit {
            break
        }
    }

    posts := make([]Post, 0, len(filteredChildren))
    for _, child := range filteredChildren {
        post := child.Data

        // Get comments concurrently with a timeout
        commentsCh := make(chan []string)
        errCh := make(chan error)
        
        time.Sleep(1100 * time.Millisecond) // Reddit's 1 request/sec limit

        go func() {
            comments, err := rc.GetPostComments(post.PostID)
            if err != nil {
                errCh <- err
                return
            }
            commentsCh <- comments
        }()

        select {
        case comments := <-commentsCh:
            post.Comments = comments
        case err := <-errCh:
            fmt.Printf("Error fetching comments for %s: %v\n", post.PostID, err)
        case <-time.After(5 * time.Second):
            fmt.Printf("Timeout fetching comments for %s\n", post.PostID)
        }

        posts = append(posts, post)
    }

    return posts, nil
}

func (rc *RedditController) GetPostComments(postID string) ([]string, error) {
    url := fmt.Sprintf("https://oauth.reddit.com/comments/%s?limit=100", postID)
    
    resp, err := rc.client.Get(url)
    if err != nil {
        return nil, fmt.Errorf("failed to get comments: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("comments API returned status: %d", resp.StatusCode)
    }

    var response []json.RawMessage
    if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
        return nil, fmt.Errorf("failed to decode comments: %w", err)
    }

    if len(response) < 2 {
        return nil, fmt.Errorf("invalid comments response structure")
    }

    var comments struct {
        Data struct {
            Children []struct {
                Data struct {
                    Body string `json:"body"`
                } `json:"data"`
            } `json:"children"`
        } `json:"data"`
    }

    if err := json.Unmarshal(response[1], &comments); err != nil {
        return nil, fmt.Errorf("failed to parse comments: %w", err)
    }

    commentList := make([]string, 0)
    for _, child := range comments.Data.Children {
        if child.Data.Body != "" {
            commentList = append(commentList, child.Data.Body)
        }
    }

    return commentList, nil
}

// GetPost retrieves a specific post from Reddit by its ID
func (rc *RedditController) GetPost(postID string) (*Post, error) {
    // URL for fetching a single post by ID
    url := fmt.Sprintf("https://oauth.reddit.com/by_id/t3_%s", postID)
    
    resp, err := rc.client.Get(url)
    if err != nil {
        return nil, fmt.Errorf("failed to get post: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("post API returned status: %d", resp.StatusCode)
    }

    var response struct {
        Data struct {
            Children []struct {
                Data struct {
                    Title      string  `json:"title"`
                    URL        string  `json:"url"`
                    Score      int     `json:"score"`
                    CreatedUTC float64 `json:"created_utc"`
                    Author     string  `json:"author"`
                    NumComments int    `json:"num_comments"`
                    SelfText   string  `json:"selftext"`
                    ID         string  `json:"id"`
                    IsSelf     bool    `json:"is_self"`
                    Subreddit  string  `json:"subreddit"`
                } `json:"data"`
            } `json:"children"`
        } `json:"data"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
        return nil, fmt.Errorf("failed to decode post: %w", err)
    }

    // Check if we got valid data
    if len(response.Data.Children) == 0 {
        return nil, fmt.Errorf("post not found: %s", postID)
    }

    // Get the first child's data (should be only one for single post)
    postData := response.Data.Children[0].Data

    // Create the post object
    post := &Post{
        Title:       postData.Title,
        URL:         postData.URL,
        Score:       postData.Score,
        CreatedUTC:  postData.CreatedUTC,
        Author:      postData.Author,
        NumComments: postData.NumComments,
        SelfText:    postData.SelfText,
        PostID:      postData.ID,
        IsSelf:      postData.IsSelf,
    }

    // Fetch comments for this post
    comments, err := rc.GetPostComments(postID)
    if err != nil {
        // Log but don't fail if comments can't be fetched
        fmt.Printf("Warning: Could not fetch comments for post %s: %v\n", postID, err)
    } else {
        post.Comments = comments
    }

    return post, nil
}
