import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, where, getDocs, doc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import { Modal } from 'react-native';
import { auth, db } from '../firebase.config';
import styles from '../styles/MyLaddersScreen.styles';
import LadderCard from '../components/LadderCard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function MyLaddersScreen({ navigation }) {
  const [ladders, setLadders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [ladderToDelete, setLadderToDelete] = useState(null);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [ladderToLeave, setLadderToLeave] = useState(null);
  const [leaving, setLeaving] = useState(false);

  const fetchLadders = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Query laddermembers to find all ladders where user is a member
      const membersQuery = query(
        collection(db, 'laddermembers'),
        where('memberId', '==', user.uid)
      );
      const membersSnapshot = await getDocs(membersQuery);

      if (membersSnapshot.empty) {
        setLadders([]);
        setLoading(false);
        return;
      }

      // Extract ladderIds and admin status
      const ladderDataMap = {};
      membersSnapshot.forEach((memberDoc) => {
        const memberData = memberDoc.data();
        ladderDataMap[memberData.ladderId] = {
          isAdmin: memberData.isAdmin || false,
        };
      });

      // Fetch all ladders
      const ladderIds = Object.keys(ladderDataMap);
      const laddersList = [];
      
      await Promise.all(
        ladderIds.map(async (ladderId) => {
          try {
            const ladderDoc = await getDoc(doc(db, 'ladders', ladderId));
            if (ladderDoc.exists()) {
              const data = ladderDoc.data();
              laddersList.push({
                id: ladderDoc.id,
                ...data,
                isAdmin: ladderDataMap[ladderId].isAdmin,
              });
            }
          } catch (error) {
            console.error(`Error fetching ladder ${ladderId}:`, error);
          }
        })
      );

      // Sort by createdAt in descending order (newest first)
      laddersList.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0);
        return bDate - aDate; // Descending order
      });

      setLadders(laddersList);
    } catch (error) {
      console.error('Error fetching ladders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch ladders whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchLadders();
    }, [])
  );

  const handleViewLadder = (ladder) => {
    navigation.navigate('ViewLadder', { ladderId: ladder.id });
  };

  const handleEditLadder = (ladder) => {
    navigation.navigate('EditLadder', { ladderId: ladder.id });
  };

  const handleDeleteLadder = (ladder) => {
    setLadderToDelete(ladder);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!ladderToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'ladders', ladderToDelete.id));
      // Refetch ladders to update the list
      await fetchLadders();
      setDeleteModalVisible(false);
      setLadderToDelete(null);
    } catch (error) {
      console.error('Error deleting ladder:', error);
      setDeleteModalVisible(false);
      setLadderToDelete(null);
      Alert.alert(
        'Error',
        'Failed to delete ladder. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setLadderToDelete(null);
  };

  const handleLeaveLadder = (ladder) => {
    setLadderToLeave(ladder);
    setLeaveModalVisible(true);
  };

  const confirmLeave = async () => {
    if (!ladderToLeave) return;
    
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLeaving(true);
      const ladderId = ladderToLeave.id;

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

      // Refetch ladders to update the list
      await fetchLadders();
      setLeaveModalVisible(false);
      setLadderToLeave(null);
    } catch (error) {
      console.error('Error leaving ladder:', error);
      setLeaveModalVisible(false);
      setLadderToLeave(null);
      Alert.alert(
        'Error',
        'Failed to leave ladder. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLeaving(false);
    }
  };

  const cancelLeave = () => {
    setLeaveModalVisible(false);
    setLadderToLeave(null);
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
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateLadder')}
          >
            <Text style={styles.createButtonText}>Create Ladder</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>My Ladders</Text>
        <Text style={styles.subtitle}>
          {ladders.length} {ladders.length === 1 ? 'ladder' : 'ladders'}
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {ladders.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateEmoji}>🏆</Text>
            <Text style={styles.emptyStateTitle}>No Ladders Yet</Text>
            <Text style={styles.emptyStateText}>
              Create or join a ladder to start competing!
            </Text>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => navigation.navigate('CreateLadder')}
            >
              <Text style={styles.primaryButtonText}>Create Ladder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          ladders.map((ladder) => (
            <LadderCard
              key={ladder.id}
              ladder={ladder}
              onView={handleViewLadder}
              onEdit={handleEditLadder}
              onDelete={handleDeleteLadder}
              onLeave={handleLeaveLadder}
            />
          ))
        )}
      </ScrollView>
      
      <ConfirmDeleteModal
        visible={deleteModalVisible}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        ladderName={ladderToDelete?.name || ''}
      />

      {/* Leave Ladder Confirmation Modal */}
      <Modal
        visible={leaveModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLeave}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Leave Ladder</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to leave "{ladderToLeave?.name || 'this ladder'}"? You will be removed from all sessions and will need to be re-invited to rejoin.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelLeave}
                disabled={leaving}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmLeave}
                disabled={leaving}
              >
                {leaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Leave</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
