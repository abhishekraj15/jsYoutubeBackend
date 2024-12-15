import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  //TODO: create playlist
  if ([name, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All Fields are required");
  }

  const existingPlaylist = await Playlist.findOne({
    name: new RegExp(`^${name}$`, "i"),
  });
  if (existingPlaylist) {
    throw new ApiError(409, "Playlist already exists with this name");
  }

  const playlist = await Playlist.create({
    name: name,
    description: description,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

// const getUserPlaylists = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   //TODO: get user playlists
// });

// const getPlaylistById = asyncHandler(async (req, res) => {
//   const { playlistId } = req.params;
//   //TODO: get playlist by id
// });

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlist or video ID");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }
  if (playlist.owner?.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "You are not authorized to access this playlist");
  }

  if (video.owner?.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "You are not authorized to access this video");
  }

  const newPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        videos: videoId,
      },
    },
    { new: true }
  );
  if (!newPlaylist) {
    throw new ApiError(400, "Video cannot be added , Please try again later");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newPlaylist, "Video successfully added"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlist or video ID");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }
  if (playlist.owner?.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "You are not authorized to access this playlist");
  }

  if (video.owner?.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "You are not authorized to access this video");
  }

  const newPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        videos: videoId,
      },
    },
    { new: true }
  );
  if (!newPlaylist) {
    throw new ApiError(400, "Video cannot be removed , Please try again later");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newPlaylist, "Video successfully removed"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You are not authorised to access this playlist");
  }

  await Playlist.findByIdAndDelete(playlist?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

// const updatePlaylist = asyncHandler(async (req, res) => {
//   const { playlistId } = req.params;
//   const { name, description } = req.body;
//   //TODO: update playlist
// });

export {
  createPlaylist,
  //   getUserPlaylists,
  //   getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  //   updatePlaylist,
};
