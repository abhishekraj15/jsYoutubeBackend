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

// const getLikedVideos = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10 } = req.query;
//   const likedVideosAggegate = await Like.aggregate([
//     {
//       $match: {
//         likedBy: new mongoose.Types.ObjectId(req.user?._id),
//       },
//     },
//     {
//       $lookup: {
//         from: "videos",
//         localField: "video",
//         foreignField: "_id",
//         as: "likedVideo",
//         pipeline: [
//           {
//             $lookup: {
//               from: "users",
//               localField: "owner",
//               foreignField: "_id",
//               as: "ownerDetails",
//             },
//           },
//           {
//             $unwind: "$ownerDetails",
//           },
//         ],
//       },
//     },
//     {
//       $unwind: "$likedVideo",
//     },
//     {
//       $sort: {
//         createdAt: -1,
//       },
//     },
//     {
//       $project: {
//         _id: 0,
//         likedVideo: 1,
//       },
//     },
//   ]);

//   const options = {
//     page: parseInt(page, 10),
//     limit: parseInt(limit, 10),
//   };

//   const likedVideos = await Like.aggregatePaginate(
//     likedVideosAggegate,
//     options
//   );
//   return res
//     .status(200)
//     .json(
//       new ApiResponse(200, likedVideos, "liked videos fetched successfully")
//     );
// });

const getLikedVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const pipeline = [
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
      },
    },
    {
      $unwind: "$likedVideo",
    },
    {
      $lookup: {
        from: "users",
        localField: "likedVideo.owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideo: {
          _id: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: "$ownerDetails.username",
            avatar: "$ownerDetails.avatar",
            fullName: "$ownerDetails.fullName",
          },
        },
      },
    },
  ];

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const likedVideosAggegate = Like.aggregate(pipeline);
  const likedVideos = await Like.aggregatePaginate(
    likedVideosAggegate,
    options
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "liked videos fetched successfully")
    );
});

export {
  toggleCommentLike,
  // toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
};
