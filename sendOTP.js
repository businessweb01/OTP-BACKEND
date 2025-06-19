import express from 'express';
import emailjs from '@emailjs/nodejs';

const router = express.Router();

const otpStore = new Map(); // { email: { code, expiresAt } }

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

// Send OTP
router.post('/', async (req, res) => {
  const { to_email } = req.body;

  if (!to_email) return res.status(400).json({ success: false, message: 'Email required' });

  try {
    const otp = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now

    // Overwrite old OTP with new one
    otpStore.set(to_email, { code: otp, expiresAt });

    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      { to_email, otp },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY,
      }
    );

    res.status(200).json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('EmailJS Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
  const { to_email, otp } = req.body;

  if (!to_email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

  const record = otpStore.get(to_email);

  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP found or already verified' });
  }

  const { code, expiresAt } = record;

  if (Date.now() > expiresAt) {
    otpStore.delete(to_email); // Clean up expired OTP
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  if (otp !== code) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  otpStore.delete(to_email); // ✅ DELETE OTP on success
  return res.status(200).json({ success: true, message: 'OTP verified' });
});
