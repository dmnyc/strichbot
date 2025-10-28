#!/usr/bin/env node

/**
 * Test script to explore the getAllCommunityRequests query
 *
 * This will help us understand the structure of pending request data
 * so we can properly integrate it into the stats collection.
 *
 * Usage: node scripts/test-pending-requests.js
 */

const fs = require('fs');
const path = require('path');

// Simple .env parser
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const AMBOSS_API_URL = 'https://api.amboss.space/graphql';
const AMBOSS_API_KEY = process.env.AMBOSS_API_KEY;
const COMMUNITY_ID = process.env.COMMUNITY_ID;

if (!AMBOSS_API_KEY) {
  console.error('❌ Error: AMBOSS_API_KEY not found in environment variables');
  process.exit(1);
}

if (!COMMUNITY_ID) {
  console.error('❌ Error: COMMUNITY_ID not found in environment variables');
  process.exit(1);
}

// Query to get all pending community requests
// Based on introspection: CommunityRequestsResponse has: approvals, pubId, pubkey, requiredApprovals
const query = `
  query GetAllCommunityRequests($id: String!) {
    getAllCommunityRequests(id: $id) {
      approvals
      pubId
      pubkey
      requiredApprovals
    }
  }
`;

async function testPendingRequests() {
  try {
    console.log('🔍 Querying pending community requests...\n');
    console.log(`Community ID: ${COMMUNITY_ID}\n`);

    const response = await fetch(AMBOSS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AMBOSS_API_KEY}`
      },
      body: JSON.stringify({
        query,
        variables: {
          id: COMMUNITY_ID
        }
      })
    });

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL Errors:');
      console.error(JSON.stringify(result.errors, null, 2));
      return;
    }

    const requests = result.data?.getAllCommunityRequests;

    if (!requests) {
      console.log('⚠️  No data returned from getAllCommunityRequests');
      console.log('\nFull response:');
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 PENDING COMMUNITY REQUESTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`Total Pending Requests: ${requests.length}\n`);

    if (requests.length > 0) {
      console.log('Request Details:\n');
      requests.forEach((req, index) => {
        console.log(`${index + 1}. Request ID: ${req.pubId}`);
        console.log(`   URL: https://amboss.space/communityRequest/${req.pubId}`);
        console.log(`   Node Pubkey: ${req.pubkey}`);
        console.log(`   Approvals: ${req.approvals} / ${req.requiredApprovals}`);
        console.log('');
      });

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('✅ Query Successful!');
      console.log('═══════════════════════════════════════════════════════════\n');

      console.log('📝 Summary for Integration:\n');
      console.log(`  • Field to query: getAllCommunityRequests(id: String!)`);
      console.log(`  • Returns: Array of request objects`);
      console.log(`  • Count pending: requests.length = ${requests.length}`);
      console.log(`  • Available fields: pubId, pubkey, approvals, requiredApprovals\n`);
    } else {
      console.log('✅ No pending requests currently\n');
    }

    console.log('\nFull Response Structure:');
    console.log(JSON.stringify(result.data, null, 2));

  } catch (error) {
    console.error('❌ Error querying API:', error.message);
    process.exit(1);
  }
}

testPendingRequests();
