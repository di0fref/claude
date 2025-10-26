const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { auth } = require('../middleware/auth');
const uploadPdf = require('../middleware/uploadPdf');

router.get('/', auth, deliveryController.getAllDeliveries);
router.get('/:id', auth, deliveryController.getDeliveryById);
router.post('/', auth, deliveryController.createDelivery);
router.put('/:id', auth, deliveryController.updateDelivery);
router.delete('/:id', auth, deliveryController.deleteDelivery);

// Invoice upload routes with error handling
router.post('/:id/upload-invoice', auth, (req, res, next) => {
  uploadPdf.single('invoice')(req, res, (err) => {
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
}, deliveryController.uploadInvoice);

router.delete('/:id/invoice', auth, deliveryController.deleteInvoice);

module.exports = router;
