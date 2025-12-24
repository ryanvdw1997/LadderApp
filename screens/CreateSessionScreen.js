import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
// Note: Date picker implementation - using native date input for simplicity
// If @react-native-community/datetimepicker is installed, uncomment the import above
import styles from '../styles/CreateSessionScreen.styles';

export default function CreateSessionScreen({ navigation }) {
  const route = useRoute();
  const { ladderId } = route.params || {};
  
  const [ladder, setLadder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Date states - using ISO date strings for simplicity
  const getTodayISO = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const getDefaultEndDateISO = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };
  
  const [startDateISO, setStartDateISO] = useState(getTodayISO());
  const [endDateISO, setEndDateISO] = useState(getDefaultEndDateISO());
  
  // Expiration settings
  const [expirationValue, setExpirationValue] = useState(7);
  const [expirationUnit, setExpirationUnit] = useState('days'); // 'days' or 'weeks'
  
  // Ranking method
  const [rankingMethod, setRankingMethod] = useState('points'); // 'points' or 'winloss'

  useEffect(() => {
    fetchLadder();
  }, [ladderId]);

  const fetchLadder = async () => {
    try {
      setLoading(true);
      if (!ladderId) {
        setError('No ladder ID provided');
        setLoading(false);
        return;
      }

      const ladderDoc = await getDoc(doc(db, 'ladders', ladderId));
      if (!ladderDoc.exists()) {
        setError('Ladder not found');
        setLoading(false);
        return;
      }

      const ladderData = ladderDoc.data();
      setLadder({
        id: ladderDoc.id,
        ...ladderData,
      });
    } catch (error) {
      console.error('Error fetching ladder:', error);
      setError('Failed to load ladder data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    setError('');
    const user = auth.currentUser;
    if (!user) {
      setError('You must be logged in');
      return;
    }

    if (!ladder) {
      setError('Ladder not loaded');
      return;
    }

    // Convert ISO strings to Date objects for validation
    const startDate = new Date(startDateISO + 'T00:00:00');
    const endDate = new Date(endDateISO + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate dates
    if (endDate <= startDate) {
      setError('End date must be after start date');
      return;
    }

    if (startDate < today) {
      setError('Start date cannot be in the past');
      return;
    }

    // Validate expiration
    if (expirationValue < 1) {
      setError('Expiration must be at least 1');
      return;
    }

    try {
      setSaving(true);

      // Calculate expiration duration in days
      const expirationDays = expirationUnit === 'weeks' 
        ? expirationValue * 7 
        : expirationValue;

      // Create session document
      const sessionData = {
        ladderId: ladderId,
        name: `Session ${formatDate(startDateISO)} - ${formatDate(endDateISO)}`,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        expirationDays: expirationDays,
        expirationValue: expirationValue,
        expirationUnit: expirationUnit,
        rankingMethod: rankingMethod, // 'points' or 'winloss'
        teamIds: [], // Array of team document IDs for teams in this session
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        status: 'upcoming', // 'upcoming', 'active', 'completed'
      };

      await addDoc(collection(db, 'sessions'), sessionData);

      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (isoDate) => {
    const date = new Date(isoDate + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStartDateChange = (text) => {
    setStartDateISO(text);
    // If selected start date is after or equal to end date, update end date
    if (text >= endDateISO) {
      const startDate = new Date(text + 'T00:00:00');
      const newEndDate = new Date(startDate);
      newEndDate.setDate(newEndDate.getDate() + 30);
      setEndDateISO(newEndDate.toISOString().split('T')[0]);
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

  if (!ladder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ladder not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Session</Text>
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

        {/* Start Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Date</Text>
          <View style={styles.dateInputContainer}>
            <TextInput
              style={styles.dateInput}
              value={startDateISO}
              onChangeText={handleStartDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#8B8FA8"
              editable={!saving}
            />
            <Text style={styles.dateDisplayText}>{formatDate(startDateISO)}</Text>
          </View>
        </View>

        {/* End Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>End Date</Text>
          <View style={styles.dateInputContainer}>
            <TextInput
              style={styles.dateInput}
              value={endDateISO}
              onChangeText={setEndDateISO}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#8B8FA8"
              editable={!saving}
            />
            <Text style={styles.dateDisplayText}>{formatDate(endDateISO)}</Text>
          </View>
        </View>

        {/* Matchup Expiration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matchup Expiration</Text>
          <Text style={styles.sectionDescription}>
            How long do players have to complete matchups in this session?
          </Text>
          
          {/* Expiration Value Input */}
          <View style={styles.expirationContainer}>
            <View style={styles.expirationInputContainer}>
              <Text style={styles.expirationLabel}>Duration:</Text>
              <View style={styles.numberInputContainer}>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() => setExpirationValue(Math.max(1, expirationValue - 1))}
                  disabled={saving || expirationValue <= 1}
                >
                  <Text style={styles.numberButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.numberInput}>{expirationValue}</Text>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() => setExpirationValue(expirationValue + 1)}
                  disabled={saving}
                >
                  <Text style={styles.numberButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Unit Selection */}
            <View style={styles.unitContainer}>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  expirationUnit === 'days' && styles.unitButtonActive,
                ]}
                onPress={() => setExpirationUnit('days')}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    expirationUnit === 'days' && styles.unitButtonTextActive,
                  ]}
                >
                  Days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  expirationUnit === 'weeks' && styles.unitButtonActive,
                ]}
                onPress={() => setExpirationUnit('weeks')}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    expirationUnit === 'weeks' && styles.unitButtonTextActive,
                  ]}
                >
                  Weeks
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Ranking Method Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ranking Method</Text>
          <Text style={styles.sectionDescription}>
            How should players be ranked in this session?
          </Text>
          
          <View style={styles.rankingMethodContainer}>
            <TouchableOpacity
              style={[
                styles.rankingMethodButton,
                rankingMethod === 'points' && styles.rankingMethodButtonActive,
              ]}
              onPress={() => setRankingMethod('points')}
              disabled={saving}
            >
              <Text style={styles.rankingMethodEmoji}>📊</Text>
              <Text
                style={[
                  styles.rankingMethodText,
                  rankingMethod === 'points' && styles.rankingMethodTextActive,
                ]}
              >
                Points Based
              </Text>
              <Text style={styles.rankingMethodDescription}>
                Rank by accumulated points
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rankingMethodButton,
                rankingMethod === 'winloss' && styles.rankingMethodButtonActive,
              ]}
              onPress={() => setRankingMethod('winloss')}
              disabled={saving}
            >
              <Text style={styles.rankingMethodEmoji}>🏆</Text>
              <Text
                style={[
                  styles.rankingMethodText,
                  rankingMethod === 'winloss' && styles.rankingMethodTextActive,
                ]}
              >
                Win/Loss Based
              </Text>
              <Text style={styles.rankingMethodDescription}>
                Rank by win/loss record
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            saving && styles.createButtonDisabled,
          ]}
          onPress={handleCreateSession}
          disabled={saving}
        >
          <Text style={styles.createButtonText}>
            {saving ? 'Creating...' : 'Create Session'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

