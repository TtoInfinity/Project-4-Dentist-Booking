const mongoose = require('mongoose');
const Dentist = require('../models/Dentist');

// Attempt to load associated models if available
try {
  require('../models/Booking');
} catch (e) {}

try {
  require('../models/Review');
} catch (e) {}

// @desc     Get all dentists
// @route    GET /api/v1/dentists
// @access   Public
exports.getDentists = async (req, res, next) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from filtering
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over remove fields and delete them from reqQuery
    removeFields.forEach((param) => delete reqQuery[param]);

    // Create query string and add MongoDB operators ($gt, $gte, etc.)
    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);

    // Finding resource
    query = Dentist.find(JSON.parse(queryStr));

    // Populate virtuals if models are registered
    if (mongoose.models.Booking) {
      query = query.populate('bookings');
    }
    if (mongoose.models.Review) {
      query = query.populate('reviews');
    }

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Dentist.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const dentists = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: dentists.length,
      pagination,
      data: dentists
    });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

// @desc     Get single dentist
// @route    GET /api/v1/dentists/:id
// @access   Public
exports.getDentist = async (req, res, next) => {
  try {
    let query = Dentist.findById(req.params.id);

    if (mongoose.models.Booking) {
      query = query.populate('bookings');
    }
    if (mongoose.models.Review) {
      query = query.populate('reviews');
    }

    const dentist = await query;

    if (!dentist) {
      return res.status(400).json({ success: false });
    }

    res.status(200).json({
      success: true,
      data: dentist
    });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

// @desc     Create new dentist
// @route    POST /api/v1/dentists
// @access   Private (Admin)
exports.createDentist = async (req, res, next) => {
  try {
    const dentist = await Dentist.create(req.body);
    res.status(201).json({
      success: true,
      data: dentist
    });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

// @desc     Update dentist
// @route    PUT /api/v1/dentists/:id
// @access   Private (Admin)
exports.updateDentist = async (req, res, next) => {
  try {
    const dentist = await Dentist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!dentist) {
      return res.status(400).json({ success: false });
    }

    res.status(200).json({
      success: true,
      data: dentist
    });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

// @desc     Delete dentist
// @route    DELETE /api/v1/dentists/:id
// @access   Private (Admin)
exports.deleteDentist = async (req, res, next) => {
  try {
    const dentist = await Dentist.findById(req.params.id);

    if (!dentist) {
      return res.status(404).json({
        success: false,
        message: `Dentist not found with id of ${req.params.id}`
      });
    }

    // Cascade delete associated bookings & reviews if models exist
    if (mongoose.models.Booking) {
      await mongoose.models.Booking.deleteMany({ dentist: req.params.id });
    }
    if (mongoose.models.Review) {
      await mongoose.models.Review.deleteMany({ dentist: req.params.id });
    }

    await Dentist.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};
