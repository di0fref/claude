const express = require('express');
const router = express.Router();
const baleController = require('../controllers/baleController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, baleController.getAllBales);
router.get('/delivery/:deliveryId', auth, baleController.getBalesByDelivery);
router.put('/:id/status', auth, baleController.updateBaleStatus);
router.put('/:id/dates', auth, baleController.updateBaleDates);
router.get('/:id/predict-warm', auth, baleController.predictWarmDate);
router.post('/update-all-predictions', auth, baleController.updateAllPredictions);

// Settings routes
router.get('/settings', auth, baleController.getSettings);
router.put('/settings', auth, adminOnly, baleController.updateSettings);

module.exports = router;
