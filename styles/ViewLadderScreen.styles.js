import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1F3A',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#252A45',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomColor: '#6C5CE7',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B8FA8',
  },
  activeTabText: {
    color: '#6C5CE7',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  listContainer: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#8B8FA8',
    textAlign: 'center',
    lineHeight: 24,
  },
});
