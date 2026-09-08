# Dogfooding

- class: slack-agents
- chapter: 0 to 1
- title: Dogfooding
- url: https://www.agenticcoding.school/v/g7lXkom7
- durationSeconds: 180
- fetched: 2026-09-05
- transcriptChars: 2733

## Description (video page text, NOT transcript; may contain links)

(none)

## Transcript

Okay, so now because our Slack bot has access to GitHub, we're gonna

be trying to do as many changes to our Slack bot via Slack instead.

So we're gonna make a brand new channel over here and I'm gonna call it

joestar-dev. So this is

our development channel. Press create. And what I like to do at the top of

all my channels is basically for the topic over here,

I like to put in the repo. So it's gonna be ray-amjadjoestar-agent.

Joestar-agent. So pressing save,

we now have a channel topic. So the very first thing we want to

do is to basically say, by adding joestar and saying,

can you update the agent whereby for every channel that it's in,

it automatically loads in the channel topic and it says,

uh, the GitHub repo for this channel will be over here, to help the

agent save time in finding the correct repo from GitHub.

You have a channel-topic right now. Once you're done, open up a brand new PR

for this and then let me know where the PR is. So it's really important

to start dogfooding our own agent so we can identify bottlenecks

and problems here. So pressing enter, it will get started by doing that work.

So it seems it says you mentioned Joestar, but they're not in the channel.

Add them. And now Joestar will get started because it reacted with an eyes

emoji. Now we can kick off a lot more work in parallel.

So I can do like @joestar and say searching

online for the Claude Code guide, can you basically make it such that instead

of just showing thinking... it would show how long it's been

working for and also the latest tool call that it did

as well. Once it starts doing tool calls, open up a brand new

PR for this once you are done. So now because both of these are happening

in different sandboxes, remember each top level message is a

different sandbox. They will not like conflict with each other. So they'll be working independently.

Okay, so we can see that this is done. So it finished thinking,

saying thinking, and it made us a brand new PR. So I can click on

this over here. But it seems it kind of messed it up whereby it

keeps adding this random asterisk to the end. So the link doesn't

open properly. But yeah, this is what the PR looks like.

So where it says files changed over here, this looks

pretty good. And it seems that we do have to give it some

new things in our manifest as well. So we will quickly double check, but for

now we can merge this in and then send up a follow-up prompt

by saying, can you gimme the

updated manifest that I need to update going forwards? Send it to me as

a JSON file here. And yeah, this is basically how I'd recommend making

changes to your agent going forwards because you can identify any bottlenecks

and only if you really need to, should you be switching back into Cloud

Code running locally on your computer instead. So basically it gave me the updated manifest.

So I'm gonna go through the process of updating the manifest, reinstalling it,

and then setting up the updated bot token. And I will also have

to deal with this feature over here. The final result will be down below as

well. So you can just always copy that code over and set it up like
