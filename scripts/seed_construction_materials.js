/**
 * Seed construction material categories and sample products
 * Usage: node scripts/seed_construction_materials.js
 */

const moment = require("moment");
const { CONSTRUCTION_CATEGORIES, DEFAULT_UNIT_TYPE } = require("../global_config/construction_materials.config");

const MONGO_CONNECTION_STRING = process.env.MONGO_URI || "mongodb+srv://Project:A6pyWYW5Hbu7QE9T@cluster0.obxjkz6.mongodb.net";
const DB_NAME = process.env.DB_NAME || "Grossery_store";

const product_model = require("../models/product.model");
const category_model = require("../models/category.model");

const SAMPLE_PRODUCTS = [
  {
    name: "6 Inch Solid Concrete Block",
    category: "Blocks",
    price: 85,
    original_price: 95,
    unit_type: "piece",
    unit: "per piece",
    minimum_order_quantity: 100,
    material_type: "Concrete Block",
    dimensions: "6 x 8 x 12 inches",
    weight: "12 kg",
    stock_quantity: 50000,
    label: "Hot",
    image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600",
  },
  {
    name: "OPC Cement Bag 50kg",
    category: "Cement",
    price: 1450,
    original_price: 1550,
    unit_type: "bag",
    unit: "per bag",
    minimum_order_quantity: 10,
    material_type: "Cement",
    stock_quantity: 2000,
    label: "Sale",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600",
  },
  {
    name: "River Sand Fine Grade",
    category: "Sand",
    price: 4500,
    unit_type: "truckload",
    unit: "per truckload",
    minimum_order_quantity: 1,
    material_type: "Sand",
    stock_quantity: 500,
    featured: true,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600",
  },
  {
    name: "Crush Stone 3/4 Inch",
    category: "Crush / Aggregates",
    price: 5200,
    unit_type: "truckload",
    minimum_order_quantity: 1,
    material_type: "Aggregate",
    stock_quantity: 300,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600",
  },
  {
    name: "Grade 60 Steel Rebar 12mm",
    category: "Steel",
    price: 320,
    unit_type: "piece",
    unit: "per bar (12ft)",
    minimum_order_quantity: 50,
    material_type: "Steel",
    stock_quantity: 10000,
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600",
  },
];

async function seed() {
  const mongoose = require("mongoose");
  try {
    await mongoose.connect(`${MONGO_CONNECTION_STRING}/${DB_NAME}`);
    console.log("Connected to MongoDB");

    const category_map = {};
    for (const cat of CONSTRUCTION_CATEGORIES) {
      let category = await category_model.findOne({ name: cat.name });
      if (!category) {
        category = await category_model.create({ name: cat.name, image: cat.image, is_active: 1 });
        console.log(`Created category: ${cat.name}`);
      } else {
        category.image = cat.image;
        category.is_active = 1;
        await category.save();
        console.log(`Updated category: ${cat.name}`);
      }
      category_map[cat.name] = category;
    }

    for (const sample of SAMPLE_PRODUCTS) {
      const category = category_map[sample.category];
      if (!category) continue;

      const payload = {
        name: sample.name,
        description: `${sample.name} — premium construction material from BuildMart.`,
        descriptions: sample.specifications || "Suitable for residential and commercial construction.",
        price: sample.price,
        original_price: sample.original_price || null,
        main_image: sample.image,
        image: sample.image,
        category_id: category._id,
        category: category.name,
        label: sample.label || null,
        stock_quantity: sample.stock_quantity,
        unit: sample.unit,
        unit_type: sample.unit_type || DEFAULT_UNIT_TYPE,
        minimum_order_quantity: sample.minimum_order_quantity || 1,
        material_type: sample.material_type,
        dimensions: sample.dimensions || null,
        weight: sample.weight || null,
        delivery_available: true,
        featured: sample.featured || false,
        bulk_material: false,
        ramzan_product: false,
        is_active: 1,
        updated_at: moment().unix(),
      };

      const existing = await product_model.findOne({ name: sample.name });
      if (existing) {
        await product_model.updateOne({ _id: existing._id }, { $set: payload });
        console.log(`Updated product: ${sample.name}`);
      } else {
        payload.created_at = moment().unix();
        await product_model.create(payload);
        console.log(`Created product: ${sample.name}`);
      }
    }

    console.log("Construction materials seed completed.");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
