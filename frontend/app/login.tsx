import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
  Image,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

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

// Define types
interface UserData {
  username: string;
  [key: string]: any; // For any additional fields
}

interface LoginScreenProps {
  // Add any props here if needed
}

// Define path types for strong typing
type AppPath = '/' | '/home' | '/login' | '/instructions';

// Random username data
const randomUsernamePrefixes = ['Judge', 'Moral', 'Ethical', 'Truth', 'Fair', 'Just', 'Honest', 'Noble', 'Wise', 'Logic', 'Reason', 'Virtue', 'Karma', 'Jury', 'Court', 'Opinion', 'Insight', 'Choice', 'Decision', 'Verdict'];
const randomUsernameSuffixes = ['Seeker', 'Finder', 'Master', 'Guru', 'Expert', 'Whiz', 'Pro', 'Ace', 'Sage', 'Mind', 'Thinker', 'Judge', 'Critic', 'Voice', 'Speaker', 'Observer', 'Watcher', 'Guardian'];
const randomNumbers = ['', '123', '42', '007', '99', '2025', '777', '365', '247', '101'];

export default function LoginScreen(props: LoginScreenProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  
  // Separate state variables for login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Separate state variables for register
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerName, setRegisterName] = useState('');
  
  // Set API URL on component mount
  useEffect(() => {
    const url = getBaseUrl();
    console.log('Setting API URL:', url);
    setApiUrl(url);
  }, []);

  // Animation for swipe gesture
  const position = useState(new Animated.ValueXY())[0];
  
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      if (gesture.dx > 0) {
        // Only allow swiping right
        position.setValue({ x: gesture.dx, y: 0 });
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        // Navigate immediately when threshold is reached
        router.replace('/home');
      } else {
        // Reset position if not enough to trigger
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    }
  });

  // Function to store JWT token
  const storeToken = async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (e) {
      console.error("Failed to save auth token", e);
    }
  };

  // Function to store user data
  const storeUserData = async (userData: UserData): Promise<void> => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
    } catch (e) {
      console.error("Failed to save user data", e);
    }
  };

  // Function to generate a random username
  const generateRandomUsername = () => {
    const prefix = randomUsernamePrefixes[Math.floor(Math.random() * randomUsernamePrefixes.length)];
    const suffix = randomUsernameSuffixes[Math.floor(Math.random() * randomUsernameSuffixes.length)];
    const number = randomNumbers[Math.floor(Math.random() * randomNumbers.length)];
    
    return `${prefix}${suffix}${number}`;
  };
  
  // Handle random username button press
  const handleRandomUsername = () => {
    setRegisterUsername(generateRandomUsername());
  };

  // Login authenticates a user and returns a JWT token
  const handleLogin = async (username?: string, password?: string, redirectPath?: AppPath): Promise<void> => {
    // Reset error
    setError('');
    
    // Use provided credentials or form values
    const loginUser = username || loginUsername;
    const loginPass = password || loginPassword;
    
    // Simple validation
    if (!loginUser) {
      setError('Please enter your username');
      return;
    }
    
    if (!loginPass) {
      setError('Please enter your password');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginUser,
          password: loginPass,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      
      // Store token and user data
      await storeToken(data.token);
      await storeUserData(data.user);
      
      // Navigate to specified path or home screen
      router.replace(redirectPath || '/home');
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (): Promise<void> => {
    // Reset error
    setError('');
    
    // Check if fields are empty
    if (!registerUsername.trim() || !registerPassword.trim() || !registerName.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    if (registerPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Attempting to register with:', apiUrl);
      
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: registerUsername,
          name: registerName,
          password: registerPassword,
        }),
      });
      
      const data = await response.json();
      console.log('Registration response status:', response.status);
      console.log('Registration response:', data);
      
      if (!response.ok) {
        // More detailed error handling
        if (data.error) {
          setError(`Registration failed: ${data.error}`);
        } else if (response.status === 409) {
          setError('Username already exists. Please choose another username.');
        } else if (response.status >= 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(`Registration failed with status: ${response.status}`);
        }
        return;
      }
      
      // Store token and user data from registration
      if (data.token) {
        await storeToken(data.token);
        
        if (data.user) {
          await storeUserData(data.user);
        } else {
          console.warn('No user data received from registration');
        }
        
        // Navigate directly to instructions page
        router.replace('/instructions');
      } else {
        console.warn('No token received from registration');
        
        // Since no token was received, we need to log in manually
        await handleLogin(registerUsername, registerPassword, '/instructions');
        return; // Return early since handleLogin will handle navigation
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/')}
            >
              <Feather name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <Image 
              source={require('../assets/images/aitalogo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.titleTextContainer}>
              <Text style={[styles.titleText, styles.orangeText]}>AI</Text>
              <Text style={[styles.titleText, styles.greenText]}>TA</Text>
            </View>
          </View>
          <View style={styles.formContainer}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'login' && styles.activeTab]}
                onPress={() => setActiveTab('login')}
              >
                <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'register' && styles.activeTab]}
                onPress={() => setActiveTab('register')}
              >
                <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>Register</Text>
              </TouchableOpacity>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {activeTab === 'login' ? (
              <>                
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={loginUsername}
                    onChangeText={setLoginUsername}
                    placeholder="Username"
                    placeholderTextColor="gray"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      placeholder="Password"
                      placeholderTextColor="gray"
                      secureTextEntry={!showLoginPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity 
                      style={styles.visibilityToggle}
                      onPress={() => setShowLoginPassword(!showLoginPassword)}
                      disabled={isLoading}
                    >
                      <Feather name={showLoginPassword ? "eye-off" : "eye"} size={20} color="#718096" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[styles.loginButton, isLoading && styles.buttonDisabled]} 
                  onPress={() => handleLogin()}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>                
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={registerName}
                    onChangeText={setRegisterName}
                    placeholder="Full Name"
                    placeholderTextColor="gray"
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={[styles.inputWithButtonContainer, { borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 8 }]}>
                    <TextInput
                      style={[styles.inputWithButton, { color: '#2D3748', fontSize: 15 }]}
                      value={registerUsername}
                      onChangeText={setRegisterUsername}
                      placeholder="Username"
                      placeholderTextColor="gray"
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                    <TouchableOpacity 
                      style={styles.randomButton} 
                      onPress={handleRandomUsername}
                      disabled={isLoading}
                    >
                      <Feather name="shuffle" size={20} color="#718096" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={registerPassword}
                      onChangeText={setRegisterPassword}
                      placeholder="Password"
                      placeholderTextColor="gray"
                      secureTextEntry={!showRegisterPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity 
                      style={styles.visibilityToggle}
                      onPress={() => setShowRegisterPassword(!showRegisterPassword)}
                      disabled={isLoading}
                    >
                      <Feather name={showRegisterPassword ? "eye-off" : "eye"} size={20} color="#718096" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm Password"
                      placeholderTextColor="gray"
                      secureTextEntry={!showConfirmPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity 
                      style={styles.visibilityToggle}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#718096" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[styles.loginButton, isLoading && styles.buttonDisabled]} 
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Creating Account...' : 'Register'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    height: 50,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 5,
    zIndex: 10,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  titleTextContainer: {
    flexDirection: 'row',
  },
  titleText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  orangeText: {
    color: '#FF4500',
  },
  greenText: {
    color: '#48BB78',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    width: '100%',
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF4500',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4A5568',
  },
  activeTabText: {
    color: '#FF4500',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 15,
    backgroundColor: '#F7FAFC',
    color: '#2D3748',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
  },
  passwordInput: {
    flex: 1,
    height: 45,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#2D3748',
  },
  loginButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#FFA07A',
  },
  buttonDisabled: {
    backgroundColor: '#FFA07A',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#E53E3E',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputWithButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F7FAFC',
  },
  inputWithButton: {
    flex: 1,
    height: 45,
    paddingHorizontal: 15,
  },
  randomButton: {
    padding: 10,
  },
  visibilityToggle: {
    paddingHorizontal: 15,
    height: 45,
    justifyContent: 'center',
  },
});
