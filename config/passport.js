const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

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

                return done(null, user);
            } catch (error) {
                console.error(error);
                return done(error, false);
            }
        }
    )
);

module.exports = passport;
