import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  ladderCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#252A45',
    overflow: 'hidden',
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
  ladderCardContent: {
    padding: 20,
  },
  ladderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ladderName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  adminBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginLeft: 12,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ladderDate: {
    fontSize: 14,
    color: '#8B8FA8',
    marginBottom: 16,
  },
  ladderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: '#252A45',
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gameTypeIcon: {
    width: 24,
    height: 24,
  },
  teamTypeIcon: {
    fontSize: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#252A45',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#252A45',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  deleteButton: {
    backgroundColor: '#3A1F1F',
  },
  leaveButton: {
    backgroundColor: '#3A2F1F',
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  createTeamButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#6C5CE7',
    marginLeft: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  createTeamButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
