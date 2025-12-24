import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/CreateMatchupScreen.styles';

export default function CreateMatchupScreen({ navigation }) {
  const route = useRoute();
  const { sessionId, ladderId } = route.params || {};
  
  const [session, setSession] = useState(null);
  const [ladder, setLadder] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedPlayer1, setSelectedPlayer1] = useState(null);
  const [selectedPlayer2, setSelectedPlayer2] = useState(null);
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
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

      // Fetch ladder data to determine team type
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

      const isSingles = ladderData.teamType === 'singles';

      // Query teams from the session (teams are now stored with sessionId)
      const teamsQuery = query(
        collection(db, 'ladderteams'),
        where('sessionId', '==', sessionId)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (isSingles) {
        // For singles, extract player info from single-player teams
        const playersList = teamsList
          .map(team => {
            const member = team.members && team.members[0];
            return member ? {
              userId: member.userId,
              nickname: member.nickname || 'Unknown',
              points: team.points || 0,
              rank: team.rank,
            } : null;
          })
          .filter(p => p !== null);
        setAvailablePlayers(playersList);
      } else {
        // For doubles/teams, use the teams directly
        setAvailableTeams(teamsList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatchup = async () => {
    setError('');
    const user = auth.currentUser;
    if (!user) {
      setError('You must be logged in');
      return;
    }

      if (!session || !ladder) {
        setError('Session or ladder not loaded');
        return;
      }

    const isSingles = ladder.teamType === 'singles';
    
    // Validate selections
    if (isSingles) {
      if (!selectedPlayer1 || !selectedPlayer2) {
        setError('Please select two players');
        return;
      }
      if (selectedPlayer1.userId === selectedPlayer2.userId) {
        setError('Cannot create a matchup with the same player');
        return;
      }
    } else {
      if (!selectedTeam1 || !selectedTeam2) {
        setError('Please select two teams');
        return;
      }
      if (selectedTeam1.id === selectedTeam2.id) {
        setError('Cannot create a matchup with the same team');
        return;
      }
    }

    try {
      setSaving(true);

      // Calculate expiration based on session settings
      const expirationDays = session?.expirationDays || ladder?.matchExpirationDays || 7;
      const createdAt = new Date();
      const expiresAt = new Date(createdAt);
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      // Create matchup document
      const matchupData = {
        sessionId: sessionId,
        ladderId: ladderId, // Keep for reference
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        status: 'pending',
      };

      if (isSingles) {
        matchupData.player1Id = selectedPlayer1.userId;
        matchupData.player2Id = selectedPlayer2.userId;
        matchupData.player1Name = selectedPlayer1.nickname || 'Unknown';
        matchupData.player2Name = selectedPlayer2.nickname || 'Unknown';
      } else {
        matchupData.team1Id = selectedTeam1.id;
        matchupData.team2Id = selectedTeam2.id;
        matchupData.team1Name = selectedTeam1.name || 'Unknown';
        matchupData.team2Name = selectedTeam2.name || 'Unknown';
      }

      await addDoc(collection(db, 'matchups'), matchupData);

      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error creating matchup:', error);
      setError('Failed to create matchup. Please try again.');
    } finally {
      setSaving(false);
    }
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
          <Text style={styles.errorText}>Ladder not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isSingles = ladder.teamType === 'singles';
  const items = isSingles ? availablePlayers : availableTeams;
  const hasEnoughItems = items.length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Matchup</Text>
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

        {!hasEnoughItems ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Not enough {isSingles ? 'players' : 'teams'} to create a matchup. Need at least 2.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Select {isSingles ? 'Player' : 'Team'} 1
              </Text>
              <View style={styles.itemsList}>
                {items.map((item, index) => {
                  const isSelected = isSingles
                    ? selectedPlayer1?.userId === item.userId
                    : selectedTeam1?.id === item.id;
                  const name = isSingles ? (item.nickname || 'Unknown') : (item.name || 'Unknown');
                  
                  return (
                    <TouchableOpacity
                      key={isSingles ? item.userId : item.id}
                      style={[
                        styles.itemButton,
                        isSelected && styles.itemButtonActive,
                      ]}
                      onPress={() => {
                        if (isSingles) {
                          setSelectedPlayer1(item);
                        } else {
                          setSelectedTeam1(item);
                        }
                        setError('');
                      }}
                      disabled={saving}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          isSelected && styles.itemTextActive,
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Select {isSingles ? 'Player' : 'Team'} 2
              </Text>
              <View style={styles.itemsList}>
                {items.map((item, index) => {
                  const isSelected = isSingles
                    ? selectedPlayer2?.userId === item.userId
                    : selectedTeam2?.id === item.id;
                  const name = isSingles ? (item.nickname || 'Unknown') : (item.name || 'Unknown');
                  
                  return (
                    <TouchableOpacity
                      key={isSingles ? item.userId : item.id}
                      style={[
                        styles.itemButton,
                        isSelected && styles.itemButtonActive,
                      ]}
                      onPress={() => {
                        if (isSingles) {
                          setSelectedPlayer2(item);
                        } else {
                          setSelectedTeam2(item);
                        }
                        setError('');
                      }}
                      disabled={saving}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          isSelected && styles.itemTextActive,
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.createButton,
                (saving || !hasEnoughItems) && styles.createButtonDisabled,
              ]}
              onPress={handleCreateMatchup}
              disabled={saving || !hasEnoughItems}
            >
              <Text style={styles.createButtonText}>
                {saving ? 'Creating...' : 'Create Matchup'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

