const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const PasswordResetToken = require('../models/PasswordResetToken');
const StudentStats = require('../models/StudentStats');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate JWT token
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const otp = generateOTP();

    // Save OTP to database
    await OTP.findOneAndDelete({ email: email.toLowerCase() });
    const otpDoc = new OTP({
      email: email.toLowerCase(),
      otp
    });
    await otpDoc.save();

    // Send email
    const mailOptions = {
      from: `Acadivio AI <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Acadivio AI - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563EB; margin: 0;">🎓 Acadivio AI</h1>
            <h2 style="color: #374151; margin: 10px 0;">Email Verification</h2>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 15px 0; color: #374151;">Hello,</p>
            <p style="margin: 0 0 15px 0; color: #374151;">Thank you for registering with Acadivio AI! Please use the following OTP to verify your email address:</p>
            
            <div style="background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
            </div>
            
            <p style="margin: 15px 0 0 0; color: #6B7280; font-size: 14px;">This OTP will expire in 10 minutes.</p>
            <p style="margin: 5px 0 0 0; color: #6B7280; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6B7280; font-size: 14px;">Best regards,<br>The Acadivio AI Team</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}: ${otp}`);
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const otpDoc = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      expires_at: { $gt: new Date() }
    });

    if (!otpDoc) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Delete the OTP after successful verification
    await OTP.findByIdAndDelete(otpDoc._id);

    // Generate password reset token for 1 hour
    const resetToken = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.findOneAndDelete({ email: email.toLowerCase() });
    const tokenDoc = new PasswordResetToken({
      email: email.toLowerCase(),
      token: resetToken
    });
    await tokenDoc.save();

    res.json({ message: 'OTP verified successfully', resetToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, mobile, role, institutionId } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !mobile || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate password requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character' });
    }

    // Validate role
    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin registration is not allowed' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password,
      full_name: fullName,
      mobile,
      role,
      institution_id: institutionId || null,
      institution_id: institutionId || null,
      email_verified: true,
      approval_status: role === 'teacher' ? 'pending' : 'approved',
      assigned_subjects: []
    });

    await user.save();

    // Initialize student stats if student (only if not already exists)
    if (role === 'student') {
      const existingStats = await StudentStats.findOne({ student_id: user._id });
      if (!existingStats) {
        const stats = new StudentStats({
          student_id: user._id,
          total_points: 0,
          current_level: 1
        });
        await stats.save();
      }
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Failed to register' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check approval status for teachers
    if (user.role === 'teacher' && user.approval_status !== 'approved') {
      if (user.approval_status === 'pending') {
        return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
      } else if (user.approval_status === 'rejected') {
        return res.status(403).json({ error: 'Your account registration has been rejected. Please contact support.' });
      }
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        institution_id: user.institution_id,
        assigned_subjects: user.assigned_subjects,
        semester: user.semester
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Failed to login' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const {
      full_name,
      mobile,
      institution_id,
      semester,
      standard,
      university_details,
      college_name,
      ngo_details
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if profile is locked (institution_id is set)
    // If locked, users cannot update profile directly - they must submit a request
    if (user.institution_id && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Profile is locked. Please submit a request to update your details.',
        isLocked: true
      });
    }

    // Update fields if provided
    if (full_name) user.full_name = full_name;
    if (mobile) user.mobile = mobile;

    // Handle institution updates
    if (institution_id) user.institution_id = institution_id;

    // Handle specific fields based on institution type (frontend should send relevant ones)
    if (semester !== undefined) user.semester = semester;
    if (standard !== undefined) user.standard = standard;
    if (university_details !== undefined) user.university_details = university_details;
    if (college_name !== undefined) user.college_name = college_name;
    if (ngo_details !== undefined) user.ngo_details = ngo_details;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        institution_id: user.institution_id,
        semester: user.semester,
        standard: user.standard,
        university_details: user.university_details,
        college_name: user.college_name,
        ngo_details: user.ngo_details
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('institution_id');
    res.json({
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      mobile: user.mobile,
      institution_id: user.institution_id,
      assigned_subjects: user.assigned_subjects,
      semester: user.semester,
      standard: user.standard,
      university_details: user.university_details,
      college_name: user.college_name,
      ngo_details: user.ngo_details,
      created_at: user.created_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User with this email does not exist' });
    }

    const otp = generateOTP();

    // Save OTP to database with 10 minutes expiry
    await OTP.findOneAndDelete({ email: email.toLowerCase() });
    const otpDoc = new OTP({
      email: email.toLowerCase(),
      otp
    });
    await otpDoc.save();

    // Send email
    const mailOptions = {
      from: `Acadivio AI <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Acadivio AI - Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563EB; margin: 0;">🎓 Acadivio AI</h1>
            <h2 style="color: #374151; margin: 10px 0;">Password Reset</h2>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 15px 0; color: #374151;">Hello,</p>
            <p style="margin: 0 0 15px 0; color: #374151;">You requested to reset your password. Please use the following OTP to proceed:</p>
            
            <div style="background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
            </div>
            
            <p style="margin: 15px 0 0 0; color: #6B7280; font-size: 14px;">This OTP will expire in 10 minutes.</p>
            <p style="margin: 5px 0 0 0; color: #6B7280; font-size: 14px;">After verification, you'll have 1 hour to reset your password.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6B7280; font-size: 14px;">Best regards,<br>The Acadivio AI Team</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP sent to ${email}: ${otp}`);
    res.json({ message: 'Password reset OTP sent successfully' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send password reset OTP. Please try again.' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required' });
    }

    // Validate password requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character' });
    }

    // Verify reset token
    const tokenDoc = await PasswordResetToken.findOne({
      email: email.toLowerCase(),
      token: resetToken,
      expires_at: { $gt: new Date() }
    });

    if (!tokenDoc) {
      return res.status(400).json({ error: 'Invalid or expired reset session. Please request a new password reset.' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password - this will trigger the pre-save hook for hashing
    user.password = newPassword;
    await user.save();

    // Delete the reset token after successful password reset
    await PasswordResetToken.findByIdAndDelete(tokenDoc._id);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

module.exports = router;

