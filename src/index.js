require("dotenv").config();
const express = require("express");
const axios = require("axios");
const url = require("url");
const port = process.env.PORT || 1500;
const app = express();

app.get("/", async (req, res) => {
  const buttonHtml = `<a href="https://discord.com/api/oauth2/authorize?client_id=1179385907346944010&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3002%2Fauth%2Fdiscord%2Fredirect&scope=guilds+identify+guilds.join" target="_blank"><button>Authorize Discord</button></a>`;
  res.send(`Hey! Authorize to get added to my discord server ${buttonHtml}`);
});

app.get("/success", async (req, res) => {
  res.send("success!");
});

app.get("/auth/discord/redirect", async (req, res) => {
  const { code } = req.query;

  if (code) {
    const formData = new url.URLSearchParams({
      client_id: process.env.ClientId,
      client_secret: process.env.ClientSecret,
      grant_type: "authorization_code",
      code: code.toString(),
      redirect_uri: "http://localhost:3002/auth/discord/redirect",
    });

    const output = await axios.post(
      "https://discord.com/api/v10/oauth2/token",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (output.data) {
      const access = output.data.access_token;

      const userinfo = await axios.get(
        "https://discord.com/api/v10/users/@me",
        {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        }
      );

      if (access) {
        const stringToken = access.toString();
        const data = { access_token: stringToken };

        // Check if user is already in the guild
        try {
          await axios.get(
            `https://discord.com/api/v10/guilds/${process.env.GuildId}/members/${userinfo.data.id}`,
            {
              headers: {
                Authorization: `Bot ${process.env.botToken}`,
              },
            }
          );

          // If the above request doesn't throw an error, the user is already in the guild
          console.log("User is already in the guild");
          res.redirect("/success");
        } catch (error) {
          if (error.response.status === 404) {
            // If the user is not in the guild, add them
            await axios.put(
              `https://discord.com/api/v10/guilds/${process.env.GuildId}/members/${userinfo.data.id}`,
              data,
              {
                headers: {
                  Authorization: `Bot ${process.env.botToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log("User has been added to the guild");
            res.redirect("/success");
          } else {
            console.error("Error checking if user is in the guild", error);
          }
        }
      }
    }
  }
});

app.listen(port, () => {
  console.log(`running on ${port}`);
});
