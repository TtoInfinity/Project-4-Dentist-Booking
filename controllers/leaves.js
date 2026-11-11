const Dentist = require('../models/Dentist');

// Helper to normalize a date value to 'YYYY-MM-DD'
const normalizeDateStr = (dateVal) => {
  if (!dateVal) return null;
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
    const parsed = new Date(`${dateVal.trim()}T00:00:00.000Z`);
    if (isNaN(parsed.getTime())) return null;
    return dateVal.trim();
  }
  const parsed = new Date(dateVal);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
};

// @desc    Get leave dates for a dentist
// @route   GET /api/v1/dentists/:id/leaves
// @access  Public
exports.getDentistLeaves = async (req, res, next) => {
  try {
    const dentistId = req.params.id || req.params.dentistId || req.params.dentistID;
    const dentist = await Dentist.findById(dentistId);

    if (!dentist) {
      return res.status(404).json({
        success: false,
        message: `No dentist with the id of ${dentistId}`
      });
    }

    res.status(200).json({
      success: true,
      dentist: dentist.name,
      leaveDates: dentist.leaveDates || []
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Cannot fetch dentist leave dates'
    });
  }
};

// @desc    Set or replace leave dates for a dentist
// @route   PUT /api/v1/dentists/:id/leaves
// @access  Private (Admin)
exports.setDentistLeaves = async (req, res, next) => {
  try {
    const dentistId = req.params.id || req.params.dentistId || req.params.dentistID;
    const dentist = await Dentist.findById(dentistId);

    if (!dentist) {
      return res.status(404).json({
        success: false,
        message: `No dentist with the id of ${dentistId}`
      });
    }

    let rawDates = req.body.leaveDates ?? req.body.leaveDate ?? req.body.dates;
    if (typeof rawDates === 'string') {
      rawDates = [rawDates];
    }

    if (!Array.isArray(rawDates)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide leaveDates as an array of dates (YYYY-MM-DD)'
      });
    }

    const normalized = [];
    for (const d of rawDates) {
      const norm = normalizeDateStr(d);
      if (!norm) {
        return res.status(400).json({
          success: false,
          message: `Invalid date format: ${d}. Please use YYYY-MM-DD`
        });
      }
      if (!normalized.includes(norm)) {
        normalized.push(norm);
      }
    }

    dentist.leaveDates = normalized;
    await dentist.save();

    res.status(200).json({
      success: true,
      data: dentist
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Cannot set dentist leave dates'
    });
  }
};

// @desc    Add leave date(s) to a dentist
// @route   POST /api/v1/dentists/:id/leaves
// @access  Private (Admin)
exports.addDentistLeaves = async (req, res, next) => {
  try {
    const dentistId = req.params.id || req.params.dentistId || req.params.dentistID;
    const dentist = await Dentist.findById(dentistId);

    if (!dentist) {
      return res.status(404).json({
        success: false,
        message: `No dentist with the id of ${dentistId}`
      });
    }

    let rawDates = req.body.leaveDates ?? req.body.leaveDate ?? req.body.dates;
    if (typeof rawDates === 'string') {
      rawDates = [rawDates];
    }

    if (!Array.isArray(rawDates) || rawDates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide leaveDate or leaveDates'
      });
    }

    const currentLeaves = Array.isArray(dentist.leaveDates) ? [...dentist.leaveDates] : [];
    for (const d of rawDates) {
      const norm = normalizeDateStr(d);
      if (!norm) {
        return res.status(400).json({
          success: false,
          message: `Invalid date format: ${d}. Please use YYYY-MM-DD`
        });
      }
      if (!currentLeaves.includes(norm)) {
        currentLeaves.push(norm);
      }
    }

    dentist.leaveDates = currentLeaves;
    await dentist.save();

    res.status(200).json({
      success: true,
      data: dentist
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Cannot add dentist leave dates'
    });
  }
};

exports.normalizeDateStr = normalizeDateStr;
