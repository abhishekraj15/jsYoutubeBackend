import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const likedAlready = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const likedAlready = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }
  await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });
  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

// const toggleTweetLike = asyncHandler(async (req, res) => {
//   const { tweetId } = req.params;
//   //TODO: toggle like on tweet
// });

const getLikedVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const matchCondition = {
    likedBy: new mongoose.Types.ObjectId(req?.user?._id),
  };

  const likedVideo = await Like.aggregate([
    {
      $match: matchCondition,
    },

    //video details
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $project: {
              title: 1,
              description: 1,
              views: 1,
              duration: 1,
              "thumbnail.url": 1,
              "videoFile.url": 1,
              createdAt: 1,
              ownerDetails: {
                username: 1,
                avatar: 1,
              },
            },
          },
        ],
      },
    },
    { $unwind: "$videoDetails" },
    { $skip: skip },
    { $limit: parseInt(limit, 10) },
    {
      $project: {
        videoDetails: 1,
        createdAt: 1,
      },
    },
  ]);
  // Count total videos for pagination
  const totalVideos = await Like.countDocuments(matchCondition);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        likedVideo,
        totalVideos,
        totalPages: Math.ceil(totalVideos / limit),
        currentPage: parseInt(page, 10),
      },
      "Videos fetched successfully"
    )
  );
});

export {
  toggleCommentLike,
  // toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
};
