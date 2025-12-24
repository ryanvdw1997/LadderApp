import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/CreateTeamScreen.styles';

export default function CreateTeamScreen({ navigation }) {
  const route = useRoute();
  const { sessionId, ladderId } = route.params || {};
  
  const [session, setSession] = useState(null);
  const [ladder, setLadder] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [memberUserData, setMemberUserData] = useState({}); // userId -> userData mapping
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [sessionId, ladderId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!sessionId || !ladderId) {
        setError('Missing session or ladder ID');
        setLoading(false);
        return;
      }

      // Fetch session
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
      if (!sessionDoc.exists()) {
        setError('Session not found');
        setLoading(false);
        return;
      }
      const sessionData = sessionDoc.data();
      setSession({
        id: sessionDoc.id,
        ...sessionData,
      });

      // Fetch ladder to get member list and team type
      const ladderDoc = await getDoc(doc(db, 'ladders', ladderId));
      if (!ladderDoc.exists()) {
        setError('Ladder not found');
        setLoading(false);
        return;
      }
      const ladderData = ladderDoc.data();
      setLadder({
        id: ladderDoc.id,
        ...ladderData,
      });

      // Get member list from ladder
      const memberList = ladderData.memberList || [];
      setAvailableMembers(memberList);

      // Fetch user data for all members to display names
      const userDataMap = {};
      const userDataPromises = memberList.map(async (member) => {
        try {
          const q = query(
            collection(db, 'users'),
            where('uid', '==', member.userId)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            userDataMap[member.userId] = querySnapshot.docs[0].data();
          }
        } catch (error) {
          console.error(`Error fetching user data for ${member.userId}:`, error);
        }
      });

      await Promise.all(userDataPromises);
      setMemberUserData(userDataMap);

      // Pre-select current user if they're a member
      const user = auth.currentUser;
      if (user && memberList.some(m => m.userId === user.uid)) {
        setSelectedPlayers([user.uid]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerSelection = (userId) => {
    const user = auth.currentUser;
    if (!user || userId === user.uid) {
      // Cannot deselect yourself, you must be on the team
      return;
    }

    if (selectedPlayers.includes(userId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== userId));
      setError(''); // Clear error when removing player
    } else {
      // For doubles, we need exactly 2 players total (current user + 1 more)
      if (ladder?.teamType === 'doubles' && selectedPlayers.length >= 2) {
        setError('Doubles teams can only have 2 players');
        return;
      }

      setSelectedPlayers([...selectedPlayers, userId]);
      setError(''); // Clear error when valid selection made
    }
  };

  const handleCreateTeam = async () => {
    setError('');

    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    if (teamName.trim().length < 3) {
      setError('Team name must be at least 3 characters');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('You must be logged in to create a team');
      return;
    }

    // Ensure current user is selected
    if (!selectedPlayers.includes(user.uid)) {
      setSelectedPlayers([user.uid, ...selectedPlayers.filter(id => id !== user.uid)]);
    }

    const finalSelectedPlayers = selectedPlayers.includes(user.uid) 
      ? selectedPlayers 
      : [user.uid, ...selectedPlayers];

    // Validate player count
    // For doubles, we need at least 1 other player (creator + 1 invite)
    if (ladder?.teamType === 'doubles' && finalSelectedPlayers.length < 2) {
      setError('Doubles teams require at least 2 players. Select 1 player to invite.');
      return;
    }

    try {
      setSaving(true);

      // Check if user is already on a team in this session
      const existingTeamsQuery = query(
        collection(db, 'ladderteams'),
        where('sessionId', '==', sessionId),
        where('memberIds', 'array-contains', user.uid)
      );
      const existingTeamsSnapshot = await getDocs(existingTeamsQuery);
      
      if (!existingTeamsSnapshot.empty) {
        setError('You are already on a team in this session. Please leave your current team before creating a new one.');
        setSaving(false);
        return;
      }

      // Separate creator from other players
      const otherPlayers = finalSelectedPlayers.filter(id => id !== user.uid);
      const creatorMember = availableMembers.find(m => m.userId === user.uid);

      // Create team document with only the creator initially
      const teamMembers = [{
        userId: user.uid,
        nickname: creatorMember?.nickname || 'Unknown',
        points: creatorMember?.points || 0,
      }];

      const teamDocRef = await addDoc(collection(db, 'ladderteams'), {
        sessionId: sessionId,
        ladderId: ladderId, // Keep ladderId for reference
        name: teamName.trim(),
        members: teamMembers,
        memberIds: [user.uid], // Only creator initially
        points: 0,
        rank: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      // Add team ID to session's teamIds array
      const currentTeamIds = session.teamIds || [];
      const newTeamIds = [...currentTeamIds, teamDocRef.id];

      await updateDoc(doc(db, 'sessions', sessionId), {
        teamIds: newTeamIds,
      });

      // Send invites to other selected players
      if (otherPlayers.length > 0) {
        const batch = writeBatch(db);
        
        otherPlayers.forEach(recipientId => {
          const inviteRef = doc(collection(db, 'teaminvites'));
            batch.set(inviteRef, {
              senderId: user.uid,
              recipientId: recipientId,
              teamId: teamDocRef.id,
              sessionId: sessionId,
              ladderId: ladderId, // Keep for reference
              status: 'pending',
              createdAt: serverTimestamp(),
            });
        });

        await batch.commit();
      }

      // Navigate back to My Ladders
      navigation.goBack();
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Failed to create team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getDisplayName = (member) => {
    const userData = memberUserData[member.userId];
    if (userData) {
      const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      if (fullName) return fullName;
    }
    return member.nickname || 'Unknown';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      </SafeAreaView>
    );
  }

  if (!ladder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Ladder not found'}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const user = auth.currentUser;
  const isDoubles = ladder.teamType === 'doubles';
  const maxPlayers = isDoubles ? 2 : 999;
  const minPlayers = 2;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Create Team</Text>
          <Text style={styles.subtitle}>{ladder.name}</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Team Name</Text>
            <TextInput
              style={styles.input}
              value={teamName}
              onChangeText={(text) => {
                setTeamName(text);
                setError('');
              }}
              placeholder="Enter team name"
              placeholderTextColor="#8B8FA8"
              maxLength={50}
              autoCapitalize="words"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Select Players to Invite {isDoubles ? '(1 more required)' : '(1+ optional)'}
            </Text>
            <Text style={styles.hint}>
              {selectedPlayers.length} / {isDoubles ? '1' : 'unlimited'} selected
              {user && selectedPlayers.includes(user.uid) && ' (you are automatically included)'}
            </Text>

            <View style={styles.playerList}>
              {availableMembers.map((member) => {
                const isSelected = selectedPlayers.includes(member.userId);
                const isCurrentUser = user && member.userId === user.uid;
                const displayName = getDisplayName(member);

                return (
                  <TouchableOpacity
                    key={member.userId}
                    style={[
                      styles.playerItem,
                      isSelected && styles.playerItemSelected,
                      isCurrentUser && styles.playerItemRequired,
                    ]}
                    onPress={() => togglePlayerSelection(member.userId)}
                    disabled={isCurrentUser || saving}
                  >
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>
                        {displayName}
                        {isCurrentUser && ' (You)'}
                      </Text>
                      <Text style={styles.playerNickname}>{member.nickname}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.createButton,
              saving && styles.createButtonDisabled,
              (selectedPlayers.length < minPlayers || (isDoubles && selectedPlayers.length !== 2)) && styles.createButtonDisabled,
            ]}
            onPress={handleCreateTeam}
            disabled={
              saving ||
              selectedPlayers.length < minPlayers ||
              (isDoubles && selectedPlayers.length !== 2) ||
              !teamName.trim()
            }
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Team</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
