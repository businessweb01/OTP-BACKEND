import express from 'express';
import emailjs from '@emailjs/nodejs';

const router = express.Router();

router.post('/', async (req, res) => {
  const { to_email, otp } = req.body;

  try {
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      { to_email, otp },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY,
      }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('EmailJS Error:', error);
    res.status(500).json({ success: false, message: error.text });
  }
});

export default router;
