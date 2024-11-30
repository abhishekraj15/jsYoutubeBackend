import mongoose from "mongoose";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";

// const getVideoComments = asyncHandler(async (req, res) => {
//   //TODO: get all comments for a video
//   const { videoId } = req.params;
//   const { page = 1, limit = 10 } = req.query;
// });

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  console.log("🚀 ~ addComment ~ videoId:", videoId);
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new ApiError(500, "Failed to add comment please try again");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

// const updateComment = asyncHandler(async (req, res) => {
//   // TODO: update a comment
// });

// const deleteComment = asyncHandler(async (req, res) => {
//   // TODO: delete a comment
// });

export {
  // getVideoComments,
  addComment,
  //  updateComment,
  //   deleteComment
};
