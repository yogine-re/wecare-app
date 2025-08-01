import { makeRedirectUri, ResponseType, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = 'your-web-client-id';
const GOOGLE_IOS_CLIENT_ID = 'your-ios-client-id';

const clientId = Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_WEB_CLIENT_ID;

export default function LoginScreen() {
  const redirectUri = makeRedirectUri({
    native: 'com.yourapp:/oauthredirect',
  });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId,
      scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
      responseType: ResponseType.Token,
      redirectUri,
    }
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { access_token } = response.params;
      // Use the access token
    }
  }, [response]);

  return (
    <View>
      <Text>Login Screen</Text>
    </View>
  );
} 