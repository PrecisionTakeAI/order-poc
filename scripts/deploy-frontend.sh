#!/bin/bash
set -e

echo "Starting frontend deployment..."

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend"

# Build the application
echo "Building frontend application..."
npm run build

# Sync to S3
echo "Uploading to S3..."
aws s3 sync dist/ s3://orderpoc-frontend-dev --delete

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id EQJ918C27VJY1 --paths "/*"

echo "Frontend deployed successfully!"
echo "Visit: https://d31ecan7thjmto.cloudfront.net"
