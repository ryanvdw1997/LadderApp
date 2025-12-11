import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { updateEmail, updateProfile } from 'firebase/auth';
import styles from '../styles/ProfileSettingsScreen.styles';

export default function ProfileSettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        navigation.goBack();
        return;
      }

      setEmail(user.email || '');

      // Query users collection to find the current user's document
      const q = query(
        collection(db, 'users'),
        where('uid', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        setUserId(userDoc.id);
        setFirstName(userData.firstName || '');
        setLastName(userData.lastName || '');
        setPhoneNumber(userData.phoneNumber || '');
      } else {
        // If user document doesn't exist, create it
        console.warn('User document not found in Firestore');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');

    if (!firstName.trim() || firstName.trim().length < 2) {
      setError('First name must be at least 2 characters');
      return;
    }

    if (!lastName.trim() || lastName.trim().length < 2) {
      setError('Last name must be at least 2 characters');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      const user = auth.currentUser;
      if (!user || !userId) {
        setError('User not found');
        return;
      }

      // Update Firestore user document
      const userRef = doc(db, 'users', userId);
      const updateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      };

      // Only update email if it changed
      if (email.trim() !== user.email) {
        // Update Firebase Auth email
        await updateEmail(user, email.trim());
        updateData.email = email.trim();
      }

      await updateDoc(userRef, updateData);

      // Navigate back after successful save
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        setError('For security, please sign out and sign back in to change your email.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use by another account.');
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Profile Settings</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                setError('');
              }}
              placeholder="Enter first name"
              placeholderTextColor="#8B8FA8"
              maxLength={50}
              autoCapitalize="words"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                setError('');
              }}
              placeholder="Enter last name"
              placeholderTextColor="#8B8FA8"
              maxLength={50}
              autoCapitalize="words"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              placeholder="Enter email"
              placeholderTextColor="#8B8FA8"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                setError('');
              }}
              placeholder="Enter phone number"
              placeholderTextColor="#8B8FA8"
              keyboardType="phone-pad"
              maxLength={20}
              editable={!saving}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
