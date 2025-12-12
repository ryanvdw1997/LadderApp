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
  const [activeTab, setActiveTab] = useState('players'); // 'players', 'teams', or 'matches'
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [showMakeAdminModal, setShowMakeAdminModal] = useState(false);
  const [memberToMakeAdmin, setMemberToMakeAdmin] = useState(null);
  const [memberUserData, setMemberUserData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [memberEmails, setMemberEmails] = useState({}); // userId -> email mapping
  const [memberPhoneNumbers, setMemberPhoneNumbers] = useState({}); // userId -> phoneNumber mapping
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [showLeaveTeamModal, setShowLeaveTeamModal] = useState(false);
  const [teamToLeave, setTeamToLeave] = useState(null);
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);

  useEffect(() => {
    fetchLadder();
  }, [ladderId]);

  useEffect(() => {
    if (ladder && activeTab === 'teams') {
      fetchTeams();
    }
  }, [ladder, activeTab]);

  // Refetch ladder when screen comes into focus (e.g., after creating a team)
  // The useEffect watching ladder and activeTab will automatically fetch teams if needed
  useFocusEffect(
    useCallback(() => {
      if (ladderId) {
        fetchLadder();
      }
    }, [ladderId])
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

  const fetchTeams = async () => {
    if (!ladder || !ladder.teamIds || ladder.teamIds.length === 0) {
      setTeams([]);
      return;
    }

    try {
      setLoadingTeams(true);
      const teamDocs = await Promise.all(
        ladder.teamIds.map(teamId => getDoc(doc(db, 'ladderteams', teamId)))
      );

      const teamsList = teamDocs
        .filter(doc => doc.exists())
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          ladderId: ladderId, // Ensure ladderId is included
        }));

      // Sort teams by rank (ascending, 1 is best) or by points (descending) if no rank
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

  const isSingles = ladder?.teamType === 'singles';
  const showTeamsTab = !isSingles; // Show teams tab only for doubles/teams ladders

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

      // Close modal and refresh teams list
      setShowLeaveTeamModal(false);
      setTeamToLeave(null);
      await fetchTeams();
      await fetchLadder(); // Refresh ladder to update teamIds if needed
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

      // Remove team ID from ladder's teamIds array
      if (teamToDelete.ladderId || ladderId) {
        try {
          const ladderDocRef = doc(db, 'ladders', teamToDelete.ladderId || ladderId);
          const ladderDoc = await getDoc(ladderDocRef);
          if (ladderDoc.exists()) {
            const ladderData = ladderDoc.data();
            const currentTeamIds = ladderData.teamIds || [];
            const newTeamIds = currentTeamIds.filter(id => id !== teamToDelete.id);

            await updateDoc(ladderDocRef, {
              teamIds: newTeamIds,
            });
          }
        } catch (error) {
          console.error('Error updating ladder teamIds:', error);
          // Continue even if this fails - team is already deleted
        }
      }

      // Close modal and refresh teams list
      setShowDeleteTeamModal(false);
      setTeamToDelete(null);
      await fetchLadder(); // Refresh ladder to get updated teamIds
      await fetchTeams(); // Refresh teams list
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

  const renderTeamsList = () => {
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
          <Text style={styles.emptyStateText}>No teams yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Create a team to get started!
          </Text>
        </View>
      );
    }

    const user = auth.currentUser;

    return (
      <View style={styles.listContainer}>
        {teams.map((team, index) => {
          const isCreator = user && team.createdBy === user.uid;
          const isMember = user && team.memberIds && team.memberIds.includes(user.uid);

          return (
            <View key={team.id || index} style={styles.teamCardWrapper}>
              <View style={{ flex: 1 }}>
                <TeamCard team={team} index={index} />
              </View>
              {isMember && (
                <View style={styles.teamActionButtons}>
                  {isCreator ? (
                    <TouchableOpacity
                      style={styles.deleteTeamButton}
                      onPress={() => handleDeleteTeam(team)}
                      disabled={saving}
                    >
                      <Text style={styles.deleteTeamButtonIcon}>🗑️</Text>
                    </TouchableOpacity>
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
        })}
      </View>
    );
  };

  const renderMatchesList = () => {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>Matches coming soon!</Text>
        <Text style={styles.emptyStateSubtext}>
          This feature will allow you to view and manage match results.
        </Text>
      </View>
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
          {showTeamsTab && (
            <TouchableOpacity
              style={styles.createTeamButton}
              onPress={() => navigation.navigate('CreateTeam', { ladderId: ladderId })}
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
            Players
          </Text>
        </TouchableOpacity>
        {showTeamsTab && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'teams' && styles.activeTab]}
            onPress={() => setActiveTab('teams')}
          >
            <Text style={[styles.tabText, activeTab === 'teams' && styles.activeTabText]}>
              Teams
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matches' && styles.activeTab]}
          onPress={() => setActiveTab('matches')}
        >
          <Text style={[styles.tabText, activeTab === 'matches' && styles.activeTabText]}>
            Matches
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'players' && renderPlayersList()}
        {activeTab === 'teams' && renderTeamsList()}
        {activeTab === 'matches' && renderMatchesList()}
      </ScrollView>

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
