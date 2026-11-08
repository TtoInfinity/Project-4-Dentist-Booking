const Booking = require('../models/Booking');
const Dentist = require('../models/Dentist');
const DiscountCode = require('../models/DiscountCode');
const { normalizeDateStr } = require('./leaves');

// Helper to format Date into iCalendar UTC format: YYYYMMDDTHHmmssZ
const formatICSDate = (dateInput) => {
  const d = new Date(dateInput);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @route   GET /api/v1/dentists/:dentistId/bookings
// @access  Private
exports.getBookings = async (req, res, next) => {
  let query;
  const dentistId = req.params.dentistId || req.params.dentistID;

  if (req.user.role !== 'admin') {
    const filter = { user: req.user.id };
    if (dentistId) {
      filter.dentist = dentistId;
    }
    query = Booking.find(filter).populate({
      path: 'dentist',
      select: 'name yearsOfExperience areaOfExpertise price leaveDates averageRating'
    });
  } else {
    if (dentistId) {
      query = Booking.find({ dentist: dentistId }).populate({
        path: 'dentist',
        select: 'name yearsOfExperience areaOfExpertise price leaveDates averageRating'
      });
    } else {
      query = Booking.find().populate({
        path: 'dentist',
        select: 'name yearsOfExperience areaOfExpertise price leaveDates averageRating'
      });
    }
  }

  try {
    const bookings = await query;

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: 'Cannot find Booking'
    });
  }
};

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: 'dentist',
      select: 'name yearsOfExperience areaOfExpertise price leaveDates averageRating'
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with the id of ${req.params.id}`
      });
    }

    // Keep user's transactions confidential: only owner or admin can view
    if (
      req.user &&
      booking.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to view this booking`
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Cannot find Booking'
    });
  }
};

// @desc    Add booking
// @route   POST /api/v1/dentists/:dentistId/bookings
// @route   POST /api/v1/bookings
// @access  Private
exports.addBooking = async (req, res, next) => {
  try {
    const dentistId =
      req.params.dentistId ||
      req.params.dentistID ||
      req.params.hospitalID ||
      req.body.dentist ||
      req.body.hospital;

    if (!dentistId) {
      return res.status(400).json({
        success: false,
        message: 'Please specify a dentist ID'
      });
    }

    const dentist = await Dentist.findById(dentistId);

    if (!dentist) {
      return res.status(404).json({
        success: false,
        message: `No dentist with the id of ${dentistId}`
      });
    }

    const rawBookingDate = req.body.bookingDate || req.body.apptDate;
    if (!rawBookingDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a bookingDate'
      });
    }

    const normalizedBookingDay = normalizeDateStr(rawBookingDate);
    if (!normalizedBookingDay) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bookingDate format'
      });
    }

    // Additional Req #2: Prevent booking on dentist's specified leave dates
    const dentistLeaves = (dentist.leaveDates || []).map((d) => normalizeDateStr(d));
    if (dentistLeaves.includes(normalizedBookingDay)) {
      return res.status(400).json({
        success: false,
        message: `Cannot book ${dentist.name} on ${normalizedBookingDay} because the dentist is on leave`
      });
    }

    // Core Req #3: Registered user can book only ONE session (unless admin)
    const existedBookings = await Booking.find({ user: req.user.id });
    if (existedBookings.length >= 1 && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: `The user with ID ${req.user.id} has already made 1 booking`
      });
    }

    // Additional Req #4: Calculate price and apply promotional discount code if provided
    const originalPrice = typeof dentist.price === 'number' ? dentist.price : 1000;
    let discountAmount = 0;
    let appliedCode = null;
    const rawCode = req.body.discountCode || req.body.code || req.body.promoCode;

    if (rawCode) {
      const discount = await DiscountCode.findOne({
        code: String(rawCode).trim().toUpperCase()
      });

      if (
        !discount ||
        !discount.isActive ||
        new Date(discount.expiresAt) <= new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired discount code'
        });
      }

      appliedCode = discount.code;
      if (discount.discountType === 'percent') {
        discountAmount = Math.round((originalPrice * discount.discountValue) / 100);
      } else {
        discountAmount = Math.min(originalPrice, discount.discountValue);
      }
    }

    const finalPrice = Math.max(0, originalPrice - discountAmount);

    const booking = await Booking.create({
      bookingDate: rawBookingDate,
      user: req.user.id,
      dentist: dentistId,
      status: 'confirmed',
      originalPrice,
      discountCode: appliedCode,
      discountAmount,
      finalPrice
    });

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: 'Cannot create Booking'
    });
  }
};

