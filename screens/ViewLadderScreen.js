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
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/ViewLadderScreen.styles';
import LadderMemberCard from '../components/LadderMemberCard';
import TeamCard from '../components/TeamCard';

export default function ViewLadderScreen({ navigation }) {
  const route = useRoute();
  const { ladderId } = route.params || {};
  
  const [ladder, setLadder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players'); // 'players' or 'sessions'
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [showMakeAdminModal, setShowMakeAdminModal] = useState(false);
  const [memberToMakeAdmin, setMemberToMakeAdmin] = useState(null);
  const [memberUserData, setMemberUserData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [memberEmails, setMemberEmails] = useState({}); // userId -> email mapping
  const [memberPhoneNumbers, setMemberPhoneNumbers] = useState({}); // userId -> phoneNumber mapping
  const [showLeaveTeamModal, setShowLeaveTeamModal] = useState(false);
  const [teamToLeave, setTeamToLeave] = useState(null);
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionTeams, setSessionTeams] = useState({}); // sessionId -> teams array
  const [sessionMatchups, setSessionMatchups] = useState({}); // sessionId -> matchups array
  const [loadingSessionData, setLoadingSessionData] = useState({}); // sessionId -> loading state

  useEffect(() => {
    fetchLadder();
  }, [ladderId]);

  useEffect(() => {
    if (ladder && activeTab === 'sessions') {
      fetchSessions();
    }
  }, [ladder, activeTab]);

  // Fetch teams and matchups for a specific session
  const fetchSessionData = async (sessionId) => {
    if (!sessionId || !ladder) return;

    try {
      setLoadingSessionData(prev => ({ ...prev, [sessionId]: true }));

      // Fetch teams for this session
      const teamsQuery = query(
        collection(db, 'ladderteams'),
        where('sessionId', '==', sessionId)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort teams by rank or points
      teamsList.sort((a, b) => {
        if (a.rank !== undefined && b.rank !== undefined) {
          return (a.rank || 999) - (b.rank || 999);
        }
        return (b.points || 0) - (a.points || 0);
      });

      // Fetch matchups for this session
      const matchupsQuery = query(
        collection(db, 'matchups'),
        where('sessionId', '==', sessionId)
      );
      const matchupsSnapshot = await getDocs(matchupsQuery);
      const matchupsList = matchupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort matchups by createdAt (newest first)
      matchupsList.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return bDate - aDate;
      });

      setSessionTeams(prev => ({ ...prev, [sessionId]: teamsList }));
      setSessionMatchups(prev => ({ ...prev, [sessionId]: matchupsList }));
    } catch (error) {
      console.error(`Error fetching session data for ${sessionId}:`, error);
    } finally {
      setLoadingSessionData(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  // Fetch session data when session is expanded
  useEffect(() => {
    if (expandedSession && !sessionTeams[expandedSession] && !loadingSessionData[expandedSession]) {
      fetchSessionData(expandedSession);
    }
  }, [expandedSession]);

  // Refetch ladder and sessions when screen comes into focus (e.g., after creating a team, matchup, or session)
  useFocusEffect(
    useCallback(() => {
      if (ladderId) {
        fetchLadder();
        fetchSessions();
        // Refetch expanded session data if a session is expanded
        if (expandedSession) {
          fetchSessionData(expandedSession);
        }
      }
    }, [ladderId, expandedSession])
  );

  const fetchLadder = async () => {
    try {
      setLoading(true);
      if (!ladderId) {
        console.error('No ladder ID provided');
        setLoading(false);
        return;
      }

      const ladderDoc = await getDoc(doc(db, 'ladders', ladderId));
      if (ladderDoc.exists()) {
        const data = ladderDoc.data();
        const user = auth.currentUser;
        const isAdmin = user && data.adminList && data.adminList.includes(user.uid);
        const ladderData = {
          id: ladderDoc.id,
          ...data,
          isAdmin,
        };
        setLadder(ladderData);

        // Fetch email addresses and phone numbers for all members
        const memberList = data.memberList || [];
        const emailMap = {};
        const phoneMap = {};
        
        // Fetch all user data in parallel
        const userDataPromises = memberList.map(async (member) => {
          try {
            const q = query(
              collection(db, 'users'),
              where('uid', '==', member.userId)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userData = querySnapshot.docs[0].data();
              emailMap[member.userId] = userData.email || '';
              phoneMap[member.userId] = userData.phoneNumber || '';
            }
          } catch (error) {
            console.error(`Error fetching user data for user ${member.userId}:`, error);
          }
        });

        await Promise.all(userDataPromises);
        setMemberEmails(emailMap);
        setMemberPhoneNumbers(phoneMap);
      } else {
        console.error('Ladder not found');
      }
    } catch (error) {
      console.error('Error fetching ladder:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!ladder || !ladderId) {
      setSessions([]);
      return;
    }

    try {
      setLoadingSessions(true);
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('ladderId', '==', ladderId)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      const sessionsList = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by startDate (newest first)
      sessionsList.sort((a, b) => {
        const aDate = a.startDate?.toDate ? a.startDate.toDate() : new Date(0);
        const bDate = b.startDate?.toDate ? b.startDate.toDate() : new Date(0);
        return bDate - aDate;
      });

      setSessions(sessionsList);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Helper to get active or most recent session
  const getActiveSession = () => {
    if (!sessions || sessions.length === 0) return null;
    
    const now = new Date();
    // First try to find active session
    const activeSession = sessions.find(session => {
      const startDate = session.startDate?.toDate ? session.startDate.toDate() : null;
      const endDate = session.endDate?.toDate ? session.endDate.toDate() : null;
      if (startDate && endDate) {
        return now >= startDate && now <= endDate;
      }
      return false;
    });
    
    if (activeSession) return activeSession;
    
    // Otherwise return most recent session
    return sessions[0];
  };

  const isSingles = ladder?.teamType === 'singles';

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
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Sort members by rank (ascending, 1 is best) or by points (descending) if no rank
  const sortedMembers = [...(ladder.memberList || [])].sort((a, b) => {
    if (a.rank !== undefined && b.rank !== undefined) {
      // If both have ranks, sort by rank (lower is better)
      return (a.rank || 999) - (b.rank || 999);
    }
    // Otherwise sort by points (higher is better)
    return (b.points || 0) - (a.points || 0);
  });

  const isAdmin = (userId) => {
    return ladder?.adminList && ladder.adminList.includes(userId);
  };

  const handleMakeAdminClick = async (member) => {
    if (!member || !member.userId) return;

    try {
      // Fetch user data to get firstName and lastName
      const q = query(
        collection(db, 'users'),
        where('uid', '==', member.userId)
      );
      const querySnapshot = await getDocs(q);

      let userData = null;
      if (!querySnapshot.empty) {
        userData = querySnapshot.docs[0].data();
      }

      setMemberToMakeAdmin(member);
      setMemberUserData(userData);
      setShowMakeAdminModal(true);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Still show modal even if we can't fetch user data
      setMemberToMakeAdmin(member);
      setMemberUserData(null);
      setShowMakeAdminModal(true);
    }
  };

  const confirmMakeAdmin = async () => {
    if (!ladder || !memberToMakeAdmin) return;

    try {
      setSaving(true);
      const currentAdminList = ladder.adminList || [];

      // Don't add if already admin
      if (currentAdminList.includes(memberToMakeAdmin.userId)) {
        setShowMakeAdminModal(false);
        setMemberToMakeAdmin(null);
        setMemberUserData(null);
        setSaving(false);
        return;
      }

      const newAdminList = [...currentAdminList, memberToMakeAdmin.userId];

      await updateDoc(doc(db, 'ladders', ladderId), {
        adminList: newAdminList,
      });

      // Update local state and refetch ladder
      await fetchLadder();
      
      setShowMakeAdminModal(false);
      setMemberToMakeAdmin(null);
      setMemberUserData(null);
      setExpandedPlayer(null);
    } catch (error) {
      console.error('Error making user admin:', error);
      alert('Failed to make user admin. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancelMakeAdmin = () => {
    setShowMakeAdminModal(false);
    setMemberToMakeAdmin(null);
    setMemberUserData(null);
    setExpandedPlayer(null);
  };

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

      // Update session data if expanded
      if (teamToLeave.sessionId && expandedSession === teamToLeave.sessionId) {
        await fetchSessionData(teamToLeave.sessionId);
      }

      // Close modal
      setShowLeaveTeamModal(false);
      setTeamToLeave(null);
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

  const handleDeleteTeam = (team) => {
    setTeamToDelete(team);
    setShowDeleteTeamModal(true);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      setSaving(true);

      // Delete the team document
      await deleteDoc(doc(db, 'ladderteams', teamToDelete.id));

      // Update session data if expanded
      if (teamToDelete.sessionId && expandedSession === teamToDelete.sessionId) {
        fetchSessionData(teamToDelete.sessionId);
      }

      // Close modal
      setShowDeleteTeamModal(false);
      setTeamToDelete(null);
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancelDeleteTeam = () => {
    setShowDeleteTeamModal(false);
    setTeamToDelete(null);
  };

  const renderPlayersList = () => {
    if (sortedMembers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No players yet</Text>
        </View>
      );
    }

    const currentUserIsAdmin = ladder?.isAdmin;

    return (
      <View style={styles.listContainer}>
        {sortedMembers.map((member, index) => {
          const memberIsAdmin = isAdmin(member.userId);
          const showMakeAdminOption = currentUserIsAdmin && !memberIsAdmin;

          return (
            <View key={member.userId || index}>
              <View style={styles.playerCardWrapper}>
                <View style={{ flex: 1 }}>
                  <LadderMemberCard
                    member={member}
                    index={index}
                    isTeam={false}
                    isAdmin={isAdmin(member.userId)}
                    email={memberEmails[member.userId] || ''}
                    phoneNumber={memberPhoneNumbers[member.userId] || ''}
                  />
                </View>
                {showMakeAdminOption && (
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() =>
                      setExpandedPlayer(
                        expandedPlayer === member.userId ? null : member.userId
                      )
                    }
                  >
                    <Text style={styles.dropdownIcon}>
                      {expandedPlayer === member.userId ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {expandedPlayer === member.userId && showMakeAdminOption && (
                <View style={styles.dropdownContent}>
                  <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => handleMakeAdminClick(member)}
                    disabled={saving}
                  >
                    <Text style={styles.actionOptionText}>Make Admin</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderSessionsList = () => {
    if (loadingSessions) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      );
    }

    if (sessions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No sessions yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Create a session to organize matchups by time period
          </Text>
        </View>
      );
    }

    const user = auth.currentUser;

    return (
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {sessions.map((session) => {
          const startDate = session.startDate?.toDate ? session.startDate.toDate() : null;
          const endDate = session.endDate?.toDate ? session.endDate.toDate() : null;
          const now = new Date();
          const isExpanded = expandedSession === session.id;
          
          // Determine status
          let status = 'upcoming';
          let statusColor = '#FFA726'; // orange for upcoming
          if (startDate && endDate) {
            if (now < startDate) {
              status = 'upcoming';
              statusColor = '#FFA726';
            } else if (now >= startDate && now <= endDate) {
              status = 'active';
              statusColor = '#66BB6A'; // green for active
            } else {
              status = 'completed';
              statusColor = '#8B8FA8'; // gray for completed
            }
          }

          // Format dates
          const startDateStr = startDate 
            ? startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'Unknown';
          const endDateStr = endDate 
            ? endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'Unknown';

          // Format expiration
          const expirationStr = session.expirationUnit === 'weeks'
            ? `${session.expirationValue} ${session.expirationValue === 1 ? 'week' : 'weeks'}`
            : `${session.expirationValue} ${session.expirationValue === 1 ? 'day' : 'days'}`;

          // Ranking method display
          const rankingMethodStr = session.rankingMethod === 'points' ? 'Points Based' : 'Win/Loss Based';

          // Get teams/players and matchups for this session
          const sessionTeamsList = sessionTeams[session.id] || [];
          const sessionMatchupsList = sessionMatchups[session.id] || [];
          const isLoadingSessionData = loadingSessionData[session.id];

          return (
            <View key={session.id} style={styles.sessionCard}>
              <TouchableOpacity
                onPress={() => {
                  if (isExpanded) {
                    setExpandedSession(null);
                  } else {
                    setExpandedSession(session.id);
                    fetchSessionData(session.id);
                  }
                }}
                style={styles.sessionHeaderClickable}
              >
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionName}>{session.name || 'Untitled Session'}</Text>
                  <View style={styles.sessionHeaderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.statusBadgeText}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.sessionExpandIcon}>
                      {isExpanded ? '▲' : '▼'}
                    </Text>
                  </View>
                </View>
                <View style={styles.sessionDetails}>
                  <Text style={styles.sessionDetailText}>
                    📅 {startDateStr} - {endDateStr}
                  </Text>
                  <Text style={styles.sessionDetailText}>
                    ⏱️ Matchup expiration: {expirationStr}
                  </Text>
                  <Text style={styles.sessionDetailText}>
                    📊 Ranking: {rankingMethodStr}
                  </Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.sessionExpandedContent}>
                  {isLoadingSessionData ? (
                    <View style={styles.sessionLoadingContainer}>
                      <ActivityIndicator size="small" color="#6C5CE7" />
                    </View>
                  ) : (
                    <>
                      {/* Teams/Players Section */}
                      <View style={styles.sessionSection}>
                        <View style={styles.sessionSectionHeader}>
                          <Text style={styles.sessionSectionTitle}>
                            {isSingles ? 'Players' : 'Teams'}
                          </Text>
                          {!isSingles && user && (
                            <TouchableOpacity
                              style={styles.sessionActionButton}
                              onPress={() => navigation.navigate('CreateTeam', { sessionId: session.id, ladderId: ladderId })}
                            >
                              <Text style={styles.sessionActionButtonText}>Create Team</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {sessionTeamsList.length === 0 ? (
                          <View style={styles.sessionEmptyState}>
                            <Text style={styles.sessionEmptyStateText}>
                              No {isSingles ? 'players' : 'teams'} in this session yet
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.sessionItemsContainer}>
                            {sessionTeamsList.map((team, index) => {
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
                                  <View key={team.id || index} style={styles.sessionPlayerItem}>
                                    <LadderMemberCard
                                      member={member}
                                      index={index}
                                      isAdmin={ladder.adminList?.includes(member.userId) || false}
                                      email={memberEmails[member.userId] || ''}
                                      phoneNumber={memberPhoneNumbers[member.userId] || ''}
                                    />
                                  </View>
                                );
                              } else {
                                // For doubles/teams, show teams
                                const isCreator = user && team.createdBy === user.uid;
                                const isMember = user && team.memberIds && team.memberIds.includes(user.uid);

                                return (
                                  <View key={team.id || index} style={styles.sessionTeamItem}>
                                    <View style={{ flex: 1 }}>
                                      <TeamCard team={team} index={index} />
                                    </View>
                                    {isMember && (
                                      <View style={styles.teamActionButtons}>
                                        {isCreator ? (
                                          <>
                                            <TouchableOpacity
                                              style={styles.addPlayerButton}
                                              onPress={() => navigation.navigate('AddPlayersToTeam', { teamId: team.id, ladderId: ladderId })}
                                              disabled={saving}
                                              accessibilityLabel="Add Players"
                                              accessibilityHint="Tap to add players to this team"
                                            >
                                              <Text style={styles.addPlayerButtonIcon}>➕</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                              style={styles.deleteTeamButton}
                                              onPress={() => handleDeleteTeam(team)}
                                              disabled={saving}
                                            >
                                              <Text style={styles.deleteTeamButtonIcon}>🗑️</Text>
                                            </TouchableOpacity>
                                          </>
                                        ) : (
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
                                    )}
                                  </View>
                                );
                              }
                            })}
                          </View>
                        )}
                      </View>

                      {/* Matchups Section */}
                      <View style={styles.sessionSection}>
                        <View style={styles.sessionSectionHeader}>
                          <Text style={styles.sessionSectionTitle}>Matchups</Text>
                          {ladder.isAdmin && (
                            <TouchableOpacity
                              style={styles.sessionActionButton}
                              onPress={() => navigation.navigate('CreateMatchup', { sessionId: session.id, ladderId: ladderId })}
                            >
                              <Text style={styles.sessionActionButtonText}>Create Matchup</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {sessionMatchupsList.length === 0 ? (
                          <View style={styles.sessionEmptyState}>
                            <Text style={styles.sessionEmptyStateText}>No matchups in this session yet</Text>
                          </View>
                        ) : (
                          <View style={styles.sessionItemsContainer}>
                            {sessionMatchupsList.map((matchup) => {
                              const createdAt = matchup.createdAt?.toDate ? matchup.createdAt.toDate() : null;
                              const expiresAt = matchup.expiresAt?.toDate ? matchup.expiresAt.toDate() : null;
                              const now = new Date();
                              const isExpired = expiresAt && expiresAt < now;
                              const matchupStatus = matchup.status || 'pending';

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
                                      matchupStatus === 'completed' && styles.statusBadgeCompleted,
                                      matchupStatus === 'pending' && !isExpired && styles.statusBadgePending,
                                      isExpired && styles.statusBadgeExpired,
                                    ]}>
                                      <Text style={styles.statusBadgeText}>
                                        {isExpired ? 'Expired' : matchupStatus.charAt(0).toUpperCase() + matchupStatus.slice(1)}
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
                          </View>
                        )}
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

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
          <Text style={styles.title}>{ladder.name}</Text>
          {ladder.isAdmin && activeTab === 'sessions' && (
            <TouchableOpacity
              style={styles.createSessionButton}
              onPress={() => navigation.navigate('CreateSession', { ladderId: ladderId })}
            >
              <Text style={styles.createSessionButtonText}>Create Session</Text>
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
            Players
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sessions' && styles.activeTab]}
          onPress={() => setActiveTab('sessions')}
        >
          <Text style={[styles.tabText, activeTab === 'sessions' && styles.activeTabText]}>
            Sessions
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'players' && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderPlayersList()}
        </ScrollView>
      )}
      {activeTab === 'sessions' && renderSessionsList()}

      {/* Make Admin Confirmation Modal */}
      <Modal
        visible={showMakeAdminModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelMakeAdmin}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Make Admin</Text>
            <Text style={styles.modalMessage}>
              Confirm you want to make{' '}
              <Text style={styles.modalBoldText}>
                {memberUserData
                  ? `${memberUserData.firstName || ''} ${memberUserData.lastName || ''}`.trim() || memberToMakeAdmin?.nickname || 'this user'
                  : memberToMakeAdmin?.nickname || 'this user'}
              </Text>{' '}
              an admin of this ladder.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelMakeAdmin}
                disabled={saving}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmMakeAdmin}
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

      {/* Delete Team Confirmation Modal */}
      <Modal
        visible={showDeleteTeamModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDeleteTeam}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete Team</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete <Text style={styles.modalBoldText}>{teamToDelete?.name}</Text>? This action cannot be undone.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelDeleteTeam}
                disabled={saving}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={confirmDeleteTeam}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
