import { DatabaseStorage } from "./storage";
import bcrypt from "bcryptjs";

async function setupTestData() {
  const storage = new DatabaseStorage();
  
  try {
    console.log("Setting up test teen account...");
    
    // Check if teen already exists
    const existingTeen = await storage.getTeenProfileByUsername("AdriWalton1");
    if (existingTeen) {
      console.log("Test teen account already exists");
      return;
    }
    
    // Create a test family first
    const user = await storage.createUser({
      email: "test@family.com",
      passwordHash: await bcrypt.hash("testpassword", 10),
      firstName: "Test",
      lastName: "Parent"
    });
    
    const family = await storage.createFamily({
      name: "Walton Family",
      ownerId: user.id
    });
    
    await storage.createFamilyMembership({
      userId: user.id,
      familyId: family.id,
      role: "owner"
    });
    
    // Create teen user account
    const teenUser = await storage.createUser({
      email: "adri@teen.local",
      passwordHash: await bcrypt.hash("Welcome1!", 10),
      firstName: "Adri",
      lastName: "Walton"
    });
    
    // Create family member record
    const familyMember = await storage.createFamilyMember({
      name: "Adri Walton",
      role: "teen",
      color: "#8B5CF6",
      avatar: "A",
      userId: teenUser.id,
      familyId: family.id,
      canLogin: true,
      isActive: true
    });
    
    // Create teen profile
    const teenProfile = await storage.createTeenProfile({
      userId: teenUser.id,
      familyMemberId: familyMember.id,
      firstName: "Adri",
      lastName: "Walton",
      username: "AdriWalton1",
      age: 16,
      favoriteColor: "#8B5CF6"
    });
    
    // Create notification settings
    await storage.createTeenNotificationSettings({
      teenProfileId: teenProfile.id,
      taskReminders: true,
      eventNotifications: true,
      dailyDigest: true,
      quietHours: true,
      quietStart: "22:00",
      quietEnd: "08:00"
    });
    
    console.log("✅ Test teen account created successfully!");
    console.log(`Username: AdriWalton1`);
    console.log(`Password: Welcome1!`);
    console.log(`Teen ID: ${teenProfile.id}`);
    
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