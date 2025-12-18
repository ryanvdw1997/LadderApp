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
import { collection, query, where, getDocs, doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/TeamInvitesScreen.styles';

export default function TeamInvitesScreen({ navigation }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [teamData, setTeamData] = useState({});
  const [ladderData, setLadderData] = useState({});

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Query invites where user is the recipient and status is pending
      const q = query(
        collection(db, 'teaminvites'),
        where('recipientId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      const invitesList = [];
      
      // Fetch team and ladder data for each invite
      const invitePromises = querySnapshot.docs.map(async (inviteDoc) => {
        const inviteData = inviteDoc.data();
        let teamInfo = { name: 'Unknown Team' };
        let ladderInfo = { name: 'Unknown Ladder' };
        let senderName = 'Unknown';
        try {
          // Fetch team data
          if (inviteData.teamId) {
            const teamDoc = await getDoc(doc(db, 'ladderteams', inviteData.teamId));
            if (teamDoc.exists()) {
              teamInfo = teamDoc.data();
            }
          }

          // Fetch ladder data
          if (inviteData.ladderId) {
            const ladderDoc = await getDoc(doc(db, 'ladders', inviteData.ladderId));
            if (ladderDoc.exists()) {
              ladderInfo = ladderDoc.data();
            }
          }

          // Fetch sender data
          console.log('inviteData.senderId', inviteData.senderId);
          if (inviteData.senderId) {
            const senderQuery = query(
              collection(db, 'users'),
              where('uid', '==', inviteData.senderId)
            );
            const senderSnapshot = await getDocs(senderQuery);
            if (!senderSnapshot.empty) {
              const senderData = senderSnapshot.docs[0].data();
              const fullName = `${senderData.firstName || ''} ${senderData.lastName || ''}`.trim();
              senderName = fullName || senderData.email || 'Unknown';
              console.log('senderName', senderName);
            }
          }
        } catch (error) {
          console.error(`Error fetching data for invite ${inviteDoc.id}:`, error);
        }

        return {
          id: inviteDoc.id,
          ...inviteData,
          teamName: teamInfo.name || 'Unknown Team',
          ladderName: ladderInfo.name || 'Unknown Ladder',
          senderName: senderName,
        };
      });

      const invitesWithData = await Promise.all(invitePromises);
      console.log('invitesWithData', invitesWithData);
      
      // Sort by creation date (newest first)
      invitesWithData.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0);
        return bDate - aDate; // Descending order
      });

      setInvites(invitesWithData);
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInvites();
    }, [])
  );

  const handleAccept = (invite) => {
    setSelectedInvite(invite);
    // Fetch current team and ladder data for the modal
    fetchInviteDetails(invite);
    setShowAcceptModal(true);
  };

  const fetchInviteDetails = async (invite) => {
    try {
      const teamDoc = await getDoc(doc(db, 'ladderteams', invite.teamId));
      const ladderDoc = await getDoc(doc(db, 'ladders', invite.ladderId));
      
      if (teamDoc.exists()) {
        setTeamData(teamDoc.data());
      }
      if (ladderDoc.exists()) {
        setLadderData(ladderDoc.data());
      }
    } catch (error) {
      console.error('Error fetching invite details:', error);
    }
  };

  const confirmAccept = async () => {
    if (!selectedInvite) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      setSaving(true);

      // Get current team data
      const teamDoc = await getDoc(doc(db, 'ladderteams', selectedInvite.teamId));
      if (!teamDoc.exists()) {
        alert('Team not found');
        setShowAcceptModal(false);
        setSelectedInvite(null);
        setSaving(false);
        return;
      }

      const teamData = teamDoc.data();
      
      // Get user's member data from ladder
      const ladderDoc = await getDoc(doc(db, 'ladders', selectedInvite.ladderId));
      if (!ladderDoc.exists()) {
        alert('Ladder not found');
        setShowAcceptModal(false);
        setSelectedInvite(null);
        setSaving(false);
        return;
      }

      const ladderData = ladderDoc.data();
      const memberList = ladderData.memberList || [];
      const userMemberData = memberList.find(m => m.userId === user.uid);

      // Check if user is already on a team in this ladder
      const existingTeamsQuery = query(
        collection(db, 'ladderteams'),
        where('ladderId', '==', selectedInvite.ladderId),
        where('memberIds', 'array-contains', user.uid)
      );
      const existingTeamsSnapshot = await getDocs(existingTeamsQuery);
      
      if (!existingTeamsSnapshot.empty) {
        alert('You are already on a team in this ladder. Please leave your current team before accepting this invite.');
        setShowAcceptModal(false);
        setSelectedInvite(null);
        setSaving(false);
        return;
      }

      // Add user to team
      const currentMembers = teamData.members || [];
      const currentMemberIds = teamData.memberIds || [];

      const newMember = {
        userId: user.uid,
        nickname: userMemberData?.nickname || 'Unknown',
        points: userMemberData?.points || 0,
      };

      const newMembers = [...currentMembers, newMember];
      const newMemberIds = [...currentMemberIds, user.uid];

      // Use batch to update team and invite in one transaction
      const batch = writeBatch(db);
      
      // Update team
      batch.update(doc(db, 'ladderteams', selectedInvite.teamId), {
        members: newMembers,
        memberIds: newMemberIds,
      });

      // Update invite status
      batch.update(doc(db, 'teaminvites', selectedInvite.id), {
        status: 'accepted',
      });

      await batch.commit();

      // Close modal and refresh
      setShowAcceptModal(false);
      setSelectedInvite(null);
      await fetchInvites();
    } catch (error) {
      console.error('Error accepting invite:', error);
      alert('Failed to accept invite. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = async (invite) => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'teaminvites', invite.id), {
        status: 'declined',
      });
      await fetchInvites();
    } catch (error) {
      console.error('Error declining invite:', error);
      alert('Failed to decline invite. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancelAccept = () => {
    setShowAcceptModal(false);
    setSelectedInvite(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
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
        <Text style={styles.title}>Team Invites</Text>
        <Text style={styles.subtitle}>
          {invites.length} {invites.length === 1 ? 'invite' : 'invites'}
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {invites.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateEmoji}>📨</Text>
            <Text style={styles.emptyStateTitle}>No Invites</Text>
            <Text style={styles.emptyStateText}>
              You don't have any pending team invites right now.
            </Text>
          </View>
        ) : (
          invites.map((invite) => (
            <View key={invite.id} style={styles.inviteCard}>
              <View style={styles.inviteHeader}>
                <Text style={styles.inviteTitle}>Team Invitation</Text>
                <Text style={styles.inviteDate}>{formatDate(invite.createdAt)}</Text>
              </View>
              
              <Text style={styles.inviteMessage}>
                <Text style={styles.inviteBoldText}>{invite.senderName}</Text> invited you to join{' '}
                <Text style={styles.inviteBoldText}>{invite.teamName}</Text>
              </Text>
              
              <Text style={styles.inviteLadder}>Ladder: {invite.ladderName}</Text>

              <View style={styles.inviteActions}>
                <TouchableOpacity
                  style={[styles.inviteButton, styles.declineButton]}
                  onPress={() => handleDecline(invite)}
                  disabled={saving}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inviteButton, styles.acceptButton]}
                  onPress={() => handleAccept(invite)}
                  disabled={saving}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Accept Confirmation Modal */}
      <Modal
        visible={showAcceptModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelAccept}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Accept Invite</Text>
            <Text style={styles.modalMessage}>
              You are about to join <Text style={styles.modalBoldText}>{selectedInvite?.teamName}</Text> in the{' '}
              <Text style={styles.modalBoldText}>{selectedInvite?.ladderName}</Text> ladder.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelAccept}
                disabled={saving}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmAccept}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