// @desc    Update booking
// @route   PUT /api/v1/bookings/:id
// @access  Private
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with the id of ${req.params.id}`
      });
    }

    // Verify user is booking owner or admin
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this booking`
      });
    }

    const targetDentistId = req.body.dentist || booking.dentist;
    const dentist = await Dentist.findById(targetDentistId);
    if (!dentist) {
      return res.status(404).json({
        success: false,
        message: `No dentist with the id of ${targetDentistId}`
      });
    }

    if (req.body.apptDate && !req.body.bookingDate) {
      req.body.bookingDate = req.body.apptDate;
    }

    const targetBookingDate = req.body.bookingDate || booking.bookingDate;
    const normalizedBookingDay = normalizeDateStr(targetBookingDate);
    if (!normalizedBookingDay) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bookingDate format'
      });
    }

    // Additional Req #2: Check dentist leave dates when updating booking date or dentist
    const dentistLeaves = (dentist.leaveDates || []).map((d) => normalizeDateStr(d));
    if (dentistLeaves.includes(normalizedBookingDay)) {
      return res.status(400).json({
        success: false,
        message: `Cannot book ${dentist.name} on ${normalizedBookingDay} because the dentist is on leave`
      });
    }

    // Additional Req #4: Recalculate discount if discountCode is updated
    const rawCode = req.body.discountCode || req.body.code || req.body.promoCode;
    if (rawCode !== undefined) {
      const originalPrice = typeof dentist.price === 'number' ? dentist.price : booking.originalPrice;
      if (rawCode === null || rawCode === '') {
        req.body.originalPrice = originalPrice;
        req.body.discountCode = null;
        req.body.discountAmount = 0;
        req.body.finalPrice = originalPrice;
      } else {
        const discount = await DiscountCode.findOne({
          code: String(rawCode).trim().toUpperCase()
        });
        if (
          !discount ||
          !discount.isActive ||
          new Date(discount.expiresAt) <= new Date()
        ) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or expired discount code'
          });
        }
        const discountAmount =
          discount.discountType === 'percent'
            ? Math.round((originalPrice * discount.discountValue) / 100)
            : Math.min(originalPrice, discount.discountValue);

        req.body.originalPrice = originalPrice;
        req.body.discountCode = discount.code;
        req.body.discountAmount = discountAmount;
        req.body.finalPrice = Math.max(0, originalPrice - discountAmount);
      }
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Cannot update Booking'
    });
  }
};

// @desc    Delete booking
// @route   DELETE /api/v1/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with the id of ${req.params.id}`
      });
    }

    // Verify user is booking owner or admin
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this booking`
      });
    }

    await booking.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Cannot delete Booking'
    });
  }
};

// @desc    Download confirmed booking details as an iCalendar (.ics) file
// @route   GET /api/v1/bookings/:id/ics
// @access  Private
exports.downloadBookingICS = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'dentist',
        select: 'name yearsOfExperience areaOfExpertise price'
      })
      .populate({
        path: 'user',
        select: 'name email tel'
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with the id of ${req.params.id}`
      });
    }

    const ownerId = booking.user._id
      ? booking.user._id.toString()
      : booking.user.toString();

    if (ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to download this booking`
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed bookings can be downloaded as an iCalendar (.ics) file'
      });
    }

    const startDate = new Date(booking.bookingDate);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour session
    const dentistName = booking.dentist ? booking.dentist.name : 'Dentist';
    const expertise = booking.dentist ? booking.dentist.areaOfExpertise : 'General Dentistry';
    const patientName = booking.user && booking.user.name ? booking.user.name : 'Registered User';

    const descriptionLines = [
      `Booking ID: ${booking._id}`,
      `Patient: ${patientName}`,
      `Dentist: ${dentistName}`,
      `Area of Expertise: ${expertise}`,
      `Original Price: ${booking.originalPrice} THB`,
      booking.discountCode
        ? `Discount Code: ${booking.discountCode} (-${booking.discountAmount} THB)`
        : 'Discount Code: None',
      `Final Price: ${booking.finalPrice} THB`,
      `Status: ${booking.status.toUpperCase()}`
    ];

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Group TtoInfinity//Dentist Booking System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:booking-${booking._id}@dentistbooking.ttoinfinity.local`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:Dentist Appointment with ${dentistName}`,
      `DESCRIPTION:${descriptionLines.join('\\n')}`,
      'LOCATION:Dentist Clinic',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    const icsContent = icsLines.join('\r\n') + '\r\n';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="booking-${booking._id}.ics"`
    );
  return res.status(200).send(icsContent);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Cannot generate iCalendar (.ics) file'
    });
  }
};
