import multer from 'multer';

export const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      return cb(null, true);
    }

    const error = new Error('Only image files allowed');
    error.status = 400;
    cb(error);
  },
});

export const notFound = (req, res) =>
  res.status(404).json({ error: 'Not found' });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  console.error(err);

  let status = err.status || 500;

  if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  } else if (
    err.name === 'CastError' ||
    err.name === 'ValidationError' ||
    err.name === 'SyntaxError'
  ) {
    status = 400;
  } else if (err.message?.includes('Input buffer contains unsupported image format')) {
    status = 400;
  }

  res.status(status).json({
    error: err.message || 'Server error',
  });
};
