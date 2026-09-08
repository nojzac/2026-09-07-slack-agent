# MCP Servers

- class: slack-agents
- chapter: 0 to 1
- title: MCP Servers
- url: https://www.agenticcoding.school/v/3m4_w6dX
- durationSeconds: 251
- fetched: 2026-09-05
- transcriptChars: 4106

## Description (video page text, NOT transcript; may contain links)

(none)

## Transcript

Okay, so in the last video we started dogfooding our own Slack

agent. Now I want to go over setting up MCP servers with it.

Now of course you can set up a system whereby you only have certain MCP

servers available to different channels, but I'm going to set up a much simpler

system whereby every MCP server that we add will be available

on every channel. You may also want to make it such that depending on who's

talking to agent, different MCP servers with different credentials are available.,

but I will make it much simpler here. Now essentially the MCP server that I

will be adding here is the exa-mcp. And the way it works is

that Claude will have to add this itself to a

mcp.json kind of file. And of course there will be an Exa API

key, which we will set inside of Vercel.

But for now we can simply copy the link to page and then tag our

agent. So joestar, paste the link and say, using the

claude-code guide subagent, can you basically figure out how to add

the exa-mcp for yourself? Of course, I will set the environment variable

on Vercel as well, but basically make the change and then open up a brand

new PR for this. Ask me any clarifying questions if needs be before getting started.

And then pressing send now, that will get started off with that job.

So you can see that in the last video, I added

a thing over here so that when it starts doing tool calling,, then it will

show the tools that it is calling as well as how many seconds it's been

running for, updated every 5 seconds. So we're going to have this

continue. But essentially this is what you will do going forwards for any MCP server.

So for example, I have Bento, which I use for email marketing.

They have a MCP server as well. And if I search for it,

then you can see it looks kind of like this. So if I scroll down,

go to Claude Code over here, This is what it kind of looks like.

They have an installable one and then also a hosted

one as well. And it requires you to set the following environment

variables. So publishable key, a secret, a site_id.

Essentially, you should find the documentation for any MCP servers that you will be

setting up and then just give it to Agent. Okay, so it seems that joestar

opened up a brand new PR, so we can now click on it and see

what it looks like. And these are the changes that it made. So it basically

added the setup command over here. So it will automatically set up Claude

with the XA API key. So let's actually test to see if it works.

So I'm gonna merge this in and then I'm gonna create a API

key. So I'm gonna call this joestar, create, copy this over,

paste it into the Vercel environment variables.

And now if I press redeploy,

it should now work. But one of the issues we now have is this will

only work on a brand new sandbox. Because a brand new sandbox will be

created with that MCP server enabled. So we can't just like add

a brand new message here and say, resume, can you check you have the MCP

server? Cause this is an old sandbox. So we will have to do a brand

new chat for this. So I will do @joestar and say, can you

check that you have the MCP server available for exa and

then do like a test search with it. And now we can basically wait until

it replies. But I went through the process of setting up all the MCP servers

so it can connect to databases that I have for production applications.

So it says the MCP server's connected, but a test search failed

with invalid API key. So maybe I didn't copy it over properly. So I now

redid it and it said it's now working properly and it manages to fetch data

properly. So it says I searched for anthropic.com latest model announcement

and then I got the results and gave it back. And I can say,

what did the results actually say? And then it will continue the chat and

say what the results said. Now this means that you can set

up MCP servers for like Stripe, PlanetScale,

PostHog, or basically any other service you use. And you

may want to go through an additional process whereby you restrict which MCP server is

available to which user or which channels. And if you

want to, you could take this one step further and make like an admin panel

for this where you can manage everything much more easily. But yeah, in the next

video, we will be going over Playwright and setting up recordings.

So basically once it makes a change on the cloud, then it can record

the change for us and send it to us via Slack.
