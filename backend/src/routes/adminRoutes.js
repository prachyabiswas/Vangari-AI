const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Add a simple role check middleware for admin
const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        return res.status(403).json({ error: 'Access denied: Admins only' });
    }
};

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', adminController.getUsers);
router.get('/listings', adminController.getListings);
router.get('/payouts/collectors', adminController.getCollectorPayouts);
router.get('/listings/:id/collectors', adminController.getCollectorsForListing);
router.post('/listings/:id/assign', adminController.assignCollector);

module.exports = router;
