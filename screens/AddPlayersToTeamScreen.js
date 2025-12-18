import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/AddPlayersToTeamScreen.styles';

export default function AddPlayersToTeamScreen({ navigation }) {
  const route = useRoute();
  const { teamId, ladderId } = route.params || {};
  
  const [team, setTeam] = useState(null);
  const [ladder, setLadder] = useState(null);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [memberUserData, setMemberUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [teamId, ladderId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!teamId || !ladderId) {
        setError('Missing team or ladder ID');
        setLoading(false);
        return;
      }

      // Fetch team data
      const teamDoc = await getDoc(doc(db, 'ladderteams', teamId));
      if (!teamDoc.exists()) {
        setError('Team not found');
        setLoading(false);
        return;
      }

      const teamData = teamDoc.data();
      setTeam({
        id: teamDoc.id,
        ...teamData,
      });

      // Fetch ladder data
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

      // Get all ladder members
      const memberList = ladderData.memberList || [];
      const teamMemberIds = teamData.memberIds || [];

      // Get all teams in this ladder to find players already on teams
      const allTeamsQuery = query(
        collection(db, 'ladderteams'),
        where('ladderId', '==', ladderId)
      );
      const allTeamsSnapshot = await getDocs(allTeamsQuery);
      const playersOnTeams = new Set();
      allTeamsSnapshot.forEach(teamDoc => {
        const teamData = teamDoc.data();
        const memberIds = teamData.memberIds || [];
        memberIds.forEach(memberId => playersOnTeams.add(memberId));
      });

      // Filter out players already on this team OR already on any other team
      const available = memberList.filter(m => 
        !teamMemberIds.includes(m.userId) && !playersOnTeams.has(m.userId)
      );
      setAvailableMembers(available);

      // Fetch user data for display
      const userDataMap = {};
      const userDataPromises = available.map(async (member) => {
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
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerSelection = (userId) => {
    if (selectedPlayers.includes(userId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== userId));
    } else {
      setSelectedPlayers([...selectedPlayers, userId]);
    }
    setError(''); // Clear error when selection changes
  };

  const handleSendInvites = async () => {
    setError('');

    if (selectedPlayers.length === 0) {
      setError('Please select at least one player to invite');
      return;
    }

    const user = auth.currentUser;
    if (!user || !team || team.createdBy !== user.uid) {
      setError('Only the team creator can send invites');
      return;
    }

    try {
      setSaving(true);

      // Check for existing pending invites to avoid duplicates
      const existingInvitesQuery = query(
        collection(db, 'teaminvites'),
        where('teamId', '==', teamId),
        where('status', '==', 'pending')
      );
      const existingInvites = await getDocs(existingInvitesQuery);
      const existingRecipientIds = new Set(
        existingInvites.docs.map(doc => doc.data().recipientId)
      );

      // Create invites for selected players
      const invitePromises = selectedPlayers
        .filter(recipientId => !existingRecipientIds.has(recipientId))
        .map(recipientId =>
          addDoc(collection(db, 'teaminvites'), {
            senderId: user.uid,
            recipientId: recipientId,
            teamId: teamId,
            ladderId: ladderId,
            status: 'pending',
            createdAt: serverTimestamp(),
          })
        );

      await Promise.all(invitePromises);

      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error sending invites:', error);
      setError('Failed to send invites. Please try again.');
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

  if (!team || !ladder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Team or ladder not found'}</Text>
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
          <Text style={styles.title}>Add Players</Text>
          <Text style={styles.subtitle}>{team.name}</Text>
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
            <Text style={styles.label}>
              Select Players to Invite
            </Text>
            <Text style={styles.hint}>
              {selectedPlayers.length} selected
            </Text>

            {availableMembers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No available players to invite</Text>
                <Text style={styles.emptyStateSubtext}>
                  All ladder members are already on the team
                </Text>
              </View>
            ) : (
              <View style={styles.playerList}>
                {availableMembers.map((member) => {
                  const isSelected = selectedPlayers.includes(member.userId);
                  const displayName = getDisplayName(member);

                  return (
                    <TouchableOpacity
                      key={member.userId}
                      style={[
                        styles.playerItem,
                        isSelected && styles.playerItemSelected,
                      ]}
                      onPress={() => togglePlayerSelection(member.userId)}
                      disabled={saving}
                    >
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{displayName}</Text>
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
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              saving && styles.sendButtonDisabled,
              selectedPlayers.length === 0 && styles.sendButtonDisabled,
            ]}
            onPress={handleSendInvites}
            disabled={saving || selectedPlayers.length === 0}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>Send Invites</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
