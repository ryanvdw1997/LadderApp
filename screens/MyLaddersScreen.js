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
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/MyLaddersScreen.styles';
import LadderCard from '../components/LadderCard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function MyLaddersScreen({ navigation }) {
  const [ladders, setLadders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [ladderToDelete, setLadderToDelete] = useState(null);

  const fetchLadders = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Query ladders where user is a member
      // Use memberIds array (denormalized) for efficient querying
      // Fallback to memberList for backward compatibility with old format
      const q = query(
        collection(db, 'ladders'),
        where('memberIds', 'array-contains', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const laddersList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        laddersList.push({
          id: doc.id,
          ...data,
          isAdmin: data.adminList && data.adminList.includes(user.uid),
        });
      });

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

  const handleCreateTeam = (ladder) => {
    // Note: Teams are now created within sessions, so this should navigate to sessions first
    // For now, navigate to ViewLadder where user can create teams in a session
    navigation.navigate('ViewLadder', { ladderId: ladder.id });
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
              onCreateTeam={handleCreateTeam}
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
    </SafeAreaView>
  );
}
