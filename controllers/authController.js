const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    secure: true,
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  //Remove password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) Check if email and password exists
  if (!email || !password) {
    return next(new AppError('please provide email and password', 400));
  }
  //2) check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //3) If everything ok, send web token to the client
  createSendToken(user, 200, res);
});
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting the token & check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in, please log in to get access.', 401),
    );
  }

  console.log('Extracted Token:', token);
  // 2) Verification the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);

  console.log('Current User:', currentUser);
  console.log('Decoded Token:', decoded);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to the token no longer exists', 401),
    );
  }

  // 4) Check if user changes password after Token issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('user recently changed password, please login again', 401),
    );
  }

  //Grant access to protected route
  req.user = currentUser;
  next();
});
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perofrm this action', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const { email } = req.body;
  if (!email) {
    return next(new AppError('Please provide an email address.', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send reset token to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}`;

  // try {
  await sendEmail({
    email: req.body.email,
    subject: 'Your password reset token (valid for 10 min)',
    message,
  });

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
  });
  // } catch (err) {
  //   user.passwordResetToken = undefined;
  //   user.passwordResetExpires = undefined;
  //   await user.save({ validateBeforeSave: false });

  //   return next(
  //     new AppError(
  //       'There was an error sending the email. Try again later!',
  //       500,
  //     ),
  //   );
  // }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //2) If the token has not expired, and there is user , set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has Expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3) Update the changedPasswordAt propert for the current user
  //4) log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user from collection.
  const user = await User.findById(req.user.id).select('+password');
  //2) Check if POSTed password is correct.
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }
  //3) If so, Update password.
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate WILL NOT WORK as intended if used here

  //4) log user in, send jwt.
  createSendToken(user, 200, res);
});

// res.status(200).json({
//   status: 'success',
//   token,
//   data: {
//     user,
//   },
// });
