const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { auth } = require('../middleware/auth');

router.get('/', auth, deliveryController.getAllDeliveries);
router.get('/:id', auth, deliveryController.getDeliveryById);
router.post('/', auth, deliveryController.createDelivery);
router.put('/:id', auth, deliveryController.updateDelivery);
router.delete('/:id', auth, deliveryController.deleteDelivery);

module.exports = router;
