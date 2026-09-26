// Cleanup script to remove duplicate StudentStats
// Run this once: node cleanup-duplicates.js

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const StudentStats = require('./backend/models/StudentStats');

async function cleanupDuplicates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecolearn');
    console.log('Connected to MongoDB');

    // Find duplicates
    const duplicates = await StudentStats.aggregate([
      {
        $group: {
          _id: '$student_id',
          count: { $sum: 1 },
          docs: { $push: { id: '$_id', points: '$total_points', level: '$current_level' } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`Found ${duplicates.length} students with duplicate records`);

    let removedCount = 0;
    for (const duplicate of duplicates) {
      console.log(`Student ${duplicate._id} has ${duplicate.count} records`);
      
      // Sort by points (keep the one with highest progress)
      duplicate.docs.sort((a, b) => (b.points || 0) - (a.points || 0));
      
      // Keep the first (highest progress), remove the rest
      const toRemove = duplicate.docs.slice(1).map(doc => doc.id);
      
      if (toRemove.length > 0) {
        await StudentStats.deleteMany({ _id: { $in: toRemove } });
        console.log(`Removed ${toRemove.length} duplicate records for student ${duplicate._id}`);
        removedCount += toRemove.length;
      }
    }

    console.log(`✅ Cleanup complete! Removed ${removedCount} duplicate records`);
    
    // Verify cleanup
    const remaining = await StudentStats.find();
    console.log(`📊 Total StudentStats records remaining: ${remaining.length}`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run cleanup
cleanupDuplicates();