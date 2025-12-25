import React, { useState, useEffect } from 'react';
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
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/CreateLadderScreen.styles';

export default function CreateLadderScreen({ navigation }) {
  const [ladderName, setLadderName] = useState('');
  const [gameType, setGameType] = useState('tennis'); // 'tennis' or 'pickleball'
  const [teamType, setTeamType] = useState('singles'); // 'singles', 'doubles', or 'teams'
  const [nickname, setNickname] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [isPublic, setIsPublic] = useState(true); // true = public (1), false = private (0)
  const [matchExpirationDays, setMatchExpirationDays] = useState(7); // Default 7 days
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch user data to get firstName and lastName for default nickname
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Query users collection to find the current user's document
        const q = query(
          collection(db, 'users'),
          where('uid', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setUserFirstName(userData.firstName || '');
          setUserLastName(userData.lastName || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  // Generate a random 5-character code (letters and digits)
  const generateJoinCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Generate a unique request code by checking Firestore
  const generateUniqueJoinCode = async () => {
    let code = generateJoinCode();
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loops

    while (!isUnique && attempts < maxAttempts) {
      // Check if code already exists in Firestore
      const q = query(
        collection(db, 'ladders'),
        where('joinCode', '==', code)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Code is unique
        isUnique = true;
      } else {
        // Code exists, generate a new one
        code = generateJoinCode();
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
      const joinCode = await generateUniqueJoinCode();

      // Determine nickname (use provided or default to firstName + lastName, or 'Player')
      const defaultName = (userFirstName && userLastName) 
        ? `${userFirstName} ${userLastName}`.trim()
        : (userFirstName || userLastName || 'Player');
      const finalNickname = nickname.trim() || defaultName;

      // Create ladder document in Firestore
      const ladderDocRef = await addDoc(collection(db, 'ladders'), {
        name: ladderName.trim(),
        type: gameType,
        teamType: teamType,
        public: isPublic ? 1 : 0,
        joinCode: joinCode,
        matchExpirationDays: matchExpirationDays,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      // Create laddermembers document for the creator (who is an admin)
      await addDoc(collection(db, 'laddermembers'), {
        ladderId: ladderDocRef.id,
        memberId: user.uid,
        nickname: finalNickname,
        points: 0,
        rank: 0,
        isAdmin: true,
        createdAt: serverTimestamp(),
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
              <Text style={styles.label}>Your Nickname (Optional)</Text>
              <Text style={styles.inputHint}>
                {nickname.trim() 
                  ? `Using: "${nickname.trim()}"` 
                  : `Will default to: "${(userFirstName + ' ' + userLastName).trim() || 'Player'}"`}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={(userFirstName && userLastName) ? `${userFirstName} ${userLastName}` : 'Player'}
                placeholderTextColor="#8B8FA8"
                value={nickname}
                onChangeText={(text) => {
                  setNickname(text);
                  setError('');
                }}
                maxLength={30}
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Match Expiration (Days)</Text>
              <Text style={styles.inputHint}>
                Matches expire after this many days (1-14)
              </Text>
              <View style={styles.expirationDaysContainer}>
                {[1, 3, 5, 7, 10, 14].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.expirationDayButton,
                      matchExpirationDays === days && styles.expirationDayButtonActive,
                    ]}
                    onPress={() => setMatchExpirationDays(days)}
                  >
                    <Text
                      style={[
                        styles.expirationDayText,
                        matchExpirationDays === days && styles.expirationDayTextActive,
                      ]}
                    >
                      {days}
                    </Text>
                  </TouchableOpacity>
                ))}
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
