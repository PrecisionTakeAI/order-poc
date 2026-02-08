#!/usr/bin/env node

import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  ListUsersInGroupCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_jVFbfTQDh';
const ADMIN_GROUP = 'admin';

const client = new CognitoIdentityProviderClient({
  region: 'us-east-1',
});

async function addAdmin(email: string): Promise<void> {
  try {
    // Verify user exists by listing users with email filter
    const listCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    });

    const listResponse = await client.send(listCommand);

    if (!listResponse.Users || listResponse.Users.length === 0) {
      console.error(`Error: User with email ${email} not found in the user pool`);
      process.exit(1);
    }

    const username = listResponse.Users[0].Username;
    if (!username) {
      console.error('Error: Username not found');
      process.exit(1);
    }

    // Add user to admin group
    const addCommand = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: ADMIN_GROUP,
    });

    await client.send(addCommand);
    console.log(`Successfully added user ${email} (${username}) to admin group`);
  } catch (error) {
    console.error('Error adding user to admin group:', error);
    process.exit(1);
  }
}

async function removeAdmin(email: string): Promise<void> {
  try {
    // Verify user exists by listing users with email filter
    const listCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    });

    const listResponse = await client.send(listCommand);

    if (!listResponse.Users || listResponse.Users.length === 0) {
      console.error(`Error: User with email ${email} not found in the user pool`);
      process.exit(1);
    }

    const username = listResponse.Users[0].Username;
    if (!username) {
      console.error('Error: Username not found');
      process.exit(1);
    }

    // Remove user from admin group
    const removeCommand = new AdminRemoveUserFromGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: ADMIN_GROUP,
    });

    await client.send(removeCommand);
    console.log(`Successfully removed user ${email} (${username}) from admin group`);
  } catch (error) {
    console.error('Error removing user from admin group:', error);
    process.exit(1);
  }
}

async function listAdmins(): Promise<void> {
  try {
    const command = new ListUsersInGroupCommand({
      UserPoolId: USER_POOL_ID,
      GroupName: ADMIN_GROUP,
    });

    const response = await client.send(command);

    if (!response.Users || response.Users.length === 0) {
      console.log('No admin users found');
      return;
    }

    console.log(`Admin users (${response.Users.length}):`);
    console.log('─'.repeat(80));

    response.Users.forEach((user) => {
      const email = user.Attributes?.find((attr) => attr.Name === 'email')?.Value || 'N/A';
      const name = user.Attributes?.find((attr) => attr.Name === 'name')?.Value || 'N/A';
      const status = user.UserStatus || 'N/A';
      const created = user.UserCreateDate?.toISOString() || 'N/A';

      console.log(`Email:   ${email}`);
      console.log(`Name:    ${name}`);
      console.log(`Status:  ${status}`);
      console.log(`Created: ${created}`);
      console.log('─'.repeat(80));
    });
  } catch (error) {
    console.error('Error listing admin users:', error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log('Usage:');
    console.log('  npm run admin:add <email>    - Add user to admin group');
    console.log('  npm run admin:remove <email> - Remove user from admin group');
    console.log('  npm run admin:list           - List all admin users');
    console.log('');
    console.log('Environment Variables:');
    console.log(`  USER_POOL_ID: ${USER_POOL_ID}`);
    process.exit(0);
  }

  switch (command) {
    case 'add':
      if (!args[0]) {
        console.error('Error: Email address required');
        console.log('Usage: npm run admin:add <email>');
        process.exit(1);
      }
      await addAdmin(args[0]);
      break;

    case 'remove':
      if (!args[0]) {
        console.error('Error: Email address required');
        console.log('Usage: npm run admin:remove <email>');
        process.exit(1);
      }
      await removeAdmin(args[0]);
      break;

    case 'list':
      await listAdmins();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Available commands: add, remove, list');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
