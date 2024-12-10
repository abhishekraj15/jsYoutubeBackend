import mongoose, { isValidObjectId } from "mongoose";
// import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  const alreadySubscribed = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (!alreadySubscribed) {
    await Subscription.create({
      subscriber: req.user._id,
      channel: channelId,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(
          20,
          { isSubscribed: true },
          "You have successfully subscribed the channel"
        )
      );
  }

  await Subscription.findByIdAndDelete(alreadySubscribed?._id);
  return res
    .status(200)
    .json(
      new ApiResponse(
        20,
        { isSubscribed: false },
        "You have successfully unsubscribed the channel"
      )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  let { channelId } = req.params;
  console.log(channelId)
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }
  channelId = new mongoose.Types.ObjectId(channelId);
  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: channelId,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subsciberDetails",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribedToChannel",
            },
          },
          {
            $addFields: {
              isSubscribedBack: {
                $cond: {
                  if: {
                    $in: [channelId, "$subscribedToChannel.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
              totalSubscribers: {
                $size: "$subscribedToChannel",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$subsciberDetails",
    },
    {
      $project: {
        _id: 0,
        subsciberDetails: {
          _id: 1,
          username: 1,
          avatar: 1,
          fullName: 1,
          isSubscribedBack: 1,
          totalSubscribers: 1,
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Subscribers list fetched successfully")
    );
});

// // controller to return channel list to which user has subscribed
// const getSubscribedChannels = asyncHandler(async (req, res) => {
//   const { subscriberId } = req.params;
// });

export {
  toggleSubscription,
  getUserChannelSubscribers,
  // getSubscribedChannels
};
