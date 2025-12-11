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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.config';
import styles from '../styles/ViewLadderScreen.styles';
import LadderMemberCard from '../components/LadderMemberCard';

export default function ViewLadderScreen({ navigation }) {
  const route = useRoute();
  const { ladderId } = route.params || {};
  
  const [ladder, setLadder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players'); // 'players' or 'matches'

  useEffect(() => {
    fetchLadder();
  }, [ladderId]);

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
        setLadder({
          id: ladderDoc.id,
          ...data,
        });
      } else {
        console.error('Ladder not found');
      }
    } catch (error) {
      console.error('Error fetching ladder:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSingles = ladder?.teamType === 'singles';
  const sectionTitle = isSingles ? 'Players' : 'Teams';

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

  const renderPlayersList = () => {
    if (sortedMembers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No players yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {sortedMembers.map((member, index) => (
          <LadderMemberCard
            key={member.userId || index}
            member={member}
            index={index}
            isTeam={false}
          />
        ))}
      </View>
    );
  };

  const renderTeamsList = () => {
    if (sortedMembers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No teams yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {sortedMembers.map((member, index) => (
          <LadderMemberCard
            key={member.userId || index}
            member={member}
            index={index}
            isTeam={true}
          />
        ))}
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
        <Text style={styles.title}>{ladder.name}</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'players' && styles.activeTab]}
          onPress={() => setActiveTab('players')}
        >
          <Text style={[styles.tabText, activeTab === 'players' && styles.activeTabText]}>
            {sectionTitle}
          </Text>
        </TouchableOpacity>
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
        {activeTab === 'players' ? (
          isSingles ? renderPlayersList() : renderTeamsList()
        ) : (
          renderMatchesList()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
