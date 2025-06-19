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
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

  try {
    const ref = doc(db, 'otp', email);
    const docSnap = await getDoc(ref);

    if (!docSnap.exists()) return res.status(400).json({ success: false, message: 'No OTP found' });

    const { otp: storedOtp, expiresAt } = docSnap.data();

    if (Date.now() > expiresAt) {
      await deleteDoc(ref);
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    if (otp !== storedOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    await deleteDoc(ref); // ✅ Invalidate immediately
    res.json({ success: true, message: 'OTP verified' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

