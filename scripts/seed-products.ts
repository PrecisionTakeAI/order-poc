#!/usr/bin/env ts-node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as path from 'path';

interface SeedProduct {
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  category: string;
  imageUrl: string;
  status: string;
}

interface ProductItem {
  PK: string;
  SK: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  category: string;
  imageUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SeedStats {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface CliArgs {
  dryRun: boolean;
  force: boolean;
  env: string;
}

// Parse CLI arguments
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsedArgs: CliArgs = {
    dryRun: false,
    force: false,
    env: 'dev',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      parsedArgs.dryRun = true;
    } else if (arg === '--force') {
      parsedArgs.force = true;
    } else if (arg === '--env') {
      parsedArgs.env = args[i + 1] || 'dev';
      i++; // Skip next arg as it's the value
    }
  }

  return parsedArgs;
}

// Exponential backoff retry helper
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Only retry on throttling errors
      if (error.name === 'ProvisionedThroughputExceededException' ||
          error.name === 'ThrottlingException') {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`  Throttled, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

// Check if product exists
async function productExists(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  productId: string
): Promise<boolean> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `PRODUCT#${productId}`,
          SK: 'DETAILS',
        },
      })
    );
    return !!result.Item;
  } catch (error) {
    console.error(`  Error checking product ${productId}:`, error);
    return false;
  }
}

// Convert seed product to DynamoDB item
function toProductItem(product: SeedProduct): ProductItem {
  const now = new Date().toISOString();
  return {
    PK: `PRODUCT#${product.productId}`,
    SK: 'DETAILS',
    productId: product.productId,
    name: product.name,
    description: product.description,
    price: product.price,
    currency: product.currency,
    stock: product.stock,
    category: product.category,
    imageUrl: product.imageUrl,
    status: product.status,
    createdAt: now,
    updatedAt: now,
  };
}

// Batch write products to DynamoDB
async function batchWriteProducts(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  items: ProductItem[]
): Promise<void> {
  const BATCH_SIZE = 25; // DynamoDB limit
  const batches: ProductItem[][] = [];

  // Split into batches of 25
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }

  // Process each batch with retry logic
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\nProcessing batch ${i + 1}/${batches.length} (${batch.length} items)...`);

    await retryWithBackoff(async () => {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: batch.map(item => ({
              PutRequest: {
                Item: item,
              },
            })),
          },
        })
      );
    });

    console.log(`  Batch ${i + 1} completed successfully`);
  }
}

// Main seed function
async function seedProducts() {
  const args = parseArgs();
  const tableName = `OrderPOC-Products-${args.env}`;

  console.log('\n=== Product Seed Script ===');
  console.log(`Environment: ${args.env}`);
  console.log(`Table: ${tableName}`);
  console.log(`Dry Run: ${args.dryRun}`);
  console.log(`Force: ${args.force}`);
  console.log('');

  // Load seed data
  const seedDataPath = path.join(__dirname, 'data', 'products.seed.json');
  if (!fs.existsSync(seedDataPath)) {
    console.error(`Error: Seed data file not found at ${seedDataPath}`);
    process.exit(1);
  }

  const seedData: SeedProduct[] = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
  console.log(`Loaded ${seedData.length} products from seed data\n`);

  // Initialize DynamoDB client
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
  const docClient = DynamoDBDocumentClient.from(client);

  const stats: SeedStats = {
    total: seedData.length,
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Check for existing products (unless force flag is set)
  const itemsToWrite: ProductItem[] = [];

  if (!args.force) {
    console.log('Checking for existing products...\n');
    for (const product of seedData) {
      const exists = await productExists(docClient, tableName, product.productId);
      if (exists) {
        console.log(`  ⊗ Skipping ${product.name} (already exists)`);
        stats.skipped++;
      } else {
        console.log(`  ✓ Queuing ${product.name}`);
        itemsToWrite.push(toProductItem(product));
      }
    }
  } else {
    console.log('Force flag set - will overwrite existing products\n');
    itemsToWrite.push(...seedData.map(toProductItem));
  }

  if (args.dryRun) {
    console.log('\n=== DRY RUN - No data written ===');
    console.log(`Would create/update: ${itemsToWrite.length} products`);
    console.log(`Would skip: ${stats.skipped} products`);
    return;
  }

  // Write products to DynamoDB
  if (itemsToWrite.length > 0) {
    console.log(`\nWriting ${itemsToWrite.length} products to DynamoDB...`);
    try {
      await batchWriteProducts(docClient, tableName, itemsToWrite);
      stats.created = itemsToWrite.length;
      console.log('\n✓ All products written successfully');
    } catch (error: any) {
      console.error('\n✗ Error writing products:', error.message);
      stats.failed = itemsToWrite.length;
      stats.errors.push(error.message);
    }
  } else {
    console.log('\nNo products to write (all already exist)');
  }

  // Print summary
  console.log('\n=== Summary ===');
  console.log(`Total products: ${stats.total}`);
  console.log(`Created/Updated: ${stats.created}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.forEach(err => console.log(`  - ${err}`));
    process.exit(1);
  }

  console.log('\n✓ Seed complete!\n');
}

// Run the script
seedProducts().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
