import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
};

/**
 * Uploads a file buffer to Cloudinary
 * @param buffer The file content as a Buffer
 * @param folder The folder in Cloudinary to store the file
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string = 'eduledger/proofs'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto', // Automatically detect if it's an image or PDF
      },
      (error: any, result: any) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload failed: no result from Cloudinary'));
        
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Deletes a file from Cloudinary
 * @param publicId The public_id of the file to delete
 */
export async function deleteFromCloudinary(publicId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

export default cloudinary;
