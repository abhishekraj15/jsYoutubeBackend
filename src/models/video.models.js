// import mongoose, { Schema } from "mongoose";
// import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

// const videoSchema = new Schema(
//   {
//     videoFile: {
//       type: String, // Cloudinary url
//       required: true,
//     },
//     thumbnail: {
//       type: String, // Cloudinary url
//       required: true,
//     },
//     title: {
//       type: String,
//       required: true,
//     },
//     description: {
//       type: String,
//       required: true,
//     },
//     duration: {
//       type: Number, // Cloudinary url
//       required: true,
//     },
//     views: {
//       type: Number,
//       default: 0,
//     },
//     isPublished: {
//       type: Boolean,
//       default: true,
//     },
//     owner: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// videoSchema.plugin(mongooseAggregatePaginate);

// export const Video = mongoose.model("Video", videoSchema);

import { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: {
        url: String,
        public_id: String,
      },
      required: true,
    },
    thumbnail: {
      type: {
        url: String,
        public_id: String,
      },
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);
export const Video = model("Video", videoSchema);
