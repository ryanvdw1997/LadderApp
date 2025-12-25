import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase.config';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../styles/HomeScreen.styles';

export default function HomeScreen({ navigation }) {
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [ladderToJoin, setLadderToJoin] = useState(null);
  const [nickname, setNickname] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch user data for default nickname
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleJoinLadder = () => {
    setShowJoinCodeModal(true);
    setJoinCode('');
    setError('');
  };

  const handleSubmitJoinCode = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Query ladder by joinCode
      const q = query(
        collection(db, 'ladders'),
        where('joinCode', '==', joinCode.trim().toUpperCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Invalid join code. Please try again.');
        setLoading(false);
        return;
      }

      const ladderDoc = querySnapshot.docs[0];
      const ladderData = {
        id: ladderDoc.id,
        ...ladderDoc.data(),
      };

      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in to join a ladder');
        setLoading(false);
        return;
      }

      // Check if user is already a member by querying laddermembers
      const membersQuery = query(
        collection(db, 'laddermembers'),
        where('ladderId', '==', ladderDoc.id),
        where('memberId', '==', user.uid)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      if (!membersSnapshot.empty) {
        setError('You are already a member of this ladder');
        setLoading(false);
        return;
      }

      // Set ladder and show confirmation modal
      setLadderToJoin(ladderData);
      setNickname(''); // Reset nickname
      setShowJoinCodeModal(false);
      setShowConfirmationModal(true);
      setLoading(false);
    } catch (error) {
      console.error('Error finding ladder:', error);
      setError('Failed to find ladder. Please try again.');
      setLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!ladderToJoin) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      
      // Determine nickname
      const defaultName = (userFirstName && userLastName) 
        ? `${userFirstName} ${userLastName}`.trim()
        : (userFirstName || userLastName || 'Player');
      const finalNickname = nickname.trim() || defaultName;

      // Create laddermembers document (non-admin by default)
      await addDoc(collection(db, 'laddermembers'), {
        ladderId: ladderToJoin.id,
        memberId: user.uid,
        nickname: finalNickname,
        points: 0,
        rank: 0,
        isAdmin: false,
        createdAt: serverTimestamp(),
      });

      // Close modals and reset
      setShowConfirmationModal(false);
      setLadderToJoin(null);
      setJoinCode('');
      setNickname('');
      setLoading(false);

      // Navigate to My Ladders
      navigation.navigate('MyLadders');
    } catch (error) {
      console.error('Error joining ladder:', error);
      setError('Failed to join ladder. Please try again.');
      setLoading(false);
    }
  };

  const handleCancelJoin = () => {
    setShowJoinCodeModal(false);
    setShowConfirmationModal(false);
    setLadderToJoin(null);
    setJoinCode('');
    setNickname('');
    setError('');
  };

  const getGameTypeIcon = (type) => {
    if (type === 'tennis') {
      return require('../assets/tennis.png');
    } else if (type === 'pickleball') {
      return require('../assets/pickleball.png');
    }
    return null;
  };

  const getTeamTypeIcon = (teamType) => {
    switch (teamType) {
      case 'singles':
        return '👤';
      case 'doubles':
        return '👥';
      case 'teams':
        return '👤👤👤';
      default:
        return '👤';
    }
  };

  const menuButtons = [
    { 
      label: 'My Ladders', 
      onPress: () => navigation.navigate('MyLadders'),
      icon: '🏆'
    },
    { 
      label: 'Join a Ladder', 
      onPress: handleJoinLadder,
      icon: '🪜'
    },
    { 
      label: 'Team Invites', 
      onPress: () => navigation.navigate('TeamInvites'),
      icon: '📨'
    },
    { 
      label: 'My Teams', 
      onPress: () => navigation.navigate('MyTeams'),
      icon: '👥'
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.userName}>Ready to climb? 🚀</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('ProfileSettings')}
          >
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        {menuButtons.map((button, index) => (
          <TouchableOpacity
            key={button.label}
            style={[
              styles.menuButton,
              index === menuButtons.length - 1 && styles.menuButtonLast,
            ]}
            onPress={button.onPress}
          >
            <Text style={styles.menuButtonIcon}>{button.icon}</Text>
            <Text style={styles.menuButtonText}>{button.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Join Code Modal */}
      <Modal
        visible={showJoinCodeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelJoin}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Join a Ladder</Text>
            <Text style={styles.modalLabel}>Enter Join Code</Text>
            <TextInput
              style={styles.modalInput}
              value={joinCode}
              onChangeText={(text) => {
                setJoinCode(text.toUpperCase());
                setError('');
              }}
              placeholder="ABC12"
              placeholderTextColor="#8B8FA8"
              autoCapitalize="characters"
              maxLength={5}
              editable={!loading}
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleCancelJoin}
                disabled={loading}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleSubmitJoinCode}
                disabled={loading || !joinCode.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelJoin}
      >
        <View style={styles.modalOverlay}>
          <ScrollView 
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Join Ladder</Text>
              <Text style={styles.confirmationMessage}>
                You are about to join <Text style={styles.ladderName}>{ladderToJoin?.name}</Text>
              </Text>
              
              {ladderToJoin && (
                <View style={styles.ladderIconsContainer}>
                  {ladderToJoin.type && (
                    <View style={styles.iconContainer}>
                      <Image
                        source={getGameTypeIcon(ladderToJoin.type)}
                        style={styles.gameTypeIcon}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  {ladderToJoin.teamType && (
                    <View style={styles.iconContainer}>
                      <Text style={styles.teamTypeIcon}>
                        {getTeamTypeIcon(ladderToJoin.teamType)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.modalLabel}>Your Nickname (Optional)</Text>
              <Text style={styles.inputHint}>
                {nickname.trim() 
                  ? `Using: "${nickname.trim()}"` 
                  : `Will default to: "${(userFirstName + ' ' + userLastName).trim() || 'Player'}"`}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={nickname}
                onChangeText={(text) => {
                  setNickname(text);
                  setError('');
                }}
                placeholder={(userFirstName && userLastName) ? `${userFirstName} ${userLastName}` : 'Player'}
                placeholderTextColor="#8B8FA8"
                maxLength={30}
                autoCapitalize="words"
                editable={!loading}
              />

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={handleCancelJoin}
                  disabled={loading}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={handleConfirmJoin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
