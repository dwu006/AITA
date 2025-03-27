package routes

import (
	"strconv"
	
	"github.com/gin-gonic/gin"
	"github.com/dwu006/aita/controller"
)

func RegisterRedditRoutes(router *gin.Engine, rc *controller.RedditController) {
	redditRoutes := router.Group("/api/posts")
	{
		redditRoutes.GET("/:subreddit", func(c *gin.Context) {
			subreddit := c.Param("subreddit")
			limit, _ := strconv.Atoi(c.DefaultQuery("limit", "1"))
			timeFilter := c.DefaultQuery("time_filter", "all")

			posts, err := rc.GetSubredditPosts(subreddit, limit, timeFilter)
			if err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}

			c.JSON(200, gin.H{
				"subreddit": subreddit,
				"count":     len(posts),
				"results":   posts,
			})
		})
		
		// New route to get a specific post by ID
		redditRoutes.GET("/id/:postId", func(c *gin.Context) {
			postID := c.Param("postId")
			
			post, err := rc.GetPost(postID)
			if err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			
			c.JSON(200, post)
		})
	}
}
