import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import styles from '../styles/LadderCard.styles';

export default function LadderCard({ ladder, onView, onEdit, onDelete, onCreateTeam }) {
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

  return (
    <View style={styles.ladderCard}>
      <TouchableOpacity
        style={styles.ladderCardContent}
        onPress={() => onView(ladder)}
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
          onPress={() => onView(ladder)}
        >
          <Text style={styles.actionButtonIcon}>👁️</Text>
        </TouchableOpacity>
        {(ladder.teamType === 'doubles' || ladder.teamType === 'teams') && onCreateTeam && (
          <TouchableOpacity
            style={styles.createTeamButton}
            onPress={() => onCreateTeam(ladder)}
          >
            <Text style={styles.createTeamButtonText}>Create Team</Text>
          </TouchableOpacity>
        )}
        {ladder.isAdmin && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(ladder)}
            >
              <Text style={styles.actionButtonIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => onDelete(ladder)}
            >
              <Text style={styles.actionButtonIcon}>🗑️</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
