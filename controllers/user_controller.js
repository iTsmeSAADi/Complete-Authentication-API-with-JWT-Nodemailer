import user_model from '../models/user_model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import transporter from '../config/mail_transporter.js';

const TOKEN_EXPIRATION = '2d'; // Token expiration time

class UserController {
  static create_user = async (req, res) => {
    const { name, email, password, confirm_password, tc } = req.body;

    const BAD_REQUEST = 400;
    const INTERNAL_SERVER_ERROR = 500;

    try {
      if (name && email && password && confirm_password && tc) {
        const user = await user_model.findOne({ email: email.toLowerCase() });
        if (user) {
          res.status(BAD_REQUEST).json({
            STATUS: "ERROR",
            MESSAGE: "USER ALREADY EXISTS",
          });
        } else {
          if (password === confirm_password) {
            const salt = await bcrypt.genSalt(10);
            const hashed_password = await bcrypt.hash(password, salt);
            const doc = user_model({
              name: name,
              email: email.toLowerCase(),
              password: hashed_password,
              tc: tc,
            });

            await doc.save();

            const token = jwt.sign(
              { user_id: doc._id },
              process.env.JWT_SECRET_KEY,
              { expiresIn: TOKEN_EXPIRATION }
            );

            res.status(201).json({
              STATUS: "SUCCESS",
              MESSAGE: "USER CREATED SUCCESSFULLY",
              TOKEN: token,
            });
          } else {
            res.status(BAD_REQUEST).json({
              STATUS: "ERROR",
              MESSAGE: "PASSWORD & CONFIRMATION PASSWORD MUST MATCH",
            });
          }
        }
      } else {
        res.status(BAD_REQUEST).json({
          STATUS: "ERROR",
          MESSAGE: "ALL FIELDS ARE REQUIRED",
        });
      }
    } catch (error) {
      if (error.message === "User already exists") {
        res.status(BAD_REQUEST).json({
          STATUS: "ERROR",
          MESSAGE: "USER ALREADY EXISTS",
        });
      } else {
        console.error("Error creating user:", error);
        res.status(INTERNAL_SERVER_ERROR).json({
          STATUS: "ERROR",
          MESSAGE: "USER NOT CREATED",
          ERROR_DESCRIPTION: error.message,
        });
      }
    }
  };

  static login_user = async (req, res) => {
    const { email, password } = req.body;

    const BAD_REQUEST = 400;
    const UNAUTHORIZED = 401;

    try {
      if (email && password) {
        const user = await user_model.findOne({ email: email.toLowerCase() });

        if (user) {
          const is_password = await bcrypt.compare(password, user.password);

          if (user.email === email.toLowerCase() && is_password) {
            // Log in successful, generate and send a token
            const token = jwt.sign(
              { user_id: user._id },
              process.env.JWT_SECRET_KEY,
              { expiresIn: TOKEN_EXPIRATION }
            );

            res.status(200).json({
              STATUS: "SUCCESS",
              MESSAGE: "LOGIN SUCCESSFUL",
              TOKEN: token,
            });
          } else {
            res.status(UNAUTHORIZED).json({
              STATUS: "ERROR",
              MESSAGE: "INVALID CREDENTIALS",
            });
          }
        } else {
          res.status(UNAUTHORIZED).json({
            STATUS: "ERROR",
            MESSAGE: "INVALID CREDENTIALS",
          });
        }
      } else {
        res.status(BAD_REQUEST).json({
          STATUS: "ERROR",
          MESSAGE: "EMAIL AND PASSWORD ARE REQUIRED",
        });
      }
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(INTERNAL_SERVER_ERROR).json({
        STATUS: "ERROR",
        MESSAGE: "LOGIN FAILED",
        ERROR_DESCRIPTION: error.message,
      });
    }
  };

