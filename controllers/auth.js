const User = require('../models/User');

// Ensure pre-save hook handles Mongoose where next is not passed to async hooks
if (User.schema && User.schema.s && User.schema.s.hooks) {
  const saveHooks = User.schema.s.hooks._pres.get('save');
  if (saveHooks) {
    const hook = saveHooks.find((h) => h.fn && h.fn.toString().includes('isModified'));
    if (hook) {
      const origFn = hook.fn;
      hook.fn = async function (next) {
        if (!this.isModified('password')) {
          if (typeof next === 'function') {
            return next();
          }
          return;
        }
        return origFn.call(this, next);
      };
    }
  }
}

//@desc     Register user
//@route    POST /api/v1/auth/register
//@access   Public
exports.register = async(req, res, next)=>{
    try{
        const {name, tel, email, password, role} = req.body;
        //Create user
        const user = await User.create({
            name, 
            tel,
            email, 
            password, 
            role
        });
        //Create token
        // const token = user.getSignedJwtToken();
        // res.status(201).json({success:true, token});
        sendTokenResponse (user,201,res);
    } catch(err){ 
        res.status(400).json({ success: false, message: err.message }); 
        console.log(err.stack);
    }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate if email and password exist in req.body. If not, return 400.
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // 2. Find user by email (include password field: .select('+password')). If not found, return 401.
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 3. Check lock status: If user.lockUntil > Date.now(), return 423 with message "Account is temporarily locked".
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    // 4. If lock expired but user.failedLoginAttempts >= 5, reset failedLoginAttempts = 0 and lockUntil = null.
    if (user.failedLoginAttempts >= 5 && (!user.lockUntil || user.lockUntil <= Date.now())) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    // 5. Check if password matches (user.matchPassword).
    const isMatch = await user.matchPassword(password);

    // 6. IF PASSWORD DOES NOT MATCH:
    //    - Increment user.failedLoginAttempts += 1.
    //    - If user.failedLoginAttempts >= 5, set user.lockUntil = Date.now() + 15 * 60 * 1000.
    //    - MUST execute await user.save({ validateBeforeSave: false });
    //    - If locked, return 423. If not locked yet, return 401.
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      let isLocked = false;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000;
        isLocked = true;
      }

      await user.save({ validateBeforeSave: false });

      if (isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 7. IF PASSWORD MATCHES:
    //    - Reset user.failedLoginAttempts = 0 and user.lockUntil = null.
    //    - Execute await user.save({ validateBeforeSave: false });
    //    - Send token response (status 200).
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.log(err.stack);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token
  });
};

//@desc     Get current Logged in user
//@route    POST /api/vl/auth/me
//@access   Private
exports.getMe=async (req, res,next)=>{
    const user=await User.findById(req.user.id);
    res.status (200).json ({
        success:true,
        data:user
    });
};

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
};
