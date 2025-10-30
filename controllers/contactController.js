// File: backend/controllers/contactController.js

const nodemailer = require('nodemailer');

exports.sendContactMessage = async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // 1. Transporter (ईमेल भेजने वाली सर्विस) बनाएँ
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS, 
            },
        });

        // 2. Email ka content (Mail Options)
        const mailOptions = {
            from: `"${name}" <${process.env.EMAIL_FROM}>`, // Bhejne wale ka naam
            to: process.env.EMAIL_TO, // Aapka receiving email
            subject: `New Contact Form Message from ${name} (Madhur News)`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>New Message via Madhur News Contact Form</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <hr>
                    <h3>Message:</h3>
                    <p style="white-space: pre-wrap;">${message}</p>
                </div>
            `,
        };

        // 3. Email bhein
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Message sent successfully! We will get back to you soon.' });

    } catch (error) {
        console.error('Error sending contact email:', error);
        res.status(500).json({ message: 'Failed to send message. Please try again later.' });
    }
};