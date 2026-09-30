const Appointment = require('../models/Appointment');
const Hospital = require('../models/Hospital');

// @desc    Get all appointments
// @route   GET /api/v1/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
  let query;

  // ผู้ใช้ทั่วไปจะเห็นเฉพาะรายการนัดหมายของตัวเอง ส่วน Admin เห็นทั้งหมด
  if (req.user.role !== 'admin') {
    query = Appointment.find({ user: req.user.id }).populate({
        path:'hospital',
        select: 'name province tel'
    });
  } else {
        // กรณีเป็น Admin
        if (req.params.hospitalID) {
            console.log(req.params.hospitalID) ;
            query = Appointment.find({hospital:req.params.hospitalID}).populate({
                path:'hospital',
                select: 'name province tel'
            }) ;
        } else {
            query = Appointment.find().populate({
                path:'hospital',
                select: 'name province tel'
            }) ;
        }
  }

  try {
    const appointments = await query;

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Cannot find Appointment"
    });
  }
};

// @desc    Get single appointment
// @route   GET /api/v1/appointments/:id
// @access  Public
exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate({
      path: 'hospital',
      select: 'name description tel'
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot find Appointment"
    });
  }
};

// @desc    Add appointment
// @route   POST /api/v1/hospitals/:hospitalId/appointments/
// @access  Private
exports.addAppointment = async (req, res, next) => {
  try {
    req.body.hospital = req.params.hospitalID;
    const hospital = await Hospital.findById(req.params.hospitalID);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: `No hospital with the id of ${req.params.hospitalID}`
      });
    }

    const appointment = await Appointment.create(req.body);

    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Cannot create Appointment"
    });
  }
};

// @desc    Update appointment
// @route   PUT /api/v1/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res, next) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`
      });
    }

    appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot update Appointment"
    });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/v1/appointments/:id
// @access  Private
exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`
      });
    }

    await appointment.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot delete Appointment"
    });
  }
};