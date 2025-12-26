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
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/ViewLadderScreen.styles';
import LadderMemberCard from '../components/LadderMemberCard';

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
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [userSessionStatus, setUserSessionStatus] = useState({}); // sessionId -> boolean (true if user is in session)
  const [joiningSession, setJoiningSession] = useState(null);
  const [adminIds, setAdminIds] = useState(new Set());
  const [members, setMembers] = useState([]); // Members fetched from laddermembers
  const [showLeaveLadderModal, setShowLeaveLadderModal] = useState(false);
  const [leavingLadder, setLeavingLadder] = useState(false);

  useEffect(() => {
    fetchLadder();
  }, [ladderId]);

  useEffect(() => {
    if (ladder && activeTab === 'sessions') {
      fetchSessions();
    }
  }, [ladder, activeTab]);

  // Fetch admin IDs
  useEffect(() => {
    const fetchAdminIds = async () => {
      if (!ladderId) return;
      
      try {
        const membersQuery = query(
          collection(db, 'laddermembers'),
          where('ladderId', '==', ladderId),
          where('isAdmin', '==', true)
        );
        const membersSnapshot = await getDocs(membersQuery);
        const ids = new Set();
        membersSnapshot.forEach((doc) => {
          ids.add(doc.data().memberId);
        });
        setAdminIds(ids);
      } catch (error) {
        console.error('Error fetching admin IDs:', error);
      }
    };
    
    if (ladderId) {
      fetchAdminIds();
    }
  }, [ladderId]);


  // Refetch ladder and sessions when screen comes into focus (e.g., after creating a team, matchup, or session)
  useFocusEffect(
    useCallback(() => {
      if (ladderId) {
        fetchLadder();
        if (activeTab === 'sessions') {
          fetchSessions();
        }
      }
    }, [ladderId, activeTab])
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
        
        const ladderData = {
          id: ladderDoc.id,
          ...data,
          isAdmin,
        };
        setLadder(ladderData);

        // Fetch members from laddermembers collection
        const membersQuery = query(
          collection(db, 'laddermembers'),
          where('ladderId', '==', ladderId)
        );
        const membersSnapshot = await getDocs(membersQuery);
        
        const emailMap = {};
        const phoneMap = {};
        
        // Fetch all user data in parallel
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

        // Store members list from laddermembers
        const membersList = membersSnapshot.docs.map((memberDoc) => {
          const memberData = memberDoc.data();
          return {
            userId: memberData.memberId,
            nickname: memberData.nickname || 'Unknown',
            points: memberData.points || 0,
            rank: memberData.rank || 0,
          };
        });
        setMembers(membersList);
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

      // Check if user is already in each session
      const user = auth.currentUser;
      if (user) {
        const statusMap = {};
        await Promise.all(sessionsList.map(async (session) => {
          try {
            const membersQuery = query(
              collection(db, 'sessionMembers'),
              where('sessionId', '==', session.id),
              where('userId', '==', user.uid)
            );
            const membersSnapshot = await getDocs(membersQuery);
            statusMap[session.id] = !membersSnapshot.empty;
          } catch (error) {
            console.error(`Error checking session status for ${session.id}:`, error);
            statusMap[session.id] = false;
          }
        }));
        setUserSessionStatus(statusMap);
      }
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
  const sortedMembers = [...members].sort((a, b) => {
    if (a.rank !== undefined && b.rank !== undefined) {
      // If both have ranks, sort by rank (lower is better)
      return (a.rank || 999) - (b.rank || 999);
    }
    // Otherwise sort by points (higher is better)
    return (b.points || 0) - (a.points || 0);
  });

  // Helper to check admin status synchronously (for rendering)
  const isAdmin = (userId) => {
    return adminIds.has(userId);
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
    if (!ladder || !memberToMakeAdmin || !ladderId) return;

    try {
      setSaving(true);

      // Check if user is already admin
      const existingMemberQuery = query(
        collection(db, 'laddermembers'),
        where('ladderId', '==', ladderId),
        where('memberId', '==', memberToMakeAdmin.userId)
      );
      const existingMemberSnapshot = await getDocs(existingMemberQuery);

      if (!existingMemberSnapshot.empty) {
        // Update existing document
        const memberDoc = existingMemberSnapshot.docs[0];
        await updateDoc(memberDoc.ref, {
          isAdmin: true,
        });
      } else {
        // Create new member document as admin (shouldn't happen, but handle it)
        await addDoc(collection(db, 'laddermembers'), {
          ladderId: ladderId,
          memberId: memberToMakeAdmin.userId,
          isAdmin: true,
          createdAt: serverTimestamp(),
        });
      }

      // Update local admin IDs state
      setAdminIds(prev => new Set([...prev, memberToMakeAdmin.userId]));

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

  const handleLeaveLadder = () => {
    setShowLeaveLadderModal(true);
  };

  const confirmLeaveLadder = async () => {
    const user = auth.currentUser;
    if (!user || !ladderId) return;

    try {
      setLeavingLadder(true);

      // Use batch for efficient deletion
      const batch = writeBatch(db);

      // 1. Delete user's laddermembers document
      const memberQuery = query(
        collection(db, 'laddermembers'),
        where('ladderId', '==', ladderId),
        where('memberId', '==', user.uid)
      );
      const memberSnapshot = await getDocs(memberQuery);
      memberSnapshot.forEach((memberDoc) => {
        batch.delete(memberDoc.ref);
      });

      // 2. Delete user's sessionMembers documents for all sessions in this ladder
      // First get all sessions for this ladder
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('ladderId', '==', ladderId)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      // For each session, delete user's sessionMembers document
      const sessionIds = sessionsSnapshot.docs.map(doc => doc.id);
      for (const sessionId of sessionIds) {
        // Query sessionMembers for this user in this session
        const sessionMemberQuery = query(
          collection(db, 'sessionMembers'),
          where('sessionId', '==', sessionId),
          where('userId', '==', user.uid)
        );
        const sessionMemberSnapshot = await getDocs(sessionMemberQuery);
        sessionMemberSnapshot.forEach((memberDoc) => {
          batch.delete(memberDoc.ref);
        });
      }

      // Commit all deletions
      await batch.commit();

      // Navigate back to My Ladders
      setShowLeaveLadderModal(false);
      navigation.goBack();
    } catch (error) {
      console.error('Error leaving ladder:', error);
      setShowLeaveLadderModal(false);
      alert('Failed to leave ladder. Please try again.');
    } finally {
      setLeavingLadder(false);
    }
  };

  const cancelLeaveLadder = () => {
    setShowLeaveLadderModal(false);
  };

  const handleJoinSession = async (session) => {
    const user = auth.currentUser;
    if (!user) return;

    // For all ladders, join session creates a sessionMembers document
    try {
        setJoiningSession(session.id);
        
        // Check if user is already in this session
        const existingMemberQuery = query(
          collection(db, 'sessionMembers'),
          where('sessionId', '==', session.id),
          where('userId', '==', user.uid)
        );
        const existingMemberSnapshot = await getDocs(existingMemberQuery);
        
        if (!existingMemberSnapshot.empty) {
          alert('You are already in this session.');
          setJoiningSession(null);
          return;
        }

        // Get user's member data from laddermembers to verify they're a ladder member
        const userMemberQuery = query(
          collection(db, 'laddermembers'),
          where('ladderId', '==', ladderId),
          where('memberId', '==', user.uid)
        );
        const userMemberSnapshot = await getDocs(userMemberQuery);
        
        if (userMemberSnapshot.empty) {
          alert('You must be a member of the ladder to join a session.');
          setJoiningSession(null);
          return;
        }

        // Create sessionMembers document
        await addDoc(collection(db, 'sessionMembers'), {
          sessionId: session.id,
          ladderId: ladderId,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });

        // Update user session status
        setUserSessionStatus(prev => ({ ...prev, [session.id]: true }));
        alert('Successfully joined session!');
      } catch (error) {
        console.error('Error joining session:', error);
        alert('Failed to join session. Please try again.');
      } finally {
        setJoiningSession(null);
      }
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
          
          // Check if user is already in this session
          const isUserInSession = userSessionStatus[session.id] || false;
          const isJoining = joiningSession === session.id;

          return (
            <View key={session.id} style={styles.sessionCard}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ViewSession', { sessionId: session.id, ladderId: ladderId })}
                style={styles.sessionCardContent}
              >
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionName}>{session.name || 'Untitled Session'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusBadgeText}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
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
              {!isUserInSession && (
                <TouchableOpacity
                  style={[styles.joinSessionButton, isJoining && styles.joinSessionButtonDisabled]}
                  onPress={() => handleJoinSession(session)}
                  disabled={isJoining}
                >
                  <Text style={styles.joinSessionButtonText}>
                    {isJoining ? 'Joining...' : 'Join Session'}
                  </Text>
                </TouchableOpacity>
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
          <View style={styles.headerButtons}>
            {ladder.isAdmin && activeTab === 'sessions' && (
              <TouchableOpacity
                style={styles.createSessionButton}
                onPress={() => navigation.navigate('CreateSession', { ladderId: ladderId })}
              >
                <Text style={styles.createSessionButtonText}>Create Session</Text>
              </TouchableOpacity>
            )}
            {!ladder.isAdmin && (
              <TouchableOpacity
                style={styles.leaveLadderButton}
                onPress={handleLeaveLadder}
              >
                <Text style={styles.leaveLadderButtonText}>👋 Leave</Text>
              </TouchableOpacity>
            )}
          </View>
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

      {/* Leave Ladder Confirmation Modal */}
      <Modal
        visible={showLeaveLadderModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLeaveLadder}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Leave Ladder</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to leave "{ladder?.name || 'this ladder'}"? You will be removed from all sessions and will need to be re-invited to rejoin.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelLeaveLadder}
                disabled={leavingLadder}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={confirmLeaveLadder}
                disabled={leavingLadder}
              >
                {leavingLadder ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>Leave</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
