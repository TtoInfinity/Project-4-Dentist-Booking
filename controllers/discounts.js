const DiscountCode = require('../models/DiscountCode');

// @desc    Get all discount codes
// @route   GET /api/v1/discounts
// @access  Private (Admin)
exports.getDiscounts = async (req, res, next) => {
  try {
    const discounts = await DiscountCode.find().sort('-createdAt');
    res.status(200).json({
      success: true,
      count: discounts.length,
      data: discounts
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Cannot fetch discount codes'
    });
  }
};

// @desc    Get / Validate single discount code by code or ID
// @route   GET /api/v1/discounts/:code
// @access  Private
exports.getDiscount = async (req, res, next) => {
  try {
    const param = req.params.code;
    let discount = await DiscountCode.findOne({ code: param.toUpperCase() });
    if (!discount && param.match(/^[0-9a-fA-F]{24}$/)) {
      discount = await DiscountCode.findById(param);
    }

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: `Discount code ${param} not found`
      });
    }

    const isExpired = new Date(discount.expiresAt) <= new Date();
    res.status(200).json({
      success: true,
      isValid: discount.isActive && !isExpired,
      isExpired,
      data: discount
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Cannot fetch discount code'
    });
  }
};

// @desc    Create new promotional discount code
// @route   POST /api/v1/discounts
// @access  Private (Admin)
exports.createDiscount = async (req, res, next) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      discountPercent,
      amount,
      expiresAt,
      expirationDate,
      isActive
    } = req.body;

    const resolvedValue = discountValue ?? discountPercent ?? amount;
    const resolvedType =
      discountType || (discountPercent !== undefined ? 'percent' : 'percent');
    const resolvedExpiresAt = expiresAt || expirationDate;

    if (!code || resolvedValue === undefined || !resolvedExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Please provide code, discountValue, and expiresAt'
      });
    }

    if (resolvedType === 'percent' && (resolvedValue < 1 || resolvedValue > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount value must be between 1 and 100'
      });
    }

    const discount = await DiscountCode.create({
      code: code.trim().toUpperCase(),
      discountType: resolvedType,
      discountValue: resolvedValue,
      expiresAt: resolvedExpiresAt,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      data: discount
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Discount code already exists'
      });
    }
    res.status(400).json({
      success: false,
      message: error.message || 'Cannot create discount code'
    });
  }
};

// @desc    Update discount code
// @route   PUT /api/v1/discounts/:id
// @access  Private (Admin)
exports.updateDiscount = async (req, res, next) => {
  try {
    const existing = await DiscountCode.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `No discount code with the id of ${req.params.id}`
      });
    }

    if (req.body.expirationDate && !req.body.expiresAt) {
      req.body.expiresAt = req.body.expirationDate;
    }
    if (req.body.discountValue === undefined) {
      if (req.body.discountPercent !== undefined) {
        req.body.discountValue = req.body.discountPercent;
      } else if (req.body.amount !== undefined) {
        req.body.discountValue = req.body.amount;
      }
    }
    if (req.body.code) {
      req.body.code = req.body.code.trim().toUpperCase();
    }

    const effectiveType = req.body.discountType || existing.discountType;
    const effectiveValue =
      req.body.discountValue !== undefined ? req.body.discountValue : existing.discountValue;

    if (effectiveType === 'percent' && (effectiveValue < 1 || effectiveValue > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount value must be between 1 and 100'
      });
    }

    const discount = await DiscountCode.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: discount
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Cannot update discount code'
    });
  }
};

// @desc    Delete discount code
// @route   DELETE /api/v1/discounts/:id
// @access  Private (Admin)
exports.deleteDiscount = async (req, res, next) => {
  try {
    const discount = await DiscountCode.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: `No discount code with the id of ${req.params.id}`
      });
    }

    await discount.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Cannot delete discount code'
    });
  }
};
