require("dotenv").config();

const passport = require("passport");
const GoogleStrategery = require("passport-google-oauth20").Strategy;
const User = require("./models/User");

passport.use(new GoogleStrategery({
  clientID: process.env.clientID,
  clientSecret: process.env.clientSecret,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/users/google/callback",
  passReqToCallback: true
},

// this runs after Google authentication of the user
async function(request, accessToken, refreshToken, profile, done) {
  try {
    const googleEmail = profile.emails?.[0]?.value;
    if (!googleEmail || profile._json?.email_verified === false) return done(null, false);

    const email = googleEmail.trim().toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
    if (user?.googleId && user.googleId !== profile.id) return done(null, false);

    const nameParts = (profile.displayName || "Google User").trim().split(/\s+/);
    const firstName = profile.name?.givenName || nameParts[0] || "Google";
    const lastName = profile.name?.familyName || nameParts.slice(1).join(" ") || "User";
    if (!user) user = new User({ email, firstName, lastName, isAdmin: false });
    if (!user.isActive) return done(null, false);

    user.firstName = firstName;
    user.lastName = lastName;
    user.googleId = profile.id;
    user.picture = profile.photos?.[0]?.value || user.picture || "";
    await user.save();
    return done(null, user);
  } catch (error) {
    if (error.code === 11000 && profile.emails?.[0]?.value) {
      const existingUser = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
      if (existingUser?.isActive && (!existingUser.googleId || existingUser.googleId === profile.id)) {
        existingUser.googleId = profile.id;
        existingUser.picture = profile.photos?.[0]?.value || existingUser.picture || "";
        return done(null, await existingUser.save());
      }
    }
    return done(error);
  }
}
))

// Saves the user info into session
passport.serializeUser(function(user, done) {
  done(null, user._id.toString());
})

// Get user info from the session
passport.deserializeUser(async function(userId, done) {
  try {
    const user = await User.findById(userId).select("-password");
    done(null, user || false);
  } catch (error) {
    done(error);
  }
}) 

// npm install passport passport-google-oauth20 express-session