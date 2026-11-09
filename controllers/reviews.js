const Review = require('../models/Review');
const Dentist = require('../models/Dentist');

// @desc     Get reviews
// @route    GET /api/v1/reviews
// @route    GET /api/v1/dentists/:dentistId/reviews
// @access   Public
exports.getReviews = async (req, res, next) => {
  try {
    let query;

    if (req.params.dentistId) {
      query = Review.find({ dentist: req.params.dentistId });
    } else {
      query = Review.find().populate({
        path: 'dentist',
        select: 'name areaOfExpertise'
      });
    }

    const reviews = await query;

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Cannot find Review' });
  }
};

// @desc     Get single review
// @route    GET /api/v1/reviews/:id
// @access   Public
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id).populate({
      path: 'dentist',
      select: 'name areaOfExpertise'
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: `No review found with the id of ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Cannot find Review' });
  }
};

// @desc     Add review
// @route    POST /api/v1/dentists/:dentistId/reviews
// @access   Private
exports.addReview = async (req, res, next) => {
  try {
    req.body.dentist = req.params.dentistId;
    req.body.user = req.user.id;

    const dentist = await Dentist.findById(req.params.dentistId);

    if (!dentist) {
      return res.status(404).json({
        success: false,
        message: `No dentist with the id of ${req.params.dentistId}`
      });
    }

    const review = await Review.create(req.body);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc     Update review
// @route    PUT /api/v1/reviews/:id
// @access   Private
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: `No review with the id of ${req.params.id}`
      });
    }

    // Make sure review belongs to user or user is admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this review`
      });
    }

    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Recalculate average rating for dentist
    await Review.getAverageRating(review.dentist);

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc     Delete review
// @route    DELETE /api/v1/reviews/:id
// @access   Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: `No review with the id of ${req.params.id}`
      });
    }

    // Make sure review belongs to user or user is admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this review`
      });
    }

    const dentistId = review.dentist;

    if (review.remove) {
      await review.remove();
    } else {
      await review.deleteOne();
    }

    // Recalculate average rating for dentist
    await Review.getAverageRating(dentistId);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Cannot delete Review' });
  }
};
