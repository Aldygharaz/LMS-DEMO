import { populate150StudentsData } from "./seedLarge";

async function main() {
  try {
    await populate150StudentsData();
    console.log("Database seeded successfully with 150 students!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

main();
