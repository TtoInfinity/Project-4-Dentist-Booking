const express = require('express');
const {
  getDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
  deleteDiscount
} = require('../controllers/discounts');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(protect, authorize('admin'), getDiscounts)
  .post(protect, authorize('admin'), createDiscount);

router
  .route('/:code')
  .get(protect, getDiscount);

router
  .route('/:id')
  .put(protect, authorize('admin'), updateDiscount)
  .delete(protect, authorize('admin'), deleteDiscount);

module.exports = router;
