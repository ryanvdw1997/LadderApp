import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 20,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B8FA8',
    marginBottom: 30,
  },
  form: {
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputHint: {
    fontSize: 13,
    color: '#8B8FA8',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#252A45',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gameTypeContainer: {
    flexDirection: 'row',
  },
  gameTypeButton: {
    flex: 1,
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#252A45',
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gameTypeButtonLast: {
    marginRight: 0,
  },
  gameTypeButtonActive: {
    borderColor: '#6C5CE7',
    backgroundColor: '#252A45',
    ...Platform.select({
      ios: {
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gameTypeEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  gameTypeImage: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  gameTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B8FA8',
  },
  gameTypeTextActive: {
    color: '#6C5CE7',
    fontWeight: 'bold',
  },
  teamTypeContainer: {
    flexDirection: 'row',
  },
  teamTypeButton: {
    flex: 1,
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#252A45',
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  teamTypeButtonLast: {
    marginRight: 0,
  },
  teamTypeButtonActive: {
    borderColor: '#6C5CE7',
    backgroundColor: '#252A45',
    ...Platform.select({
      ios: {
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  teamTypeEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  teamTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B8FA8',
    textAlign: 'center',
  },
  teamTypeTextActive: {
    color: '#6C5CE7',
    fontWeight: 'bold',
  },
  visibilityContainer: {
  },
  visibilityButton: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#252A45',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  visibilityButtonActive: {
    borderColor: '#6C5CE7',
    backgroundColor: '#252A45',
    ...Platform.select({
      ios: {
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  visibilityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B8FA8',
    marginBottom: 4,
  },
  visibilityTextActive: {
    color: '#6C5CE7',
    fontWeight: 'bold',
  },
  visibilitySubtext: {
    fontSize: 14,
    color: '#8B8FA8',
  },
  createButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
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
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
