import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import styles from '../styles/EditLadderScreen.styles';

export default function EditLadderScreen({ navigation }) {
  const route = useRoute();
  const { ladderId } = route.params || {};
  
  const [ladder, setLadder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ladderName, setLadderName] = useState('');
  const [gameType, setGameType] = useState('tennis');
  const [teamType, setTeamType] = useState('singles');
  const [isPublic, setIsPublic] = useState(true);
  const [matchExpirationDays, setMatchExpirationDays] = useState(7);
  const [activeTab, setActiveTab] = useState('players');
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
        const ladderData = {
          id: ladderDoc.id,
          ...data,
        };
        setLadder(ladderData);
        setLadderName(data.name || '');
        setGameType(data.type || 'tennis');
        setTeamType(data.teamType || 'singles');
        setIsPublic(data.public === 1);
        setMatchExpirationDays(data.matchExpirationDays || 7);
      } else {
        console.error('Ladder not found');
      }
    } catch (error) {
      console.error('Error fetching ladder:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitChanges = async () => {
    if (!ladderName.trim() || ladderName.trim().length < 3) {
      alert('Ladder name must be at least 3 characters');
      return;
    }

    try {
      setSaving(true);
      
      // Prepare update object
      const updates = {
        name: ladderName.trim(),
        type: gameType,
        teamType: teamType,
        public: isPublic ? 1 : 0,
        matchExpirationDays: matchExpirationDays,
      };

      await updateDoc(doc(db, 'ladders', ladderId), updates);
      
      // Update local state
      setLadder({ 
        ...ladder, 
        name: ladderName.trim(),
        type: gameType,
        teamType: teamType,
        public: isPublic ? 1 : 0,
        matchExpirationDays: matchExpirationDays,
      });

      // Show success message
      setShowSuccessModal(true);
      
      // Navigate back after a short delay
      setTimeout(() => {
        setShowSuccessModal(false);
        navigation.goBack();
      }, 1500);
      
    } catch (error) {
      console.error('Error updating ladder:', error);
      alert('Failed to save changes. Please try again.');
      setSaving(false);
    }
  };

  const handleMakeAdmin = async (member) => {
    if (!ladder || !member) return;

    try {
      setSaving(true);
      const currentAdminList = ladder.adminList || [];
      
      // Don't add if already admin
      if (currentAdminList.includes(member.userId)) {
        setSaving(false);
        return;
      }

      const newAdminList = [...currentAdminList, member.userId];
      
      await updateDoc(doc(db, 'ladders', ladderId), {
        adminList: newAdminList,
      });

      // Update local state
      setLadder({
        ...ladder,
        adminList: newAdminList,
      });
      
      setExpandedPlayer(null);
    } catch (error) {
      console.error('Error making user admin:', error);
      alert('Failed to make user admin. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMemberClick = (member) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Prevent removing yourself
    if (member.userId === currentUser.uid) {
      alert('You cannot remove yourself from the ladder.');
      return;
    }

    setMemberToRemove(member);
    setShowRemoveModal(true);
  };

  const confirmRemoveMember = async () => {
    if (!ladder || !memberToRemove) return;

    try {
      setSaving(true);
      const currentMemberList = ladder.memberList || [];
      const currentMemberIds = ladder.memberIds || [];
      const currentAdminList = ladder.adminList || [];

      // Remove from memberList
      const newMemberList = currentMemberList.filter(
        (m) => m.userId !== memberToRemove.userId
      );

      // Remove from memberIds
      const newMemberIds = currentMemberIds.filter(
        (id) => id !== memberToRemove.userId
      );

      // Remove from adminList if they were an admin
      const newAdminList = currentAdminList.filter(
        (id) => id !== memberToRemove.userId
      );

      await updateDoc(doc(db, 'ladders', ladderId), {
        memberList: newMemberList,
        memberIds: newMemberIds,
        adminList: newAdminList,
      });

      // Update local state
      setLadder({
        ...ladder,
        memberList: newMemberList,
        memberIds: newMemberIds,
        adminList: newAdminList,
      });

      setExpandedPlayer(null);
      setShowRemoveModal(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancelRemoveMember = () => {
    setShowRemoveModal(false);
    setMemberToRemove(null);
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

  const isAdmin = (userId) => {
    return ladder.adminList && ladder.adminList.includes(userId);
  };

  const renderPlayersTab = () => {
    const members = ladder.memberList || [];

    if (members.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No players yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {members.map((member, index) => (
          <View key={member.userId || index} style={styles.playerCard}>
            <TouchableOpacity
              style={styles.playerCardHeader}
              onPress={() =>
                setExpandedPlayer(
                  expandedPlayer === member.userId ? null : member.userId
                )
              }
            >
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  {member.nickname || 'Unknown'}
                </Text>
                {isAdmin(member.userId) && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                )}
              </View>
              <Text style={styles.dropdownIcon}>
                {expandedPlayer === member.userId ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {expandedPlayer === member.userId && (
              <View style={styles.dropdownContent}>
                {!isAdmin(member.userId) && (
                  <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => handleMakeAdmin(member)}
                    disabled={saving}
                  >
                    <Text style={styles.actionOptionText}>Make Admin</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionOption, styles.removeOption]}
                  onPress={() => handleRemoveMemberClick(member)}
                  disabled={saving}
                >
                  <Text style={styles.removeOptionText}>Remove from Ladder</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
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
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmitChanges}
            disabled={saving || !ladderName.trim() || ladderName.trim().length < 3}
          >
            <Text style={styles.submitButtonText}>Submit Changes</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Edit Ladder</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ladder Name</Text>
          <TextInput
            style={styles.input}
            value={ladderName}
            onChangeText={setLadderName}
            placeholder="Enter ladder name"
            placeholderTextColor="#8B8FA8"
            editable={!saving}
          />
        </View>

        {/* Game Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sport Type</Text>
          <View style={styles.gameTypeContainer}>
            <TouchableOpacity
              style={[
                styles.gameTypeButton,
                gameType === 'tennis' && styles.gameTypeButtonActive,
              ]}
              onPress={() => setGameType('tennis')}
              disabled={saving}
            >
              <Image 
                source={require('../assets/tennis.png')} 
                style={styles.gameTypeImage}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.gameTypeText,
                  gameType === 'tennis' && styles.gameTypeTextActive,
                ]}
              >
                Tennis
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.gameTypeButton,
                gameType === 'pickleball' && styles.gameTypeButtonActive,
              ]}
              onPress={() => setGameType('pickleball')}
              disabled={saving}
            >
              <Image 
                source={require('../assets/pickleball.png')} 
                style={styles.gameTypeImage}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.gameTypeText,
                  gameType === 'pickleball' && styles.gameTypeTextActive,
                ]}
              >
                Pickleball
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Team Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Type</Text>
          <View style={styles.teamTypeContainer}>
            <TouchableOpacity
              style={[
                styles.teamTypeButton,
                teamType === 'singles' && styles.teamTypeButtonActive,
              ]}
              onPress={() => setTeamType('singles')}
              disabled={saving}
            >
              <Text
                style={[
                  styles.teamTypeText,
                  teamType === 'singles' && styles.teamTypeTextActive,
                ]}
              >
                👤 Singles
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.teamTypeButton,
                teamType === 'doubles' && styles.teamTypeButtonActive,
              ]}
              onPress={() => setTeamType('doubles')}
              disabled={saving}
            >
              <Text
                style={[
                  styles.teamTypeText,
                  teamType === 'doubles' && styles.teamTypeTextActive,
                ]}
              >
                👥 Doubles
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.teamTypeButton,
                teamType === 'teams' && styles.teamTypeButtonActive,
              ]}
              onPress={() => setTeamType('teams')}
              disabled={saving}
            >
              <Text
                style={[
                  styles.teamTypeText,
                  teamType === 'teams' && styles.teamTypeTextActive,
                ]}
              >
                👤👤👤 Teams
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Match Expiration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match Expiration (Days)</Text>
          <Text style={styles.sectionDescription}>
            Matches expire after this many days (1-14)
          </Text>
          <View style={styles.expirationDaysContainer}>
            {[1, 3, 5, 7, 10, 14].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.expirationDayButton,
                  matchExpirationDays === days && styles.expirationDayButtonActive,
                ]}
                onPress={() => setMatchExpirationDays(days)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.expirationDayText,
                    matchExpirationDays === days && styles.expirationDayTextActive,
                  ]}
                >
                  {days}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => setIsPublic(!isPublic)}
            disabled={saving}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>
                {isPublic ? 'Public' : 'Private'}
              </Text>
              <Text style={styles.toggleDescription}>
                {isPublic
                  ? 'Anyone can join this ladder'
                  : 'Only invited members can join'}
              </Text>
            </View>
            <View
              style={[
                styles.toggleSwitch,
                isPublic && styles.toggleSwitchActive,
              ]}
            >
              <View
                style={[
                  styles.toggleSwitchThumb,
                  isPublic && styles.toggleSwitchThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'players' && styles.activeTab]}
            onPress={() => setActiveTab('players')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'players' && styles.activeTabText,
              ]}
            >
              Players
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'players' && renderPlayersTab()}
        </View>
      </ScrollView>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      {/* Remove Member Confirmation Modal */}
      <Modal
        visible={showRemoveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelRemoveMember}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Remove Member</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove "{memberToRemove?.nickname || 'this member'}" from the ladder?
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelRemoveMember}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmRemoveMember}
                disabled={saving}
              >
                <Text style={styles.modalConfirmButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContainer}>
            <Text style={styles.successModalText}>Changes Saved!</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
