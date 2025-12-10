import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/MyLaddersScreen.styles';

export default function MyLaddersScreen({ navigation }) {
  const [ladders, setLadders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLadders = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Query ladders where user is a member
      // Note: Firestore requires an index for array-contains + orderBy
      // For now, we'll fetch and sort in memory
      const q = query(
        collection(db, 'ladders'),
        where('memberList', 'array-contains', user.uid)
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

  const getGameTypeIcon = (type) => {
    if (type === 'tennis') {
      return require('../assets/tennis.png');
    } else if (type === 'pickleball') {
      return require('../assets/pickleball.png');
    }
    return null;
  };

  const getTeamTypeIcon = (teamType) => {
    switch (teamType) {
      case 'singles':
        return '👤';
      case 'doubles':
        return '👥';
      case 'teams':
        return '👤👤👤';
      default:
        return '👤';
    }
  };

  const handleViewLadder = (ladder) => {
    // Navigate to ladder details (to be implemented later)
    console.log('View ladder:', ladder.id);
  };

  const handleEditLadder = (ladder) => {
    // Navigate to edit ladder screen (to be implemented later)
    console.log('Edit ladder:', ladder.id);
  };

  const handleDeleteLadder = (ladder) => {
    // Delete ladder functionality (to be implemented later)
    console.log('Delete ladder:', ladder.id);
    // TODO: Add confirmation dialog and delete logic
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
            <View key={ladder.id} style={styles.ladderCard}>
              <TouchableOpacity
                style={styles.ladderCardContent}
                onPress={() => handleViewLadder(ladder)}
              >
                <View style={styles.ladderCardHeader}>
                  <Text style={styles.ladderName}>{ladder.name}</Text>
                  {ladder.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.ladderDate}>
                  {formatDate(ladder.createdAt)}
                </Text>

                <View style={styles.ladderIcons}>
                  {ladder.type && (
                    <View style={styles.iconContainer}>
                      <Image
                        source={getGameTypeIcon(ladder.type)}
                        style={styles.gameTypeIcon}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  {ladder.teamType && (
                    <View style={styles.iconContainer}>
                      <Text style={styles.teamTypeIcon}>
                        {getTeamTypeIcon(ladder.teamType)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewLadder(ladder)}
                >
                  <Text style={styles.actionButtonIcon}>👁️</Text>
                </TouchableOpacity>
                {ladder.isAdmin && (
                  <>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditLadder(ladder)}
                    >
                      <Text style={styles.actionButtonIcon}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteLadder(ladder)}
                    >
                      <Text style={styles.actionButtonIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
