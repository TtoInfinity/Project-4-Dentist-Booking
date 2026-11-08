const express = require('express');
const {
  getBookings,
  getBooking,
  addBooking,
  updateBooking,
  deleteBooking,
  downloadBookingICS
} = require('../controllers/bookings');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(protect, getBookings)
  .post(protect, authorize('admin', 'user'), addBooking);

router
  .route('/:id')
  .get(protect, getBooking)
  .put(protect, authorize('admin', 'user'), updateBooking)
  .delete(protect, authorize('admin', 'user'), deleteBooking);

router
  .route('/:id/ics')
  .get(protect, authorize('admin', 'user'), downloadBookingICS);

router
  .route('/:id/calendar')
  .get(protect, authorize('admin', 'user'), downloadBookingICS);

module.exports = router;
