import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Feather } from "@expo/vector-icons"
import { useState } from "react"

const SCREEN_WIDTH = Dimensions.get("window").width

export default function Profile() {
  // Sample data for user stats
  const stats = {
    postsJudged: 127,
    matchedJudgements: 98,
    favoriteCategory: "Family",
  }

  // Sample calendar data for streak
  const [currentMonth] = useState("March 2025")
  const [daysWithActivity] = useState([1, 2, 3, 5, 6, 9, 10, 11, 12, 15, 16, 17, 19, 20, 21])
  
  const renderCalendar = () => {
    const days = []
    // Generate 31 days for the month
    for (let i = 1; i <= 31; i++) {
      const isActive = daysWithActivity.includes(i)
      days.push(
        <TouchableOpacity 
          key={i} 
          style={[
            styles.calendarDay, 
            isActive && styles.activeDay
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
        <TouchableOpacity style={styles.settingsButton}>
          <Feather name="settings" size={22} color="#4A5568" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          {/* Profile Picture and Username */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: "https://randomuser.me/api/portraits/women/43.jpg" }} 
                style={styles.avatar} 
              />
              <TouchableOpacity style={styles.editAvatarButton}>
                <Feather name="edit-2" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>JudgeJudy</Text>
              <Text style={styles.handle}>@judgejudy</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.postsJudged}</Text>
              <Text style={styles.statLabel}>Posts Judged</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.matchedJudgements}</Text>
              <Text style={styles.statLabel}>Matched Reddit</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.favoriteCategory}</Text>
              <Text style={styles.statLabel}>Favorite Category</Text>
            </View>
          </View>

          {/* Streak Calendar */}
          <View style={styles.streakSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Streak</Text>
              <Text style={styles.streakCount}>🔥 14 days</Text>
            </View>
            {renderCalendar()}
          </View>
        </View>
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
    padding: 8,
    borderRadius: 8,
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
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF4500",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
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
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A202C",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#718096",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
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
    width: (SCREEN_WIDTH - 72) / 7,
    height: (SCREEN_WIDTH - 72) / 7,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderRadius: 8,
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
})
