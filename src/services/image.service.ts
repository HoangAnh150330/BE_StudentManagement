import cloudinary from './cloudinary';

type UploadOpts = {
  folder?: string;
  publicId?: string;
  transformations?: Array<Record<string, unknown>>;
};

export const uploadToCloudinary = (filePath: string, opts?: UploadOpts) => {
  const { folder, publicId, transformations } = opts || {};
  return cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    transformation: transformations,
    quality: 'auto',
    fetch_format: 'auto',
  });
};

export const destroyFromCloudinary = (publicId: string) => {
  return cloudinary.uploader.destroy(publicId);
};
