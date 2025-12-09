const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads - store in memory for processing
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit (will be compressed)
  fileFilter: fileFilter
});

// Photo compression settings - optimized for faster upload
const PHOTO_CONFIG = {
  maxWidth: 1280,      // Reduced from 1920 for faster processing
  maxHeight: 1280,     // Reduced from 1920 for faster processing
  quality: 70,         // Reduced from 85 for faster upload (was 85)
  maxFileSizeMB: 1.5,  // Target max file size after compression
};

// Compress and save image
const compressAndSaveImage = async (buffer, filename) => {
  try {
    const outputPath = path.join(uploadsDir, filename);
    
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    
    // Calculate resize dimensions (maintain aspect ratio)
    let width = metadata.width;
    let height = metadata.height;
    
    if (width > PHOTO_CONFIG.maxWidth || height > PHOTO_CONFIG.maxHeight) {
      const ratio = Math.min(
        PHOTO_CONFIG.maxWidth / width,
        PHOTO_CONFIG.maxHeight / height
      );
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    
    // Compress and save - optimized for speed
    await sharp(buffer)
      .resize(width, height, { 
        fit: 'inside', 
        withoutEnlargement: true,
        fastShrinkOnLoad: true // Faster processing
      })
      .jpeg({ 
        quality: PHOTO_CONFIG.quality, 
        progressive: false, // Disable progressive for faster encoding
        mozjpeg: true // Use mozjpeg for better compression/speed
      })
      .toFile(outputPath);
    
    // Get final file size
    const stats = fs.statSync(outputPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    logger.debug(`Photo compressed: ${metadata.width}x${metadata.height} -> ${width}x${height}, Size: ${fileSizeMB.toFixed(2)}MB`);
    
    return {
      path: outputPath,
      filename,
      size: stats.size,
      width,
      height
    };
  } catch (error) {
    logger.error('Error compressing image:', error);
    throw error;
  }
};

// Upload photo for audit item with compression
router.post('/photo', authenticate, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'audit-' + uniqueSuffix + '.jpg';
    
    // Compress and save the image
    const result = await compressAndSaveImage(req.file.buffer, filename);
    
    const fileUrl = `/uploads/${result.filename}`;
    res.json({ 
      photo_url: fileUrl,
      filename: result.filename,
      size: result.size,
      width: result.width,
      height: result.height
    });
  } catch (error) {
    logger.error('Error processing photo upload:', error);
    res.status(500).json({ error: 'Failed to process photo' });
  }
});

// Upload multiple photos (for batch uploads)
router.post('/photos', authenticate, upload.array('photos', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  try {
    const results = [];
    
    for (const file of req.files) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'audit-' + uniqueSuffix + '.jpg';
      
      const result = await compressAndSaveImage(file.buffer, filename);
      results.push({
        photo_url: `/uploads/${result.filename}`,
        filename: result.filename,
        size: result.size
      });
    }
    
    res.json({ 
      photos: results,
      count: results.length
    });
  } catch (error) {
    logger.error('Error processing batch photo upload:', error);
    res.status(500).json({ error: 'Failed to process photos' });
  }
});

// Serve uploaded files with caching
router.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    // Set cache headers for images
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

module.exports = router;

