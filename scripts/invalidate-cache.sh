#!/bin/bash
set -e

DISTRIBUTION_ID=$1

if [ -z "$DISTRIBUTION_ID" ]; then
  echo "Usage: $0 <distribution-id>"
  exit 1
fi

echo "Creating CloudFront invalidation for distribution: $DISTRIBUTION_ID"

INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "Invalidation created: $INVALIDATION_ID"
echo "Waiting for invalidation to complete..."

aws cloudfront wait invalidation-completed \
  --distribution-id "$DISTRIBUTION_ID" \
  --id "$INVALIDATION_ID"

echo "Cache invalidation completed successfully"
