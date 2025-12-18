import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { auth } from './firebase.config';
import { onAuthStateChanged } from 'firebase/auth';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import CreateLadderScreen from './screens/CreateLadderScreen';
import MyLaddersScreen from './screens/MyLaddersScreen';
import ViewLadderScreen from './screens/ViewLadderScreen';
import EditLadderScreen from './screens/EditLadderScreen';
import ProfileSettingsScreen from './screens/ProfileSettingsScreen';
import CreateTeamScreen from './screens/CreateTeamScreen';
import MyTeamsScreen from './screens/MyTeamsScreen';
import AddPlayersToTeamScreen from './screens/AddPlayersToTeamScreen';
import TeamInvitesScreen from './screens/TeamInvitesScreen';
import CreateMatchupScreen from './screens/CreateMatchupScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return null; // You can add a loading screen here
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CreateLadder" component={CreateLadderScreen} />
            <Stack.Screen name="MyLadders" component={MyLaddersScreen} />
            <Stack.Screen name="ViewLadder" component={ViewLadderScreen} />
            <Stack.Screen name="EditLadder" component={EditLadderScreen} />
            <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
            <Stack.Screen name="CreateTeam" component={CreateTeamScreen} />
            <Stack.Screen name="MyTeams" component={MyTeamsScreen} />
            <Stack.Screen name="AddPlayersToTeam" component={AddPlayersToTeamScreen} />
            <Stack.Screen name="TeamInvites" component={TeamInvitesScreen} />
            <Stack.Screen name="CreateMatchup" component={CreateMatchupScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
