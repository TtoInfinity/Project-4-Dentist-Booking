const express = require('express');
const { getAppointments } = require('../controllers/appointments');

const router = express.Router({ mergeParams: true });

const { protect } = require('../middleware/auth');

router.route('/').get(protect, getAppointments);

module.exports = router;