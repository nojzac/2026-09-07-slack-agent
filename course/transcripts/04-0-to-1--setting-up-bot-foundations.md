# Setting Up Bot Foundations

- class: slack-agents
- chapter: 0 to 1
- title: Setting Up Bot Foundations
- url: https://www.agenticcoding.school/v/T3b_BNyN
- durationSeconds: 254
- fetched: 2026-09-05
- transcriptChars: 4130

## Description (video page text, NOT transcript; may contain links)

The code at the end of this video is in the `Downloads` tab as a zip


**Prompt I Used:**
```
"Can we make a really simple Slack bot here that we will be deploying to the Vercel whereby when I tag it, then it will automatically reply to the message in the thread with a random number."
```

**Links:**
- https://api.slack.com/apps

## Transcript

Okay, now let's go through the process of setting up a really simple Slack bot whereby we can tag the bot and then it will reply with a random number. Ideally, it would be replying as an agent, but we will get onto that in the next video. In this video, it will just be a random number for now. So we can make a folder on our computer for our agents. So I'm going to make it my desktop called joestar-agent. Go inside of this and then launch Claude and we can give it this prompt, but it will be down below as well. Can we make a really simple Slack bot here that we will be deploying to Vercel, whereby when I tag it, then it will automatically reply to the message in a new— in the thread with a random number and pressing enter, it will do just that. Now for each of these videos, as a reminder, the code will be down below for the final version that we just made. So you will be able to download that code as well if you want to skip this step. And now whilst we're waiting for this to be done, we can go over to this website for Slack API. It will be linked down below and press create new app. And where it says from manifest over here, we basically want to select this, choose a workspace, and I will choose joestar-test, press next. And then we need a manifest. So we can go back to Claude and say, give me a manifest for, give me a manifest for the Slack API, press enter. And it will go ahead and do that for us as well. And it will change over time, especially as we add brand new features to our bot. So let's now open this up in VS Code and we can see we have the Slack manifest over here, slack-manifest.json. We can copy this over, go back and then paste into here, press next. And then it says these are the scopes for now. These scopes will be evolving over time, but this is fine for now. And then press create. And now it says, do you want me to set up Git init and set up the Vercel project?. And I will say, yeah, set up Git init and then push it to a private GitHub repo and then set up the Vercel projects for me. Pressing enter, it will go through those stages. Now you can see we have some important things, which are basically the environment variables that we will need to set on Vercel for this to work properly. And they kind of look like this. So we're going to have a signing secret and then also a bot token as well. So going over to Vercel, we can find joestar-agent, which has been deployed. As a Vercel project. And then we can search for environment variables and then add the environment variable over here. So this will be on production and we will get the signing secret from here by pressing show and then copy, paste it into the value component over here and then press save. And now we need the bot token. And the way to do this is we got to go over to install app over here. And then press install to joestar-test. And then it will give us a bot token just like this. So we can copy this over, go back, press add environment variable, call this SLACK_BOT_TOKEN, paste this into here, and then press save. And this should have actually been on production only. Press save. And then we can tell Claude, hey, so I also set the environment variables too. All right, so we have it deployed and it basically says that we have to set up this endpoint over here. So it will give you an endpoint. If it doesn't, then basically ask for one. So of course Claude can guide you through this as well, but you want to go over to the website, go to event subscriptions over here on the left-hand side underneath MCP servers, and then paste in the URL over here that we copied before. And now you can see that it says verified. So then we can press save changes and that will start working now. So if we go back over to Slack, we can basically invite our bot. So that's called Joestar. So invite @joestar into here, into this channel, and then tag Joestar. And then you can see automatically replies with a random number sent to you here. So now we have a working configuration whereby we can tag a bot and then it will reply for us. So this is a good foundation on which we can start building our own version of Claude Tag. The source code for this point will be down below. So you can basically just download that if you want to, if your setup is kind of struggling. And in the next video, we will talk about actually connecting this up with a version of Claude Code running on the cloud.
