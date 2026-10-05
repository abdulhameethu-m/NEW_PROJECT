/**
 * seed-womens-products.js
 * --------------------------------------------------
 * Adds 10 sample Women's Maternity products to the DB.
 * Also updates any already-seeded Women's products with
 * the Maternity subcategory.
 *
 * Run from the backend folder:
 *   node seed-womens-products.js
 * --------------------------------------------------
 */

require("dotenv").config();
const mongoose = require("mongoose");

// ─── DB connection ────────────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGODB_FALLBACK_URI ||
  "mongodb://127.0.0.1:27017/amazon_likee";

// ─── Model imports ────────────────────────────────────────────────────────────
const { Category } = require("./src/models/Category");
const { Subcategory } = require("./src/models/Subcategory");
const { Product } = require("./src/models/Product");
const User = require("./src/models/User");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sku(index) {
  return `WMN-MAT-${String(Date.now()).slice(-6)}-${String(index).padStart(3, "0")}`;
}

function productNumber(index) {
  return `PN-MAT-${String(index).padStart(5, "0")}-${String(Date.now()).slice(-4)}`;
}

// ─── Maternity Product Data ───────────────────────────────────────────────────
const MATERNITY_PRODUCTS = [
  {
    name: "Maternity Wrap Nursing Dress",
    shortDescription: "Elegant wrap dress designed for bump-friendly comfort and easy nursing access.",
    description:
      "This specially designed maternity wrap dress grows with your bump, thanks to its adjustable tie waist and stretchy fabric. The wrap-style front doubles as easy nursing access post-delivery. Knee-length, V-neckline, short sleeves. Available in floral, stripes, and solid colors.",
    price: 1799,
    discountPrice: 1199,
    tags: ["maternity", "nursing", "dress", "women", "pregnancy", "wrap"],
    images: [
      { url: "https://images.unsplash.com/photo-1555412654-72a95a495858?w=600&q=80", isPrimary: true, sortOrder: 0 },
      { url: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600&q=80", isPrimary: false, sortOrder: 1 },
    ],
    thumbnail: "https://images.unsplash.com/photo-1555412654-72a95a495858?w=300&q=80",
    weight: { value: 0.32, unit: "kg" },
    attributes: { material: "Viscose Spandex Blend", care: "Machine Wash Cold", feature: "Nursing Friendly" },
  },
  {
    name: "Maternity Over-the-Bump Leggings",
    shortDescription: "Ultra-soft over-the-bump leggings with full belly support panel.",
    description:
      "These maternity leggings feature a wide, non-slip over-the-bump support panel that grows with you throughout your pregnancy. Made from 4-way stretch fabric for maximum comfort. Squat-proof, moisture-wicking, and suitable for yoga, walks, or lounging. Available in black, grey, and navy.",
    price: 999,
    discountPrice: 699,
    tags: ["maternity", "leggings", "over-the-bump", "women", "pregnancy", "activewear"],
    images: [
      { url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80", isPrimary: true, sortOrder: 0 },
    ],
    thumbnail: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&q=80",
    weight: { value: 0.28, unit: "kg" },
    attributes: { material: "80% Nylon 20% Spandex", waist: "Over-the-Bump Panel", feature: "4-Way Stretch" },
  },
  {
    name: "Maternity Side-Ruched T-Shirt",
    shortDescription: "Comfortable side-ruched maternity tee that flatters your growing belly.",
    description:
      "This everyday maternity t-shirt features side ruching that accommodates your growing bump while staying stylish and comfortable. Made from soft jersey cotton blend, it can be worn throughout pregnancy and postpartum. Crew neck, short sleeves, and relaxed fit. Available in 6 colors.",
    price: 699,
    discountPrice: 499,
    tags: ["maternity", "t-shirt", "top", "ruched", "women", "pregnancy"],
    images: [
      { url: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80", isPrimary: true, sortOrder: 0 },
    ],
    thumbnail: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&q=80",
    weight: { value: 0.22, unit: "kg" },
    attributes: { material: "95% Cotton 5% Elastane", fit: "Relaxed Ruched", neck: "Crew Neck" },
  },
  {
    name: "Maternity Nursing Bra (Pack of 2)",
    shortDescription: "Wireless nursing bra with easy-clip cups for comfortable all-day support.",
    description:
      "Specially designed for expecting and nursing mothers, this wireless nursing bra offers superior comfort with no underwire. Features easy one-hand nursing clip-down cups, wide adjustable straps, and a soft breathable fabric. Available in sizes 32B–42F. Suitable from second trimester through breastfeeding.",
    price: 1299,
    discountPrice: 899,
    tags: ["maternity", "nursing bra", "bra", "women", "pregnancy", "innerwear"],
    images: [
      { url: "https://images.unsplash.com/photo-1617896848219-4f0cfd7e91eb?w=600&q=80", isPrimary: true, sortOrder: 0 },
    ],
    thumbnail: "https://images.unsplash.com/photo-1617896848219-4f0cfd7e91eb?w=300&q=80",
    weight: { value: 0.18, unit: "kg" },
    attributes: { type: "Wireless", feature: "Nursing Clips", quantity: "Pack of 2", care: "Hand Wash" },
  },
  {
    name: "Maternity Belly Band Support Belt",
    shortDescription: "Adjustable belly support band for back pain relief during pregnancy.",
    description:
      "This maternity belly band provides gentle compression and support for your growing belly, lower back, and pelvis. Made from breathable, stretchy fabric. Can be worn under or over clothing. Velcro closure for easy adjustment as your bump grows. Suitable for all trimesters. One size fits most.",
    price: 849,
    discountPrice: 599,
    tags: ["maternity", "belly band", "support", "women", "pregnancy", "back support"],
    images: [
      { url: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=600&q=80", isPrimary: true, sortOrder: 0 },
    ],
    thumbnail: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=300&q=80",
    weight: { value: 0.2, unit: "kg" },
    attributes: { material: "Neoprene Blend", closure: "Velcro", trimester: "All Trimesters" },
  },
  {
    name: "Maternity Maxi Skirt",
    shortDescription: "Flowy maternity maxi skirt with an over-bump elastic waistband.",
    description:
      "This versatile maternity maxi skirt features a wide over-the-bump elastic waistband for growing comfort, and a flowy, floor-length silhouette that pairs beautifully with maternity tops or casual blouses. Side slits for movement. Available in sage green, ivory, and dusty rose.",
    price: 1099,
    discountPrice: 749,
    tags: ["maternity", "skirt", "maxi", "women", "pregnancy", "flowy"],
    images: [
      { url: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&q=80", isPrimary: true, sortOrder: 0 },
    ],
    thumbnail: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=300&q=80",
    weight: { value: 0.38, unit: "kg" },
    attributes: { material: "Chiffon Blend", length: "Maxi", waist: "Over-the-Bump Elastic" },
  },
  {
    name: "Maternity Pyjama Set",
    shortDescription: "Ultra-soft maternity lounge pyjama set — perfect for relaxing and sleeping.",
    description:
      "This cozy maternity pyjama set includes a nursing-friendly button-front top and wide-leg pants with an adjustable bump panel. Made from incredibly soft bamboo-cotton fabric that regulates body temperature. Perfect for pregnancy, postpartum lounging, and nightwear. Available in pastel colors.",
    price: 1599,
    discountPrice: 1099,
    tags: ["maternity", "pyjama", "lounge", "sleepwear", "women", "pregnancy", "nursing"],
    images: [
      { url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80", isPrimary: true, sortOrder: 0 },
    ],
    thumbnail: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=300&q=80",
    weight: { value: 0.45, unit: "kg" },
    attributes: { material: "60% Bamboo 40% Cotton", set: "Top + Pants", feature: "Nursing Button Front" },
  },
  {
    name: "Maternity Denim Jeans (Over-Bump)",
    shortDescription: "Stretchy maternity jeans with full over-bump support panel for all-day wear.",
    description:
      "These maternity skinny jeans are designed with a full over-the-bump stretch denim panel that fits comfortably from the first trimester through postpartum. Classic five-pocket design, zip fly, and premium stretch denim that retains its shape. Available in light wash, dark wash, and black.",
    price: 1799,
    discountPrice: 1299,
    tags: ["maternity", "jeans", "denim", "over-the-bump", "women", "pregnancy"],
    images: [
      { url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80", isPrimary: true, sortOrder: 0 },
      { url: "https://images.unsplash.com/photo-1555689502-c4b22d76c56f?w=600&q=80", isPrimary: false, sortOrder: 1 },
    ],
    thumbnail: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&q=80",
    weight: { value: 0.65, unit: "kg" },
    attributes: { material: "98% Cotton 2% Elastane", rise: "Over-the-Bump Panel", fit: "Skinny" },
  },
  {
    name: "Maternity Hospital Bag Nightgown",
    shortDescription: "Soft nursing nightgown perfect for labour, hospital stay & postpartum recovery.",
    description:
      "This specially designed hospital bag nightgown makes labour and recovery more comfortable. Features snap buttons along both shoulders for easy skin-to-skin contact and breastfeeding, a soft jersey fabric, and a modest length. Comes with matching robe. Recommended by midwives. Machine washable.",
    price: 1499,
    discountPrice: 1049,
    tags: ["maternity", "nightgown", "hospital bag", "nursing", "women", "postpartum", "labour"],
    images: [
      { url: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=600&q=80", isPrimary: true, sortOrder: 0 },
    ],
    thumbnail: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=300&q=80",
    weight: { value: 0.35, unit: "kg" },
    attributes: { material: "100% Jersey Cotton", feature: "Snap Nursing Access", set: "Nightgown + Robe" },
  },
  {
    name: "Maternity Floral Kurta Set",
    shortDescription: "Graceful maternity kurta with palazzo pants — bump-friendly ethnic wear.",
    description:
      "This beautiful maternity ethnic set includes a long floral kurta with A-line flare to accommodate your bump, paired with palazzo pants featuring an over-the-bump elastic waistband. Crafted from soft cotton fabric with delicate floral print. Ideal for festive occasions, baby showers, and casual wear.",
    price: 1899,
    discountPrice: 1399,
    tags: ["maternity", "kurta", "ethnic", "pregnancy", "women", "floral", "palazzo"],
    images: [
      { url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80", isPrimary: true, sortOrder: 0 },
    ],
    thumbnail: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80",
    weight: { value: 0.5, unit: "kg" },
    attributes: { material: "100% Cotton", set: "Kurta + Palazzo", style: "Ethnic Indian", feature: "Over-Bump Waistband" },
  },
];

// Names of the 10 previously seeded products (to update their subcategory)
const PREVIOUSLY_SEEDED_NAMES = [
  "Women's Floral Wrap Dress",
  "Women's High-Waist Skinny Jeans",
  "Women's Silk Blouse",
  "Women's A-Line Midi Skirt",
  "Women's Oversized Knit Sweater",
  "Women's Linen Palazzo Pants",
  "Women's Crop Leather Jacket",
  "Women's Boho Maxi Dress",
  "Women's Sports Leggings",
  "Women's Embroidered Kurti",
];

// ─── Main seed function ───────────────────────────────────────────────────────
async function seed() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected!\n");

  // ── STEP 1: Find Women's category ─────────────────────────────────────────
  let category = await Category.findOne({
    $or: [{ name: /women/i }, { slug: /women/i }],
  }).lean();

  if (!category) {
    console.log("⚠️  No Women's category found. Creating one...");
    const created = await Category.create({ name: "Women's", isActive: true, order: 2 });
    category = created.toObject();
    console.log(`✅ Created category: "${category.name}" (${category._id})\n`);
  } else {
    console.log(`✅ Category: "${category.name}" (${category._id})`);
  }

  // ── STEP 2: Find or create "Maternity" subcategory ─────────────────────────
  let subCategory = await Subcategory.findOne({
    categoryId: category._id,
    $or: [{ name: /maternity/i }, { slug: /maternity/i }],
  }).lean();

  if (!subCategory) {
    console.log("📁 Creating 'Maternity' subcategory...");
    const created = await Subcategory.create({
      name: "Maternity",
      code: "MAT",
      categoryId: category._id,
      status: "active",
    });
    subCategory = created.toObject();
    console.log(`✅ Created subcategory: "Maternity" (${subCategory._id})\n`);
  } else {
    console.log(`✅ Subcategory: "Maternity" (${subCategory._id})\n`);
  }

  // ── STEP 3: Find admin user ────────────────────────────────────────────────
  let adminUser = null;
  try {
    const UserModel = User.User || User;
    adminUser = await UserModel.findOne({ role: "admin" }).lean();
    if (!adminUser) adminUser = await UserModel.findOne({}).lean();
  } catch (_) {
    try {
      const UserModel = mongoose.model("User");
      adminUser = await UserModel.findOne({ role: "admin" }).lean();
    } catch (__) {}
  }

  if (!adminUser) {
    console.error("❌ No user found in DB. Please create an admin user first.");
    process.exit(1);
  }
  console.log(`👤 Using admin user: ${adminUser.email || adminUser._id}\n`);

  // ── STEP 4: Update previously seeded 10 products with Maternity subcategory ─
  console.log("🔄 Updating previously seeded Women's products to Maternity subcategory...");
  const updateResult = await Product.updateMany(
    {
      name: { $in: PREVIOUSLY_SEEDED_NAMES },
      categoryId: category._id,
    },
    {
      $set: {
        subCategory: subCategory.name,
        subCategoryId: subCategory._id,
      },
    }
  );
  console.log(`   ✅ Updated ${updateResult.modifiedCount} existing product(s)\n`);

  // ── STEP 5: Insert 10 new Maternity products ───────────────────────────────
  console.log("➕ Inserting 10 new Maternity products...\n");
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < MATERNITY_PRODUCTS.length; i++) {
    const data = MATERNITY_PRODUCTS[i];
    const baseSlug = slugify(data.name);

    // Skip if already exists (idempotent re-run)
    const exists = await Product.findOne({ slug: baseSlug, sellerId: null }).lean();
    if (exists) {
      console.log(`   ⏭  Skipped (exists): ${data.name}`);
      skipped++;
      continue;
    }

    const productSku = sku(i + 1);
    const productNum = productNumber(i + 1);

    const doc = {
      name: data.name,
      slug: baseSlug,
      shortDescription: data.shortDescription,
      description: data.description,
      category: category.name,
      categoryId: category._id,
      subCategory: subCategory.name,
      subCategoryId: subCategory._id,
      price: data.price,
      discountPrice: data.discountPrice,
      currency: "INR",
      stock: Math.floor(Math.random() * 80) + 20, // 20–100 units
      SKU: productSku,
      productNumber: productNum,
      lowStockThreshold: 10,
      images: data.images,
      thumbnail: data.thumbnail,
      tags: data.tags || [],
      weight: data.weight,
      attributes: data.attributes || {},
      status: "APPROVED",
      isActive: true,
      isFeatured: i < 3,
      featured: i < 3,
      featuredRank: i < 3 ? i + 1 : 0,
      createdBy: adminUser._id,
      creatorType: "ADMIN",
      ratings: {
        averageRating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        totalReviews: Math.floor(Math.random() * 150) + 10,
      },
      analytics: {
        views: Math.floor(Math.random() * 5000),
        salesCount: Math.floor(Math.random() * 200),
      },
    };

    try {
      const saved = await Product.create(doc);
      console.log(
        `   ✅ [${i + 1}/10] "${saved.name}" | SKU: ${productSku} | ₹${data.discountPrice}`
      );
      created++;
    } catch (err) {
      console.error(`   ❌ Failed: "${data.name}":`, err.message);
    }
  }

  console.log(`\n─────────────────────────────────────────────────────`);
  console.log(`📦 New products  → Created: ${created}  |  Skipped: ${skipped}`);
  console.log(`🔄 Old products  → Updated: ${updateResult.modifiedCount} with Maternity subcategory`);
  console.log(`🏷️  Subcategory   → Maternity (${subCategory._id})`);
  console.log(`📂 Category      → ${category.name} (${category._id})`);
  console.log(`─────────────────────────────────────────────────────`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
