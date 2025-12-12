import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  teamCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252A45',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  teamRank: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  teamMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  memberName: {
    fontSize: 14,
    color: '#8B8FA8',
  },
  teamPoints: {
    fontSize: 14,
    color: '#8B8FA8',
  },
});
