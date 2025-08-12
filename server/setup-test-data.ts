import { DatabaseStorage } from "./storage";
import bcrypt from "bcryptjs";

async function setupTestData() {
  const storage = new DatabaseStorage();
  
  try {
    console.log("Test data setup disabled to prevent dummy data on new accounts");
    
    // DISABLED: Check if teen already exists
    // const existingTeen = await storage.getTeenProfileByUsername("AdriWalton1");
    // if (existingTeen) {
    //   console.log("Test teen account already exists");
    //   return;
    // }
    
    // DISABLED: Create a test family first
    // const user = await storage.createUser({
    //   email: "test@family.com",
    //   passwordHash: await bcrypt.hash("testpassword", 10),
    //   firstName: "Test",
    //   lastName: "Parent"
    // });
    
    console.log("Test data creation has been disabled to prevent dummy data on new accounts");
    return;
    
  } catch (error) {
    console.error("Failed to setup test data:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupTestData().then(() => {
    console.log("Setup complete");
    process.exit(0);
  }).catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
}

export { setupTestData };