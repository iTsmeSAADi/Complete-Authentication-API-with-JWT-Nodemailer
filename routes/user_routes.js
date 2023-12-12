import express from "express";
import UserController from "../controllers/user_controller.js";
import check_auth from "../middlewares/check_auth.js";

const router = express.Router();

router.post('/create', UserController.create_user);
router.post('/login', UserController.login_user);

router.post('/change_password', check_auth, UserController.change_password);
router.post('/user_info', check_auth, UserController.user_info);

router.post('/send_reset_request', UserController.send_reset_email)

router.post('/reset_password/:id/:token', UserController.reset_password);







export default router;
