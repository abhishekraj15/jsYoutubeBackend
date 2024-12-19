import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
// import { Subscription } from "../models/subscription.model.js";
// import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "owner",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $project: {
        totalLikes: { $size: "$likes" },
        views: 1,
        totalSubscribers: { $size: "$subscribers" },
      },
    },

    // {
    //   $group: {
    //     _id: null,
    //     totalSubscribers: { $sum: { $size: "$subscribers" } },
    //     totalLikes: { $sum: { $size: "$likes" } },
    //     totalViews: { $sum: "$views" },
    //     totalVideos: { $sum: 1 },
    //   },
    // },
  ]);

  // const channelStats = {
  //   totalSubscribers: videos[0]?.totalSubscribers || 0,
  //   totalLikes: videos[0]?.totalLikes || 0,
  //   totalViews: videos[0]?.totalViews || 0,
  //   totalVideos: videos[0]?.totalVideos || 0,
  // };

  // Initialize totals
  let totalSubscribers = 0;
  let totalLikes = 0;
  let totalViews = 0;
  let totalVideos = videos.length;

  // Iterate through videos to calculate totals
  videos.forEach((video) => {
    totalSubscribers += video.totalSubscribers || 0;
    totalLikes += video.totalLikes || 0;
    totalViews += video.views || 0;
  });

  const channelStats = {
    totalSubscribers,
    totalLikes,
    totalViews,
    totalVideos,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "channel stats fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  // TODO: Get all the videos uploaded by the channel
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        createdAt: {
          $dateToParts: { date: "$createdAt" },
        },
        totalLikes: {
          $size: "$likes",
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
        "videoFile.url": 1,
        "thumbnail.url": 1,
        title: 1,
        description: 1,
        createdAt: {
          year: 1,
          month: 1,
          day: 1,
        },
        isPublished: 1,
        totalLikes: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "channel stats fetched successfully"));
});

export { getChannelStats, getChannelVideos };
