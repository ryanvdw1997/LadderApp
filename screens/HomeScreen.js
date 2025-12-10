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

export default function HomeScreen({ navigation }) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const menuButtons = [
    { 
      label: 'My Ladders', 
      onPress: () => navigation.navigate('MyLadders'),
      icon: '🏆'
    },
    { 
      label: 'Ladder Invites', 
      onPress: () => {
        // Navigate to invites screen (to be implemented)
        console.log('Navigate to invites');
      },
      icon: '📨'
    },
    { 
      label: 'Requests', 
      onPress: () => {
        // Navigate to requests screen (to be implemented)
        console.log('Navigate to requests');
      },
      icon: '🔔'
    },
  ];

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

      <View style={styles.buttonsContainer}>
        {menuButtons.map((button, index) => (
          <TouchableOpacity
            key={button.label}
            style={[
              styles.menuButton,
              index === menuButtons.length - 1 && styles.menuButtonLast,
            ]}
            onPress={button.onPress}
          >
            <Text style={styles.menuButtonIcon}>{button.icon}</Text>
            <Text style={styles.menuButtonText}>{button.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
