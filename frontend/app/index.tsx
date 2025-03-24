import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoadingScreen() {
  const router = useRouter();

  const handleStartJudging = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
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
        <Text style={styles.subtitleText}>
          Am I The Asshole?
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleStartJudging}>
          <Text style={styles.buttonText}>Start Judging</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  logo: {
    width: 80,
    height: 80,
    marginRight: 10,
  },
  titleTextContainer: {
    flexDirection: 'row',
  },
  titleText: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  orangeText: {
    color: '#FF4500',
  },
  greenText: {
    color: '#48BB78',
  },
  subtitleText: {
    fontSize: 22,
    color: '#4A5568',
    marginTop: -10,
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: '500',
    fontStyle: 'italic',
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  button: {
    backgroundColor: '#FF4500',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
