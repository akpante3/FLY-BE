const nodemailer = require('nodemailer');

/**
 * Send an email using Zoho Mail
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Email plain text body
 * @param {string} [options.html] - Email HTML body (optional)
 * @returns {Promise<Object>} - Information about the sent email
 */
const sendEmail = async (options) => {
    // 1. Create a transporter object
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.zoho.com',
        port: process.env.EMAIL_PORT || 465,
        secure: true, // true for 465, false for 587
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // 2. Define the email options
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`, // sender address
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    // 3. Actually send the email
    const info = await transporter.sendMail(mailOptions);
    return info;
};

module.exports = sendEmail;
