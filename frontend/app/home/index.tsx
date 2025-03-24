import { useState, useRef, useEffect } from "react"
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Feather } from "@expo/vector-icons"
import { FilterModal } from "../../components/filter"

const SCREEN_WIDTH = Dimensions.get("window").width
const SCREEN_HEIGHT = Dimensions.get("window").height
const SWIPE_THRESHOLD = 120

export default function Home() {
  const [posts, setPosts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const position = useRef(new Animated.ValueXY()).current

  useEffect(() => {
    fetchPosts()
  }, [])

  const panResponder = useRef(
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onPanResponderMove: (_, gesture) => {
            position.setValue({ x: gesture.dx, y: gesture.dy })
          },
          onPanResponderRelease: (_, gesture) => {
            if (gesture.dx > SWIPE_THRESHOLD) {
              swipeRight()
            } else if (gesture.dx < -SWIPE_THRESHOLD) {
              swipeLeft()
            } else {
              resetPosition()
            }
          },
        })
      ).current
    
    const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH * 2, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setCurrentIndex((prev) => prev + 1)
      position.setValue({ x: 0, y: 0 })
    })
  }

  const swipeRight = () => {
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH * 2, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setCurrentIndex((prev) => prev + 1)
      position.setValue({ x: 0, y: 0 })
    })
  }

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start()
  }

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
    try {
      const response = await fetch('https://www.reddit.com/r/AmItheAsshole.json')
      const data = await response.json()
      const fetchedPosts = data.data.children.map((child: any) => ({
        id: child.data.id,
        title: child.data.title,
        content: child.data.selftext,
        category: child.data.link_flair_text || "Uncategorized",
        upvotes: child.data.ups,
        comments: child.data.num_comments,
      }))
      setPosts(fetchedPosts)
    } catch (error) {
      console.error("Error fetching posts:", error)
    }
  }

  // ... rest of the component code (panResponder, swipe functions, etc.)

  const renderCards = () => {
    if (currentIndex >= posts.length) {
      return (
        <View style={styles.noMoreCards}>
          <Text style={styles.noMoreCardsText}>No more posts!</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => setCurrentIndex(0)}>
            <Text style={styles.refreshButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return posts.map((item, index) => {
      if (index < currentIndex) return null
      if (index > currentIndex) return null

      if (index === currentIndex) {
        return (
          <Animated.View
            key={item.id}
            style={[styles.card, getCardStyle()]}
            {...PanResponder.panHandlers}
          >
            <View style={styles.cardHeader}>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              <View style={styles.commentsHeader}>
                <Feather name="message-circle" size={16} color="#718096" />
                <Text style={styles.commentsHeaderText}>{item.comments}</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardContent}>{item.content}</Text>

            <View style={styles.cardFooter}>
            </View>
          </Animated.View>
        )
      }

      return null
    }).reverse()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AITA</Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Feather name="filter" size={22} color="#4A5568" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardsContainer}>{renderCards()}</View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={[styles.button, styles.dislikeButton]} onPress={() => swipeLeft()}>
          <Feather name="x" size={28} color="#F56565" />
          <Text style={[styles.buttonText, { color: '#F56565' }]}>YTA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.likeButton]} onPress={() => swipeRight()}>
          <Feather name="check" size={28} color="#48BB78" />
          <Text style={[styles.buttonText, { color: '#48BB78' }]}>NTA</Text>
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
    paddingHorizontal: 20,
    paddingTop: 10, 
    paddingBottom: 5,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF4500",
    letterSpacing: 0.5,
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
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT - 170, 
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginHorizontal: 16,
    marginTop: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  categoryTag: {
    backgroundColor: "#FF4500",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  commentsHeaderText: {
    marginLeft: 4,
    color: "#718096",
    fontSize: 14,
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A202C",
    marginBottom: 16,
    lineHeight: 32,
    marginTop: 12,
  },
  cardContent: {
    fontSize: 17,
    color: "#4A5568",
    lineHeight: 26,
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 15,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingVertical: 20,
    paddingHorizontal: 30,
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#FFFFFF',
  },
  likeButton: {
    borderWidth: 2,
    borderColor: "#48BB78",
    shadowColor: "#48BB78",
    shadowOpacity: 0.2,
  },
  dislikeButton: {
    borderWidth: 2,
    borderColor: "#F56565",
    shadowColor: "#F56565",
    shadowOpacity: 0.2,
  },
  buttonText: {
    color: "#4A5568",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
    letterSpacing: 0.5,
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
})
