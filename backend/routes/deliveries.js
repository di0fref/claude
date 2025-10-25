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

// Invoice upload routes
router.post('/:id/upload-invoice', auth, uploadPdf.single('invoice'), deliveryController.uploadInvoice);
router.delete('/:id/invoice', auth, deliveryController.deleteInvoice);

module.exports = router;
