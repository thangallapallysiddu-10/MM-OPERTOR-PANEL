const sequelize = require('./config/db.config');
// const Operator = require('./models/operator.model');
const { Stream } = require('./models/stream.model');
const User = require('./models/user.model');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('Connecting to the database...');
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    console.log('Seeding database...');



    const channels = [
      { name: 'Channel 1 - Stargazing', quality: 'HIGH', description: 'EDM & House' },
      { name: 'Channel 2 - Sunrise', quality: 'BALANCED', description: 'Chill Vibes' },
      { name: 'Channel 3 - Midnight Echo', quality: 'HIGH', description: 'Deep House' },
      { name: 'Channel 4 - Evening Vibes', quality: 'BALANCED', description: 'Lofi Beats' },
      { name: 'Channel 5 - Deep House', quality: 'MAXIMUM', description: 'Club Mixes' },
      { name: 'Channel 6 - Tropical', quality: 'HIGH', description: 'Tropical House' },
    ];

    for (const channel of channels) {
      await Stream.findOrCreate({
        where: { name: channel.name },
        defaults: {
          description: channel.description,
          quality: channel.quality,
          isLive: false,
          viewers: 0,
        },
      });
    }
    console.log('Created default streams and channels');

    const users = [
      { name: 'DJ Maverick', role: 'RJ', avatar: 'DJ', followers: 12500, email: 'dj@melodymeet.com' },
      { name: 'RTPI', role: 'RJ', avatar: 'RT', followers: 8900, email: 'rtpi@melodymeet.com' },
      { name: 'DJ Snake', role: 'RJ', avatar: 'DS', followers: 15600, email: 'snake@melodymeet.com' },
      { name: 'Kygo', role: 'RJ', avatar: 'KG', followers: 23400, email: 'kygo@melodymeet.com' },
      { name: 'Martin Garrix', role: 'RJ', avatar: 'MG', followers: 18900, email: 'mgarrix@melodymeet.com' },
      { name: 'Sarah Johnson', role: 'Podcast Host', avatar: 'SJ', followers: 5600, email: 'sarah@melodymeet.com' },
      { name: 'Mike Ross', role: 'Podcast Host', avatar: 'MR', followers: 4300, email: 'mike@melodymeet.com' },
      { name: 'Emma Watson', role: 'Podcast Host', avatar: 'EW', followers: 7800, email: 'emma@melodymeet.com' },
      { name: 'Joe Rogan', role: 'Podcast Host', avatar: 'JR', followers: 34500, email: 'joe@melodymeet.com' },
      { name: 'MusicFan123', role: 'Listener', avatar: 'MF', followers: 0, email: 'fan1@melodymeet.com' },
      { name: 'ChillVibes', role: 'Listener', avatar: 'CV', followers: 0, email: 'chill@melodymeet.com' },
      { name: 'BeatLover', role: 'Listener', avatar: 'BL', followers: 0, email: 'beat@melodymeet.com' },
      { name: 'NightOwl', role: 'Listener', avatar: 'NO', followers: 0, email: 'night@melodymeet.com' },
      { name: 'Pranu', role: 'Listener', avatar: 'PR', followers: 0, email: 'pranu@melodymeet.com' },
      { name: 'Navya', role: 'Listener', avatar: 'NV', followers: 0, email: 'navya@melodymeet.com' },
    ];

    let usersCreated = 0;
    for (const user of users) {
      const [, created] = await User.findOrCreate({
        where: { email: user.email },
        defaults: user,
      });
      if (created) usersCreated++;
    }
    console.log(`Seeded ${usersCreated} new users (${users.length - usersCreated} already existed)`);

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
