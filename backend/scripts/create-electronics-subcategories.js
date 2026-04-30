const mongoose = require("mongoose");
const { connectDb } = require("../src/config/db");
const { Category } = require("../src/models/Category");
const { Subcategory } = require("../src/models/Subcategory");

const subcategoriesData = [
  { name: "Smartphones", code: "SM" },
  { name: "Laptops", code: "LP" },
  { name: "Tablets", code: "TB" },
  { name: "Headphones", code: "HP" },
  { name: "Smartwatches", code: "SW" },
  { name: "Cameras", code: "CM" },
  { name: "Gaming Consoles", code: "GC" },
  { name: "Monitors", code: "MN" },
  { name: "Keyboards", code: "KB" },
  { name: "Mouse & Trackpads", code: "MT" },
  { name: "Speakers", code: "SP" },
  { name: "Power Banks", code: "PB" },
  { name: "Cables & Adapters", code: "CA" },
  { name: "Phone Cases & Covers", code: "PC" },
  { name: "Screen Protectors", code: "SP" },
];

async function createElectronicsSubcategories() {
  try {
    console.log("Connecting to database...");
    await connectDb();

    // Find electronics category
    const electronicsCategory = await Category.findOne({ name: /electronics/i }).select("_id name");
    
    if (!electronicsCategory) {
      console.error("❌ Electronics category not found. Please create it first.");
      process.exit(1);
    }

    console.log(`✓ Found Electronics category: ${electronicsCategory.name} (ID: ${electronicsCategory._id})`);
    console.log(`Creating ${subcategoriesData.length} subcategories...\n`);

    const createdSubcategories = [];
    let successCount = 0;
    let errorCount = 0;

    for (const subcatData of subcategoriesData) {
      try {
        const subcategory = await Subcategory.create({
          name: subcatData.name,
          code: subcatData.code,
          categoryId: electronicsCategory._id,
          status: "active",
        });

        createdSubcategories.push(subcategory);
        successCount++;
        console.log(`✓ Created: ${subcategory.name} (${subcategory.code})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to create ${subcatData.name}: ${error.message}`);
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`Summary:`);
    console.log(`✓ Successfully created: ${successCount} subcategories`);
    if (errorCount > 0) {
      console.log(`✗ Failed: ${errorCount} subcategories`);
    }
    console.log(`${"=".repeat(50)}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

createElectronicsSubcategories();