  static change_password = async (req, res) => {
    const { old_password, new_password, confirm_new_password } = req.body;

    try {
      if (old_password && new_password && confirm_new_password) {
        const req_user = req.user;
        const user = await user_model.findById(req_user._id);

        if (!user) {
          return res.status(404).json({
            STATUS: "ERROR",
            MESSAGE: "USER NOT FOUND",
          });
        }

        const is_password_valid = await bcrypt.compare(old_password, user.password);

        if (is_password_valid) {
          if (new_password === confirm_new_password) {
            // Hash the new password
            const salt = await bcrypt.genSalt(10);
            const hashed_new_password = await bcrypt.hash(new_password, salt);

            // Update the user's password using findByIdAndUpdate
            await user_model.findByIdAndUpdate(req_user._id, { password: hashed_new_password });

            res.status(200).json({
              STATUS: "SUCCESS",
              MESSAGE: "PASSWORD CHANGED SUCCESSFULLY",
            });
          } else {
            res.status(400).json({
              STATUS: "ERROR",
              MESSAGE: "NEW PASSWORD AND CONFIRMATION PASSWORD MUST MATCH",
            });
          }
        } else {
          res.status(401).json({
            STATUS: "ERROR",
            MESSAGE: "INVALID OLD PASSWORD",
          });
        }
      } else {
        res.status(400).json({
          STATUS: "ERROR",
          MESSAGE: "LOGIN FAILED",
          ERROR_DESCRIPTION: "ALL FIELDS ARE REQUIRED",
        });
      }
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({
        STATUS: "ERROR",
        MESSAGE: "FAILED TO CHANGE PASSWORD",
        ERROR_DESCRIPTION: error.message,
      });
    }
  };

  static user_info = async (req, res) => {
    const user = req.user;
    const token = req.token;

    try {
      // Assuming 'tc' is the field you want to exclude
      const { tc, ...userWithoutTc } = user.toObject();

      res.status(200).json({
        STATUS: "SUCCESS",
        MESSAGE: "USER INFORMATION RETRIEVED SUCCESSFULLY",
        USER: userWithoutTc,
        TOKEN: token,
      });
    } catch (error) {
      console.error("Error retrieving user information:", error);
      res.status(500).json({
        STATUS: "ERROR",
        MESSAGE: "FAILED TO RETRIEVE USER INFORMATION",
        ERROR_DESCRIPTION: error.message,
      });
    }
  };

  static send_reset_email = async (req, res) => {
    const { email } = req.body;

    try {
      if (email) {
        const user = await user_model.findOne({ email: email });

        if (user) {
          const secret = user._id + process.env.JWT_SECRET_KEY;
          const token = jwt.sign({ user_id: user._id }, secret, { expiresIn: '15m' });

          // Construct the reset link
          const resetLink = `http://127.0.0.1:3000/api/user/reset/${user._id}/${token}`;
          console.log('Reset Link:', resetLink);

          // send mail

          let info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'PASSWORD RESET LINK',
            html: `<a href=${resetLink}>Click here</a> to reset your password`
          });

          // Send the reset link via email or any other appropriate method

          res.status(200).json({
            STATUS: 'SUCCESS',
            MESSAGE: 'RESET LINK SENT SUCCESSFULLY',
          });
        } else {
          res.status(404).json({
            STATUS: 'ERROR',
            MESSAGE: 'USER NOT FOUND',
          });
        }
      } else {
        res.status(400).json({
          STATUS: 'ERROR',
          MESSAGE: 'EMAIL IS REQUIRED',
        });
      }
    } catch (error) {
      console.error('Error sending reset email:', error);
      res.status(500).json({
        STATUS: 'ERROR',
        MESSAGE: 'FAILED TO SEND RESET EMAIL',
        ERROR_DESCRIPTION: error.message,
      });
    }
  };

  static reset_password = async (req, res) => {
    const { password, confirm_password } = req.body;
    const { id, token } = req.params;
    const user = await user_model.findById(id);
    const new_secret = user._id + process.env.JWT_SECRET_KEY;

    try {
      jwt.verify(token, new_secret);
      if (password && confirm_password) {
        if (password === confirm_password) {
          // Passwords match, handle accordingly
        } else {
          const salt = await bcrypt.genSalt(10);
          const hashed_password = await bcrypt.hash(password, salt);
          await user_model.findByIdAndUpdate(user._id, { $set: { password: hashed_password } });
          // Reset response
          res.status(200).json({
            STATUS: 'SUCCESS',
            MESSAGE: 'PASSWORD RESET SUCCESSFUL',
          });
        }
      } else {
        // Handle case where passwords are missing
        res.status(400).json({
          STATUS: 'ERROR',
          MESSAGE: 'PASSWORD AND CONFIRMATION PASSWORD ARE REQUIRED',
        });
      }
    } catch (error) {
      // Handle token verification failure
      console.error('Error resetting password:', error);
      res.status(401).json({
        STATUS: 'ERROR',
        MESSAGE: 'FAILED TO RESET PASSWORD',
        ERROR_DESCRIPTION: error.message,
      });
    }
  };
}

export default UserController;
