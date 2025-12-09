import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.config';
import styles from '../styles/HomeScreen.styles';

export default function HomeScreen() {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>You are successfully logged in</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
