const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const sendEmail = require('../utils/email');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://fly-be.onrender.com/api/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists
                let user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    // Update user if they don't have a googleId
                    if (!user.googleId) {
                        user.googleId = profile.id;
                        user.googleAuth = true;
                        await user.save();
                    }
                    return done(null, user);
                }

                // If not, create a new user
                user = await User.create({
                    fullName: profile.displayName,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                    googleAuth: true,
                });

                // Send welcome email
                try {
                    await sendEmail({
                        to: user.email,
                        subject: 'Welcome to FlyAUX!',
                        html: `
                            <h2>Welcome to FlyAUX, ${user.fullName}!</h2>
                            <p>We are excited to have you on board.</p>
                            <p>With FlyAUX, your next adventure is just a few clicks away.</p>
                            <br/>
                            <p>Safe travels,</p>
                            <p>The FlyAUX Team</p>
                        `
                    });
                } catch (err) {
                    console.error('Email could not be sent:', err);
                }

                return done(null, user);
            } catch (error) {
                console.error(error);
                return done(error, false);
            }
        }
    )
);

module.exports = passport;
