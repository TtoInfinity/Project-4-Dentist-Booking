const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5'],
    required: [true, 'Please add a rating between 1 and 5']
  },
  comment: {
    type: String,
    required: [true, 'Please add a comment'],
    trim: true
  },
  dentist: {
    type: mongoose.Schema.ObjectId,
    ref: 'Dentist',
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent user from submitting more than one review per dentist
ReviewSchema.index({ dentist: 1, user: 1 }, { unique: true });

// Static method to get avg rating and save to Dentist
ReviewSchema.statics.getAverageRating = async function (dentistId) {
  try {
    const objId = dentistId instanceof mongoose.Types.ObjectId
      ? dentistId
      : new mongoose.Types.ObjectId(dentistId);

    const obj = await this.aggregate([
      {
        $match: { dentist: objId }
      },
      {
        $group: {
          _id: '$dentist',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    const avgRating = obj[0]
      ? Math.round((obj[0].averageRating + Number.EPSILON) * 10) / 10
      : 0;
    const count = obj[0] ? obj[0].reviewCount : 0;

    await mongoose.model('Dentist').findByIdAndUpdate(dentistId, {
      averageRating: avgRating,
      reviewCount: count
    });
  } catch (err) {
    console.error(err);
  }
};

// Alias calcAverageRatings as specified in design class diagram
ReviewSchema.statics.calcAverageRatings = ReviewSchema.statics.getAverageRating;

// Call getAverageRating after save
ReviewSchema.post('save', async function () {
  await this.constructor.getAverageRating(this.dentist);
});

// Call getAverageRating after remove
ReviewSchema.post('remove', async function () {
  await this.constructor.getAverageRating(this.dentist);
});

// Call getAverageRating after deleteOne
ReviewSchema.post('deleteOne', { document: true, query: false }, async function () {
  await this.constructor.getAverageRating(this.dentist);
});

module.exports = mongoose.model('Review', ReviewSchema);
