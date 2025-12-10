import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.config';
import styles from '../styles/HomeScreen.styles';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('My Ladders');

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const tabs = ['My Ladders', 'Ladder Invites', 'Requests'];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'My Ladders':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateEmoji}>🏆</Text>
              <Text style={styles.emptyStateTitle}>No Ladders Yet</Text>
              <Text style={styles.emptyStateText}>
                Create or join a ladder to start competing!
              </Text>
              <TouchableOpacity style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Create Ladder</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'Ladder Invites':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateEmoji}>📨</Text>
              <Text style={styles.emptyStateTitle}>No Invites</Text>
              <Text style={styles.emptyStateText}>
                You don't have any pending ladder invitations.
              </Text>
            </View>
          </View>
        );
      case 'Requests':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateEmoji}>🔔</Text>
              <Text style={styles.emptyStateTitle}>No Requests</Text>
              <Text style={styles.emptyStateText}>
                Your ladder join requests will appear here.
              </Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.userName}>Ready to climb? 🚀</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
