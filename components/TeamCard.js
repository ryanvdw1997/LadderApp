import React from 'react';
import {
  View,
  Text,
} from 'react-native';
import styles from '../styles/TeamCard.styles';

export default function TeamCard({ team, index }) {
  const rank = team.rank !== undefined && team.rank !== null 
    ? team.rank 
    : index + 1;
  
  const teamName = team.name || 'Unnamed Team';
  const points = team.points || 0;
  const pointsText = points === 1 ? 'point' : 'points';
  const members = team.members || [];

  return (
    <View style={styles.teamCard}>
      <View style={styles.teamRank}>
        <Text style={styles.rankNumber}>{rank}</Text>
      </View>
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{teamName}</Text>
        <View style={styles.teamMembers}>
          {members.map((member, idx) => (
            <Text key={member.userId || idx} style={styles.memberName}>
              {member.nickname || 'Unknown'}
              {idx < members.length - 1 ? ', ' : ''}
            </Text>
          ))}
        </View>
        <Text style={styles.teamPoints}>
          {points} {pointsText}
        </Text>
      </View>
    </View>
  );
}
