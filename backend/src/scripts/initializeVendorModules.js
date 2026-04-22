/**
 * Script to initialize Vendor Modules
 * Run this script once during app setup
 * 
 * Usage: node scripts/initializeVendorModules.js
 */

require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const vendorModuleService = require("../src/services/vendorModule.service");

async function initializeModules() {
  try {
    console.log("🔄 Connecting to database...");
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not defined in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    console.log("🔄 Initializing vendor modules...");
    await vendorModuleService.initializeModules();
    console.log("✅ Vendor modules initialized successfully");

    const modules = await vendorModuleService.getAllModules();
    console.log("\n📦 Initialized Modules:");
    modules.forEach((module) => {
      console.log(`  • ${module.name} (${module.key})`);
      console.log(`    - Global: ${module.enabled ? "✅ Enabled" : "❌ Disabled"}`);
      console.log(`    - Vendors: ${module.vendorEnabled ? "✅ Enabled" : "❌ Disabled"}`);
    });

    const stats = await vendorModuleService.getModuleStats();
    console.log("\n📊 Module Statistics:");
    console.log(`  • Total: ${stats.total}`);
    console.log(`  • Enabled Globally: ${stats.enabledGlobally}`);
    console.log(`  • Enabled for Vendors: ${stats.enabledForVendors}`);
    console.log(`  • Disabled for Vendors: ${stats.disabledForVendors}`);

    console.log("\n✨ Done! Vendor module system is ready.");
  } catch (error) {
    console.error("❌ Error initializing modules:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

initializeModules();
