require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Friendship = require('./models/Friendship');
const Post = require('./models/Post');
const Like = require('./models/Like');
const Comment = require('./models/Comment');
const Notification = require('./models/Notification');

// Seeds 6 demo users, friendships (accepted + pending), posts, likes,
// comments, and notifications. Skips entirely if any users already exist,
// so it is safe to run repeatedly (e.g. as a Render pre-deploy command).
// Demo password for every account: password123
async function seed() {
  await connectDB();

  const existing = await User.countDocuments();
  if (existing > 0) {
    console.log(`Skipped seed — ${existing} user(s) already exist`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  const usersData = [
    {
      name: 'Maya Chen',
      email: 'maya@example.com',
      bio: 'Weekend hiker, weekday designer. Always planning the next trail.',
      avatarUrl: 'https://i.pravatar.cc/150?img=47',
    },
    {
      name: 'Jordan Ellis',
      email: 'jordan@example.com',
      bio: 'Amateur bread baker. My sourdough starter is named Doughbi-Wan.',
      avatarUrl: 'https://i.pravatar.cc/150?img=12',
    },
    {
      name: 'Priya Nair',
      email: 'priya@example.com',
      bio: 'Book club president, plant mom of 23 (and counting).',
      avatarUrl: 'https://i.pravatar.cc/150?img=32',
    },
    {
      name: 'Sam Whitaker',
      email: 'sam@example.com',
      bio: 'Bike commuter rain or shine. Coffee first, everything else second.',
      avatarUrl: 'https://i.pravatar.cc/150?img=53',
    },
    {
      name: 'Lucia Gomez',
      email: 'lucia@example.com',
      bio: 'Watercolor painter capturing small everyday moments.',
      avatarUrl: 'https://i.pravatar.cc/150?img=44',
    },
    {
      name: 'Theo Marsh',
      email: 'theo@example.com',
      bio: 'Record collector and synth tinkerer. Ask me about krautrock.',
      avatarUrl: 'https://i.pravatar.cc/150?img=59',
    },
  ];

  const users = {};
  for (const u of usersData) {
    const created = await User.create({ ...u, passwordHash });
    users[created.name] = created;
    console.log(`Created user: ${created.name} (${created.email})`);
  }

  const byName = (name) => users[name]._id;

  // Friendships: a web of accepted friendships plus two pending requests.
  const friendships = [
    ['Maya Chen', 'Jordan Ellis', 'accepted'],
    ['Maya Chen', 'Priya Nair', 'accepted'],
    ['Jordan Ellis', 'Sam Whitaker', 'accepted'],
    ['Priya Nair', 'Lucia Gomez', 'accepted'],
    ['Sam Whitaker', 'Theo Marsh', 'accepted'],
    ['Maya Chen', 'Theo Marsh', 'accepted'],
    // Pending requests:
    ['Lucia Gomez', 'Maya Chen', 'pending'], // Lucia requested Maya
    ['Theo Marsh', 'Priya Nair', 'pending'], // Theo requested Priya
  ];
  for (const [a, b, status] of friendships) {
    await Friendship.create({ requester: byName(a), recipient: byName(b), status });
  }
  console.log(`Created ${friendships.length} friendships`);

  // Notifications for the pending friend requests.
  await Notification.create({
    recipient: byName('Maya Chen'),
    type: 'friend_request',
    actor: byName('Lucia Gomez'),
  });
  await Notification.create({
    recipient: byName('Priya Nair'),
    type: 'friend_request',
    actor: byName('Theo Marsh'),
  });

  // Posts (~10), some with images.
  const postsData = [
    {
      author: 'Maya Chen',
      text: 'Sunrise from the top of Bearwallow Mountain this morning. Worth the 5am alarm, every single time.',
      imageUrl: 'https://picsum.photos/seed/porch-hike/600/400',
    },
    {
      author: 'Jordan Ellis',
      text: 'Third attempt at sourdough and FINALLY got the ear! Crumb shot incoming once it cools (if I can wait).',
      imageUrl: 'https://picsum.photos/seed/porch-bread/600/400',
    },
    {
      author: 'Priya Nair',
      text: 'Book club pick for October: a 600-page doorstopper about lighthouse keepers. No regrets.',
    },
    {
      author: 'Sam Whitaker',
      text: 'Biked to work in the rain again. My reward: the office was empty and the coffee was fresh.',
    },
    {
      author: 'Lucia Gomez',
      text: 'New watercolor series: morning light through kitchen windows. This one is my favorite so far.',
      imageUrl: 'https://picsum.photos/seed/porch-paint/600/400',
    },
    {
      author: 'Theo Marsh',
      text: 'Found an original pressing of a 1974 kosmische record at the flea market for $5. Still shaking.',
      imageUrl: 'https://picsum.photos/seed/porch-vinyl/600/400',
    },
    {
      author: 'Maya Chen',
      text: 'Does anyone have a good trail recommendation within an hour of town? Need something dog-friendly!',
    },
    {
      author: 'Priya Nair',
      text: 'Plant #24 just arrived. I have officially run out of windowsills. Send help (or shelves).',
      imageUrl: 'https://picsum.photos/seed/porch-plants/600/400',
    },
    {
      author: 'Jordan Ellis',
      text: 'Doughbi-Wan survived the week in the fridge. The starter lives on!',
    },
    {
      author: 'Sam Whitaker',
      text: 'Golden hour over the greenway. This city is beautiful if you slow down enough to notice.',
      imageUrl: 'https://picsum.photos/seed/porch-sunset/600/400',
    },
  ];

  const posts = [];
  for (const p of postsData) {
    const created = await Post.create({ author: byName(p.author), text: p.text, imageUrl: p.imageUrl || '' });
    posts.push(created);
  }

  // A demo wall post: Jordan wishes Maya a happy birthday on her wall.
  const wallPost = await Post.create({
    author: byName('Jordan Ellis'),
    wallOwner: byName('Maya Chen'),
    text: 'Happy birthday, Maya! Hope the trail treats you to another sunrise like this one.',
    imageUrl: 'https://picsum.photos/seed/porch-birthday/600/400',
  });
  await Notification.create({
    recipient: byName('Maya Chen'),
    type: 'wall_post',
    actor: byName('Jordan Ellis'),
    post: wallPost._id,
  });
  console.log(`Created ${posts.length} posts`);

  // Likes: [postIndex, userName]
  const likesData = [
    [0, 'Jordan Ellis'],
    [0, 'Priya Nair'],
    [0, 'Theo Marsh'],
    [1, 'Maya Chen'],
    [1, 'Sam Whitaker'],
    [4, 'Priya Nair'],
    [4, 'Maya Chen'],
    [5, 'Sam Whitaker'],
    [7, 'Lucia Gomez'],
    [9, 'Maya Chen'],
    [9, 'Jordan Ellis'],
    [9, 'Priya Nair'],
  ];
  for (const [pi, name] of likesData) {
    await Like.create({ post: posts[pi]._id, user: byName(name) });
  }
  console.log(`Created ${likesData.length} likes`);

  // Comments: [postIndex, userName, text]
  const commentsData = [
    [0, 'Theo Marsh', 'That view! Adding Bearwallow to my list.'],
    [1, 'Maya Chen', 'The ear! Teach me your ways.'],
    [1, 'Sam Whitaker', 'Okay now I need toast. Thanks for that.'],
    [4, 'Priya Nair', 'The light in this one is gorgeous.'],
    [5, 'Jordan Ellis', '$5?! The find of the century.'],
    [6, 'Sam Whitaker', 'Try the river trail — flat, shady, and dogs love it.'],
    [9, 'Lucia Gomez', 'I painted almost this exact sky last week!'],
  ];
  for (const [pi, name, text] of commentsData) {
    await Comment.create({ post: posts[pi]._id, user: byName(name), text });
  }
  console.log(`Created ${commentsData.length} comments`);

  // A few like/comment notifications so inboxes aren't empty.
  await Notification.create({
    recipient: byName('Maya Chen'),
    type: 'like',
    actor: byName('Jordan Ellis'),
    post: posts[0]._id,
  });
  await Notification.create({
    recipient: byName('Jordan Ellis'),
    type: 'comment',
    actor: byName('Maya Chen'),
    post: posts[1]._id,
  });
  await Notification.create({
    recipient: byName('Lucia Gomez'),
    type: 'like',
    actor: byName('Priya Nair'),
    post: posts[4]._id,
  });
  console.log('Created notifications');

  console.log('Seed complete. Demo password for all accounts: password123');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
