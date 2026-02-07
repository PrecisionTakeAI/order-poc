#!/usr/bin/env ts-node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

interface QueryResult {
  category: string;
  count: number;
  items: any[];
  pricesSorted: boolean;
  minPrice?: number;
  maxPrice?: number;
}

interface TestResult {
  category: string;
  passed: boolean;
  expectedCount: number;
  actualCount: number;
  pricesSorted: boolean;
  message: string;
}

// Expected counts per category based on seed data
const EXPECTED_COUNTS: Record<string, number> = {
  'Bats': 4,
  'Pads': 3,
  'Gloves': 3,
  'Helmets': 2,
  'Balls': 3,
  'Shoes': 3,
  'Bags': 2,
  'Protection': 2,
  'Accessories': 3,
};

const CATEGORIES = Object.keys(EXPECTED_COUNTS);

// Parse CLI arguments
function parseArgs(): { env: string } {
  const args = process.argv.slice(2);
  let env = 'dev';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env') {
      env = args[i + 1] || 'dev';
      i++;
    }
  }

  return { env };
}

// Query products by category
async function queryByCategory(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  category: string
): Promise<QueryResult> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'category-price-index',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category,
      },
    })
  );

  const items = result.Items || [];
  const prices = items.map(item => item.price);

  // Check if prices are sorted in ascending order
  const pricesSorted = prices.every((price, i) => {
    if (i === 0) return true;
    return price >= prices[i - 1];
  });

  return {
    category,
    count: items.length,
    items,
    pricesSorted,
    minPrice: prices.length > 0 ? Math.min(...prices) : undefined,
    maxPrice: prices.length > 0 ? Math.max(...prices) : undefined,
  };
}

// Query products by category with price range
async function queryByPriceRange(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  category: string,
  minPrice: number,
  maxPrice: number
): Promise<QueryResult> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'category-price-index',
      KeyConditionExpression: 'category = :category AND price BETWEEN :minPrice AND :maxPrice',
      ExpressionAttributeValues: {
        ':category': category,
        ':minPrice': minPrice,
        ':maxPrice': maxPrice,
      },
    })
  );

  const items = result.Items || [];
  const prices = items.map(item => item.price);

  const pricesSorted = prices.every((price, i) => {
    if (i === 0) return true;
    return price >= prices[i - 1];
  });

  return {
    category,
    count: items.length,
    items,
    pricesSorted,
    minPrice: prices.length > 0 ? Math.min(...prices) : undefined,
    maxPrice: prices.length > 0 ? Math.max(...prices) : undefined,
  };
}

// Test GSI queries
async function testGSIQueries() {
  const { env } = parseArgs();
  const tableName = `OrderPOC-Products-${env}`;

  console.log('\n=== GSI Query Test Script ===');
  console.log(`Environment: ${env}`);
  console.log(`Table: ${tableName}`);
  console.log(`Index: category-price-index\n`);

  // Initialize DynamoDB client
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
  const docClient = DynamoDBDocumentClient.from(client);

  const testResults: TestResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  // Test 1: Query each category and verify counts
  console.log('Test 1: Category Queries and Count Validation\n');
  console.log('─'.repeat(80));

  for (const category of CATEGORIES) {
    const result = await queryByCategory(docClient, tableName, category);
    const expectedCount = EXPECTED_COUNTS[category];
    const passed = result.count === expectedCount && result.pricesSorted;

    const testResult: TestResult = {
      category,
      passed,
      expectedCount,
      actualCount: result.count,
      pricesSorted: result.pricesSorted,
      message: passed
        ? `✓ ${category}: ${result.count} items (sorted: ${result.pricesSorted})`
        : `✗ ${category}: Expected ${expectedCount}, got ${result.count} (sorted: ${result.pricesSorted})`,
    };

    testResults.push(testResult);
    console.log(testResult.message);

    if (result.items.length > 0) {
      console.log(`  Price range: $${result.minPrice} - $${result.maxPrice}`);
      console.log(`  Products: ${result.items.map(p => p.name.substring(0, 30)).join(', ')}`);
    }
    console.log('');

    if (passed) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }

  // Test 2: Price range queries
  console.log('\nTest 2: Price Range Queries\n');
  console.log('─'.repeat(80));

  const priceRangeTests = [
    { category: 'Bats', minPrice: 0, maxPrice: 100, expectedMin: 1 },
    { category: 'Bats', minPrice: 100, maxPrice: 500, expectedMin: 1 },
    { category: 'Gloves', minPrice: 0, maxPrice: 50, expectedMin: 1 },
    { category: 'Balls', minPrice: 0, maxPrice: 20, expectedMin: 1 },
  ];

  for (const test of priceRangeTests) {
    const result = await queryByPriceRange(
      docClient,
      tableName,
      test.category,
      test.minPrice,
      test.maxPrice
    );

    const passed = result.count >= test.expectedMin && result.pricesSorted;

    console.log(
      passed
        ? `✓ ${test.category} ($${test.minPrice}-$${test.maxPrice}): ${result.count} items found`
        : `✗ ${test.category} ($${test.minPrice}-$${test.maxPrice}): Expected >= ${test.expectedMin}, got ${result.count}`
    );

    if (result.items.length > 0) {
      console.log(`  Items: ${result.items.map(p => `${p.name.substring(0, 25)} ($${p.price})`).join(', ')}`);
      console.log(`  Prices sorted: ${result.pricesSorted}`);
    }
    console.log('');

    if (passed) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }

  // Test 3: Verify price sorting across all categories
  console.log('\nTest 3: Price Sorting Verification\n');
  console.log('─'.repeat(80));

  let allSorted = true;
  for (const category of CATEGORIES) {
    const result = await queryByCategory(docClient, tableName, category);
    if (!result.pricesSorted) {
      console.log(`✗ ${category}: Prices not sorted correctly`);
      allSorted = false;
    }
  }

  if (allSorted) {
    console.log('✓ All categories have correctly sorted prices');
    totalPassed++;
  } else {
    totalFailed++;
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('=== Test Summary ===');
  console.log('='.repeat(80));
  console.log(`Total tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    console.log('\n✓ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed\n');
    process.exit(1);
  }
}

// Run the script
testGSIQueries().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
