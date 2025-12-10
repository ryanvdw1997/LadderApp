import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    backgroundColor: '#1A1F3A',
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#8B8FA8',
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2F4A',
    justifyContent: 'center',
    alignItems: 'center',
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
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statCard: {
    backgroundColor: '#252A45',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 90,
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
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6C5CE7',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8B8FA8',
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  menuButton: {
    flex: 1,
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252A45',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
    marginRight: 6,
  },
  menuButtonLast: {
    marginRight: 0,
  },
  menuButtonIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  menuButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8B8FA8',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: '#2A2F4A',
    margin: 20,
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3F5A',
  },
  signOutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});
