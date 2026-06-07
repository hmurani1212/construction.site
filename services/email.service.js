const nodemailer = require('nodemailer');

/**
 * Email Service
 * Handles sending emails for notifications
 */
class email_service {
  constructor() {
    console.log('FILE: email.service.js | Email Service initialized');
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Configure email transporter
    // For production, use environment variables for email credentials
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || 'kkami5754049@gmail.com',
        pass: process.env.EMAIL_PASS || 'gpllzjydmxxfqfcn',
      },
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('FILE: email.service.js | Email transporter verification failed:', error);
      } else {
        console.log('FILE: email.service.js | Email transporter is ready');
      }
    });
  }

  /**
   * Send email
   * @param {Object} options - Email options { to, subject, html, text }
   */
  async sendEmail(options) {
    try {
      const { to, subject, html, text } = options;

      if (!to || !subject) {
        throw new Error('Email recipient and subject are required');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'BuildMart <noreply@clickmart.com>',
        to: to,
        subject: subject,
        html: html || text,
        text: text || html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`FILE: email.service.js | sendEmail | Email sent successfully to ${to}:`, info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('FILE: email.service.js | sendEmail | Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send weekly notification about new products
   */
  async sendWeeklyNotification(userEmail, userName, newProducts) {
    const productList = newProducts
      .map((product, index) => `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #333;">${index + 1}. ${product.name}</h3>
          <p style="color: #666; margin: 5px 0;">${product.description || 'Check out this amazing product!'}</p>
          <p style="color: #28a745; font-weight: bold; font-size: 18px;">Rs ${product.price}</p>
          ${product.original_price && product.original_price > product.price ? 
            `<p style="color: #999; text-decoration: line-through;">Rs ${product.original_price}</p>` : ''}
        </div>
      `)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Weekly New Products - BuildMart</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">BuildMart</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333;">Hello ${userName},</h2>
            <p>Check out our new products this week! We've added some amazing items just for you.</p>
            ${productList}
            <div style="text-align: center; margin-top: 30px;">
              <a href='https://grocery-store-frontend-pied.vercel.app/Shop' 
                 style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Shop Now
              </a>
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              Thank you for being a valued customer!
            </p>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: 'Weekly New Products - BuildMart',
      html: html,
    });
  }

  /**
   * Send account summary email
   */
  async sendAccountSummary(userEmail, userName, summaryData) {
    const { totalOrders, totalProducts, totalAmount } = summaryData;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Weekly Account Summary - BuildMart</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">BuildMart</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333;">Hello ${userName},</h2>
            <p>Here's your weekly account summary:</p>
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <div style="margin-bottom: 15px;">
                <strong>Total Orders:</strong> ${totalOrders}
              </div>
              <div style="margin-bottom: 15px;">
                <strong>Total Products Ordered:</strong> ${totalProducts}
              </div>
              <div style="margin-bottom: 15px;">
                <strong>Total Amount Spent:</strong> Rs ${totalAmount.toFixed(2)}
              </div>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://grocery-store-frontend-pied.vercel.app/MyAccountOrder" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Orders
              </a>
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              Thank you for shopping with us!
            </p>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: 'Your Weekly Account Summary - BuildMart',
      html: html,
    });
  }

  /**
   * Send order update email (new product added)
   */
  async sendOrderUpdate(userEmail, userName, product) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Product Added - BuildMart</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffc107; color: #333; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">BuildMart</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333;">Hello ${userName},</h2>
            <p>We've just added a new product that might interest you!</p>
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">${product.name}</h3>
              <p style="color: #666;">${product.description || 'Check out this amazing new product!'}</p>
              <p style="color: #28a745; font-weight: bold; font-size: 18px;">Rs ${product.price}</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://grocery-store-frontend-pied.vercel.app/Shop" 
                 style="background-color: #ffc107; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Product
              </a>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: `New Product: ${product.name} - BuildMart`,
      html: html,
    });
  }
}

module.exports = new email_service();

