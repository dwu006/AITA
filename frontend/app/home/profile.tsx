import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Platform, Modal } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Feather } from "@expo/vector-icons"
import { useState, useEffect, useCallback } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { router, useFocusEffect } from "expo-router"

const SCREEN_WIDTH = Dimensions.get("window").width

// Function to get the base URL based on platform
const getBaseUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Use actual IP address for Expo Go
      return 'http://10.0.0.147:8080';
    } else if (Platform.OS === 'ios') {
      // Use actual IP address for iOS 
      return 'http://10.0.0.147:8080';
    } else {
      return 'http://localhost:8080'; // Web
    }
  }
  // Return production URL if not in development
  return 'https://your-production-server.com';
};

interface UserProfileData {
  name: string;
  username: string;
  num_posts: number;
  accuracy: number;
  fav_category: string;
  streak_count: number;
  pfp: string;
  streak_dates: string[];
  post_history?: Record<string, string>; // Map of post_id to judgment
}

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  upvotes: number;
  comments: number;
  tldr: string;
}

export default function Profile() {
  const [userData, setUserData] = useState<UserProfileData>({
    name: "",
    username: "",
    num_posts: 0,
    accuracy: 0,
    fav_category: "",
    streak_count: 0,
    pfp: "https://randomuser.me/api/portraits/women/43.jpg", // Default image
    streak_dates: [],
    post_history: {}
  })
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth] = useState("March 2025")
  const [daysWithActivity, setDaysWithActivity] = useState<number[]>([])
  const [apiUrl, setApiUrl] = useState('')
  const [activeInfoPopup, setActiveInfoPopup] = useState<string | null>(null)
  const [postHistory, setPostHistory] = useState<{post: Post; judgment: string}[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  
  // Standard useEffect to set up API URL once
  useEffect(() => {
    // Set API URL
    const url = getBaseUrl()
    console.log('Using API URL:', url)
    setApiUrl(url)
  }, [])
  
  // Use useFocusEffect to fetch profile data every time the screen becomes focused
  useFocusEffect(
    useCallback(() => {
      console.log('Profile screen focused, fetching data...')
      fetchUserProfile()
      return () => {
        // Clean up function if needed when screen loses focus
      }
    }, [apiUrl]) // Only re-run if apiUrl changes
  )

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken")
      
      if (!token) {
        // Redirect to login if no token
        console.log('No auth token found, redirecting to login')
        router.replace("/login")
        return
      }

      // Get API URL if not set yet
      const url = apiUrl || getBaseUrl()
      console.log('Fetching profile from:', `${url}/api/user/profile`)
      console.log('Using auth token:', token)
      
      const response = await fetch(`${url}/api/user/profile`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      console.log('Profile response status:', response.status)
      
      if (!response.ok) {
        console.log('Profile fetch failed with status:', response.status)
        if (response.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem("authToken")
          router.replace("/login")
          return
        }
        throw new Error("Failed to fetch profile data")
      }

      const data = await response.json()
      console.log('Profile data received:', data)
      
      // Check if the data has a user property (matches our backend response structure)
      const userData = data.user || data
      
      // Update user data state
      setUserData({
        name: userData.name || "",
        username: userData.username || "",
        num_posts: userData.num_posts || 0,
        accuracy: userData.accuracy || 0,
        fav_category: userData.fav_category || "None",
        streak_count: userData.streak_count || 0,
        pfp: userData.pfp || "https://randomuser.me/api/portraits/women/43.jpg",
        streak_dates: userData.streak_dates || [],
        post_history: userData.post_history || {}
      })

      // Update calendar data
      if (userData.streak_dates && Array.isArray(userData.streak_dates)) {
        // Convert date strings to day numbers for the current month
        const currentDate = new Date()
        const currentMonthNumber = currentDate.getMonth()
        const currentYear = currentDate.getFullYear()
        
        const activityDays = userData.streak_dates
          .map((dateStr: string) => new Date(dateStr))
          .filter((date: Date) => date.getMonth() === currentMonthNumber && date.getFullYear() === currentYear)
          .map((date: Date) => date.getDate())
        
        setDaysWithActivity(activityDays)
      }
      
      // Fetch post history details if available
      if (userData.post_history && Object.keys(userData.post_history).length > 0) {
        fetchPostDetails(userData.post_history, token);
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching profile:", error)
      setIsLoading(false)
    }
  }

  const fetchPostDetails = async (postHistory: Record<string, string>, token: string) => {
    try {
      setLoadingPosts(true);
      const url = apiUrl || getBaseUrl();
      const postIds = Object.keys(postHistory);
      
      console.log('Fetching post history for IDs:', postIds);
      
      // Get details for each post in the history
      const postsWithJudgments = await Promise.all(
        postIds.map(async (postId) => {
          try {
            // Use the new endpoint for fetching a single post by ID
            console.log(`Fetching post ${postId} from ${url}/api/posts/id/${postId}`);
            
            const response = await fetch(`${url}/api/posts/id/${postId}`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }
            });
            
            if (!response.ok) {
              console.log(`Failed to fetch post ${postId}: ${response.status}`);
              return null;
            }
            
            // The response is now directly a post object (not wrapped)
            const post = await response.json();
            console.log(`Post data for ${postId}:`, post);
            
            return {
              post: {
                id: postId,
                title: post.Title || '',
                content: post.SelfText || '',
                category: getPostCategory(post.Title, post.SelfText), // Extract category from post
                upvotes: post.Score || 0,
                comments: post.NumComments || 0,
                tldr: extractTLDR(post.SelfText) || '' // Extract TLDR from self text
              },
              judgment: postHistory[postId]
            };
          } catch (error) {
            console.error(`Error fetching post ${postId}:`, error);
            return null;
          }
        })
      );
      
      // Filter out failed fetches and set state
      const validPosts = postsWithJudgments.filter(item => item !== null);
      console.log('Valid posts processed:', validPosts.length);
      setPostHistory(validPosts);
    } catch (error) {
      console.error("Error fetching post details:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Helper function to extract TLDR from post content
  const extractTLDR = (content: string) => {
    if (!content) return '';
    
    // Look for common TLDR patterns
    const tldrPatterns = [
      /TL;DR:?\s*([^\n]+)/i,
      /TLDR:?\s*([^\n]+)/i,
      /Summary:?\s*([^\n]+)/i
    ];
    
    for (const pattern of tldrPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no TLDR found, return empty string
    return '';
  };

  // Helper function to determine post category from title and content
  const getPostCategory = (title: string, content: string) => {
    const fullText = (title + ' ' + content).toLowerCase();
    
    // Check for common AITA categories
    if (fullText.includes('family') || fullText.includes('parent') || 
        fullText.includes('child') || fullText.includes('mom') || 
        fullText.includes('dad') || fullText.includes('brother') || 
        fullText.includes('sister')) {
      return 'Family';
    } else if (fullText.includes('relationship') || fullText.includes('girlfriend') || 
               fullText.includes('boyfriend') || fullText.includes('wife') || 
               fullText.includes('husband') || fullText.includes('partner') || 
               fullText.includes('dating')) {
      return 'Relationships';
    } else if (fullText.includes('work') || fullText.includes('boss') || 
               fullText.includes('coworker') || fullText.includes('job') || 
               fullText.includes('career') || fullText.includes('colleague')) {
      return 'Work';
    } else if (fullText.includes('friend') || fullText.includes('roommate') || 
               fullText.includes('neighbor')) {
      return 'Friendships';
    } else if (fullText.includes('money') || fullText.includes('finance') || 
               fullText.includes('debt') || fullText.includes('loan') || 
               fullText.includes('pay') || fullText.includes('cost')) {
      return 'Money';
    } else if (fullText.includes('wedding') || fullText.includes('party') || 
               fullText.includes('event') || fullText.includes('celebration')) {
      return 'Events';
    }
    
    // Default category
    return 'Other';
  };

  const renderPostHistory = () => {
    if (loadingPosts) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your judgment history...</Text>
        </View>
      );
    }
    
    if (postHistory.length === 0) {
      return (
        <View style={styles.emptyHistoryContainer}>
          <Text style={styles.emptyHistoryText}>You haven't judged any posts yet.</Text>
        </View>
      );
    }
    
    console.log('Rendering post history with items:', postHistory.length);
    
    return postHistory.map((item, index) => {
      console.log(`Post item ${index}:`, item);
      
      // Get content safely with fallbacks
      const content = item.post.tldr || (item.post.content ? item.post.content.substring(0, 120) + '...' : 'No content available');
      
      // Log the specific field we're trying to use
      console.log(`Post ${index} title:`, item.post.title);
      
      return (
        <View key={`post-${item.post.id}-${index}`} style={[styles.postHistoryItem, index < postHistory.length - 1 && styles.postHistoryItemBorder]}>
          <View style={styles.postHistoryHeader}>
            <Text style={styles.postHistoryTitle} numberOfLines={1}>{item.post.title || 'Untitled Post'}</Text>
            <View style={[styles.judgmentBadge, item.judgment === 'YTA' ? styles.ytaBadge : styles.ntaBadge]}>
              <Text style={styles.judgmentBadgeText}>{item.judgment}</Text>
            </View>
          </View>
          <Text style={styles.postHistoryCategory}>{item.post.category || 'Uncategorized'}</Text>
          <Text style={styles.postHistoryContent} numberOfLines={3}>{content}</Text>
        </View>
      );
    });
  };

  const renderCalendar = () => {
    const days = []
    // Generate 31 days for the month
    for (let i = 1; i <= 31; i++) {
      const isActive = daysWithActivity.includes(i)
      // Add specific styling for days 29, 30, 31 to fix spacing issue
      const isLastDays = i >= 29 && i <= 31
      days.push(
        <TouchableOpacity 
          key={i} 
          style={[
            styles.calendarDay, 
            isActive && styles.activeDay,
            isLastDays && styles.lastDays
          ]}
          disabled={true}
        >
          <Text style={[styles.calendarDayText, isActive && styles.activeDayText]}>{i}</Text>
        </TouchableOpacity>
      )
    }
    
    return (
      <View style={styles.calendarContainer}>
        <Text style={styles.calendarTitle}>{currentMonth}</Text>
        <View style={styles.calendarGrid}>
          {days}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('../settings' as any)}
        >
          <Feather name="settings" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <View style={styles.profileSection}>
            {/* Profile Picture and Username */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={{ uri: userData.pfp }} 
                  style={styles.avatar} 
                />
                {/* Removing edit button from profile since it will be in settings */}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.username}>{userData.name}</Text>
                <Text style={styles.handle}>@{userData.username}</Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsContainer}>
              {/* Judged Section - First Position */}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userData.num_posts}</Text>
                <View style={styles.statLabelContainer}>
                  <Text style={styles.statLabel}>Judged</Text>
                  <TouchableOpacity 
                    style={styles.infoButton}
                    onPress={() => setActiveInfoPopup('judged')}
                  >
                    <Feather name="help-circle" size={14} color="#718096" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.statDivider} />
              
              {/* Accuracy Section - Second Position */}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userData.accuracy}%</Text>
                <View style={styles.statLabelContainer}>
                  <Text style={styles.statLabel}>Accuracy</Text>
                  <TouchableOpacity 
                    style={styles.infoButton}
                    onPress={() => setActiveInfoPopup('accuracy')}
                  >
                    <Feather name="help-circle" size={14} color="#718096" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.statDivider} />
              
              {/* Top Category Section - Third Position (unchanged) */}
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.categoryValue]} numberOfLines={1}>
                  {userData.fav_category || "None"}
                </Text>
                <View style={styles.statLabelContainer}>
                  <Text style={styles.statLabel}>Top Category</Text>
                  <TouchableOpacity 
                    style={styles.infoButton}
                    onPress={() => setActiveInfoPopup('category')}
                  >
                    <Feather name="help-circle" size={14} color="#718096" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Info Popups */}
            <Modal
              transparent={true}
              visible={activeInfoPopup !== null}
              animationType="fade"
              onRequestClose={() => setActiveInfoPopup(null)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setActiveInfoPopup(null)}
              >
                {activeInfoPopup === 'judged' && (
                  <View style={styles.popupContainer}>
                    <View style={styles.popup}>
                      <Text style={styles.popupTitle}>Posts Judged</Text>
                      <Text style={styles.popupText}>
                        This is the total number of AITA posts you have judged.
                      </Text>
                      <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={() => setActiveInfoPopup(null)}
                      >
                        <Text style={styles.closeButtonText}>OK</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {activeInfoPopup === 'accuracy' && (
                  <View style={styles.popupContainer}>
                    <View style={styles.popup}>
                      <Text style={styles.popupTitle}>Accuracy Score</Text>
                      <Text style={styles.popupText}>
                        This score shows how often your judgment matches the community consensus.
                      </Text>
                      <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={() => setActiveInfoPopup(null)}
                      >
                        <Text style={styles.closeButtonText}>OK</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {activeInfoPopup === 'category' && (
                  <View style={styles.popupContainer}>
                    <View style={styles.popup}>
                      <Text style={styles.popupTitle}>Top Category</Text>
                      <Text style={styles.popupText}>
                        This is the category of posts where you have the highest activity or accuracy.
                      </Text>
                      <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={() => setActiveInfoPopup(null)}
                      >
                        <Text style={styles.closeButtonText}>OK</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </Modal>

            {/* Streak Calendar */}
            <View style={styles.streakSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Streak</Text>
                <Text style={styles.streakCount}> {userData.streak_count} days</Text>
              </View>
              {renderCalendar()}
            </View>
            
            {/* Post History Section - Temporarily commented out
            <View style={styles.postHistorySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Judgments</Text>
                <Text style={styles.historyCount}>{userData.num_posts || 0} posts</Text>
              </View>
              <View style={styles.postHistoryList}>
                {renderPostHistory()}
              </View>
            </View>
            */}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E2E8F0",
  },
  profileInfo: {
    marginLeft: 16,
  },
  username: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A202C",
    marginBottom: 4,
  },
  handle: {
    fontSize: 16,
    color: "#718096",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#F7FAFC",
    borderRadius: 12,
    padding: 10,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 2,
  },
  categoryValue: {
    fontSize: 16,
    maxWidth: '100%',
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
  },
  statLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButton: {
    marginLeft: 2,
    padding: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E2E8F0',
  },
  streakSection: {
    backgroundColor: "#F7FAFC",
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A202C",
  },
  streakCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF4500",
  },
  calendarContainer: {
    marginBottom: 8,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A5568",
    marginBottom: 12,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  calendarDay: {
    width: (SCREEN_WIDTH - 50) / 7,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: "#4A5568",
  },
  activeDay: {
    backgroundColor: "#FF4500",
  },
  activeDayText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  lastDays: {
    // Fix spacing issue for days 29-31
    marginRight: 0,
    marginLeft: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 300,
  },
  loadingText: {
    fontSize: 16,
    color: "#718096",
  },
  // Popup styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    width: '80%',
    padding: 20,
  },
  popup: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1A202C',
  },
  popupText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4A5568',
    marginBottom: 15,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FF4500',
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  postHistorySection: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  historyCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginLeft: 8,
  },
  postHistoryList: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    padding: 12,
  },
  postHistoryItem: {
    paddingVertical: 12,
  },
  postHistoryItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    marginBottom: 12,
  },
  postHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  postHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
    marginRight: 10,
  },
  postHistoryCategory: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 6,
  },
  postHistoryContent: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  emptyHistoryContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  judgmentBadge: {
    padding: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  ytaBadge: {
    backgroundColor: '#FF4500',
  },
  ntaBadge: {
    backgroundColor: '#34C759',
  },
  judgmentBadgeText: {
    color: '#FFFFFF',
  },
})
