import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// router.route("/:videoId").get(getVideoComments).post(addComment);
// router.route("/c/:commentId").delete(deleteComment).patch(updateComment);
router.route("/c/addComment/:videoId").post(addComment);
router.route("/c/updateComment/:commentId").patch(verifyJWT, updateComment);
router.route("/c/deleteComment/:commentId").delete(verifyJWT, deleteComment);
router.route("/c/getVideoComments/:videoId").get(verifyJWT, getVideoComments);

export default router;
