#!/bin/bash
set -e

STACK_NAME="${STACK_NAME:-order-poc-dev}"
FRONTEND_BUCKET="${FRONTEND_BUCKET:-orderpoc-frontend-dev}"

echo "================================"
echo "Deploying Frontend to CloudFront"
echo "================================"

# Get distribution ID from CloudFormation
echo "Fetching CloudFront distribution ID..."
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`ConsolidatedDistributionId`].OutputValue' \
  --output text)

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
  echo "Error: Could not find ConsolidatedDistributionId output"
  exit 1
fi

DISTRIBUTION_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`ConsolidatedDistributionDomainName`].OutputValue' \
  --output text)

echo "Distribution ID: $DISTRIBUTION_ID"
echo "Distribution Domain: $DISTRIBUTION_DOMAIN"

# Sync static assets with long cache headers
echo "Uploading static assets with long cache..."
aws s3 sync frontend/build/ "s3://$FRONTEND_BUCKET/" \
  --exclude "index.html" \
  --exclude "*.html" \
  --cache-control "public,max-age=31536000,immutable" \
  --delete

# Upload HTML files with short cache
echo "Uploading HTML files with short cache..."
aws s3 sync frontend/build/ "s3://$FRONTEND_BUCKET/" \
  --exclude "*" \
  --include "*.html" \
  --cache-control "public,max-age=300,stale-while-revalidate=60"

# Invalidate CloudFront cache
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Invalidating CloudFront cache..."
"$SCRIPT_DIR/invalidate-cache.sh" "$DISTRIBUTION_ID"

echo ""
echo "Deployment complete!"
echo "Frontend URL: $DISTRIBUTION_DOMAIN"
