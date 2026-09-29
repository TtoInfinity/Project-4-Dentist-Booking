const Appointment = require('../models/Appointment');

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