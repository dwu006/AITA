import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function InstructionsScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Navigate to home screen when finished
      router.replace('/home');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Feather name="thumbs-up" size={60} color="#48BB78" />
              <Feather name="thumbs-down" size={60} color="#F56565" />
            </View>
            <Text style={styles.stepTitle}>Judge or Be Judged</Text>
            <Text style={styles.stepDescription}>
              AITA lets you be the judge of moral dilemmas posted by real people.
              Choose the right button for "Not The Asshole" (NTA) or left button for "You're The Asshole" (YTA).
            </Text>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Feather name="filter" size={60} color="#4A5568" />
            </View>
            <Text style={styles.stepTitle}>Filter Content</Text>
            <Text style={styles.stepDescription}>
              Use the filter button to choose your favorite category.
            </Text>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Feather name="users" size={60} color="#4299E1" />
            </View>
            <Text style={styles.stepTitle}>The Community</Text>
            <Text style={styles.stepDescription}>
              See how your judgments compare with the Reddit Community and what AI thinks!
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoTitleContainer}>
          <Image 
            source={require('../assets/images/aitalogo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.titleContainer}>
            <Text style={[styles.titleText, styles.orangeText]}>AI</Text>
            <Text style={[styles.titleText, styles.greenText]}>TA</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.stepIndicatorContainer}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.stepIndicator, 
                currentStep >= index + 1 && styles.activeStepIndicator
              ]} 
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderStep()}
        </ScrollView>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentStep < totalSteps ? 'Next' : 'Start Judging'}
          </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  titleContainer: {
    flexDirection: 'row',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  orangeText: {
    color: '#FF4500',
  },
  greenText: {
    color: '#48BB78',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  stepIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 5,
  },
  activeStepIndicator: {
    backgroundColor: '#FF4500',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2D3748',
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: '#4A5568',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#FF4500',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignSelf: 'center',
    marginVertical: 20,
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
