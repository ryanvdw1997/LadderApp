import React from 'react';
import {
  View,
  Text,
} from 'react-native';
import styles from '../styles/LadderMemberCard.styles';

export default function LadderMemberCard({ member, index, isTeam = false }) {
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
        <Text style={styles.memberName}>{displayName}</Text>
        <Text style={styles.memberPoints}>
          {points} {pointsText}
        </Text>
      </View>
    </View>
  );
}
