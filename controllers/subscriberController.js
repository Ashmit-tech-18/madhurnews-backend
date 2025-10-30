// File: backend/controllers/subscriberController.js

const { validationResult, check } = require('express-validator');
const Subscriber = require('../models/Subscriber');
const nodemailer = require('nodemailer'); // --- FIX 1: Nodemailer ko import karein ---

exports.addSubscriber = [
    // Email ko validate karein
    check('email', 'Please include a valid email').isEmail(),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        try {
            let subscriber = await Subscriber.findOne({ email });

            if (subscriber) {
                return res.status(400).json({ msg: 'This email is already subscribed.' });
            }

            // --- 1. Subscriber ko Database me save karein ---
            subscriber = new Subscriber({ email });
            await subscriber.save();

            // --- FIX 2: Subscriber ko "Welcome" email bhein ---
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER, // Aapka .env se
                        pass: process.env.EMAIL_PASS, // Aapka .env se
                    },
                });

                const mailOptions = {
                    from: `"Madhur News" <${process.env.EMAIL_FROM}>`, // Bhejne wale ka naam
                    to: email, // Naye subscriber ka email
                    subject: '🎉 Welcome to Madhur News!',
                    html: `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                            <h1 style="color: #333; text-align: center;">Welcome to Madhur News!</h1>
                            <p>Thank you for subscribing to our newsletter.</p>
                            <p>You are now part of a growing community of informed readers. We'll keep you updated with the most important news, straight to your inbox.</p>
                            <p>Stay informed!</p>
                            <br>
                            <p>Best regards,</p>
                            <p><strong>The Madhur News Team</strong></p>
                            <hr>
                            <p style="text-align: center; font-size: 0.8rem; color: #888;">
                                You received this email because you subscribed on our website.
                            </p>
                        </div>
                    `,
                };

                // Email bhein
                await transporter.sendMail(mailOptions);
                console.log(`Welcome email sent successfully to ${email}`);

            } catch (emailError) {
                // Agar email fail hota hai, toh bhi user ko error na dikhayein
                // Kyonki woh subscribe toh ho hi gaya hai.
                console.error(`Failed to send welcome email to ${email}:`, emailError);
            }
            // --- END OF FIX ---


            // User ko success message bhein
            res.status(201).json({ msg: 'Thank you for subscribing! A welcome email has been sent.' });

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
];