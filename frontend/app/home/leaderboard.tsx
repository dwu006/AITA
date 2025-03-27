import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

// Type for user in leaderboard
interface LeaderboardUser {
  id: string;
  username: string;
  name: string;
  pfp?: string;
  accuracy: number;
  num_posts: number;
  rank?: number; // Rank in the leaderboard
}

// Get base URL function (same as other screens)
const getBaseUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.0.147:8080';
    } else if (Platform.OS === 'ios') {
      return 'http://10.0.0.147:8080';
    } else {
      return 'http://localhost:8080'; // Web
    }
  }
  return 'https://your-production-server.com';
};

export default function LeaderboardScreen() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'overall' | 'accuracy' | 'num_posts'>('overall');

  useEffect(() => {
    fetchLeaderboardData();
  }, [sortBy]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setError('You need to be logged in to view the leaderboard');
        setLoading(false);
        return;
      }

      console.log(`Fetching leaderboard data with sort=${sortBy}`);
      // Fetch real users from the API - Note: API directly returns array of users
      const response = await fetch(`${getBaseUrl()}/api/users/leaderboard?sort=${sortBy}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Leaderboard response status:', response.status);
      
      if (!response.ok) {
        // Get error details from response
        let errorMessage = 'Failed to fetch leaderboard data';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Could not parse error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Leaderboard data received:', data);
      
      // Check if data is valid (should be an array)
      if (data && Array.isArray(data)) {
        console.log(`Received ${data.length} users from API`);
        // Add rank to each user, handle missing/null values
        const rankedData = data.map((user: any, index: number) => ({
          id: user._id || user.id || `user-${index}`,
          username: user.username || 'anonymous',
          name: user.name || 'Anonymous User',
          pfp: user.pfp || 'https://randomuser.me/api/portraits/lego/1.jpg',
          accuracy: typeof user.accuracy === 'number' ? user.accuracy : 0,
          num_posts: typeof user.num_posts === 'number' ? user.num_posts : 0,
          rank: index + 1
        }));

        setLeaderboardData(rankedData);
      } else {
        // Handle invalid response data
        console.error('API returned invalid data format:', data);
        setError('Received invalid data format from server');
        setLeaderboardData([]); // Clear any previous data
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('Failed to load leaderboard data. Please try again.');
      setLoading(false);
    }
  };

  const renderRankBadge = (rank: number) => {
    let badgeColor = '#8A92A2'; // Default gray for ranks beyond top 3
    
    if (rank === 1) badgeColor = '#FFD700'; // Gold for 1st
    else if (rank === 2) badgeColor = '#C0C0C0'; // Silver for 2nd
    else if (rank === 3) badgeColor = '#CD7F32'; // Bronze for 3rd
    
    return (
      <View style={[styles.rankBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: LeaderboardUser }) => (
    <View style={styles.userRow}>
      {renderRankBadge(item.rank!)}
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userHandle}>@{item.username}</Text>
      </View>
      
      <View style={styles.userStats}>
        <Text style={styles.statValue}>{item.accuracy}%</Text>
        <Text style={styles.statLabel}>Accuracy</Text>
      </View>
      
      <View style={styles.userStats}>
        <Text style={styles.statValue}>{item.num_posts}</Text>
        <Text style={styles.statLabel}>Judged</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
      </View>
      
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            sortBy === 'overall' && styles.activeFilter
          ]}
          onPress={() => setSortBy('overall')}
        >
          <Text style={[
            styles.filterText, 
            sortBy === 'overall' && styles.activeFilterText
          ]}>
            Overall
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.filterButton, 
            sortBy === 'accuracy' && styles.activeFilter
          ]}
          onPress={() => setSortBy('accuracy')}
        >
          <Text style={[
            styles.filterText, 
            sortBy === 'accuracy' && styles.activeFilterText
          ]}>
            Accuracy
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            sortBy === 'num_posts' && styles.activeFilter
          ]}
          onPress={() => setSortBy('num_posts')}
        >
          <Text style={[
            styles.filterText, 
            sortBy === 'num_posts' && styles.activeFilterText
          ]}>
            Most Judged
          </Text>
        </TouchableOpacity>
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchLeaderboardData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4500" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboardData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found on the leaderboard.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F7F9FC',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#EEF0F2',
  },
  activeFilter: {
    backgroundColor: '#FF4500',
  },
  filterText: {
    fontWeight: '500',
    color: '#4A5568',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#718096',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#E53E3E',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userInfo: {
    flex: 2,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
  },
  userHandle: {
    fontSize: 14,
    color: '#718096',
  },
  userStats: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
});
