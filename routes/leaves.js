const express = require('express');
const {
  getDentistLeaves,
  setDentistLeaves,
  addDentistLeaves
} = require('../controllers/leaves');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(getDentistLeaves)
  .put(protect, authorize('admin'), setDentistLeaves)
  .post(protect, authorize('admin'), addDentistLeaves);

module.exports = router;
