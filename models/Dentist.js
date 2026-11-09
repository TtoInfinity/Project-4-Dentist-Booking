const mongoose = require('mongoose');

const DentistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      unique: true,
      trim: true
    },
    yearsOfExperience: {
      type: Number,
      required: [true, 'Please add years of experience'],
      min: [0, 'Years of experience cannot be negative']
    },
    areaOfExpertise: {
      type: String,
      required: [true, 'Please add an area of expertise'],
      trim: true
    },
    price: {
      type: Number,
      default: 1000
    },
    leaveDates: {
      type: [
        {
          type: String,
          match: [/^\d{4}-\d{2}-\d{2}$/, 'Please use YYYY-MM-DD format']
        }
      ],
      default: []
    },
    averageRating: {
      type: Number,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Reverse populate with virtuals
DentistSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'dentist',
  justOne: false
});

DentistSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'dentist',
  justOne: false
});

module.exports = mongoose.model('Dentist', DentistSchema);
