const express = require('express');
const router = express.Router();
const baleController = require('../controllers/baleController');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', auth, baleController.getAllBales);
router.get('/delivery/:deliveryId', auth, baleController.getBalesByDelivery);
router.put('/:id/status', auth, baleController.updateBaleStatus);
router.put('/:id/dates', auth, baleController.updateBaleDates);
router.get('/:id/predict-warm', auth, baleController.predictWarmDate);
router.post('/update-all-predictions', auth, baleController.updateAllPredictions);

// Image upload routes with error handling
router.post('/:id/upload-image', auth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const fileSizeMB = (req.headers['content-length'] / (1024 * 1024)).toFixed(2);
        const maxSizeMB = 8;
        return res.status(400).json({
          error: `File size (${fileSizeMB} MB) exceeds the maximum allowed size of ${maxSizeMB} MB`
        });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, baleController.uploadImage);

router.delete('/:id/image', auth, baleController.deleteImage);

// Settings routes
router.get('/settings', auth, baleController.getSettings);
router.put('/settings', auth, adminOnly, baleController.updateSettings);

module.exports = router;
