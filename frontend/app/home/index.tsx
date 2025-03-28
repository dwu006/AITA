import React, { useState, useEffect, useRef, useCallback } from "react"
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder, TouchableOpacity, Alert, ScrollView, Image, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter, useFocusEffect } from "expo-router"
import { Feather } from "@expo/vector-icons"
import { FilterModal } from "../../components/filter"

// Placeholder function until you recreate the actual module files
const useSession = () => {
  return {
    signOut: () => {},
    authState: { isAuthenticated: true, userId: '123' }
  }
}

// Placeholder for API URL until you recreate the actual module
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    // For Android use the IP address
    return 'http://10.0.0.147:8080';
  } else if (Platform.OS === 'ios') {
    // For iOS use the IP address
    return 'http://10.0.0.147:8080';
  }
  // For web or fallback
  return 'http://localhost:8080';
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")
const SWIPE_THRESHOLD = 30; // Further reduced for easier detection

// Define the Post interface to fix TypeScript errors
interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  categories: string[];
  upvotes: number;
  comments: number;
  tldr: string;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showTldr, setShowTldr] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [lastJudgment, setLastJudgment] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [lastSwipedPost, setLastSwipedPost] = useState<Post | null>(null)
  const [communityStats, setCommunityStats] = useState({ yesPercent: 50, noPercent: 50 })
  const [aiJudgment, setAiJudgment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [judgedPostIds, setJudgedPostIds] = useState<Set<string>>(new Set())

  const position = useRef(new Animated.ValueXY()).current

  // Update the useEffect for checking auth token
  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        try {
          const token = await AsyncStorage.getItem('authToken');
          console.log("Auth token found:", token ? "Yes" : "No");
          setAuthToken(token);
          fetchPosts();
        } catch (error) {
          console.error("Error retrieving auth token:", error);
        }
      };
      checkAuth();
    }, [])
  );
  const addPostToHistory = async (postId: string, judgment: 'YTA' | 'NTA') => {
    try {
      // Get fresh token in case it changed
      const freshToken = await AsyncStorage.getItem('authToken');
      
      if (!freshToken) {
        console.log("User not logged in, skipping history update");
        return;
      }
  
      const baseUrl = getBaseUrl();
      console.log(`Saving judgment "${judgment}" for post ${postId}...`);
  
      const response = await fetch(`${baseUrl}/api/user/post-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshToken}`
        },
        body: JSON.stringify({
          post_id: postId,
          judgment: judgment
        }),
      });
  
      const responseData = await response.json();
  
      if (!response.ok) {
        console.error('API Error:', {
          status: response.status,
          error: responseData.error || 'Unknown error'
        });
        return;
      }
  
      console.log('Successfully saved to history:', responseData);
    } catch (error) {
      console.error('Network/post-history error:', error);
      // Optional: Add retry logic here if needed
    }
  };
  

  // Update the panResponder to make it more responsive
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gesture) => {
        // Only start pan responder for horizontal swipes greater than 10px
        // This will allow vertical scrolling to work normally
        return Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 10;
      },
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only take over if the movement is primarily horizontal
        return Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 10;
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
        // Update the swipe direction for visual feedback
        if (gesture.dx > 20) {
          setSwipeDirection('right');
        } else if (gesture.dx < -20) {
          setSwipeDirection('left');
        } else {
          setSwipeDirection(null);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        // Log the gesture details for debugging
        console.log(`Gesture release: dx=${gesture.dx}, threshold=${SWIPE_THRESHOLD}`);
        
        if (gesture.dx > SWIPE_THRESHOLD) {
          console.log("Detected right swipe gesture");
          // swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          console.log("Detected left swipe gesture");
          // swipeLeft();
        } else {
          console.log("Resetting position - below threshold");
          // resetPosition();
        }
      },
    })
  ).current;

  // Simplified swipe functions
  const swipeLeft = () => {
    console.log("Executing swipeLeft function");
    // Check if there are posts and if currentIndex is valid
    if (posts && posts.length > 0 && currentIndex < posts.length) {
      const currentPost = posts[currentIndex];
      console.log(`Swiped LEFT (YTA) on post ${currentPost.id}`);
      
      // If in confirmation mode, move to the next post
      if (showConfirmation) {
        setShowConfirmation(false);
        setCurrentIndex(currentIndex + 1);
        position.setValue({ x: 0, y: 0 });
        return;
      }
      
      // Immediately animate the card away
      // Animated.timing(position, {
      //   toValue: { x: -SCREEN_WIDTH * 1.5, y: 0 },
      //   duration: 300,
      //   useNativeDriver: false,
      // }).start(() => {
      //   console.log("Left swipe animation completed");
      //   // Add judgment to history
      //   addPostToHistory(currentPost.id, "YTA");
        
      //   // Get community stats and AI judgment
      //   getCommunityStats(currentPost.id);
      //   fetchAiJudgment(currentPost.content);
        
      //   // Save the current post and judgment for confirmation
      //   setLastSwipedPost(currentPost);
      //   setLastJudgment("YTA");
      //   setShowConfirmation(true);
      //   position.setValue({ x: 0, y: 0 });
      // });
    } else {
      console.log("No posts available or currentIndex out of bounds");
      position.setValue({ x: 0, y: 0 });
    }
  };

  const swipeRight = () => {
    console.log("Executing swipeRight function");
    // Check if there are posts and if currentIndex is valid
    if (posts && posts.length > 0 && currentIndex < posts.length) {
      const currentPost = posts[currentIndex];
      console.log(`Swiped RIGHT (NTA) on post ${currentPost.id}`);
      
      // If in confirmation mode, move to the next post
      if (showConfirmation) {
        setShowConfirmation(false);
        setCurrentIndex(currentIndex + 1);
        position.setValue({ x: 0, y: 0 });
        return;
      }
      
      // Immediately animate the card away
      // Animated.timing(position, {
      //   toValue: { x: SCREEN_WIDTH * 1.5, y: 0 },
      //   duration: 300,
      //   useNativeDriver: false,
      // }).start(() => {
      //   console.log("Right swipe animation completed");
      //   // Add judgment to history
      //   addPostToHistory(currentPost.id, "NTA");
        
      //   // Get community stats and AI judgment
      //   getCommunityStats(currentPost.id);
      //   fetchAiJudgment(currentPost.content);
        
      //   // Save the current post and judgment for confirmation
      //   setLastSwipedPost(currentPost);
      //   setLastJudgment("NTA");
      //   setShowConfirmation(true);
      //   position.setValue({ x: 0, y: 0 });
      // });
    } else {
      console.log("No posts available or currentIndex out of bounds");
      position.setValue({ x: 0, y: 0 });
    }
  };

  const resetPosition = () => {
    // Animated.spring(position, {
    //   toValue: { x: 0, y: 0 },
    //   friction: 5,
    //   useNativeDriver: false,
    // }).start();
    setSwipeDirection(null);
    setIsExpanded(false);
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 2, 0, SCREEN_WIDTH * 2],
      outputRange: ["-120deg", "0deg", "120deg"],
    })

    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    }
  }

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      // Add limit=3 to fetch only 3 posts
      const response = await fetch('https://www.reddit.com/r/AmItheAsshole.json?limit=3')
      const data = await response.json()
      
      // Map the Reddit posts to our format
      const fetchedPosts = await Promise.all(data.data.children.slice(0, 3).map(async (child: any) => {
        const postContent = child.data.selftext;
        let tldrText = ""; // Default empty TLDR
        
        // Fetch TLDR for the post
        try {
          const baseUrl = getBaseUrl();
          console.log("Using API base URL:", baseUrl);
          
          const tldrResponse = await fetch(`${baseUrl}/api/gemini/tldr`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
              post_content: postContent,
            }),
          });
          
          if (tldrResponse.ok) {
            const tldrData = await tldrResponse.json();
            tldrText = tldrData.tldr || '';
            console.log("Received TLDR:", tldrText);
          } else {
            console.error("TLDR API error status:", tldrResponse.status);
            const errorText = await tldrResponse.text();
            console.error("TLDR API error:", errorText);
          }
        } catch (error) {
          console.error('Error fetching TLDR:', error);
        }
        
        // Generate tags for the post
        let categories = [];
        try {
          // Generate AI tags
          const aiTags = await generateTags(postContent);
          console.log("AI generated tags:", aiTags);
          
          categories = aiTags;
          
          // If no categories were found, use a default
          if (categories.length === 0) {
            categories = ["Uncategorized"];
          }
          
        } catch (error) {
          console.error('Error generating tags:', error);
          categories = ["Uncategorized"];
        }
        
        // Return the full post object with TLDR and categories
        return {
          id: child.data.id,
          title: child.data.title,
          content: child.data.selftext,
          tldr: tldrText,
          category: categories[0], // Primary category
          categories: categories,  // All categories
          upvotes: child.data.ups,
          comments: child.data.num_comments,
        };
      }));
      
      console.log(`Loaded ${fetchedPosts.length} posts with TLDRs and tags`);
      setPosts(fetchedPosts);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const getCommunityStats = async (postId: string) => {
    try {
      // Call the backend endpoint to analyze comments
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/gemini/analyze-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          post_id: postId
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Use the actual counts to calculate percentages
        const ytaCount = data.yta_count || 0;
        const ntaCount = data.nta_count || 0;
        const total = ytaCount + ntaCount;
        
        if (total > 0) {
          const yesPercent = Math.round((ytaCount / total) * 100);
          const noPercent = Math.round((ntaCount / total) * 100);
          const stats = { yesPercent, noPercent };
          setCommunityStats(stats);
          
          // Check if user's judgment matches community consensus
          if (lastJudgment) {
            const communityConsensus = yesPercent > noPercent ? "YTA" : "NTA";
            const isCorrect = communityConsensus === lastJudgment;
            console.log(`User judgment: ${lastJudgment}, Community consensus: ${communityConsensus}, Correct: ${isCorrect}`);
          }
        } else {
          // If no comments are analyzed, default to 50/50
          setCommunityStats({ yesPercent: 50, noPercent: 50 });
        }
      } else {
        // Use default values if there's an error
        setCommunityStats({ yesPercent: 50, noPercent: 50 });
      }
    } catch (error) {
      console.error('Error fetching community stats:', error);
      setCommunityStats({ yesPercent: 50, noPercent: 50 });
    }
  };

  const fetchAiJudgment = async (postContent: string) => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/gemini/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          input: postContent
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiJudgment(data.judgment || "Unable to generate AI judgment");
      } else {
        setAiJudgment("Unable to generate AI judgment");
      }
    } catch (error) {
      console.error("Error fetching AI judgment:", error);
      setAiJudgment("Unable to generate AI judgment");
    }
  };

  // Function to generate tags for a post using AI
  const generateTags = async (postContent: string): Promise<string[]> => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/gemini/generate-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          content: postContent
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Parse the JSON string returned by the API
        try {
          let tags;
          // Handle case where tags might be a string representation of JSON
          if (typeof data.tags === 'string') {
            tags = JSON.parse(data.tags);
          } else {
            tags = data.tags;
          }
          
          if (Array.isArray(tags)) {
            return tags;
          } else {
            console.error("Invalid tags format:", tags);
            return [];
          }
        } catch (parseError) {
          console.error("Error parsing tags:", parseError);
          return [];
        }
      } else {
        console.error("Failed to generate tags:", response.status);
        return [];
      }
    } catch (error) {
      console.error("Error generating tags:", error);
      return [];
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (posts && posts.length > 0 && currentIndex < posts.length) {
      const currentPost = posts[currentIndex];
      const judgment = direction === 'left' ? 'YTA' : 'NTA';
      
      // Add judgment to history
      await addPostToHistory(currentPost.id, judgment);
      
      // Get community stats and AI judgment
      await getCommunityStats(currentPost.id);
      await fetchAiJudgment(currentPost.content);
      
      // Check if this post has been judged before
      if (!judgedPostIds.has(currentPost.id)) {
        // Update user stats for a new post judgment
        const communityJudgment = communityStats.yesPercent > communityStats.noPercent ? 'YTA' : 'NTA';
        const isCorrect = judgment === communityJudgment;
        await updateAccuracyStats(isCorrect);
        
        // Mark this post as judged so we don't count it again
        const newJudgedPostIds = new Set(judgedPostIds);
        newJudgedPostIds.add(currentPost.id);
        setJudgedPostIds(newJudgedPostIds);
      }
      
      // Save the current post and judgment for confirmation
      setLastSwipedPost(currentPost);
      setLastJudgment(judgment);
      setShowConfirmation(true);
    }
  };

  const updateAccuracyStats = async (isCorrect: boolean) => {
    try {
      // Get current user profile
      const userData = await AsyncStorage.getItem('userProfile');
      let profile: any = {};
      
      if (userData) {
        profile = JSON.parse(userData);
      } else {
        // Initialize with default values if no profile exists
        profile = {
          num_posts: 0,
          correct_judgments: 0,
          accuracy: 0
        };
      }

      // Update stats
      profile.num_posts = (profile.num_posts || 0) + 1;
      profile.correct_judgments = (profile.correct_judgments || 0) + (isCorrect ? 1 : 0);
      profile.accuracy = Math.round((profile.correct_judgments / profile.num_posts) * 100);

      // Save to local storage
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));

      // Update server stats if user is logged in
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try {
          const baseUrl = getBaseUrl();
          const response = await fetch(`${baseUrl}/api/user/update-stats`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              num_posts: profile.num_posts,
              accuracy: profile.accuracy,
              correct_judgments: profile.correct_judgments
            }),
          });

          if (!response.ok) {
            console.error('Failed to update user stats on server');
          }
        } catch (error) {
          console.error('Error updating user stats:', error);
        }
      }
    } catch (error) {
      console.error('Error updating accuracy stats:', error);
    }
  };

  const renderCards = () => {
    // If showing confirmation card, render that instead of normal cards
    if (showConfirmation && lastSwipedPost) {
      return (
        <View style={styles.cardOriginal}>
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{lastSwipedPost.title}</Text>
              
              <View style={styles.judgmentSummary}>
                <Text style={styles.judgmentSummaryTitle}>Your Judgment</Text>
                <View style={[
                  styles.judgmentBadge, 
                  lastJudgment === "YTA" ? styles.ytaBadge : styles.ntaBadge
                ]}>
                  <Text style={styles.judgmentBadgeText}>{lastJudgment}</Text>
                </View>
              </View>
              
              <View style={styles.separator} />
              
              <View style={styles.statSection}>
                <Text style={styles.sectionTitle}>Community Result</Text>
                <View style={styles.statBarContainer}>
                  <View style={[styles.statBar, styles.ytaBar, { flex: communityStats.yesPercent }]} />
                  <View style={[styles.statBar, styles.ntaBar, { flex: communityStats.noPercent }]} />
                </View>
                <View style={styles.statLabels}>
                  <Text style={styles.statLabel}>YTA: {communityStats.yesPercent}%</Text>
                  <Text style={styles.statLabel}>NTA: {communityStats.noPercent}%</Text>
                </View>
              </View>
              
              <View style={styles.separator} />
              
              <View style={styles.aiSection}>
                <Text style={styles.sectionTitle}>AI Judgment</Text>
                <Text style={styles.aiJudgmentText}>{aiJudgment}</Text>
              </View>
              
              {/* Add some padding at the bottom to ensure scrollability for long content */}
              <View style={{ height: 60 }} />
            </View>
          </ScrollView>
        </View>
      );
    }

    return posts.map((item, index) => {
      if (index < currentIndex) return null
      if (index > currentIndex) return null

      if (index === currentIndex) {
        return (
          <View
            key={item.id}
            style={styles.card}
          >
            <ScrollView 
              style={styles.contentScrollView} 
              contentContainerStyle={styles.contentContainer}
              scrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.cardHeader}>
                <ScrollView 
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryTagsContainer}
                >
                  {item.categories.map((tag, tagIndex) => (
                    <View key={tagIndex} style={styles.categoryTag}>
                      <Text style={styles.categoryText}>{tag}</Text>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity 
                  style={styles.tldrButton} 
                  onPress={() => {
                    setShowTldr(!showTldr)
                  }}
                >
                  <Text style={styles.tldrButtonText}>TLDR</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              
              <View style={styles.postContentContainer}>
                <Text style={styles.cardContentText}>
                  {showTldr ? item.tldr : item.content}
                </Text>
              </View>
              
              {/* Add some padding at the bottom to ensure scrollability for long content */}
              <View style={{ height: 60 }} />
            </ScrollView>
          </View>
        )
      }

      return null
    }).reverse()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoTitleContainer}>
          <Image 
            source={require('../../assets/images/aitalogo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitlePart, styles.orangeText]}>AI</Text>
            <Text style={[styles.headerTitlePart, styles.greenText]}>TA</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Feather name="filter" size={22} color="#4A5568" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardsContainer}>
        {isLoading ? (
          <View style={styles.noMoreCards}>
            <Text style={styles.noMoreCardsText}>Loading...</Text>
          </View>
        ) : renderCards()}
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.ytaButton, { width: 90 }]} 
          onPress={() => {
            if (showConfirmation) {
              // If on confirmation screen, move to next post
              setShowConfirmation(false);
              setCurrentIndex(currentIndex + 1);
            } else {
              // If on regular post, judge as YTA
              handleSwipe('left');
            }
          }}
        >
          <Feather name="thumbs-down" size={18} color="#FFF" />
          <Text style={styles.buttonText}>YTA</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.ntaButton, { width: 90 }]} 
          onPress={() => {
            if (showConfirmation) {
              // If on confirmation screen, move to next post
              setShowConfirmation(false);
              setCurrentIndex(currentIndex + 1);
            } else {
              // If on regular post, judge as NTA
              handleSwipe('right');
            }
          }}
        >
          <Feather name="thumbs-up" size={18} color="#FFF" />
          <Text style={styles.buttonText}>NTA</Text>
        </TouchableOpacity>
      </View>
      
      <FilterModal visible={showFilterModal} onClose={() => setShowFilterModal(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
    borderBottomWidth: 0,
  },
  logoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
  },
  headerTitlePart: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  orangeText: {
    color: '#FF4500',
  },
  greenText: {
    color: '#4CAF50',
  },
  filterButton: {
    padding: 8,
    backgroundColor: "#F7FAFC",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 10,
  },
  card: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    width: SCREEN_WIDTH - 40,
    minHeight: 400,
    maxHeight: SCREEN_HEIGHT - 200, 
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  cardOriginal: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    width: SCREEN_WIDTH - 40,
    minHeight: 400,
    maxHeight: SCREEN_HEIGHT - 200, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  scrollContainer: {
    flex: 1,
    paddingBottom: 60, 
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 70,
  },
  contentScrollView: {
    flex: 1,
    padding: 20,
    maxHeight: SCREEN_HEIGHT - 180, 
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  cardContent: {
    padding: 20,
    paddingBottom: 30,
  },
  cardContentText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginTop: 0,
    marginBottom: 0,
  },
  postContentContainer: {
    backgroundColor: '#FAFAFA',
    padding: 18,
    borderRadius: 12,
    marginTop: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  categoryTagsContainer: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: '70%',
  },
  categoryTag: {
    backgroundColor: "#FF4500",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  tldrButton: {
    backgroundColor: "#4A5568",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tldrButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A202C",
    marginBottom: 16,
    lineHeight: 32,
    marginTop: 12,
  },
  noMoreCards: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 30,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noMoreCardsText: {
    fontSize: 24,
    color: "#2D3748",
    marginBottom: 24,
    fontWeight: "600",
  },
  refreshButton: {
    backgroundColor: "#FF4500",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    position: "absolute",
    bottom: 40,
    paddingHorizontal: 20,
    marginTop: 30,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 30,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  ytaButton: {
    backgroundColor: "#FF4500",
  },
  ntaButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
    width: '100%',
  },
  judgmentSummary: {
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 10,
  },
  judgmentSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  judgmentBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  ytaBadge: {
    backgroundColor: "#FF4500",
  },
  ntaBadge: {
    backgroundColor: "#4CAF50",
  },
  judgmentBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statSection: {
    width: '100%',
    marginVertical: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  statBarContainer: {
    height: 24,
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  statBar: {
    height: '100%',
  },
  ytaBar: {
    backgroundColor: "#FF4500",
  },
  ntaBar: {
    backgroundColor: "#4CAF50",
  },
  statLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 14,
    color: '#505050',
  },
  aiSection: {
    marginTop: 10,
    marginBottom: 10,
    width: '100%',
    minHeight: 50, // Minimum height
    paddingHorizontal: 5, // Add some padding for text
  },
  aiJudgmentText: {
    marginTop: 8,
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24, // Increased line height for better readability
    flexWrap: 'wrap', // Ensure text wraps properly
  },
})
