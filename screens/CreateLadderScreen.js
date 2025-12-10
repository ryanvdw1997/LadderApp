import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/CreateLadderScreen.styles';

export default function CreateLadderScreen({ navigation }) {
  const [ladderName, setLadderName] = useState('');
  const [gameType, setGameType] = useState('tennis'); // 'tennis' or 'pickleball'
  const [teamType, setTeamType] = useState('singles'); // 'singles', 'doubles', or 'teams'
  const [isPublic, setIsPublic] = useState(true); // true = public (1), false = private (0)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate a random 5-character code (letters and digits)
  const generateRequestCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Generate a unique request code by checking Firestore
  const generateUniqueRequestCode = async () => {
    let code = generateRequestCode();
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loops

    while (!isUnique && attempts < maxAttempts) {
      // Check if code already exists in Firestore
      const q = query(
        collection(db, 'ladders'),
        where('requestCode', '==', code)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Code is unique
        isUnique = true;
      } else {
        // Code exists, generate a new one
        code = generateRequestCode();
        attempts++;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique code. Please try again.');
    }

    return code;
  };

  const handleCreateLadder = async () => {
    setError(''); // Clear any previous errors

    if (!ladderName.trim()) {
      setError('Please enter a ladder name');
      return;
    }

    if (ladderName.trim().length < 3) {
      setError('Ladder name must be at least 3 characters');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in to create a ladder');
        return;
      }

      // Generate unique request code
      const requestCode = await generateUniqueRequestCode();

      // Create ladder document in Firestore
      await addDoc(collection(db, 'ladders'), {
        name: ladderName.trim(),
        type: gameType,
        teamType: teamType,
        adminList: [user.uid],
        memberList: [user.uid],
        public: isPublic ? 1 : 0,
        requestCode: requestCode,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      // Navigate back to Home screen
      navigation.goBack();
    } catch (error) {
      console.error('Create ladder error:', error);
      setError('Failed to create ladder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create New Ladder</Text>
            <Text style={styles.subtitle}>Set up your competitive ladder</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ladder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter ladder name"
                placeholderTextColor="#8B8FA8"
                value={ladderName}
                onChangeText={(text) => {
                  setLadderName(text);
                  setError('');
                }}
                maxLength={50}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Game Type</Text>
              <View style={styles.gameTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.gameTypeButton,
                    gameType === 'tennis' && styles.gameTypeButtonActive,
                  ]}
                  onPress={() => setGameType('tennis')}
                >
                  <Image 
                    source={require('../assets/tennis.png')} 
                    style={styles.gameTypeImage}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.gameTypeText,
                      gameType === 'tennis' && styles.gameTypeTextActive,
                    ]}
                  >
                    Tennis
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gameTypeButton,
                    styles.gameTypeButtonLast,
                    gameType === 'pickleball' && styles.gameTypeButtonActive,
                  ]}
                  onPress={() => setGameType('pickleball')}
                >
                  <Image 
                    source={require('../assets/pickleball.png')} 
                    style={styles.gameTypeImage}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.gameTypeText,
                      gameType === 'pickleball' && styles.gameTypeTextActive,
                    ]}
                  >
                    Pickleball
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Team Type</Text>
              <View style={styles.teamTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.teamTypeButton,
                    teamType === 'singles' && styles.teamTypeButtonActive,
                  ]}
                  onPress={() => setTeamType('singles')}
                >
                  <Text style={styles.teamTypeEmoji}>👤</Text>
                  <Text
                    style={[
                      styles.teamTypeText,
                      teamType === 'singles' && styles.teamTypeTextActive,
                    ]}
                  >
                    Singles
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.teamTypeButton,
                    teamType === 'doubles' && styles.teamTypeButtonActive,
                  ]}
                  onPress={() => setTeamType('doubles')}
                >
                  <Text style={styles.teamTypeEmoji}>👥</Text>
                  <Text
                    style={[
                      styles.teamTypeText,
                      teamType === 'doubles' && styles.teamTypeTextActive,
                    ]}
                  >
                    Doubles
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.teamTypeButton,
                    styles.teamTypeButtonLast,
                    teamType === 'teams' && styles.teamTypeButtonActive,
                  ]}
                  onPress={() => setTeamType('teams')}
                >
                  <Text style={styles.teamTypeEmoji}>👤👤👤</Text>
                  <Text
                    style={[
                      styles.teamTypeText,
                      teamType === 'teams' && styles.teamTypeTextActive,
                    ]}
                  >
                    Teams (3+)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Visibility</Text>
              <View style={styles.visibilityContainer}>
                <TouchableOpacity
                  style={[
                    styles.visibilityButton,
                    isPublic && styles.visibilityButtonActive,
                  ]}
                  onPress={() => setIsPublic(true)}
                >
                  <Text
                    style={[
                      styles.visibilityText,
                      isPublic && styles.visibilityTextActive,
                    ]}
                  >
                    🌐 Public
                  </Text>
                  <Text style={styles.visibilitySubtext}>
                    Anyone can find and join
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.visibilityButton,
                    !isPublic && styles.visibilityButtonActive,
                  ]}
                  onPress={() => setIsPublic(false)}
                >
                  <Text
                    style={[
                      styles.visibilityText,
                      !isPublic && styles.visibilityTextActive,
                    ]}
                  >
                    🔒 Private
                  </Text>
                  <Text style={styles.visibilitySubtext}>
                    Invite only
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreateLadder}
              disabled={loading}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Ladder'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
