const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedAudioExtensions = new Set(['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.webm']);
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.jfif', '.bmp', '.heic', '.heif']);
const allowedExtensions = new Set([...allowedAudioExtensions, ...allowedImageExtensions]);

const mimeToImageExtension = (mimetype = '') => {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
    'image/jfif': '.jfif',
    'image/bmp': '.bmp',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };
  return map[mimetype.toLowerCase()] || '';
};

const resolveFileExtension = (file) => {
  const fromName = path.extname(file.originalname || '').toLowerCase();
  if (fromName && allowedExtensions.has(fromName)) return fromName;
  const mimetype = file.mimetype || '';
  if (mimetype.startsWith('image/')) {
    return mimeToImageExtension(mimetype) || '.jpg';
  }
  if (mimetype.startsWith('audio/')) {
    return '.mp3';
  }
  return fromName;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = resolveFileExtension(file);
    const prefix = allowedImageExtensions.has(extension) ? 'cover' : 'audio';
    cb(null, `${prefix}-${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const mimetype = file.mimetype || '';
  const extension = resolveFileExtension(file);
  const hasAudioMime = mimetype.startsWith('audio/') || mimetype === 'application/octet-stream';
  const hasImageMime = mimetype.startsWith('image/');
  const hasImageExtension = allowedImageExtensions.has(extension);
  const hasAudioExtension = allowedAudioExtensions.has(extension);

  if ((hasAudioMime && hasAudioExtension) || hasImageExtension || (hasImageMime && hasImageExtension)) {
    cb(null, true);
    return;
  }

  const error = new Error('Only supported audio or image files are allowed');
  error.statusCode = 400;
  cb(error, false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});

const collectUploadedFiles = (req, fieldNames = null) => {
  const files = [];
  const allowedFields = fieldNames ? new Set(fieldNames) : null;

  if (req.file && (!allowedFields || allowedFields.has(req.file.fieldname))) files.push(req.file);

  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files.filter((file) => !allowedFields || allowedFields.has(file.fieldname)));
    } else {
      Object.entries(req.files).forEach(([fieldName, fieldFiles]) => {
        if (allowedFields && !allowedFields.has(fieldName)) return;
        if (Array.isArray(fieldFiles)) files.push(...fieldFiles);
      });
    }
  }

  return files;
};

const removeDiskFile = (filePath) => {
  if (!filePath) return;
  const resolvedPath = path.resolve(filePath);
  const resolvedUploadDir = path.resolve(uploadDir);

  if (!resolvedPath.startsWith(resolvedUploadDir)) return;
  if (fs.existsSync(resolvedPath)) fs.unlinkSync(resolvedPath);
};

const handleUpload = (req, options = {}) => {
  const { kind = 'audio', fieldNames = null, required = true } = options;
  const files = collectUploadedFiles(req, fieldNames);

  if (files.length !== 1) {
    files.forEach((file) => removeDiskFile(file.path));
    if (!required && files.length === 0) return null;

    const error = new Error('No file was uploaded');
    if (files.length > 1) error.message = 'Only one audio file can be uploaded at a time';
    error.statusCode = 400;
    throw error;
  }

  const file = files[0];
  const dotExtension = resolveFileExtension(file);
  const extension = dotExtension.replace('.', '').toLowerCase();
  const isAudio = allowedAudioExtensions.has(dotExtension);
  const isImage = allowedImageExtensions.has(dotExtension);

  if (kind === 'audio' && !isAudio) {
    removeDiskFile(file.path);
    const error = new Error('Only supported audio files are allowed');
    error.statusCode = 400;
    throw error;
  }

  if (kind === 'image' && !isImage) {
    removeDiskFile(file.path);
    const error = new Error('Only image files (JPG, PNG, WEBP, GIF, AVIF, BMP, HEIC, HEIF) are allowed');
    error.statusCode = 400;
    throw error;
  }

  return {
    fileName: file.filename,
    filePath: `/uploads/${file.filename}`,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    fileSizeBytes: file.size,
    mimeType: file.mimetype,
    audioFormat: isAudio ? extension || null : null,
    imageFormat: isImage ? extension || null : null,
    originalName: file.originalname,
  };
};

const deleteUploadedFile = async (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return false;

  const fileName = path.basename(fileUrl);
  const absolutePath = path.resolve(uploadDir, fileName);
  const resolvedUploadDir = path.resolve(uploadDir);

  if (!absolutePath.startsWith(resolvedUploadDir)) return false;

  try {
    await fs.promises.unlink(absolutePath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
};

module.exports = { upload, handleUpload, deleteUploadedFile, uploadDir };
