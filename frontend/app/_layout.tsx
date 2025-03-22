import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { ThemeProvider } from '../components/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Tabs
            screenOptions={{
              tabBarActiveTintColor: "#FF4500",
              tabBarInactiveTintColor: "#718096",
              tabBarStyle: {
                backgroundColor: "#FFFFFF",
                borderTopWidth: 1,
                borderTopColor: "#E2E8F0",
                paddingBottom: 5,
                paddingTop: 5,
                height: 60,
              },
              headerShown: false,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: "Home",
                tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: "Profile",
                tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
              }}
            />
          </Tabs>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}