const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter object using Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Use 'gmail' service to automatically configure host/port
    auth: {
      user: process.env.SMTP_EMAIL, // your real gmail address
      pass: process.env.SMTP_PASSWORD, // your app password
    },
  });

  const message = {
    from: '"Cropnow Admin" <noreply@cropnow.com>', // sender address
    to: options.email, // list of receivers
    subject: options.subject, // Subject line
    text: options.message, // plain text body
    // html: "<b>Hello world?</b>", // html body
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent successfully to %s', info.messageId);
};

module.exports = sendEmail;
