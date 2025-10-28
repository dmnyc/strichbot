#!/usr/bin/env node

/**
 * Introspect the Amboss GraphQL API to discover available queries and Community type fields
 *
 * This script will help identify if there are fields or queries for pending community requests.
 *
 * Usage: node scripts/introspect-amboss-api.js
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

if (!AMBOSS_API_KEY) {
  console.error('❌ Error: AMBOSS_API_KEY not found in environment variables');
  console.error('Please set AMBOSS_API_KEY in your .env file');
  process.exit(1);
}

// Introspection query to get all root queries and the Community type structure
const introspectionQuery = `
  query IntrospectionQuery {
    # Get all root-level queries
    __schema {
      queryType {
        fields {
          name
          description
          args {
            name
            type {
              name
              kind
              ofType {
                name
              }
            }
          }
          type {
            name
            kind
            ofType {
              name
            }
          }
        }
      }
    }

    # Get the Community type structure
    Community: __type(name: "Community") {
      name
      fields {
        name
        description
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }

    # Check if there's a CommunityRequest type
    CommunityRequest: __type(name: "CommunityRequest") {
      name
      fields {
        name
        description
        type {
          name
          kind
          ofType {
            name
          }
        }
      }
    }

    # Check the CommunityRequestsResponse type
    CommunityRequestsResponse: __type(name: "CommunityRequestsResponse") {
      name
      fields {
        name
        description
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }
`;

async function introspectAPI() {
  try {
    console.log('🔍 Introspecting Amboss GraphQL API...\n');

    const response = await fetch(AMBOSS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AMBOSS_API_KEY}`
      },
      body: JSON.stringify({
        query: introspectionQuery
      })
    });

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      return;
    }

    const data = result.data;

    // Display all root-level queries
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 ALL ROOT-LEVEL QUERIES');
    console.log('═══════════════════════════════════════════════════════════\n');

    const queries = data.__schema.queryType.fields;

    // Look for queries that might relate to community requests
    const requestRelatedQueries = queries.filter(q =>
      q.name.toLowerCase().includes('request') ||
      q.name.toLowerCase().includes('pending') ||
      q.name.toLowerCase().includes('community')
    );

    console.log('🎯 Community/Request Related Queries:\n');
    requestRelatedQueries.forEach(query => {
      console.log(`  • ${query.name}`);
      if (query.description) {
        console.log(`    Description: ${query.description}`);
      }
      if (query.args && query.args.length > 0) {
        console.log(`    Arguments:`);
        query.args.forEach(arg => {
          const typeName = arg.type.name || arg.type.ofType?.name || 'Unknown';
          console.log(`      - ${arg.name}: ${typeName}`);
        });
      }
      console.log('');
    });

    console.log('\n📝 All Other Queries:\n');
    queries
      .filter(q => !requestRelatedQueries.includes(q))
      .forEach(query => {
        console.log(`  • ${query.name}`);
      });

    // Display Community type fields
    if (data.Community) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('🏘️  COMMUNITY TYPE FIELDS');
      console.log('═══════════════════════════════════════════════════════════\n');

      const communityFields = data.Community.fields;

      // Look for pending/request related fields
      const requestFields = communityFields.filter(f =>
        f.name.toLowerCase().includes('request') ||
        f.name.toLowerCase().includes('pending') ||
        f.name.toLowerCase().includes('queue')
      );

      if (requestFields.length > 0) {
        console.log('🎯 Request/Pending Related Fields:\n');
        requestFields.forEach(field => {
          const typeName = field.type.name || field.type.ofType?.name || 'Unknown';
          console.log(`  • ${field.name}: ${typeName}`);
          if (field.description) {
            console.log(`    Description: ${field.description}`);
          }
          console.log('');
        });
      } else {
        console.log('⚠️  No pending/request related fields found on Community type\n');
      }

      console.log('📝 All Community Fields:\n');
      communityFields.forEach(field => {
        const typeName = field.type.name || field.type.ofType?.name || 'Unknown';
        console.log(`  • ${field.name}: ${typeName}`);
      });
    } else {
      console.log('\n⚠️  Community type not found in schema\n');
    }

    // Display CommunityRequest type if it exists
    if (data.CommunityRequest) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('📨 COMMUNITY REQUEST TYPE FIELDS');
      console.log('═══════════════════════════════════════════════════════════\n');

      data.CommunityRequest.fields.forEach(field => {
        const typeName = field.type.name || field.type.ofType?.name || 'Unknown';
        console.log(`  • ${field.name}: ${typeName}`);
        if (field.description) {
          console.log(`    Description: ${field.description}`);
        }
      });
      console.log('');
    } else {
      console.log('\n⚠️  CommunityRequest type not found in schema\n');
    }

    // Display CommunityRequestsResponse type if it exists
    if (data.CommunityRequestsResponse) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('📬 COMMUNITY REQUESTS RESPONSE TYPE FIELDS');
      console.log('═══════════════════════════════════════════════════════════\n');

      data.CommunityRequestsResponse.fields.forEach(field => {
        const typeName = field.type.name || field.type.ofType?.name || 'Unknown';
        console.log(`  • ${field.name}: ${typeName}`);
        if (field.description) {
          console.log(`    Description: ${field.description}`);
        }
      });
      console.log('');
    } else {
      console.log('\n⚠️  CommunityRequestsResponse type not found in schema\n');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Introspection Complete!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error introspecting API:', error.message);
    process.exit(1);
  }
}

introspectAPI();
