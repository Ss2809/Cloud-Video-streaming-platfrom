const mongoose = require('mongoose');
require('dotenv').config();

const Video = require('./models/Video');
const Category = require('./models/Category');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cloud_streaming';

const SEED_CATEGORIES = [
  { name: 'Action', description: 'High octane thrillers and epic cinematic adventures' },
  { name: 'Adventure', description: 'Expeditions into the unknown, wilderness, and fantasy' },
  { name: 'Comedy', description: 'Stand-up specials, hilarious sitcoms, and comedy sketches' },
  { name: 'Documentary', description: 'Deep dives into science, space, nature, and history' },
  { name: 'Education', description: 'Technology tutorials, masterclasses, and coding lessons' },
  { name: 'Music', description: 'Live concerts, music festivals, and electronic showcases' },
  { name: 'Sports', description: 'Extreme racing, championship highlights, and athletics' },
];

const SEED_VIDEOS = [
  {
    title: 'Shadows of the Neon Abyss',
    description: 'In a dystopian cyberpunk megacity, a rogue mercenary uncovers an encrypted AI broadcast that threatens global energy grids.',
    categoryName: 'Action',
    views: 2800000,
    duration: '1h 48m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-08-25T10:00:00Z'),
  },
  {
    title: 'The Quantum Frontier: Deep Space',
    description: 'Astrophysicists explore the gravitational anomalies at the edges of the observed universe, analyzing black hole physics and dark matter.',
    categoryName: 'Documentary',
    views: 1400000,
    duration: '52m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-08-10T14:30:00Z'),
  },
  {
    title: 'Speedshift: Tokyo Driftway',
    description: 'Modified GT machines battle against rain-soaked streets and hairpin mountain curves under Tokyo neon lights.',
    categoryName: 'Sports',
    views: 3100000,
    duration: '1h 35m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-08-28T09:15:00Z'),
  },
  {
    title: 'Echoes of the Midnight Symphony',
    description: 'A captivating orchestral journey featuring live acoustic cello blended with deep synthwave electronica and analog tape loops.',
    categoryName: 'Music',
    views: 950000,
    duration: '1h 14m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-07-20T18:00:00Z'),
  },
  {
    title: 'Apex Horizon: Mountain Expeditions',
    description: 'Scaling the untamed peaks of the Himalayas without supplemental oxygen, enduring brutal blizzard winds and sheer glacial walls.',
    categoryName: 'Adventure',
    views: 1800000,
    duration: '2h 05m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-08-01T12:00:00Z'),
  },
  {
    title: 'The Laugh Protocol: Stand-up Special',
    description: 'A razor-sharp standup comedy performance filmed live in Brooklyn tackling tech culture, remote work, and modern dating.',
    categoryName: 'Comedy',
    views: 2100000,
    duration: '1h 22m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-08-29T20:00:00Z'),
  },
  {
    title: 'Neural Dreams: Consciousness in Code',
    description: 'An in-depth educational series on transformer architectures, neuromorphic computing, and synthetic neural circuits.',
    categoryName: 'Education',
    views: 890000,
    duration: '45m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-08-27T16:45:00Z'),
  },
  {
    title: 'Rogue Pilot: Beyond the Stratosphere',
    description: 'An experimental Mach 7 hypersonic reconnaissance aircraft penetrates hostile orbital radar grids to recover an orbital relay.',
    categoryName: 'Action',
    views: 4200000,
    duration: '2h 18m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-06-14T11:20:00Z'),
  },
  {
    title: 'Wild Serengeti: Untamed Earth',
    description: '4K HDR wildlife documentary capturing the annual Great Migration across the perilous Mara River.',
    categoryName: 'Documentary',
    views: 3700000,
    duration: '1h 40m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-07-05T08:00:00Z'),
  },
  {
    title: 'Electronic Odyssey Live Festival',
    description: 'Over 60,000 fans gather under massive laser arrays for an electrifying 3-hour headline DJ set featuring cutting-edge visual projection.',
    categoryName: 'Music',
    views: 1900000,
    duration: '2h 45m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-08-24T22:10:00Z'),
  },
  {
    title: 'Island of Secrets: Lost Expeditions',
    description: 'Archaeologists journey into the deep volcanic caves of a secluded Pacific atoll in search of forgotten maritime relics.',
    categoryName: 'Adventure',
    views: 1200000,
    duration: '1h 50m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-08-15T15:00:00Z'),
  },
  {
    title: 'Champions League: Road to Glory',
    description: 'Exclusive backstage documentary tracking the dramatic semifinal and final matches of Europe top club competition.',
    categoryName: 'Sports',
    views: 5600000,
    duration: '1h 55m',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop',
    hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    createdAt: new Date('2026-08-22T19:30:00Z'),
  },
];

async function seedDatabase() {
  try {
    console.log('[Seeder] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[Seeder] MongoDB connected.');

    // 1. Ensure Creator/Admin user exists
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.findOne({});
    }
    if (!adminUser) {
      adminUser = await User.create({
        name: 'StreamCloud Studios',
        email: 'studios@streamcloud.io',
        role: 'admin',
      });
      console.log('[Seeder] Created default admin user:', adminUser.email);
    } else {
      console.log('[Seeder] Found existing user for creator association:', adminUser.email);
    }

    // 2. Upsert Categories
    const categoryMap = {};
    for (const cat of SEED_CATEGORIES) {
      let existing = await Category.findOne({ name: cat.name });
      if (!existing) {
        existing = await Category.create(cat);
        console.log(`[Seeder] Created category: ${cat.name}`);
      }
      categoryMap[cat.name] = existing._id;
    }

    // 3. Check existing videos count
    const existingCount = await Video.countDocuments({});
    console.log(`[Seeder] Current video count in database: ${existingCount}`);

    if (existingCount === 0) {
      for (const item of SEED_VIDEOS) {
        const catId = categoryMap[item.categoryName];
        await Video.create({
          title: item.title,
          description: item.description,
          creatorId: adminUser._id,
          categoryId: catId,
          thumbnailUrl: item.thumbnailUrl,
          originalKey: `videos/seed/${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.mp4`,
          hlsKey: item.hlsKey || `videos/seed/${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/master.m3u8`,
          duration: item.duration,
          status: 'READY',
          visibility: 'public',
          views: item.views,
          createdAt: item.createdAt,
        });
      }
      console.log(`[Seeder] Successfully seeded ${SEED_VIDEOS.length} videos with READY status.`);
    } else {
      console.log('[Seeder] Videos already exist. Checking if any need READY status.');
      // Update any videos with missing hlsKey to test stream
      await Video.updateMany(
        { $or: [{ hlsKey: null }, { hlsKey: '' }] },
        { $set: { hlsKey: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' } }
      );
    }

    const finalCount = await Video.countDocuments({ status: 'READY', visibility: 'public' });
    console.log(`[Seeder] Total public READY videos in MongoDB: ${finalCount}`);
  } catch (error) {
    console.error('[Seeder] Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[Seeder] Finished.');
    process.exit(0);
  }
}

seedDatabase();
