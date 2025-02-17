// import mongoose, { isValidObjectId } from "mongoose";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";

// TODO: get video, upload to cloudinary, create video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All Fields are required");
  }

  const videoFilepath = req.files?.videoFile?.[0];
  if (!videoFilepath) {
    throw new ApiError(400, "Video File file is required");
  }
  const videoFileLocalPath = videoFilepath.path;

  const thumbnailFilePath = req.files?.thumbnail?.[0];
  if (!thumbnailFilePath) {
    throw new ApiError(400, "Thumbnail File file is required");
  }
  const thumbnailLocalPath = thumbnailFilePath.path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "VideoFileLocalPath is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "ThumbnailLocalPath is required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Video file is not found.");
  }
  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail file is not found");
  }

  // const video = await Video.create({
  //   title,
  //   description,
  //   duration: videoFile.duration,
  //   videoFile: videoFile.url,
  //   thumbnail: thumbnail.url,
  //   owner: req.user?._id,
  //   isPublished: false,
  // });

  const video = await Video.create({
    title,
    description,
    duration: videoFile.duration,
    videoFile: {
      url: videoFile.url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    },
    owner: req.user?._id,
    isPublished: false,
  });

  const videoUploaded = await Video.findById(video._id);

  if (!videoUploaded) {
    throw new ApiError(500, "Video upload failed please try again !!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Uploaded Successfully"));
});

const getAllVideos = asyncHandler(async (req, res) => {
  //TODO: get all videos based on query, sort, pagination - abhis
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const skip = (page - 1) * limit; // How many documents to skip for pagination
  const sortOrder = sortType.toLowerCase() === "asc" ? 1 : -1; // Convert sortType to 1 (asc) or -1 (desc)

  const matchCondition = {
    isPublished: true, // Only fetch published videos
    ...(query && { title: { $regex: query, $options: "i" } }), // Search title if query is provided
    ...(userId && { owner: new mongoose.Types.ObjectId(userId) }), // Filter by userId if provided
  };

  const video = await Video.aggregate([
    {
      $match: matchCondition,
    },
    // fetch likes with user details
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "userDetails",
            },
          },
          {
            $project: {
              likedBy: 1,
              userDetails: {
                username: 1,
                avatar: 1,
              },
            },
          },
        ],
      },
    },
    // fetch comments with likes with commenter details
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "commenter",
            },
          },
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "comment",
              as: "commentsLikes",
            },
          },
          {
            $project: {
              content: 1,
              createdAt: 1,
              commenter: {
                username: 1,
                avatar: 1,
              },
              commentsLikes: {
                $size: "$commentsLikes",
              },
            },
          },
        ],
      },
    },
    // fetch owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },

              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    // Add derived fileds
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        owner: { $first: "$owner" },
        commentCount: { $size: "$comments" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    // Sort and paginate
    { $sort: { [sortBy]: sortOrder } },
    { $skip: skip },
    { $limit: parseInt(limit, 10) },
    // final project alll data
    {
      $project: {
        "videoFile.url": 1,
        "thumbnail.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        commentCount: 1,
        owner: 1,
        likes: 1,
        likesCount: 1,
        isLiked: 1,
        isPublished: 1,
      },
    },
  ]);

  console.log(video);
  // Count total videos for pagination
  const totalVideos = await Video.countDocuments(matchCondition);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        video,
        totalVideos,
        totalPages: Math.ceil(totalVideos / limit),
        currentPage: parseInt(page, 10),
      },
      "Videos fetched successfully"
    )
  );
});

// const getAllVideos = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
//   //TODO: get all videos based on query, sort, pagination -- vanshi
//   const pipeline = [];
//   // Search video by title -> using regex for matching input query
//   if (query) {
//     pipeline.push({
//       $match: {
//         title: {
//            $regex: query,
//           $options: "i",
//         },
//       },
//     });
//   }
//   // Search by userId
//   if (userId) {
//     if (!isValidObjectId(userId)) {
//       throw new ApiError(400, "Enter a valid user id");
//     }
//     pipeline.push({
//       $match: {
//         owner: new mongoose.Types.ObjectId(userId),
//       },
//     });
//   }
//   // Videos searched should be published
//   pipeline.push({
//     $match: {
//       isPublished: true,
//     },
//   });
//   //Searching
//   if (sortBy && sortType) {
//     pipeline.push({
//       $sort: {
//         [sortBy]: sortType === "asc" ? 1 : -1, // 1 -> ascending and -1 -> descending order
//       },
//     });
//   } else {
//     pipeline.push({
//       $sort: { createdAt: -1 }, // If no sortBy and sort Type is given then videos should be sorted in descending order on the basis of createdAt field
//     });
//   }
//   // Add user details for the video owner
//   pipeline.push(
//     {
//       $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "ownerDetails",
//         pipeline: [
//           {
//             $project: {
//               username: 1,
//               avatar: 1,
//             },
//           },
//         ],
//       },
//     },
//     {
//       $unwind: "$ownerDetails",
//     }
//   );
//   // Create an aggregation instance
//   const videoAggregate = Video.aggregate(pipeline);
//   // Add pagination options
//   const options = {
//     page: parseInt(page, 10),
//     limit: parseInt(limit, 10),
//   };
//   // Paginate results
//   const videos = await Video.aggregatePaginate(videoAggregate, options);
//   return res
//     .status(200)
//     .json(new ApiResponse(200, videos, "Videos fetched successfully"));
// });

