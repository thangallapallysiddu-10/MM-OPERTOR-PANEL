const { Stream } = require('../models/stream.model');
const Podcast = require('../models/podcast.model');
const User = require('../models/user.model');
const { notFound } = require('../utils/errors');
const activityService = require('./activity.service');

const getDashboardStats = async () => {
  const totalStreams = await Stream.count();
  const liveStreams = await Stream.count({ where: { isLive: true } });
  const totalViewers = await Stream.sum('viewers') || 0;
  const totalPodcasts = await Podcast.count();
  const publishedPodcasts = await Podcast.count({ where: { status: 'Published' } });
  const totalUsers = await User.count();
  const totalRJs = await User.count({ where: { role: 'RJ' } });
  const totalHosts = await User.count({ where: { role: 'Podcast Host' } });
  const bannedUsers = await User.count({ where: { isBanned: true } });
  const activity = await activityService.getActivitySummary();
  const recentPodcasts = await Podcast.findAll({
    order: [['createdAt', 'DESC']],
    limit: 5,
  });

  return {
    streams: { total: totalStreams, live: liveStreams, totalViewers },
    podcasts: { total: totalPodcasts, published: publishedPodcasts, recent: recentPodcasts },
    users: { total: totalUsers, rjs: totalRJs, hosts: totalHosts, banned: bannedUsers },
    activity,
  };
};

const getStreamAnalytics = async (streamId) => {
  const stream = await Stream.findByPk(streamId);
  if (!stream) throw notFound('Stream not found');

  return {
    id: stream.id,
    name: stream.name,
    isLive: stream.isLive,
    viewers: stream.viewers || 0,
    bitrate: stream.bitrate || 128,
    quality: stream.quality,
    uptime: stream.isLive ? Date.now() : null,
    health: stream.isLive ? 'stable' : 'offline',
  };
};

module.exports = { getDashboardStats, getStreamAnalytics };
