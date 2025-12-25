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
  const [selectedPlayer1, setSelectedPlayer1] = useState(null);
  const [selectedPlayer2, setSelectedPlayer2] = useState(null);
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

      // Query session members
      const membersQuery = query(
        collection(db, 'sessionMembers'),
        where('sessionId', '==', sessionId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      // Fetch member details from laddermembers to get nickname, points, rank
      const memberDetailsPromises = membersSnapshot.docs.map(async (memberDoc) => {
        const memberData = memberDoc.data();
        const userId = memberData.userId;
        
        // Get member details from laddermembers
        const ladderMemberQuery = query(
          collection(db, 'laddermembers'),
          where('ladderId', '==', ladderId),
          where('memberId', '==', userId)
        );
        const ladderMemberSnapshot = await getDocs(ladderMemberQuery);
        
        if (!ladderMemberSnapshot.empty) {
          const ladderMemberData = ladderMemberSnapshot.docs[0].data();
          return {
            userId: userId,
            nickname: ladderMemberData.nickname || 'Unknown',
            points: ladderMemberData.points || 0,
            rank: ladderMemberData.rank || 0,
          };
        }
        
        return {
          userId: userId,
          nickname: 'Unknown',
          points: 0,
          rank: 0,
        };
      });

      const playersList = await Promise.all(memberDetailsPromises);
      
      // For both singles and doubles/teams, we show individual players now
      setAvailablePlayers(playersList);
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

    // Validate selections
    if (!selectedPlayer1 || !selectedPlayer2) {
      setError('Please select two players');
      return;
    }
    if (selectedPlayer1.userId === selectedPlayer2.userId) {
      setError('Cannot create a matchup with the same player');
      return;
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

      matchupData.player1Id = selectedPlayer1.userId;
      matchupData.player2Id = selectedPlayer2.userId;
      matchupData.player1Name = selectedPlayer1.nickname || 'Unknown';
      matchupData.player2Name = selectedPlayer2.nickname || 'Unknown';

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

  const items = availablePlayers;
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
              Not enough players to create a matchup. Need at least 2.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Select Player 1
              </Text>
              <View style={styles.itemsList}>
                {items.map((item, index) => {
                  const isSelected = selectedPlayer1?.userId === item.userId;
                  const name = item.nickname || 'Unknown';
                  
                  return (
                    <TouchableOpacity
                      key={item.userId}
                      style={[
                        styles.itemButton,
                        isSelected && styles.itemButtonActive,
                      ]}
                      onPress={() => {
                        setSelectedPlayer1(item);
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
                Select Player 2
              </Text>
              <View style={styles.itemsList}>
                {items.map((item, index) => {
                  const isSelected = selectedPlayer2?.userId === item.userId;
                  const name = item.nickname || 'Unknown';
                  
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

