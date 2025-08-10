import { unlink } from 'fs/promises';

export const getPublicIdFromUrl = (url?: string | null) => {
  if (!url) return null;
  try {
    const parts = url.split('/');
    const filename = parts.pop() || '';
    const folder = parts.pop(); // ví dụ 'avatars'
    const name = filename.split('.')[0];
    return folder ? `${folder}/${name}` : name;
  } catch { return null; }
};

export const safeUnlink = async (filePath?: string) => {
  if (!filePath) return;
  try { await unlink(filePath); } catch { /* ignore */ }
};
