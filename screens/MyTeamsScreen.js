import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/MyTeamsScreen.styles';

export default function MyTeamsScreen({ navigation }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [teamToLeave, setTeamToLeave] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchMyTeams = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Query all teams where user is a member
      const q = query(
        collection(db, 'ladderteams'),
        where('memberIds', 'array-contains', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const teamsList = [];

      // Fetch ladder data for each team
      const teamPromises = querySnapshot.docs.map(async (teamDoc) => {
        const teamData = teamDoc.data();
        let ladderName = 'Unknown Ladder';
        
        try {
          // Fetch ladder name
          if (teamData.ladderId) {
            const ladderDoc = await getDoc(doc(db, 'ladders', teamData.ladderId));
            if (ladderDoc.exists()) {
              ladderName = ladderDoc.data().name || 'Unknown Ladder';
            }
          }
        } catch (error) {
          console.error(`Error fetching ladder for team ${teamDoc.id}:`, error);
        }

        return {
          id: teamDoc.id,
          name: teamData.name || 'Unnamed Team',
          ladderName: ladderName,
          ladderId: teamData.ladderId,
          members: teamData.members || [],
          createdAt: teamData.createdAt,
          points: teamData.points || 0,
          rank: teamData.rank || 0,
          createdBy: teamData.createdBy,
        };
      });

      const teamsWithLadders = await Promise.all(teamPromises);
      
      // Sort by creation date (newest first)
      teamsWithLadders.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0);
        return bDate - aDate; // Descending order
      });

      setTeams(teamsWithLadders);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyTeams();
    }, [])
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Created Today';
    if (diffDays === 1) return 'Created Yesterday';
    if (diffDays < 7) return `Created ${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const handleLeaveTeam = (team) => {
    setTeamToLeave(team);
    setShowLeaveModal(true);
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
        setShowLeaveModal(false);
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

      // If team has no members left after removing, we might want to handle that
      // For now, we'll just update the team
      await updateDoc(doc(db, 'ladderteams', teamToLeave.id), {
        members: newMembers,
        memberIds: newMemberIds,
      });

      // Close modal and refresh teams list
      setShowLeaveModal(false);
      setTeamToLeave(null);
      await fetchMyTeams();
    } catch (error) {
      console.error('Error leaving team:', error);
      alert('Failed to leave team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancelLeaveTeam = () => {
    setShowLeaveModal(false);
    setTeamToLeave(null);
  };

  const handleDeleteTeam = (team) => {
    setTeamToDelete(team);
    setShowDeleteModal(true);
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
      if (teamToDelete.ladderId) {
        try {
          const ladderDoc = await getDoc(doc(db, 'ladders', teamToDelete.ladderId));
          if (ladderDoc.exists()) {
            const ladderData = ladderDoc.data();
            const currentTeamIds = ladderData.teamIds || [];
            const newTeamIds = currentTeamIds.filter(id => id !== teamToDelete.id);

            await updateDoc(doc(db, 'ladders', teamToDelete.ladderId), {
              teamIds: newTeamIds,
            });
          }
        } catch (error) {
          console.error('Error updating ladder teamIds:', error);
          // Continue even if this fails - team is already deleted
        }
      }

      // Close modal and refresh teams list
      setShowDeleteModal(false);
      setTeamToDelete(null);
      await fetchMyTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancelDeleteTeam = () => {
    setShowDeleteModal(false);
    setTeamToDelete(null);
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
        <Text style={styles.title}>My Teams</Text>
        <Text style={styles.subtitle}>
          {teams.length} {teams.length === 1 ? 'team' : 'teams'}
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {teams.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateEmoji}>👥</Text>
            <Text style={styles.emptyStateTitle}>No Teams Yet</Text>
            <Text style={styles.emptyStateText}>
              Join a doubles or teams ladder and create a team to get started!
            </Text>
          </View>
        ) : (
          teams.map((team) => (
            <View key={team.id} style={styles.teamCard}>
              <View style={styles.teamCardHeader}>
                <View style={styles.teamCardInfo}>
                  <Text style={styles.teamName}>{team.name}</Text>
                  <Text style={styles.ladderName}>{team.ladderName}</Text>
                  <Text style={styles.createdDate}>{formatDate(team.createdAt)}</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.membersDropdown}
                onPress={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
              >
                <Text style={styles.membersDropdownText}>Team Members</Text>
                <Text style={styles.dropdownIcon}>
                  {expandedTeam === team.id ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {expandedTeam === team.id && (
                <View style={styles.membersList}>
                  {team.members.map((member, index) => (
                    <View key={member.userId || index} style={styles.memberItem}>
                      <Text style={styles.memberName}>{member.nickname || 'Unknown'}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.actionButtonContainer}>
                {auth.currentUser && team.createdBy === auth.currentUser.uid ? (
                  <>
                    <TouchableOpacity
                      style={styles.addPlayerButton}
                      onPress={() => navigation.navigate('AddPlayersToTeam', { teamId: team.id, ladderId: team.ladderId })}
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
            </View>
          ))
        )}
      </ScrollView>

      {/* Leave Team Confirmation Modal */}
      <Modal
        visible={showLeaveModal}
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
        visible={showDeleteModal}
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
