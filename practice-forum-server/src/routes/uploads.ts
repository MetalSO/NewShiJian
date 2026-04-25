import fs from 'fs';
import path from 'path';
import { Router, Request, Response } from 'express';
import multer from 'multer';

const router = Router();

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const imagesDir = path.join(uploadsRoot, 'images');
fs.mkdirSync(imagesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imagesDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files are allowed.'));
  },
});

router.post('/images', (req: Request, res: Response) => {
  upload.any()(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        msg: error.message,
        code: 1,
        data: {
          errFiles: [],
          succMap: {},
        },
      });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({
        msg: error.message,
        code: 1,
        data: {
          errFiles: [],
          succMap: {},
        },
      });
      return;
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      res.status(400).json({
        msg: 'No file uploaded.',
        code: 1,
        data: {
          errFiles: [],
          succMap: {},
        },
      });
      return;
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const succMap: Record<string, string> = {};

    for (const file of files) {
      succMap[file.originalname] = `${host}/uploads/images/${file.filename}`;
    }

    res.json({
      msg: '',
      code: 0,
      data: {
        errFiles: [],
        succMap,
      },
    });
  });
});

export default router;
