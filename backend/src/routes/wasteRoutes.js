const express = require('express');
const router = express.Router();
const wasteController = require('../controllers/wasteController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze', authMiddleware, upload.array('images', 5), wasteController.analyze);
router.post('/dispatch/:listingId', authMiddleware, wasteController.dispatch);
router.get('/owner/history', authMiddleware, wasteController.getOwnerHistory);
router.get('/collector/jobs', authMiddleware, wasteController.getCollectorJobs);
router.post('/collector/listings/:listingId/actual', authMiddleware, wasteController.submitActualCollection);
router.post('/collector/listings/batch-actual', authMiddleware, wasteController.submitBatchActualCollection);

module.exports = router;
