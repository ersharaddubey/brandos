import 'dotenv/config';
import mongoose from 'mongoose';
import Organization from '../src/models/Organization.js';
const apply = process.argv.includes('--apply');
const slug = process.env.LEGACY_ORG_SLUG;
if (!slug) throw new Error('Set LEGACY_ORG_SLUG to the target organization slug.');
await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
try {
  const org = await Organization.findOne({ slug });
  if (!org) throw new Error(`Organization not found: ${slug}`);
  const collections = ['identities','assets','assetgroups','campaigns','generations','prompttemplates','recyclebins'];
  for (const name of collections) {
    const collection = mongoose.connection.collection(name.toLowerCase());
    const count = await collection.countDocuments({ organizationId: { $exists: false } });
    console.log(`${name}: ${count} legacy records ${apply ? 'will be assigned' : 'would be assigned'} to ${org.name}`);
    if (apply && count) await collection.updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: org._id } });
  }
  if (apply) {
    for (const [collection,index] of [['assets','sha256_1'],['campaigns','name_1']]) {
      try { await mongoose.connection.collection(collection).dropIndex(index); console.log(`Dropped legacy global index ${collection}.${index}`); } catch (e) { if (e.codeName !== 'IndexNotFound') throw e; }
    }
    console.log('Tenant migration complete. Restart the API so compound indexes can be built.');
  } else console.log('DRY RUN only. Back up MongoDB, then rerun with --apply to make changes.');
} finally { await mongoose.disconnect(); }
