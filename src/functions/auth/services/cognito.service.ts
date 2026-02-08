import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AdminGetUserCommand,
  GlobalSignOutCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID || '';
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID || '';

export interface CognitoSignUpResult {
  userSub: string;
  userConfirmed: boolean;
}

export interface CognitoAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class CognitoService {
  async signUp(
    email: string,
    password: string,
    attributes?: Record<string, string>
  ): Promise<CognitoSignUpResult> {
    const userAttributes = [
      { Name: 'email', Value: email },
      ...(attributes
        ? Object.entries(attributes).map(([key, value]) => ({
            Name: key,
            Value: value,
          }))
        : []),
    ];

    const command = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
    });

    const response = await client.send(command);

    return {
      userSub: response.UserSub || '',
      userConfirmed: response.UserConfirmed || false,
    };
  }

  async signIn(email: string, password: string): Promise<CognitoAuthResult> {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);

    if (!response.AuthenticationResult) {
      throw new Error('Authentication failed');
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken || '',
      refreshToken: response.AuthenticationResult.RefreshToken || '',
      expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const command = new ForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
    });

    await client.send(command);
  }

  async confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    });

    await client.send(command);
  }

  async refreshToken(refreshToken: string): Promise<CognitoAuthResult> {
    const command = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response = await client.send(command);

    if (!response.AuthenticationResult) {
      throw new Error('Token refresh failed');
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken || '',
      refreshToken: refreshToken,
      expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
    };
  }

  async getUserBySub(userSub: string): Promise<Record<string, unknown>> {
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userSub,
    });

    const response = await client.send(command);

    const attributes: Record<string, unknown> = {};
    response.UserAttributes?.forEach((attr) => {
      if (attr.Name) {
        attributes[attr.Name] = attr.Value;
      }
    });

    return attributes;
  }

  async globalSignOut(accessToken: string): Promise<void> {
    const command = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });

    await client.send(command);
  }

  async addUserToGroup(username: string, groupName: string): Promise<void> {
    const command = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: groupName,
    });

    await client.send(command);
  }

  async removeUserFromGroup(username: string, groupName: string): Promise<void> {
    const command = new AdminRemoveUserFromGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: groupName,
    });

    await client.send(command);
  }

  async listGroupsForUser(username: string): Promise<string[]> {
    const command = new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });

    const response = await client.send(command);
    return response.Groups?.map((group) => group.GroupName || '') || [];
  }
}
