import React, { useState, useEffect } from 'react';
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
import styles from '../styles/ViewLadderScreen.styles';
import LadderMemberCard from '../components/LadderMemberCard';

export default function ViewLadderScreen({ navigation }) {
  const route = useRoute();
  const { ladderId } = route.params || {};
  
  const [ladder, setLadder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players'); // 'players' or 'matches'
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [showMakeAdminModal, setShowMakeAdminModal] = useState(false);
  const [memberToMakeAdmin, setMemberToMakeAdmin] = useState(null);
  const [memberUserData, setMemberUserData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [memberEmails, setMemberEmails] = useState({}); // userId -> email mapping

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
        const user = auth.currentUser;
        const isAdmin = user && data.adminList && data.adminList.includes(user.uid);
        const ladderData = {
          id: ladderDoc.id,
          ...data,
          isAdmin,
        };
        setLadder(ladderData);

        // Fetch email addresses for all members
        const memberList = data.memberList || [];
        const emailMap = {};
        
        // Fetch all user emails in parallel
        const emailPromises = memberList.map(async (member) => {
          try {
            const q = query(
              collection(db, 'users'),
              where('uid', '==', member.userId)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userData = querySnapshot.docs[0].data();
              emailMap[member.userId] = userData.email || '';
            }
          } catch (error) {
            console.error(`Error fetching email for user ${member.userId}:`, error);
          }
        });

        await Promise.all(emailPromises);
        setMemberEmails(emailMap);
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
    if (sortedMembers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No teams yet</Text>
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
                    isTeam={true}
                    isAdmin={isAdmin(member.userId)}
                    email={memberEmails[member.userId] || ''}
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
    </SafeAreaView>
  );
}
