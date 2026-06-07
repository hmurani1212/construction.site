const express = require("express");
const router = express.Router();
const product_model = require("../models/product.model");
const category_model = require("../models/category.model");

/**
 * @swagger
 * /sitemap.xml:
 *   get:
 *     summary: Generate dynamic sitemap.xml with all products and categories
 *     tags: [SEO]
 *     responses:
 *       200:
 *         description: Sitemap XML generated successfully
 *         content:
 *           application/xml:
 *             schema:
 *               type: string
 */
router.get("/sitemap.xml", async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || "https://www.clickmartgrocery.com";
    const currentDate = new Date().toISOString().split('T')[0];

    // Fetch all active products
    const products = await product_model.find({ is_active: 1 }).select('_id updatedAt').lean();

    // Fetch all active categories
    const categories = await category_model.find({ is_active: 1 }).select('_id updatedAt').lean();

    // Start building XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  
  <!-- Home Page -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Shop Page -->
  <url>
    <loc>${baseUrl}/Shop</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- About Pages -->
  <url>
    <loc>${baseUrl}/AboutUs</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/Contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/Blog</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  
  <!-- Footer Pages -->
  <url>
    <loc>${baseUrl}/Faq</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/Coupons</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/Careers</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/helpcenter</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <!-- Category Pages -->
`;

    // Add category pages with filters
    categories.forEach(category => {
      const categoryDate = category.updatedAt
        ? new Date(category.updatedAt).toISOString().split('T')[0]
        : currentDate;
      xml += `  <url>
    <loc>${baseUrl}/Shop?category_id=${category._id}</loc>
    <lastmod>${categoryDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    });

    // Add product pages
    xml += `  
  <!-- Product Pages -->
`;

    products.forEach(product => {
      const productDate = product.updatedAt
        ? new Date(product.updatedAt).toISOString().split('T')[0]
        : currentDate;
      xml += `  <url>
    <loc>${baseUrl}/SingleShop/${product._id}</loc>
    <lastmod>${productDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    });

    xml += `</urlset>`;

    // Set content type to XML
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
