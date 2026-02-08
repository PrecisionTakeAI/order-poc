import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.PRODUCT_IMAGES_BUCKET || '';
const CDN_URL = process.env.PRODUCT_IMAGES_CDN || '';

export class S3Service {
  /**
   * Generate a pre-signed URL for uploading an image to S3
   * @param fileName - Original file name
   * @param contentType - MIME type of the file
   * @returns Object containing uploadUrl and cdnUrl
   */
  async generateUploadUrl(
    fileName: string,
    contentType: string
  ): Promise<{ uploadUrl: string; cdnUrl: string; key: string }> {
    // Sanitize filename - remove special characters and spaces
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/--+/g, '-')
      .toLowerCase();

    // Generate unique S3 key with UUID prefix
    const fileExtension = sanitizedFileName.split('.').pop();
    const key = `products/${uuidv4()}-${Date.now()}.${fileExtension}`;

    // Create put object command
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // Generate pre-signed URL valid for 5 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Generate CDN URL for accessing the uploaded image
    const cdnUrl = `${CDN_URL}/${key}`;

    return {
      uploadUrl,
      cdnUrl,
      key,
    };
  }
}