//TODO: get video by id
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid User ID");
  }

  const video = await Video.aggregate([
    // Match video by ID
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    // Fetch likes with user details
    {
      $lookup: {
        from: "likes",
        localField: "_id", //current model->video
        foreignField: "video",
        as: "likes",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "likedBy", //current model->likes
              foreignField: "_id",
              as: "userDetails",
            },
          },
          {
            $project: {
              likedBy: 1,
              userDetails: { username: 1, avatar: 1 },
            },
          },
        ],
      },
    },
    // Fetch comments with commenter details
    {
      $lookup: {
        from: "comments",
        localField: "_id", //current model->video
        foreignField: "video",
        as: "comments",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner", //current model->comment
              foreignField: "_id",
              as: "commenter",
            },
          },
          {
            $lookup: {
              from: "likes",
              localField: "_id", //current model->video
              foreignField: "comment",
              as: "commentsLikes",
            },
          },
          {
            $project: {
              content: 1,
              createdAt: 1,
              commenter: { username: 1, avatar: 1 },
              commentsLikes: {
                $size: "$commentsLikes",
              },
            },
          },
        ],
      },
    },
    // Fetch owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: { $size: "$subscribers" },
              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    // Add derived fields
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        owner: { $first: "$owner" },
        commentCount: { $size: "$comments" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    // Project final fields
    {
      $project: {
        "videoFile.url": 1,
        "thumbnail.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        commentCount: 1,
        owner: 1,
        likesCount: 1,
        likes: 1,
        isLiked: 1,
        isPublished: 1,
      },
    },
  ]);

  if (!video || video.length === 0) {
    throw new ApiError(404, "Video not found");
  }

  // Increment video views
  await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

  // Add video to user's watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: { watchHistory: videoId },
  });

  // Respond with video details
  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video details fetched successfully"));
});

//TODO: update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Id not found in params");
  }

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoData = await Video.findById(videoId);
  if (!videoData) {
    throw new ApiError(400, "Video not found.!!");
  }

  if (videoData?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't edit this video as you are not the owner"
    );
  }

  const thumbnailToDelete = videoData.thumbnail.public_id;

  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail is required");
  }
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(400, "thumbnail not found");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          public_id: thumbnail.public_id,
          url: thumbnail.url,
        },
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Failed to update video please try again");
  }

  if (updatedVideo) {
    await deleteOnCloudinary(thumbnailToDelete);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

//TODO: delete video
// const deleteVideo = asyncHandler(async (req, res) => {
//   //   const variable= req.params.id
//   // Is case m variable ka name kuch bhi likh skte h bs req.params k baad name same hona chahiye I'd ka jo route m ho
//   // const {id} = req.params

//   const { id } = req.params;
//   console.log("🚀 ~ deleteVideo ~ videoId:", id);

//   if (!id) {
//     throw new ApiError(400, "Video id not found in params.!!");
//   }

//   const video = await Video.findByIdAndDelete(id);
//   if (!video) {
//     throw new ApiError(400, "Video not found.");
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, "Video has been deleted.!!"));
// });

const deleteVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Video id not found in params.!!");
  }

  const video = await Video.findById(id);
  if (!video) {
    throw new ApiError(400, "Video not found.");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't delete this video as you are not the owner"
    );
  }

  const videoDeleted = await Video.findByIdAndDelete(video?._id);

  if (!videoDeleted) {
    throw new ApiError(400, "Failed to delete the video please try again");
  }

  await deleteOnCloudinary(video.thumbnail.public_id); // video model has thumbnail public_id stored in it->check videoModel
  await deleteOnCloudinary(video.videoFile.public_id, "video"); // specify video while deleting video

  // delete video likes
  // await Like.deleteMany({
  //   video: id,
  // });

  // delete video comments
  // await Comment.deleteMany({
  //   video: id,
  // });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video has been deleted.!!"));
});

// TogglePublishStatus
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found.");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't toogle publish status as you are not the owner"
    );
  }

  const toggleVideoPublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video?.isPublished,
      },
    },
    {
      new: true,
    }
  );

  if (!toggleVideoPublish) {
    throw new ApiError(400, "Failed to toggle video publish status.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: toggleVideoPublish.isPublished },
        "Video Published successfully."
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
