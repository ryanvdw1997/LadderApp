import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/ViewSessionScreen.styles';
import LadderMemberCard from '../components/LadderMemberCard';
import TeamCard from '../components/TeamCard';

export default function ViewSessionScreen({ navigation }) {
  const route = useRoute();
  const { sessionId, ladderId } = route.params || {};
  
  const [ladder, setLadder] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players'); // 'players', 'active', 'completed'
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [activeMatchups, setActiveMatchups] = useState([]);
  const [loadingActiveMatchups, setLoadingActiveMatchups] = useState(false);
  const [completedMatchups, setCompletedMatchups] = useState([]);
  const [loadingCompletedMatchups, setLoadingCompletedMatchups] = useState(false);
  const [memberEmails, setMemberEmails] = useState({});
  const [memberPhoneNumbers, setMemberPhoneNumbers] = useState({});
  const [userTeamId, setUserTeamId] = useState(null); // Track which team the user is on
  const [showLeaveTeamModal, setShowLeaveTeamModal] = useState(false);
  const [teamToLeave, setTeamToLeave] = useState(null);
  const [saving, setSaving] = useState(false);
      const [adminIds, setAdminIds] = useState(new Set());
      const [ladderMembers, setLadderMembers] = useState([]);

  useEffect(() => {
    fetchData();
  }, [sessionId, ladderId]);

  useFocusEffect(
    useCallback(() => {
      if (sessionId && ladderId) {
        fetchData();
      }
    }, [sessionId, ladderId])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch ladder data
      const ladderDoc = await getDoc(doc(db, 'ladders', ladderId));
      if (!ladderDoc.exists()) {
        console.error('Ladder not found');
        setLoading(false);
        return;
      }
      const ladderData = ladderDoc.data();
      const user = auth.currentUser;
      
      // Query laddermembers to check if user is admin
      let isAdmin = false;
      if (user) {
        const membersQuery = query(
          collection(db, 'laddermembers'),
          where('ladderId', '==', ladderId),
          where('memberId', '==', user.uid),
          where('isAdmin', '==', true)
        );
        const membersSnapshot = await getDocs(membersQuery);
        isAdmin = !membersSnapshot.empty;
      }
      
      setLadder({
        id: ladderDoc.id,
        ...ladderData,
        isAdmin,
      });

      // Fetch session data
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
      if (!sessionDoc.exists()) {
        console.error('Session not found');
        setLoading(false);
        return;
      }
      setSession({
        id: sessionDoc.id,
        ...sessionDoc.data(),
      });

      // Fetch members from laddermembers collection
      const membersQuery = query(
        collection(db, 'laddermembers'),
        where('ladderId', '==', ladderId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      const membersList = membersSnapshot.docs.map((memberDoc) => {
        const memberData = memberDoc.data();
        return {
          userId: memberData.memberId,
          nickname: memberData.nickname || 'Unknown',
          points: memberData.points || 0,
          rank: memberData.rank || 0,
        };
      });
      setLadderMembers(membersList);

      // Fetch member emails and phone numbers
      const emailMap = {};
      const phoneMap = {};
      
      const userDataPromises = membersSnapshot.docs.map(async (memberDoc) => {
        const memberData = memberDoc.data();
        const userId = memberData.memberId;
        try {
          const q = query(
            collection(db, 'users'),
            where('uid', '==', userId)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            emailMap[userId] = userData.email || '';
            phoneMap[userId] = userData.phoneNumber || '';
          }
        } catch (error) {
          console.error(`Error fetching user data for user ${userId}:`, error);
        }
      });

      await Promise.all(userDataPromises);
      setMemberEmails(emailMap);
      setMemberPhoneNumbers(phoneMap);

      // Fetch admin IDs for checking admin status
      const adminQuery = query(
        collection(db, 'laddermembers'),
        where('ladderId', '==', ladderId),
        where('isAdmin', '==', true)
      );
      const adminSnapshot = await getDocs(adminQuery);
      const ids = new Set();
      adminSnapshot.forEach((doc) => {
        ids.add(doc.data().memberId);
      });
      setAdminIds(ids);

      // Fetch teams and matchups
      await Promise.all([
        fetchTeams(),
        fetchMatchups(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    if (!sessionId) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoadingTeams(true);
      const teamsQuery = query(
        collection(db, 'ladderteams'),
        where('sessionId', '==', sessionId)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Check if user is on any team in this session
      const userTeam = teamsList.find(team => 
        team.memberIds && team.memberIds.includes(user.uid)
      );
      setUserTeamId(userTeam ? userTeam.id : null);

      // Sort teams by rank or points
      teamsList.sort((a, b) => {
        if (a.rank !== undefined && b.rank !== undefined) {
          return (a.rank || 999) - (b.rank || 999);
        }
        return (b.points || 0) - (a.points || 0);
      });

      setTeams(teamsList);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchMatchups = async () => {
    if (!sessionId) return;

    try {
      setLoadingActiveMatchups(true);
      setLoadingCompletedMatchups(true);
      
      const matchupsQuery = query(
        collection(db, 'matchups'),
        where('sessionId', '==', sessionId)
      );
      const matchupsSnapshot = await getDocs(matchupsQuery);
      const matchupsList = matchupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by createdAt (newest first)
      matchupsList.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return bDate - aDate;
      });

      // Separate active and completed matchups
      const now = new Date();
      const active = [];
      const completed = [];

      matchupsList.forEach(matchup => {
        const expiresAt = matchup.expiresAt?.toDate ? matchup.expiresAt.toDate() : null;
        const isExpired = expiresAt && expiresAt < now;
        const status = matchup.status || 'pending';

        if (status === 'completed') {
          completed.push(matchup);
        } else if (!isExpired) {
          active.push(matchup);
        } else {
          // Expired matchups can be considered completed or active based on status
          if (status === 'completed') {
            completed.push(matchup);
          } else {
            active.push(matchup);
          }
        }
      });

      setActiveMatchups(active);
      setCompletedMatchups(completed);
    } catch (error) {
      console.error('Error fetching matchups:', error);
      setActiveMatchups([]);
      setCompletedMatchups([]);
    } finally {
      setLoadingActiveMatchups(false);
      setLoadingCompletedMatchups(false);
    }
  };

  const isSingles = ladder?.teamType === 'singles';

  const handleLeaveTeam = (team) => {
    setTeamToLeave(team);
    setShowLeaveTeamModal(true);
  };

  const confirmLeaveTeam = async () => {
    if (!teamToLeave) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      setSaving(true);

      // Get current team data
      const teamDoc = await getDoc(doc(db, 'ladderteams', teamToLeave.id));
      if (!teamDoc.exists()) {
        alert('Team not found');
        setShowLeaveTeamModal(false);
        setTeamToLeave(null);
        setSaving(false);
        return;
      }

      const teamData = teamDoc.data();
      const currentMembers = teamData.members || [];
      const currentMemberIds = teamData.memberIds || [];

      // Remove user from members and memberIds
      const newMembers = currentMembers.filter(m => m.userId !== user.uid);
      const newMemberIds = currentMemberIds.filter(id => id !== user.uid);

      await updateDoc(doc(db, 'ladderteams', teamToLeave.id), {
        members: newMembers,
        memberIds: newMemberIds,
      });

      // Update userTeamId state
      setUserTeamId(null);

      // Close modal and refresh teams list
      setShowLeaveTeamModal(false);
      setTeamToLeave(null);
      await fetchTeams();
    } catch (error) {
      console.error('Error leaving team:', error);
      alert('Failed to leave team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancelLeaveTeam = () => {
    setShowLeaveTeamModal(false);
    setTeamToLeave(null);
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

  if (!ladder || !session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Session not found</Text>
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

  const renderPlayersOrTeamsList = () => {
    if (loadingTeams) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      );
    }

    if (teams.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No {isSingles ? 'players' : 'teams'} yet</Text>
          <Text style={styles.emptyStateSubtext}>
            {!isSingles && 'Create a team to get started!'}
          </Text>
        </View>
      );
    }

    const user = auth.currentUser;

    return (
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {teams.map((team, index) => {
          if (isSingles) {
            // For singles, show players
            const playerMember = team.members && team.members[0];
            if (!playerMember) return null;
            
            // Construct member object from team data
            const member = {
              userId: playerMember.userId,
              nickname: playerMember.nickname || 'Unknown',
              rank: team.rank,
              points: team.points || 0,
            };

            return (
              <View key={team.id || index} style={styles.itemWrapper}>
                <LadderMemberCard
                  member={member}
                  index={index}
                  isAdmin={adminIds.has(member.userId)}
                  email={memberEmails[member.userId] || ''}
                  phoneNumber={memberPhoneNumbers[member.userId] || ''}
                />
              </View>
            );
          } else {
            // For doubles/teams, show teams
            const isUserOnTeam = user && team.memberIds && team.memberIds.includes(user.uid);
            
            return (
              <View key={team.id || index} style={styles.itemWrapper}>
                <View style={styles.teamCardWrapper}>
                  <TeamCard team={team} index={index} />
                  {isUserOnTeam && (
                    <TouchableOpacity
                      style={styles.leaveTeamButton}
                      onPress={() => handleLeaveTeam(team)}
                      disabled={saving}
                      accessibilityLabel="Leave Team"
                      accessibilityHint="Tap to leave this team"
                    >
                      <Text style={styles.leaveTeamButtonIcon}>👋</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }
        })}
      </ScrollView>
    );
  };

  const renderMatchupsList = (matchups, isLoading) => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      );
    }

    if (matchups.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No matchups yet</Text>
          {ladder.isAdmin && activeTab === 'active' && (
            <Text style={styles.emptyStateSubtext}>
              Create a matchup to get started
            </Text>
          )}
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {matchups.map((matchup) => {
          const createdAt = matchup.createdAt?.toDate ? matchup.createdAt.toDate() : null;
          const expiresAt = matchup.expiresAt?.toDate ? matchup.expiresAt.toDate() : null;
          const now = new Date();
          const isExpired = expiresAt && expiresAt < now;
          const status = matchup.status || 'pending';

          // Format dates
          const createdDateStr = createdAt 
            ? createdAt.toLocaleDateString() 
            : 'Unknown date';
          const expiresDateStr = expiresAt 
            ? expiresAt.toLocaleDateString() 
            : 'Unknown';

          // Get names
          const name1 = isSingles ? matchup.player1Name : matchup.team1Name;
          const name2 = isSingles ? matchup.player2Name : matchup.team2Name;

          return (
            <View key={matchup.id} style={styles.matchupCard}>
              <View style={styles.matchupHeader}>
                <Text style={styles.matchupNames}>
                  {name1 || 'Unknown'} vs {name2 || 'Unknown'}
                </Text>
                <View style={[
                  styles.statusBadge,
                  status === 'completed' && styles.statusBadgeCompleted,
                  status === 'pending' && !isExpired && styles.statusBadgePending,
                  isExpired && styles.statusBadgeExpired,
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {isExpired ? 'Expired' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.matchupDetails}>
                <Text style={styles.matchupDetailText}>
                  Created: {createdDateStr}
                </Text>
                <Text style={styles.matchupDetailText}>
                  Expires: {expiresDateStr}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  // Format session dates
  const startDate = session.startDate?.toDate ? session.startDate.toDate() : null;
  const endDate = session.endDate?.toDate ? session.endDate.toDate() : null;
  const startDateStr = startDate 
    ? startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Unknown';
  const endDateStr = endDate 
    ? endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Unknown';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>{session.name || 'Untitled Session'}</Text>
          {ladder.isAdmin && activeTab === 'active' && (
            <TouchableOpacity
              style={styles.createMatchupButton}
              onPress={() => navigation.navigate('CreateMatchup', { sessionId: sessionId, ladderId: ladderId })}
            >
              <Text style={styles.createMatchupButtonText}>Create Matchup</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionInfoText}>
            📅 {startDateStr} - {endDateStr}
          </Text>
          {!isSingles && !userTeamId && (
            <TouchableOpacity
              style={styles.createTeamButton}
              onPress={() => navigation.navigate('CreateTeam', { sessionId: sessionId, ladderId: ladderId })}
            >
              <Text style={styles.createTeamButtonText}>Create Team</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'players' && styles.activeTab]}
          onPress={() => setActiveTab('players')}
        >
          <Text style={[styles.tabText, activeTab === 'players' && styles.activeTabText]}>
            {isSingles ? 'Players' : 'Teams'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active Matchups
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed Matchups
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'players' && renderPlayersOrTeamsList()}
      {activeTab === 'active' && renderMatchupsList(activeMatchups, loadingActiveMatchups)}
      {activeTab === 'completed' && renderMatchupsList(completedMatchups, loadingCompletedMatchups)}

      {/* Leave Team Confirmation Modal */}
      <Modal
        visible={showLeaveTeamModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLeaveTeam}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Leave Team</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to leave <Text style={styles.modalBoldText}>{teamToLeave?.name}</Text>?
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelLeaveTeam}
                disabled={saving}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmLeaveTeam}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

