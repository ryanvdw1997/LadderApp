import React from 'react';
import {
  View,
  Text,
} from 'react-native';
import styles from '../styles/LadderMemberCard.styles';

export default function LadderMemberCard({ member, index, isTeam = false, isAdmin = false, email = '', phoneNumber = '' }) {
  const rank = member.rank !== undefined && member.rank !== null 
    ? member.rank 
    : index + 1;
  
  const displayName = member.nickname || (isTeam ? 'Unknown Team' : 'Unknown');
  const points = member.points || 0;
  const pointsText = points === 1 ? 'point' : 'points';

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberRank}>
        <Text style={styles.rankNumber}>{rank}</Text>
      </View>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{displayName}</Text>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
        {email ? (
          <Text style={styles.memberEmail}>{email}</Text>
        ) : null}
        {isAdmin && phoneNumber ? (
          <Text style={styles.memberPhone}>{phoneNumber}</Text>
        ) : null}
        <Text style={styles.memberPoints}>
          {points} {pointsText}
        </Text>
      </View>
    </View>
  );
}
